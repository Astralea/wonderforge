// T4 P4 probe: candidate reveal azimuth swings vs the frustum contract.
// For each candidate swing (degrees, eased over the reveal window t=0.88..1.0
// with easeInOutQuad — the same curve gizaCinematicShotAt would apply), print
// the camera view azimuth, the sun-view offset (probe-dusk-sky convention,
// degrees), the god-ray gate driver (sun NDC radius; the pass opens below
// 1.6), and each monument apex's NDC x/y through the exact cinematic camera
// for desktop (16/9, fov 35) and mobile portrait (0.6, fov 42).
//
// Usage: npx vite-node scripts/probe-reveal-framing.mts
import { PerspectiveCamera, Vector3 } from 'three';
import { createGizaConstructionPlan } from '../src/data/gizaConstruction';
import { gizaCinematicShotAt } from '../src/engine/gizaCamera';
import { gizaSunStateAt } from '../src/data/gizaSky';

const DEG = 180 / Math.PI;

const plan = createGizaConstructionPlan();
const APEXES = Object.fromEntries(
  Object.values(plan.monuments).map((monument) => [
    monument.id,
    new Vector3(
      monument.center[0],
      monument.groundY + monument.height,
      monument.center[1],
    ),
  ]),
) as Record<string, Vector3>;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
function easeInOutQuad(v: number): number {
  const x = clamp01(v);
  return x < 0.5 ? 2 * x * x : 1 - (1 - x) * (1 - x) * 2;
}

interface Row {
  swing: number;
  t: number;
  viewAz: number;
  offset: number;
  sunNdcR: number;
  ndc: Record<string, { x: number; y: number }>;
}

function measure(t: number, aspect: number, swingDeg: number): Row {
  const shot = gizaCinematicShotAt(t, aspect);
  const swing = easeInOutQuad((t - 0.88) / (1 - 0.88)) * (swingDeg / DEG);
  const azimuth = shot.azimuth + swing;
  const fov = aspect < 0.72 ? 42 : 35;
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 4000);
  const target = new Vector3(...shot.target);
  const horizontal = Math.cos(shot.pitch) * shot.radius;
  camera.position.set(
    target.x + Math.cos(azimuth) * horizontal,
    target.y + Math.sin(shot.pitch) * shot.radius,
    target.z + Math.sin(azimuth) * horizontal,
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const viewAzDeg = Math.atan2(target.z - camera.position.z, target.x - camera.position.x) * DEG;
  const sun = gizaSunStateAt(t);
  let diff = Math.abs(sun.azimuth - viewAzDeg) % 360;
  if (diff > 180) diff = 360 - diff;

  const sunEl = (sun.elevation / DEG);
  const sunAz = (sun.azimuth / DEG);
  const sunWorld = camera.position.clone().addScaledVector(
    new Vector3(
      Math.cos(sunEl) * Math.cos(sunAz),
      Math.sin(sunEl),
      Math.cos(sunEl) * Math.sin(sunAz),
    ).normalize(),
    600,
  );
  const sunProj = sunWorld.project(camera);
  const sunNdcR = Math.hypot(sunProj.x, sunProj.y);

  const ndc: Row['ndc'] = {};
  for (const [name, apex] of Object.entries(APEXES)) {
    const p = apex.clone().project(camera);
    ndc[name] = { x: p.x, y: p.y };
  }
  return { swing: swingDeg, t, viewAz: viewAzDeg, offset: diff, sunNdcR, ndc };
}

const aspects: Array<[string, number]> = [
  ['desktop', 16 / 9],
  ['mobile', 0.6],
];
const swings = [0, 63, 68, 73, 78, 83];
const beats = [0.88, 0.9, 0.95, 1.0];

for (const [label, aspect] of aspects) {
  console.log(`\n=== ${label} (aspect ${aspect.toFixed(3)}) ===`);
  for (const swing of swings) {
    for (const t of beats) {
      const r = measure(t, aspect, swing);
      const apexes = Object.entries(r.ndc)
        .map(([name, p]) => `${name.slice(0, 3)}(${p.x.toFixed(2)},${p.y.toFixed(2)})`)
        .join(' ');
      console.log(
        `swing ${String(swing).padStart(2)}° t=${t.toFixed(2)} view ${r.viewAz.toFixed(1).padStart(7)}° ` +
          `offset ${r.offset.toFixed(1).padStart(5)}° sunNdcR ${r.sunNdcR.toFixed(2).padStart(5)} | ${apexes}`,
      );
    }
  }
}
