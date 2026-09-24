import { readFileSync, writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { STONEHENGE_SKY, stonehengeSunStateAt } from '../../../../src/data/stonehengeSky';
import { stonehengeCinematicShotAt } from '../../../../src/engine/stonehengeCamera';
import { GIZA_CONSTRUCTION } from '../../../../src/data/gizaConstruction';
const out = 'artifacts/review-board/release-2026-09-21/giza-stonehenge';
const DEG = Math.PI / 180;
function actualCamera(c: any) {
  const camera = new PerspectiveCamera(c.fov, c.aspect, c.near, 4000);
  camera.position.fromArray(c.position); camera.lookAt(camera.position.clone().add(new Vector3(...c.direction))); camera.updateMatrixWorld();
  return camera;
}
const stone = JSON.parse(readFileSync(`${out}/stonehenge/desktop-live.json`, 'utf8'));
const selected = [.8, .867, 1].map(t => stone.timeline.reduce((a: any, b: any) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
const sun = selected.map((sample: any) => {
  const camera = actualCamera(sample.diagnostics.camera), s = stonehengeSunStateAt(sample.t);
  const dir = new Vector3(Math.cos(s.elevation * DEG) * Math.cos(s.azimuth * DEG), Math.sin(s.elevation * DEG), Math.cos(s.elevation * DEG) * Math.sin(s.azimuth * DEG));
  const right = new Vector3(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right);
  let minY = Infinity, maxY = -Infinity;
  const radius = STONEHENGE_SKY.sunDisc.angularRadiusDegrees * DEG;
  for (let r = 0; r < 360; r++) {
    const p = dir.clone().multiplyScalar(Math.cos(radius)).addScaledVector(right, Math.sin(radius) * Math.cos(r * DEG)).addScaledVector(up, Math.sin(radius) * Math.sin(r * DEG)).multiplyScalar(1e6).add(camera.position).project(camera);
    const y = (1 - p.y) * 450; minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const expected = stonehengeCinematicShotAt(sample.t, 1.6);
  return { t: sample.t, cameraPitchDegrees: Math.asin(-sample.diagnostics.camera.direction[1]) / DEG, expectedPitchDegrees: expected.pitch / DEG, sunElevationDegrees: s.elevation, discRadiusDegrees: STONEHENGE_SKY.sunDisc.angularRadiusDegrees, discTopPx: minY, discBottomPx: maxY, letterboxBottomPx: 54, obscuredHeightPx: Math.max(0, 54 - minY) };
});
const results = JSON.parse(readFileSync(`${out}/results.json`, 'utf8'));
const giza = results.runs.find((r: any) => r.film === 'pyramids-of-giza' && r.mode === 'mobile');
const gizaBounds = giza.frames.filter((f: any) => f.t >= .88).map((sample: any) => {
  const camera = actualCamera(sample.diagnostics.camera);
  const ranges: Record<string, { minX: number, maxX: number }> = {};
  for (const block of GIZA_CONSTRUCTION.blocks) {
    if (block.monument === 'temple') continue;
    const range = ranges[block.monument] ??= { minX: Infinity, maxX: -Infinity };
    for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
      const p = new Vector3(block.finalPosition[0] + x * block.dimensions[0], block.finalPosition[1] + y * block.dimensions[1], block.finalPosition[2] + z * block.dimensions[2]).project(camera);
      range.minX = Math.min(range.minX, p.x); range.maxX = Math.max(range.maxX, p.x);
    }
  }
  return { t: sample.t, completedMonumentScreenBoundsNdc: ranges, note: 'Final stone bounds projected through captured camera; at .88 some Menkaure blocks are not seated yet.' };
});
writeFileSync(`${out}/geometry-review.json`, JSON.stringify({ sun, gizaBounds }, null, 2));
console.log(JSON.stringify({ sun, gizaBounds }, null, 2));
