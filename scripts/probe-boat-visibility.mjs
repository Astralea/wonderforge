// One-off probe: find the playback t where a river boat is largest on
// screen (inside the frustum) under the deterministic cinematic camera.
import { gizaCinematicShotAt } from '../src/engine/gizaCamera.ts';
import {
  GIZA_ENVIRONMENT,
  riverCraftStateAt,
} from '../src/data/gizaEnvironment.ts';

const aspect = 1280 / 720;
const fov = (35 * Math.PI) / 180;
const tanHalf = Math.tan(fov / 2);

const fleet = [];
let globalIndex = 0;
for (const craft of GIZA_ENVIRONMENT.riverCraft) {
  for (let unit = 0; unit < craft.count; unit += 1) {
    fleet.push({ craft, globalIndex });
    globalIndex += 1;
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

let best = null;
let bestSail = null;
for (let t = 0; t <= 1.0001; t += 0.005) {
  const shot = gizaCinematicShotAt(t, aspect);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  const cam = [
    shot.target[0] + Math.cos(shot.azimuth) * horizontal,
    shot.target[1] + Math.sin(shot.pitch) * shot.radius,
    shot.target[2] + Math.sin(shot.azimuth) * horizontal,
  ];
  const f = norm(sub(shot.target, cam));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  for (const boat of fleet) {
    const s = riverCraftStateAt(boat.craft, boat.globalIndex, t);
    const d = sub([s.x, s.bobY + 2, s.z], cam); // +2: include mast/sail height
    const z = dot(d, f);
    if (z <= 1) continue;
    const nx = dot(d, r) / (z * tanHalf * aspect);
    const ny = dot(d, u) / (z * tanHalf);
    if (Math.abs(nx) > 0.98 || Math.abs(ny) > 0.98) continue; // off screen
    if (!best || z < best.z) {
      best = { t, z, nx, ny, kind: boat.craft.kind, id: boat.craft.id, gi: boat.globalIndex };
    }
    if (boat.craft.squareSail) {
      // Boat local +x in world after yaw: (cos yaw, 0, -sin yaw).
      const boatX = [Math.cos(s.yaw), 0, -Math.sin(s.yaw)];
      const toCam = norm(sub(cam, [s.x, s.bobY, s.z]));
      const broadside = Math.abs(dot(boatX, toCam)); // 1 = sail face-on
      const score = broadside / z;
      if (!bestSail || score > bestSail.score) {
        bestSail = { t, z: Math.round(z), nx: +nx.toFixed(2), ny: +ny.toFixed(2), broadside: +broadside.toFixed(2), score, gi: boat.globalIndex };
      }
    }
  }
}
console.log(best);
console.log('best broadside sail view:', bestSail);
// Also report, for each t decile, ALL visible boats.
for (let t = 0; t <= 1.0001; t += 0.1) {
  const shot = gizaCinematicShotAt(t, aspect);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  const cam = [
    shot.target[0] + Math.cos(shot.azimuth) * horizontal,
    shot.target[1] + Math.sin(shot.pitch) * shot.radius,
    shot.target[2] + Math.sin(shot.azimuth) * horizontal,
  ];
  const f = norm(sub(shot.target, cam));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const visible = [];
  for (const boat of fleet) {
    const s = riverCraftStateAt(boat.craft, boat.globalIndex, t);
    const d = sub([s.x, s.bobY + 1.5, s.z], cam);
    const z = dot(d, f);
    if (z <= 1) continue;
    const nx = dot(d, r) / (z * tanHalf * aspect);
    const ny = dot(d, u) / (z * tanHalf);
    if (Math.abs(nx) > 0.98 || Math.abs(ny) > 0.98) continue;
    visible.push({ z: Math.round(z), id: boat.craft.id, gi: boat.globalIndex, nx: nx.toFixed(2), ny: ny.toFixed(2) });
  }
  console.log(t.toFixed(2), visible);
}
