import { chromium } from '@playwright/test';
import { writeFile, stat } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader'] });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], responses = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => responses.push({ path: new URL(response.url()).pathname, status: response.status() }));
    await page.addInitScript(() => {
      window.__auditRafCalls = 0;
      const original = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => original(time => { window.__auditRafCalls++; callback(time); });
    });
    const start = Date.now();
    await page.goto('http://127.0.0.1:5590/#/wonder/eiffel-tower', { waitUntil: 'domcontentloaded' });
    await page.locator('canvas[data-assets="ready"]').waitFor({ timeout: 90000 });
    await page.getByRole('button', { name: 'Replay film' }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => window.__auditRafCalls);
    await page.waitForTimeout(1000);
    const settled = await page.evaluate(() => ({ rafCalls: window.__auditRafCalls, renderer: window.__WONDERFORGE_RENDERER__, resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize, transferSize: entry.transferSize })) }));
    const modelPaths = [...new Set(responses.filter(response => response.path.startsWith('/models/')).map(response => response.path))];
    let modelBytes = 0;
    const modelFiles = [];
    for (const path of modelPaths) {
      const bytes = (await stat(`dist${path}`)).size;
      modelBytes += bytes; modelFiles.push({ path, bytes });
    }
    const slider = page.getByRole('slider', { name: 'Film position' });
    await slider.focus(); await page.keyboard.press('ArrowLeft');
    const afterArrow = { hash: new URL(page.url()).hash, filmPosition: await slider.inputValue(), play: await page.getByRole('button', { name: 'Play', exact: true }).count() };
    const about = page.getByRole('button', { name: 'About this wonder' });
    await about.click();
    const facts = await page.evaluate(() => {
      const close = document.querySelector('[aria-label="Close information panel"]');
      const box = close?.getBoundingClientRect();
      return { activeLabel: document.activeElement?.getAttribute('aria-label'), closeWidth: box?.width, closeHeight: box?.height, role: close?.parentElement?.getAttribute('role'), modal: close?.parentElement?.getAttribute('aria-modal') };
    });
    await page.keyboard.press('Escape');
    facts.hashAfterEscape = new URL(page.url()).hash;
    results.push({ viewport, elapsedLocalMs: Date.now() - start, idleRafCallbacksOverOneSecond: settled.rafCalls - before, modelBytes, modelFiles, afterArrow, facts, renderer: settled.renderer, responses, errors, resources: settled.resources });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(new URL('browser-audit.json', root), JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results.map(({ viewport, elapsedLocalMs, idleRafCallbacksOverOneSecond, modelBytes, afterArrow, facts, errors }) => ({ viewport, elapsedLocalMs, idleRafCallbacksOverOneSecond, modelBytes, afterArrow, facts, errors })), null, 2));
