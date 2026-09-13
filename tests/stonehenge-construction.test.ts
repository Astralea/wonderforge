import { describe, expect, it } from 'vitest';
import {
  STONEHENGE_CONSTRUCTION,
  STONEHENGE_MAX_ACTIVE,
  createStonehengeConstructionPlan,
} from '../src/data/stonehengeConstruction';
import type { StonehengeStone } from '../src/data/stonehengeTypes';
import {
  ropeSagMeters,
  sampleParabolicRope,
} from '../src/engine/stonehengeContact';
import {
  activeStonehengeOperationsAt,
  STONEHENGE_SLED_BED_HEIGHT,
  stonehengeConstructionStateAt,
  stonehengeVerticalHalfExtent,
} from '../src/engine/stonehengeConstruction';
import { stonehengeTerrainHeightAt } from '../src/engine/stonehengeTerrain';

const finite = (values: readonly number[]) => values.every(Number.isFinite);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, index) => value - b[index]!));

describe('Stonehenge typed construction plan (Spec 10)', () => {
  it('expands deterministically with the complete intended stone inventory', () => {
    expect(createStonehengeConstructionPlan()).toEqual(createStonehengeConstructionPlan());
    expect(createStonehengeConstructionPlan()).toEqual(STONEHENGE_CONSTRUCTION);

    const count = (group: StonehengeStone['group'], role?: StonehengeStone['role']) =>
      STONEHENGE_CONSTRUCTION.stones.filter((stone) =>
        stone.group === group && (!role || stone.role === role)).length;
    expect(count('trilithon', 'upright')).toBe(10);
    expect(count('trilithon', 'lintel')).toBe(5);
    expect(count('outer-sarsen', 'upright')).toBe(30);
    expect(count('outer-sarsen', 'lintel')).toBe(30);
    expect(count('bluestone-circle')).toBe(40);
    expect(count('bluestone-horseshoe')).toBe(19);
    expect(count('heel-stone')).toBe(1);
  });

  it('keeps stable unique finite parts at final size', () => {
    const ids = new Set<string>();
    const transforms = new Set<string>();
    for (const stone of STONEHENGE_CONSTRUCTION.stones) {
      expect(ids.has(stone.id)).toBe(false);
      ids.add(stone.id);
      expect(stone.scale).toEqual([1, 1, 1]);
      expect(finite(stone.dimensions)).toBe(true);
      expect(finite(stone.finalPosition)).toBe(true);
      expect(finite(stone.finalRotation)).toBe(true);
      expect(stone.dimensions.every((value) => value > 0)).toBe(true);
      expect(stone.start).toBeGreaterThanOrEqual(0.025);
      expect(stone.start + stone.duration).toBeLessThanOrEqual(0.92);
      const key = `${stone.finalPosition.join(':')}:${stone.finalRotation.join(':')}`;
      expect(transforms.has(key)).toBe(false);
      transforms.add(key);
    }
  });

  it('builds lintels only after their declared upright pair is seated', () => {
    const byId = new Map(STONEHENGE_CONSTRUCTION.stones.map((stone) => [stone.id, stone]));
    for (const lintel of STONEHENGE_CONSTRUCTION.stones.filter((stone) => stone.role === 'lintel')) {
      expect(lintel.supportIds).toHaveLength(2);
      for (const supportId of lintel.supportIds) {
        const support = byId.get(supportId);
        expect(support?.role).toBe('upright');
        expect(lintel.start).toBeGreaterThanOrEqual((support?.start ?? 1) + (support?.duration ?? 1));
      }
    }
  });

  it('keeps both phase graphs continuous without scaling or early destination appearance', () => {
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter((_, index) => index % 9 === 0)) {
      const route = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === stone.routeId)!;
      const before = stonehengeConstructionStateAt(stone, route, stone.start - 0.001);
      expect(before.visible).toBe(false);
      expect(distance(before.position, stone.finalPosition)).toBeGreaterThan(2);

      for (let boundary = 1; boundary < 8; boundary += 1) {
        const at = stone.start + stone.duration * (boundary / 8);
        const left = stonehengeConstructionStateAt(stone, route, at - 1e-8);
        const right = stonehengeConstructionStateAt(stone, route, at + 1e-8);
        expect(distance(left.position, right.position)).toBeLessThan(0.002);
        expect(distance(left.rotation, right.rotation)).toBeLessThan(0.002);
        expect(left.scale).toEqual([1, 1, 1]);
        expect(right.scale).toEqual([1, 1, 1]);
      }

      const seated = stonehengeConstructionStateAt(stone, route, 1);
      expect(seated.position).toEqual(stone.finalPosition);
      expect(seated.rotation).toEqual(stone.finalRotation);
      expect(seated.scale).toEqual([1, 1, 1]);
      expect(seated.support).toBe(stone.role === 'lintel' ? 'stone-joints' : 'packed-chalk');
    }
  });

  it('matches transformed stone bottoms to local turf or visible timber support', () => {
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter((_, index) => index % 13 === 0)) {
      const route = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === stone.routeId)!;
      for (const phase of [0.2, 0.75, 2.2, 2.65, 3.2]) {
        const state = stonehengeConstructionStateAt(
          stone,
          route,
          stone.start + stone.duration * phase / 8,
        );
        const bottom = state.position[1] - stonehengeVerticalHalfExtent(stone, state.rotation);
        const turf = stonehengeTerrainHeightAt(state.position[0], state.position[2]);
        const expectedLift = state.sledLift;
        expect(
          Math.abs(bottom - turf - expectedLift),
          `${stone.id} ${state.phase} bottom/support residual`,
        ).toBeLessThanOrEqual(0.03);
        if (state.phase === 'hauled') {
          expect(state.sledLift).toBeCloseTo(STONEHENGE_SLED_BED_HEIGHT, 6);
          expect(state.mechanism).toBe('sled');
        }
      }
    }
  });

  it('approaches each pit on surface-matched skids instead of skating a chord through the bank', () => {
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter((item) => item.role === 'upright')) {
      const route = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === stone.routeId)!;
      const atPhase = (phase: number) =>
        stonehengeConstructionStateAt(stone, route, stone.start + stone.duration * phase / 8);
      const skidding = atPhase(3.2);
      const docking = atPhase(3.92);
      expect(skidding.mechanism).toBe('skids');
      const skiddingBottom = skidding.position[1] - stonehengeVerticalHalfExtent(stone, skidding.rotation);
      const skiddingTurf = stonehengeTerrainHeightAt(skidding.position[0], skidding.position[2]);
      expect(Math.abs(skiddingBottom - skiddingTurf - skidding.sledLift)).toBeLessThanOrEqual(0.03);
      const earlySpan = Math.hypot(
        skidding.position[0] - stone.finalPosition[0],
        skidding.position[2] - stone.finalPosition[2],
      );
      const lateSpan = Math.hypot(
        docking.position[0] - stone.finalPosition[0],
        docking.position[2] - stone.finalPosition[2],
      );
      expect(lateSpan).toBeLessThan(earlySpan);
      expect(lateSpan).toBeLessThan(stone.dimensions[1] * 0.5 + 0.2);
      expect(docking.position[1]).toBeLessThan(skidding.position[1] + 1e-7);
    }
  });

  it('lowers upright heels into prepared pits and couples every raise to ropes and an A-frame', () => {
    for (const stone of STONEHENGE_CONSTRUCTION.stones.filter((item) => item.role === 'upright')) {
      const route = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === stone.routeId)!;
      const samples = [4.05, 4.8, 5.2, 5.95].map((phase) =>
        stonehengeConstructionStateAt(stone, route, stone.start + stone.duration * phase / 8));
      const heels = samples.map((state) => state.heelPosition![1]);
      for (let index = 1; index < heels.length; index += 1) {
        expect(heels[index]!).toBeLessThanOrEqual(heels[index - 1]! + 1e-7);
      }
      expect(Math.min(...heels)).toBeGreaterThanOrEqual(stone.finalPosition[1] - stone.dimensions[1] / 2 - 1e-7);
      const half = stone.dimensions[1] * 0.5;
      for (const state of samples) {
        const heel = state.heelPosition!;
        const span = Math.hypot(
          state.position[0] - heel[0],
          state.position[1] - heel[1],
          state.position[2] - heel[2],
        );
        expect(span).toBeGreaterThan(half - 0.04);
        expect(span).toBeLessThan(half + 0.04);
        expect(state.ropeTension).toBeGreaterThan(0.4);
        expect(state.mechanism).toBe('a-frame');
        expect(state.operationId).toBe(`stonehenge:${stone.id}`);
      }
    }
  });

  it('keeps lifted lintels supported by visible cribbing until alignment', () => {
    for (const lintel of STONEHENGE_CONSTRUCTION.stones.filter((stone) => stone.role === 'lintel')) {
      const route = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === lintel.routeId)!;
      for (const phase of [4.2, 5.0, 5.8]) {
        const state = stonehengeConstructionStateAt(
          lintel,
          route,
          lintel.start + lintel.duration * phase / 8,
        );
        expect(state.mechanism).toBe('timber-crib');
        expect(state.cribHeight).toBeGreaterThan(0);
        const soffit = state.position[1] - lintel.dimensions[1] / 2;
        expect(soffit).toBeGreaterThanOrEqual(state.cribHeight - 0.03);
        expect(soffit - state.cribHeight).toBeLessThan(0.04);
        expect(Math.hypot(
          state.position[0] - lintel.finalPosition[0],
          state.position[2] - lintel.finalPosition[2],
        )).toBeLessThan(1.6);
      }
    }
  });

  it('keeps lintel guides under the soffit through the final settle, then seats on both joints', () => {
    const byId = new Map(STONEHENGE_CONSTRUCTION.stones.map((stone) => [stone.id, stone]));
    for (const lintel of STONEHENGE_CONSTRUCTION.stones.filter((stone) => stone.role === 'lintel')) {
      const route = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === lintel.routeId)!;
      for (const phase of [6.25, 6.75, 7.25, 7.75]) {
        const state = stonehengeConstructionStateAt(
          lintel,
          route,
          lintel.start + lintel.duration * phase / 8,
        );
        const soffit = state.position[1] - lintel.dimensions[1] * 0.5;
        expect(state.support).toBe('guide-rails');
        expect(state.mechanism).toBe('guide-rails');
        expect(Math.abs(soffit - state.cribHeight)).toBeLessThanOrEqual(0.03);
      }
      const seated = stonehengeConstructionStateAt(lintel, route, lintel.start + lintel.duration);
      const soffit = seated.position[1] - lintel.dimensions[1] * 0.5;
      expect(seated.support).toBe('stone-joints');
      for (const supportId of lintel.supportIds) {
        const support = byId.get(supportId)!;
        const top = support.finalPosition[1] + support.dimensions[1] * 0.5;
        expect(Math.abs(soffit - top), `${lintel.id} on ${supportId}`).toBeLessThanOrEqual(0.03);
      }
    }
  });

  it('sags ropes with tension and keeps the midpoint below the chord', () => {
    const from: [number, number, number] = [0, 4, 0];
    const to: [number, number, number] = [8, 4, 0];
    const taut = ropeSagMeters(1, 8);
    const slack = ropeSagMeters(0.4, 8);
    expect(taut).toBeGreaterThan(0);
    expect(taut).toBeLessThan(slack);
    expect(ropeSagMeters(0.9, 8)).toBeLessThan(ropeSagMeters(0.7, 8));
    const mid = sampleParabolicRope(from, to, slack, 8)[4]!;
    expect(mid[1]).toBeLessThan(4 - slack * 0.95);
    expect(sampleParabolicRope(from, to, slack, 8)).toEqual(
      sampleParabolicRope(from, to, slack, 8),
    );
  });

  it('packs chalk around moving contacts only', () => {
    const upright = STONEHENGE_CONSTRUCTION.stones.find((stone) => stone.role === 'upright')!;
    const lintel = STONEHENGE_CONSTRUCTION.stones.find((stone) => stone.role === 'lintel')!;
    const uprightRoute = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === upright.routeId)!;
    const lintelRoute = STONEHENGE_CONSTRUCTION.routes.find((item) => item.id === lintel.routeId)!;
    const atPhase = (stone: typeof upright, route: typeof uprightRoute, phase: number) =>
      stonehengeConstructionStateAt(stone, route, stone.start + stone.duration * phase / 8);

    const dressed = atPhase(upright, uprightRoute, 1.4);
    expect(dressed.contactDust).toBe(false);
    expect(dressed.contactKind).toBe('none');
    expect(dressed.packingFill).toBe(0);

    const hauled = atPhase(upright, uprightRoute, 2.5);
    expect(hauled.contactKind).toBe('runners');
    expect(hauled.contactDust).toBe(true);
    expect(hauled.ropeTension).toBeGreaterThan(0.5);

    const packedEarly = atPhase(upright, uprightRoute, 6.2);
    const packedLate = atPhase(upright, uprightRoute, 6.85);
    expect(packedEarly.contactKind).toBe('heel');
    expect(packedEarly.packingFill).toBeGreaterThan(0.1);
    expect(packedLate.packingFill).toBeGreaterThan(packedEarly.packingFill);
    expect(packedLate.contactDustAmount).toBeLessThan(packedEarly.contactDustAmount);

    const cribbed = atPhase(lintel, lintelRoute, 4.4);
    expect(cribbed.contactKind).toBe('crib');
    expect(cribbed.contactDust).toBe(true);
    expect(atPhase(lintel, lintelRoute, 2.5).ropeTension)
      .toBeLessThan(atPhase(upright, uprightRoute, 5.2).ropeTension);
  });

  it('respects the finite active-operation cap throughout the movie', () => {
    for (let frame = 0; frame <= 1_000; frame += 1) {
      const active = activeStonehengeOperationsAt(STONEHENGE_CONSTRUCTION, frame / 1_000);
      expect(active.length).toBeLessThanOrEqual(STONEHENGE_MAX_ACTIVE);
      expect(new Set(active.map((operation) => operation.state.operationId)).size).toBe(active.length);
    }
  });
});
