import { describe, expect, it } from 'vitest';
import { InstancedMesh } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import { greenbeltInnerEdgeAt } from '../src/data/gizaEnvironment';
import { FIELD_BIRD_FLOCK, fieldBirdStateAt } from '../src/data/gizaFieldBirds';
import { isClearOfSiteWorks, siteKeepOuts } from '../src/engine/siteClearance';
import { FieldBirds } from '../src/render/three/FieldBirds';

const keepOuts = siteKeepOuts(GIZA_CONSTRUCTION);

/**
 * The strip band a kite may wander across: the orbit center rides
 * stripOffset [6, 10] landward of the sampled greenbelt inner edge and the
 * z-radius adds at most 6, so the bird never strays further than 16 units
 * off the levee line (and never onto the water side of it).
 */
const STRIP_BAND = FIELD_BIRD_FLOCK.stripOffset[1] + FIELD_BIRD_FLOCK.radiusZ[1];

describe('field kite flock (Spec 08 §Era and place grounding)', () => {
  it('keeps every bird clear of monument and earthwork footprints', () => {
    for (let bird = 0; bird < FIELD_BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 400; step += 1) {
        const t = step / 400;
        const { x, z } = fieldBirdStateAt(bird, t);
        // A kite hanging over a ramp reads as a bug, not as wildlife: the
        // typed orbit must hold against the real site keep-outs.
        expect(isClearOfSiteWorks(x, z, keepOuts, [], { margin: 0.5 })).toBe(true);
      }
    }
  });

  it('keeps every bird near the cultivated strip, inside the channel span', () => {
    for (let bird = 0; bird < FIELD_BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 400; step += 1) {
        const t = step / 400;
        const { x, z } = fieldBirdStateAt(bird, t);
        // The flock works the greenbelt: the typed orbit must hold against
        // the real strip-edge sampler, not a hard-coded rectangle.
        expect(Math.abs(z - greenbeltInnerEdgeAt(x))).toBeLessThanOrEqual(STRIP_BAND + 1e-9);
        expect(x).toBeGreaterThanOrEqual(-118);
        expect(x).toBeLessThanOrEqual(99);
      }
    }
  });

  it('stays inside the typed altitude band — low soaring over the fields', () => {
    for (let bird = 0; bird < FIELD_BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 200; step += 1) {
        const t = step / 200;
        const { y } = fieldBirdStateAt(bird, t);
        expect(y).toBeGreaterThanOrEqual(FIELD_BIRD_FLOCK.altitude[0] - 1.1 - 1e-9);
        expect(y).toBeLessThanOrEqual(FIELD_BIRD_FLOCK.altitude[1] + 1.1 + 1e-9);
      }
    }
  });

  it('bounds the wing cycle: flaps inside the flap arc, glides hold a shallow dihedral', () => {
    let sawFlapExtreme = false;
    let sawGlide = false;
    for (let bird = 0; bird < FIELD_BIRD_FLOCK.count; bird += 1) {
      for (let step = 0; step <= 400; step += 1) {
        const wingAngle = fieldBirdStateAt(bird, step / 400).wingAngle;
        expect(wingAngle).toBeGreaterThanOrEqual(0.16 - 0.58 - 1e-9);
        expect(wingAngle).toBeLessThanOrEqual(0.16 + 0.58 + 0.05 + 1e-9);
        if (Math.abs(wingAngle - (0.16 - 0.58)) < 0.05) sawFlapExtreme = true;
        // Glide gate open: wing held near the dihedral with only rocking.
        if (Math.abs(wingAngle - 0.16) < 0.08) sawGlide = true;
      }
    }
    expect(sawFlapExtreme).toBe(true);
    expect(sawGlide).toBe(true);
  });

  it('is a pure function of playback t', () => {
    expect(fieldBirdStateAt(7, 0.31)).toEqual(fieldBirdStateAt(7, 0.31));
    expect(fieldBirdStateAt(7, 0.31)).not.toEqual(fieldBirdStateAt(7, 0.32));
  });
});

describe('field-kite render wiring (Spec 06/08)', () => {
  function instancedByName(fieldBirds: FieldBirds): Map<string, InstancedMesh> {
    const meshes = new Map<string, InstancedMesh>();
    fieldBirds.group.traverse((child) => {
      if (child instanceof InstancedMesh && child.name) meshes.set(child.name, child);
    });
    return meshes;
  }

  it('draws bodies and wings on dedicated batches with per-frame culling off', () => {
    const fieldBirds = new FieldBirds();
    const meshes = instancedByName(fieldBirds);

    // Kites: one body batch, one wing batch (two wings per bird).
    const bodies = meshes.get('field-kite-bodies');
    const wings = meshes.get('field-kite-wings');
    expect(bodies).toBeDefined();
    expect(wings).toBeDefined();
    expect(bodies!.count).toBe(FIELD_BIRD_FLOCK.count);
    expect(wings!.count).toBe(FIELD_BIRD_FLOCK.count * 2);
    expect(bodies!.frustumCulled).toBe(false);
    expect(wings!.frustumCulled).toBe(false);
    expect(bodies!.castShadow).toBe(false);
    expect(wings!.castShadow).toBe(false);
    fieldBirds.dispose();
  });

  it('rewrites wing matrices when t advances, and repeats them identically', () => {
    const fieldBirds = new FieldBirds();
    const meshes = instancedByName(fieldBirds);
    const wings = meshes.get('field-kite-wings')!;
    const readRow = (mesh: InstancedMesh, index: number) =>
      Array.from(mesh.instanceMatrix.array.slice(index * 16, index * 16 + 16));

    const t = 0.4;
    const wingBefore = readRow(wings, 5);
    fieldBirds.update(t);
    const wingMid = readRow(wings, 5);
    expect(wingMid).not.toEqual(wingBefore);
    fieldBirds.update(t);
    expect(readRow(wings, 5)).toEqual(wingMid);
    fieldBirds.dispose();
  });
});
