import { EIFFEL_UPPER_RECEIVER_BOLT_ROLES, EIFFEL_UPPER_RECEIVER_PART_ID } from './eiffelUpperReceiver';
import { sampleEiffelSecondFloorRelayRoute } from './eiffelSecondFloorRelayRoute';
import type { RigidPose, RigidVec3 as V } from './eiffelRigid';

/** Candidate only. Source/support witnesses are required; this does not extend the film. */
export const EIFFEL_UPPER_FREIGHT_DURATION = 130;
export const EIFFEL_UPPER_FREIGHT_PEAK_Y = 198;
export const EIFFEL_UPPER_FREIGHT_CLEVIS_ROLE = 'upper-197-clevis';
/** Actual .292m barrel + .008m rope; this is the rope centreline radius. */
export const EIFFEL_UPPER_FREIGHT_DRUM_RADIUS = .30;
const terminal = sampleEiffelSecondFloorRelayRoute(126);
const masterOffset = terminal.masterLinkPose.position[1] - terminal.carrierPose.position[1];
const payloadOffset = terminal.payloadPose.position[1] - terminal.carrierPose.position[1];
const apexOffset = .325, tolerance = 5e-5;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, t: number): V => [a[0] * t, a[1] * t, a[2] * t];
const length = (a: V) => Math.hypot(...a);
const distance = (a: V, b: V) => length(sub(a, b));
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V) => mul(a, 1 / length(a));
const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const identity = [0, 0, 0, 1] as const;
const pose = (position: V): RigidPose => ({ position, quaternion: identity });
function vector(a: readonly number[]): V {
  if (a.length !== 3 || !a.every(Number.isFinite)) throw Error('Freight vector must contain three finite coordinates');
  return [a[0]!, a[1]!, a[2]!];
}
function near(a: V, b: V, message: string) { if (distance(a, b) > tolerance) throw Error(message); }
function upright(p: RigidPose) {
  vector(p.position);
  if (p.quaternion.length !== 4 || !p.quaternion.every(Number.isFinite) || Math.hypot(...p.quaternion.slice(0, 3)) > tolerance || Math.abs(Math.abs(p.quaternion[3]) - 1) > tolerance) throw Error('Freight retains the upright rigid carrier');
}

/** These keys deliberately match the actual parent-authored freight-design.json. */
export interface EiffelUpperFreightRigDesign {
  readonly crossTrolleyX: number;
  readonly headSheaveY: number;
  readonly headSheaveRadius: number;
  readonly receiverCartOrigin: readonly number[];
  readonly receiverCarrierOrigin: readonly number[];
  readonly reeving: {
    readonly ropeRadius: number; readonly grooveRadius: number; readonly centreRadius: number;
    readonly drumCentre: readonly number[]; readonly drumTakeoff: readonly number[];
    readonly fixedVerticalGuide: readonly number[]; readonly fixedHorizontalGuide: readonly number[];
    readonly bridgeHorizontalGuideLocal: readonly number[]; readonly headLocal: readonly number[];
  };
}
export interface EiffelUpperFreightStart {
  readonly partId: typeof EIFFEL_UPPER_RECEIVER_PART_ID;
  readonly sourceHashes: { readonly carrier: string; readonly support: string; readonly rig: string; readonly clevis: string };
  readonly carrierPose: RigidPose;
  readonly payloadPose: RigidPose;
  readonly masterLinkPose: RigidPose;
  readonly support: {
    readonly role: string; readonly cartChocked: boolean;
    readonly corners: readonly { readonly index: number; readonly carrierPoint: V; readonly surfacePoint: V; readonly surfaceMesh: string }[];
  };
  readonly bolts: readonly { readonly role: string; readonly holder: 'tray'; readonly turnsReleased: number; readonly shaftWithdrawal: number }[];
  readonly connection: {
    readonly role: typeof EIFFEL_UPPER_FREIGHT_CLEVIS_ROLE;
    readonly pose: RigidPose; readonly ropeApex: V; readonly pinWithdrawal: number; readonly keeperAngle: number;
    readonly tensioned: boolean; readonly previousHoistReleased: boolean;
  };
}
/** Optional, explicit pickup over the cart-bridge guard; no guessed floor/guard height. */
export interface EiffelUpperFreightPickup {
  readonly clearCarrierY: number;
  readonly liftLaneZ: number;
  readonly liftSeconds: number;
  readonly traverseSeconds: number;
  readonly clearanceEvidence: string;
}
export interface EiffelUpperFreightLine {
  readonly kind: 'line'; readonly start: V; readonly end: V; readonly length: number;
  readonly startTangent: V; readonly endTangent: V;
}
export interface EiffelUpperFreightArc {
  readonly kind: 'arc'; readonly role: string; readonly centre: V; readonly radius: number;
  readonly axis: V; readonly sweepAngle: number; readonly start: V; readonly end: V;
  readonly startTangent: V; readonly endTangent: V; readonly length: number; readonly points: readonly V[];
}
function line(start: V, end: V): EiffelUpperFreightLine {
  const delta = sub(end, start), span = length(delta);
  if (!(span > tolerance)) throw Error('Freight tangent span must stay positive; guide order cannot reverse');
  return { kind: 'line', start, end, length: span, startTangent: unit(delta), endTangent: unit(delta) };
}
function arc(role: string, centre: V, radius: number, u: V, v: V, a: number, b: number): EiffelUpperFreightArc {
  const at = (angle: number) => add(centre, add(mul(u, radius * Math.cos(angle)), mul(v, radius * Math.sin(angle))));
  const tangent = (angle: number) => mul(add(mul(u, -Math.sin(angle)), mul(v, Math.cos(angle))), Math.sign(b - a));
  return { kind: 'arc', role, centre, radius, axis: cross(u, v), sweepAngle: b - a,
    start: at(a), end: at(b), startTangent: tangent(a), endTangent: tangent(b), length: radius * Math.abs(b - a),
    points: Array.from({ length: 33 }, (_, i) => at(a + (b - a) * i / 32)) };
}

/** Exact circular tangents and analytic length; the polyline is a renderer approximation. */
export function solveEiffelUpperFreightRope(carrierOrigin: V, d: EiffelUpperFreightRigDesign) {
  vector(carrierOrigin);
  const r = d.reeving, radius = r.centreRadius;
  if (![d.crossTrolleyX, d.headSheaveY, d.headSheaveRadius, r.ropeRadius, r.grooveRadius, radius].every(Number.isFinite) || r.ropeRadius <= 0 || r.grooveRadius <= 0 || Math.abs(radius - r.ropeRadius - r.grooveRadius) > tolerance || Math.abs(d.headSheaveRadius - radius) > tolerance) throw Error('Freight rope centreline must match the source sheave groove plus rope radius');
  const drum = vector(r.drumCentre), takeoff = vector(r.drumTakeoff), fixed = vector(r.fixedVerticalGuide), corner = vector(r.fixedHorizontalGuide);
  const moving = add(vector(r.bridgeHorizontalGuideLocal), [0, 0, carrierOrigin[2]]), head = add(vector(r.headLocal), [d.crossTrolleyX, 0, carrierOrigin[2]]);
  if (Math.abs(Math.hypot(takeoff[0] - drum[0], takeoff[1] - drum[1]) - EIFFEL_UPPER_FREIGHT_DRUM_RADIUS) > tolerance) throw Error('Freight takeoff must match the .292m barrel plus .008m rope centreline');
  near(head, [d.crossTrolleyX, d.headSheaveY, carrierOrigin[2]], 'Freight head datum differs from source hierarchy');
  near([head[0] - radius, 0, head[2]], [carrierOrigin[0], 0, carrierOrigin[2]], 'Freight falling tangent must align with the upright carrier');
  const arcs = [
    arc('upper-197-fixed-feed-sheave', fixed, radius, [1, 0, 0], [0, 1, 0], 0, Math.PI / 2),
    arc('upper-197-fixed-corner-sheave', corner, radius, [1, 0, 0], [0, 0, 1], -Math.PI / 2, -Math.PI),
    arc('upper-197-bridge-corner-sheave', moving, radius, [1, 0, 0], [0, 0, 1], 0, Math.PI / 2),
    arc('upper-197-head-sheave', head, radius, [1, 0, 0], [0, 1, 0], Math.PI / 2, Math.PI),
  ];
  const termination = add(carrierOrigin, [0, masterOffset + apexOffset, 0]);
  const segments: (EiffelUpperFreightLine | EiffelUpperFreightArc)[] = [];
  let previous = takeoff;
  for (const curve of arcs) { segments.push(line(previous, curve.start), curve); previous = curve.end; }
  segments.push(line(previous, termination));
  for (let i = 1; i < segments.length; i++) near(segments[i - 1]!.endTangent, segments[i]!.startTangent, 'Freight source guides must meet exact tangent directions without air corners');
  near(segments[0]!.startTangent, [0, 1, 0], 'Freight drum takeoff must feed vertically up');
  near(segments[segments.length - 1]!.endTangent, [0, -1, 0], 'Freight hook must remain below the head falling tangent');
  const points: V[] = [takeoff];
  for (const segment of segments) points.push(...(segment.kind === 'line' ? [segment.end] : segment.points.slice(1)));
  return { radius: r.ropeRadius, points, segments, guidePoses: arcs.map(a => ({ role: a.role, centre: a.centre, axis: a.axis })),
    termination, deployedLength: segments.reduce((sum, segment) => sum + segment.length, 0), headroom: head[1] - termination[1],
    bridgeFeedSpan: segments[4]!.length, geometryAdmitted: false as const };
}

/** This verifies supplied datum consistency only, never source geometry or load capacity. */
export function inspectEiffelUpperFreightStart(w: EiffelUpperFreightStart, d: EiffelUpperFreightRigDesign) {
  if (w.partId !== EIFFEL_UPPER_RECEIVER_PART_ID) throw Error('Freight must retain the existing stair identity');
  for (const role of ['carrier', 'support', 'rig', 'clevis'] as const) if (!/^[a-f\d]{64}$/i.test(w.sourceHashes[role])) throw Error('Freight requires identified source revisions');
  upright(w.carrierPose); upright(w.payloadPose); upright(w.masterLinkPose); upright(w.connection.pose);
  near(w.payloadPose.position, add(w.carrierPose.position, [0, payloadOffset, 0]), 'Freight payload must remain inside its actual rigid carrier');
  near(w.masterLinkPose.position, add(w.carrierPose.position, [0, masterOffset, 0]), 'Freight retains the actual master offset');
  if (!w.support.role || !w.support.cartChocked || w.support.corners.length !== 4 || new Set(w.support.corners.map(c => c.index)).size !== 4) throw Error('Freight start requires a chocked cart and all four shoe support corners');
  for (const c of w.support.corners) {
    if (!Number.isInteger(c.index) || c.index < 0 || c.index > 3 || !c.surfaceMesh) throw Error('Freight shoe contact requires an identified actual supporting mesh');
    vector(c.carrierPoint); vector(c.surfacePoint);
    const offset: V = [c.index < 2 ? -.22 : .22, 0, c.index % 2 === 0 ? -.22 : .22];
    near(c.carrierPoint, add(w.carrierPose.position, offset), 'Freight support must cover actual bottom-shoe corners, not only the origin');
    near(c.carrierPoint, c.surfacePoint, 'Freight shoe and support contact must coincide');
  }
  if (w.bolts.length !== 4 || new Set(w.bolts.map(b => b.role)).size !== 4 || EIFFEL_UPPER_RECEIVER_BOLT_ROLES.some(role => !w.bolts.some(b => b.role === role)) || w.bolts.some(b => b.holder !== 'tray' || b.turnsReleased !== 4 || b.shaftWithdrawal < .44 || !Number.isFinite(b.shaftWithdrawal))) throw Error('Release and stow all four actual upper-cart bolts before freight lift');
  const c = w.connection;
  if (c.role !== EIFFEL_UPPER_FREIGHT_CLEVIS_ROLE || !c.previousHoistReleased || !c.tensioned || c.pinWithdrawal !== 0 || c.keeperAngle !== 0) throw Error('Freight requires its distinct closed, tensioned fitting after releasing the old hoist');
  near(c.pose.position, w.masterLinkPose.position, 'Freight fitting pin must match the retained master');
  const rope = solveEiffelUpperFreightRope(w.carrierPose.position, d);
  vector(c.ropeApex); near(c.ropeApex, rope.termination, 'Freight rope must end at the actual new fitting apex');
  return { geometryAdmitted: false as const, rope };
}

export function sampleEiffelUpperFreight(rawSeconds: number, start: EiffelUpperFreightStart, d: EiffelUpperFreightRigDesign, pickup?: EiffelUpperFreightPickup) {
  if (!Number.isFinite(rawSeconds)) throw Error('Freight time must be finite');
  const initial = inspectEiffelUpperFreightStart(start, d), from = start.carrierPose.position;
  const receiver = vector(d.receiverCarrierOrigin), cart = vector(d.receiverCartOrigin);
  near(receiver, [-2, 197.34, -3.6], 'Freight receiver must match the actual197m carrier support');
  near(cart, [-2, 197, -3.6], 'Freight receiver cart must retain its source floor contact');
  let pickupSeconds = 0, liftStartY = from[1], laneZ = from[2];
  if (pickup) {
    if (![pickup.clearCarrierY, pickup.liftLaneZ, pickup.liftSeconds, pickup.traverseSeconds].every(Number.isFinite) || !pickup.clearanceEvidence || pickup.liftSeconds <= 0 || pickup.traverseSeconds <= 0 || pickup.clearCarrierY <= from[1] || pickup.clearCarrierY >= EIFFEL_UPPER_FREIGHT_PEAK_Y) throw Error('Freight pickup requires explicit positive timing and a witnessed clear-over-guard height');
    pickupSeconds = pickup.liftSeconds + pickup.traverseSeconds; liftStartY = pickup.clearCarrierY; laneZ = pickup.liftLaneZ;
  }
  if (liftStartY >= EIFFEL_UPPER_FREIGHT_PEAK_Y) throw Error('Freight lift must start below its receiving clearance height');
  // Validate every endpoint even if this call samples only the earlier supported start.
  for (const p of [[from[0], liftStartY, from[2]], [from[0], liftStartY, laneZ], [-2, EIFFEL_UPPER_FREIGHT_PEAK_Y, laneZ], [-2, EIFFEL_UPPER_FREIGHT_PEAK_Y, receiver[2]], receiver] as V[]) solveEiffelUpperFreightRope(p, d);
  const duration = pickupSeconds + EIFFEL_UPPER_FREIGHT_DURATION, seconds = Math.max(0, Math.min(duration, rawSeconds));
  let y = from[1], z = from[2], phase: string;
  if (pickup && seconds < pickup.liftSeconds) { y += (pickup.clearCarrierY - y) * ease(seconds / pickup.liftSeconds); phase = 'pickup-over-guard'; }
  else if (pickup && seconds < pickupSeconds) { y = pickup.clearCarrierY; z += (laneZ - z) * ease((seconds - pickup.liftSeconds) / pickup.traverseSeconds); phase = 'pickup-to-lift-lane'; }
  else {
    const t = seconds - pickupSeconds;
    y = liftStartY + (EIFFEL_UPPER_FREIGHT_PEAK_Y - liftStartY) * ease(t / 106) - (EIFFEL_UPPER_FREIGHT_PEAK_Y - receiver[1]) * ease((t - 122) / 4);
    z = laneZ + (receiver[2] - laneZ) * ease((t - 106) / 16);
    phase = t < 106 ? 'vertical-lift' : t < 122 ? 'bridge-traverse' : t < 126 ? 'lower-to-receiver' : 'landed-connected';
  }
  const carrier: V = [from[0], y, z], rope = solveEiffelUpperFreightRope(carrier, d), deployedDelta = rope.deployedLength - initial.rope.deployedLength;
  const received = seconds >= pickupSeconds + 126;
  return { seconds, duration, phase, partId: start.partId, ownsPayload: true as const, seated: false as const,
    carrierPose: pose(carrier), payloadPose: pose(add(carrier, [0, payloadOffset, 0])), masterLinkPose: pose(add(carrier, [0, masterOffset, 0])),
    carrierSupport: seconds === 0 ? start.support.role : received ? 'upper-197-receiver-cart' : 'upper-197-tackle', slingSupport: 'tackle' as const,
    cartReleased: true as const, received, hookReleased: false as const, fastening: { installed: 0, required: 4 },
    upperCartPose: pose(cart), bridgeZ: z, crossTrolleyX: d.crossTrolleyX,
    thirdHoist: { role: EIFFEL_UPPER_FREIGHT_CLEVIS_ROLE, pose: pose(add(carrier, [0, masterOffset, 0])), attached: true as const, pinWithdrawal: 0, keeperAngle: 0, rope },
    kinematics: { deployedDelta, drumAngle: deployedDelta / EIFFEL_UPPER_FREIGHT_DRUM_RADIUS, fixedFeedAngle: deployedDelta / d.reeving.centreRadius,
      fixedCornerAngle: deployedDelta / d.reeving.centreRadius, movingCornerAngle: (y - from[1]) / d.reeving.centreRadius,
      headAngle: -(y - from[1]) / d.reeving.centreRadius, bridgeWheelAngle: (z - from[2]) / .145, crossWheelAngle: 0 },
    hardwareRoles: [{ role: 'upper-197-travel-bridge', position: [0, 0, z] as V }, { role: 'upper-197-cross-trolley', position: [d.crossTrolleyX, 0, 0] as V },
      { role: EIFFEL_UPPER_FREIGHT_CLEVIS_ROLE, position: add(carrier, [0, masterOffset, 0]) }, { role: 'sling-parking-saddle', position: carrier }],
    geometryAdmitted: false as const, productionReady: false as const,
    pending: ['actual-start-support-and-connection', 'actual-route-and-rope-clearance', 'bridge-drive', 'winding-and-brake', 'receiver-release', 'carrier-extraction', 'final-installation'] as const };
}
