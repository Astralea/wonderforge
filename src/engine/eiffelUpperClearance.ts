import type { EiffelKitPart } from '../data/eiffelKitTypes';
import type { EiffelCraneStation } from './eiffelCrane';
import { sampleEiffelCrane } from './eiffelCrane';
import {
  EiffelOccupancy,
  eiffelAxisBox,
  eiffelSolidBox,
  eiffelBoxPenetration,
  type EiffelSolidBox,
} from './eiffelOccupancy';
import {
  interpolateRigidPose,
  invertRigidPose,
  transformRigidPoint,
  type RigidPose,
  type RigidVec3,
} from './eiffelRigid';
export interface EiffelUpperRoute {
  readonly raised: RigidPose;
  readonly turned: RigidPose;
  readonly approach: RigidPose;
  readonly direction: 1 | -1;
  readonly validatedSamples: number;
}
export interface EiffelUpperReceiver {
  readonly center: RigidVec3;
  readonly size: RigidVec3;
  readonly saddles: readonly [RigidVec3, RigidVec3];
}
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
/** Separate lifting, turning and slewing so rotation never dips through a low receiver. */
export function sampleEiffelUpperRoute(
  route: EiffelUpperRoute,
  pickup: RigidPose,
  final: RigidPose,
  station: EiffelCraneStation,
  p: number,
): RigidPose {
  if (p < 0.12) return pickup;
  if (p < 0.22)
    return interpolateRigidPose(pickup, route.raised, smooth((p - 0.12) / 0.1));
  if (p < 0.36)
    return interpolateRigidPose(
      route.raised,
      route.turned,
      smooth((p - 0.22) / 0.14),
    );
  if (p < 0.78) {
    const t = smooth((p - 0.36) / 0.42),
      a = route.turned.position,
      b = route.approach.position;
    const ax = a[0] - station.base[0],
      az = a[2] - station.base[2],
      bx = b[0] - station.base[0],
      bz = b[2] - station.base[2];
    const start = Math.atan2(az, ax);
    let delta = Math.atan2(bz, bx) - start;
    while (delta < 0) delta += Math.PI * 2;
    while (delta >= Math.PI * 2) delta -= Math.PI * 2;
    if (route.direction < 0 && delta > 0) delta -= Math.PI * 2;
    const radius =
      Math.hypot(ax, az) + (Math.hypot(bx, bz) - Math.hypot(ax, az)) * t;
    return {
      position: [
        station.base[0] + Math.cos(start + delta * t) * radius,
        a[1] + (b[1] - a[1]) * t,
        station.base[2] + Math.sin(start + delta * t) * radius,
      ],
      quaternion: final.quaternion,
    };
  }
  return interpolateRigidPose(route.approach, final, smooth((p - 0.78) / 0.22));
}
export function eiffelReceiverBeamBox(
  a: RigidVec3,
  b: RigidVec3,
  r: number,
): EiffelSolidBox {
  const d: RigidVec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    length = Math.hypot(...d),
    u: RigidVec3 = [d[0] / length, d[1] / length, d[2] / length];
  const ll = Math.hypot(u[0], u[2]),
    v: RigidVec3 = ll > 1e-8 ? [u[2] / ll, 0, -u[0] / ll] : [1, 0, 0],
    w: RigidVec3 = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
  return {
    center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    half: [length / 2, r, r],
    axes: [u, v, w],
  };
}
/** Reject actual completed solids; allow final authored joints only during seating,
 * bounded by their final overlap. No same-source blanket exemption. */
function cargoClear(
  occupancy: EiffelOccupancy,
  part: EiffelKitPart,
  pose: RigidPose,
  t: number,
  lower: boolean,
): boolean {
  const moving = eiffelSolidBox(part, pose),
    final = eiffelSolidBox(part, part.finalPose);
  for (const s of occupancy.nearby(moving, t)) {
    const depth = eiffelBoxPenetration(moving, s.box);
    if (depth <= 1e-5) continue;
    if (!lower || depth > eiffelBoxPenetration(final, s.box) + 1e-5)
      return false;
  }
  return true;
}
function saddleVariants(
  receiver: EiffelUpperReceiver,
  support: EiffelKitPart,
): (readonly [RigidVec3, RigidVec3])[] {
  const variants: (readonly [RigidVec3, RigidVec3])[] = [receiver.saddles];
  const local = transformRigidPoint(
    invertRigidPose(support.finalPose),
    receiver.saddles[0],
  );
  const { min, max } = support.localBounds;
  const face = [0, 1, 2].find(
    (i) =>
      Math.min(Math.abs(local[i]! - min[i]!), Math.abs(local[i]! - max[i]!)) <
      1e-4,
  );
  if (face === undefined) return variants;
  const free = [0, 1, 2]
    .filter((i) => i !== face)
    .sort((a, b) => max[b]! - min[b]! - (max[a]! - min[a]!));
  const longitudinal = free[0]!,
    cross = free[1]!,
    extent = max[longitudinal]! - min[longitudinal]!;
  for (const f of [0.5, 0.2, 0.8, 0.35, 0.65])
    for (const transverse of [0.5, 0.15, 0.85]) {
      const center: [number, number, number] = [...local];
      center[longitudinal] = min[longitudinal]! + extent * f;
      center[cross] = min[cross]! + (max[cross]! - min[cross]!) * transverse;
      const a: [number, number, number] = [...center],
        b: [number, number, number] = [...center],
        half = Math.min(0.3, extent * 0.12);
      a[longitudinal] -= half;
      b[longitudinal] += half;
      variants.push([
        transformRigidPoint(support.finalPose, a),
        transformRigidPoint(support.finalPose, b),
      ]);
    }
  return variants;
}
export interface EiffelUpperPlanningInput {
  readonly part: EiffelKitPart;
  readonly start: number;
  readonly end: number;
  readonly station: EiffelCraneStation;
  readonly pickup: RigidPose;
  readonly receiver: EiffelUpperReceiver;
  readonly supportPartId: string;
}
export interface EiffelUpperCorrection {
  readonly route: EiffelUpperRoute;
  readonly pickup: RigidPose;
  readonly receiver: EiffelUpperReceiver;
  readonly station: EiffelCraneStation;
}
export function planEiffelUpperClearance(
  input: EiffelUpperPlanningInput,
  occupancy: EiffelOccupancy,
): EiffelUpperCorrection | null {
  const { part, start, end, receiver } = input;
  const neighbors = occupancy.nearby(
    eiffelAxisBox(
      [part.center[0], part.center[1], part.center[2]],
      [36, 32, 36],
    ),
    start,
  );
  const top = Math.max(
    part.boundsMax[1],
    ...neighbors.map((s) => s.part.boundsMax[1]),
  );
  const local = part.localBounds;
  const radius = Math.hypot(
    Math.max(Math.abs(local.min[0]), Math.abs(local.max[0])),
    Math.max(Math.abs(local.min[1]), Math.abs(local.max[1])),
    Math.max(Math.abs(local.min[2]), Math.abs(local.max[2])),
  );
  const y = top + Math.max(radius + 0.35, 0.95 - local.min[1] + 0.3);
  const base = input.station.base,
    theta = Math.atan2(
      input.pickup.position[2] - base[2],
      input.pickup.position[0] - base[0],
    );
  const r = Math.hypot(
    input.pickup.position[0] - base[0],
    input.pickup.position[2] - base[2],
  );
  const mast: EiffelCraneStation = { ...input.station, mastHeight: 22 };
  const mastBox = eiffelAxisBox(
    [base[0], base[1] + 11, base[2]],
    [0.34, 22, 0.34],
  );
  const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8];
  const support = occupancy.byPart.get(input.supportPartId)!.part;
  const saddleChoices = saddleVariants(receiver, support);
  for (const offset of offsets) {
    const angle = theta + (offset * Math.PI) / 8;
    const px = base[0] + Math.cos(angle) * r,
      pz = base[2] + Math.sin(angle) * r;
    let deck: EiffelUpperReceiver = {
      ...receiver,
      center: [px, top + 0.2, pz],
    };
    const deckBox = eiffelAxisBox(deck.center, deck.size);
    if (
      occupancy.penetration(deckBox, start) > 1e-5 ||
      eiffelBoxPenetration(deckBox, mastBox) > 1e-5
    )
      continue;
    const saddles = saddleChoices.find((pair) =>
      pair.every(
        (s) =>
          occupancy.penetration(
            eiffelReceiverBeamBox(s, deck.center, 0.075),
            start,
            input.supportPartId,
          ) <= 1e-5,
      ),
    );
    if (!saddles) continue;
    deck = { ...deck, saddles };
    const pickup: RigidPose = {
      position: [px, deck.center[1] + 0.75 - local.min[1], pz],
      quaternion: [0, 0, 0, 1],
    };
    const raised: RigidPose = {
        position: [px, y, pz],
        quaternion: pickup.quaternion,
      },
      turned: RigidPose = {
        position: [px, y, pz],
        quaternion: part.finalPose.quaternion,
      };
    for (const direction of [1, -1] as const) {
      const route: EiffelUpperRoute = {
        raised,
        turned,
        approach: {
          position: [part.finalPose.position[0], y, part.finalPose.position[2]],
          quaternion: part.finalPose.quaternion,
        },
        direction,
        validatedSamples: 81,
      };
      let needed = 8,
        valid = true;
      for (let i = 0; i <= 80; i++) {
        const p = i / 80,
          pose = sampleEiffelUpperRoute(route, pickup, part.finalPose, mast, p);
        if (
          !cargoClear(
            occupancy,
            part,
            pose,
            start + (end - start) * Math.min(p, 0.999999),
            p >= 0.78,
          ) ||
          eiffelBoxPenetration(eiffelSolidBox(part, pose), mastBox) > 1e-5
        ) {
          valid = false;
          break;
        }
        try {
          const crane = sampleEiffelCrane(mast, pose, part.pickupLugs);
          needed = Math.max(
            needed,
            crane.hook[1] -
              base[1] -
              Math.sqrt(8.4 ** 2 - crane.horizontalReach ** 2) +
              0.5,
          );
        } catch {
          valid = false;
          break;
        }
      }
      if (valid && needed <= 22)
        return {
          route,
          pickup,
          receiver: deck,
          station: { ...mast, mastHeight: needed },
        };
    }
  }
  return null;
}
