package com.haivcon.xkey;

import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "DeviceIntegrity")
public class DeviceIntegrityPlugin extends Plugin {
    private static final String[] ROOT_PATHS = {
        "/system/app/Superuser.apk",
        "/sbin/su",
        "/system/bin/su",
        "/system/xbin/su",
        "/data/local/xbin/su",
        "/data/local/bin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
        "/data/local/su",
        "/su/bin/su",
        "/system/bin/magisk",
        "/sbin/magisk",
        "/data/adb/magisk"
    };

    @PluginMethod
    public void getRiskInfo(PluginCall call) {
        JSArray reasons = new JSArray();
        boolean testKeys = Build.TAGS != null && Build.TAGS.contains("test-keys");
        boolean rootFiles = hasRootFiles();
        boolean suCommand = canFindSu();
        boolean appDebuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        boolean adbEnabled = isAdbEnabled();

        if (testKeys) reasons.put("test_keys");
        if (rootFiles) reasons.put("root_files");
        if (suCommand) reasons.put("su_command");
        if (appDebuggable) reasons.put("debuggable_app");
        if (adbEnabled) reasons.put("adb_enabled");

        JSObject result = new JSObject();
        result.put("native", true);
        result.put("risky", testKeys || rootFiles || suCommand || appDebuggable || adbEnabled);
        result.put("testKeys", testKeys);
        result.put("rootFiles", rootFiles);
        result.put("suCommand", suCommand);
        result.put("appDebuggable", appDebuggable);
        result.put("adbEnabled", adbEnabled);
        result.put("reasons", reasons);
        call.resolve(result);
    }

    private boolean hasRootFiles() {
        for (String path : ROOT_PATHS) {
            if (new File(path).exists()) return true;
        }
        return false;
    }

    private boolean canFindSu() {
        Process process = null;
        try {
            process = Runtime.getRuntime().exec(new String[] { "which", "su" });
            return process.waitFor(800, TimeUnit.MILLISECONDS) && process.exitValue() == 0;
        } catch (Exception e) {
            return false;
        } finally {
            if (process != null) process.destroy();
        }
    }

    private boolean isAdbEnabled() {
        try {
            return Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.ADB_ENABLED, 0) == 1;
        } catch (Exception e) {
            return false;
        }
    }
}
