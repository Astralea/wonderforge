import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, PointLight, Vector3, type MeshStandardMaterial } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import { sampleGizaSky } from '../src/data/gizaSky';
import { lightStateAt } from '../src/engine/daynight';
import { haulCorridors, isClearOfSiteWorks, siteKeepOuts } from '../src/engine/siteClearance';
import { GizaEnvironment } from '../src/render/three/Environment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const fixtureWonder: Wonder = {
  id: 'campfire-fixture',
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

function buildEnvironment(): GizaEnvironment {
  return new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
}

function find(environment: GizaEnvironment, name: string): InstancedMesh {
  let found: InstancedMesh | null = null;
  environment.group.traverse((child) => {
    if (child instanceof InstancedMesh && child.name === name) found = child;
  });
  if (!found) throw new Error(`missing instanced mesh ${name}`);
  return found;
}

function instancePosition(mesh: InstancedMesh, index: number): [number, number, number] {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return [matrix.elements[12]!, matrix.elements[13]!, matrix.elements[14]!];
}

/** Pit centers: the outer flame instance of each pit sits exactly on it. */
function pitCenters(environment: GizaEnvironment): Array<[number, number]> {
  const flames = find(environment, 'campfire-flames');
  const pits: Array<[number, number]> = [];
  for (let i = 0; i < flames.count; i += 2) {
    const [x, , z] = instancePosition(flames, i);
    pits.push([x, z]);
  }
  return pits;
}

describe('Giza dusk campfires (Spec 08 §Physical plausibility)', () => {
  it('places 4–6 pits inside the worker camp, clear of corridors and footprints', () => {
    const environment = buildEnvironment();
    const pits = pitCenters(environment);
    expect(pits.length).toBeGreaterThanOrEqual(4);
    expect(pits.length).toBeLessThanOrEqual(6);
    const keepOuts = siteKeepOuts(GIZA_CONSTRUCTION);
    const corridors = haulCorridors(GIZA_CONSTRUCTION);
    for (const [x, z] of pits) {
      expect(x).toBeGreaterThan(-40);
      expect(x).toBeLessThan(48);
      expect(z).toBeGreaterThan(36);
      expect(z).toBeLessThan(58);
      // Slightly tighter than the placement nudge (1.4 / 3.2): if a pit
      // passes here it is genuinely off the haul lanes and the works.
      expect(
        isClearOfSiteWorks(x, z, keepOuts, corridors, { margin: 0.6, corridorClearance: 1 }),
      ).toBe(true);
    }
    environment.dispose();
  });

  it('keeps the fire pit human-scale: ring under 1.4 across, flames under 0.8 tall', () => {
    const environment = buildEnvironment();
    const stones = find(environment, 'campfire-ring-stones');
    const pits = pitCenters(environment);
    expect(stones.count).toBe(pits.length * 8);
    for (let pit = 0; pit < pits.length; pit += 1) {
      const [cx, cz] = pits[pit]!;
      let ringDiameter = 0;
      for (let s = 0; s < 8; s += 1) {
        const [x, y, z] = instancePosition(stones, pit * 8 + s);
        const radial = Math.hypot(x - cx, z - cz);
        expect(radial).toBeGreaterThan(0.3);
        expect(radial).toBeLessThan(0.75);
        ringDiameter = Math.max(ringDiameter, radial * 2);
        // Stones rest on the ground, never buried or floating.
        expect(y).toBeGreaterThan(0.01);
        expect(y).toBeLessThan(0.15);
      }
      expect(ringDiameter).toBeGreaterThan(0.8);
      expect(ringDiameter).toBeLessThan(1.4);
    }
    // The authored cone tops out at 0.62 units; flicker keeps it under 0.8.
    const flames = find(environment, 'campfire-flames');
    const position = flames.geometry.getAttribute('position');
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      minY = Math.min(minY, position.getComponent(i, 1));
      maxY = Math.max(maxY, position.getComponent(i, 1));
    }
    expect(maxY - minY).toBeLessThanOrEqual(0.8);
    expect(flames.frustumCulled).toBe(false);
    environment.dispose();
  });

  it('shares at most two warm point lights between the pit clusters', () => {
    const environment = buildEnvironment();
    const lights: PointLight[] = [];
    environment.group.traverse((child) => {
      if (child instanceof PointLight) lights.push(child);
    });
    expect(lights.length).toBeLessThanOrEqual(2);
    for (const light of lights) {
      expect(`#${light.color.getHexString()}`).toBe('#ff8c3f');
      expect(light.distance).toBeCloseTo(16);
      expect(light.decay).toBe(2);
      expect(light.castShadow).toBe(false);
    }
    environment.dispose();
  });

  it('burns at dusk and stays dark at midday, with no pop', () => {
    const environment = buildEnvironment();
    const flames = find(environment, 'campfire-flames');
    const material = flames.material as MeshStandardMaterial;
    const sun = new Vector3(0, 1, 0);

    environment.update(0.5, lightStateAt(0.5, fixtureWonder), sun, sampleGizaSky(0.5));
    expect(material.emissiveIntensity).toBe(0);
    const [, middayY] = instancePosition(flames, 0);
    expect(middayY).toBeLessThan(0.1); // flame scaled flat against the pit

    environment.update(0.95, lightStateAt(0.95, fixtureWonder), sun, sampleGizaSky(0.95));
    expect(material.emissiveIntensity).toBeGreaterThan(1.5);
    const [, duskY] = instancePosition(flames, 0);
    expect(duskY).toBeGreaterThan(0.15); // flame stands above the ring

    // The ramp is smooth: golden hour sits strictly between the two.
    environment.update(0.8, lightStateAt(0.8, fixtureWonder), sun, sampleGizaSky(0.8));
    expect(material.emissiveIntensity).toBeGreaterThan(0);
    expect(material.emissiveIntensity).toBeLessThan(3.4);
    environment.dispose();
  });

  it('is deterministic across rebuilds', () => {
    const a = buildEnvironment();
    const b = buildEnvironment();
    const stonesA = find(a, 'campfire-ring-stones');
    const stonesB = find(b, 'campfire-ring-stones');
    expect(Array.from(stonesA.instanceMatrix.array)).toEqual(
      Array.from(stonesB.instanceMatrix.array),
    );
    a.dispose();
    b.dispose();
  });
});
