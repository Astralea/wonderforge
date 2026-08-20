import { describe, expect, it } from 'vitest';
import { InstancedMesh, Vector3, type MeshStandardMaterial } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import {
  BIRD_FLOCK,
  birdStateAt,
  riverCenterZAt,
  WIND_DUST,
  windDustPuffAt,
} from '../src/data/gizaEnvironment';
import { isClearOfSiteWorks, siteKeepOuts } from '../src/engine/siteClearance';
import { gizaSunStateAt, sampleGizaSky } from '../src/data/gizaSky';
import { lightStateAt } from '../src/engine/daynight';
import { GizaEnvironment } from '../src/render/three/Environment';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

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

const keepOuts = siteKeepOuts(GIZA_CONSTRUCTION);
const PUFF_COUNT = WIND_DUST.lanes.length * WIND_DUST.puffsPerLane;

describe('wind-blown dust lanes (Spec 08 §Physical plausibility)', () => {
  it('keeps every drifting puff clear of monument and earthwork footprints', () => {
    // A drifting puff clipping through a ramp reads as a bug, not weather.
    // Sample every puff across enough movies to cover its full lane loop,
    // with the puff's own maximum half-extent as the margin.
    const maxHalfWidth = 0.5 * (2.4 + 2.2);
    for (let puff = 0; puff < PUFF_COUNT; puff += 1) {
      for (let step = 0; step <= 720; step += 1) {
        const t = (step / 720) * 3;
        const { x, z } = windDustPuffAt(puff, t);
        expect(isClearOfSiteWorks(x, z, keepOuts, [], { margin: maxHalfWidth })).toBe(true);
      }
    }
  });

  it('keeps puff bottoms just off the ground at full size', () => {
    // The renderer draws a radius-0.5 sphere scaled by (scaleY * fade); the
    // deepest possible bottom is therefore y - 0.5 * scaleY (fade only lifts
    // it). Buried dust reads as a smear of color under the terrain.
    for (let puff = 0; puff < PUFF_COUNT; puff += 1) {
      for (let step = 0; step <= 200; step += 1) {
        const t = step / 200;
        const { y, scaleY } = windDustPuffAt(puff, t);
        expect(y - 0.5 * scaleY).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('pinches the fade to zero at both lane ends so the loop never pops', () => {
    let sawVanished = false;
    let sawFull = false;
    for (let puff = 0; puff < PUFF_COUNT; puff += 1) {
      for (let step = 0; step <= 360; step += 1) {
        const fade = windDustPuffAt(puff, (step / 360) * 3).fade;
        expect(fade).toBeGreaterThanOrEqual(0);
        expect(fade).toBeLessThanOrEqual(1);
        if (fade < 0.02) sawVanished = true;
        if (fade > 0.98) sawFull = true;
      }
    }
    expect(sawVanished).toBe(true);
    expect(sawFull).toBe(true);
  });

  it('is a pure function of playback t', () => {
    expect(windDustPuffAt(5, 0.42)).toEqual(windDustPuffAt(5, 0.42));
    expect(windDustPuffAt(5, 0.42)).not.toEqual(windDustPuffAt(5, 0.43));
  });
});

describe('river egret flock (Spec 08 §Era and place grounding)', () => {
  it('keeps every bird over the river and floodplain, never crossing masonry', () => {
    const maxHalfLength = 0.6;
    for (let bird = 0; bird < BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 400; step += 1) {
        const t = step / 400;
        const { x, z } = birdStateAt(bird, t);
        // The flock works the channel: the typed orbit must hold against the
        // real centerline sampler, not a hard-coded rectangle.
        expect(Math.abs(z - riverCenterZAt(x))).toBeLessThanOrEqual(
          BIRD_FLOCK.radiusZ[1] + 1e-9,
        );
        expect(isClearOfSiteWorks(x, z, keepOuts, [], { margin: maxHalfLength })).toBe(true);
      }
    }
  });

  it('stays inside the typed altitude band — above the mast tips, below the monument tops', () => {
    for (let bird = 0; bird < BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 200; step += 1) {
        const t = step / 200;
        const { y } = birdStateAt(bird, t);
        expect(y).toBeGreaterThanOrEqual(BIRD_FLOCK.altitude[0] - 1.1 - 1e-9);
        expect(y).toBeLessThanOrEqual(BIRD_FLOCK.altitude[1] + 1.1 + 1e-9);
      }
    }
  });

  it('bounds the wing cycle: flaps inside the flap arc, glides hold a shallow dihedral', () => {
    let sawFlapExtreme = false;
    let sawGlide = false;
    for (let bird = 0; bird < BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 400; step += 1) {
        const wingAngle = birdStateAt(bird, step / 400).wingAngle;
        expect(wingAngle).toBeGreaterThanOrEqual(0.18 - 0.62 - 1e-9);
        expect(wingAngle).toBeLessThanOrEqual(0.18 + 0.62 + 0.05 + 1e-9);
        if (Math.abs(wingAngle - (0.18 - 0.62)) < 0.05) sawFlapExtreme = true;
        // Glide gate open: wing held near the dihedral with only rocking.
        if (Math.abs(wingAngle - 0.18) < 0.08) sawGlide = true;
      }
    }
    expect(sawFlapExtreme).toBe(true);
    expect(sawGlide).toBe(true);
  });

  it('is a pure function of playback t', () => {
    expect(birdStateAt(7, 0.31)).toEqual(birdStateAt(7, 0.31));
    expect(birdStateAt(7, 0.31)).not.toEqual(birdStateAt(7, 0.32));
  });
});

describe('living-ecology render wiring (Spec 06/08)', () => {
  function instancedByName(environment: GizaEnvironment): Map<string, InstancedMesh> {
    const meshes = new Map<string, InstancedMesh>();
    environment.group.traverse((child) => {
      if (child instanceof InstancedMesh && child.name) meshes.set(child.name, child);
    });
    return meshes;
  }

  it('draws dust, birds, and cloth on dedicated batches with per-frame culling off', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);

    // Wind dust: one instanced batch covering every lane, translucent and
    // depth-reading but not depth-writing, never casting shadows.
    const puffs = meshes.get('giza-wind-dust-puffs');
    expect(puffs).toBeDefined();
    expect(puffs!.count).toBe(PUFF_COUNT);
    expect(puffs!.frustumCulled).toBe(false);
    expect(puffs!.castShadow).toBe(false);
    const dustMaterial = puffs!.material as MeshStandardMaterial;
    expect(dustMaterial.transparent).toBe(true);
    expect(dustMaterial.opacity).toBe(WIND_DUST.baseOpacity);
    expect(dustMaterial.depthWrite).toBe(false);

    // Egrets: one body batch, one wing batch (two wings per bird).
    const bodies = meshes.get('nile-egret-bodies');
    const wings = meshes.get('nile-egret-wings');
    expect(bodies!.count).toBe(BIRD_FLOCK.count);
    expect(wings!.count).toBe(BIRD_FLOCK.count * 2);
    expect(bodies!.frustumCulled).toBe(false);
    expect(wings!.frustumCulled).toBe(false);

    // Living cloth rides dedicated linen clones with their own program
    // cache keys; worker clothing keeps the still shared linen.
    expect(meshes.get('nile-square-linen-sails')!.material).not.toBe(meshes.get('nile-wooden-hulls')!.material);
    for (const [name, key] of [
      ['nile-square-linen-sails', 'wf-cloth:sail'],
      ['worker-settlement-tents', 'wf-cloth:tent'],
      ['worker-settlement-shade-cloths', 'wf-cloth:awning'],
    ] as const) {
      const material = meshes.get(name)!.material as MeshStandardMaterial;
      expect(material.customProgramCacheKey()).toBe(key);
    }
    environment.dispose();
  });

  it('rewrites dust and wing matrices when t advances, and repeats them identically', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);
    const puffs = meshes.get('giza-wind-dust-puffs')!;
    const wings = meshes.get('nile-egret-wings')!;
    const readRow = (mesh: InstancedMesh, index: number) =>
      Array.from(mesh.instanceMatrix.array.slice(index * 16, index * 16 + 16));

    // Drive the update through the real sky/light samplers: SkyDome and the
    // campfire ramp read the full keyframe, so stubs would rot silently.
    const t = 0.4;
    const sky = sampleGizaSky(t);
    const light = lightStateAt(t, fixtureWonder);
    const sun = gizaSunStateAt(t);
    const sunDirection = new Vector3(
      Math.cos(sun.elevation) * Math.sin(sun.azimuth),
      Math.sin(sun.elevation),
      Math.cos(sun.elevation) * Math.cos(sun.azimuth),
    );
    const dustBefore = readRow(puffs, 3);
    const wingBefore = readRow(wings, 5);
    environment.update(t, light, sunDirection, sky);
    const dustMid = readRow(puffs, 3);
    const wingMid = readRow(wings, 5);
    expect(dustMid).not.toEqual(dustBefore);
    expect(wingMid).not.toEqual(wingBefore);
    environment.update(t, light, sunDirection, sky);
    expect(readRow(puffs, 3)).toEqual(dustMid);
    expect(readRow(wings, 5)).toEqual(wingMid);
    environment.dispose();
  });
});
