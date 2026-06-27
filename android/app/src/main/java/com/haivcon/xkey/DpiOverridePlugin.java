package com.haivcon.xkey;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DpiOverride")
public class DpiOverridePlugin extends Plugin {
    private static final String PREFS_NAME = "xkey_dpi_override";
    private static final String KEY_DPI = "target_dpi";
    private static final int MIN_DPI = 120;
    private static final int MAX_DPI = 960;

    public static void applyStoredDpi(Activity activity) {
        if (activity == null) return;
        int storedDpi = getPrefs(activity).getInt(KEY_DPI, 0);
        if (storedDpi >= MIN_DPI && storedDpi <= MAX_DPI) {
            applyDpi(activity, storedDpi);
        }
    }

    @PluginMethod
    public void setDpi(PluginCall call) {
        Integer requestedDpi = call.getInt("dpi");
        if (requestedDpi == null) {
            call.reject("Missing dpi");
            return;
        }

        int dpi = clampDpi(requestedDpi);
        Activity activity = getActivity();
        int storedDpi = getPrefs(activity).getInt(KEY_DPI, 0);
        boolean alreadyApplied = storedDpi == dpi && activity.getResources().getConfiguration().densityDpi == dpi;
        getPrefs(activity).edit().putInt(KEY_DPI, dpi).apply();

        activity.runOnUiThread(() -> {
            applyDpi(activity, dpi);
            JSObject result = buildResult(true, dpi);
            call.resolve(result);
            if (!alreadyApplied) recreateSoon(activity);
        });
    }

    @PluginMethod
    public void resetDpi(PluginCall call) {
        Activity activity = getActivity();
        boolean hadOverride = getPrefs(activity).contains(KEY_DPI);
        getPrefs(activity).edit().remove(KEY_DPI).apply();

        activity.runOnUiThread(() -> {
            JSObject result = buildResult(true, getSystemDpi());
            call.resolve(result);
            if (hadOverride) recreateSoon(activity);
        });
    }

    @PluginMethod
    public void getSystemDpi(PluginCall call) {
        JSObject result = buildResult(true, getSystemDpi());
        call.resolve(result);
    }

    @PluginMethod
    public void getCurrentDpi(PluginCall call) {
        Activity activity = getActivity();
        int storedDpi = getPrefs(activity).getInt(KEY_DPI, 0);
        int appliedDpi = storedDpi > 0 ? storedDpi : getSystemDpi();
        JSObject result = buildResult(true, appliedDpi);
        result.put("overrideEnabled", storedDpi > 0);
        call.resolve(result);
    }

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static int clampDpi(int dpi) {
        return Math.max(MIN_DPI, Math.min(MAX_DPI, dpi));
    }

    private static int getSystemDpi() {
        return Resources.getSystem().getDisplayMetrics().densityDpi;
    }

    private static JSObject buildResult(boolean supported, int dpi) {
        JSObject result = new JSObject();
        result.put("supported", supported);
        result.put("dpi", dpi);
        result.put("systemDpi", getSystemDpi());
        return result;
    }

    private static void applyDpi(Activity activity, int dpi) {
        Resources resources = activity.getResources();
        Configuration configuration = new Configuration(resources.getConfiguration());
        DisplayMetrics metrics = resources.getDisplayMetrics();

        configuration.densityDpi = dpi;
        metrics.densityDpi = dpi;
        metrics.density = dpi / (float) DisplayMetrics.DENSITY_DEFAULT;
        metrics.scaledDensity = metrics.density * configuration.fontScale;

        resources.updateConfiguration(configuration, metrics);
    }

    private static void recreateSoon(Activity activity) {
        new Handler(Looper.getMainLooper()).postDelayed(activity::recreate, 150);
    }
}
