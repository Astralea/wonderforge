import { readFile, writeFile } from 'node:fs/promises';
const label = process.argv[2] ?? 'after';
const base = 'artifacts/colosseum-moon-surface-2026-09-21/visual';
const load = async path => JSON.parse(await readFile(`${base}/${path}`, 'utf8'));
const before = await load('before/results.json');
const after = await load(`${label}/results.json`);
const beforePixels = await load('before/pixel-measurements.json');
const afterPixels = await load(`${label}/pixel-measurements.json`);
const fields = ['left','right','top','bottom','angularRadiusDegrees'];
const results = after.results.map(a => {
  const b = before.results.find(b => a.mode === b.mode && a.t === b.t);
  const bp = beforePixels.measurements.find(b => a.mode === b.mode && a.t === b.t);
  const ap = afterPixels.measurements.find(b => a.mode === b.mode && a.t === b.t);
  return {
    mode: a.mode, t: a.t, beforeImage: b.path, afterImage: a.path,
    maxProjectedLimbDelta: Math.max(...fields.map(f => Math.abs(a.moon[f] - b.moon[f]))),
    cameraIdentical: JSON.stringify(a.state.diagnostics.camera) === JSON.stringify(b.state.diagnostics.camera),
    moonEphemerisIdentical: JSON.stringify(a.state.diagnostics.colosseumCelestial.moon) === JSON.stringify(b.state.diagnostics.colosseumCelestial.moon),
    beforeLumaSpread: bp.innerQ90MinusQ10, afterLumaSpread: ap.innerQ90MinusQ10,
    beforeInnerMedian: bp.innerMedian, afterInnerMedian: ap.innerMedian,
    beforeHaloExcess: bp.haloMinusSurrounding, afterHaloExcess: ap.haloMinusSurrounding,
    errors: a.errors,
  };
});
await writeFile(`${base}/${label}/comparison.json`, JSON.stringify({ beforeBundle: before.results[0].state.scripts, afterBundle: after.results[0].state.scripts, results }, null, 2));
console.table(results.map(r => ({ mode:r.mode, t:r.t, boundsDelta:r.maxProjectedLimbDelta, cameraSame:r.cameraIdentical, moonSame:r.moonEphemerisIdentical, lumaBefore:r.beforeLumaSpread.toFixed(1), lumaAfter:r.afterLumaSpread.toFixed(1), haloBefore:r.beforeHaloExcess.toFixed(1), haloAfter:r.afterHaloExcess.toFixed(1) })));
