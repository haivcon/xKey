package com.haivcon.xkey;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void attachBaseContext(Context newBase) {
        Context overrideContext = DpiOverridePlugin.createOverrideContext(newBase);
        super.attachBaseContext(overrideContext != null ? overrideContext : newBase);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Window window = getWindow();
        window.setStatusBarColor(Color.BLACK);
        window.setNavigationBarColor(Color.BLACK);
        window.getDecorView().setSystemUiVisibility(0);

        registerPlugin(DeviceCredentialPlugin.class);
        registerPlugin(ScreenSecurityPlugin.class);
        registerPlugin(XKeyFileOpenPlugin.class);
        registerPlugin(DeviceIntegrityPlugin.class);
        registerPlugin(XKeyFileSaverPlugin.class);
        registerPlugin(CpuThermalPlugin.class);

        registerPlugin(DpiOverridePlugin.class);
        DpiOverridePlugin.applyStoredSwDp(this);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        DpiOverridePlugin.applyStoredSwDp(this);
    }
}
