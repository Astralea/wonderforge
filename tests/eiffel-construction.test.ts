import { describe, expect, it } from 'vitest';
import {
  EIFFEL_BASE,
  EIFFEL_CONSTRUCTION,
  EIFFEL_CREEPER_CABIN,
  EIFFEL_CREEPER_COUNTER,
  EIFFEL_CREEPER_JIB_RADIUS,
  EIFFEL_CREEPER_MAST_RADIUS,
  EIFFEL_HEIGHT,
  EIFFEL_MAX_ACTIVE,
  EIFFEL_PLATFORM_1,
  EIFFEL_PLATFORM_2,
  EIFFEL_PLATFORM_3,
  EIFFEL_WAGON_BED,
  createEiffelConstructionPlan,
  eiffelLegCenter,
  eiffelOffsetAt,
} from '../src/data/eiffelConstruction';
import {
  activeEiffelOperationsAt,
  eiffelCraneRigAt,
  eiffelPartStateAt,
  eiffelStationCranesAt,
  eiffelVerticalHalfExtent,
  eiffelWorkingFloorYAt,
  seatedEiffelCountAt,
} from '../src/engine/eiffelConstruction';
import { eiffelLabourAlbedoAt, eiffelLabourAt } from '../src/engine/eiffelCrew';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';

const finite = (values: readonly number[]) => values.every(Number.isFinite);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, index) => value - b[index]!));

describe('Eiffel Tower typed construction plan (Spec 14)', () => {
  it('expands deterministically as a 312 m four-leg lattice', () => {
    expect(createEiffelConstructionPlan()).toEqual(createEiffelConstructionPlan());
    expect(createEiffelConstructionPlan()).toEqual(EIFFEL_CONSTRUCTION);
    expect(EIFFEL_CONSTRUCTION.height).toBe(EIFFEL_HEIGHT);
    expect(EIFFEL_CONSTRUCTION.base).toBe(EIFFEL_BASE);
    expect(EIFFEL_BASE).toBe(197);
    expect(Math.abs(eiffelLegCenter(1, 1, 0)[0])).toBeGreaterThan(85);
    expect(Math.abs(eiffelLegCenter(1, 1, 0)[0])).toBeLessThan(95);
    expect(EIFFEL_CONSTRUCTION.platform1).toBe(EIFFEL_PLATFORM_1);
    expect(EIFFEL_CONSTRUCTION.platform2).toBe(EIFFEL_PLATFORM_2);
    expect(EIFFEL_CONSTRUCTION.platform3).toBe(EIFFEL_PLATFORM_3);
    expect(EIFFEL_CONSTRUCTION.parts.filter((part) => part.group === 'foundation')).toHaveLength(12);
    expect(EIFFEL_CONSTRUCTION.parts.filter((part) => part.group === 'arch').length).toBeGreaterThanOrEqual(96);
    expect(EIFFEL_CONSTRUCTION.parts.filter((part) => part.kind === 'chord').length).toBeGreaterThan(240);
    const shaftStorey = EIFFEL_CONSTRUCTION.parts.filter(
      (part) => part.kind === 'chord' && part.group === 'shaft' && part.storey === 18 && !part.id.includes('mullion'),
    );
    expect(shaftStorey).toHaveLength(4);
    const shaftMidX = shaftStorey.reduce((sum, part) => sum + part.finalPosition[0], 0) / 4;
    const shaftMidZ = shaftStorey.reduce((sum, part) => sum + part.finalPosition[2], 0) / 4;
    expect(Math.hypot(shaftMidX, shaftMidZ)).toBeLessThan(1);
  });

  it('keeps unique finite parts at final size', () => {
    const ids = new Set<string>();
    const transforms = new Set<string>();
    for (const part of EIFFEL_CONSTRUCTION.parts) {
      expect(ids.has(part.id)).toBe(false);
      ids.add(part.id);
      expect(part.scale).toEqual([1, 1, 1]);
      expect(finite(part.dimensions)).toBe(true);
      expect(finite(part.finalPosition)).toBe(true);
      expect(part.dimensions.every((value) => value > 0)).toBe(true);
      const key = `${part.finalPosition.join(':')}:${part.finalRotation.join(':')}`;
      expect(transforms.has(key)).toBe(false);
      transforms.add(key);
    }
  });

  it('never first-appears at the seat and never moves after seating', () => {
    const route = EIFFEL_CONSTRUCTION.routes[0]!;
    for (const part of EIFFEL_CONSTRUCTION.parts.filter((_, index) => index % 29 === 0)) {
      const before = eiffelPartStateAt(part, route, part.start - 0.001);
      expect(before.visible).toBe(false);
      const mid = eiffelPartStateAt(part, route, part.start + part.duration * 0.5);
      expect(mid.visible).toBe(true);
      expect(mid.scale).toEqual([1, 1, 1]);
      expect(Math.hypot(
        mid.position[0] - part.finalPosition[0],
        mid.position[2] - part.finalPosition[2],
      )).toBeGreaterThan(4);
      const seated = eiffelPartStateAt(part, route, part.start + part.duration);
      expect(seated.phase).toBe('seated');
      expect(seated.position).toEqual(part.finalPosition);
      expect(seated.rotation).toEqual(part.finalRotation);
      expect(eiffelPartStateAt(part, route, 1).position).toEqual(part.finalPosition);
    }
    expect(seatedEiffelCountAt(EIFFEL_CONSTRUCTION, 1)).toBe(EIFFEL_CONSTRUCTION.parts.length);
  });

  it('keeps phase boundaries continuous without scaling', () => {
    const route = EIFFEL_CONSTRUCTION.routes[0]!;
    for (const part of EIFFEL_CONSTRUCTION.parts.filter((_, index) => index % 37 === 0)) {
      for (const boundary of [0.14, 0.48, 0.58, 0.9]) {
        const at = part.start + part.duration * boundary;
        const left = eiffelPartStateAt(part, route, at - 1e-8);
        const right = eiffelPartStateAt(part, route, at + 1e-8);
        expect(distance(left.position, right.position)).toBeLessThan(0.08);
        expect(left.scale).toEqual([1, 1, 1]);
        expect(right.scale).toEqual([1, 1, 1]);
      }
    }
  });

  it('matches hauled bottoms to the Champ sampler plus engine-owned wagon height', () => {
    const route = EIFFEL_CONSTRUCTION.routes[0]!;
    for (const part of EIFFEL_CONSTRUCTION.parts.filter((_, index) => index % 31 === 0)) {
      const hauled = eiffelPartStateAt(part, route, part.start + part.duration * 0.3);
      expect(hauled.phase).toBe('hauled');
      const bottom = hauled.position[1] - eiffelVerticalHalfExtent(part.dimensions);
      const floor = eiffelTerrainHeightAt(hauled.position[0], hauled.position[2]);
      expect(Math.abs(bottom - floor - hauled.wagonLift)).toBeLessThanOrEqual(0.03);
      expect(hauled.wagonLift).toBeGreaterThan(EIFFEL_WAGON_BED * 0.5);
    }
  });

  it('caps concurrent operations and seats piers before that leg climbs', () => {
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      peak = Math.max(peak, activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, t).length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(EIFFEL_MAX_ACTIVE);
    expect(seatedEiffelCountAt(EIFFEL_CONSTRUCTION, 0.12)).toBeGreaterThan(200);
    const pier = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'pier-ne')!;
    const firstCorner = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-0-0')!;
    const opposite = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-0-3')!;
    expect(
      Math.hypot(
        firstCorner.finalPosition[0] - opposite.finalPosition[0],
        firstCorner.finalPosition[2] - opposite.finalPosition[2],
      ),
    ).toBeGreaterThan(20);
    expect(firstCorner.start).toBeGreaterThan(pier.start + pier.duration);
    const plinth = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'pier-ne-plinth')!;
    expect(plinth.dimensions[0]).toBeGreaterThan(pier.dimensions[0]);
    expect(pier.dimensions[0]).toBeGreaterThan(13);
    expect(pier.dimensions[0]).toBeLessThan(16);
    expect(pier.dimensions[1]).toBeLessThan(4);
    expect(plinth.dimensions[0]).toBeGreaterThan(16);
    expect(plinth.dimensions[0]).toBeLessThan(18);
    expect(plinth.dimensions[1]).toBeLessThan(4);
    expect(EIFFEL_CONSTRUCTION.parts.filter((part) => part.group === 'foundation')).toHaveLength(12);
    const lastLower = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-4-0')!;
    const girder = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p1-2-0')!;
    expect(girder.start).toBeGreaterThan(lastLower.start + lastLower.duration);
    expect(lastLower.start).toBeLessThan(0.11);
    expect(lastLower.start).toBeGreaterThan(0.07);
    expect(lastLower.start + lastLower.duration).toBeLessThan(0.12);
    expect(lastLower.dimensions[1]).toBeGreaterThan(8);
    expect(lastLower.dimensions[1]).toBeLessThan(11);
    expect(lastLower.dimensions[0]).toBeGreaterThan(1.5);
    expect(lastLower.dimensions[0]).toBeLessThan(1.65);
    const face = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-leg-ne-0')!;
    const [cx] = eiffelLegCenter(1, 1, face.finalPosition[1]);
    expect(Math.abs(face.finalPosition[0] - cx)).toBeGreaterThan(3);
    expect(Math.min(...face.dimensions)).toBeGreaterThan(1.1);
    expect(Math.min(...face.dimensions)).toBeLessThan(1.4);
    expect(face.material).toBe('dark-iron');
    expect(Math.max(...face.dimensions)).toBeLessThan(lastLower.dimensions[1] * 1.25);
    const diag = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dx-pa-leg-ne-0')!;
    expect(Math.abs(diag.finalRotation[0])).toBeGreaterThan(0.35);
    expect(Math.min(...diag.dimensions)).toBeGreaterThan(1.05);
    expect(Math.min(...diag.dimensions)).toBeLessThan(1.3);
    expect(diag.material).toBe('dark-iron');
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p2-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p2-leg-ne-8')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-b-leg-ne-0')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-c-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-join-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-join-leg-ne-8')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-n-leg-ne-0')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-n-c-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-n-join-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-b-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-b-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-0-mullion-hz-n')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-se-0-mullion-hz-n')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-0-mullion-hx-n')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-leg-se-0')).toBeUndefined();
    const seineX = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-na-leg-se-0')!;
    expect(Math.max(...seineX.dimensions)).toBeGreaterThan(8);
    expect(Math.min(...seineX.dimensions)).toBeGreaterThan(1.2);
    expect(Math.min(...seineX.dimensions)).toBeLessThan(1.32);
    expect(seineX.material).toBe('dark-iron');
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-nb-leg-se-0')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-na-leg-se-1')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-nb-leg-se-1')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-na-leg-se-2')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-belt-leg-se-1')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-leg-nw-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-belt-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-leg-ne-8')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-0-0')).toBeDefined();
    const midX = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-leg-ne-8')!;
    expect(midX.material).toBe('dark-iron');
    expect(Math.min(...midX.dimensions)).toBeGreaterThan(1.1);
    expect(Math.min(...midX.dimensions)).toBeLessThan(1.35);
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-leg-se-8')).toBeUndefined();
    const midNorth = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-na-leg-se-8')!;
    expect(midNorth.material).toBe('dark-iron');
    expect(Math.min(...midNorth.dimensions)).toBeGreaterThan(1.1);
    expect(Math.min(...midNorth.dimensions)).toBeLessThan(1.35);
    const midPost = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-se-8-0')!;
    expect(midPost.dimensions[0]).toBeGreaterThan(1.32);
    expect(midPost.dimensions[0]).toBeLessThan(1.48);
    expect(EIFFEL_CONSTRUCTION.parts.some((part) => part.group === 'leg' && part.storey === 17)).toBe(true);
    expect(EIFFEL_CONSTRUCTION.parts.some((part) => part.group === 'leg' && part.storey === 18)).toBe(false);
    expect(EIFFEL_CONSTRUCTION.parts.some((part) => part.group === 'shaft' && part.storey === 35)).toBe(true);
    const shaftX = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-shaft-axis-18')!;
    expect(shaftX.material).toBe('dark-iron');
    expect(Math.min(...shaftX.dimensions)).toBeGreaterThan(0.7);
    const shaftHigh = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-shaft-axis-30')!;
    expect(shaftHigh.material).toBe('dark-iron');
    expect(Math.min(...shaftHigh.dimensions)).toBeGreaterThan(0.85);
    expect(Math.min(...shaftHigh.dimensions)).toBeLessThan(1.12);
    const lanternX = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dx-pa-lantern-axis-36');
    if (lanternX) {
      expect(lanternX.material).toBe('iron');
      expect(Math.min(...lanternX.dimensions)).toBeLessThan(0.7);
    }
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-p-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-kna-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-knb-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-kna-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-lo-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-hi-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-belt-leg-se-0')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-belt-leg-se-8')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-belt-shaft-axis-18')).toBeDefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hz-n-belt-lantern-axis-36')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dz-pa-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-n-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-dx-na-leg-se-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-leg-sw-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-n-leg-se-8')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-leg-se-0')).toBeDefined();
    const inner = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-n-leg-ne-0')!;
    const outer = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-hx-p-leg-ne-0')!;
    expect(Math.max(...inner.dimensions)).toBeGreaterThan(Math.max(...outer.dimensions) * 1.8);
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'lattice-hx-p-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.kind === 'lattice')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-inner-leg-ne-0-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'brace-radial-0-leg-ne-0')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p1-deck-n')).toBeDefined();
    const deck = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p1-deck-n')!;
    expect(deck.start).toBeGreaterThan(lastLower.start + lastLower.duration);
    expect(deck.start).toBeGreaterThan(0.33);
    expect(deck.start).toBeLessThan(0.4);
    expect(Math.min(deck.dimensions[1], deck.dimensions[2])).toBeLessThan(3.4);
    expect(Math.min(deck.dimensions[1], deck.dimensions[2])).toBeGreaterThan(2);
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p1-floor')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p2-floor')).toBeUndefined();
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p1-0-1')).toBeUndefined();
    const northOuter = EIFFEL_CONSTRUCTION.parts.filter((part) => part.id.startsWith('arch-2-o-'));
    const northInner = EIFFEL_CONSTRUCTION.parts.filter((part) => part.id.startsWith('arch-2-i-'));
    expect(northOuter).toHaveLength(12);
    expect(northInner).toHaveLength(12);
    const outerMid = northOuter[6]!;
    const innerMid = northInner[6]!;
    expect(Math.min(...northOuter.map((part) => part.finalPosition[1]))).toBeLessThan(32);
    expect(Math.max(...northOuter.map((part) => part.finalPosition[1]))).toBeGreaterThan(50);
    expect(northOuter[0]!.finalPosition[1]).toBeLessThan(outerMid.finalPosition[1] - 12);
    expect(northOuter.at(-1)!.finalPosition[1]).toBeLessThan(outerMid.finalPosition[1] - 12);
    expect(
      Math.max(...northOuter.map((part) => part.finalPosition[0]))
      - Math.min(...northOuter.map((part) => part.finalPosition[0])),
    ).toBeGreaterThan(55);
    expect(Math.abs(outerMid.finalPosition[2])).toBeGreaterThan(Math.abs(innerMid.finalPosition[2]) + 2);
    const northSpring = northOuter[0]!;
    expect(Math.abs(northSpring.finalPosition[2])).toBeGreaterThan(
      eiffelOffsetAt(northSpring.finalPosition[1]) + 8,
    );
    expect(Math.min(...outerMid.dimensions.slice(1))).toBeGreaterThan(1.5);
    expect(Math.min(...outerMid.dimensions.slice(1))).toBeLessThan(2.1);
    expect(northOuter[0]!.finalRotation[0]).toBeGreaterThan(0.35);
    expect(northOuter.at(-1)!.finalRotation[0]).toBeLessThan(-0.35);
    expect(EIFFEL_CONSTRUCTION.parts.filter((part) => part.id.startsWith('arch-2-w-'))).toHaveLength(12);
    expect(northOuter[0]!.start + northOuter[0]!.duration).toBeLessThan(0.32);
    expect(northOuter.at(-1)!.start + northOuter.at(-1)!.duration).toBeLessThan(0.32);
    expect(outerMid.start).toBeGreaterThan(0.32);
    expect(northInner[6]!.start).toBeGreaterThan(0.32);
    const eastFirst = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'arch-1-o-0')!;
    const eastLast = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'arch-1-o-11')!;
    const westLast = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'arch-3-o-11')!;
    expect(eastFirst.start).toBeGreaterThan(0.25);
    expect(eastFirst.start).toBeLessThan(0.28);
    expect(eastLast.start + eastLast.duration).toBeLessThan(0.32);
    expect(westLast.start + westLast.duration).toBeLessThan(0.32);
    expect(EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'arch-0-o-0')!.start).toBeGreaterThan(0.32);
    const lastShaft = EIFFEL_CONSTRUCTION.parts.find((part) => part.id.startsWith('chord-shaft-'))!;
    const lantern = EIFFEL_CONSTRUCTION.parts.find((part) => part.group === 'lantern')!;
    const shaftEnd = Math.max(
      ...EIFFEL_CONSTRUCTION.parts
        .filter((part) => part.group === 'shaft')
        .map((part) => part.start + part.duration),
    );
    expect(lantern.start).toBeGreaterThanOrEqual(shaftEnd - 1e-6);
    expect(lantern.start).toBeLessThan(0.72);
    const lanternEnd = Math.max(
      ...EIFFEL_CONSTRUCTION.parts
        .filter((part) => part.group === 'lantern')
        .map((part) => part.start + part.duration),
    );
    expect(lanternEnd).toBeLessThan(0.78);
    expect(
      EIFFEL_CONSTRUCTION.parts.filter(
        (part) => part.group === 'lantern' && part.kind === 'chord' && part.start + part.duration <= 0.78,
      ).length,
    ).toBeGreaterThan(8);
    expect(lastShaft).toBeDefined();
    const lastMid = Math.max(
      ...EIFFEL_CONSTRUCTION.parts
        .filter((part) => part.group === 'leg' && part.storey >= 8 && part.storey < 18)
        .map((part) => part.start + part.duration),
    );
    const firstShaft = Math.min(
      ...EIFFEL_CONSTRUCTION.parts.filter((part) => part.group === 'shaft').map((part) => part.start),
    );
    expect(firstShaft).toBeGreaterThanOrEqual(lastMid - 1e-6);
    expect(firstShaft).toBeGreaterThan(0.47);
    expect(firstShaft).toBeLessThan(0.51);
    const firstMid = Math.min(
      ...EIFFEL_CONSTRUCTION.parts
        .filter((part) => part.group === 'leg' && part.kind === 'chord' && part.storey >= 8 && part.storey < 18)
        .map((part) => part.start),
    );
    expect(firstMid).toBeGreaterThan(lastLower.start + lastLower.duration);
    expect(firstMid).toBeLessThan(0.16);
    expect(lastMid).toBeGreaterThan(0.40);
    expect(lastMid).toBeLessThan(0.50);
    const seatedMidAtJoin = EIFFEL_CONSTRUCTION.parts.filter(
      (part) =>
        part.group === 'leg' &&
        part.kind === 'chord' &&
        part.storey >= 8 &&
        part.storey < 18 &&
        part.start + part.duration <= 0.32,
    );
    expect(seatedMidAtJoin.filter((part) => part.leg === 'se' || part.leg === 'sw').length).toBeGreaterThan(60);
    expect(seatedMidAtJoin.filter((part) => part.leg === 'ne' || part.leg === 'nw').length).toBe(0);
    const firstFarMid = Math.min(
      ...EIFFEL_CONSTRUCTION.parts
        .filter(
          (part) =>
            part.group === 'leg' &&
            part.kind === 'chord' &&
            part.storey >= 8 &&
            part.storey < 18 &&
            (part.leg === 'ne' || part.leg === 'nw'),
        )
        .map((part) => part.start),
    );
    expect(firstFarMid).toBeGreaterThan(0.32);
    const p2Girder = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'girder-p2-2-0')!;
    expect(p2Girder.start).toBeGreaterThan(0.33);
    expect(p2Girder.start).toBeLessThan(0.40);
    expect(p2Girder.start).toBeLessThan(firstFarMid + 0.02);
    const p2Seated = Math.max(
      ...EIFFEL_CONSTRUCTION.parts
        .filter((part) => part.id.startsWith('girder-p2-'))
        .map((part) => part.start + part.duration),
    );
    expect(p2Seated).toBeLessThan(0.55);
    expect(shaftEnd).toBeLessThan(0.70);
    expect(
      EIFFEL_CONSTRUCTION.parts.filter(
        (part) => part.group === 'shaft' && part.kind === 'chord' && part.start + part.duration <= 0.58,
      ).length,
    ).toBeGreaterThan(28);
  });

  it('hoists vertically at staging then slews on a creeper-crane hook', () => {
    const route = EIFFEL_CONSTRUCTION.routes[0]!;
    const chord = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-1-0')!;
    const staged = eiffelPartStateAt(chord, route, chord.start + chord.duration * 0.53);
    expect(staged.phase).toBe('staged');
    const climbing = eiffelPartStateAt(chord, route, chord.start + chord.duration * 0.65);
    expect(climbing.phase).toBe('hoisted');
    expect(climbing.mechanism).toBe('crane');
    expect(climbing.position[0]).toBeCloseTo(staged.position[0], 1);
    expect(climbing.position[2]).toBeCloseTo(staged.position[2], 1);
    expect(climbing.position[1]).toBeGreaterThan(staged.position[1] + 1);
    const slewing = eiffelPartStateAt(chord, route, chord.start + chord.duration * 0.78);
    expect(slewing.phase).toBe('hoisted');
    expect(slewing.position[1] - chord.finalPosition[1]).toBeGreaterThan(1);
    const rig = eiffelCraneRigAt(chord, slewing)!;
    const boomReach = Math.hypot(rig.boomTip[0] - rig.mastTop[0], rig.boomTip[2] - rig.mastTop[2]);
    expect(boomReach).toBeGreaterThan(2);
    expect(boomReach).toBeLessThan(12);
    expect(rig.hook[0]).toBeCloseTo(slewing.position[0], 3);
    expect(rig.hook[2]).toBeCloseTo(slewing.position[2], 3);
    expect(rig.hook[1]).toBeGreaterThan(slewing.position[1]);
    expect(rig.base[1]).toBeCloseTo(eiffelTerrainHeightAt(rig.base[0], rig.base[2]), 2);
    const stations = eiffelStationCranesAt(EIFFEL_CONSTRUCTION, 0.12, activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.12));
    expect(stations.filter((station) => station.leg !== 'axis')).toHaveLength(4);
    expect(stations.length).toBeLessThanOrEqual(5);
    expect(new Set(stations.map((station) => station.leg)).size).toBe(stations.length);
    const joinStations = eiffelStationCranesAt(
      EIFFEL_CONSTRUCTION,
      0.32,
      activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.32),
    );
    expect(joinStations.filter((station) => station.leg !== 'axis')).toHaveLength(4);
    expect(new Set(joinStations.map((station) => station.leg)).size).toBe(joinStations.length);
    for (const station of joinStations.filter((entry) => entry.leg !== 'axis')) {
      const boom = Math.hypot(station.boomTip[0] - station.mastTop[0], station.boomTip[2] - station.mastTop[2]);
      expect(boom).toBeGreaterThan(2);
      expect(boom).toBeLessThan(12);
      const cabinSpan = Math.hypot(station.cabin[0] - station.mastTop[0], station.cabin[2] - station.mastTop[2]);
      const counterSpan = Math.hypot(station.counter[0] - station.mastTop[0], station.counter[2] - station.mastTop[2]);
      expect(cabinSpan).toBeGreaterThan(3);
      expect(cabinSpan).toBeLessThan(7);
      expect(counterSpan).toBeGreaterThan(cabinSpan);
      expect(counterSpan).toBeLessThan(12);
      expect(station.cabin[1]).toBeGreaterThan(station.mastTop[1]);
    }
    expect(EIFFEL_CREEPER_MAST_RADIUS).toBe(0.55);
    expect(EIFFEL_CREEPER_JIB_RADIUS).toBe(0.72);
    expect(EIFFEL_CREEPER_CABIN[0]).toBeGreaterThan(10);
    expect(EIFFEL_CREEPER_CABIN[0]).toBeLessThan(14);
    expect(EIFFEL_CREEPER_CABIN[1]).toBeGreaterThan(6.5);
    expect(EIFFEL_CREEPER_COUNTER[0]).toBeGreaterThan(7);
    expect(EIFFEL_CREEPER_COUNTER[0]).toBeLessThan(10);
  });

  it('binds unique labour jobs instead of a chorus ring', () => {
    const climbingPart = EIFFEL_CONSTRUCTION.parts.find((part) => part.id === 'chord-leg-ne-2-0')!;
    const climbingT = climbingPart.start + climbingPart.duration * 0.65;
    const climbing = eiffelLabourAt(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, climbingT), climbingT);
    const ids = new Set(climbing.crews.map((crew) => crew.id));
    expect(ids.size).toBe(climbing.crews.length);
    expect(climbing.crews.some((crew) => crew.role === 'riveter')).toBe(true);
    expect(climbing.crews.some((crew) => crew.role === 'hauler')).toBe(true);
    expect(climbing.crews.some((crew) => crew.role === 'climber')).toBe(true);
    const join = eiffelLabourAt(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.34), 0.34);
    expect(new Set(join.crews.map((crew) => crew.id)).size).toBe(join.crews.length);
    const northGang = join.crews.filter((crew) => crew.id.startsWith('north-gang-'));
    expect(northGang.length).toBeGreaterThanOrEqual(6);
    expect(northGang.length).toBeLessThan(8);
    const gaits = northGang.map((crew) => crew.gait);
    expect(Math.max(...gaits) - Math.min(...gaits)).toBeGreaterThan(0.15);
    const openingGang = eiffelLabourAt(
      activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.12),
      0.12,
    ).crews.filter((crew) => crew.id.startsWith('north-gang-'));
    expect(openingGang.length).toBeGreaterThan(0);
    expect(openingGang.length).toBeLessThan(8);
    for (const crew of openingGang) {
      expect(crew.position[1]).toBeGreaterThan(20);
      expect(crew.position[1]).toBeLessThan(EIFFEL_PLATFORM_1 + 6);
    }
    expect(
      eiffelLabourAt(activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.34), 0.34).crews.filter((crew) =>
        crew.id.startsWith('p1-gang-'),
      ).length,
    ).toBe(0);
    expect(eiffelLabourAlbedoAt(0.58)).toBe(1);
    expect(eiffelLabourAlbedoAt(0.78)).toBeLessThan(0.7);
    expect(eiffelLabourAlbedoAt(0.92)).toBeLessThan(eiffelLabourAlbedoAt(0.78));
    const riveter = climbing.crews.find((crew) => crew.id === `${climbingPart.id}-riveter`)!;
    expect(riveter.position[1]).toBeGreaterThan(8);
    expect(riveter.position[1]).toBeLessThan(climbingPart.finalPosition[1]);
    const buildFloor = eiffelWorkingFloorYAt(EIFFEL_CONSTRUCTION, 0.58, 'se', 400);
    expect(buildFloor).toBeGreaterThan(EIFFEL_PLATFORM_2 - 8);
    const buildRivets = eiffelLabourAt(
      activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.58),
      0.58,
    ).crews.filter((crew) => crew.role === 'riveter' && crew.position[1] > 40);
    expect(buildRivets.length).toBeGreaterThan(8);
    const buildNorth = eiffelLabourAt(
      activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.58),
      0.58,
    ).crews.filter((crew) => crew.id.startsWith('north-gang-'));
    expect(buildNorth.length).toBeGreaterThanOrEqual(14);
    const p1Gang = eiffelLabourAt(
      activeEiffelOperationsAt(EIFFEL_CONSTRUCTION, 0.58),
      0.58,
    ).crews.filter((crew) => crew.id.startsWith('p1-gang-'));
    expect(p1Gang.length).toBe(8);
    expect(p1Gang.every((crew) => Math.abs(crew.position[1] - EIFFEL_PLATFORM_1) < 1)).toBe(true);
    const seNorth = buildNorth.filter((crew) => crew.id.includes('-se-'));
    const xs = seNorth.map((crew) => crew.position[0]).sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 1; i < xs.length; i += 1) maxGap = Math.max(maxGap, xs[i]! - xs[i - 1]!);
    expect(maxGap).toBeGreaterThan(5);
    const yaws = seNorth.map((crew) => crew.yaw);
    expect(Math.max(...yaws) - Math.min(...yaws)).toBeGreaterThan(1.2);
  });
});
