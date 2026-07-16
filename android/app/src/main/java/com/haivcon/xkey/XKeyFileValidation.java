package com.haivcon.xkey;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

final class XKeyFileValidation {
    static final int MAX_IMPORT_BYTES = 50 * 1024 * 1024;
    private static final String XKEY_EXTENSION = ".xkey";

    private XKeyFileValidation() {
    }

    static String normalizeFileName(String name) {
        if (name == null || name.trim().isEmpty()) return "opened.xkey";
        String trimmed = name.trim();
        int query = trimmed.indexOf('?');
        if (query >= 0) trimmed = trimmed.substring(0, query);
        int fragment = trimmed.indexOf('#');
        if (fragment >= 0) trimmed = trimmed.substring(0, fragment);
        if (trimmed.indexOf('/') >= 0 || trimmed.indexOf('\\') >= 0) return "opened.xkey";
        return trimmed.toLowerCase(Locale.ROOT).endsWith(XKEY_EXTENSION)
            ? trimmed
            : "opened.xkey";
    }

    static byte[] readLimited(InputStream input) throws IOException {
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