// Runs inside redgifs.com. Auto-next: when the active clip finishes (it loops, so we watch for the
// wrap-around) or after N seconds, move to the next clip.
// Feed: cards are .GifPreview; only the active one (.GifPreview_isActive) holds a <video>.
// Watch/fullscreen view: has a "Next video" button.
const { ipcRenderer } = require('electron');

let cfg = { on: false, seconds: 0, fullscreen: false };
let shownAt = Date.now(), lastSrc = '', lastT = 0;
let fsOpened = false; // opened the site's fullscreen view once; if the user closes it, leave it closed
const reset = () => { shownAt = Date.now(); lastT = 0; };
ipcRenderer.invoke('auto:get').then((c) => { cfg = c; reset(); });
ipcRenderer.on('auto', (_e, c) => {
  if (c.fullscreen && !cfg.fullscreen) fsOpened = false; // just switched on: open it again
  if (!c.fullscreen && cfg.fullscreen) document.querySelector('button[aria-label="Close video"]')?.click();
  cfg = c; reset();
});
ipcRenderer.on('auto:skip', () => next());

const visible = (e) => e && e.offsetParent && e.getBoundingClientRect().height > 0;

function activeVideo() {
  const v = document.querySelector('.GifPreview_isActive video');
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
  const btn = document.querySelector('button[aria-label="Next video"]');
  if (visible(btn)) { btn.click(); return; }
  const card = (activeVideo() || document).closest?.('.GifPreview') || document.querySelector('.GifPreview_isActive');
  let n = card?.nextElementSibling;
  while (n && !n.classList.contains('GifPreview')) n = n.nextElementSibling; // skip ads / modules between cards
  if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.scrollBy({ top: innerHeight * 0.9, behavior: 'smooth' });
}

// ponytail: 250ms polling; switch to video events if it ever matters.
// Open the site's own fullscreen viewer (the "open fullscreen" button on the active card).
function ensureFullscreen() {
  if (!cfg.fullscreen || fsOpened) return;
  if (visible(document.querySelector('button[aria-label="Next video"]'))) { fsOpened = true; return; }
  const b = document.querySelector('.GifPreview_isActive [aria-label="open fullscreen"]') || document.querySelector('[aria-label="open fullscreen"]');
  if (visible(b)) { b.click(); fsOpened = true; }
}

// The borderless portrait window has no title bar, so add a small control bar at the top center:
// [fullscreen] [drag handle] [close]. The handle only shows in portrait mode (the normal window has a title bar).
function controls() {
  let c = document.getElementById('rg-ctl');
  if (c) { c.querySelector('#rg-drag').style.display = cfg.fullscreen ? '' : 'none'; return; }
  if (!document.body) return;
  c = document.createElement('div');
  c.id = 'rg-ctl';
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
  h.id = 'rg-drag';
  h.title = 'Tarik untuk menggeser jendela';
  h.style.cssText = 'width:140px;height:16px;-webkit-app-region:drag;background:rgba(255,255,255,.4);border-radius:0 0 10px 10px;';
  c.append(btn('⛶', 'Layar penuh (F11)', 'fullscreen'), h, btn('✕', 'Tutup', 'close'));
  document.body.appendChild(c);
}

setInterval(() => {
  controls();
  ensureFullscreen();
  if (!cfg.on) return;
  const v = activeVideo();
  if (!v) { if (Date.now() - shownAt >= (cfg.seconds || 8) * 1000) next(); return; } // image post: timed
  const src = v.currentSrc;
  if (src !== lastSrc) { lastSrc = src; reset(); return; } // new clip became active
  if (cfg.seconds > 0) {
    if (Date.now() - shownAt >= cfg.seconds * 1000) next();
    return;
  }
  const t = v.currentTime, d = v.duration;
  // clip finished: either 'ended' (no loop) or the loop jumped back to the start
  if (v.ended || (Number.isFinite(d) && d > 0 && lastT > d * 0.7 && t + 0.5 < lastT)) { next(); return; }
  lastT = t;
}, 250);
