import { readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const label = process.argv[2] ?? 'before';
const out = `artifacts/colosseum-moon-surface-2026-09-21/visual/${label}`;
const captures = JSON.parse(await readFile(`${out}/results.json`, 'utf8'));
const measurements = [];
const percentile = (values, q) => values[Math.floor((values.length - 1) * q)];
for (const r of captures.results) {
  const png = PNG.sync.read(await readFile(r.path));
  const [cx, cy] = r.moon.center;
  const rx = (r.moon.right - r.moon.left) / 2;
  const ry = (r.moon.bottom - r.moon.top) / 2;
  const inner = [], halo = [], surrounding = [];
  for (let y = Math.max(0, Math.floor(cy - 3.5 * ry)); y < Math.min(png.height, cy + 3.5 * ry); y++) {
    for (let x = Math.max(0, Math.floor(cx - 3.5 * rx)); x < Math.min(png.width, cx + 3.5 * rx); x++) {
      const radius = Math.hypot((x + .5 - cx) / rx, (y + .5 - cy) / ry);
      const i = (y * png.width + x) * 4;
      const luma = .2126 * png.data[i] + .7152 * png.data[i + 1] + .0722 * png.data[i + 2];
      if (radius <= .78) inner.push(luma);
      if (radius >= 1.3 && radius <= 1.8) halo.push(luma);
      if (radius >= 2.8 && radius <= 3.3 && y > (r.state.letterbox?.bottom ?? 0)) surrounding.push(luma);
    }
  }
  for (const values of [inner, halo, surrounding]) values.sort((a,b) => a - b);
  measurements.push({
    mode: r.mode, t: r.t, diameterPixels: [2 * rx, 2 * ry],
    innerQ10: percentile(inner, .1), innerMedian: percentile(inner, .5), innerQ90: percentile(inner, .9),
    innerQ90MinusQ10: percentile(inner, .9) - percentile(inner, .1),
    haloMedian: percentile(halo, .5), surroundingMedian: percentile(surrounding, .5),
    haloMinusSurrounding: percentile(halo, .5) - percentile(surrounding, .5),
  });
}
await writeFile(`${out}/pixel-measurements.json`, JSON.stringify({
  method: 'Rendered sRGB luma (0–255): Moon inner ellipse r<=0.78, halo r=1.3–1.8, local sky r=2.8–3.3. Diagnostic comparison only; sky gradients/clouds can affect annular differences. Radius from projected enlarged astronomical limb.',
  measurements,
}, null, 2));
console.table(measurements.map(r => ({ mode:r.mode, t:r.t, innerSpread:r.innerQ90MinusQ10.toFixed(2), innerMedian:r.innerMedian.toFixed(2), haloExcess:r.haloMinusSurrounding.toFixed(2) })));
