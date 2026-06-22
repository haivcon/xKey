package com.haivcon.xkey;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.content.res.AssetFileDescriptor;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.MessageDigest;

@CapacitorPlugin(name = "XKeyFileSaver")
public class XKeyFileSaverPlugin extends Plugin {
    @PluginMethod
    public void saveFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String sourcePath = call.getString("sourcePath");
        if (fileName == null || fileName.trim().isEmpty() || sourcePath == null || sourcePath.contains("..") || sourcePath.contains("/") || sourcePath.contains("\\")) {
            call.reject("Missing file data or file name");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "saveFileResult");
    }

    @PluginMethod
    public void verifySavedFile(PluginCall call) {
        String uriString = call.getString("uri");
        String expectedSha256 = call.getString("expectedSha256", "");
        if (uriString == null || uriString.trim().isEmpty()) {
            call.reject("Missing saved file URI");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            InputStream input = getContext().getContentResolver().openInputStream(uri);
            if (input == null) throw new IllegalStateException("Unable to open saved file");
            String actualSha256 = sha256(input);
            long size = -1;
            try (AssetFileDescriptor descriptor = getContext().getContentResolver().openAssetFileDescriptor(uri, "r")) {
                if (descriptor != null) size = descriptor.getLength();
            } catch (Exception ignored) {
                size = -1;
            }

            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            response.put("size", size);
            response.put("sha256", actualSha256);
            response.put("verified", expectedSha256.isEmpty() || expectedSha256.equals(actualSha256));
            call.resolve(response);
        } catch (Exception error) {
            call.reject("VERIFY_FAILED", error);
        }
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("SAVE_CANCELLED");
            return;
        }
        try {
            Uri uri = result.getData().getData();
            try {
                getContext().getContentResolver().takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                );
            } catch (Exception ignored) {
                // Some document providers do not offer persistable grants. The export still remains valid.
            }
            File source = new File(getContext().getCacheDir(), call.getString("sourcePath"));
            if (!source.isFile()) throw new IllegalStateException("Temporary export file is unavailable");
            long size = source.length();
            try (FileInputStream input = new FileInputStream(source); OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "w")) {
                if (stream == null) throw new IllegalStateException("Unable to open destination");
                byte[] buffer = new byte[32 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) stream.write(buffer, 0, read);
                stream.flush();
            }
            try (AssetFileDescriptor descriptor = getContext().getContentResolver().openAssetFileDescriptor(uri, "r")) {
                if (descriptor != null && descriptor.getLength() >= 0 && descriptor.getLength() != size) {
                    throw new IllegalStateException("Saved file size verification failed");
                }
            }
            String sourceHash = sha256(new FileInputStream(source));
            InputStream savedInput = getContext().getContentResolver().openInputStream(uri);
            if (savedInput == null || !sourceHash.equals(sha256(savedInput))) {
                throw new IllegalStateException("Saved file verification failed");
            }
            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            response.put("fileName", call.getString("fileName"));
            response.put("size", size);
            response.put("sha256", sourceHash);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("SAVE_FAILED", error);
        }
    }

    private String sha256(InputStream input) throws Exception {
        try (InputStream stream = input) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[32 * 1024];
            int read;
            while ((read = stream.read(buffer)) != -1) digest.update(buffer, 0, read);
            StringBuilder output = new StringBuilder();
            for (byte value : digest.digest()) output.append(String.format("%02x", value));
            return output.toString();
        }
    }
}
