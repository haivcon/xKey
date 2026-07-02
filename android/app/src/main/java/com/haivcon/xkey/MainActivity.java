package com.haivcon.xkey;

import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void attachBaseContext(Context newBase) {
        Context overrideContext = DpiOverridePlugin.createOverrideContext(newBase);
        super.attachBaseContext(overrideContext != null ? overrideContext : newBase);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);

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
