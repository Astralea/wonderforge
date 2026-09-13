import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'artifacts/paris-exposition-2026-09-07/qa-close';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium' });
const report = { captures: [], errors: [] };
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['mobile', 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (e) => report.errors.push(e.message));
    page.on('console', (e) => {
      if (e.type() === 'error') report.errors.push(e.text());
    });
    await page.route('**/paris-review', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Paris inspection</title><body style="margin:0;overflow:hidden"></body>',
      }),
    );
    await page.goto('http://127.0.0.1:5590/paris-review');
    for (const kind of [
      'exposition',
      'market',
      'city',
      'street',
      'pedestrian',
      'river',
    ]) {
      const result = await page.evaluate(
        async (kind) =>
          (await import('/scripts/paris-review.ts')).mountParisReview(kind),
        kind,
      );
      const path = `${out}/${name}-${kind}.png`;
      await page.screenshot({ path });
      report.captures.push({ name, path, ...result });
    }
    await page.close();
  }
  if (report.errors.length) throw new Error(report.errors.join('\n'));
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
