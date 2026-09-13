import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import {
  createEiffelProductionPlan,
  sampleEiffelProductionOperation,
} from '../src/engine/eiffelProductionConstruction';
import {
  EiffelOccupancy,
  eiffelAxisBox,
  eiffelBoxPenetration,
  eiffelSolidBox,
} from '../src/engine/eiffelOccupancy';
import { auditEiffelStationMap } from '../src/engine/eiffelStationMap';
import { eiffelReceiverBeamBox } from '../src/engine/eiffelUpperClearance';
import {
  invertRigidPose,
  transformRigidPoint,
  transformedRigidBounds,
} from '../src/engine/eiffelRigid';
const manifest = JSON.parse(
  readFileSync(
    'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    'utf8',
  ),
) as EiffelKitManifest;
const plan = createEiffelProductionPlan(manifest);
const stationMap = auditEiffelStationMap(manifest);
const occupancy = new EiffelOccupancy(
  plan.operations.map((o) => ({ part: o.part, end: o.end })),
);
describe('first-floor completed-solid clearance', () => {
  it('separates true oriented-solid intersections from boundary contact and loose AABBs', () => {
    const a = eiffelAxisBox([0, 0, 0], [2, 2, 2]);
    expect(eiffelBoxPenetration(a, eiffelAxisBox([2, 0, 0], [2, 2, 2]))).toBe(
      0,
    );
    expect(
      eiffelBoxPenetration(a, eiffelAxisBox([1.5, 0, 0], [2, 2, 2])),
    ).toBeCloseTo(0.5, 10);
    const slender = {
      localBounds: {
        min: [-0.05, -0.05, -2] as const,
        max: [0.05, 0.05, 2] as const,
      },
    };
    const q = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)] as const;
    const one = eiffelSolidBox(slender, { position: [0, 0, 0], quaternion: q }),
      two = eiffelSolidBox(slender, {
        position: [0.5, 0, -0.5],
        quaternion: q,
      });
    expect(eiffelBoxPenetration(one, two)).toBe(0);
  });
  it('clears the independently verified 1.875 m hoist penetration', () => {
    const op = plan.byPart.get('platform-1-0-01-m000-c004')!,
      other = plan.byPart.get('platform-1-0-00-m000-c010')!;
    expect(op.upperClearance).toBe('sampled-clear');
    // Captured old pose at t=.3054678805970198: retain the actual failure,
    // then follow this operation's new dependency-aware time interval.
    const oldPose = {
      position: [
        -27.15016222847987, 58.50520539438061, -27.700000762939453,
      ] as const,
      quaternion: [0.6091887057242374, 0, 0, 0.7930252964553076] as const,
    };
    expect(
      eiffelBoxPenetration(
        eiffelSolidBox(op.part, oldPose),
        eiffelSolidBox(other.part, other.part.finalPose),
      ),
    ).toBeCloseTo(1.8748105348718571, 6);
    const t = op.start + (op.end - op.start) * 0.2,
      s = sampleEiffelProductionOperation(op, t);
    expect(s.phase).toBe('hoist');
    expect(other.end).toBeLessThan(t);
    expect(
      eiffelBoxPenetration(
        eiffelSolidBox(op.part, s.pose),
        eiffelSolidBox(other.part, other.part.finalPose),
      ),
    ).toBe(0);
    // Raising retains the initial attitude. Rotation starts only after a clear lift.
    const p = sampleEiffelProductionOperation(
      op,
      op.start + (op.end - op.start) * 0.2,
    );
    expect(p.pose.quaternion).toEqual(op.pickup.quaternion);
  });
  it('places the reported embedded receiving deck outside the completed arch and other solids', () => {
    const op = plan.byPart.get('platform-1-0-01-m000-c002')!;
    const arch = plan.byPart.get('arch-0-14-m011-c000')!;
    const oldDeck = eiffelAxisBox(
      [-15.106064989516305, 51.48577266249328, -31.233506218656217],
      [2.839999961853027, 0.3, 5.433333396911621],
    );
    expect(
      eiffelBoxPenetration(
        oldDeck,
        eiffelSolidBox(arch.part, arch.part.finalPose),
      ),
    ).toBeCloseTo(1.317370048089011, 6);
    const s = sampleEiffelProductionOperation(
      op,
      op.start + (op.end - op.start) * 0.05,
    );
    expect(op.upperClearance).toBe('sampled-clear');
    expect(s.phase).toBe('staged');
    expect(
      occupancy.penetration(
        eiffelAxisBox(s.receiver!.center, s.receiver!.size),
        op.start,
      ),
    ).toBeLessThanOrEqual(1e-5);
    const bounds = transformedRigidBounds(
      s.pose,
      op.part.localBounds.min,
      op.part.localBounds.max,
    );
    expect(bounds.min[1]).toBeCloseTo(
      s.carrier!.center[1] + s.carrier!.size[1] / 2,
      8,
    );
    expect(s.carrier!.supportY).toBeCloseTo(
      s.receiver!.center[1] + s.receiver!.size[1] / 2,
      8,
    );
  });
  it('validates each accepted first-floor route at independent phase samples', () => {
    const corrected = plan.operations.filter((o) => o.upperRoute);
    expect(corrected.length).toBeGreaterThan(1000);
    for (const op of corrected) {
      const supportId = stationMap.candidates.get(op.part.id)!.supportPartId;
      const support = occupancy.byPart.get(supportId)!.part;
      for (const saddle of op.receiver!.saddles) {
        const local = transformRigidPoint(
          invertRigidPose(support.finalPose),
          saddle,
        );
        for (let axis = 0; axis < 3; axis++) {
          expect(local[axis]!).toBeGreaterThanOrEqual(
            support.localBounds.min[axis]! - 1e-5,
          );
          expect(local[axis]!).toBeLessThanOrEqual(
            support.localBounds.max[axis]! + 1e-5,
          );
        }
        expect(
          local.some(
            (v, i) =>
              Math.min(
                Math.abs(v - support.localBounds.min[i]!),
                Math.abs(v - support.localBounds.max[i]!),
              ) < 1e-5,
          ),
        ).toBe(true);
        expect(
          occupancy.penetration(
            eiffelReceiverBeamBox(saddle, op.receiver!.center, 0.075),
            op.start,
            supportId,
          ),
        ).toBeLessThanOrEqual(1e-5);
      }
      for (const fraction of [
        0.013, 0.197, 0.253, 0.347, 0.413, 0.527, 0.659, 0.777, 0.829, 0.913,
        0.971,
      ]) {
        const t = op.start + (op.end - op.start) * fraction,
          s = sampleEiffelProductionOperation(op, t),
          box = eiffelSolidBox(op.part, s.pose);
        for (const neighbor of occupancy.nearby(box, t)) {
          const depth = eiffelBoxPenetration(box, neighbor.box);
          const allowed =
            fraction >= 0.78
              ? eiffelBoxPenetration(
                  eiffelSolidBox(op.part, op.part.finalPose),
                  neighbor.box,
                )
              : 0;
          expect(
            depth,
            `${op.part.id}@${fraction} vs ${neighbor.part.id}`,
          ).toBeLessThanOrEqual(allowed + 1e-5);
        }
        if (s.crane) {
          expect(s.crane.horizontalReach).toBeLessThanOrEqual(8.4);
          expect(s.crane.ropeLength).toBeGreaterThan(0);
        }
      }
      const final = sampleEiffelProductionOperation(op, op.end);
      expect(final.pose).toEqual(op.part.finalPose);
    }
  }, 30000);
});
