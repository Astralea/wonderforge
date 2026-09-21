// Independent framing proposal. No production code is changed by this script.
import fs from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';

const root = 'artifacts/colosseum-celestial-2026-09-20';
const grids = Object.fromEntries(['sun', 'moon'].map(body => {
  const result = JSON.parse(fs.readFileSync(`${root}/ephemeris/grid-jun10-12-${body}.response.json`)).result;
  const rows = result.slice(result.indexOf('$$SOE') + 5, result.indexOf('$$EOE')).trim().split('\n').map(line => {
    const c = line.split(',');
    return { hour: (+c[1] - 1750438.5) * 24, az: +c[4], el: +c[5], diameter: +c[7] / 3600 };
  });
  return [body, rows];
}));
const clock = [[0, 3], [.47, 11.5], [.72, 18.7], [.83, 21], [1, 22.25]];
const cameraKeys = [
  [0, 3.55, 10, 336, 6], [.16, 3.84, 14.4, 322, 10],
  [.32, 4.20, 15.2, 308, 16], [.48, 4.65, 16, 318, 22],
  [.62, 5.35, 13, 338, 26], [.70, 5.76, 9, 350, 27],
  [.78, 5.97, 7.2, 358, 27], [.86, 6.08, 6, 370, 25],
  [1, 6.08, 6, 392, 24],
];
const DEG = Math.PI / 180;
function sample(keys, t) {
  const i = Math.max(0, keys.findIndex((k, i) => i < keys.length - 1 && t <= keys[i + 1][0]));
  const a = keys[i], b = keys[i + 1], q = (t - a[0]) / (b[0] - a[0]);
  return a.map((n, i) => n + (b[i] - n) * q);
}
function bodyAt(body, h) {
  const rows = grids[body], i = rows.findIndex((r, i) => i < rows.length - 1 && h <= rows[i + 1].hour);
  const a = rows[i], b = rows[i + 1], q = (h - a.hour) / (b.hour - a.hour);
  return Object.fromEntries(Object.keys(a).map(k => [k, a[k] + (b[k] - a[k]) * q]));
}
function frame(t, aspect) {
  const h = sample(clock, t)[1], [, azimuth, pitchDeg, baseRadius, targetY] = sample(cameraKeys, t);
  const fov = aspect < .72 ? 42 : 35;
  const fit = Math.hypot(94 * Math.sin(azimuth), 78 * Math.cos(azimuth)) * 1.16 / (Math.tan(fov * DEG / 2) * Math.max(.3, aspect));
  const narrow = Math.pow(Math.min(2.05, Math.max(1, 1.78 / Math.max(.3, aspect))), .38);
  const radius = Math.max(baseRadius * narrow, aspect < .72 ? fit : 0), pitch = pitchDeg * DEG;
  const camera = new PerspectiveCamera(fov, aspect, .1, 4000);
  // Reflect the authored +Z-north plan at its boundary. Three render space has
  // +X east, +Y up, -Z north; preserving physical east/north/up handedness.
  camera.position.set(Math.cos(azimuth) * Math.cos(pitch) * radius, targetY + Math.sin(pitch) * radius, -Math.sin(azimuth) * Math.cos(pitch) * radius);
  camera.lookAt(0, targetY, 0); camera.updateMatrixWorld();
  return Object.fromEntries(['sun', 'moon'].map(body => {
    const b = bodyAt(body, h), az = b.az * DEG, el = b.el * DEG;
    const direction = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const p = direction.clone().multiplyScalar(1e6).add(camera.position).project(camera);
    const angularMargin = Math.tan(b.diameter * DEG / 2) / Math.tan(fov * DEG / 2);
    return [body, { t, hour: h, az: b.az, el: b.el, x: p.x, y: p.y, fullyFramed: Math.abs(p.x) + angularMargin / aspect <= 1 && Math.abs(p.y) + angularMargin <= 1 && p.z < 1.001 && direction.dot(camera.getWorldDirection(new Vector3())) > 0, aboveHorizon: b.el > 0 }];
  }));
}
const output = [];
for (const aspect of [16 / 9, 390 / 844, 320 / 844]) {
  const ranges = { sun: [], moon: [] };
  for (let i = 0; i <= 6000; i++) {
    for (const [body, r] of Object.entries(frame(i / 6000, aspect))) {
      if (r.fullyFramed && r.aboveHorizon) ranges[body].push(r);
    }
  }
  output.push({ aspect, visible: Object.fromEntries(Object.entries(ranges).map(([body, rows]) => {
    const runs = [];
    for (const row of rows) {
      const last = runs.at(-1);
      if (!last || row.t - last.to.t > .0002) runs.push({ from: row, to: row });
      else last.to = row;
    }
    return [body, runs];
  })), frames: [.04, .055, .065, .69, .70, .71, .83, .86, .90, .94, .97, 1].map(t => frame(t, aspect)) });
}
fs.writeFileSync(`${root}/review/proposed-projection.json`, JSON.stringify(output, null, 2));
for (const r of output) console.log(JSON.stringify({ aspect: r.aspect, visible: Object.fromEntries(Object.entries(r.visible).map(([b, runs]) => [b, runs.map(x => ({ t: [x.from.t, x.to.t], seconds: [x.from.t * 60, x.to.t * 60], hours: [x.from.hour, x.to.hour] }))])) }));
