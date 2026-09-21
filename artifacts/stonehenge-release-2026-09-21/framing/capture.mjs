import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.STONEHENGE_PREVIEW_URL ?? 'http://127.0.0.1:5589';
const label = process.env.STONEHENGE_CAPTURE_LABEL ?? 'dev';
const out = `artifacts/stonehenge-release-2026-09-21/framing/${label}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const results = [];
try {
  for (const [mode, width, height, frames] of [
    ['desktop', 1440, 900, [.68, .74, .78, .86, .92, 1]],
    ['1080p', 1920, 1080, [.78, .86, .92, 1]],
    ['portrait', 390, 844, [.78, .86, .92, 1]],
    ['wide', 2560, 1080, [.78, 1]],
    ['tablet', 1024, 768, [.78, 1]],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${origin}/#/wonder/stonehenge`, { waitUntil: 'networkidle' });
    const slider = page.getByLabel('Film position'); await slider.waitFor(); await page.waitForTimeout(1000);
    await page.mouse.move(width / 2, height - 95);
    if (await page.getByRole('button', { name: 'Pause', exact: true }).count()) await page.getByRole('button', { name: 'Pause', exact: true }).click();
    for (const t of frames) {
      await slider.evaluate((el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, t);
      await page.waitForTimeout(350);
      const path = `${out}/${mode}-t${t}.png`; await page.screenshot({ path });
      results.push({ mode, width, height, t, path, errors: [...errors], state: await page.evaluate(() => ({ diagnostics: window.__THREE_GAME_DIAGNOSTICS__, scripts: [...document.scripts].map(s => s.src).filter(Boolean), letterbox: document.querySelector('[data-testid="cinematic-letterbox-top"]').getBoundingClientRect().toJSON(), caption: document.querySelector('[data-testid="live-caption"]')?.getBoundingClientRect().toJSON() ?? null })) });
    }
    console.log(JSON.stringify({ mode, frames: frames.length, errors })); await page.close();
  }
} finally { await browser.close(); await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2)); }
