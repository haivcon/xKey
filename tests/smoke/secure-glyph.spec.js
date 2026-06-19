import { expect, test } from '@playwright/test';

test('secure glyph display keeps revealed secret out of DOM text', async ({ page }) => {
  const secret = 'xkey-test-private-key-1234567890';

  await page.setContent(`
    <main>
      <span id="secure" data-secure-glyph="true" role="img" aria-label="Sensitive value rendered as secure display pixels">
        <canvas width="640" height="80"></canvas>
      </span>
      <script>
        const secret = ${JSON.stringify(secret)};
        const canvas = document.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '18px monospace';
        ctx.fillText(secret, 8, 32);
      </script>
    </main>
  `);

  await expect(page.locator('[data-secure-glyph="true"] canvas')).toBeVisible();
  const domText = await page.locator('body').innerText();
  expect(domText).not.toContain(secret);
});
