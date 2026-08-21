// Palm-stand evidence: archetype mix, grove clustering gap stats, and the
// render batch counts a forked doum implies. Run: npx vite-node scripts/probe-palm-stand.mts
import { InstancedMesh } from 'three';
import {
  GIZA_ENVIRONMENT,
  greenbeltInnerEdgeAt,
  palmArchetypeAt,
  palmStandAt,
  riverCenterZAt,
  riverWidthAt,
} from '../src/data/gizaEnvironment';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import { GizaEnvironment } from '../src/render/three/Environment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const kinds = new Map<string, number>();
for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
  const { kind } = palmArchetypeAt(i);
  kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
}
console.log('stand archetype mix:', Object.fromEntries(kinds));
const groveKinds = new Map<string, number>();
for (let g = 0; g < GIZA_ENVIRONMENT.memphisGrovePalms; g += 1) {
  const { kind } = palmArchetypeAt(10_000 + g);
  groveKinds.set(kind, (groveKinds.get(kind) ?? 0) + 1);
}
console.log('memphis archetype mix:', Object.fromEntries(groveKinds));

const spots: Array<{ x: number; z: number }> = [];
let rejected = 0;
for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
  const spot = palmStandAt(i);
  if (!spot) {
    rejected += 1;
    continue;
  }
  const inner = greenbeltInnerEdgeAt(spot.x);
  const onStrip = spot.z >= inner + 1.5 - 1e-9 && spot.z <= inner + GIZA_ENVIRONMENT.greenbelt.depth - 2 + 1e-9;
  const outOfWater = spot.z > riverCenterZAt(spot.x) + riverWidthAt(spot.x) / 2;
  if (!onStrip || !outOfWater) console.log('BAD SLOT', spot, { onStrip, outOfWater });
  spots.push(spot);
}
console.log(`placed=${spots.length} rejected=${rejected}`);

const sorted = [...spots].sort((a, b) => a.x - b.x);
const gaps = sorted.slice(1).map((p, i) => p.x - sorted[i]!.x);
const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
console.log(
  `adjacent gaps: min=${Math.min(...gaps).toFixed(2)} max=${Math.max(...gaps).toFixed(2)} ` +
    `mean=${mean.toFixed(2)} variance=${variance.toFixed(2)}`,
);
// The dead even-row bug for comparison (old formula, same count).
const old: number[] = [];
for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
  old.push(-108 + (i / (GIZA_ENVIRONMENT.palms - 1)) * 216);
}
const oldGaps = old.slice(1).map((x, i) => x - old[i]! + 0);
console.log(`even-row pitch would be ${oldGaps[0]!.toFixed(2)} (variance 0 before jitter)`);

const wonder = {
  id: 'probe', name: 'p', location: 'l', region: 'r', era: 'ancient',
  completedYear: 1, endsAtNight: false, quote: { text: 'q', author: 'a' },
  description: 'd', facts: [],
  palette: { ground: '#000', primary: '#000', accent: '#000', sky: '#000' },
  structure: { stages: [] },
} as unknown as Wonder;
const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(wonder));
const meshes = new Map<string, InstancedMesh>();
environment.group.traverse((child) => {
  if (child instanceof InstancedMesh && child.name) meshes.set(child.name, child);
});
for (const name of [
  'greenbelt-palm-trunks',
  'greenbelt-palm-hearts',
  'greenbelt-individual-palm-fronds',
  'palm-fan-fronds',
  'greenbelt-palm-dead-frond-skirts',
  'greenbelt-date-fruit-clusters',
  'palm-understory-fallen-fronds',
]) {
  const mesh = meshes.get(name);
  console.log(`${name}: count=${mesh?.count} allocated=${mesh ? mesh.instanceMatrix.array.length / 16 : 0}`);
}
environment.dispose();
