// Actual camera/shared clock, independent raw Horizons angles. No app edits.
import { readFileSync, writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { colosseumCinematicShotAt } from '../../../src/engine/colosseumCamera';
import { sampleColosseumSky, COLOSSEUM_CELESTIAL_ANGULAR_SCALE } from '../../../src/data/colosseumSky';

const root = 'artifacts/colosseum-celestial-2026-09-20';
const DEG = Math.PI / 180;
type Body = 'sun' | 'moon';
type Row = { jd: number; az: number; el: number; radius: number };
const grids = Object.fromEntries((['sun', 'moon'] as const).map(body => {
  const result = JSON.parse(readFileSync(`${root}/ephemeris/grid-jun10-12-${body}.response.json`, 'utf8')).result as string;
  const rows = result.slice(result.indexOf('$$SOE') + 5, result.indexOf('$$EOE')).trim().split('\n').map(line => {
    const c = line.split(','); return { jd: +c[1]!, az: +c[4]!, el: +c[5]!, radius: +c[7]! / 7200 };
  });
  return [body, rows];
})) as Record<Body, Row[]>;
function bodyAt(body: Body, jd: number): Row {
  const rows = grids[body], i = rows.findIndex((r, i) => i < rows.length - 1 && jd <= rows[i + 1]!.jd);
  const a = rows[i]!, b = rows[i + 1]!, q = (jd - a.jd) / (b.jd - a.jd);
  return { jd, az: a.az + (b.az - a.az) * q, el: a.el + (b.el - a.el) * q, radius: a.radius + (b.radius - a.radius) * q };
}
function frame(t: number, aspect: number) {
  const sky = sampleColosseumSky(t), shot = colosseumCinematicShotAt(t, aspect), h = Math.cos(shot.pitch) * shot.radius;
  const camera = new PerspectiveCamera(shot.fov, aspect, .1, 4000);
  camera.position.set(shot.target[0] + Math.cos(shot.azimuth) * h, shot.target[1] + Math.sin(shot.pitch) * shot.radius, -shot.target[2] - Math.sin(shot.azimuth) * h);
  camera.lookAt(shot.target[0], shot.target[1], -shot.target[2]); camera.updateMatrixWorld();
  return Object.fromEntries((['sun', 'moon'] as const).map(body => {
    const b = bodyAt(body, sky.astronomy.julianDayUt1), az = b.az * DEG, el = b.el * DEG;
    const direction = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const p = direction.clone().multiplyScalar(1e6).add(camera.position).project(camera);
    const radius = b.radius * COLOSSEUM_CELESTIAL_ANGULAR_SCALE;
    const margin = Math.tan(radius * DEG) / Math.tan(shot.fov * DEG / 2);
    return [body, { t, seconds: t * 60, hour: (b.jd - 1750438.5) * 24, az: b.az, el: b.el, x: p.x, y: p.y, radiusDegrees: radius, fullyFramed: Math.abs(p.x) + margin / aspect <= 1 && Math.abs(p.y) + margin <= 1 && direction.dot(camera.getWorldDirection(new Vector3())) > 0, aboveHorizon: b.el > 0 }];
  })) as Record<Body, { t: number; seconds: number; hour: number; az: number; el: number; x: number; y: number; radiusDegrees: number; fullyFramed: boolean; aboveHorizon: boolean }>;
}
const output = [];
for (const aspect of [16 / 9, 390 / 844, 320 / 844]) {
  const samples = Array.from({ length: 6001 }, (_, i) => frame(i / 6000, aspect));
  const visible = Object.fromEntries((['sun', 'moon'] as const).map(body => {
    const runs: { from: ReturnType<typeof frame>[Body]; to: ReturnType<typeof frame>[Body] }[] = [];
    for (const sample of samples) {
      const row = sample[body]; if (!row.fullyFramed || !row.aboveHorizon) continue;
      const last = runs.at(-1);
      if (!last || row.t - last.to.t > .0002) runs.push({ from: row, to: row }); else last.to = row;
    }
    return [body, runs];
  }));
  output.push({ aspect, angularScale: COLOSSEUM_CELESTIAL_ANGULAR_SCALE, visible, frames: [.035, .05, .065, .69, .70, .71, .83, .86, .90, .94, .97, 1].map(t => frame(t, aspect)) });
  console.log(JSON.stringify({ aspect, visible: Object.fromEntries(Object.entries(visible).map(([body, runs]) => [body, runs.map(r => ({ seconds: [r.from.seconds, r.to.seconds], hours: [r.from.hour, r.to.hour] }))])) }));
}
writeFileSync(`${root}/review/production-camera-projection.json`, JSON.stringify(output, null, 2));
