import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SYDNEY_QA_OUT ?? 'artifacts/sydney-overhaul-2026-09-23/live-film';
const bundle = (await (await fetch('http://127.0.0.1:5591/')).text()).match(/src="([^"]+\.js)"/)?.[1];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--mute-audio'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const errors = [],
  samples = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto('http://127.0.0.1:5591/#/debug/film/sydney-opera-house', {
  waitUntil: 'networkidle',
});
await page.waitForFunction(
  () =>
    window.__THREE_GAME_DIAGNOSTICS__?.scene === 'sydney-opera-house-reference',
);
await page.mouse.move(700, 850);
await page.keyboard.press('r');
const started = Date.now();
const seek = page.getByLabel('Film position', { exact: true });
while (Date.now() - started < 70000) {
  const t = Number(await seek.inputValue());
  samples.push({
    elapsed: (Date.now() - started) / 1000,
    t,
    diagnostics: await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__),
  });
  if (t >= 1) break;
  await page.waitForTimeout(1000);
}
if (samples.at(-1).t !== 1) throw new Error('Natural film failed to complete');
await page.mouse.move(700, 850);
await page.screenshot({ path: `${out}/natural-ending.png` });
await page.getByRole('button', { name: 'Replay film', exact: true }).click();
await page.waitForTimeout(800);
const replayT = Number(await seek.inputValue());
if (!(replayT > 0 && replayT < 0.1)) throw new Error('Replay failed');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const returnedToCatalog = !(await page
  .getByLabel('Film position', { exact: true })
  .count());
if (!returnedToCatalog) throw new Error('Return to catalogue failed');
await writeFile(
  `${out}/report.json`,
  JSON.stringify(
    { bundle, samples, replayT, returnedToCatalog, errors, audibleListening: false },
    null,
    2,
  ),
);
await context.close();
await browser.close();
if (errors.length) throw new Error(`Film browser errors: ${errors.join('; ')}`);
console.log(
  JSON.stringify({
    samples: samples.length,
    duration: samples.at(-1).elapsed,
    replayT,
    returnedToCatalog,
    errors,
  }),
);
