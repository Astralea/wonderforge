import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import {
  createEiffelProductionPlan,
  sampleEiffelProductionOperation,
} from '../src/engine/eiffelProductionConstruction';
import { transformedRigidBounds } from '../src/engine/eiffelRigid';
const manifest = JSON.parse(
  readFileSync(
    'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    'utf8',
  ),
) as EiffelKitManifest;
const plan = createEiffelProductionPlan(manifest);
describe('Eiffel bounded full production schedule', () => {
  it('schedules every individual kit piece in topological stage order', () => {
    expect(plan.operations).toHaveLength(manifest.parts.length);
    const index = new Map(plan.operations.map((o, i) => [o.part.id, i]));
    for (const op of plan.operations)
      if (op.bracket)
        for (const dependency of op.bracket.dependencyPartIds)
          expect(index.get(dependency)!).toBeLessThan(index.get(op.part.id)!);
  });
  it('uses at most four short fixed cranes and exact final poses', () => {
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const active = plan.operations.filter(
        (o) => o.station && t >= o.start && t < o.end,
      );
      expect(active.length).toBeLessThanOrEqual(4);
      for (const op of active) {
        const s = sampleEiffelProductionOperation(op, t);
        if (s.crane) {
          expect(s.crane.boomLength).toBe(8.4);
          expect(s.crane.horizontalReach).toBeLessThanOrEqual(8.4);
        }
      }
    }
    for (const op of plan.operations)
      expect(sampleEiffelProductionOperation(op, op.end).pose).toEqual(
        op.part.finalPose,
      );
  });
  it('keeps foundation cargo on a carrier until the derrick rope attaches', () => {
    for (const op of plan.operations.filter(
      (o) => o.part.group === 'foundation',
    )) {
      for (const fraction of [0.001, 0.2, 0.359, 0.4, 0.459]) {
        const haul = sampleEiffelProductionOperation(
          op,
          op.start + (op.end - op.start) * fraction,
        );
        expect(haul.carrier).not.toBeNull();
        const bottom = transformedRigidBounds(
          haul.pose,
          op.part.localBounds.min,
          op.part.localBounds.max,
        ).min[1];
        expect(bottom).toBeCloseTo(
          haul.carrier!.center[1] + haul.carrier!.size[1] / 2,
          8,
        );
        expect(bottom).toBeCloseTo(haul.carrier!.supportY + 0.6, 8);
        expect(haul.crane).toBeNull();
      }
      const lift = sampleEiffelProductionOperation(
        op,
        op.start + (op.end - op.start) * 0.55,
      );
      expect(lift.phase).toBe('hoist');
      expect(lift.carrier).toBeNull();
      expect(lift.crane).not.toBeNull();
    }
  });
  it('gives every upper pickup a visible receiver tied to two real-face saddles', () => {
    for (const op of plan.operations.filter(
      (o) => o.part.group !== 'foundation',
    )) {
      if(op.assemblyParentId){for(const fraction of[.001,.06,.119])expect(sampleEiffelProductionOperation(op,op.start+(op.end-op.start)*fraction)).toMatchObject({carrier:null,receiver:null,crane:null,bracket:null});continue;}
      expect(op.receiver).not.toBeNull();
      expect(op.receiver!.saddles).toHaveLength(2);
      for (const fraction of [0.001, 0.06, 0.119]) {
        const staged = sampleEiffelProductionOperation(
          op,
          op.start + (op.end - op.start) * fraction,
        );
        expect(staged.phase).toBe('staged');
        expect(staged.carrier).not.toBeNull();
        const bottom = transformedRigidBounds(
          staged.pose,
          op.part.localBounds.min,
          op.part.localBounds.max,
        ).min[1];
        expect(bottom).toBeCloseTo(
          staged.carrier!.center[1] + staged.carrier!.size[1] / 2,
          8,
        );
        expect(bottom).toBeCloseTo(staged.carrier!.supportY + (op.part.id === 'summit-crown-m072-c000' ? .24 : .6), 8);
        expect(staged.receiver).toBe(op.receiver);
        expect(staged.crane).toBeNull();
      }
    }
  });
  it('keeps every moving cargo envelope clear of its fixed mast', () => {
    for (const op of plan.operations) {
      for (const fraction of [0.47, 0.55, 0.68, 0.76]) {
        const sample = sampleEiffelProductionOperation(
          op,
          op.start + (op.end - op.start) * fraction,
        );
        if (!sample.crane) continue;
        const bounds = transformedRigidBounds(
          sample.pose,
          op.part.localBounds.min,
          op.part.localBounds.max,
        );
        const [x, , z] = op.station!.base;
        const dx = Math.max(bounds.min[0] - x, 0, x - bounds.max[0]);
        const dz = Math.max(bounds.min[2] - z, 0, z - bounds.max[2]);
        expect(Math.hypot(dx, dz), `${op.part.id}@${fraction}`).toBeGreaterThan(
          0.17,
        );
      }
    }
  });
  it('keeps every temporary bracket finite and at most four metres', () => {
    for (const op of plan.operations.filter((o) => o.bracket)) {
      expect(op.bracket!.extension).toBeGreaterThan(0);
      expect(op.bracket!.extension).toBeLessThanOrEqual(4);
      expect(op.bracket!.saddle.every(Number.isFinite)).toBe(true);
    }
  });
});
