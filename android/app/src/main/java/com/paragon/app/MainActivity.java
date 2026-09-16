package com.paragon.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.view.View;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        super.onCreate(savedInstanceState);
        
        // Find the WebView injected by Capacitor and tweak its native properties
        WebView webView = (WebView) bridge.getWebView();
        if (webView != null) {
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
        }
    }
}
