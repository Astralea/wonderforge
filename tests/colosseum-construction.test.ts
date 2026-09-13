import { describe, expect, it } from 'vitest';
import {
  COLOSSEUM_A,
  COLOSSEUM_BAYS,
  COLOSSEUM_CONSTRUCTION,
  COLOSSEUM_HEIGHT,
  COLOSSEUM_MAJOR,
  COLOSSEUM_MAX_ACTIVE,
  COLOSSEUM_MINOR,
  COLOSSEUM_WAGON_BED,
  createColosseumConstructionPlan,
} from '../src/data/colosseumConstruction';
import {
  COLOSSEUM_SCAFFOLD_SEGMENT,
  activeColosseumOperationsAt,
  colosseumCenteringAt,
  colosseumCraneRigAt,
  colosseumInsideArena,
  colosseumPartStateAt,
  colosseumScaffoldsAt,
  colosseumScaffoldStackHeightAt,
  colosseumVerticalHalfExtent,
  seatedColosseumCountAt,
} from '../src/engine/colosseumConstruction';
import { colosseumLabourAt } from '../src/engine/colosseumCrew';
import { colosseumTerrainHeightAt } from '../src/engine/colosseumTerrain';

const finite = (values: readonly number[]) => values.every(Number.isFinite);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, index) => value - b[index]!));

describe('Colosseum typed construction plan (Spec 12)', () => {
  it('expands deterministically as an 80-bay elliptical amphitheatre', () => {
    expect(createColosseumConstructionPlan()).toEqual(createColosseumConstructionPlan());
    expect(createColosseumConstructionPlan()).toEqual(COLOSSEUM_CONSTRUCTION);
    expect(COLOSSEUM_CONSTRUCTION.major).toBe(COLOSSEUM_MAJOR);
    expect(COLOSSEUM_CONSTRUCTION.minor).toBe(COLOSSEUM_MINOR);
    expect(COLOSSEUM_CONSTRUCTION.height).toBe(COLOSSEUM_HEIGHT);
    expect(COLOSSEUM_CONSTRUCTION.bays).toBe(COLOSSEUM_BAYS);
    expect(COLOSSEUM_CONSTRUCTION.parts.filter((part) => part.group === 'arcade')).toHaveLength(COLOSSEUM_BAYS * 3);
    expect(COLOSSEUM_CONSTRUCTION.parts.filter((part) => part.group === 'attic')).toHaveLength(COLOSSEUM_BAYS);
    expect(COLOSSEUM_CONSTRUCTION.parts.filter((part) => part.group === 'foundation')).toHaveLength(16);
  });

  it('keeps unique finite parts at final size', () => {
    const ids = new Set<string>();
    const transforms = new Set<string>();
    for (const part of COLOSSEUM_CONSTRUCTION.parts) {
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
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    for (const part of COLOSSEUM_CONSTRUCTION.parts.filter((_, index) => index % 17 === 0)) {
      const before = colosseumPartStateAt(part, route, part.start - 0.001);
      expect(before.visible).toBe(false);
      const mid = colosseumPartStateAt(part, route, part.start + part.duration * 0.5);
      expect(mid.visible).toBe(true);
      expect(mid.scale).toEqual([1, 1, 1]);
      expect(Math.hypot(
        mid.position[0] - part.finalPosition[0],
        mid.position[2] - part.finalPosition[2],
      )).toBeGreaterThan(4);
      const seated = colosseumPartStateAt(part, route, part.start + part.duration);
      expect(seated.phase).toBe('seated');
      expect(seated.position).toEqual(part.finalPosition);
      expect(seated.rotation).toEqual(part.finalRotation);
      expect(colosseumPartStateAt(part, route, 1).position).toEqual(part.finalPosition);
    }
    expect(seatedColosseumCountAt(COLOSSEUM_CONSTRUCTION, 1)).toBe(COLOSSEUM_CONSTRUCTION.parts.length);
  });

  it('keeps phase boundaries continuous without scaling', () => {
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    for (const part of COLOSSEUM_CONSTRUCTION.parts.filter((_, index) => index % 23 === 0)) {
      for (const boundary of [0.14, 0.48, 0.58, 0.9]) {
        const at = part.start + part.duration * boundary;
        const left = colosseumPartStateAt(part, route, at - 1e-8);
        const right = colosseumPartStateAt(part, route, at + 1e-8);
        expect(distance(left.position, right.position)).toBeLessThan(0.08);
        expect(left.scale).toEqual([1, 1, 1]);
        expect(right.scale).toEqual([1, 1, 1]);
      }
    }
  });

  it('matches hauled bottoms to the shared valley sampler plus engine-owned wagon height', () => {
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    for (const part of COLOSSEUM_CONSTRUCTION.parts.filter((_, index) => index % 19 === 0)) {
      const hauled = colosseumPartStateAt(part, route, part.start + part.duration * 0.3);
      expect(hauled.phase).toBe('hauled');
      const bottom = hauled.position[1] - colosseumVerticalHalfExtent(part.dimensions);
      const floor = colosseumTerrainHeightAt(hauled.position[0], hauled.position[2]);
      expect(Math.abs(bottom - floor - hauled.wagonLift)).toBeLessThanOrEqual(0.03);
      expect(hauled.wagonLift).toBeGreaterThan(COLOSSEUM_WAGON_BED * 0.5);
    }
  });

  it('caps concurrent operations and seats vaults after their bay arcade', () => {
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      peak = Math.max(peak, activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, t).length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(COLOSSEUM_MAX_ACTIVE);
    const vault = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'vault-0')!;
    const arcade = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === `arcade-0-${vault.bay}`)!;
    expect(vault.start).toBeGreaterThan(arcade.start + arcade.duration);
  });

  it('keeps hauled wagons on the outer ring instead of chord through the arena', () => {
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    for (let t = 0; t <= 1; t += 0.02) {
      for (const operation of activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, t)) {
        if (operation.state.phase !== 'hauled') continue;
        expect(colosseumInsideArena(operation.state.position[0], operation.state.position[2])).toBe(false);
      }
    }
    const west = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'arcade-0-60')!;
    const hauled = colosseumPartStateAt(west, route, west.start + west.duration * 0.3);
    expect(hauled.phase).toBe('hauled');
    expect(Math.hypot(hauled.position[0], hauled.position[2])).toBeGreaterThan(COLOSSEUM_A);
  });

  it('hoists vertically at staging then slews inward on a crane hook, not through empty air', () => {
    const route = COLOSSEUM_CONSTRUCTION.routes[0]!;
    const arch = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'arcade-1-8')!;
    const staged = colosseumPartStateAt(arch, route, arch.start + arch.duration * 0.53);
    expect(staged.phase).toBe('staged');
    const climbing = colosseumPartStateAt(arch, route, arch.start + arch.duration * 0.65);
    expect(climbing.phase).toBe('hoisted');
    expect(climbing.mechanism).toBe('crane');
    expect(climbing.position[0]).toBeCloseTo(staged.position[0], 1);
    expect(climbing.position[2]).toBeCloseTo(staged.position[2], 1);
    expect(climbing.position[1]).toBeGreaterThan(staged.position[1] + 1);
    const slewing = colosseumPartStateAt(arch, route, arch.start + arch.duration * 0.78);
    expect(slewing.phase).toBe('hoisted');
    expect(slewing.position[1] - arch.finalPosition[1]).toBeGreaterThan(1);
    expect(slewing.position[1] - arch.finalPosition[1]).toBeLessThan(2.1);
    const rig = colosseumCraneRigAt(arch, slewing)!;
    expect(rig.boomTip[0]).toBeCloseTo(slewing.position[0], 3);
    expect(rig.boomTip[2]).toBeCloseTo(slewing.position[2], 3);
    expect(rig.hook[1]).toBeGreaterThan(slewing.position[1]);
    const vault = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'vault-0')!;
    const vaultStaged = colosseumPartStateAt(vault, route, vault.start + vault.duration * 0.53);
    expect(vaultStaged.phase).toBe('staged');
    expect(Math.hypot(
      vaultStaged.position[0] - vault.finalPosition[0],
      vaultStaged.position[2] - vault.finalPosition[2],
    )).toBeGreaterThan(12);
    expect(Math.hypot(vaultStaged.position[0], vaultStaged.position[2])).toBeGreaterThan(
      Math.hypot(vault.finalPosition[0], vault.finalPosition[2]) + 8,
    );
  });

  it('raises timber scaffolding from the valley floor in final-size lifts, then strikes them', () => {
    expect(colosseumScaffoldsAt(0)).toHaveLength(0);
    expect(colosseumScaffoldStackHeightAt(0)).toBe(0);
    const early = colosseumScaffoldsAt(0.22);
    expect(early).toHaveLength(20);
    for (const bay of early) {
      expect(bay.segmentLength).toBe(COLOSSEUM_SCAFFOLD_SEGMENT);
      expect(bay.height).toBe(bay.segmentCount * COLOSSEUM_SCAFFOLD_SEGMENT);
      expect(Math.abs(bay.footY - colosseumTerrainHeightAt(bay.position[0], bay.position[2]))).toBeLessThanOrEqual(0.03);
      expect(bay.segmentCount).toBeGreaterThan(2);
    }
    const upper = colosseumScaffoldsAt(0.7);
    expect(upper[0]!.height).toBeGreaterThan(early[0]!.height);
    expect(upper[0]!.footY).toBeCloseTo(colosseumTerrainHeightAt(upper[0]!.position[0], upper[0]!.position[2]), 2);
    expect(colosseumScaffoldsAt(1)).toHaveLength(0);
    const vault = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'vault-0')!;
    expect(colosseumCenteringAt(vault.start).some((bay) => bay.id === vault.id)).toBe(true);
    expect(colosseumCenteringAt(vault.start + vault.duration + 0.01).some((bay) => bay.id === vault.id)).toBe(true);
    expect(colosseumCenteringAt(1)).toHaveLength(0);
  });

  it('binds crews to operations with moving gait, not planted spectators', () => {
    const haulPart = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'arcade-0-20')!;
    const haulA = haulPart.start + haulPart.duration * 0.3;
    const haulB = haulPart.start + haulPart.duration * 0.4;
    const labourA = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, haulA), haulA);
    const labourB = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, haulB), haulB);
    expect(colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, haulA), haulA)).toEqual(labourA);
    const haulerA = labourA.crews.find((crew) => crew.id === `${haulPart.id}-hauler-0`);
    const haulerB = labourB.crews.find((crew) => crew.id === `${haulPart.id}-hauler-0`);
    expect(haulerA).toBeDefined();
    expect(haulerB).toBeDefined();
    expect(distance(haulerA!.position, haulerB!.position)).toBeGreaterThan(0.4);
    expect(Math.abs(haulerB!.gait - haulerA!.gait)).toBeGreaterThan(0.2);
    expect(labourA.rigs.find((rig) => rig.partId === haulPart.id)?.wagonSpin).toBeGreaterThan(0);

    const hoistPart = COLOSSEUM_CONSTRUCTION.parts.find((part) => part.id === 'arcade-1-10')!;
    const liftA = hoistPart.start + hoistPart.duration * (0.58 + 0.12 * 0.32);
    const liftB = hoistPart.start + hoistPart.duration * (0.58 + 0.36 * 0.32);
    const wheelA = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, liftA), liftA);
    const wheelB = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, liftB), liftB);
    const walkerA = wheelA.crews.find((crew) => crew.id === `${hoistPart.id}-wheel-0`)!;
    const walkerB = wheelB.crews.find((crew) => crew.id === `${hoistPart.id}-wheel-0`)!;
    expect(walkerA.role).toBe('wheel-walker');
    expect(Math.abs(walkerB.gait - walkerA.gait)).toBeGreaterThan(0.15);
    expect(wheelA.crews.some((crew) => crew.role === 'climber' || crew.role === 'deck-mason')).toBe(true);
    const spinA = wheelA.rigs.find((rig) => rig.partId === hoistPart.id)!;
    const spinB = wheelB.rigs.find((rig) => rig.partId === hoistPart.id)!;
    expect(Math.abs(spinB.treadwheelSpin - spinA.treadwheelSpin)).toBeGreaterThan(0.15);

    const slewA = hoistPart.start + hoistPart.duration * (0.58 + 0.5 * 0.32);
    const slewB = hoistPart.start + hoistPart.duration * (0.58 + 0.68 * 0.32);
    const slewLabourA = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, slewA), slewA);
    const slewLabourB = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, slewB), slewB);
    const slewSpinA = slewLabourA.rigs.find((rig) => rig.partId === hoistPart.id)!;
    const slewSpinB = slewLabourB.rigs.find((rig) => rig.partId === hoistPart.id)!;
    expect(slewSpinA.treadwheelSpin).toBeCloseTo(slewSpinB.treadwheelSpin, 5);
    expect(slewLabourA.crews.find((crew) => crew.id === `${hoistPart.id}-wheel-0`)!.gait).toBeCloseTo(
      slewLabourB.crews.find((crew) => crew.id === `${hoistPart.id}-wheel-0`)!.gait,
      5,
    );

    const mixA = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, 0.32), 0.32);
    const mixB = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, 0.36), 0.36);
    const mixerA = mixA.crews.find((crew) => crew.id === 'mixer-0')!;
    const mixerB = mixB.crews.find((crew) => crew.id === 'mixer-0')!;
    expect(distance(mixerA.position, mixerB.position)).toBeGreaterThan(0.15);

    for (const crew of wheelA.crews) {
      expect(finite(crew.position)).toBe(true);
      if (crew.role === 'deck-mason' || crew.role === 'climber') continue;
      const ground = colosseumTerrainHeightAt(crew.position[0], crew.position[2]);
      expect(Math.abs(crew.position[1] - ground)).toBeLessThanOrEqual(0.03);
    }
    expect(colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, 0), 0).crews.filter((crew) => crew.role === 'mixer')).toHaveLength(0);
    expect(colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, 1), 1).crews).toHaveLength(0);

    const stagedT = haulPart.start + haulPart.duration * 0.53;
    const stagedLabour = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, stagedT), stagedT);
    const slingers = stagedLabour.crews.filter((crew) => crew.id.startsWith(`${haulPart.id}-slinger-`));
    expect(slingers).toHaveLength(3);
    const stagedOp = activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, stagedT).find((op) => op.part.id === haulPart.id)!;
    const [stoneX, , stoneZ] = stagedOp.state.position;
    const radii = slingers.map((crew) => Math.hypot(crew.position[0] - stoneX, crew.position[2] - stoneZ));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.5);
    const angles = slingers
      .map((crew) => Math.atan2(crew.position[0] - stoneX, crew.position[2] - stoneZ))
      .sort((a, b) => a - b);
    const wrap = (value: number) => {
      const tau = Math.PI * 2;
      return ((value % tau) + tau) % tau;
    };
    const gaps = [
      wrap(angles[1]! - angles[0]!),
      wrap(angles[2]! - angles[1]!),
      wrap(angles[0]! + Math.PI * 2 - angles[2]!),
    ];
    expect(gaps.every((gap) => Math.abs(gap - (Math.PI * 2) / 3) < 0.22)).toBe(false);
    expect(Math.max(...slingers.map((crew) => crew.gait)) - Math.min(...slingers.map((crew) => crew.gait))).toBeGreaterThan(1);

    const raiseLabour = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, 0.12), 0.12);
    const poleClimbers = raiseLabour.crews.filter((crew) => crew.id.startsWith('climb-'));
    expect(poleClimbers.length).toBeGreaterThan(0);
    expect(poleClimbers.length).toBeLessThanOrEqual(4);
    const climbStations = poleClimbers.map((crew) => Number(crew.id.slice('climb-'.length)));
    expect(Math.max(...climbStations) - Math.min(...climbStations) === 19 || climbStations.every((station) => station <= 3 || station >= 17)).toBe(true);
    expect(Math.max(...poleClimbers.map((crew) => crew.gait)) - Math.min(...poleClimbers.map((crew) => crew.gait))).toBeGreaterThan(1.5);
  });

  it('climbs scaffold poles instead of riding a rising deck', () => {
    const raiseA = 0.1;
    const raiseB = 0.13;
    const labourA = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, raiseA), raiseA);
    const labourB = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, raiseB), raiseB);
    expect(labourA.crews.some((crew) => crew.role === 'deck-mason')).toBe(false);
    const climbA = labourA.crews.find((crew) => crew.id === 'climb-0')!;
    const climbB = labourB.crews.find((crew) => crew.id === 'climb-0')!;
    expect(climbA.role).toBe('climber');
    expect(climbB.position[1]).toBeGreaterThan(climbA.position[1] + 0.4);
    expect(Math.abs(climbB.gait - climbA.gait)).toBeGreaterThan(0.2);
    const bay = colosseumScaffoldsAt(raiseB)[0]!;
    expect(Math.hypot(climbB.position[0] - bay.position[0], climbB.position[2] - bay.position[2])).toBeGreaterThan(1.8);
    const hold = colosseumLabourAt(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, 0.22), 0.22);
    expect(hold.crews.some((crew) => crew.role === 'deck-mason')).toBe(true);
    expect(hold.crews.some((crew) => crew.role === 'climber')).toBe(false);
    const masons = hold.crews.filter((crew) => crew.role === 'deck-mason');
    expect(Math.max(...masons.map((crew) => crew.gait)) - Math.min(...masons.map((crew) => crew.gait))).toBeGreaterThan(2);
  });
});
