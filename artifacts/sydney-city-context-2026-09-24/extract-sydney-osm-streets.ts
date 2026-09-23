/**
 * Spec 13 city context pass (2026-09-24). Reduces OpenStreetMap street
 * centrelines (© OpenStreetMap contributors, ODbL) to a few scene-metre points
 * per street, clipped to dry ground on the shared Sydney sampler.
 *
 *   npx vite-node scripts/extract-sydney-osm-streets.ts \
 *     artifacts/sydney-city-context-2026-09-24/osm/streets.json
 *
 * Input is the raw Overpass `out geom` response saved beside the evidence.
 * Output is the TypeScript route list pasted into sydneyHarbourContext.ts.
 */
import { readFileSync } from 'node:fs';
import { sydneyTerrainHeightAt } from '../src/engine/sydneyTerrain';

type P = [number, number];
const R = 6378137,
  LAT0 = -33.8569744291,
  LON0 = 151.2150309475;
const toScene = (lat: number, lon: number): P => [
  R * Math.cos((LAT0 * Math.PI) / 180) * (((lon - LON0) * Math.PI) / 180),
  -R * (((lat - LAT0) * Math.PI) / 180),
];

/** [scene id, OSM name, width m, region minX,maxX,minZ,maxZ] */
const STREETS: [string, string, number, number, number, number, number][] = [
  ['george', 'George Street', 18, -1100, -300, 150, 2000],
  ['pitt', 'Pitt Street', 14, -800, -300, 560, 2000],
  ['castlereagh', 'Castlereagh Street', 14, -700, -300, 950, 2000],
  ['elizabeth', 'Elizabeth Street', 16, -700, -300, 1000, 2000],
  ['phillip', 'Phillip Street', 12, -450, -200, 540, 1400],
  ['macquarie-south', 'Macquarie Street', 18, -320, -100, 700, 1450],
  ['york', 'York Street', 14, -1000, -700, 700, 2000],
  ['clarence', 'Clarence Street', 12, -1100, -800, 650, 2000],
  ['kent', 'Kent Street', 12, -1150, -850, 100, 2000],
  ['bridge-st', 'Bridge Street', 14, -700, -150, 690, 760],
  ['hunter', 'Hunter Street', 14, -720, -240, 940, 1070],
  ['martin-place', 'Martin Place', 16, -740, -260, 1150, 1230],
  ['king', 'King Street', 12, -1100, -370, 1290, 1370],
  ['market', 'Market Street', 14, -1100, -440, 1520, 1570],
  ['park', 'Park Street', 16, -800, -220, 1770, 1870],
  ['argyle', 'Argyle Street', 10, -1160, -570, 100, 260],
  ['cowper-wharf', 'Cowper Wharf Roadway', 12, 560, 900, 880, 1390],
  ['macleay', 'Macleay Street', 12, 880, 1020, 1150, 1800],
  ['victoria-potts', 'Victoria Street', 12, 700, 900, 1250, 2000],
  ['william', 'William Street', 20, -400, 700, 1600, 2100],
  ['broughton', 'Broughton Street', 9, -260, 160, -1520, -900],
  ['blues-point', 'Blues Point Road', 10, -1060, -780, -1800, -920],
  ['pacific-hwy', 'Pacific Highway', 16, -760, -340, -2010, -1450],
  ['kurraba', 'Kurraba Road', 9, 60, 870, -1910, -1220],
];

function rdp(points: P[], eps: number): P[] {
  if (points.length < 3) return points;
  const a = points[0]!,
    b = points.at(-1)!,
    dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz) || 1e-9;
  let worst = 0,
    index = 0;
  points.slice(1, -1).forEach((p, i) => {
    const d = Math.abs(dx * (a[1] - p[1]) - dz * (a[0] - p[0])) / len;
    if (d > worst) [worst, index] = [d, i + 1];
  });
  return worst > eps
    ? [...rdp(points.slice(0, index + 1), eps).slice(0, -1), ...rdp(points.slice(index), eps)]
    : [a, b];
}

const data = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as {
  elements: { tags: { name: string }; geometry: { lat: number; lon: number }[] }[];
};
const dry = (x: number, z: number, half: number, ux: number, uz: number) =>
  [-1, -0.5, 0, 0.5, 1].every(
    (s) => sydneyTerrainHeightAt(x - uz * half * s, z + ux * half * s) > 0.6,
  );

for (const [id, name, width, minX, maxX, minZ, maxZ] of STREETS) {
  const pts = data.elements
    .filter((e) => e.tags.name === name)
    .flatMap((e) => e.geometry.map((g) => toScene(g.lat, g.lon)))
    .filter(([x, z]) => x >= minX && x <= maxX && z >= minZ && z <= maxZ);
  if (pts.length < 2) {
    console.log(`// ${id}: no OSM points in region`);
    continue;
  }
  // Principal axis, then 40 m bins: dual carriageways and split ways collapse
  // to one centreline without depending on OSM way order.
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
    cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let sxx = 0,
    sxz = 0,
    szz = 0;
  for (const [x, z] of pts) {
    sxx += (x - cx) ** 2;
    sxz += (x - cx) * (z - cz);
    szz += (z - cz) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * sxz, sxx - szz),
    ux = Math.cos(angle),
    uz = Math.sin(angle);
  const bins = new Map<number, P[]>();
  for (const p of pts) {
    const k = Math.round(((p[0] - cx) * ux + (p[1] - cz) * uz) / 40);
    bins.set(k, [...(bins.get(k) ?? []), p]);
  }
  const line = [...bins.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, b]) => [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length] as P);
  // Longest dry run; a street that meets the harbour stops at the kerb.
  let best: P[] = [],
    run: P[] = [];
  for (let i = 0; i < line.length; i++) {
    const [x, z] = line[i]!;
    const next = line[Math.min(i + 1, line.length - 1)]!,
      prev = line[Math.max(i - 1, 0)]!,
      dx = next[0] - prev[0],
      dz = next[1] - prev[1],
      l = Math.hypot(dx, dz) || 1;
    let ok = dry(x, z, width / 2 + 1, dx / l, dz / l);
    if (ok && run.length) {
      const [px, pz] = run.at(-1)!;
      for (let s = 1; s < 10 && ok; s++)
        ok = dry(px + ((x - px) * s) / 10, pz + ((z - pz) * s) / 10, width / 2 + 1, dx / l, dz / l);
    }
    if (ok) run.push([x, z]);
    else {
      if (run.length > best.length) best = run;
      run = [];
    }
  }
  if (run.length > best.length) best = run;
  const simple = rdp(best, 6).map(([x, z]) => `[${Math.round(x)}, ${Math.round(z)}]`);
  if (simple.length < 2) {
    console.log(`// ${id}: no dry run`);
    continue;
  }
  console.log(
    `    { id: '${id}', from: 'osm', to: 'osm', width: ${width}, mode: 'ground', points: [${simple.join(', ')}] },`,
  );
}
