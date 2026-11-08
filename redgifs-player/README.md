# RedGifs Player

Electron desktop player for [redgifs.com](https://www.redgifs.com/). It plays clips in a portrait full-screen window and moves to the next clip on its own.

## Features

- **Auto-next**: moves to the next clip when the current one finishes, or every 5, 10 or 20 seconds. Image posts advance on a timer.
- **Portrait full-screen window**: a borderless 9:16 window at full screen height, centered. It opens the site's own fullscreen viewer automatically.
- **On-page controls** (top center): a full-screen button, a drag handle to move the window, and a close button.
- **Cloudflare DNS over HTTPS** (on by default): DNS goes only through Cloudflare, so DNS blocking by your ISP can't redirect you.
  - This changes DNS only. ISPs that block by IP or SNI still need a real VPN, such as Cloudflare WARP.
- **Adblock**: ads and trackers are blocked with the Ghostery adblocker.
- **Settings are remembered** between runs.

## Run

You need [Node.js](https://nodejs.org/).

```bash
npm install
npm start
```

## Keyboard shortcuts

The menu labels are in Indonesian.

| Key | Action | Menu |
| --- | --- | --- |
| `F2` | Auto-next on/off | Auto Next → Aktif |
| `F3` | Skip to the next clip now | Auto Next → Lewati sekarang |
| `F4` | Portrait full-screen video on/off (reopens the window) | Navigasi → Video layar penuh (portrait) |
| `F5` | Reload | Navigasi → Muat ulang |
| `F11` | Toggle window fullscreen on the current monitor | Navigasi → Layar penuh (jendela) |
| `Alt+Home` | Go to redgifs.com | Navigasi → Beranda |
| `Alt+Left` / `Alt+Right` | Back / forward | Navigasi → Kembali / Maju |

The F-keys also work in the borderless window, which has no menu bar.

Other menu options:

- **Auto Next → Setelah klip selesai / Tiap 5 / 10 / 20 detik**: how auto-next decides when to move on.
- **Jaringan → Cloudflare DNS (DoH)**: turns the DNS setting on or off and reloads the page.

## How it works

- [`main.js`](main.js):
  - creates the window and the menu;
  - sets up DNS over HTTPS and the adblocker;
  - saves settings to `settings.json` in the app's user data folder.
- [`preload.js`](preload.js) runs inside redgifs.com. It:
  - watches the active clip and clicks "Next video" or scrolls to the next card;
  - detects a finished clip by checking whether it ended or looped back to the start;
  - adds the on-page control bar.

The page logic depends on redgifs.com's current element names, so it may need updating if the site changes.
