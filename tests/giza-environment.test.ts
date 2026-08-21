import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3, type MeshStandardMaterial } from 'three';
import { GIZA_CONSTRUCTION } from '../src/data/gizaConstruction';
import {
  BIRD_FLOCK,
  birdStateAt,
  fieldParcelAt,
  GIZA_ENVIRONMENT,
  greenbeltInnerEdgeAt,
  grovePalmAt,
  palmArchetypeAt,
  palmStandAt,
  riverBraidAt,
  riverCenterZAt,
  riverWidthAt,
  WIND_DUST,
  windDustPuffAt,
  type FieldCrop,
  type PalmKind,
} from '../src/data/gizaEnvironment';
import { isClearOfSiteWorks, siteKeepOuts } from '../src/engine/siteClearance';
import { mulberry32 } from '../src/engine/random';
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

describe('palm archetypes (Spec 08 §Ecology)', () => {
  it('assigns five deterministic archetypes across the stand, including weeping and doum', () => {
    const kinds = new Set<string>();
    const counts = new Map<PalmKind, number>();
    for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
      const archetype = palmArchetypeAt(i);
      expect(archetype).toEqual(palmArchetypeAt(i)); // pure per index
      kinds.add(archetype.kind);
      counts.set(archetype.kind, (counts.get(archetype.kind) ?? 0) + 1);
      expect(archetype.uprightFronds + archetype.droopingFronds).toBeGreaterThan(0);
      expect(archetype.height[0]).toBeGreaterThan(0.4);
      expect(archetype.height[1]).toBeLessThanOrEqual(1.4);
      if (archetype.kind === 'date-tall') expect(archetype.fruit).toBe(true);
      if (archetype.kind === 'date-young') {
        expect(archetype.skirt).toBe(0);
        expect(archetype.fruit).toBe(false);
      }
      if (archetype.kind === 'palm-old') expect(archetype.lean[0]).toBeGreaterThanOrEqual(0.1);
      if (archetype.kind === 'date-weeping') {
        // The fountain silhouette: a wide frond ring, long fronds, deep droop.
        expect(archetype.crownRadius).toBeGreaterThan(1.6);
        expect(archetype.frondLength).toBeGreaterThan(1.2);
        expect(archetype.droopExtra).toBeGreaterThan(0.15);
        expect(archetype.fanFronds).toBe(false);
      }
      if (archetype.kind === 'palm-doum') {
        // Dichotomous branching: fan fronds, no skirt, no fruit.
        expect(archetype.fanFronds).toBe(true);
        expect(archetype.skirt).toBe(0);
        expect(archetype.fruit).toBe(false);
      }
      // Fork bands: single stems for date palms, 2–3 arms for doums.
      if (archetype.fanFronds) {
        expect(archetype.forks[0]).toBeGreaterThanOrEqual(2);
        expect(archetype.forks[1]).toBeLessThanOrEqual(3);
      } else {
        expect(archetype.forks).toEqual([1, 1]);
      }
    }
    expect(kinds).toEqual(
      new Set(['date-tall', 'date-young', 'palm-old', 'date-weeping', 'palm-doum']),
    );
    // The mix keeps every silhouette well represented (≈.32/.20/.16/.16/.16).
    for (const kind of kinds) {
      expect(counts.get(kind as PalmKind)!).toBeGreaterThanOrEqual(4);
    }
  });

  it('clusters the stand into groves with real gaps, on the strip and out of the water', () => {
    const spots: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
      const spot = palmStandAt(i);
      expect(spot).toEqual(palmStandAt(i)); // pure per index
      if (!spot) continue;
      const inner = greenbeltInnerEdgeAt(spot.x);
      // On the cultivated strip at the palm's own x…
      expect(spot.z).toBeGreaterThanOrEqual(inner + 1.5 - 1e-9);
      expect(spot.z).toBeLessThanOrEqual(inner + GIZA_ENVIRONMENT.greenbelt.depth - 2 + 1e-9);
      // …and clear of the channel water.
      expect(spot.z).toBeGreaterThan(riverCenterZAt(spot.x) + riverWidthAt(spot.x) / 2);
      spots.push(spot);
    }
    expect(spots.length).toBeGreaterThan(GIZA_ENVIRONMENT.palms * 0.8);
    // The even-row bug stays dead: grove gaps make adjacent-x spacing far
    // from uniform (the old pitch was 3.93 with ±2.25 jitter — variance
    // ~3.4 and a hard max gap of 8.43).
    const sorted = [...spots].sort((a, b) => a.x - b.x);
    const gaps = sorted.slice(1).map((palm, index) => palm.x - sorted[index]!.x);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
    expect(Math.max(...gaps)).toBeGreaterThan(12);
    expect(variance).toBeGreaterThan(8);
    // …while trunks never fuse: phyllotactic slots keep neighbors apart.
    let minDistance = Infinity;
    for (let a = 0; a < spots.length; a += 1) {
      for (let b = a + 1; b < spots.length; b += 1) {
        minDistance = Math.min(
          minDistance,
          Math.hypot(spots[a]!.x - spots[b]!.x, spots[a]!.z - spots[b]!.z),
        );
      }
    }
    expect(minDistance).toBeGreaterThan(1);
  });

  it('keeps the Memphis riverfront groves out of the channel and the braid', () => {
    const [anchorX, , anchorZ] = GIZA_ENVIRONMENT.settlement.anchor;
    let placed = 0;
    let rejected = 0;
    for (let i = 0; i < GIZA_ENVIRONMENT.memphisGrovePalms; i += 1) {
      const grove = grovePalmAt(i);
      expect(grove).toEqual(grovePalmAt(i)); // pure per index
      if (!grove) {
        rejected += 1;
        continue;
      }
      placed += 1;
      expect(grove.x).toBeGreaterThanOrEqual(anchorX - 58);
      expect(grove.x).toBeLessThanOrEqual(anchorX + 54);
      // Clear of the main channel water, plus a margin for the trunk.
      expect(Math.abs(grove.z - riverCenterZAt(grove.x)))
        .toBeGreaterThan(riverWidthAt(grove.x) / 2 + 0.5);
      // And clear of the braided side channel where it exists.
      const braid = riverBraidAt(grove.x);
      if (braid) {
        expect(Math.abs(grove.z - braid.centerZ)).toBeGreaterThan(braid.width / 2 + 0.5);
      }
      // Landward of the quay's river edge is the city's; groves stay on the
      // levee path with a trunk's width of walkway.
      expect(grove.z).toBeGreaterThanOrEqual(anchorZ + 14.6);
    }
    // Both outcomes must occur: a braid-squeezed slot rejects instead of
    // growing a palm out of the water.
    expect(placed).toBeGreaterThan(10);
    expect(rejected).toBeGreaterThan(0);
  });
});

describe('field crop mosaic (Spec 08 §Ecology)', () => {
  it('assigns every parcel a typed, deterministic peret-season crop state', () => {
    const allowed: FieldCrop[] = ['emmer-green', 'emmer-ripe', 'flax', 'fallow-plowed', 'stubble'];
    const seen = new Set<FieldCrop>();
    for (let i = 0; i < GIZA_ENVIRONMENT.fields; i += 1) {
      const parcel = fieldParcelAt(i);
      expect(allowed).toContain(parcel.crop);
      expect(fieldParcelAt(i).crop).toBe(parcel.crop); // pure per index
      seen.add(parcel.crop);
    }
    // The mosaic only reads if every state actually appears.
    expect(seen.size).toBe(allowed.length);
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

    // Living-water fittings: wake trail + bow pulse per moving hull, a
    // two-figure crew, and deck detail — the moored skiff gets none of it.
    const moving = GIZA_ENVIRONMENT.riverCraft
      .filter((craft) => craft.kind !== 'reed-skiff')
      .reduce((total, craft) => total + craft.count, 0);
    const wakes = meshes.get('nile-boat-wake-ribbons');
    expect(wakes!.count).toBe(moving * 10);
    expect(wakes!.frustumCulled).toBe(false);
    expect((wakes!.material as MeshStandardMaterial).transparent).toBe(true);
    expect(meshes.get('nile-boat-crew-bodies')!.count).toBe(moving * 2);
    expect(meshes.get('nile-boat-crew-heads')!.count).toBe(moving * 2);
    expect(meshes.get('nile-boat-water-jars')!.count).toBe(moving);
    expect(meshes.get('nile-boat-rope-coils')!.count).toBe(moving);

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

  it('builds forked doum palms with exact batch counts and no unwritten instances', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);

    // Rebuild the expected stand from the same pure placement/archetype
    // functions and per-palm fork draws the renderer consumes.
    const spots: Array<{ archetype: ReturnType<typeof palmArchetypeAt>; forks: number }> = [];
    const pushSpot = (index: number, seed: string) => {
      const archetype = palmArchetypeAt(index);
      const rng = mulberry32(`${seed}:${index % 10_000}`);
      const forks =
        archetype.forks[0] + Math.round(rng() * (archetype.forks[1] - archetype.forks[0]));
      spots.push({ archetype, forks });
    };
    for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
      if (!palmStandAt(i)) continue;
      pushSpot(i, 'giza:palm-stand');
    }
    for (let g = 0; g < GIZA_ENVIRONMENT.memphisGrovePalms; g += 1) {
      if (!grovePalmAt(g)) continue;
      pushSpot(10_000 + g, 'giza:palm-grove');
    }
    // One trunk + one crown heart per arm; fan fronds per doum arm.
    const trunkTotal = spots.reduce((total, spot) => total + spot.forks, 0);
    const featherTotal = spots.reduce(
      (total, spot) =>
        total +
        (spot.archetype.fanFronds
          ? 0
          : spot.archetype.uprightFronds + spot.archetype.droopingFronds),
      0,
    );
    const fanTotal = spots.reduce(
      (total, spot) =>
        total +
        (spot.archetype.fanFronds
          ? spot.forks * (spot.archetype.uprightFronds + spot.archetype.droopingFronds)
          : 0),
      0,
    );
    expect(spots.some((spot) => spot.archetype.kind === 'palm-doum')).toBe(true);
    expect(fanTotal).toBeGreaterThan(0);

    const trunks = meshes.get('greenbelt-palm-trunks')!;
    const crowns = meshes.get('greenbelt-palm-hearts')!;
    const feathers = meshes.get('greenbelt-individual-palm-fronds')!;
    const fans = meshes.get('palm-fan-fronds')!;
    expect(trunks.count).toBe(trunkTotal);
    expect(crowns.count).toBe(trunkTotal);
    expect(feathers.count).toBe(featherTotal);
    expect(fans.count).toBe(fanTotal);
    expect(fans.frustumCulled).toBe(false);
    // Litter stays per crown — a forked palm drops fronds under each arm tip.
    expect(meshes.get('palm-understory-fallen-fronds')!.count).toBe(trunkTotal * 2);

    // Full-instance-count hygiene: every drawn instance carries a written
    // matrix (three.js initializes the buffer to identity).
    const identity = Array.from(new Matrix4().elements);
    for (const mesh of [trunks, crowns, feathers, fans]) {
      const allocated = mesh.instanceMatrix.array.length / 16;
      expect(mesh.count).toBeLessThanOrEqual(allocated);
      for (let i = 0; i < mesh.count; i += 1) {
        expect(Array.from(mesh.instanceMatrix.array.slice(i * 16, i * 16 + 16))).not.toEqual(
          identity,
        );
      }
    }
    environment.dispose();
  });

  it('rewrites dust and wing matrices when t advances, and repeats them identically', () => {
    const environment = new GizaEnvironment(GIZA_CONSTRUCTION, createMaterialLibrary(fixtureWonder));
    const meshes = instancedByName(environment);
    const puffs = meshes.get('giza-wind-dust-puffs')!;
    const wings = meshes.get('nile-egret-wings')!;
    const wakes = meshes.get('nile-boat-wake-ribbons')!;
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
    const wakeBefore = readRow(wakes, 3);
    environment.update(t, light, sunDirection, sky);
    const dustMid = readRow(puffs, 3);
    const wingMid = readRow(wings, 5);
    const wakeMid = readRow(wakes, 3);
    expect(dustMid).not.toEqual(dustBefore);
    expect(wingMid).not.toEqual(wingBefore);
    // The wake replays the boat's own past positions: it must move with t.
    expect(wakeMid).not.toEqual(wakeBefore);
    environment.update(t, light, sunDirection, sky);
    expect(readRow(puffs, 3)).toEqual(dustMid);
    expect(readRow(wings, 5)).toEqual(wingMid);
    expect(readRow(wakes, 3)).toEqual(wakeMid);
    environment.dispose();
  });
});
