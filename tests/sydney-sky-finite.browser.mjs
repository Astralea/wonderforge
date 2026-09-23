// GPU regression: npm unit tests cannot detect a NaN in a compiled sky shader.
// Run with Vite available: node tests/sydney-sky-finite.browser.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.SYDNEY_QA_URL ?? 'http://127.0.0.1:5590';
const out = process.env.SYDNEY_QA_OUT ?? 'artifacts/sydney-reference-rebuild-2026-09-23/final/sky-finite';
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const results = [], errors = [];
try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route(`${base}/`, route => route.fulfill({ contentType: 'text/html', body: '<canvas></canvas>' }));
    await page.goto(`${base}/`);
    results.push(...await page.evaluate(async ({ width, height }) => {
      const [{ WorldScene }, { sydneyOperaHouse }] = await Promise.all([
        import('/src/render/three/WorldScene.ts'), import('/src/data/wonders/sydney-opera-house.ts'),
      ]);
      const world = new WorldScene(document.querySelector('canvas'), sydneyOperaHouse);
      world.resize(width, height); await world.ready;
      const { renderer, bloom } = world.pipeline, rows = [];
      // Stress both aspect ratios; the production mobile tier normally skips bloom.
      bloom.enabled = true;
      const original = bloom.render.bind(bloom);
      let t;
      const inspect = (target, stage) => {
        const data = new Uint16Array(target.width * target.height * 4);
        renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, data);
        let nonfinite = 0, nonzero = 0;
        for (let i = 0; i < data.length; i++) if (i % 4 !== 3) {
          if ((data[i] & 0x7c00) === 0x7c00) nonfinite++;
          if ((data[i] & 0x7fff) !== 0) nonzero++;
        }
        rows.push({ width, height, t, stage, nonfinite, nonzero, glError: renderer.getContext().getError() });
      };
      bloom.render = (...args) => {
        inspect(args[2], 'linear input'); original(...args); inspect(args[2], 'bloom output');
      };
      // Previously singular rows, followed by construction and finished views;
      // reverse order also guards against history-dependent target contents.
      for (t of [13/3600, 14/3600, 17/3600, 27/3600, .55, .625, 1, 17/3600, 14/3600]) world.update(t, t, t);
      world.dispose(); return rows;
    }, { width, height }));
    await page.close();
  }
} finally { await browser.close(); }
await mkdir(out, { recursive: true });
await writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2));
assert.equal(errors.length, 0, errors.join('\n'));
assert.equal(results.length, 36);
for (const row of results) {
  assert.equal(row.glError, 0, JSON.stringify(row));
  assert.ok(row.nonzero > row.width * row.height, JSON.stringify(row));
  assert.equal(row.nonfinite, 0, JSON.stringify(row));
}
console.log('36 desktop/portrait HDR inspections passed with bloom enabled.');
