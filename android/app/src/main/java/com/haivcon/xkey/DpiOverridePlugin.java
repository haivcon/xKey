package com.haivcon.xkey;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DpiOverride")
public class DpiOverridePlugin extends Plugin {
    private static final String PREFS_NAME = "xkey_dpi_override";
    private static final String KEY_SW_DP = "target_sw_dp";
    private static final String LEGACY_KEY_DPI = "target_dpi";
    private static final String KEY_DISABLED = "sw_dp_disabled";
    private static final int DEFAULT_SW_DP = 480;
    private static final int MIN_SW_DP = 240;
    private static final int MAX_SW_DP = 800;

    public static Context createOverrideContext(Context base) {
        if (base == null) return null;
        int storedSwDp = getEffectiveStoredSwDp(base);
        if (storedSwDp < MIN_SW_DP || storedSwDp > MAX_SW_DP) return base;

        Configuration configuration = new Configuration(base.getResources().getConfiguration());
        applySwDpToConfiguration(configuration, storedSwDp);
        return base.createConfigurationContext(configuration);
    }

    public static void applyStoredSwDp(Activity activity) {
        if (activity == null) return;
        int storedSwDp = getEffectiveStoredSwDp(activity);
        if (storedSwDp >= MIN_SW_DP && storedSwDp <= MAX_SW_DP) {
            applySwDp(activity, storedSwDp);
        }
    }

    @PluginMethod
    public void setSwDp(PluginCall call) {
        Integer requestedSwDp = call.getInt("swDp");
        if (requestedSwDp == null) {
            requestedSwDp = call.getInt("dpi");
        }
        if (requestedSwDp == null) {
            call.reject("Missing swDp");
            return;
        }

        int swDp = clampSwDp(requestedSwDp);
        Activity activity = getActivity();
        int storedSwDp = getPrefs(activity).getInt(KEY_SW_DP, 0);
        boolean alreadyApplied = storedSwDp == swDp && activity.getResources().getConfiguration().smallestScreenWidthDp == swDp;
        getPrefs(activity).edit()
                .putInt(KEY_SW_DP, swDp)
                .putBoolean(KEY_DISABLED, false)
                .remove(LEGACY_KEY_DPI)
                .apply();

        activity.runOnUiThread(() -> {
            applySwDp(activity, swDp);
            JSObject result = buildResult(true, swDp, getSystemSwDp(activity));
            call.resolve(result);
            if (!alreadyApplied) recreateSoon(activity);
        });
    }

    @PluginMethod
    public void resetSwDp(PluginCall call) {
        Activity activity = getActivity();
        boolean hadOverride = getPrefs(activity).contains(KEY_SW_DP) || getPrefs(activity).contains(LEGACY_KEY_DPI);
        getPrefs(activity).edit().remove(KEY_SW_DP).remove(LEGACY_KEY_DPI).putBoolean(KEY_DISABLED, true).apply();

        activity.runOnUiThread(() -> {
            int systemSwDp = getSystemSwDp(activity);
            JSObject result = buildResult(true, systemSwDp, systemSwDp);
            call.resolve(result);
            if (hadOverride) recreateSoon(activity);
        });
    }

    @PluginMethod
    public void getSystemSwDp(PluginCall call) {
        Activity activity = getActivity();
        int systemSwDp = getSystemSwDp(activity);
        call.resolve(buildResult(true, systemSwDp, systemSwDp));
    }

    @PluginMethod
    public void getCurrentSwDp(PluginCall call) {
        Activity activity = getActivity();
        int storedSwDp = getEffectiveStoredSwDp(activity);
        int systemSwDp = getSystemSwDp(activity);
        int appliedSwDp = storedSwDp > 0 ? storedSwDp : systemSwDp;
        JSObject result = buildResult(true, appliedSwDp, systemSwDp);
        result.put("overrideEnabled", storedSwDp > 0);
        call.resolve(result);
    }

    @PluginMethod
    public void setDpi(PluginCall call) {
        setSwDp(call);
    }

    @PluginMethod
    public void resetDpi(PluginCall call) {
        resetSwDp(call);
    }

    @PluginMethod
    public void getSystemDpi(PluginCall call) {
        getSystemSwDp(call);
    }

    @PluginMethod
    public void getCurrentDpi(PluginCall call) {
        getCurrentSwDp(call);
    }

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static int clampSwDp(int swDp) {
        return Math.max(MIN_SW_DP, Math.min(MAX_SW_DP, swDp));
    }

    private static int getEffectiveStoredSwDp(Context context) {
        SharedPreferences prefs = getPrefs(context);
        int storedSwDp = prefs.getInt(KEY_SW_DP, 0);
        if (storedSwDp >= MIN_SW_DP && storedSwDp <= MAX_SW_DP) return storedSwDp;
        return prefs.getBoolean(KEY_DISABLED, false) ? 0 : DEFAULT_SW_DP;
    }

    private static int getSystemSwDp(Context context) {
        if (context == null) return DEFAULT_SW_DP;
        int swDp = Resources.getSystem().getConfiguration().smallestScreenWidthDp;
        if (swDp <= 0) swDp = context.getResources().getConfiguration().smallestScreenWidthDp;
        return swDp > 0 ? swDp : DEFAULT_SW_DP;
    }

    private static JSObject buildResult(boolean supported, int swDp, int systemSwDp) {
        JSObject result = new JSObject();
        result.put("supported", supported);
        result.put("swDp", swDp);
        result.put("systemSwDp", systemSwDp);
        result.put("dpi", swDp);
        result.put("systemDpi", systemSwDp);
        return result;
    }

    private static void applySwDp(Activity activity, int swDp) {
        Resources resources = activity.getResources();
        Configuration configuration = new Configuration(resources.getConfiguration());
        applySwDpToConfiguration(configuration, swDp);
        resources.updateConfiguration(configuration, resources.getDisplayMetrics());
    }

    private static void applySwDpToConfiguration(Configuration configuration, int swDp) {
        configuration.smallestScreenWidthDp = swDp;
        if (configuration.screenWidthDp > 0) {
            configuration.screenWidthDp = swDp;
        }
    }

    private static void recreateSoon(Activity activity) {
        new Handler(Looper.getMainLooper()).postDelayed(activity::recreate, 150);
    }
}
