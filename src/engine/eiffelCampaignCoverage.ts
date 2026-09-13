/** Offline-only fixed-station campaign feasibility study. Not a production rig schedule. */
import type { EiffelKitManifest, EiffelKitPart } from '../data/eiffelKitTypes';
import type {
  EiffelProductionOperation,
  EiffelProductionPlan,
} from './eiffelProductionConstruction';
import type { EiffelCraneStation } from './eiffelCrane';
import {
  auditEiffelStationMap,
  type EiffelStationBracket,
} from './eiffelStationMap';
import {
  EiffelOccupancy,
  eiffelAxisBox,
  eiffelSolidBox,
  eiffelBoxPenetration,
  type EiffelSolidBox,
} from './eiffelOccupancy';
import {
  planEiffelUpperClearance,
  sampleEiffelUpperRoute,
  eiffelReceiverBeamBox,
  type EiffelUpperRoute,
  type EiffelUpperReceiver,
} from './eiffelUpperClearance';
import {
  invertRigidPose,
  transformRigidPoint,
  type RigidPose,
  type RigidVec3,
} from './eiffelRigid';
export interface EiffelCampaignAssignment {
  readonly partId: string;
  readonly originalStart: number;
  readonly originalEnd: number;
  readonly pickup: RigidPose;
  readonly route: EiffelUpperRoute;
}
export interface EiffelCoverageCampaign {
  readonly id: string;
  readonly seedPartId: string;
  readonly supportPartId: string;
  readonly station: EiffelCraneStation;
  readonly receiver: EiffelUpperReceiver;
  readonly bracket: EiffelStationBracket | null;
  readonly reachRange?: readonly [number, number];
  readonly assignments: readonly EiffelCampaignAssignment[];
}
export interface EiffelCampaignCoverage {
  readonly constructionReady: false;
  readonly leg: 'ne' | 'nw' | 'se' | 'sw';
  readonly stageRange: readonly [number, number];
  readonly receiverPolicy: 'seed' | 'max-bounded';
  readonly reachPolicy:
    'authored8.4' | 'historical12-envelope' | 'historical5.5-12';
  readonly considered: number;
  readonly covered: number;
  readonly uncovered: readonly { partId: string; reason: string }[];
  readonly campaigns: readonly EiffelCoverageCampaign[];
  readonly diagnostics: Readonly<Record<string, number>>;
  readonly relocations: readonly {
    fromCampaign: string;
    toCampaign: string;
    distance: number;
    verticalRise: number;
    hasAuthoredPath: false;
  }[];
  readonly originalTimeOverlaps: number;
}
const CONTACT = 1e-5;
const deckSize: RigidVec3 = [3.1, 0.3, 6.5];
function increment(counts: Record<string, number>, name: string) {
  counts[name] = (counts[name] ?? 0) + 1;
}
function onFace(part: EiffelKitPart, p: RigidVec3): boolean {
  const point = transformRigidPoint(invertRigidPose(part.finalPose), p),
    { min, max } = part.localBounds;
  return (
    point.every((v, i) => v >= min[i]! - CONTACT && v <= max[i]! + CONTACT) &&
    point.some(
      (v, i) =>
        Math.min(Math.abs(v - min[i]!), Math.abs(v - max[i]!)) <= CONTACT,
    )
  );
}
function fixedSolids(c: EiffelCoverageCampaign): EiffelSolidBox[] {
  const { base, mastHeight } = c.station;
  const result = [
    eiffelAxisBox(
      [base[0], base[1] + mastHeight / 2, base[2]],
      [0.34, mastHeight, 0.34],
    ),
    eiffelAxisBox(c.receiver.center, c.receiver.size),
    ...c.receiver.saddles.map((s) =>
      eiffelReceiverBeamBox(s, c.receiver.center, 0.075),
    ),
  ];
  if (c.bracket) {
    const [a, b] = c.bracket.saddles,
      t = c.bracket.tip,
      al: RigidVec3 = [a[0], a[1] - 0.55, a[2]],
      bl: RigidVec3 = [b[0], b[1] - 0.55, b[2]];
    result.push(
      eiffelReceiverBeamBox(a, t, 0.085),
      eiffelReceiverBeamBox(b, t, 0.085),
      eiffelReceiverBeamBox(a, b, 0.07),
      eiffelReceiverBeamBox(a, al, 0.065),
      eiffelReceiverBeamBox(b, bl, 0.065),
      eiffelReceiverBeamBox(al, t, 0.065),
      eiffelReceiverBeamBox(bl, t, 0.065),
    );
  }
  return result;
}
function staticClear(
  c: EiffelCoverageCampaign,
  t: number,
  occupancy: EiffelOccupancy,
): string | null {
  const support = occupancy.byPart.get(c.supportPartId);
  if (!support || support.end > t) return 'support-not-completed';
  if (!c.receiver.saddles.every((s) => onFace(support.part, s)))
    return 'saddle-off-face';
  if (c.bracket) {
    if (
      !c.bracket.saddles.every((s) => onFace(support.part, s)) ||
      Math.hypot(...c.bracket.tip.map((v, i) => v - c.station.base[i]!)) >
        CONTACT
    )
      return 'station-off-support';
  } else if (!onFace(support.part, c.station.base))
    return 'station-off-support';
  for (const [i, box] of fixedSolids(c).entries())
    if (
      occupancy.penetration(box, t, i === 1 ? undefined : c.supportPartId) >
      CONTACT
    )
      return i === 0
        ? 'mast-occupied'
        : i === 1
          ? 'receiver-occupied'
          : i < 4
            ? 'grillage-occupied'
            : 'bracket-occupied';
  return null;
}
/** Comparison geometry only: production EiffelCrane's authored8.4 m cap is unchanged. */
function campaignCraneReach(
  c: EiffelCoverageCampaign,
  pose: RigidPose,
  part: EiffelKitPart,
): boolean {
  const lugs = part.pickupLugs.map((lug) => transformRigidPoint(pose, lug));
  const x = lugs.reduce((sum, p) => sum + p[0], 0) / lugs.length,
    z = lugs.reduce((sum, p) => sum + p[2], 0) / lugs.length;
  const radius = Math.hypot(x - c.station.base[0], z - c.station.base[2]);
  const [minimum, maximum] = c.reachRange ?? [0, 8.4];
  if (radius < minimum || radius > maximum || radius >= c.station.boomLength)
    return false;
  const tipY =
    c.station.base[1] +
    c.station.mastHeight +
    Math.sqrt(c.station.boomLength ** 2 - radius ** 2);
  return tipY > Math.max(...lugs.map((p) => p[1])) + 1.5;
}
/** Fixed base, fixed mast, fixed deck and fixed saddle geometry for every accepted member. */
export function fitEiffelCampaignOperation(
  c: EiffelCoverageCampaign,
  op: EiffelProductionOperation,
  occupancy: EiffelOccupancy,
): { assignment: EiffelCampaignAssignment | null; reason: string } {
  const staticFailure = staticClear(c, op.start, occupancy);
  if (staticFailure) return { assignment: null, reason: staticFailure };
  const part = op.part;
  if (
    part.transportSize[0] + 0.5 > c.receiver.size[0] + CONTACT ||
    part.transportSize[2] + 0.5 > c.receiver.size[2] + CONTACT
  )
    return { assignment: null, reason: 'receiver-too-small' };
  const pickup: RigidPose = {
    position: [
      c.receiver.center[0],
      c.receiver.center[1] + 0.75 - part.localBounds.min[1],
      c.receiver.center[2],
    ],
    quaternion: [0, 0, 0, 1],
  };
  const neighbors = occupancy.nearby(
    eiffelAxisBox(part.center, [36, 32, 36]),
    op.start,
  );
  const top = Math.max(
    part.boundsMax[1],
    ...neighbors.map((s) => s.part.boundsMax[1]),
  );
  const radius = Math.hypot(
    ...part.localBounds.max.map((v, i) =>
      Math.max(Math.abs(v), Math.abs(part.localBounds.min[i]!)),
    ),
  );
  const y = Math.max(pickup.position[1] + 0.3, top + radius + 0.35);
  const raised: RigidPose = {
    position: [pickup.position[0], y, pickup.position[2]],
    quaternion: pickup.quaternion,
  };
  const final = eiffelSolidBox(part, part.finalPose),
    solids = fixedSolids(c);
  let reason = 'route-occupied';
  for (const direction of [1, -1] as const) {
    const route: EiffelUpperRoute = {
      raised,
      turned: { ...raised, quaternion: part.finalPose.quaternion },
      approach: {
        position: [part.center[0], y, part.center[2]],
        quaternion: part.finalPose.quaternion,
      },
      direction,
      validatedSamples: 97,
    };
    let clear = true;
    for (let i = 0; i <= 96; i++) {
      const p = i / 96,
        pose = sampleEiffelUpperRoute(
          route,
          pickup,
          part.finalPose,
          c.station,
          p,
        ),
        moving = eiffelSolidBox(part, pose),
        t = op.start + (op.end - op.start) * Math.min(p, 0.999999);
      if (!campaignCraneReach(c, pose, part)) {
        reason = 'crane-reach-or-headroom';
        clear = false;
        break;
      }
      for (const box of solids)
        if (eiffelBoxPenetration(moving, box) > CONTACT) {
          reason = 'cargo-hits-campaign-equipment';
          clear = false;
          break;
        }
      if (!clear) break;
      for (const solid of occupancy.nearby(moving, t)) {
        const actual = eiffelBoxPenetration(moving, solid.box),
          allowed = p >= 0.78 ? eiffelBoxPenetration(final, solid.box) : 0;
        if (actual > allowed + CONTACT) {
          reason = 'cargo-hits-completed-iron';
          clear = false;
          break;
        }
      }
      if (!clear) break;
    }
    if (clear) {
      // The newly seated member must not bury equipment that is supposed to persist.
      if (solids.some((box) => eiffelBoxPenetration(final, box) > CONTACT))
        return { assignment: null, reason: 'final-member-buries-equipment' };
      return {
        assignment: {
          partId: part.id,
          originalStart: op.start,
          originalEnd: op.end,
          pickup,
          route,
        },
        reason: 'clear',
      };
    }
  }
  return { assignment: null, reason };
}
export function planEiffelCampaignCoverage(
  manifest: EiffelKitManifest,
  production: EiffelProductionPlan,
  options: {
    leg?: 'ne' | 'nw' | 'se' | 'sw';
    stages?: readonly [number, number];
    lookahead?: number;
    receiverPolicy?: 'seed' | 'max-bounded';
    reachPolicy?: 'authored8.4' | 'historical12-envelope' | 'historical5.5-12';
  } = {},
): EiffelCampaignCoverage {
  const leg = options.leg ?? 'ne',
    stageRange = options.stages ?? [1, 9],
    lookahead = options.lookahead ?? 4,
    receiverPolicy = options.receiverPolicy ?? 'seed',
    reachPolicy = options.reachPolicy ?? 'authored8.4';
  const ops = production.operations
    .filter(
      (o) =>
        o.part.leg === leg &&
        o.part.stage >= stageRange[0] &&
        o.part.stage <= stageRange[1],
    )
    .sort((a, b) => a.start - b.start || a.part.id.localeCompare(b.part.id));
  const occupancy = new EiffelOccupancy(
      production.operations.map((o) => ({ part: o.part, end: o.end })),
    ),
    stations = auditEiffelStationMap(manifest);
  const campaigns: EiffelCoverageCampaign[] = [],
    uncovered: { partId: string; reason: string }[] = [],
    diagnostics: Record<string, number> = {};
  let active: EiffelCoverageCampaign | null = null;
  for (let index = 0; index < ops.length; index++) {
    const op = ops[index]!;
    if (active) {
      const reused = fitEiffelCampaignOperation(active, op, occupancy);
      if (reused.assignment) {
        (active.assignments as EiffelCampaignAssignment[]).push(
          reused.assignment,
        );
        increment(diagnostics, 'reused-fixed-station');
        continue;
      }
      increment(diagnostics, `reuse:${reused.reason}`);
      active = null;
    }
    let lastReason = 'no-clear-seed';
    for (const seed of ops.slice(index, index + lookahead)) {
      if (!seed.station || !seed.receiver) continue;
      const candidate = stations.candidates.get(seed.part.id)!;
      if (occupancy.byPart.get(candidate.supportPartId)!.end > op.start) {
        increment(diagnostics, 'seed:support-not-completed');
        continue;
      }
      const dx = seed.pickup.position[0] - seed.station.base[0],
        dz = seed.pickup.position[2] - seed.station.base[2],
        length = Math.hypot(dx, dz) || 1;
      const seedPickup: RigidPose =
        reachPolicy === 'historical5.5-12'
          ? {
              ...seed.pickup,
              position: [
                seed.station.base[0] + (dx / length) * 6.5,
                seed.pickup.position[1],
                seed.station.base[2] + (dz / length) * 6.5,
              ],
            }
          : seed.pickup;
      const correction = planEiffelUpperClearance(
        {
          part: op.part,
          start: op.start,
          end: op.end,
          station: seed.station,
          pickup: seedPickup,
          receiver: {
            ...seed.receiver,
            size: receiverPolicy === 'seed' ? seed.receiver.size : deckSize,
          },
          supportPartId: candidate.supportPartId,
        },
        occupancy,
      );
      if (!correction) {
        increment(diagnostics, 'seed:no-clear-receiver-and-route');
        lastReason = 'no-clear-receiver-and-route';
        continue;
      }
      const campaign: EiffelCoverageCampaign = {
        id: `campaign-${leg}-${campaigns.length}`,
        seedPartId: seed.part.id,
        supportPartId: candidate.supportPartId,
        station: {
          ...correction.station,
          mastHeight: 22,
          boomLength: reachPolicy === 'authored8.4' ? 8.4 : Math.hypot(12, 6),
        },
        reachRange:
          reachPolicy === 'authored8.4'
            ? [0, 8.4]
            : reachPolicy === 'historical12-envelope'
              ? [0, 12]
              : [5.5, 12],
        receiver: correction.receiver,
        bracket: seed.bracket,
        assignments: [],
      };
      const fitted = fitEiffelCampaignOperation(campaign, op, occupancy);
      if (!fitted.assignment) {
        increment(diagnostics, `seed:${fitted.reason}`);
        lastReason = fitted.reason;
        continue;
      }
      (campaign.assignments as EiffelCampaignAssignment[]).push(
        fitted.assignment,
      );
      campaigns.push(campaign);
      active = campaign;
      break;
    }
    if (!active) uncovered.push({ partId: op.part.id, reason: lastReason });
  }
  const relocations = campaigns.slice(1).map((c, i) => {
    const prior = campaigns[i]!;
    return {
      fromCampaign: prior.id,
      toCampaign: c.id,
      distance: Math.hypot(
        ...c.station.base.map((v, a) => v - prior.station.base[a]!),
      ),
      verticalRise: c.station.base[1] - prior.station.base[1],
      hasAuthoredPath: false as const,
    };
  });
  let originalTimeOverlaps = 0;
  for (const c of campaigns)
    for (let i = 1; i < c.assignments.length; i++)
      if (c.assignments[i]!.originalStart < c.assignments[i - 1]!.originalEnd)
        originalTimeOverlaps++;
  return {
    constructionReady: false,
    leg,
    stageRange,
    receiverPolicy,
    reachPolicy,
    considered: ops.length,
    covered: ops.length - uncovered.length,
    uncovered,
    campaigns,
    diagnostics,
    relocations,
    originalTimeOverlaps,
  };
}
