import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { createEiffelProductionPlan, sampleEiffelProductionOperation } from '../src/engine/eiffelProductionConstruction';
import { eiffelFoundationFootprints, sampleEiffelFoundationRoute, EIFFEL_FOUNDATION_YARD } from '../src/engine/eiffelFoundationRoute';
import { transformedRigidBounds } from '../src/engine/eiffelRigid';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';
const manifest = JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8')) as EiffelKitManifest;
const plan = createEiffelProductionPlan(manifest);
const foundations = plan.operations.filter(op => op.part.group === 'foundation');
const footprints = eiffelFoundationFootprints(manifest.parts);

describe('Eiffel foundation ground corridors', () => {
  it('routes the reported .0457410714 collision around completed bearing masonry', () => {
    const op = plan.byPart.get('foundation-se-0-m000-c012')!;
    const sample = sampleEiffelProductionOperation(op, .045741071428571395);
    expect(sample.phase).toBe('haul');
    const obstacle = plan.byPart.get('foundation-se-2-m000-c031')!.part;
    const bounds = transformedRigidBounds(sample.pose, op.part.localBounds.min, op.part.localBounds.max);
    expect(bounds.max[0] < obstacle.boundsMin[0] || bounds.min[0] > obstacle.boundsMax[0] || bounds.max[2] < obstacle.boundsMin[2] || bounds.min[2] > obstacle.boundsMax[2]).toBe(true);
    expect(op.foundationRoute!.points.length).toBeGreaterThan(2);
  });

  it('keeps every complete cargo/carrier envelope clear of all sixteen bearing footprints, including future masonry', () => {
    expect(foundations).toHaveLength(896); expect(footprints).toHaveLength(16);
    let minimumClearance = Infinity, worst = '';
    for (const op of foundations) {
      const route = op.foundationRoute!;
      // Dense half-metre travel intervals in addition to exact endpoints.
      const count = Math.max(100, Math.ceil(route.length / .5));
      for (let i = 0; i <= count; i++) {
        const pose = sampleEiffelFoundationRoute(route, i / count, op.part);
        const [x, y, z] = pose.position;
        for (const footprint of footprints) {
          const dx = Math.max(footprint.min[0] - x, 0, x - footprint.max[0]);
          const dz = Math.max(footprint.min[1] - z, 0, z - footprint.max[1]);
          const clearance = Math.hypot(dx, dz) - route.footprintRadius;
          if (clearance < minimumClearance) { minimumClearance = clearance; worst = `${op.part.id}@${i / count} vs ${footprint.id}`; }
        }
        if (Math.abs(y + op.part.localBounds.min[1] - eiffelTerrainHeightAt(x, z) - .6) > 1e-8) throw new Error(`Terrain contact lost: ${op.part.id}`);
      }
    }
    expect(minimumClearance, worst).toBeGreaterThanOrEqual(EIFFEL_FOUNDATION_YARD.clearance - 1e-7);
  });

  it('preserves pickup/staging poses and tangent direction through rounded detours', () => {
    for (const op of foundations) {
      const route = op.foundationRoute!;
      expect(sampleEiffelFoundationRoute(route, 0, op.part).position).toEqual(op.pickup.position);
      const finish = sampleEiffelFoundationRoute(route, 1, op.part);
      finish.position.forEach((v, i) => expect(v).toBeCloseTo(op.staging.position[i]!, 7));
      expect(finish.quaternion).toEqual(op.staging.quaternion);
      for (let i = 1; i < route.segments.length; i++) {
        const a = route.segments[i - 1]!, b = route.segments[i]!;
        expect(a.b).toEqual(b.a);
        const ac = a.control ?? a.a, bc = b.control ?? b.b;
        const ax = a.b[0] - ac[0], az = a.b[1] - ac[1], bx = bc[0] - b.a[0], bz = bc[1] - b.a[1];
        const dot = (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz));
        expect(dot).toBeCloseTo(1, 8);
      }
      const before = sampleEiffelProductionOperation(op, op.start + (op.end - op.start) * (.36 - 1e-6));
      const after = sampleEiffelProductionOperation(op, op.start + (op.end - op.start) * .36);
      expect(Math.hypot(...before.pose.position.map((v, i) => v - after.pose.position[i]!))).toBeLessThan(1e-5);
    }
  });
});
