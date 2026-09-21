import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'artifacts/review-board/release-2026-09-21/giza-stonehenge';
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const results = { scope: 'Read-only visual review. Continuous desktop films at 1x; actual portrait UI checkpoints. Muted audio; no audio-quality or physical-phone/FPS claim.', runs: [] };
const films = ['pyramids-of-giza', 'stonehenge'];
try {
  for (const film of films) {
    const directory = `${out}/${film}`; await mkdir(directory, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: `${directory}/video`, size: { width: 1440, height: 900 } } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5590/#/wonder/${film}`, { waitUntil: 'networkidle' });
    const slider = page.getByLabel('Film position'); await slider.waitFor(); await page.waitForTimeout(1000);
    await page.mouse.move(720, 800);
    if (await page.getByRole('button', { name: 'Pause', exact: true }).count()) await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await slider.evaluate(el => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '0'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.getByRole('button', { name: 'Playback speed: 1 times', exact: true }).click();
    const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
    if (!scripts.some(s => s.includes('main-D8RR7sSY.js'))) throw new Error(`Wrong production bundle ${scripts}`);
    await page.evaluate(() => { window.__visualTimeline = []; window.__visualTimer = setInterval(() => window.__visualTimeline.push({ wall: performance.now(), t: Number(document.querySelector('[aria-label="Film position"]')?.value), caption: document.querySelector('[data-testid="live-caption"]')?.textContent ?? null, diagnostics: window.__THREE_GAME_DIAGNOSTICS__ }), 250); });
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.mouse.move(1438, 2);
    const started = Date.now(), frames = [];
    for (let frame = 0; frame <= 36; frame++) {
      const elapsed = Date.now() - started;
      if (frame > 0) await page.waitForTimeout(Math.max(10, frame * 2000 - elapsed));
      const t = Number(await slider.inputValue());
      const path = `${directory}/desktop-live-${String(frame).padStart(2, '0')}-t${t.toFixed(4)}.png`;
      await page.screenshot({ path });
      frames.push({ wallSeconds: (Date.now() - started) / 1000, t, path });
      if (frame % 8 === 0 || t === 1) console.log(JSON.stringify({ film, mode: 'desktop', t, wallSeconds: frames.at(-1).wallSeconds }));
      if (t === 1) break;
    }
    const timeline = await page.evaluate(() => { clearInterval(window.__visualTimer); return window.__visualTimeline; });
    const result = { film, mode: 'desktop', scripts, frames, timeline, errors, completed: Number(await slider.inputValue()) === 1, replayVisible: await page.getByRole('button', { name: 'Replay film', exact: true }).count() > 0 };
    results.runs.push(result); await writeFile(`${directory}/desktop-live.json`, JSON.stringify(result, null, 2));
    const video = page.video(); await context.close(); await video.saveAs(`${directory}/desktop-full-1x.webm`);
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const mobileErrors = []; mobile.on('pageerror', e => mobileErrors.push(String(e))); mobile.on('console', m => { if (m.type() === 'error') mobileErrors.push(m.text()); });
    await mobile.goto(`http://127.0.0.1:5590/#/wonder/${film}`, { waitUntil: 'networkidle' });
    const seek = mobile.getByLabel('Film position'); await seek.waitFor(); await mobile.waitForTimeout(1000);
    await mobile.mouse.move(195, 760); if (await mobile.getByRole('button', { name: 'Pause', exact: true }).count()) await mobile.getByRole('button', { name: 'Pause', exact: true }).click();
    const shots = [];
    const checkpoints = film === 'stonehenge' ? [.083, .12, .21055, .2135, .32, .58, .78, .86, .92, 1] : [.12, .35, .5, .62, .75, .88, .94, 1];
    for (const t of checkpoints) {
      await seek.evaluate((el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, t);
      await mobile.waitForTimeout(250);
      const path = `${directory}/mobile-ui-t${t}.png`; await mobile.screenshot({ path });
      shots.push({ t, path, diagnostics: await mobile.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__), caption: await mobile.evaluate(() => document.querySelector('[data-testid="live-caption"]')?.textContent ?? null) });
    }
    results.runs.push({ film, mode: 'mobile', frames: shots, errors: mobileErrors });
    await mobile.close(); await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ completed: film, errors, mobileErrors }));
  }
} finally { await browser.close(); await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2)); }
