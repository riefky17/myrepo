const { app, BrowserWindow, Menu, ipcMain, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');

const HOME = 'https://www.youtube.com/';
const PARTITION = 'persist:youtube';

// Look like plain Chrome (some sites treat "Electron" UAs differently).
app.userAgentFallback = app.userAgentFallback.replace(/ Electron\/\S+/, '').replace(/ youtube-player\/\S+/, '');

// ---- settings (saved in userData/settings.json) ----
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let cfg = { dns: true, autoNext: true, seconds: 0, fullscreen: false }; // seconds 0 = next when the clip finishes; fullscreen = portrait window (F4), good for Shorts
function loadSettings() {
  try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch { /* first run */ }
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(cfg, null, 2)); } catch (e) { console.error('save failed:', e.message); }
}

// ---- Cloudflare DNS-over-HTTPS ----
// 'secure' = only DoH, never the ISP resolver (so ISP DNS blocking can't redirect us).
// Note: this changes DNS only. ISPs that block by SNI/IP still need a real VPN (e.g. Cloudflare WARP).
function applyDns() {
  app.configureHostResolver(cfg.dns
    ? { secureDnsMode: 'secure', secureDnsServers: ['https://cloudflare-dns.com/dns-query', 'https://1.1.1.1/dns-query'] }
    : { secureDnsMode: 'off' });
}

let win;
const autoState = () => ({ on: cfg.autoNext, seconds: cfg.seconds, fullscreen: cfg.fullscreen });
const sendAuto = () => win?.webContents.send('auto', autoState());
ipcMain.handle('auto:get', autoState);
// Fullscreen fills whichever monitor the window is on. Windows refuses fullscreen for a
// non-resizable window, so the portrait window is made resizable only while fullscreen.
function toggleFullscreen() {
  if (win.isFullScreen()) {
    win.setFullScreen(false);
    if (cfg.fullscreen) win.setResizable(false);
  } else {
    win.setResizable(true);
    win.setFullScreen(true);
  }
}
// On-page buttons (see preload.js): window fullscreen toggle and close.
ipcMain.on('win', (_e, action) => {
  if (action === 'fullscreen') toggleFullscreen();
  else if (action === 'close') quitApp();
});

// Quit that can't get stuck: a page that is playing media can delay app.quit(), so force-exit after 1.5s.
function quitApp() {
  BrowserWindow.getAllWindows().forEach((w) => w.destroy());
  setTimeout(() => app.exit(0), 1500).unref();
  app.quit();
}

function buildMenu() {
  const set = (k, v) => { cfg[k] = v; saveSettings(); buildMenu(); };
  const interval = (label, s) => ({
    label, type: 'radio', checked: cfg.seconds === s, click: () => { set('seconds', s); sendAuto(); },
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Navigasi', submenu: [
      { label: 'Beranda', accelerator: 'Alt+Home', click: () => win.loadURL(HOME) },
      { label: 'Kembali', accelerator: 'Alt+Left', click: () => win.webContents.navigationHistory.goBack() },
      { label: 'Maju', accelerator: 'Alt+Right', click: () => win.webContents.navigationHistory.goForward() },
      { label: 'Muat ulang', accelerator: 'F5', click: () => win.reload() },
      { type: 'separator' },
      { label: 'Layar penuh (jendela)', accelerator: 'F11', click: toggleFullscreen },
      { label: 'Video layar penuh (portrait)', type: 'checkbox', accelerator: 'F4', checked: cfg.fullscreen,
        click: (i) => {
          set('fullscreen', i.checked);
          // frame can't change on a live window, so swap in a new one on the same page
          const old = win; createWindow(old.webContents.getURL() || HOME); old.destroy();
        } },
      { label: 'Keluar', role: 'quit' },
    ] },
    { label: 'Auto Next', submenu: [
      { label: 'Aktif', type: 'checkbox', accelerator: 'F2', checked: cfg.autoNext,
        click: (i) => { set('autoNext', i.checked); sendAuto(); } },
      { type: 'separator' },
      interval('Setelah klip selesai', 0),
      interval('Tiap 5 detik', 5),
      interval('Tiap 10 detik', 10),
      interval('Tiap 20 detik', 20),
      { type: 'separator' },
      { label: 'Lewati sekarang', accelerator: 'F3', click: () => win.webContents.send('auto:skip') },
    ] },
    { label: 'Jaringan', submenu: [
      { label: 'Cloudflare DNS (DoH)', type: 'checkbox', checked: cfg.dns,
        click: (i) => { set('dns', i.checked); applyDns(); session.fromPartition(PARTITION).clearHostResolverCache(); win.reload(); } },
    ] },
    { label: 'Dev', submenu: [{ role: 'toggleDevTools' }] },
  ]));
}

// Portrait "fullscreen": a borderless 9:16 window, full screen height (above the taskbar), centered.
function portraitBounds() {
  const a = screen.getPrimaryDisplay().workArea;
  const w = Math.round(a.height * 9 / 16);
  return { x: a.x + Math.round((a.width - w) / 2), y: a.y, width: w, height: a.height };
}

// F-key shortcuts straight from the page, so they work in the borderless window (no menu bar there).
function findAccel(key, items = Menu.getApplicationMenu()?.items || []) {
  for (const i of items) {
    if (i.accelerator === key) return i;
    const sub = i.submenu && findAccel(key, i.submenu.items);
    if (sub) return sub;
  }
}

function createWindow(url = HOME) {
  win = new BrowserWindow({
    ...(cfg.fullscreen ? { ...portraitBounds(), frame: false, resizable: false } : { width: 1100, height: 900 }),
    title: 'Mbub Player powered by Youtube Music', backgroundColor: '#111',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), partition: PARTITION,
      backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.on('page-title-updated', e => e.preventDefault()); // keep the app name instead of the YouTube page title
  win.loadURL(url);
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown' || !/^F\d+$/.test(i.key)) return;
    const item = findAccel(i.key);
    if (item) { e.preventDefault(); item.click(); }
  });
  // Open links that want a new window in the same window instead.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) win.loadURL(url); return { action: 'deny' }; });
}

async function loadAdblock() {
  if (process.env.YTP_NO_ADBLOCK) return; // debug switch: run without the ad blocker
  const ses = session.fromPartition(PARTITION);
  // ponytail: shim for Electron < 35 (Ghostery 2.x calls the newer preload API). Drop after upgrading Electron.
  if (!ses.registerPreloadScript) {
    ses.registerPreloadScript = ({ filePath }) => { ses.setPreloads([...ses.getPreloads(), filePath]); return filePath; };
    ses.unregisterPreloadScript = (id) => ses.setPreloads(ses.getPreloads().filter((p) => p !== id));
  }
  try {
    // Ads only: the ads+tracking list also blocks requests the Shorts feed needs, so Shorts never advance.
    const blocker = await ElectronBlocker.fromPrebuiltAdsOnly(fetch, {
      path: path.join(app.getPath('userData'), 'adblock-ads-engine.bin'),
      read: fs.promises.readFile, write: fs.promises.writeFile,
    });
    // Network blocking only. enableBlockingInSession() also injects cosmetic/scriptlet code into pages,
    // which breaks YouTube Shorts (the feed never advances). Ads that get past this are skipped in preload.js.
    ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, blocker.onBeforeRequest);
  } catch (e) {
    console.error('adblock failed to load:', e.message); // app still works without it
  }
}

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

app.whenReady().then(async () => {
  loadSettings();
  applyDns();
  await loadAdblock();
  buildMenu();
  createWindow();
});
app.on('window-all-closed', () => app.quit());
