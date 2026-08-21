import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import {
  haulCorridors,
  isClearOfSiteWorks,
  pushOutOfSiteWorks,
  siteKeepOuts,
} from '../src/engine/siteClearance';

const keepOuts = siteKeepOuts(GIZA_CONSTRUCTION);
const corridors = haulCorridors(GIZA_CONSTRUCTION);
const x = -45.0;
const z = 9.2;
console.log('test check:', isClearOfSiteWorks(x, z, keepOuts, corridors, { margin: 0.4, corridorClearance: 2.0 }));
// which constraint bites?
for (const box of keepOuts) {
  const dx = Math.abs(x - box.center[0]) - box.half[0];
  const dz = Math.abs(z - box.center[1]) - box.half[1];
  if (dx < 0.4 && dz < 0.4) console.log('keepOut bites:', box.id, dx.toFixed(2), dz.toFixed(2));
}
for (const c of corridors) {
  const [cx, cz] = ((): [number, number] => {
    const dx = c.to[0] - c.from[0];
    const dz = c.to[1] - c.from[1];
    const l2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - c.from[0]) * dx + (z - c.from[1]) * dz) / l2));
    return [c.from[0] + dx * u, c.from[1] + dz * u];
  })();
  const d = Math.hypot(x - cx, z - cz);
  if (d < 2.0) console.log('corridor bites:', c.id, d.toFixed(2));
}
console.log('routes:', GIZA_CONSTRUCTION.routes.map((r) => `${r.id} q=(${r.waypoints.roadQueue[0].toFixed(1)},${r.waypoints.roadQueue[2].toFixed(1)})`).join(' '));
