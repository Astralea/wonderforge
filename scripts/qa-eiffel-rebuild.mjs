#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = 'http://127.0.0.1:5589';
const out = process.env.EIFFEL_QA_OUT || 'artifacts/eiffel-rebuild/qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium' });
const flowOnly = process.argv.includes('--flow-only');
const prior = flowOnly ? JSON.parse(await readFile(`${out}/report.json`, 'utf8')) : null;
const report = { captures: prior?.captures ?? [], errors: [], playback: {}, reducedMotion: {} };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function listen(page) {
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
}
async function ready(page) {
  await page.waitForSelector('canvas[data-assets="ready"]', { timeout: 60000 });
  await page.waitForTimeout(150);
}
try {
  for (const [name, width, height] of (flowOnly ? [] : [['desktop', 1440, 900], ['mobile', 390, 844]])) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: name === 'mobile' ? 1.35 : 1, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
    const page = await context.newPage(); listen(page);
    for (const t of [.12, .12279, .32, .53093, .58, .69127, .78, .92, 1]) {
      await page.goto(`${base}/#/debug/wonder/eiffel-tower/${t}`, { waitUntil: 'networkidle' });
      await ready(page);
      const path = `${out}/${name}-${String(t).replace('.', '')}.png`;
      await page.screenshot({ path });
      const metrics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__);
      report.captures.push({ name, t, path, metrics });
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); listen(page);
  await page.goto(`${base}/#/wonder/eiffel-tower`, { waitUntil: 'networkidle' });
  await ready(page);
  await page.mouse.move(720, 740);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const slider = page.locator('input[aria-label="Seek"]');
  const seek = async value => {
    await slider.evaluate((input, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(v));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.waitForTimeout(200);
  };
  const hideChrome = await page.addStyleTag({ content: 'section > div:not(:first-child) { visibility: hidden !important; }' });
  await seek(.58);
  const first = hash(await page.locator('canvas').screenshot({ path: `${out}/reverse-seek-a.png` }));
  await seek(.9); await seek(.58);
  const second = hash(await page.locator('canvas').screenshot({ path: `${out}/reverse-seek-b.png` }));
  await hideChrome.evaluate(el => el.remove());
  report.playback.reverseSeekExactPixels = first === second;
  if (first !== second) throw new Error('Backward seeking changed the canvas at the same time');
  await page.screenshot({ path: `${out}/desktop-controls-058.png` });
  // Native pointer seek, then real playback at the application's supported 4x.
  const rect = await slider.boundingBox();
  await page.mouse.click(rect.x + rect.width * .15, rect.y + rect.height / 2);
  report.playback.pointerSeek = Number(await slider.inputValue());
  await seek(0);
  await page.getByRole('button', { name: '4× speed', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const samples = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(2200);
    samples.push({ t: Number(await slider.inputValue()), metrics: await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__) });
  }
  report.playback.samples = samples;
  report.playback.completed = await page.getByRole('button', { name: 'Replay', exact: true }).count() === 1;
  if (!report.playback.completed) throw new Error('Live playback did not complete');
  await page.mouse.move(700, 720);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.waitForTimeout(500);
  report.playback.replayed = Number(await slider.inputValue()) < .15;
  await context.close();
  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const still = await reduced.newPage(); listen(still);
  await still.goto(`${base}/#/wonder/eiffel-tower`, { waitUntil: 'networkidle' });
  await ready(still);
  report.reducedMotion.time = Number(await still.getByRole('slider', { name: 'Seek' }).inputValue());
  await still.screenshot({ path: `${out}/mobile-reduced-motion.png` });
  await reduced.close();
  if (report.errors.length) throw new Error('Browser errors occurred');
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ captures: report.captures.length, errors: report.errors, playback: report.playback, reducedMotion: report.reducedMotion }, null, 2));
