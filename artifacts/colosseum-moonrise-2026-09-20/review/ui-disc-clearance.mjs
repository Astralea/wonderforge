import { readFileSync, writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';

const root = 'artifacts/colosseum-moonrise-2026-09-20/review';
const captures = JSON.parse(readFileSync(`${root}/ui-clearance.json`, 'utf8'));
const rows = captures.map(capture => {
  const { camera: c, colosseumCelestial: sky } = capture.diagnostics;
  const camera = new PerspectiveCamera(c.fov, c.aspect, c.near, 4000);
  camera.position.fromArray(c.position);
  camera.lookAt(camera.position.clone().add(new Vector3(...c.direction)));
  camera.updateMatrixWorld();
  const moon = sky.moon;
  const direction = new Vector3(moon.direction[0], moon.direction[1], -moon.direction[2]);
  const tangent = new Vector3(0, 1, 0).cross(direction).normalize();
  const bitangent = direction.clone().cross(tangent);
  const radius = moon.angularRadiusDegrees * sky.angularScale * Math.PI / 180;
  let discTop = Infinity;
  for (let rim = 0; rim < 360; rim++) {
    const angle = rim * Math.PI / 180;
    const ray = direction.clone().multiplyScalar(Math.cos(radius))
      .addScaledVector(tangent, Math.sin(radius) * Math.cos(angle))
      .addScaledVector(bitangent, Math.sin(radius) * Math.sin(angle));
    const screen = ray.multiplyScalar(1e6).add(camera.position).project(camera);
    discTop = Math.min(discTop, (1 - screen.y) * capture.geometry.canvas.height / 2);
  }
  const letterboxBottom = capture.geometry.letterbox.bottom;
  return { mode: capture.mode, t: capture.t, discTop, letterboxBottom,
    clearance: discTop - letterboxBottom, errors: capture.errors };
});
writeFileSync(`${root}/ui-disc-clearance.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows, null, 2));
if (rows.some(row => row.clearance < 10 || row.errors.length)) process.exitCode = 1;
