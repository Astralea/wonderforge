import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PerspectiveCamera, Vector3 } from 'three';

const origin = process.env.MOON_PREVIEW_URL ?? 'http://127.0.0.1:5590';
const label = process.env.MOON_CAPTURE_LABEL ?? 'before';
const out = `artifacts/colosseum-moon-surface-2026-09-21/visual/${label}`;
await mkdir(out, { recursive: true });
function boundsOfMoon(state, width, height) {
  const { camera: c, colosseumCelestial: sky } = state.diagnostics;
  const camera = new PerspectiveCamera(c.fov, c.aspect, c.near, 4000);
  camera.position.fromArray(c.position);
  camera.lookAt(camera.position.clone().add(new Vector3(...c.direction)));
  camera.updateMatrixWorld();
  const m = sky.moon;
  const dir = new Vector3(m.direction[0], m.direction[1], -m.direction[2]);
  const right = new Vector3(0, 1, 0).cross(dir).normalize();
  const up = dir.clone().cross(right);
  const radius = m.angularRadiusDegrees * sky.angularScale * Math.PI / 180;
  const pixels = [];
  for (let i = 0; i < 360; i++) {
    const a = i / 360 * Math.PI * 2;
    const ray = dir.clone().multiplyScalar(Math.cos(radius))
      .addScaledVector(right, Math.sin(radius) * Math.cos(a))
      .addScaledVector(up, Math.sin(radius) * Math.sin(a));
    const p = ray.multiplyScalar(1e6).add(camera.position).project(camera);
    pixels.push([(p.x + 1) * width / 2, (1 - p.y) * height / 2]);
  }
  const p = dir.clone().multiplyScalar(1e6).add(camera.position).project(camera);
  return {
    center: [(p.x + 1) * width / 2, (1 - p.y) * height / 2],
    left: Math.min(...pixels.map(p => p[0])), right: Math.max(...pixels.map(p => p[0])),
    top: Math.min(...pixels.map(p => p[1])), bottom: Math.max(...pixels.map(p => p[1])),
    angularRadiusDegrees: m.angularRadiusDegrees * sky.angularScale,
  };
}
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const results = [];
try {
  for (const [mode, width, height] of [['desktop', 1440, 900], ['1080p', 1920, 1080], ['portrait', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${origin}/#/wonder/colosseum`, { waitUntil: 'networkidle' });
    const slider = page.getByLabel('Film position');
    await slider.waitFor();
    await page.waitForTimeout(1000);
    await page.mouse.move(width / 2, height - 95);
    if (await page.getByRole('button', { name: 'Pause', exact: true }).count()) {
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
    }
    for (const t of [.90, .95, 1]) {
      await slider.evaluate((el, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, t);
      await page.waitForTimeout(450);
      const state = await page.evaluate(() => ({
        diagnostics: window.__THREE_GAME_DIAGNOSTICS__,
        scripts: [...document.scripts].map(s => s.src).filter(Boolean),
        letterbox: document.querySelector('[data-testid="cinematic-letterbox-top"]')?.getBoundingClientRect().toJSON(),
        caption: document.querySelector('[data-testid="live-caption"]')?.getBoundingClientRect().toJSON() ?? null,
      }));
      const moon = boundsOfMoon(state, width, height);
      const path = `${out}/${mode}-t${t}.png`;
      await page.screenshot({ path });
      const clip = {
        x: Math.max(0, Math.floor(moon.left - 50)), y: Math.max(0, Math.floor(moon.top - 50)),
        width: 1, height: 1,
      };
      clip.width = Math.min(width - clip.x, Math.ceil(moon.right + 50 - clip.x));
      clip.height = Math.min(height - clip.y, Math.ceil(moon.bottom + 50 - clip.y));
      const cropPath = `${out}/${mode}-t${t}-moon-crop.png`;
      await page.screenshot({ path: cropPath, clip });
      results.push({ mode, width, height, t, path, cropPath, moon, errors: [...errors], state });
    }
    console.log(JSON.stringify({ mode, frames: 3, errors }));
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify({ origin, label, capturedAt: new Date().toISOString(), results }, null, 2));
}
