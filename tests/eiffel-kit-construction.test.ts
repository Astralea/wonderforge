import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { createEiffelKitPilotPlan, eiffelKitPilotStateAt, sampleEiffelKitPilotOperation } from '../src/engine/eiffelKitConstruction';
import { transformRigidPoint, transformedRigidBounds } from '../src/engine/eiffelRigid';

const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
const plan = createEiffelKitPilotPlan(manifest);

describe('bounded Eiffel kit construction pilot', () => {
  it('bridges four real bearing pads instead of treating their union AABB as a deck', () => {
    expect(plan.constructionReady).toBe(false);
    expect(plan.operations).toHaveLength(16);
    expect(new Set(plan.operations.map(operation => operation.part.leg))).toEqual(new Set(['ne', 'se', 'sw', 'nw']));
    for (const operation of plan.operations) {
      expect(operation.part.stage).toBe(1);
      expect(operation.support.sourceGroup).toMatch(new RegExp(`^foundation-${operation.part.leg}-`));
      expect(operation.support.bearingPads).toHaveLength(4);
      for (const pad of operation.support.bearingPads) {
        expect(pad.max[1]).toBeCloseTo(operation.support.topY, 8);
        expect(pad.max[0] - pad.min[0]).toBeGreaterThanOrEqual(1.4);
        expect(pad.max[2] - pad.min[2]).toBeGreaterThanOrEqual(1.4);
      }
      expect(operation.station.base[1]).toBeCloseTo(operation.support.topY + .45, 8);
      expect(operation.station.base[0]).toBeGreaterThanOrEqual(operation.support.min[0]);
      expect(operation.station.base[0]).toBeLessThanOrEqual(operation.support.max[0]);
      expect(operation.station.base[2]).toBeGreaterThanOrEqual(operation.support.min[2]);
      expect(operation.station.base[2]).toBeLessThanOrEqual(operation.support.max[2]);
      expect(operation.station.mastHeight).toBeLessThanOrEqual(22);
      expect(operation.station.boomLength).toBeLessThanOrEqual(8.4);
    }
  });

  it('places pickup cargo clear of the mast on a separate carrier side', () => {
    for (const operation of plan.operations) {
      const bounds = transformedRigidBounds(operation.pickupPose, operation.part.localBounds.min, operation.part.localBounds.max);
      const [x, , z] = operation.station.base;
      const dx = Math.max(bounds.min[0] - x, 0, x - bounds.max[0]);
      const dz = Math.max(bounds.min[2] - z, 0, z - bounds.max[2]);
      expect(Math.hypot(dx, dz)).toBeGreaterThan(.17);
      expect(bounds.min[1]).toBeCloseTo(operation.station.base[1] + .3, 8);
    }
  });

  it('keeps every sampled jib bounded with positive rope and no giant spans', () => {
    for (const operation of plan.operations) {
      for (let index = 0; index <= 300; index += 1) {
        const t = operation.start + (operation.end - operation.start) * (index + 0.5) / 301;
        const sample = sampleEiffelKitPilotOperation(operation, t);
        expect(sample.crane).not.toBeNull();
        expect(sample.crane!.horizontalReach).toBeLessThanOrEqual(8.4 + 1e-9);
        expect(sample.crane!.boomLength).toBe(8.4);
        expect(sample.crane!.ropeLength).toBeGreaterThan(0);
      }
    }
  });

  it('raises each member clear before horizontal transfer and seats its exact final pose', () => {
    for (const operation of plan.operations) {
      const clear = transformedRigidBounds(operation.clearPose, operation.part.localBounds.min, operation.part.localBounds.max);
      const approach = transformedRigidBounds(operation.seatApproachPose, operation.part.localBounds.min, operation.part.localBounds.max);
      expect(clear.min[1]).toBeGreaterThan(10.2);
      expect(approach.min[1]).toBeGreaterThan(10.2);
      expect(sampleEiffelKitPilotOperation(operation, operation.end).pose).toEqual(operation.part.finalPose);
      for (const lug of operation.part.pickupLugs) {
        expect(transformRigidPoint(operation.clearPose, lug).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('is continuous at every phase boundary and deterministic under backward seeks', () => {
    for (const operation of plan.operations) {
      for (const fraction of [0.12, 0.48, 0.76]) {
        const at = operation.start + (operation.end - operation.start) * fraction;
        const before = sampleEiffelKitPilotOperation(operation, at - 1e-10).pose.position;
        const after = sampleEiffelKitPilotOperation(operation, at + 1e-10).pose.position;
        expect(Math.hypot(...before.map((value, axis) => value - after[axis]!))).toBeLessThan(1e-6);
      }
      const t = operation.start + (operation.end - operation.start) * 0.63;
      const expected = sampleEiffelKitPilotOperation(operation, t);
      sampleEiffelKitPilotOperation(operation, operation.end);
      expect(sampleEiffelKitPilotOperation(operation, t)).toEqual(expected);
    }
  });

  it('never operates more than one crane per pillar and gates every unproved kit member', () => {
    for (let index = 0; index <= 500; index += 1) {
      const t = index / 500;
      const active = plan.operations.filter(operation => t >= operation.start && t < operation.end);
      expect(active.length).toBeLessThanOrEqual(4);
      expect(new Set(active.map(operation => operation.part.leg)).size).toBe(active.length);
    }
    const pilotIds = new Set(plan.operations.map(operation => operation.part.id));
    for (const part of manifest.parts) {
      const state = eiffelKitPilotStateAt(plan, part, 0.2);
      if (part.group !== 'foundation' && !pilotIds.has(part.id)) expect(state.phase).toBe('queued');
    }
  });
});
