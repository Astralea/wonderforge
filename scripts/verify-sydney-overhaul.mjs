import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.SYDNEY_QA_URL ?? 'http://127.0.0.1:5591/';
const out = process.env.SYDNEY_QA_OUT ?? 'artifacts/sydney-overhaul-2026-09-23/production';
const milestones = [0.12, 0.32, 0.58, 0.78, 0.92, 1];
if (process.env.SYDNEY_YARD_T) milestones.push(Number(process.env.SYDNEY_YARD_T));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--mute-audio'],
});
const report = {
  base,
  bundle: (await (await fetch(base)).text()).match(/src="([^"]+\.js)"/)?.[1],
  frames: [],
  gpu: [],
  playback: [],
  reducedMotion: null,
};
for (const [mode, width, height] of [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning' && /WebGL|GL_INVALID|GL_OUT_OF_MEMORY/i.test(m.text())) errors.push(m.text());
  });
  for (const t of [...new Set(milestones)].sort((a, b) => a - b)) {
    await page.goto(`${base}#/debug/wonder/sydney-opera-house/${t}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.scene ===
        'sydney-opera-house-reference',
    );
    await page.waitForTimeout(400);
    const path = `${out}/${mode}-${t}.png`;
    await page.screenshot({ path });
    report.frames.push({
      mode,
      t,
      path,
      diagnostics: await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__),
      errors: [...errors],
    });
  }
  await page.goto(`${base}#/debug/film/sydney-opera-house`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1200);
  await page.waitForFunction(
    () =>
      window.__THREE_GAME_DIAGNOSTICS__?.scene ===
      'sydney-opera-house-reference',
  );
  await page.mouse.move(width / 2, height - 80);
  if (await page.getByRole('button', { name: 'Pause', exact: true }).count())
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const seek = page.getByLabel('Film position', { exact: true });
  for (const t of [0.78, 0.32, 1, 0.58]) {
    await seek.evaluate((el, value) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      ).set.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, t);
    await page.waitForTimeout(250);
    report.playback.push({
      mode,
      seek: t,
      value: await seek.inputValue(),
      diagnostics: await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__),
    });
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const before = Number(await seek.inputValue());
  await page.waitForTimeout(1300);
  const after = Number(await seek.inputValue());
  if (after <= before)
    throw new Error(`${mode} playback clock failed to advance`);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  report.playback.push({ mode, naturalPlayback: { before, after } });
  const ui = await page.locator('body').innerText();
  await writeFile(`${out}/${mode}-ui.txt`, ui);
  const controls = await page.locator('button,input').evaluateAll((nodes) =>
    nodes.map((n) => ({
      tag: n.tagName,
      label: n.getAttribute('aria-label'),
      text: n.textContent,
      type: n.getAttribute('type'),
    })),
  );
  report.playback.push({ mode, controls, errors: [...errors] });
  await page.screenshot({ path: `${out}/${mode}-film.png` });
  report.gpu.push({ mode, backend: await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  }) });
  await page.getByRole('button', { name: 'Next wonder', exact: true }).click();
  await page.waitForTimeout(700);
  const nextHash = await page.evaluate(() => location.hash);
  if (!nextHash.startsWith('#/wonder/')) throw new Error('Next wonder navigation failed');
  report.playback.push({ mode, nextHash });
  await page.close();
}
const still = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
});
const stillErrors = [];
still.on('pageerror', (e) => stillErrors.push(String(e)));
still.on('console', (m) => { if (m.type() === 'error') stillErrors.push(m.text()); });
await still.goto(`${base}#/debug/film/sydney-opera-house`, {
  waitUntil: 'networkidle',
});
await still.waitForFunction(
  () =>
    window.__THREE_GAME_DIAGNOSTICS__?.scene === 'sydney-opera-house-reference',
);
const stillSeek = still.getByLabel('Film position', { exact: true });
const initial = await stillSeek.inputValue();
await still.waitForTimeout(600);
const held = await stillSeek.inputValue();
if (initial !== '1' || held !== initial)
  throw new Error('Reduced-motion completed still failed');
report.reducedMotion = { initial, held, errors: stillErrors };
await still.screenshot({ path: `${out}/mobile-reduced-motion.png` });
await still.close();
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
const failures = [...report.frames.flatMap((f) => f.errors), ...report.playback.flatMap((p) => p.errors ?? []), ...stillErrors];
if (failures.length) throw new Error(`Production browser errors: ${[...new Set(failures)].join('; ')}`);
console.log(
  JSON.stringify({
    frames: report.frames.length,
    bundle: report.bundle,
    errors: report.frames.flatMap((f) => f.errors),
    controls: report.playback,
  }),
);
