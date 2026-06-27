import { expect, test } from '@playwright/test';

const ANDROID_VIEWPORTS = [
  ['android-360', 360, 800],
  ['android-390', 390, 844],
  ['android-412-s20-ultra', 412, 915],
  ['android-430', 430, 932],
  ['android-480', 480, 900],
];

const SLOGAN = 'NOT YOUR KEY, NOT YOUR CRYPTO';
const sloganHtml = Array.from(SLOGAN).map((letter, index) => `
  <span
    class="${letter === ' ' ? 'home-header-slogan-space' : 'home-header-slogan-letter'}"
    style="animation-delay: ${index * 45}ms"
  >${letter === ' ' ? '&nbsp;' : letter}</span>
`).join('');

const headerFixture = `
  <!doctype html>
  <html class="dark" data-theme="dark">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/src/index.css" />
    </head>
    <body class="bg-surface-950 text-surface-50">
      <div class="app-scaled-icons min-h-screen bg-surface-950 text-surface-50 font-sans selection:bg-brand-500/30">
        <header class="sticky top-0 z-30 bg-surface-900/95 backdrop-blur-md border-b border-surface-800 px-[clamp(0.625rem,3vw,1rem)] pt-[calc(env(safe-area-inset-top,0px)+clamp(0.625rem,2.6vw,1rem))] pb-[clamp(0.625rem,2.6vw,1rem)] shadow-xl">
          <div class="max-w-[140rem] mx-auto w-full">
            <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[clamp(0.25rem,1.8vw,0.5rem)]">
              <div data-testid="header-brand" class="flex min-w-0 items-center gap-[clamp(0.25rem,1.5vw,0.5rem)]">
                <div class="home-header-logo rounded-lg bg-surface-700 logo-animated"></div>
                <div class="flex min-w-0 items-baseline">
                  <h1 class="home-header-title font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 leading-tight">xKey</h1>
                </div>
              </div>
              <div data-testid="header-slogan-wrap" class="pointer-events-none min-w-0 w-full justify-self-center overflow-hidden text-center" aria-label="${SLOGAN}">
                <div data-testid="header-slogan" class="home-header-slogan text-center">${sloganHtml}</div>
              </div>
              <div data-testid="header-actions" class="flex items-center justify-self-end gap-1">
                <button class="btn-icon-glow relative rounded-full bg-surface-800 p-2 text-surface-400 transition-colors" aria-label="Key health"><span class="block h-5 w-5 rounded-full border border-current"></span></button>
                <button class="p-2 bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 border border-fuchsia-500/30 rounded-full transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse" aria-label="Donate"><span class="block h-5 w-5 rounded-full bg-fuchsia-400/50"></span></button>
                <button class="btn-icon-glow p-2 text-surface-400 bg-surface-800 rounded-full transition-colors" aria-label="Settings"><span class="block h-5 w-5 rounded-full border border-current"></span></button>
              </div>
            </div>
          </div>
        </header>
        <main class="p-4"><div class="h-64 rounded-2xl bg-surface-900 border border-surface-800"></div></main>
      </div>
    </body>
  </html>
`;

async function loadHeaderFixture(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.setContent(headerFixture, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-testid="header-slogan"]')).toBeVisible();
}


async function readHeaderMetrics(page) {
  return page.evaluate(() => {
    const rectOf = (selector) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Missing ${selector}`);
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };

    const slogan = document.querySelector('[data-testid="header-slogan"]');
    if (!slogan) throw new Error('Missing slogan node');

    const firstLetter = slogan.querySelector('.home-header-slogan-letter');
    if (!firstLetter) throw new Error('Missing slogan letters');

    const style = window.getComputedStyle(firstLetter);
    const letterRects = Array.from(slogan.querySelectorAll('.home-header-slogan-letter')).map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });

    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      header: rectOf('header'),
      brand: rectOf('[data-testid="header-brand"]'),
      slogan: rectOf('[data-testid="header-slogan"]'),
      sloganWrap: rectOf('[data-testid="header-slogan-wrap"]'),
      actions: rectOf('[data-testid="header-actions"]'),
      fontSize: Number.parseFloat(style.fontSize),
      letterSpacing: style.letterSpacing === 'normal' ? 0 : Number.parseFloat(style.letterSpacing),
      letterRects,
    };
  });
}

for (const [name, width, height] of ANDROID_VIEWPORTS) {
  test(`header slogan remains readable and unclipped at ${name}`, async ({ page }) => {
    await loadHeaderFixture(page, width, height);
    const metrics = await readHeaderMetrics(page);

    expect(metrics.documentScrollWidth, 'page should not horizontally overflow').toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.slogan.width, 'slogan should fit inside its wrapper').toBeLessThanOrEqual(metrics.sloganWrap.width + 0.5);
    expect(metrics.slogan.left, 'slogan should stay inside the viewport').toBeGreaterThanOrEqual(0);
    expect(metrics.slogan.right, 'slogan should stay inside the viewport').toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.slogan.right, 'slogan should not overlap action buttons').toBeLessThanOrEqual(metrics.actions.left + 0.5);
    expect(metrics.slogan.left, 'slogan should not overlap the brand area').toBeGreaterThanOrEqual(metrics.brand.right - 0.5);
    expect(metrics.fontSize, 'slogan font-size should remain readable').toBeGreaterThanOrEqual(width <= 360 ? 4.7 : 5.4);
    expect(metrics.letterSpacing, 'slogan letters should keep positive spacing').toBeGreaterThanOrEqual(0.09);

    for (let index = 1; index < metrics.letterRects.length; index += 1) {
      expect(
        metrics.letterRects[index].left,
        `letter ${index} should not overlap the previous letter`,
      ).toBeGreaterThanOrEqual(metrics.letterRects[index - 1].right - 0.25);
    }

    await expect(page).toHaveScreenshot(`header-slogan-${name}.png`, {
      clip: {
        x: 0,
        y: 0,
        width,
        height: Math.ceil(metrics.header.height + 8),
      },
      maxDiffPixelRatio: 0.04,
    });
  });
}
