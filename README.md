# YouTube Player TV & RedGifs Player

Two video players:

| Folder | What it is |
| --- | --- |
| [`youtube-player/android`](youtube-player/android) | Android TV app for **Chromecast with Google TV**: YouTube's TV interface with adblock and extras |
| [`youtube-player`](youtube-player) | Electron desktop player for youtube.com |
| [`redgifs-player`](redgifs-player) | Electron desktop player for redgifs.com |

## YouTube Player TV (Android)

A full-screen WebView on `youtube.com/tv`, driven by the TV remote.

Features:

- **Adblock**: ad data is removed from YouTube's API responses, and ad/tracking requests are blocked, so ads never start.
- **TV resolution**: picks the TV's highest display mode at 30 fps or more (up to 3840×2160) and plays videos at that quality.
  - AV1 is hidden so YouTube uses VP9/H.264, which the Chromecast decodes in hardware with no dropped frames.
- **Sharp thumbnails**: 1280×720 thumbnails instead of 320×180.
- **Focus preview with sound**: a tile that stays focused for about 1 second plays its video, with sound, inside the tile.
- **Shorts auto-next**: when a Short ends, the next one plays.
  - Works in YouTube's Shorts player and for Shorts opened from search results.
- **Remote keys**:
  - Back works as YouTube's back key.
  - Home leaves the app, and playback pauses when the app goes to the background.

### Install

A prebuilt APK is included: [`youtube-player/YouTubePlayer-TV.apk`](youtube-player/YouTubePlayer-TV.apk).

1. On the Chromecast:
   - Turn on **Developer options**: Settings → System → About, then press *Android TV OS build* 7 times.
   - Turn on **Wireless debugging**: Settings → System → Developer options.
2. Make sure the PC and the Chromecast are on the same network.
3. Pair, connect and install. The pairing IP:port and code are under *Pair device with pairing code*; the connect port is shown on the Wireless debugging screen.

```bash
adb pair <ip>:<pair-port> <code>
```

```bash
adb connect <ip>:<connect-port>
```

```bash
adb install -r youtube-player/YouTubePlayer-TV.apk
```

The app appears on the Google TV home screen as **YouTube Player**.

### Build

You need JDK 17, the Android SDK (compileSdk 35) and Gradle 8.x.

```bash
cd youtube-player/android
gradle assembleRelease
```

The output is `build/outputs/apk/release/youtube-player-tv-release.apk`. Debug and release builds are both signed with the debug key, so you can install either one over the other.

### How it works

- [`MainActivity.java`](youtube-player/android/src/main/java/com/riefk/youtubeplayer/MainActivity.java):
  - sets up the WebView with a TV user agent and picks the display mode;
  - blocks ad requests;
  - provides a small key bridge, limited to Right/Down/OK, which Shorts auto-next uses.
- [`page.js`](youtube-player/android/src/main/assets/page.js) is injected before YouTube's own scripts. It adds:
  - adblock and sharp thumbnails, by hooking `JSON.parse`;
  - the AV1 hide and the quality setting;
  - Shorts auto-next;
  - focus previews.

To debug, install the debug build. Then forward `webview_devtools_remote_<pid>` with `adb forward` and connect Chrome DevTools.

## Electron desktop players

`youtube-player` and `redgifs-player` are built on the same base:

- Cloudflare DNS over HTTPS, which you can turn on or off;
- auto-next;
- a portrait full-screen window that you can drag;
- full-screen and close buttons.

```bash
cd youtube-player   # or redgifs-player
npm install
npm start
```
