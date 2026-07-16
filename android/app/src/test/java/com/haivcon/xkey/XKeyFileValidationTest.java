package com.haivcon.xkey;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import org.junit.Test;

public class XKeyFileValidationTest {
    @Test
    public void normalizesSafeXKeyNames() {
        assertEquals("wallet.xkey", XKeyFileValidation.normalizeFileName(" wallet.xkey "));
        assertEquals("BACKUP.XKEY", XKeyFileValidation.normalizeFileName("BACKUP.XKEY"));
        assertEquals("wallet.xkey", XKeyFileValidation.normalizeFileName("wallet.xkey?download=1"));
        assertEquals("wallet.xkey", XKeyFileValidation.normalizeFileName("wallet.xkey#fragment"));
    }

    @Test
    public void rejectsMissingWrongOrPathLikeNames() {
        assertEquals("opened.xkey", XKeyFileValidation.normalizeFileName(null));
        assertEquals("opened.xkey", XKeyFileValidation.normalizeFileName(" "));
        assertEquals("opened.xkey", XKeyFileValidation.normalizeFileName("wallet.json"));
        assertEquals("opened.xkey", XKeyFileValidation.normalizeFileName("../wallet.xkey"));
        assertEquals("opened.xkey", XKeyFileValidation.normalizeFileName("folder\\wallet.xkey"));
    }

    @Test
    public void readsSmallPayloadWithoutMutation() throws Exception {
        byte[] source = new byte[] { 1, 2, 3, 4, 5 };
        assertArrayEquals(
            source,
            XKeyFileValidation.readLimited(new ByteArrayInputStream(source))
        );
    }

    @Test
    public void acceptsExactSizeLimit() throws Exception {
        byte[] result = XKeyFileValidation.readLimited(
            new CountingInputStream(XKeyFileValidation.MAX_IMPORT_BYTES)
        );
        assertEquals(XKeyFileValidation.MAX_IMPORT_BYTES, result.length);
    }

    @Test
    public void rejectsOneByteBeyondSizeLimit() {
        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> XKeyFileValidation.readLimited(
                new CountingInputStream((long) XKeyFileValidation.MAX_IMPORT_BYTES + 1)
            )
        );
        assertEquals(".xkey file is too large", error.getMessage());
    }

    private static final class CountingInputStream extends InputStream {
        private long remaining;

        private CountingInputStream(long size) {
            remaining = size;
        }

        @Override
        public int read() {
            if (remaining <= 0) return -1;
            remaining -= 1;
            return 0;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) {
            if (remaining <= 0) return -1;
            int count = (int) Math.min(remaining, length);
            remaining -= count;
            return count;
        }
    }
}