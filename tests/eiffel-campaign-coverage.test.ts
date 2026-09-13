import { describe, expect, it } from 'vitest';
import type { EiffelKitPart } from '../src/data/eiffelKitTypes';
import type { EiffelProductionOperation } from '../src/engine/eiffelProductionConstruction';
import { EiffelOccupancy } from '../src/engine/eiffelOccupancy';
import {
  fitEiffelCampaignOperation,
  type EiffelCoverageCampaign,
} from '../src/engine/eiffelCampaignCoverage';
import { sampleEiffelUpperRoute } from '../src/engine/eiffelUpperClearance';
import type { RigidVec3 } from '../src/engine/eiffelRigid';
function box(id: string, center: RigidVec3, size: RigidVec3): EiffelKitPart {
  const min: RigidVec3 = [-size[0] / 2, -size[1] / 2, -size[2] / 2],
    max: RigidVec3 = [size[0] / 2, size[1] / 2, size[2] / 2];
  return {
    id,
    stage: 1,
    leg: 'ne',
    group: 'leg',
    sourceMember: id,
    sourceGroup: id,
    material: 'iron',
    shape: 'box',
    handling: 'two-leg-sling',
    center,
    boundsMin: [center[0] + min[0], center[1] + min[1], center[2] + min[2]],
    boundsMax: [center[0] + max[0], center[1] + max[1], center[2] + max[2]],
    finalPose: { position: center, quaternion: [0, 0, 0, 1] },
    localBounds: { min, max },
    transportSize: size,
    pickupLugs: [
      [0, max[1], -0.3],
      [0, max[1], 0.3],
    ],
    connectionAnchors: [[0, min[1], 0]],
    connectionKind: 'bolted-joint',
    requiresAuthoredSupportAndRoute: true,
  };
}
const support = box('support', [-4, -1, 0], [12, 2, 12]);
const campaign: EiffelCoverageCampaign = {
  id: 'trial',
  seedPartId: 'load-a',
  supportPartId: support.id,
  station: { base: [-4, 0, 0], mastHeight: 22, boomLength: 8.4 },
  receiver: {
    center: [-8, 2, 0],
    size: [3.1, 0.3, 6.5],
    saddles: [
      [-4, 0, -0.3],
      [-4, 0, 0.3],
    ],
  },
  bracket: null,
  assignments: [],
};
const op = (part: EiffelKitPart, start = 0.1, end = 0.14) =>
  ({ part, start, end }) as EiffelProductionOperation;
describe('offline fixed-station campaign fitting', () => {
  it('measures a 12 m reach envelope without silently ignoring its historical inner limit', () => {
    const load = box('ten-metre-load', [6, 4, 0], [0.2, 0.2, 1]);
    const occupancy = new EiffelOccupancy([{ part: support, end: 0 }]);
    expect(
      fitEiffelCampaignOperation(campaign, op(load), occupancy).reason,
    ).toBe('crane-reach-or-headroom');
    const longer: EiffelCoverageCampaign = {
      ...campaign,
      station: { ...campaign.station, boomLength: Math.hypot(12, 6) },
      reachRange: [0, 12],
    };
    expect(fitEiffelCampaignOperation(longer, op(load), occupancy).reason).toBe(
      'clear',
    );
    // Its inherited receiver is only4 m from the pivot; this cannot pass the5.5 m inner limit.
    expect(
      fitEiffelCampaignOperation(
        { ...longer, reachRange: [5.5, 12] },
        op(load),
        occupancy,
      ).reason,
    ).toBe('crane-reach-or-headroom');
  });
  it('keeps the exact same station and receiver while serving adjacent reachable loads', () => {
    const first = box('load-a', [0, 4, -1], [0.2, 0.2, 1]),
      second = box('load-b', [0, 4, 1], [0.2, 0.2, 1]);
    const occupancy = new EiffelOccupancy([
      { part: support, end: 0 },
      { part: first, end: 0.14 },
    ]);
    const snapshot = JSON.stringify(campaign),
      a = fitEiffelCampaignOperation(campaign, op(first), occupancy),
      b = fitEiffelCampaignOperation(
        campaign,
        op(second, 0.2, 0.24),
        occupancy,
      );
    expect(a.reason).toBe('clear');
    expect(b.reason).toBe('clear');
    expect(JSON.stringify(campaign)).toBe(snapshot);
    expect(a.assignment!.pickup.position[0]).toBe(
      b.assignment!.pickup.position[0],
    );
    expect(a.assignment!.pickup.position[2]).toBe(
      b.assignment!.pickup.position[2],
    );
    expect(
      sampleEiffelUpperRoute(
        b.assignment!.route,
        b.assignment!.pickup,
        second.finalPose,
        campaign.station,
        1,
      ),
    ).toEqual(second.finalPose);
  });
  it('rejects persistent equipment when later completed iron occupies its receiver', () => {
    const load = box('load', [0, 4, 0], [0.2, 0.2, 1]),
      later = box('later', [-8, 2, 0], [1, 1, 1]);
    const occupancy = new EiffelOccupancy([
      { part: support, end: 0 },
      { part: later, end: 0.15 },
    ]);
    expect(
      fitEiffelCampaignOperation(campaign, op(load), occupancy).reason,
    ).toBe('clear');
    expect(
      fitEiffelCampaignOperation(campaign, op(load, 0.2, 0.24), occupancy)
        .reason,
    ).toBe('receiver-occupied');
  });
  it('does not claim unsupported or out-of-reach station reuse', () => {
    const load = box('far-load', [12, 4, 0], [0.2, 0.2, 1]);
    expect(
      fitEiffelCampaignOperation(
        campaign,
        op(load),
        new EiffelOccupancy([{ part: support, end: 0.2 }]),
      ).reason,
    ).toBe('support-not-completed');
    expect(
      fitEiffelCampaignOperation(
        campaign,
        op(load),
        new EiffelOccupancy([{ part: support, end: 0 }]),
      ).reason,
    ).toBe('crane-reach-or-headroom');
  });
});
