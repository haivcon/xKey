package com.haivcon.xkey;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKeyFactory;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "DeviceCredential")
public class DeviceCredentialPlugin extends Plugin {
    private static final String PREFS_NAME = "XKeyDeviceCredential";
    private static final String DEFAULT_ALIAS = "xkey_vault_key";
    private static final String KEY_PREFIX = "xkey_keystore_";
    private static final String DATA_PREFIX = "wrapped_";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int AUTH_WINDOW_SECONDS = 60;

    private PluginCall pendingSetCall;
    private PluginCall pendingGetCall;
    private String pendingPlainKey;
    private String pendingAlias;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isAvailable", isDeviceSecure());
        call.resolve(result);
    }

    @PluginMethod
    public void getHardwareSecurityInfo(PluginCall call) {
        String alias = call.getString("alias", DEFAULT_ALIAS);
        JSObject result = new JSObject();
        result.put("deviceSecure", isDeviceSecure());
        result.put("keystoreAvailable", isAndroidKeystoreAvailable());
        result.put("strongBoxSupported", isStrongBoxSupported());
        result.put("vaultKeyStored", hasWrappedKey(alias));
        result.put("vaultKeyInsideSecureHardware", isKeyInsideSecureHardware(alias));
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        Intent intent = credentialIntent(call);
        if (intent == null) {
            call.reject("Device credential is not configured");
            return;
        }
        startActivityForResult(call, intent, "authResult");
    }

    @PluginMethod
    public void openSecuritySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Unable to open device security settings", e);
        }
    }

    @PluginMethod
    public void setVaultKey(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("Missing vault key");
            return;
        }
        pendingSetCall = call;
        pendingPlainKey = key;
        pendingAlias = call.getString("alias", DEFAULT_ALIAS);
        Intent intent = credentialIntent(call);
        if (intent == null) {
            call.reject("Device credential is not configured");
            clearPending();
            return;
        }
        try {
            getOrCreateKey(pendingAlias);
        } catch (Exception e) {
            call.reject("Unable to prepare device-protected key", e);
            clearPending();
            return;
        }
        startActivityForResult(call, intent, "setVaultKeyResult");
    }

    @PluginMethod
    public void getVaultKey(PluginCall call) {
        pendingGetCall = call;
        pendingAlias = call.getString("alias", DEFAULT_ALIAS);
        if (!hasWrappedKey(pendingAlias)) {
            call.reject("No device-protected vault key found", "NOT_FOUND");
            clearPending();
            return;
        }
        Intent intent = credentialIntent(call);
        if (intent == null) {
            call.reject("Device credential is not configured");
            clearPending();
            return;
        }
        startActivityForResult(call, intent, "getVaultKeyResult");
    }

    @PluginMethod
    public void hasVaultKey(PluginCall call) {
        String alias = call.getString("alias", DEFAULT_ALIAS);
        JSObject result = new JSObject();
        result.put("value", hasWrappedKey(alias));
        call.resolve(result);
    }

    @PluginMethod
    public void deleteVaultKey(PluginCall call) {
        String alias = call.getString("alias", DEFAULT_ALIAS);
        getPrefs().edit().remove(DATA_PREFIX + alias).apply();
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            if (ks.containsAlias(KEY_PREFIX + alias)) {
                ks.deleteEntry(KEY_PREFIX + alias);
            }
        } catch (Exception ignored) {
        }
        call.resolve();
    }

    @ActivityCallback
    private void authResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK) {
            call.resolve();
        } else {
            call.reject("Device credential authentication canceled");
        }
    }

    @ActivityCallback
    private void setVaultKeyResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Device credential authentication canceled");
            clearPending();
            return;
        }
        try {
            wrapVaultKey(pendingAlias, pendingPlainKey);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to protect vault key", e);
        } finally {
            clearPending();
        }
    }

    @ActivityCallback
    private void getVaultKeyResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Device credential authentication canceled");
            clearPending();
            return;
        }
        try {
            String key = unwrapVaultKey(pendingAlias);
            JSObject payload = new JSObject();
            payload.put("key", key);
            call.resolve(payload);
        } catch (KeyPermanentlyInvalidatedException e) {
            deleteKey(pendingAlias);
            getPrefs().edit().remove(DATA_PREFIX + pendingAlias).apply();
            call.reject("Device credential key was invalidated", "KEY_INVALIDATED", e);
        } catch (Exception e) {
            call.reject("Failed to unlock vault key", e);
        } finally {
            clearPending();
        }
    }

    private Intent credentialIntent(PluginCall call) {
        KeyguardManager keyguard = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguard == null || !isDeviceSecure()) return null;
        String title = call.getString("title", "Unlock xKey");
        String subtitle = call.getString("subtitle", "Use your device lock");
        return keyguard.createConfirmDeviceCredentialIntent(title, subtitle);
    }

    private boolean isDeviceSecure() {
        KeyguardManager keyguard = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguard == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) return keyguard.isDeviceSecure();
        return keyguard.isKeyguardSecure();
    }

    private boolean isAndroidKeystoreAvailable() {
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isStrongBoxSupported() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false;
        return getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE);
    }

    private boolean isKeyInsideSecureHardware(String alias) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            String keyAlias = KEY_PREFIX + alias;
            if (!ks.containsAlias(keyAlias)) return false;
            SecretKey key = (SecretKey) ks.getKey(keyAlias, null);
            SecretKeyFactory factory = SecretKeyFactory.getInstance(key.getAlgorithm(), "AndroidKeyStore");
            KeyInfo keyInfo = (KeyInfo) factory.getKeySpec(key, KeyInfo.class);
            return keyInfo.isInsideSecureHardware();
        } catch (Exception e) {
            return false;
        }
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private boolean hasWrappedKey(String alias) {
        return getPrefs().contains(DATA_PREFIX + alias);
    }

    private SecretKey getOrCreateKey(String alias) throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        String keyAlias = KEY_PREFIX + alias;
        if (ks.containsAlias(keyAlias)) {
            return (SecretKey) ks.getKey(keyAlias, null);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && isStrongBoxSupported()) {
            try {
                KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                KeyGenParameterSpec.Builder builder = buildKeySpec(keyAlias);
                builder.setIsStrongBoxBacked(true);
                generator.init(builder.build());
                return generator.generateKey();
            } catch (Exception ignored) {
                // Some devices advertise StrongBox but fail at key generation time.
                // Fall back to the regular Android Keystore provider.
            }
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        KeyGenParameterSpec.Builder builder = buildKeySpec(keyAlias);
        generator.init(builder.build());
        return generator.generateKey();
    }

    private KeyGenParameterSpec.Builder buildKeySpec(String keyAlias) {
        KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
            keyAlias,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(
                AUTH_WINDOW_SECONDS,
                KeyProperties.AUTH_DEVICE_CREDENTIAL | KeyProperties.AUTH_BIOMETRIC_STRONG
            );
            builder.setInvalidatedByBiometricEnrollment(false);
        } else {
            builder.setUserAuthenticationValidityDurationSeconds(AUTH_WINDOW_SECONDS);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setInvalidatedByBiometricEnrollment(false);
            }
        }

        return builder;
    }

    private void wrapVaultKey(String alias, String plainKey) throws Exception {
        SecretKey secretKey = getOrCreateKey(alias);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        try {
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        } catch (KeyPermanentlyInvalidatedException e) {
            deleteKey(alias);
            secretKey = getOrCreateKey(alias);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        }
        byte[] encrypted = cipher.doFinal(plainKey.getBytes(StandardCharsets.UTF_8));
        byte[] iv = cipher.getIV();
        byte[] combined = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
        getPrefs().edit().putString(DATA_PREFIX + alias, Base64.encodeToString(combined, Base64.NO_WRAP)).apply();
    }

    private String unwrapVaultKey(String alias) throws Exception {
        String encoded = getPrefs().getString(DATA_PREFIX + alias, null);
        if (encoded == null) throw new IllegalStateException("No wrapped key");
        byte[] combined = Base64.decode(encoded, Base64.NO_WRAP);
        byte[] iv = new byte[12];
        byte[] encrypted = new byte[combined.length - iv.length];
        System.arraycopy(combined, 0, iv, 0, iv.length);
        System.arraycopy(combined, iv.length, encrypted, 0, encrypted.length);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(alias), new GCMParameterSpec(GCM_TAG_BITS, iv));
        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    }

    private void deleteKey(String alias) {
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            ks.deleteEntry(KEY_PREFIX + alias);
        } catch (Exception ignored) {
        }
    }

    private void clearPending() {
        pendingSetCall = null;
        pendingGetCall = null;
        pendingPlainKey = null;
        pendingAlias = null;
    }
}
