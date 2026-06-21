package com.haivcon.xkey;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "XKeyFileOpen")
public class XKeyFileOpenPlugin extends Plugin {
    private static final int MAX_IMPORT_BYTES = 50 * 1024 * 1024;
    private static final String XKEY_EXTENSION = ".xkey";
    private Uri pendingUri;

    @Override
    public void load() {
        captureIntent(getActivity().getIntent(), false);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        captureIntent(intent, true);
    }

    @PluginMethod
    public void getPendingFile(PluginCall call) {
        if (pendingUri == null) {
            JSObject result = new JSObject();
            result.put("available", false);
            call.resolve(result);
            return;
        }

        try {
            JSObject result = readFile(pendingUri);
            pendingUri = null;
            call.resolve(result);
        } catch (Exception e) {
            pendingUri = null;
            call.reject("Unable to read the selected .xkey file", e);
        }
    }

    private void captureIntent(Intent intent, boolean notify) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return;
        pendingUri = intent.getData();
        getActivity().setIntent(intent);
        if (notify) {
            JSObject payload = new JSObject();
            payload.put("available", true);
            notifyListeners("xkeyFileOpened", payload);
        }
    }

    private JSObject readFile(Uri uri) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        String name = getDisplayName(resolver, uri);
        String mimeType = resolver.getType(uri);
        byte[] bytes;
        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) throw new IllegalStateException("No input stream for file URI");
            bytes = readLimited(input);
        }

        JSObject result = new JSObject();
        result.put("available", true);
        result.put("name", normalizeFileName(name));
        result.put("mimeType", mimeType == null ? "" : mimeType);
        result.put("size", bytes.length);
        result.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
        return result;
    }

    private String getDisplayName(ContentResolver resolver, Uri uri) {
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (index >= 0) return cursor.getString(index);
                }
            } catch (Exception ignored) {
            }
        }
        String path = uri.getPath();
        if (path == null) return "";
        int slash = path.lastIndexOf('/');
        return slash >= 0 ? path.substring(slash + 1) : path;
    }

    private String normalizeFileName(String name) {
        if (name == null || name.trim().isEmpty()) return "opened.xkey";
        String trimmed = name.trim();
        int query = trimmed.indexOf('?');
        if (query >= 0) trimmed = trimmed.substring(0, query);
        int fragment = trimmed.indexOf('#');
        if (fragment >= 0) trimmed = trimmed.substring(0, fragment);
        return trimmed.toLowerCase().endsWith(XKEY_EXTENSION) ? trimmed : "opened.xkey";
    }

    private byte[] readLimited(InputStream input) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > MAX_IMPORT_BYTES) {
                throw new IllegalStateException(".xkey file is too large");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }
}
