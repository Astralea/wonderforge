import { describe, expect, it } from 'vitest';
import { createGizaConstructionPlan } from '../src/data/gizaConstruction';
import {
  CONSTRUCTION_PHASES,
  activeConstructionStatesAt,
  constructionStateAt,
} from '../src/engine/construction';

const plan = createGizaConstructionPlan();

describe('Giza physical masonry plan', () => {
  it('is deterministic and contains thousands of individual stones', () => {
    expect(createGizaConstructionPlan()).toEqual(createGizaConstructionPlan());
    expect(plan.blocks.length).toBeGreaterThanOrEqual(4_000);
    expect(plan.blocks.length).toBeLessThanOrEqual(8_000);
  });

  it('uses human-scale, full-size blocks with unique seats', () => {
    const ids = new Set<string>();
    const seats = new Set<string>();

    for (const block of plan.blocks) {
      expect(block.scale).toEqual([1, 1, 1]);
      expect(block.dimensions[0]).toBeGreaterThanOrEqual(0.75);
      expect(block.dimensions[0]).toBeLessThanOrEqual(2.4);
      expect(block.dimensions[1]).toBeGreaterThanOrEqual(0.4);
      expect(block.dimensions[1]).toBeLessThanOrEqual(0.75);
      expect(block.dimensions[2]).toBeGreaterThanOrEqual(0.7);
      expect(block.dimensions[2]).toBeLessThanOrEqual(2.4);
      expect(block.finalPosition.every(Number.isFinite)).toBe(true);
      ids.add(block.id);
      seats.add(block.finalPosition.map((v) => v.toFixed(4)).join(':'));
    }

    expect(ids.size).toBe(plan.blocks.length);
    expect(seats.size).toBe(plan.blocks.length);
  });

  it('never encodes a whole pyramid course as one block', () => {
    const widest = Math.max(...plan.blocks.map((block) => block.dimensions[0]));
    const deepest = Math.max(...plan.blocks.map((block) => block.dimensions[2]));
    expect(widest).toBeLessThan(plan.monuments.khufu.baseWidth / 10);
    expect(deepest).toBeLessThan(plan.monuments.khufu.baseWidth / 10);
    expect(new Set(plan.blocks.map((block) => `${block.monument}:${block.course}`)).size)
      .toBeGreaterThan(100);
  });

  it('builds a deterministic human-scale interior core instead of a floating lid', () => {
    expect(plan.coreCells.length).toBeGreaterThanOrEqual(5_000);
    expect(plan.coreCells.length).toBeLessThanOrEqual(14_000);

    const ids = new Set<string>();
    for (const cell of plan.coreCells) {
      ids.add(cell.id);
      expect(cell.dimensions[0]).toBeGreaterThanOrEqual(0.8);
      expect(cell.dimensions[0]).toBeLessThanOrEqual(1.8);
      expect(cell.dimensions[1]).toBeGreaterThanOrEqual(0.4);
      expect(cell.dimensions[1]).toBeLessThanOrEqual(0.75);
      expect(cell.dimensions[2]).toBeGreaterThanOrEqual(0.8);
      expect(cell.dimensions[2]).toBeLessThanOrEqual(1.8);
      expect(cell.finalPosition.every(Number.isFinite)).toBe(true);
      expect(cell.readyAt).toBeGreaterThanOrEqual(0);
      expect(cell.readyAt).toBeLessThanOrEqual(1);
    }
    expect(ids.size).toBe(plan.coreCells.length);
  });

  it('supports every elevated core cell from an earlier-settled cell below', () => {
    const keyed = new Map<string, typeof plan.coreCells[number]>();
    for (const cell of plan.coreCells) {
      keyed.set([
        cell.monument,
        cell.course,
        cell.finalPosition[0].toFixed(4),
        cell.finalPosition[2].toFixed(4),
      ].join(':'), cell);
    }

    for (const cell of plan.coreCells) {
      if (cell.course === 0) continue;
      const support = keyed.get([
        cell.monument,
        cell.course - 1,
        cell.finalPosition[0].toFixed(4),
        cell.finalPosition[2].toFixed(4),
      ].join(':'));
      expect(support, `missing support below ${cell.id}`).toBeDefined();
      expect(support!.readyAt).toBeLessThanOrEqual(cell.readyAt);
      const supportTop = support!.finalPosition[1] + support!.dimensions[1] * 0.5;
      const cellBottom = cell.finalPosition[1] - cell.dimensions[1] * 0.5;
      expect(cellBottom - supportTop).toBeLessThan(0.22);
    }
  });
});

describe('raised-leg trajectory contract (Spec 08 ramp ascent)', () => {
  const rampByRoute = new Map(plan.ramps.map((ramp) => [ramp.id, ramp]));

  function insideRect(
    x: number,
    z: number,
    center: readonly [number, number],
    halfX: number,
    halfZ: number,
    margin: number,
  ): boolean {
    return (
      Math.abs(x - center[0]) <= halfX + margin &&
      Math.abs(z - center[1]) <= halfZ + margin
    );
  }

  it('tops out every climb at the route\'s own earthwork platform', () => {
    for (const block of plan.blocks) {
      const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;
      const crest = route.rampCrestFor(block);
      expect(crest[0], block.id).toBe(route.waypoints.rampCrest[0]);
      expect(crest[2], block.id).toBe(route.waypoints.rampCrest[2]);
      expect(crest[1]).toBeCloseTo(
        block.finalPosition[1] - block.dimensions[1] * 0.5,
        5,
      );
    }
  });

  it('keeps the climb over the earthwork or the working deck — never open air', () => {
    // The seat-anchored crest used to lerp far-face blocks off the earthwork
    // with ~7 units of air under a "ramp-supported" sled.
    for (let index = 0; index < plan.blocks.length; index += 97) {
      const block = plan.blocks[index]!;
      const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;
      const ramp = rampByRoute.get(block.routeId)!;
      expect(ramp, `route ${block.routeId} must have an earthwork`).toBeDefined();
      const monument = plan.monuments[block.monument as 'khufu' | 'khafre' | 'menkaure'];
      const cos = Math.abs(Math.cos(ramp.yaw));
      const sin = Math.abs(Math.sin(ramp.yaw));
      const rampHalfX = (cos * ramp.footprint[0] + sin * ramp.footprint[1]) * 0.5;
      const rampHalfZ = (sin * ramp.footprint[0] + cos * ramp.footprint[1]) * 0.5;
      // Sample the raised phase (index 5 of 8) interior.
      for (let step = 1; step <= 9; step += 1) {
        const local = (5 + step / 10) / 8;
        const state = constructionStateAt(block, route, block.start + block.duration * local);
        expect(state.phase).toBe('raised');
        const [x, , z] = state.position;
        const overRamp = insideRect(x, z, ramp.center, rampHalfX, rampHalfZ, 1.2);
        const overDeck = insideRect(
          x,
          z,
          monument.center,
          monument.baseWidth / 2,
          monument.baseWidth / 2,
          1.2,
        );
        expect(overRamp || overDeck, `${block.id} at climb ${step}/10`).toBe(true);
      }
    }
  });

  it('holds the sled to the terrace line for the whole climb', () => {
    // Compare the transformed block bottom and carrier bottom, never the
    // object origin, to the support surface.
    for (let index = 0; index < plan.blocks.length; index += 211) {
      const block = plan.blocks[index]!;
      const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;
      const foot = route.waypoints.rampFoot;
      const crest = route.rampCrestFor(block);
      const footSurface = foot[1] - block.dimensions[1] * 0.5;
      const climb = crest[1] - footSurface;
      for (let step = 1; step <= 9; step += 1) {
        const progress = step / 10;
        const local = (5 + progress) / 8;
        const state = constructionStateAt(block, route, block.start + block.duration * local);
        const stoneBottom = state.position[1] - block.dimensions[1] * 0.5;
        expect(Math.abs(stoneBottom - state.supportY), `${block.id} stone/support at ${progress}`)
          .toBeLessThanOrEqual(0.01);
        expect(Math.abs(state.supportY - state.carrierHeight - state.groundY), `${block.id} carrier/ground at ${progress}`)
          .toBeLessThanOrEqual(0.01);
        const expectedSurface = footSurface + climb * progress;
        expect(Math.abs(state.groundY - expectedSurface), `${block.id} ramp surface at ${progress}`)
          .toBeLessThanOrEqual(0.03);
      }
    }
  });

  it('keeps every active block in contact with its declared carrier or support', () => {
    for (let index = 0; index < plan.blocks.length; index += 173) {
      const block = plan.blocks[index]!;
      const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;
      for (const phase of [0.25, 1.5, 2.25, 2.75, 3.5, 4.5, 5.25, 5.75, 6.25, 6.75, 7.25, 7.75]) {
        const state = constructionStateAt(block, route, block.start + block.duration * phase / 8);
        const bottom = state.position[1] - block.dimensions[1] * 0.5;
        expect(Math.abs(bottom - state.supportY), `${block.id} ${state.phase} stone/support`)
          .toBeLessThanOrEqual(0.01);
        expect(Math.abs(state.supportY - state.carrierHeight - state.groundY), `${block.id} ${state.phase} carrier/base`)
          .toBeLessThanOrEqual(0.01);
        if (state.mechanism === 'sled') expect(state.sledLift).toBe(state.carrierHeight);
        else expect(state.sledLift).toBe(0);
      }
    }
  });
});

describe('settled-prefix rendering contract', () => {
  it('seat-time order makes the settled set a prefix for every material batch', () => {
    // BlockSystem renders settled stones as `count = upperBound(t)` over each
    // material batch sorted by seat time. That count must equal the true
    // settled population at every t, or finished masonry blinks out — plan
    // order is not sufficient because per-course durations make seat times
    // zigzag at course boundaries.
    const materials = ['core-limestone', 'casing-limestone', 'granite'] as const;
    for (const material of materials) {
      const batch = plan.blocks
        .filter((block) => block.material === material)
        .sort((a, b) => a.start + a.duration - (b.start + b.duration));
      for (let sample = 0; sample <= 200; sample += 1) {
        const t = sample / 200;
        let prefix = 0;
        while (
          prefix < batch.length &&
          batch[prefix]!.start + batch[prefix]!.duration <= t
        ) {
          prefix += 1;
        }
        const settled = batch.filter((block) => block.start + block.duration <= t).length;
        expect(prefix, `${material} at t=${t}`).toBe(settled);
        // And the prefix boundary must be a genuine boundary: nothing after
        // it may already be seated.
        if (prefix < batch.length) {
          expect(batch[prefix]!.start + batch[prefix]!.duration).toBeGreaterThan(t);
        }
      }
    }
  });

  it('plan order alone is NOT seat-time sorted (the trap this contract guards)', () => {
    // If this ever starts passing, the schedule became uniform again and the
    // sort in BlockSystem is dead code — harmless, but worth knowing.
    const inPlanOrder = plan.blocks.every(
      (block, index) =>
        index === 0 ||
        plan.blocks[index - 1]!.start + plan.blocks[index - 1]!.duration <=
          block.start + block.duration,
    );
    expect(inPlanOrder).toBe(false);
  });
});

describe('causal construction state graph', () => {
  const block = plan.blocks[Math.floor(plan.blocks.length * 0.43)]!;
  const route = plan.routes.find((candidate) => candidate.id === block.routeId)!;

  it('moves through the authored phases in order', () => {
    const phases = CONSTRUCTION_PHASES.map((_, index) =>
      constructionStateAt(block, route, block.start + block.duration * ((index + 0.5) / CONSTRUCTION_PHASES.length))
        .phase,
    );
    expect(phases).toEqual(CONSTRUCTION_PHASES);
  });

  it('is position-continuous at every phase boundary', () => {
    for (let i = 1; i < CONSTRUCTION_PHASES.length; i += 1) {
      const boundary = block.start + block.duration * (i / CONSTRUCTION_PHASES.length);
      const before = constructionStateAt(block, route, boundary - 1e-9).position;
      const after = constructionStateAt(block, route, boundary + 1e-9).position;
      expect(Math.hypot(
        before[0] - after[0],
        before[1] - after[1],
        before[2] - after[2],
      )).toBeLessThan(0.001);
    }
  });

  it('starts at the quarry, ends at its seat, and never moves once seated', () => {
    const first = constructionStateAt(block, route, block.start);
    const seated = constructionStateAt(block, route, block.start + block.duration);
    const muchLater = constructionStateAt(block, route, 1);
    expect(first.position).toEqual(route.waypoints.quarry);
    expect(first.position).not.toEqual(block.finalPosition);
    expect(seated.position).toEqual(block.finalPosition);
    expect(muchLater.position).toEqual(block.finalPosition);
    expect(muchLater.scale).toEqual([1, 1, 1]);
  });

  it('binds support and dust to real contact states', () => {
    const raised = constructionStateAt(block, route, block.start + block.duration * 0.7);
    const aligned = constructionStateAt(block, route, block.start + block.duration * 0.84);
    const seated = constructionStateAt(block, route, block.start + block.duration * 0.995);
    expect(raised.support).toBe('ramp');
    expect(raised.contactDust).toBe(false);
    expect(aligned.support).toBe('cribbing');
    expect(seated.support).toBe('cribbing');
    expect(seated.contactDust).toBe(true);
    expect(constructionStateAt(block, route, block.start + block.duration).support).toBe('masonry');
  });

  it('caps active operations and does not double-book a route lane', () => {
    for (const t of [0.11, 0.27, 0.43, 0.61, 0.79, 0.9]) {
      const active = activeConstructionStatesAt(plan, t);
      expect(active.length).toBeLessThanOrEqual(24);
      const assignments = active.map(({ block }) => `${block.routeId}:${block.lane}`);
      expect(new Set(assignments).size).toBe(assignments.length);
    }
  });
});
