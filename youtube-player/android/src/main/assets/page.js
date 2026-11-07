// Runs in youtube.com before YouTube's own scripts. Hides AV1 (see 3. below) and hooks YouTube TV's API JSON to:
// 1. Adblock: strip adPlacements / adSlots / playerAds and feed ad tiles, so ads never start.
// 2. Shorts auto-next: remember every short YouTube lists (lockups typed LOCKUP_CONTENT_TYPE_SHORT). For a
//    short, drop YouTube's autoplay (it would pick a long video), so when the short ends YouTube returns to
//    the list with that short focused. Then press Right + OK (real keys, via the app's YTP bridge) to play the
//    next tile if it is short-length. Going through the UI keeps YouTube's own navigation; changing
//    location.hash would count as an outside link and re-open the account picker.
//    Shorts opened from a Shorts shelf play in YouTube TV's own Shorts player instead (no v= in the URL),
//    where each short loops and Down = next short: there, press Down when the short loops or ends.
// 5. Sharp thumbnails: keep only the largest of each thumbnail size list, and swap the 320x180 standard
//    thumbnails (hqdefault etc.) for hq720.jpg (1280x720).
(() => {
  if (window.__ytp) return;

  // 3. Smooth playback: Chromecast with Google TV has no AV1 hardware decoder, so WebView decodes AV1 on the
  //    CPU and drops ~45% of frames at 1080p. Hide AV1 so YouTube picks VP9/H.264, which are hardware-decoded.
  const isAv1 = (t) => /av01/i.test(String(t));
  const isTypeSupported = MediaSource.isTypeSupported.bind(MediaSource);
  MediaSource.isTypeSupported = (t) => !isAv1(t) && isTypeSupported(t);
  // 4. Quality = TV resolution. WebView reports a 1080p TV as 960x540 CSS px at 2x (Android TV UI scale), and
  //    YouTube caps quality by player size x devicePixelRatio. Report the ratio that maps the viewport onto the
  //    real TV height (set by the app as __ytpTvHeight), and ask the player for that quality on every video.
  const tvHeight = window.__ytpTvHeight || 1080;
  const nativeDpr = window.devicePixelRatio;
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    get: () => (innerHeight > 0 ? Math.max(nativeDpr, tvHeight / innerHeight) : nativeDpr),
  });
  const QUALITY = tvHeight >= 2160 ? 'hd2160' : tvHeight >= 1440 ? 'hd1440' : tvHeight >= 1080 ? 'hd1080' : 'hd720';

  const mc = navigator.mediaCapabilities;
  if (mc && mc.decodingInfo) {
    const decodingInfo = mc.decodingInfo.bind(mc);
    mc.decodingInfo = (cfg) => isAv1(cfg?.video?.contentType)
      ? Promise.resolve({ supported: false, smooth: false, powerEfficient: false })
      : decodingInfo(cfg);
  }
  const stats = (window.__ytp = { stripped: 0, shorts: 0, jumps: 0 });
  const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds'];
  const AD_ITEMS = ['adSlotRenderer', 'tvMastheadRenderer']; // feed/home ad tiles
  const shorts = new Set(); // ids of every short YouTube has listed

  // ponytail: assumes hq720.jpg exists (it did for every video and short sampled); a rare older low-res
  // video would show an empty tile. Fall back to the original URL if that ever shows up.
  const STD_THUMB = /^(https:\/\/i\.ytimg\.com\/vi)(?:_webp)?(\/[\w-]{11}\/)(?:default|mqdefault|hqdefault|sddefault)\.(?:jpg|webp)/;
  function sharpest(list) {
    const area = (x) => (x.width || 0) * (x.height || 0);
    const best = list.reduce((a, b) => (area(b) > area(a) ? b : a));
    const m = best.url.match(STD_THUMB);
    return m && (best.width || 0) < 1280 ? { url: `${m[1]}${m[2]}hq720.jpg`, width: 1280, height: 720 } : best;
  }

  // ponytail: walks every parsed response; fine for API JSON sizes, prune by path if it ever shows up in profiling.
  function walk(o, d) {
    if (!o || typeof o !== 'object' || d > 60) return;
    if (Array.isArray(o)) {
      for (let i = o.length - 1; i >= 0; i--) {
        const x = o[i];
        if (x && typeof x === 'object' && AD_ITEMS.some((k) => k in x)) { o.splice(i, 1); stats.stripped++; }
        else walk(x, d + 1);
      }
      return;
    }
    for (const k of AD_KEYS) if (k in o) { delete o[k]; stats.stripped++; }
    if (o.contentType === 'LOCKUP_CONTENT_TYPE_SHORT' && typeof o.contentId === 'string') shorts.add(o.contentId);
    for (const k of ['thumbnails', 'sources']) {
      const list = o[k];
      if (Array.isArray(list) && list.length && typeof list[0]?.url === 'string') o[k] = [sharpest(list)];
    }
    for (const k in o) walk(o[k], d + 1);
  }
  // "Watch next" data for a short: remove autoplay so YouTube goes back to the list instead of a long video.
  function shortsAutoplay(r) {
    if (!shorts.has(r.currentVideoEndpoint?.watchEndpoint?.videoId)) return;
    delete r.contents?.singleColumnWatchNextResults?.autoplay;
    delete r.playerOverlays?.playerOverlayRenderer?.autoplay;
  }

  const safeWalk = (r) => {
    try {
      walk(r, 0);
      stats.shorts = shorts.size;
      if (r && typeof r === 'object' && r.currentVideoEndpoint) shortsAutoplay(r);
    } catch (e) { /* never break the page */ }
    return r;
  };

  const parse = JSON.parse;
  JSON.parse = function () { return safeWalk(parse.apply(this, arguments)); };
  const json = Response.prototype.json;
  Response.prototype.json = function () { return json.call(this).then(safeWalk); };

  // Android key codes accepted by the app's YTP bridge.
  const RIGHT = 22, DOWN = 20, OK = 23;
  const key = (code) => window.YTP && window.YTP.key(code);
  const focusedSeconds = () => { // tiles start with their duration, e.g. "0:26Ranking cat moments..."
    const m = (document.activeElement?.textContent || '').trim().match(/^(?:(\d+):)?(\d+):(\d\d)/);
    return m ? (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] : Infinity;
  };

  // ponytail: 250ms polling of the URL/video; switch to player events if timing ever matters.
  let endedShort = '', qualitySetFor = '', reelVid = '', reelT = 0;

  // 6. Focus preview: YouTube TV's web UI has none, so after a tile keeps focus for ~1s, play that video (with sound) in
  //    YouTube's own (idle, hidden) player, moved over the tile. Chromecast draws video in a layer behind the page,
  //    so the tile's thumbnail is made transparent to let it show through.
  // ponytail: previews go through the real player, so they can land in watch history; filter its stats pings if that matters.
  const css = document.createElement('style');
  css.textContent = 'html.ytp-prev ytlr-player{display:block!important;position:fixed!important;z-index:9999!important;'
    + 'pointer-events:none;left:var(--px)!important;top:var(--py)!important;width:var(--pw)!important;height:var(--ph)!important;'
    + 'overflow:hidden}html.ytp-prev ytlr-player *{width:100%!important;height:100%!important;left:0!important;top:0!important}'
    + 'html.ytp-prev .ytp-prev-thumb{opacity:0!important}';
  document.documentElement.appendChild(css);
  const THUMB_ID = /\/vi(?:_webp)?\/([\w-]{11})\//;
  let prevEl = null, prevSince = 0, previewing = false;
  const player = () => document.querySelector('.html5-video-player');
  const focusedThumb = () => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    for (const e of a.querySelectorAll('*')) if (THUMB_ID.test(getComputedStyle(e).backgroundImage)) return e;
    return null;
  };
  // keepPlaying: the user opened a video, so leave the player to YouTube (just undo our styling).
  const stopPreview = (keepPlaying) => {
    if (!previewing) return;
    previewing = false;
    document.documentElement.classList.remove('ytp-prev');
    document.querySelector('.ytp-prev-thumb')?.classList.remove('ytp-prev-thumb');
    qualitySetFor = ''; // the full-quality pass runs again for whatever plays next
    try { const p = player(); if (!keepPlaying) p.stopVideo(); p.unMute(); } catch (e) { /* player gone */ }
  };
  // OK on a tile: end the preview before YouTube opens the video (capture phase runs first).
  addEventListener('keydown', (e) => { if (e.keyCode === 13) { stopPreview(true); prevEl = null; } }, true);
  function preview(p) {
    const el = focusedThumb();
    if (el !== prevEl) { stopPreview(false); prevEl = el; prevSince = Date.now(); return; }
    if (!el || !p) return;
    const r = el.getBoundingClientRect(), s = document.documentElement.style; // rows scroll: follow the tile
    s.setProperty('--px', r.x + 'px'); s.setProperty('--py', r.y + 'px');
    s.setProperty('--pw', r.width + 'px'); s.setProperty('--ph', r.height + 'px');
    if (previewing || Date.now() - prevSince < 1000) return;
    previewing = true;
    const vid = getComputedStyle(el).backgroundImage.match(THUMB_ID)[1];
    try {
      p.loadVideoById(vid); // with sound, like the Google TV app
      qualitySetFor = vid; p.setPlaybackQualityRange('medium', 'medium'); // a small tile needs no 1080p
    } catch (e) { /* player not ready */ }
    el.classList.add('ytp-prev-thumb');
    document.documentElement.classList.add('ytp-prev');
  }

  setInterval(() => {
    // Quality: once per video (YouTube falls back to the best it has if the video is lower-res).
    const p = document.querySelector('.html5-video-player');
    const vid = p?.getVideoData?.()?.video_id;
    if (vid && vid !== qualitySetFor && p.setPlaybackQualityRange) {
      qualitySetFor = vid;
      try { p.setPlaybackQualityRange(QUALITY, QUALITY); stats.quality = QUALITY; } catch (e) { /* player not ready */ }
    }

    const id = (location.hash.match(/[?&]v=([\w-]{11})/) || [])[1];
    const v = document.querySelector('video');
    const fullScreen = v && v.getBoundingClientRect().height >= innerHeight * 0.9;
    if (id || fullScreen) { stopPreview(true); prevEl = null; } else preview(p);

    // YouTube TV's Shorts player: no v= in the URL, a full-height vertical video that loops.
    if (!id && vid && fullScreen && v.duration > 0 && v.videoHeight > v.videoWidth) {
      const t = v.currentTime;
      const looped = reelVid === vid && reelT > v.duration * 0.7 && t + 0.5 < reelT;
      if (looped || (reelVid === vid && v.ended)) { reelVid = ''; stats.jumps++; key(DOWN); return; }
      reelVid = vid; reelT = t;
      return;
    }

    if (id) {
      const v = document.querySelector('video');
      if (shorts.has(id) && v && (v.ended || (v.duration > 0 && v.currentTime >= v.duration - 0.3))) endedShort = id;
      return;
    }
    if (!endedShort) return; // back on a list after a short ended by itself (not via Back)
    endedShort = '';
    const focused = () => document.activeElement;
    const playIfShort = (from) => {
      if (focused() !== from && focusedSeconds() <= 180) { stats.jumps++; key(OK); }
    };
    setTimeout(() => {
      const from = focused();
      key(RIGHT);
      setTimeout(() => {
        if (focused() !== from) return playIfShort(from);
        key(DOWN); // end of the row: try the next row
        setTimeout(() => playIfShort(from), 700);
      }, 700);
    }, 800);
  }, 250);
})();
