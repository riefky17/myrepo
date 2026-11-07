package com.riefk.youtubeplayer;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.Scanner;
import java.util.regex.Pattern;

// Full-screen WebView on youtube.com/tv: YouTube's own TV interface, driven by the D-pad remote.
public class MainActivity extends Activity {
    private static final String HOME = "https://www.youtube.com/tv";
    // youtube.com/tv only serves the TV interface to TV user agents (otherwise it redirects to the desktop site).
    private static final String UA = "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.5 TV Safari/537.36";

    // Ad / ad-tracking requests answered with an empty response. Video ads themselves are removed by adblock.js.
    private static final Pattern AD_URL = Pattern.compile(
        "doubleclick\\.net|googlesyndication\\.com|googleadservices\\.com|/pagead/|/api/stats/ads|/ptracking");

    private WebView web;
    private int tvHeight = 1080; // height of the display mode we picked; page.js matches YouTube's quality to it

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        pickBestDisplayMode();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // autoplay
        s.setUserAgentString(UA);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true); // stay signed in
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        // page.js (adblock + Shorts auto-next) runs before YouTube's own scripts (needs a WebView that supports
        // it; all current Google TV WebViews do). Older WebViews get it at page start, which can miss the first video.
        final String adblock = "window.__ytpTvHeight=" + tvHeight + ";\n" + asset("page.js");
        final boolean early = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
        if (early) WebViewCompat.addDocumentStartJavaScript(web, adblock, Collections.singleton("https://www.youtube.com"));

        // Shorts auto-next (page.js) presses Right/Down/OK as real remote keys; YouTube TV ignores synthetic ones.
        // Only these navigation keys are allowed, since any script on the page can call this.
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void key(int code) {
                if (code != KeyEvent.KEYCODE_DPAD_RIGHT && code != KeyEvent.KEYCODE_DPAD_DOWN && code != KeyEvent.KEYCODE_DPAD_CENTER) return;
                runOnUiThread(() -> {
                    web.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, code));
                    web.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, code));
                });
            }
        }, "YTP");

        web.setWebViewClient(new WebViewClient() { // keep every link inside the app
            @Override public void onPageStarted(WebView v, String url, Bitmap icon) {
                if (!early) v.evaluateJavascript(adblock, null);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if (!AD_URL.matcher(r.getUrl().toString()).find()) return null;
                return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            // hide WebView's grey "play" placeholder before a video starts
            @Override public Bitmap getDefaultVideoPoster() { return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888); }
        });
        setContentView(web);
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(HOME);
    }

    private String asset(String name) {
        try (InputStream in = getAssets().open(name)) {
            return new Scanner(in, "UTF-8").useDelimiter("\\A").next();
        } catch (IOException e) {
            return "";
        }
    }

    // Ask the TV for its highest resolution (e.g. 3840x2160) at >= 30 fps, highest refresh rate first.
    private void pickBestDisplayMode() {
        if (Build.VERSION.SDK_INT < 23) return;
        Display d = getWindowManager().getDefaultDisplay();
        Display.Mode best = d.getMode();
        for (Display.Mode m : d.getSupportedModes()) {
            if (m.getRefreshRate() < 29.9f) continue; // 29.97 counts as 30
            long a = (long) m.getPhysicalWidth() * m.getPhysicalHeight();
            long b = (long) best.getPhysicalWidth() * best.getPhysicalHeight();
            if (a > b || (a == b && m.getRefreshRate() > best.getRefreshRate())) best = m;
        }
        tvHeight = Math.min(best.getPhysicalWidth(), best.getPhysicalHeight());
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.preferredDisplayModeId = best.getModeId();
        getWindow().setAttributes(lp);
    }

    // Remote "Back" = Escape, which is YouTube TV's back key (it shows its own exit screen at the top level).
    // Leave the app with the Home button.
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            web.dispatchKeyEvent(new KeyEvent(e.getAction(), KeyEvent.KEYCODE_ESCAPE));
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override protected void onResume() { super.onResume(); web.onResume(); }

    // Stop playback when the user goes Home, instead of playing on in the background.
    @Override
    protected void onStop() {
        web.evaluateJavascript("document.querySelectorAll('video').forEach(v => v.pause())", null);
        web.onPause();
        super.onStop();
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
