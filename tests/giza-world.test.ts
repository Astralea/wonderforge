import { describe, expect, it } from 'vitest';
import { createGizaConstructionPlan } from '../src/data/gizaConstruction';
import { createGizaEnvironmentPlan } from '../src/data/gizaEnvironment';

const plan = createGizaConstructionPlan();
const environment = createGizaEnvironmentPlan();

type MonumentPlan = (typeof plan.monuments)['khufu'];

/** 2D (ground-plan) sampling of a straight haul leg against a footprint. */
function segmentCrossesFootprint(
  from: readonly number[],
  to: readonly number[],
  monument: MonumentPlan,
  margin = 0.5,
): boolean {
  const half = monument.baseWidth / 2 + margin;
  const [centerX, centerZ] = monument.center;
  const samples = 128;
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = from[0]! + (to[0]! - from[0]!) * t;
    const z = from[2]! + (to[2]! - from[2]!) * t;
    if (Math.abs(x - centerX) < half && Math.abs(z - centerZ) < half) {
      return true;
    }
  }
  return false;
}

describe('Giza layered world', () => {
  it('declares the complete near-to-far environment', () => {
    expect(plan.layers.map((layer) => layer.id)).toEqual([
      'foreground-quarry',
      'construction-site',
      'greenbelt-nile',
      'worker-settlement',
      'distant-city',
      'desert-cliffs',
      'atmosphere-sky',
    ]);
  });

  it('connects each logistics route from quarry to alignment deck', () => {
    expect(plan.routes.length).toBeGreaterThanOrEqual(6);
    for (const route of plan.routes) {
      const points = Object.values(route.waypoints);
      expect(points).toHaveLength(6);
      for (let index = 1; index < points.length; index += 1) {
        expect(Math.hypot(
          points[index]![0] - points[index - 1]![0],
          points[index]![1] - points[index - 1]![1],
          points[index]![2] - points[index - 1]![2],
        )).toBeGreaterThan(0.5);
      }
    }
  });

  it('ramps rise toward their monument (foot low and far, crest high and near)', () => {
    // Spec 08: the gradient never runs away from the pyramid — the terraced
    // earthwork's high end meets the working face, its foot stands on the
    // plateau. (The temple causeway is a gentle road, not a ramp.)
    const monumentByRoute: Record<string, keyof typeof plan.monuments> = {
      'khufu-south': 'khufu',
      'khufu-east': 'khufu',
      'khafre-south': 'khafre',
      'khafre-west': 'khafre',
      'menkaure-south': 'menkaure',
    };
    for (const [routeId, monumentId] of Object.entries(monumentByRoute)) {
      const route = plan.routes.find((item) => item.id === routeId)!;
      const monument = plan.monuments[monumentId];
      const { rampFoot, rampCrest } = route.waypoints;
      const footDistance = Math.hypot(
        rampFoot[0] - monument.center[0],
        rampFoot[2] - monument.center[1],
      );
      const crestDistance = Math.hypot(
        rampCrest[0] - monument.center[0],
        rampCrest[2] - monument.center[1],
      );
      expect(footDistance).toBeGreaterThan(crestDistance);
      expect(rampFoot[1]).toBeLessThan(rampCrest[1]);
    }
  });

  it('keeps the three pyramids in their visual hierarchy', () => {
    const { khufu, khafre, menkaure } = plan.monuments;
    expect(khufu.baseWidth).toBeGreaterThan(khafre.baseWidth);
    expect(khafre.baseWidth).toBeGreaterThan(menkaure.baseWidth);
    expect(khufu.height).toBeGreaterThan(khafre.height);
    expect(khafre.height + khafre.groundY).toBeGreaterThan(menkaure.height + menkaure.groundY);
  });

  it('keeps clear air between pyramid footprints (Spec 08)', () => {
    const { khufu, khafre, menkaure } = plan.monuments;
    // Euclidean gap between the axis-aligned footprints: positive axis gaps
    // mean the bases never touch; the diagonal gap is the true clearance.
    const clearance = (a: typeof khufu, b: typeof khafre) => {
      const gapX = Math.max(0, Math.abs(a.center[0] - b.center[0]) - (a.baseWidth + b.baseWidth) / 2);
      const gapZ = Math.max(0, Math.abs(a.center[1] - b.center[1]) - (a.baseWidth + b.baseWidth) / 2);
      return Math.hypot(gapX, gapZ);
    };
    expect(clearance(khufu, khafre)).toBeGreaterThan(8);
    expect(clearance(khafre, menkaure)).toBeGreaterThan(4);
    expect(clearance(khufu, menkaure)).toBeGreaterThan(20);
  });

  it('keeps queued haul legs outside every pyramid footprint (Spec 02 inv. 7)', () => {
    // A sled chord that clips a footprint reads as stones melting through
    // masonry. Terraced earthworks are fair ground; pyramid bases are not.
    for (const route of plan.routes) {
      const { quarry, dressing, roadQueue, rampFoot } = route.waypoints;
      const legs: Array<[typeof quarry, typeof quarry]> = [
        [quarry, dressing],
        [dressing, roadQueue],
        [roadQueue, rampFoot],
      ];
      for (const [from, to] of legs) {
        for (const monument of Object.values(plan.monuments)) {
          expect(
            segmentCrossesFootprint(from, to, monument),
            `${route.id} leg enters ${monument.id}`,
          ).toBe(false);
        }
      }
    }
  });

  it('never raises a block through another monument (Spec 02 inv. 7)', () => {
    // Menkaure once hauled over the temple causeway near Khufu, lerping its
    // stones straight through the finished Khafre pyramid at the finale.
    for (const block of plan.blocks) {
      const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;
      const crest = route.rampCrestFor(block);
      for (const monument of Object.values(plan.monuments)) {
        if (monument.id === block.monument) continue;
        expect(
          segmentCrossesFootprint(route.waypoints.rampFoot, crest, monument),
          `${block.id} raised leg enters ${monument.id}`,
        ).toBe(false);
      }
    }
  });

  it('raises each ramp crest with the target block course', () => {
    for (const block of plan.blocks.filter((_, index) => index % 251 === 0)) {
      const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;
      const crestY = route.rampCrestFor(block)[1];
      expect(crestY).toBeCloseTo(block.finalPosition[1] - block.dimensions[1] * 0.5, 5);
      const footSurface = route.waypoints.rampFoot[1] - block.dimensions[1] * 0.5;
      if (block.course > 0) expect(crestY).toBeGreaterThan(footSurface);
      else expect(Math.abs(crestY - footSurface)).toBeLessThan(0.4);
    }
  });

  it('uses a continuous camera-independent world-space horizon', () => {
    expect(environment.horizon.motion).toBe('static-world-space');
    expect(environment.horizon.radialSegments).toBeGreaterThanOrEqual(96);
    expect(environment.horizon.samples).toHaveLength(environment.horizon.radialSegments);
    expect(environment.horizon.rings.length).toBeGreaterThanOrEqual(7);
    expect(environment.horizon.rings[0]!.radius).toBeLessThan(100);
    expect(environment.horizon.rings[0]!.baseY).toBeLessThan(-2);
    expect(environment.horizon.rings.at(-1)!.radius).toBeGreaterThanOrEqual(1_500);
    for (let index = 1; index < environment.horizon.rings.length; index += 1) {
      expect(environment.horizon.rings[index]!.radius)
        .toBeGreaterThan(environment.horizon.rings[index - 1]!.radius);
    }

    for (const sample of environment.horizon.samples) {
      expect(Number.isFinite(sample.ridgeHeight)).toBe(true);
      expect(sample.ridgeHeight).toBeGreaterThan(1);
      expect(sample.ridgeHeight).toBeLessThan(32);
    }
  });

  it('authors background ecology and settlement as distinct physical layers', () => {
    expect(environment.fields).toBeGreaterThanOrEqual(24);
    expect(environment.irrigationChannels).toBeGreaterThanOrEqual(5);
    expect(environment.palms).toBeGreaterThanOrEqual(48);
    expect(environment.reedClusters).toBeGreaterThanOrEqual(80);
    expect(environment.riverBoats).toBeGreaterThanOrEqual(5);
    expect(environment.cityBuildings).toBeGreaterThanOrEqual(140);
    expect(environment.cityRoofs).toBeGreaterThanOrEqual(80);
    expect(environment.mastabas).toBeGreaterThanOrEqual(48);
  });

  it('keeps atmospheric cloud banks outside the widest camera orbit', () => {
    expect(environment.cloudBanks.groups).toBeGreaterThanOrEqual(3);
    expect(environment.cloudBanks.groups).toBeLessThanOrEqual(5);
    expect(environment.cloudBanks.membersPerGroup).toBeGreaterThanOrEqual(4);
    expect(environment.cloudBanks.minRadius).toBeGreaterThan(300);
    expect(environment.cloudBanks.minElevation).toBeGreaterThan(120);
  });
});
