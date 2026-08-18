import { describe, expect, it } from 'vitest';
import { createGizaConstructionPlan } from '../src/data/gizaConstruction';
import {
  haulCorridors,
  isClearOfSiteWorks,
  pushOutOfSiteWorks,
  rampBounds,
  siteKeepOuts,
} from '../src/engine/siteClearance';

const plan = createGizaConstructionPlan();
const keepOuts = siteKeepOuts(plan);
const corridors = haulCorridors(plan);

describe('site clearance', () => {
  it('bounds a yawed ramp exactly', () => {
    // A quarter-turn swaps the footprint's axes; a half-turn leaves them.
    const square = rampBounds({
      id: 'probe', monument: 'khufu', center: [0, 0], footprint: [30, 22], baseY: 0, yaw: 0,
    });
    expect(square.half).toEqual([15, 11]);

    const turned = rampBounds({
      id: 'probe', monument: 'khufu', center: [0, 0], footprint: [30, 22], baseY: 0, yaw: Math.PI / 2,
    });
    expect(turned.half[0]).toBeCloseTo(11, 6);
    expect(turned.half[1]).toBeCloseTo(15, 6);

    const flipped = rampBounds({
      id: 'probe', monument: 'khufu', center: [0, 0], footprint: [30, 22], baseY: 0, yaw: Math.PI,
    });
    expect(flipped.half[0]).toBeCloseTo(15, 6);
    expect(flipped.half[1]).toBeCloseTo(11, 6);
  });

  it('treats every ramp and monument as occupied ground', () => {
    expect(keepOuts).toHaveLength(3 + plan.ramps.length);
    for (const ramp of plan.ramps) {
      const bounds = rampBounds(ramp);
      expect(isClearOfSiteWorks(bounds.center[0], bounds.center[1], keepOuts)).toBe(false);
    }
    for (const monument of Object.values(plan.monuments)) {
      expect(
        isClearOfSiteWorks(monument.center[0], monument.center[1], keepOuts),
      ).toBe(false);
    }
  });

  it('leaves already-clear ground untouched', () => {
    // Far out on the western desert, well away from any site works.
    const [x, z] = pushOutOfSiteWorks(-140, 60, keepOuts, corridors, {
      margin: 2,
      corridorClearance: 4,
    });
    expect(x).toBe(-140);
    expect(z).toBe(60);
  });

  it('pushes a prop standing inside a ramp out of it', () => {
    const ramp = plan.ramps[0]!;
    const bounds = rampBounds(ramp);
    const [x, z] = pushOutOfSiteWorks(
      bounds.center[0] + 1,
      bounds.center[1] + 1,
      keepOuts,
      [],
      { margin: 1.5 },
    );
    expect(isClearOfSiteWorks(x, z, keepOuts, [], { margin: 1.4 })).toBe(true);
  });

  it('keeps haul lanes open', () => {
    const corridor = corridors[0]!;
    const midX = (corridor.from[0] + corridor.to[0]) / 2;
    const midZ = (corridor.from[1] + corridor.to[1]) / 2;
    const [x, z] = pushOutOfSiteWorks(midX, midZ, [], corridors, {
      corridorClearance: 4,
    });
    expect(Math.hypot(x - midX, z - midZ)).toBeGreaterThan(0);
    expect(isClearOfSiteWorks(x, z, [], corridors, { corridorClearance: 3.9 })).toBe(true);
  });

  it('gives every ramp a footprint that reaches its own monument', () => {
    // A working earthwork that does not touch the pyramid it serves would
    // leave its sled teams stepping into space at the crest.
    for (const ramp of plan.ramps) {
      const bounds = rampBounds(ramp);
      const monument = plan.monuments[ramp.monument];
      const gapX =
        Math.abs(bounds.center[0] - monument.center[0]) -
        (bounds.half[0] + monument.baseWidth / 2);
      const gapZ =
        Math.abs(bounds.center[1] - monument.center[1]) -
        (bounds.half[1] + monument.baseWidth / 2);
      expect(Math.max(gapX, gapZ)).toBeLessThanOrEqual(0);
    }
  });
});
