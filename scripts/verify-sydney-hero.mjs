import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const out = process.env.SYDNEY_QA_OUT ?? 'artifacts/sydney-overhaul-2026-09-23/hero-motion';
const operations = JSON.parse(await readFile(process.env.SYDNEY_HERO_OPERATIONS ?? 'artifacts/sydney-overhaul-2026-09-23/hero-operations.json', 'utf8'));
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const bundle = (await (await fetch('http://127.0.0.1:5591/')).text()).match(/src="([^"]+\.js)"/)?.[1];
for (const kind of ['rib', 'sail']) {
  const selected = operations.filter(p => p.kind === kind);
  const dir = `${out}/${kind}`;
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir, size: { width: 1440, height: 900 } } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5591/#/debug/film/sydney-opera-house', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.scene === 'sydney-opera-house-reference');
  await page.mouse.move(700, 850);
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  if (await pause.count()) await pause.click();
  const seek = page.getByLabel('Film position', { exact: true });
  const start = Math.min(...selected.map(p => p.start)) - .04;
  const end = Math.max(...selected.map(p => p.start + p.duration)) + .026;
  await seek.evaluate((el, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, start);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.mouse.move(10, 10);
  const samples = [];
  const deadline = Date.now() + (end - start) * 60000 + 10000;
  while (Number(await seek.inputValue()) < end) {
    if (Date.now() > deadline) throw new Error(`${kind} hero playback stalled`);
    const t = Number(await seek.inputValue());
    const path = `${dir}/frame-${String(samples.length).padStart(2, '0')}.png`;
    await page.screenshot({ path });
    samples.push({ t, path });
    await page.waitForTimeout(100);
  }
  await page.mouse.move(700, 850);
  await pause.click();
  await writeFile(`${dir}/report.json`, JSON.stringify({ bundle, selected, start, end, samples, errors, playbackSpeed: 1 }, null, 2));
  await context.close();
  if (errors.length) throw new Error(`${kind} hero browser errors: ${errors.join('; ')}`);
}
await browser.close();
