import { readFileSync, writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { STONEHENGE_SKY, stonehengeSunDirectionAt } from '../../../src/data/stonehengeSky';
import { stonehengeCinematicShotAt } from '../../../src/engine/stonehengeCamera';
const label = process.env.STONEHENGE_CAPTURE_LABEL ?? 'dev';
const root = `artifacts/stonehenge-release-2026-09-21/framing/${label}`;
const captures = JSON.parse(readFileSync(`${root}/results.json`, 'utf8'));
const rows = captures.filter((r: any) => r.t >= .78).map((r: any) => {
  const c = r.state.diagnostics.camera, camera = new PerspectiveCamera(c.fov, c.aspect, c.near, 4000);
  camera.position.fromArray(c.position); camera.lookAt(camera.position.clone().add(new Vector3(...c.direction))); camera.updateMatrixWorld();
  const sun = new Vector3(...stonehengeSunDirectionAt(r.t));
  const right = new Vector3(0, 1, 0).cross(sun).normalize(), up = sun.clone().cross(right);
  const radius = STONEHENGE_SKY.sunDisc.angularRadiusDegrees * Math.PI / 180;
  let top = Infinity;
  for (let rim = 0; rim < 360; rim++) {
    const theta = rim * Math.PI / 180;
    const p = sun.clone().multiplyScalar(Math.cos(radius)).addScaledVector(right, Math.sin(radius) * Math.cos(theta))
      .addScaledVector(up, Math.sin(radius) * Math.sin(theta)).multiplyScalar(1e6).add(camera.position).project(camera);
    top = Math.min(top, (1 - p.y) * r.height / 2);
  }
  const expected = stonehengeCinematicShotAt(r.t, c.aspect), actualPitch = Math.asin(-c.direction[1]);
  return { mode: r.mode, t: r.t, topPx: top, letterboxBottomPx: r.state.letterbox.bottom,
    clearPx: top - r.state.letterbox.bottom, clearVh: (top - r.state.letterbox.bottom) / r.height * 100,
    actualPitchDegrees: actualPitch * 180 / Math.PI, expectedPitchDegrees: expected.pitch * 180 / Math.PI,
    expectedCameraErrorDegrees: Math.abs(actualPitch - expected.pitch) * 180 / Math.PI, errors: r.errors };
});
writeFileSync(`${root}/sun-clearance.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows, null, 2));
if (rows.some((r: any) => r.clearVh < 1.5 || r.expectedCameraErrorDegrees > .001 || r.errors.length)) process.exitCode = 1;
