import { describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import { isClearOfSiteWorks, siteKeepOuts, haulCorridors } from '../src/engine/siteClearance';
import { GizaEnvironment } from '../src/render/three/Environment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const fixtureWonder: Wonder = {
  id: 'foreground-fixture',
  name: 'Fixture',
  location: 'Nowhere',
  region: 'Testland',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

const keepOuts = siteKeepOuts(GIZA_CONSTRUCTION);
const corridors = haulCorridors(GIZA_CONSTRUCTION);

function instancedByName(environment: GizaEnvironment): Map<string, InstancedMesh> {
  const meshes = new Map<string, InstancedMesh>();
  environment.group.traverse((child) => {
    if (child instanceof InstancedMesh && child.name) meshes.set(child.name, child);
  });
  return meshes;
}

/** World position of instance `i` from its matrix. */
function instancePosition(mesh: InstancedMesh, i: number): [number, number, number] {
  const a = mesh.instanceMatrix.array;
  return [a[i * 16 + 12]!, a[i * 16 + 13]!, a[i * 16 + 14]!];
}

describe('Tier 4 P2 foreground (Spec 08 §Site zones)', () => {
  it('builds every new staging and work-area batch', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);
    for (const name of [
      'quarry-extraction-detail',
      'dressing-yard-rough-queue',
      'dressing-yard-in-dressing-blocks',
      'dressing-yard-dressed-stack',
      'dressing-yard-measuring-cords',
      'quarry-spoil-conical-dumps',
      'quarry-spoil-skirted-mounds',
      'quarry-spoil-windrow-ridges',
      'worker-settlement-ridge-tents',
      'site-idle-sleds-and-lever-piles',
      'haul-queue-marker-stones',
      'haul-queue-water-troughs',
      'site-rope-coils',
      'camp-domestic-pottery',
    ]) {
      expect(meshes.get(name), name).toBeDefined();
      expect(meshes.get(name)!.count).toBeGreaterThan(0);
    }
    const paths = environment.group.getObjectByName('camp-trampled-paths');
    expect(paths instanceof Mesh).toBe(true);
    environment.dispose();
  });

  it('keeps every placed foreground prop clear of masonry, earthworks, and haul lanes', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);
    // Each batch is verified at the margins its placement code claims (its
    // own half-extent plus working gap — the plausibility rule, not a
    // blanket center-point check).
    const placements: Array<[string, number, number]> = [
      ['dressing-yard-rough-queue', 0.9, 1.2],
      ['dressing-yard-in-dressing-blocks', 0.9, 1.2],
      ['dressing-yard-dressed-stack', 0.9, 1.2],
      ['quarry-spoil-conical-dumps', 2.4, 3],
      ['quarry-spoil-skirted-mounds', 2.4, 3],
      ['quarry-spoil-windrow-ridges', 2.4, 3],
      ['abandoned-rough-cut-stones', 1, 2.6],
      ['site-idle-sleds-and-lever-piles', 1.25, 1.6],
      ['haul-queue-marker-stones', 0.4, 2.0],
      ['haul-queue-water-troughs', 0.8, 2.2],
      ['site-rope-coils', 0.4, 1.2],
      ['camp-domestic-pottery', 0.4, 0.8],
    ];
    for (const [name, margin, corridorClearance] of placements) {
      const mesh = meshes.get(name)!;
      for (let i = 0; i < mesh.count; i += 1) {
        const [x, , z] = instancePosition(mesh, i);
        expect(
          isClearOfSiteWorks(x, z, keepOuts, corridors, { margin, corridorClearance }),
          `${name}[${i}] at (${x.toFixed(1)}, ${z.toFixed(1)})`,
        ).toBe(true);
      }
    }
    environment.dispose();
  });

  it('grounds every foreground prop — nothing floats or sinks', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);
    for (const name of [
      'dressing-yard-rough-queue',
      'dressing-yard-in-dressing-blocks',
      'dressing-yard-dressed-stack',
      'site-idle-sleds-and-lever-piles',
      'haul-queue-marker-stones',
      'site-rope-coils',
      'camp-domestic-pottery',
    ]) {
      const mesh = meshes.get(name)!;
      for (let i = 0; i < mesh.count; i += 1) {
        const [, y] = instancePosition(mesh, i);
        expect(y, `${name}[${i}]`).toBeGreaterThan(0);
        expect(y, `${name}[${i}]`).toBeLessThan(4.5);
      }
    }
    environment.dispose();
  });

  it('anchors the dressing yard on the haul route dressing waypoint', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);
    const dressing = GIZA_CONSTRUCTION.routes[0]!.waypoints.dressing;
    // The dressed stack's centroid sits beside the waypoint, within a
    // cluster radius — the sled path visibly passes through the yard.
    const stack = meshes.get('dressing-yard-dressed-stack')!;
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < stack.count; i += 1) {
      const [x, , z] = instancePosition(stack, i);
      cx += x;
      cz += z;
    }
    cx /= stack.count;
    cz /= stack.count;
    expect(Math.hypot(cx - dressing[0], cz - dressing[2])).toBeLessThan(14);
    environment.dispose();
  });

  it('is deterministic across repeated construction', () => {
    const first = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const second = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    for (const name of ['quarry-extraction-detail', 'camp-domestic-pottery', 'site-rope-coils']) {
      const a = instancedByName(first).get(name)!;
      const b = instancedByName(second).get(name)!;
      expect(a.count).toBe(b.count);
      expect(Array.from(a.instanceMatrix.array)).toEqual(Array.from(b.instanceMatrix.array));
    }
    first.dispose();
    second.dispose();
  });
});
