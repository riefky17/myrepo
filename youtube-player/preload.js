// Runs inside youtube.com. Auto-next:
// - Shorts: each short loops, so we watch for the wrap-around (or use the timer) and press the "next" arrow.
// - Normal videos: YouTube autoplay already moves on when a video ends, so only the timer mode applies there
//   (it presses the player's Next button).
const { ipcRenderer } = require('electron');

let cfg = { on: false, seconds: 0, fullscreen: false };
let shownAt = Date.now(), lastKey = '', lastT = 0;
const reset = () => { shownAt = Date.now(); lastT = 0; };
ipcRenderer.invoke('auto:get').then((c) => { cfg = c; reset(); });
ipcRenderer.on('auto', (_e, c) => { cfg = c; reset(); });
ipcRenderer.on('auto:skip', () => next());

const visible = (e) => e && e.offsetParent && e.getBoundingClientRect().height > 0;
const isShorts = () => location.pathname.startsWith('/shorts');

function activeVideo() {
  const v = document.querySelector('ytd-reel-video-renderer[is-active] video') || document.querySelector('video.html5-main-video');
  if (visible(v)) return v;
  // fallback: the video taking most of the screen
  let best = null, area = 0;
  for (const x of document.querySelectorAll('video')) {
    const r = x.getBoundingClientRect();
    const a = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    if (a > area) { area = a; best = x; }
  }
  return best;
}

function next() {
  reset();
  const btn = isShorts()
    ? document.querySelector('#navigation-button-down button')
    : document.querySelector('.ytp-next-button');
  if (visible(btn)) btn.click();
}

// Fallback for video ads that slip past the blocker: press "Skip", or jump to the ad's end.
// Mute during the ad and unmute after, so the next video isn't left silent.
let adMuted = false;
function skipAd(v) {
  if (!document.querySelector('.ad-showing, .ad-interrupting')) {
    if (adMuted && v) { v.muted = false; adMuted = false; }
    return false;
  }
  document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern')?.click();
  if (v && Number.isFinite(v.duration)) { v.muted = true; adMuted = true; v.currentTime = v.duration; }
  return true;
}

// The borderless portrait window has no title bar, so add a small control bar at the top center:
// [fullscreen] [drag handle] [close]. The handle only shows in portrait mode (the normal window has a title bar).
function controls() {
  let c = document.getElementById('yt-ctl');
  if (c) { c.querySelector('#yt-drag').style.display = cfg.fullscreen ? '' : 'none'; return; }
  if (!document.body) return;
  c = document.createElement('div');
  c.id = 'yt-ctl';
  c.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);display:flex;align-items:flex-start;gap:4px;z-index:2147483647;';
  const btn = (txt, title, action) => {
    const b = document.createElement('button');
    b.textContent = txt; b.title = title;
    b.style.cssText = 'width:28px;height:28px;padding:0;border:0;border-radius:0 0 8px 8px;background:rgba(0,0,0,.55);color:#fff;'
      + 'font:15px/28px "Segoe UI Symbol",sans-serif;cursor:pointer;-webkit-app-region:no-drag;';
    b.onclick = () => ipcRenderer.send('win', action);
    return b;
  };
  const h = document.createElement('div');
  h.id = 'yt-drag';
  h.title = 'Tarik untuk menggeser jendela';
  h.style.cssText = 'width:140px;height:16px;-webkit-app-region:drag;background:rgba(255,255,255,.4);border-radius:0 0 10px 10px;';
  c.append(btn('⛶', 'Layar penuh (F11)', 'fullscreen'), h, btn('✕', 'Tutup', 'close'));
  document.body.appendChild(c);
}

// ponytail: 250ms polling; switch to video events if it ever matters.
setInterval(() => {
  controls();
  const v = activeVideo();
  if (skipAd(v)) { reset(); return; }
  if (!cfg.on || !v) return;
  const key = location.pathname + location.search + v.currentSrc;
  if (key !== lastKey) { lastKey = key; reset(); return; } // new video became active
  if (cfg.seconds > 0) {
    if (Date.now() - shownAt >= cfg.seconds * 1000) next();
    return;
  }
  if (!isShorts()) return; // normal videos: YouTube autoplay handles "finished"
  const t = v.currentTime, d = v.duration;
  // short finished: either 'ended' or the loop jumped back to the start
  if (v.ended || (Number.isFinite(d) && d > 0 && lastT > d * 0.7 && t + 0.5 < lastT)) { next(); return; }
  lastT = t;
}, 250);
