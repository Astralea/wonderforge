import { Box3, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createGizaConstructionPlan } from '../src/data/gizaConstruction';
import type { Wonder } from '../src/data/types';
import {
  GIZA_CORE_OCCUPANCY_INSET,
  gizaCoreOccupancyVolume,
} from '../src/engine/gizaOccupancy';
import { BlockSystem } from '../src/render/three/BlockSystem';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';

const plan = createGizaConstructionPlan();
const fixtureWonder: Wonder = {
  id: 'environment-fixture',
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

describe('Giza core occupancy', () => {
  it('stays inside the casing and fills the seated mass', () => {
    const { khufu } = plan.monuments;
    const finished = gizaCoreOccupancyVolume(khufu, khufu.courses - 1);
    expect(finished).not.toBeNull();
    expect(finished!.bottomWidth).toBe(khufu.baseWidth - GIZA_CORE_OCCUPANCY_INSET * 2);
    expect(finished!.bottomWidth).toBeLessThan(khufu.baseWidth);
    expect(finished!.topWidth).toBeLessThan(finished!.bottomWidth);
    expect(finished!.height).toBeGreaterThan(khufu.height * 0.9);
    expect(finished!.height).toBeLessThan(khufu.height);
    expect(gizaCoreOccupancyVolume(khufu, -1)).toBeNull();

    const early = gizaCoreOccupancyVolume(khufu, 2);
    expect(early!.height).toBeLessThan(finished!.height * 0.2);
  });

  it('closes the hollow casing so a ray through Khufu hits solid core', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const blocks = new BlockSystem(plan, library);
    blocks.update(1);
    blocks.group.updateMatrixWorld(true);

    const occupancy = blocks.group.getObjectByName('khufu-core-occupancy');
    expect(occupancy).toBeInstanceOf(Mesh);
    const mesh = occupancy as Mesh;
    expect(mesh.visible).toBe(true);
    expect(mesh.castShadow).toBe(true);
    const material = mesh.material as MeshStandardMaterial;
    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);

    const { khufu } = plan.monuments;
    const interior = new Vector3(
      khufu.center[0],
      khufu.groundY + khufu.height * 0.4,
      khufu.center[1],
    );
    const bounds = new Box3().setFromObject(mesh);
    expect(bounds.containsPoint(interior)).toBe(true);

    const origin = new Vector3(
      khufu.center[0] - khufu.baseWidth / 2 + 2.2,
      interior.y,
      khufu.center[1],
    );
    const ray = new Raycaster(origin, new Vector3(1, 0, 0), 0, khufu.baseWidth);
    const hits = ray.intersectObject(mesh, false);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.distance).toBeLessThan(6);

    for (const monument of ['khafre', 'menkaure'] as const) {
      const other = blocks.group.getObjectByName(`${monument}-core-occupancy`) as Mesh;
      expect(other.visible).toBe(true);
    }

    blocks.update(0);
    expect((blocks.group.getObjectByName('khufu-core-occupancy') as Mesh).visible).toBe(false);
    blocks.dispose();
  });
});
