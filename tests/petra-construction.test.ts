import { describe, expect, it } from 'vitest';
import {
  PETRA_CONSTRUCTION,
  PETRA_FACADE_HEIGHT,
  PETRA_FACADE_WIDTH,
  PETRA_MAX_ACTIVE,
  PETRA_SLED_BED_HEIGHT,
  PETRA_SPOIL_COLUMNS,
  PETRA_SPOIL_ROWS,
  createPetraConstructionPlan,
} from '../src/data/petraConstruction';
import type { PetraRockMember } from '../src/data/petraTypes';
import {
  activePetraOperationsAt,
  petraMemberStateAt,
  petraSpoilStateAt,
  petraVerticalHalfExtent,
  petraWorkingFaceY,
  revealedPetraMemberCountAt,
} from '../src/engine/petraConstruction';
import { petraTerrainHeightAt } from '../src/engine/petraTerrain';

const finite = (values: readonly number[]) => values.every(Number.isFinite);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, index) => value - b[index]!));

describe('Petra typed construction plan (Spec 11)', () => {
  it('expands deterministically with remaining members and a top-down spoil grid', () => {
    expect(createPetraConstructionPlan()).toEqual(createPetraConstructionPlan());
    expect(createPetraConstructionPlan()).toEqual(PETRA_CONSTRUCTION);
    expect(PETRA_CONSTRUCTION.facadeWidth).toBe(PETRA_FACADE_WIDTH);
    expect(PETRA_CONSTRUCTION.facadeHeight).toBe(PETRA_FACADE_HEIGHT);
    expect(PETRA_CONSTRUCTION.cells).toHaveLength(PETRA_SPOIL_COLUMNS * PETRA_SPOIL_ROWS);
    expect(PETRA_CONSTRUCTION.members.length).toBeGreaterThanOrEqual(24);
    const groups = new Set(PETRA_CONSTRUCTION.members.map((member) => member.group));
    expect(groups.has('portico')).toBe(true);
    expect(groups.has('tholos')).toBe(true);
    expect(groups.has('urn')).toBe(true);
  });

  it('keeps unique finite remaining-rock members at final size', () => {
    const ids = new Set<string>();
    const transforms = new Set<string>();
    for (const member of PETRA_CONSTRUCTION.members) {
      expect(ids.has(member.id)).toBe(false);
      ids.add(member.id);
      expect(member.scale).toEqual([1, 1, 1]);
      expect(finite(member.dimensions)).toBe(true);
      expect(finite(member.finalPosition)).toBe(true);
      expect(member.dimensions.every((value) => value > 0)).toBe(true);
      expect(member.coveringCellIds.length).toBeGreaterThanOrEqual(2);
      const key = `${member.finalPosition.join(':')}:${member.finalRotation.join(':')}`;
      expect(transforms.has(key)).toBe(false);
      transforms.add(key);
    }
  });

  it('never translates remaining-rock members; they unmask in place', () => {
    for (const member of PETRA_CONSTRUCTION.members) {
      expect(petraMemberStateAt(member, PETRA_CONSTRUCTION, 0).visible).toBe(false);
      for (const t of [0, 0.2, 0.45, 0.7, 1]) {
        const state = petraMemberStateAt(member, PETRA_CONSTRUCTION, t);
        expect(state.position).toEqual(member.finalPosition);
        expect(state.rotation).toEqual(member.finalRotation);
        expect(state.scale).toEqual([1, 1, 1]);
      }
    }
    expect(revealedPetraMemberCountAt(PETRA_CONSTRUCTION, 1)).toBe(PETRA_CONSTRUCTION.members.length);
    expect(petraWorkingFaceY(0)).toBeGreaterThan(38);
    expect(petraWorkingFaceY(1)).toBeLessThan(1);
  });

  it('keeps spoil phase boundaries continuous without scaling or dump teleports', () => {
    const route = PETRA_CONSTRUCTION.routes[0]!;
    for (const cell of PETRA_CONSTRUCTION.cells.filter((_, index) => index % 11 === 0)) {
      const before = petraSpoilStateAt(cell, route, cell.start - 0.001);
      expect(before.visible).toBe(true);
      expect(Math.hypot(
        before.position[0] - cell.dumpPosition[0],
        before.position[2] - cell.dumpPosition[2],
      )).toBeGreaterThan(8);

      for (const boundary of [0.18, 0.4, 0.86]) {
        const at = cell.start + cell.duration * boundary;
        const left = petraSpoilStateAt(cell, route, at - 1e-8);
        const right = petraSpoilStateAt(cell, route, at + 1e-8);
        expect(distance(left.position, right.position)).toBeLessThan(0.05);
        expect(left.scale).toEqual([1, 1, 1]);
        expect(right.scale).toEqual([1, 1, 1]);
      }

      const dumped = petraSpoilStateAt(cell, route, 1);
      expect(dumped.phase).toBe('dumped');
      expect(dumped.scale).toEqual([1, 1, 1]);
      expect(dumped.support).toBe('dump-ground');
    }
  });

  it('matches hauled spoil bottoms to the shared Siq sampler plus engine-owned sled height', () => {
    const route = PETRA_CONSTRUCTION.routes[0]!;
    for (const cell of PETRA_CONSTRUCTION.cells.filter((_, index) => index % 13 === 0)) {
      const hauled = petraSpoilStateAt(cell, route, cell.start + cell.duration * 0.62);
      expect(hauled.phase).toBe('hauled');
      const bottom = hauled.position[1] - petraVerticalHalfExtent(cell.dimensions);
      const floor = petraTerrainHeightAt(hauled.position[0], hauled.position[2]);
      expect(Math.abs(bottom - floor - PETRA_SLED_BED_HEIGHT)).toBeLessThanOrEqual(0.03);
      expect(hauled.sledLift).toBeCloseTo(PETRA_SLED_BED_HEIGHT, 6);

      const dumped = petraSpoilStateAt(cell, route, 1);
      const dumpBottom = dumped.position[1] - petraVerticalHalfExtent(cell.dimensions);
      const dumpFloor = petraTerrainHeightAt(dumped.position[0], dumped.position[2]);
      expect(Math.abs(dumpBottom - dumpFloor)).toBeLessThanOrEqual(0.03);
    }
  });

  it('caps concurrent haul operations and schedules top rows first', () => {
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      peak = Math.max(peak, activePetraOperationsAt(PETRA_CONSTRUCTION, t).length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(PETRA_MAX_ACTIVE);
    const top = PETRA_CONSTRUCTION.cells.find((cell) => cell.row === PETRA_SPOIL_ROWS - 1)!;
    const bottom = PETRA_CONSTRUCTION.cells.find((cell) => cell.row === 0)!;
    expect(top.start).toBeLessThan(bottom.start);
  });

  it('unmasks a member only after the working face and covering cells have passed', () => {
    const urn = PETRA_CONSTRUCTION.members.find((member: PetraRockMember) => member.id === 'urn')!;
    const route = PETRA_CONSTRUCTION.routes[0]!;
    const covering = PETRA_CONSTRUCTION.cells.filter((cell) => urn.coveringCellIds.includes(cell.id));
    expect(covering.length).toBeGreaterThan(0);
    const earliestFree = Math.min(...covering.map((cell) => cell.start + cell.duration * 0.18));
    expect(petraMemberStateAt(urn, PETRA_CONSTRUCTION, earliestFree - 0.02).visible).toBe(false);
    expect(petraSpoilStateAt(covering[0]!, route, covering[0]!.start - 0.01).phase).toBe('in-situ');
  });
});
