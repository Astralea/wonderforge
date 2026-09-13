import frozen from '../../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
import {
  interpolateRigidPose,
  transformRigidPoint,
  type RigidPose,
  type RigidVec3 as V,
} from './eiffelRigid';

/** Seconds within the bounded lift chapter; eiffelFilm maps the movie clock. */
export const EIFFEL_GROUND_LIFT_PILOT_DURATION = 55;
/** Station-specific external-obstacle review, not a general crane slew limit.
 * The actual 55-second hook path reaches 121.6033 degrees. Builder primitives,
 * ropes, 219 prepared support members and 1,840 completed tower solids were
 * checked every .02 seconds; evidence: hooked-crane-audit.json. */
export const EIFFEL_GROUND_LIFT_PILOT_REVIEW_SECTOR = [Math.PI / 3, 121.65 * Math.PI / 180] as const;
export const EIFFEL_GROUND_LIFT_PILOT_PHASES = [
  { phase: 'cart-arrival', start: 0, end: 10 },
  { phase: 'rigging', start: 10, end: 14 },
  { phase: 'hoist', start: 14, end: 26 },
  { phase: 'rotation', start: 26, end: 32 },
  { phase: 'slew', start: 32, end: 40 },
  { phase: 'lower', start: 40, end: 46 },
  { phase: 'unrigging', start: 46, end: 49 },
  { phase: 'hook-recovery', start: 49, end: 55 },
] as const;
export type EiffelGroundLiftPilotPhase = typeof EIFFEL_GROUND_LIFT_PILOT_PHASES[number]['phase'];
export const EIFFEL_GROUND_LIFT_PILOT_CONTEXT = {
  reviewOnly: true,
  partId: frozen.part.id,
  massKg: frozen.massKg,
  sourceManifestSHA256: frozen.sourceManifestSHA256,
  source: 'artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json',
  preparedStructureAssumption: 'The braced ground falsework, guide rails and prior tower members are already installed before this isolated review begins. The cart begins loaded 10 metres along the ground supply approach, moving for 10 seconds at 1 m/s average and 1.5 m/s peak.',
  lifecycleLimit: 'This bounded passage is integrated into the main movie. Installation, stock loading and physical removal or transfer before stage 10 arches remain unfinished; explicit editorial cards disclose the equipment omissions.',
  riggingLimit: 'The actual hook path uses the station-specific 60–121.65 degree sector reviewed against external tower and prepared-support obstacles. Crane self-collision, loaded dynamics, workers and other simultaneous lifts are not certified.',
  clearanceEvidence: 'artifacts/eiffel-integration-2026-09-07/hooked-crane-audit.json',
} as const;

export interface EiffelGroundLiftPilotSample {
  readonly seconds: number;
  readonly phase: EiffelGroundLiftPilotPhase;
  readonly phaseProgress: number;
  readonly reviewOnly: true;
  readonly payload: { readonly partId: string; readonly pose: RigidPose; readonly support: 'carrier' | 'slings' | 'final-joints' };
  readonly carrier: {
    readonly bedPose: RigidPose;
    readonly bedSize: V;
    readonly bedTopY: number;
    readonly groundY: 0;
    readonly distance: number;
    readonly moving: boolean;
    readonly wheelRadius: number;
    readonly wheelAngle: number;
    readonly wheelCenters: readonly V[];
  };
  readonly crane: {
    readonly root: V;
    readonly rootYaw: number;
    readonly heel: V;
    readonly reach: number;
    /** Relative to the root's inward +Z, in radians. */
    readonly yaw: number;
    readonly boomAngle: number;
    readonly tieAngle: number;
    readonly slider: number;
    readonly boomTip: V;
    readonly hook: V;
    readonly hoistRopeLength: number;
    readonly withinWorkingAnnulus: boolean;
    readonly withinReviewSector: boolean;
  };
  readonly rigging: {
    readonly attached: boolean;
    readonly attachmentProgress: number;
    readonly lugs: readonly [V, V];
    /** Three-point flexible paths preserve material length during gathering. */
    readonly slings: readonly { readonly length: number; readonly points: readonly [V, V, V] }[];
  };
  readonly reviewIssues: readonly ('actual-hook-outside-reviewed-sector' | 'actual-hook-outside-working-annulus')[];
}

const v = (p: readonly number[]): V => [p[0]!, p[1]!, p[2]!];
const pose = (p: { position: number[]; quaternion: number[] }): RigidPose => ({
  position: v(p.position), quaternion: [p.quaternion[0]!, p.quaternion[1]!, p.quaternion[2]!, p.quaternion[3]!],
});
const pickup = pose(frozen.route.pickup), high = pose(frozen.route.high),
  rotated = pose(frozen.route.rotated), approach = pose(frozen.route.approach), final = pose(frozen.part.finalPose);
const heel = v(frozen.station.heel), wheelRadius = .4, slingLength = 1.575;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const unit = (a: V): V => mul(a, 1 / Math.hypot(...a));
const mix = (a: V, b: V, t: number): V => add(a, mul(sub(b, a), t));
const smooth = (t: number) => t * t * (3 - 2 * t);
function polar(p: V) {
  const x = p[0] - heel[0], z = p[2] - heel[2], k = Math.SQRT1_2;
  return { r: Math.hypot(x, z), a: Math.atan2((x + z) * k, (-x + z) * k) };
}
function polarPoint(r: number, a: number, y: number): V {
  const x = r * Math.sin(a), z = r * Math.cos(a), k = Math.SQRT1_2;
  return [heel[0] + k * (x - z), y, heel[2] + k * (x + z)];
}
function suspendedGeometry(payload: RigidPose) {
  const lugs = frozen.part.pickupLugs.map(p => transformRigidPoint(payload, v(p))) as [V, V];
  const axis = unit(sub(lugs[1], lugs[0])), mid = mix(lugs[0], lugs[1], .5);
  // Equal, fixed-length legs: the apex lies on the perpendicular bisector.
  // Project world-up into that plane rather than stretching one sling when
  // a sloped load's lugs have different world heights.
  const up = unit(sub([0, 1, 0], mul(axis, axis[1])));
  const halfSpan = Math.hypot(...sub(lugs[1], lugs[0])) / 2;
  return { lugs, hook: add(mid, mul(up, Math.sqrt(slingLength ** 2 - halfSpan ** 2))) };
}
function slingPath(hook: V, lug: V, fraction: number): readonly [V, V, V] {
  const target = sub(lug, hook), direction = unit(target);
  const down = unit(sub([0, -1, 0], mul(direction, -direction[1])));
  // A rigger can only pay out the available rope while the hook descends;
  // the clip reaches its lug when the hook reaches the rigged position.
  const deployed = fraction * Math.min(1, slingLength / Math.hypot(...target));
  const end = add(hook, mul(target, deployed)), chord = Math.hypot(...sub(end, hook));
  const sag = Math.sqrt(Math.max(0, (slingLength ** 2 - chord ** 2) / 4));
  return [hook, add(mix(hook, end, .5), mul(down, sag)), end];
}

/** Serializable deterministic state; no renderer objects or runtime mutation. */
export function sampleEiffelGroundLiftPilot(rawSeconds: number): EiffelGroundLiftPilotSample {
  if (!Number.isFinite(rawSeconds)) throw new Error('Pilot time must be finite');
  const seconds = Math.max(0, Math.min(EIFFEL_GROUND_LIFT_PILOT_DURATION, rawSeconds));
  const interval = EIFFEL_GROUND_LIFT_PILOT_PHASES.find(p => seconds < p.end) ?? EIFFEL_GROUND_LIFT_PILOT_PHASES[7];
  const phase = interval.phase, progress = (seconds - interval.start) / (interval.end - interval.start), t = smooth(progress);
  const cartT = smooth(Math.min(1, seconds / 10)), from = v(frozen.haulCorridor.from);
  const cartCenter = mix(from, pickup.position, cartT);
  let payload: RigidPose;
  switch (phase) {
    case 'cart-arrival': payload = { ...pickup, position: cartCenter }; break;
    case 'rigging': payload = pickup; break;
    case 'hoist': payload = interpolateRigidPose(pickup, high, t); break;
    case 'rotation': payload = interpolateRigidPose(high, rotated, t); break;
    case 'slew': {
      const a = polar(rotated.position), b = polar(approach.position);
      payload = { ...rotated, position: polarPoint(a.r + (b.r - a.r) * t, a.a + (b.a - a.a) * t, high.position[1]) };
      break;
    }
    case 'lower': payload = interpolateRigidPose(approach, final, t); break;
    default: payload = final;
  }
  payload = interpolateRigidPose(payload, payload, 0);
  const suspended = suspendedGeometry(payload), pickupRig = suspendedGeometry(pickup), finalRig = suspendedGeometry(final);
  let hook = suspended.hook, attachmentProgress = 1;
  if (phase === 'cart-arrival') { hook = add(pickupRig.hook, [0, 2.1, 0]); attachmentProgress = 0; }
  if (phase === 'rigging') { hook = mix(add(pickupRig.hook, [0, 2.1, 0]), pickupRig.hook, t); attachmentProgress = t; }
  if (phase === 'unrigging') { hook = finalRig.hook; attachmentProgress = 1 - t; }
  if (phase === 'hook-recovery') {
    const p = polar(finalRig.hook), safeY = heel[1] + Math.sqrt(180 - p.r ** 2) - 2;
    hook = mix(finalRig.hook, [finalRig.hook[0], safeY, finalRig.hook[2]], t); attachmentProgress = 0;
  }
  // During arrival the loose loops remain at the pickup station, not attached
  // to the moving cart. Afterwards the riggers gather/deploy fixed-length rope.
  const rigLugs = phase === 'cart-arrival' ? pickupRig.lugs : suspended.lugs;
  const reach = polar(hook), rise = Math.sqrt(180 - reach.r ** 2), tieRise = Math.sqrt(148 - reach.r ** 2);
  const boomTip: V = [hook[0], heel[1] + rise, hook[2]];
  const annulus = reach.r >= 5.5 && reach.r <= 12, sector = reach.a >= EIFFEL_GROUND_LIFT_PILOT_REVIEW_SECTOR[0] - 1e-10 && reach.a <= EIFFEL_GROUND_LIFT_PILOT_REVIEW_SECTOR[1] + 1e-10;
  const issues: EiffelGroundLiftPilotSample['reviewIssues'][number][] = [];
  if (!annulus) issues.push('actual-hook-outside-working-annulus');
  if (!sector) issues.push('actual-hook-outside-reviewed-sector');
  const deck = frozen.pickupSupport.find(p => p.id === 'pickup-deck')!, distance = Math.hypot(...sub(cartCenter, from));
  return {
    seconds, phase, phaseProgress: progress, reviewOnly: true,
    payload: { partId: frozen.part.id, pose: payload, support: seconds < 14 ? 'carrier' : seconds < 46 ? 'slings' : 'final-joints' },
    carrier: {
      bedPose: { position: [cartCenter[0], deck.center[1]!, cartCenter[2]], quaternion: [0, 0, 0, 1] },
      bedSize: v(deck.size), bedTopY: deck.center[1]! + deck.size[1]! / 2, groundY: 0,
      distance, moving: seconds > 0 && seconds < 10, wheelRadius, wheelAngle: distance / wheelRadius,
      wheelCenters: [-.75, .75].flatMap(x => [-1.65, 1.65].map(z => [cartCenter[0] + x, wheelRadius, cartCenter[2] + z] as V)),
    },
    crane: {
      root: v(frozen.station.root), rootYaw: -Math.PI / 4, heel: [...heel], reach: reach.r, yaw: reach.a,
      boomAngle: Math.asin(reach.r / Math.sqrt(180)), tieAngle: Math.asin(reach.r / Math.sqrt(148)),
      slider: rise - tieRise, boomTip, hook, hoistRopeLength: boomTip[1] - hook[1],
      withinWorkingAnnulus: annulus, withinReviewSector: sector,
    },
    rigging: {
      attached: seconds >= 14 && seconds <= 46, attachmentProgress, lugs: suspended.lugs,
      slings: rigLugs.map(lug => ({ length: slingLength, points: slingPath(hook, lug, attachmentProgress) })),
    },
    reviewIssues: issues,
  };
}
