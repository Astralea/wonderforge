import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const origin = 'http://127.0.0.1:5589';
const browser = await chromium.launch({ channel: 'chromium' });
const report = [];
try {
  for (const [mode, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: mode === 'mobile' ? 2 : 1, isMobile: mode === 'mobile', hasTouch: mode === 'mobile' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const rejectViteOverlay = async () => {
      if (await page.locator('vite-error-overlay').count()) throw new Error(`${mode}: Vite error overlay blocks visual acceptance`);
    };
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Choose a site' }).click();
    const row = page.getByRole('button', { name: /Eiffel Tower/ });
    await row.scrollIntoViewIfNeeded();
    if (mode === 'desktop') await row.hover();
    else await row.focus();
    await page.waitForTimeout(1900);
    const glyph = row.locator('[data-glyph="eiffel-tower"]');
    const bounds = await glyph.boundingBox();
    const ink = await glyph.locator('.wg-build').evaluateAll(paths => paths.map(node => ({ opacity: getComputedStyle(node).opacity, dashoffset: getComputedStyle(node).strokeDashoffset })));
    if (Math.abs(bounds.width - 38.4) > .1 || ink.some(path => Number(path.opacity) !== 1 || parseFloat(path.dashoffset) !== 0)) throw new Error(`${mode}: incomplete catalog glyph ${JSON.stringify({bounds, ink})}`);
    const homeLoaders = await page.locator('.eiffel-arrival').count();
    if (homeLoaders !== 0) throw new Error(`${mode}: unexpected homepage loader`);
    await rejectViteOverlay();
    await page.screenshot({ path: path.join(directory, `${mode}-catalog.png`) });
    await row.screenshot({ path: path.join(directory, `${mode}-catalog-row.png`) });
    await rejectViteOverlay();
    await page.goto(`${origin}/artifacts/eiffel-icon-recut-2026-09-20/browser-review.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.reviewAt === 'function');
    const fills = [];
    for (const percent of [0, 50, 100]) {
      await page.evaluate(percent => window.reviewAt(percent), percent);
      await page.waitForFunction(percent => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === String(percent), percent);
      await page.waitForTimeout(100);
      const fill = await page.locator('[data-testid="eiffel-loading-fill"]').getAttribute('transform');
      const rules = await page.locator('.eiffel-arrival-surface').getAttribute('fill-rule');
      const bounds = await page.locator('.eiffel-arrival-panel').boundingBox();
      if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > viewport.width || bounds.y + bounds.height > viewport.height) throw new Error(`${mode}: loading panel clipped`);
      const waveCount = await page.locator('.eiffel-arrival-wave').count();
      let moving = null;
      if (waveCount) {
        const before = await page.locator('.eiffel-arrival-wave').evaluate(node => getComputedStyle(node).transform);
        await page.waitForTimeout(200);
        const after = await page.locator('.eiffel-arrival-wave').evaluate(node => getComputedStyle(node).transform);
        moving = before !== after;
        if (!moving) throw new Error(`${mode}: wave is static at ${percent}%`);
      }
      if (rules !== 'evenodd' || waveCount !== (percent === 100 ? 0 : 1)) throw new Error(`${mode}: fill contract changed`);
      fills.push({ percent, fill, rules, waveCount, moving, bounds });
      await rejectViteOverlay();
      await page.screenshot({ path: path.join(directory, `${mode}-arrival-${percent}.png`) });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.reviewAt(50));
    await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === '50');
    const reducedWave = await page.locator('.eiffel-arrival-wave').evaluate(node => ({ display: getComputedStyle(node).display, animation: getComputedStyle(node).animationName }));
    if (reducedWave.display !== 'none') throw new Error(`${mode}: reduced-motion wave visible`);
    if (errors.length) throw new Error(`${mode}: ${errors.join('; ')}`);
    report.push({ mode, viewport, catalogGlyph: bounds, catalogInk: ink, homeLoaders, fills, reducedWave, errors });
    await context.close();
  }
  await writeFile(path.join(directory, 'browser-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Desktop and mobile: live catalog hover/focus at 38.4 px; actual loading component 0/50/100, animated wave, no clipping, reduced motion; no page errors.');
} finally {
  await browser.close();
}
