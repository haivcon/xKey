package com.haivcon.xkey;

import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenSecurity")
public class ScreenSecurityPlugin extends Plugin {
    private boolean secureEnabled = false;

    @PluginMethod
    public void setSecure(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            if (enabled) {
                window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            secureEnabled = enabled;
            JSObject result = new JSObject();
            result.put("enabled", secureEnabled);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void isSecure(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", secureEnabled);
        call.resolve(result);
    }
}
