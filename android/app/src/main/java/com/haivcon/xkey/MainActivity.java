package com.haivcon.xkey;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceCredentialPlugin.class);
        registerPlugin(ScreenSecurityPlugin.class);
        registerPlugin(XKeyFileOpenPlugin.class);
        registerPlugin(DeviceIntegrityPlugin.class);
        registerPlugin(XKeyFileSaverPlugin.class);
        registerPlugin(DpiOverridePlugin.class);
        DpiOverridePlugin.applyStoredDpi(this);
        super.onCreate(savedInstanceState);
    }
}
