import { describe, expect, it } from 'vitest';
import {
  SYDNEY_CONSTRUCTION,
  SYDNEY_FALSEWORK_SEGMENT,
  SYDNEY_HEIGHT,
  SYDNEY_LENGTH,
  SYDNEY_MAX_ACTIVE,
  SYDNEY_SAILS,
  SYDNEY_TROLLEY_BED,
  SYDNEY_WIDTH,
  createSydneyConstructionPlan,
} from '../src/data/sydneyConstruction';
import {
  activeSydneyOperationsAt,
  seatedSydneyCountAt,
  sydneyCraneRigAt,
  sydneyFalseworkAt,
  sydneyFalseworkStackHeightAt,
  sydneyPartStateAt,
  sydneyStagingPose,
  sydneyVerticalHalfExtent,
} from '../src/engine/sydneyConstruction';
import { sydneyLabourAt } from '../src/engine/sydneyCrew';
import { sydneyPlantAt } from '../src/engine/sydneyPlant';
import { SYDNEY_WATER_Y, sydneyPeninsulaShoreAt, sydneyTerrainHeightAt } from '../src/engine/sydneyTerrain';

const finite = (values: readonly number[]) => values.every(Number.isFinite);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, index) => value - b[index]!));

describe('Sydney Opera House typed construction plan (Spec 13)', () => {
  it('expands deterministically as podium plus spherical-section sails', () => {
    expect(createSydneyConstructionPlan()).toEqual(createSydneyConstructionPlan());
    expect(createSydneyConstructionPlan()).toEqual(SYDNEY_CONSTRUCTION);
    expect(SYDNEY_CONSTRUCTION.length).toBe(SYDNEY_LENGTH);
    expect(SYDNEY_CONSTRUCTION.width).toBe(SYDNEY_WIDTH);
    expect(SYDNEY_CONSTRUCTION.height).toBe(SYDNEY_HEIGHT);
    expect(SYDNEY_CONSTRUCTION.parts.filter((part) => part.group === 'podium')).toHaveLength(12);
    expect(SYDNEY_CONSTRUCTION.parts.filter((part) => part.kind === 'sail')).toHaveLength(SYDNEY_SAILS.length);
    expect(SYDNEY_CONSTRUCTION.parts.filter((part) => part.kind === 'rib').length).toBe(
      SYDNEY_SAILS.reduce((sum, sail) => sum + sail.ribCount, 0),
    );
  });

  it('keeps unique finite parts at final size', () => {
    const ids = new Set<string>();
    const transforms = new Set<string>();
    for (const part of SYDNEY_CONSTRUCTION.parts) {
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
    const route = SYDNEY_CONSTRUCTION.routes[0]!;
    for (const part of SYDNEY_CONSTRUCTION.parts.filter((_, index) => index % 5 === 0)) {
      const before = sydneyPartStateAt(part, route, part.start - 0.001);
      expect(before.visible).toBe(false);
      const mid = sydneyPartStateAt(part, route, part.start + part.duration * 0.5);
      expect(mid.visible).toBe(true);
      expect(mid.scale).toEqual([1, 1, 1]);
      expect(Math.hypot(
        mid.position[0] - part.finalPosition[0],
        mid.position[2] - part.finalPosition[2],
      )).toBeGreaterThan(4);
      const seated = sydneyPartStateAt(part, route, part.start + part.duration);
      expect(seated.phase).toBe('seated');
      expect(seated.position).toEqual(part.finalPosition);
      expect(seated.rotation).toEqual(part.finalRotation);
      expect(sydneyPartStateAt(part, route, 1).position).toEqual(part.finalPosition);
    }
    expect(seatedSydneyCountAt(SYDNEY_CONSTRUCTION, 1)).toBe(SYDNEY_CONSTRUCTION.parts.length);
  });

  it('keeps phase boundaries continuous without scaling', () => {
    const route = SYDNEY_CONSTRUCTION.routes[0]!;
    for (const part of SYDNEY_CONSTRUCTION.parts.filter((_, index) => index % 7 === 0)) {
      const bounds = part.graph === 'podium' ? [0.2, 0.86] : [0.14, 0.48, 0.58, 0.9];
      for (const boundary of bounds) {
        const at = part.start + part.duration * boundary;
        const left = sydneyPartStateAt(part, route, at - 1e-8);
        const right = sydneyPartStateAt(part, route, at + 1e-8);
        expect(distance(left.position, right.position)).toBeLessThan(0.08);
        expect(left.scale).toEqual([1, 1, 1]);
        expect(right.scale).toEqual([1, 1, 1]);
      }
    }
  });

  it('matches hauled bottoms to the shared peninsula sampler plus engine-owned trolley height', () => {
    const route = SYDNEY_CONSTRUCTION.routes[0]!;
    for (const part of SYDNEY_CONSTRUCTION.parts.filter((_, index) => index % 6 === 0)) {
      const hauled = sydneyPartStateAt(part, route, part.start + part.duration * 0.3);
      expect(hauled.phase).toBe('hauled');
      const bottom = hauled.position[1] - sydneyVerticalHalfExtent(part.dimensions);
      const floor = sydneyTerrainHeightAt(hauled.position[0], hauled.position[2]);
      expect(Math.abs(bottom - floor - hauled.trolleyLift)).toBeLessThanOrEqual(0.03);
      expect(hauled.trolleyLift).toBeGreaterThan(SYDNEY_TROLLEY_BED * 0.5);
    }
  });

  it('caps concurrent operations and seats tile skins after their sail ribs', () => {
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      peak = Math.max(peak, activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, t).length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(SYDNEY_MAX_ACTIVE);
    for (const sail of SYDNEY_SAILS) {
      const skin = SYDNEY_CONSTRUCTION.parts.find((part) => part.id === `sail-${sail.id}`)!;
      const ribs = SYDNEY_CONSTRUCTION.parts.filter((part) => part.kind === 'rib' && part.sail === sail.id);
      expect(ribs.length).toBe(sail.ribCount);
      const lastRib = ribs.reduce((latest, rib) => (rib.start + rib.duration > latest.start + latest.duration ? rib : latest));
      expect(skin.start).toBeGreaterThan(lastRib.start + lastRib.duration);
    }
  });

  it('stages shells on the podium working floor, never at the seat', () => {
    const route = SYDNEY_CONSTRUCTION.routes[0]!;
    const rib = SYDNEY_CONSTRUCTION.parts.find((part) => part.id === 'rib-0-0')!;
    const staged = sydneyPartStateAt(rib, route, rib.start + rib.duration * 0.53);
    expect(staged.phase).toBe('staged');
    expect(staged.support).toBe('working-floor');
    const pose = sydneyStagingPose(rib);
    expect(staged.position[0]).toBeCloseTo(pose[0], 3);
    expect(staged.position[2]).toBeCloseTo(pose[2], 3);
    expect(Math.hypot(
      staged.position[0] - rib.finalPosition[0],
      staged.position[2] - rib.finalPosition[2],
    )).toBeGreaterThan(12);
  });

  it('hoists vertically at staging then slews on a tower-crane hook', () => {
    const route = SYDNEY_CONSTRUCTION.routes[0]!;
    const rib = SYDNEY_CONSTRUCTION.parts.find((part) => part.id === 'rib-1-1')!;
    const staged = sydneyPartStateAt(rib, route, rib.start + rib.duration * 0.53);
    const climbing = sydneyPartStateAt(rib, route, rib.start + rib.duration * 0.65);
    expect(climbing.phase).toBe('hoisted');
    expect(climbing.mechanism).toBe('crane');
    expect(climbing.position[0]).toBeCloseTo(staged.position[0], 1);
    expect(climbing.position[2]).toBeCloseTo(staged.position[2], 1);
    expect(climbing.position[1]).toBeGreaterThan(staged.position[1] + 1);
    const slewing = sydneyPartStateAt(rib, route, rib.start + rib.duration * 0.78);
    expect(slewing.phase).toBe('hoisted');
    expect(slewing.position[1]).toBeGreaterThan(rib.finalPosition[1] + 1);
    const rig = sydneyCraneRigAt(rib, slewing)!;
    expect(rig.jibTip[0]).toBeCloseTo(slewing.position[0], 3);
    expect(rig.jibTip[2]).toBeCloseTo(slewing.position[2], 3);
    expect(rig.hook[1]).toBeGreaterThan(slewing.position[1]);
  });

  it('raises ground-rooted falsework in authored segments, then strikes them', () => {
    expect(sydneyFalseworkAt(0)).toHaveLength(0);
    expect(sydneyFalseworkStackHeightAt(0)).toBe(0);
    const early = sydneyFalseworkAt(0.22);
    expect(early.length).toBeGreaterThan(0);
    for (const bay of early) {
      expect(bay.segmentLength).toBe(SYDNEY_FALSEWORK_SEGMENT);
      expect(bay.height).toBe(bay.segmentCount * SYDNEY_FALSEWORK_SEGMENT);
      expect(Math.abs(bay.footY - sydneyTerrainHeightAt(bay.position[0], bay.position[2]))).toBeLessThanOrEqual(0.03);
    }
    expect(sydneyFalseworkAt(1)).toHaveLength(0);
  });

  it('binds crews to operations with moving gait, not planted spectators', () => {
    const haulPart = SYDNEY_CONSTRUCTION.parts.find((part) => part.id === 'podium-4')!;
    const haulA = haulPart.start + haulPart.duration * 0.3;
    const haulB = haulPart.start + haulPart.duration * 0.4;
    const labourA = sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, haulA), haulA);
    const labourB = sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, haulB), haulB);
    expect(sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, haulA), haulA)).toEqual(labourA);
    const haulerA = labourA.crews.find((crew) => crew.id === `${haulPart.id}-hauler-0`);
    const haulerB = labourB.crews.find((crew) => crew.id === `${haulPart.id}-hauler-0`);
    expect(haulerA).toBeDefined();
    expect(haulerB).toBeDefined();
    expect(distance(haulerA!.position, haulerB!.position)).toBeGreaterThan(0.4);
    expect(Math.abs(haulerB!.gait - haulerA!.gait)).toBeGreaterThan(0.2);
    expect(labourA.rigs.find((rig) => rig.partId === haulPart.id)?.trolleySpin).toBeGreaterThan(0);

    const raiseA = 0.18;
    const raiseB = 0.21;
    const climbA = sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, raiseA), raiseA)
      .crews.find((crew) => crew.id === 'climb-0')!;
    const climbB = sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, raiseB), raiseB)
      .crews.find((crew) => crew.id === 'climb-0')!;
    expect(climbA.role).toBe('climber');
    expect(climbB.position[1]).toBeGreaterThan(climbA.position[1] + 0.3);
    const bay = sydneyFalseworkAt(raiseB).find((entry) => entry.station === 0)!;
    expect(climbB.position[1]).toBeLessThan(bay.deckY + 0.05);

    const hold = sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, 0.3), 0.3);
    expect(hold.crews.some((crew) => crew.role === 'deck-mason')).toBe(true);
    const masons = hold.crews.filter((crew) => crew.role === 'deck-mason');
    expect(Math.max(...masons.map((crew) => crew.gait)) - Math.min(...masons.map((crew) => crew.gait))).toBeGreaterThan(1);

    expect(sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, 0), 0).crews).toHaveLength(0);
    expect(sydneyLabourAt(activeSydneyOperationsAt(SYDNEY_CONSTRUCTION, 1), 1).crews).toHaveLength(0);
  });

  it('stages modern civil plant on the shared peninsula sampler', () => {
    expect(sydneyPlantAt(0.12)).toEqual(sydneyPlantAt(0.12));
    const earthworks = sydneyPlantAt(0.12);
    expect(earthworks.filter((pose) => pose.kind === 'dozer')).toHaveLength(3);
    expect(earthworks.filter((pose) => pose.kind === 'dump-truck')).toHaveLength(3);
    expect(earthworks.filter((pose) => pose.kind === 'tower-crane')).toHaveLength(2);
    expect(earthworks.some((pose) => pose.kind === 'crawler-crane')).toBe(true);
    for (const pose of earthworks) {
      if (pose.kind === 'tower-crane') continue;
      expect(pose.position[1]).toBeCloseTo(
        sydneyTerrainHeightAt(pose.position[0], pose.position[2]),
        5,
      );
    }
    expect(sydneyPlantAt(1).some((pose) => pose.kind === 'dozer' || pose.kind === 'dump-truck')).toBe(false);
    expect(sydneyPlantAt(1).some((pose) => pose.kind === 'tower-crane')).toBe(false);
  });

  it('puts the peninsula shoreline against harbour water', () => {
    const east = sydneyPeninsulaShoreAt(0, 1);
    expect(east.x).toBeCloseTo(64);
    expect(sydneyTerrainHeightAt(east.x * 0.9, east.z)).toBeGreaterThan(0.2);
    const seaward = sydneyPeninsulaShoreAt(0, 1.04);
    expect(sydneyTerrainHeightAt(seaward.x, seaward.z)).toBe(SYDNEY_WATER_Y);
    expect(sydneyTerrainHeightAt(-40, -248)).toBeGreaterThan(8);
  });
});
