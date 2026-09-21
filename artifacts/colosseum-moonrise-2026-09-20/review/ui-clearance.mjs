import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const directory = 'artifacts/colosseum-moonrise-2026-09-20/review';
const results = [];
try {
  for (const [mode, width, height] of [['desktop', 1280, 720], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5589/#/wonder/colosseum', { waitUntil: 'networkidle' });
    const slider = page.getByLabel('Film position'); await slider.waitFor();
    await page.waitForTimeout(1000);
    await page.mouse.move(width / 2, height - 80);
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    if (await pause.count()) await pause.click();
    for (const t of [.88, .94, 1]) {
      await slider.evaluate((el, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, t);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${directory}/${mode}-ui-${t}.png` });
      results.push({ mode, t, errors, diagnostics: await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__), geometry: await page.evaluate(() => ({ canvas: document.querySelector('canvas').getBoundingClientRect().toJSON(), letterbox: document.querySelector('[data-testid="cinematic-letterbox-top"]').getBoundingClientRect().toJSON() })) });
    }
    await page.close();
  }
  await writeFile(`${directory}/ui-clearance.json`, JSON.stringify(results, null, 2));
  console.log('Actual desktop and mobile UI captured at .88, .94 and 1.');
} finally { await browser.close(); }
