import { EIFFEL_RELAY_HANDOFF_START } from './eiffelRelayHandoff';
import { sampleEiffelRelayHandoffSequence } from './eiffelRelayHandoffSequence';
import { sampleEiffelSecondFloorRelayRoute } from './eiffelSecondFloorRelayRoute';
import { eiffelLongLoadWorkerRoles, type LongLoadWorkerRole } from './eiffelLongLoadWorkerPose';
import type { RigidVec3 as V, RigidQuat as Q, RigidPose } from './eiffelRigid';

/** This module is an isolated candidate. It does not advance the main film. */
export const EIFFEL_UPPER_RECEIVER_FASTENING_DURATION = 110;
export const EIFFEL_UPPER_RECEIVER_PART_ID = 'summit-access-stair-m000-c000' as const;
export const EIFFEL_UPPER_RECEIVER_BOLT_ROLES = [
  'upper-cart-bolt-0', 'upper-cart-bolt-1', 'upper-cart-bolt-2', 'upper-cart-bolt-3',
] as const;
export const EIFFEL_UPPER_RECEIVER_WORKER_PREFIX = 'upper-receiver-rigger';
export const EIFFEL_UPPER_RECEIVER_WRENCH_ROLE = 'upper-receiver-wrench';
/** Bored stock-cart pattern, translated with the actual independent upper cart. */
export const EIFFEL_UPPER_RECEIVER_HOLE_CENTERS: readonly V[] = [
  [-15.16, 116.44999938964844, -1.8], [-14.84, 116.44999938964844, -1.8],
  [-15, 116.44999938964844, -1.96], [-15, 116.44999938964844, -1.64],
];
const landed = sampleEiffelSecondFloorRelayRoute(126);
const referenceRope = sampleEiffelSecondFloorRelayRoute(0).secondHoist.worldRope;
const identity: Q = [0, 0, 0, 1];
const tolerance = 5e-5;
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const distance = (a: V, b: V) => Math.hypot(...a.map((v, i) => v - b[i]!));
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subtract = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const multiply = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

/** pointWorld = rotationY(yaw) * pointReference + translation.
 * These are requested model datums until a separate actual-source audit passes. */
export interface EiffelUpperReceiverDesign {
  readonly yaw: number;
  readonly translation: V;
}
export function transformEiffelUpperReceiverPoint(point: V, design: EiffelUpperReceiverDesign): V {
  const c = Math.cos(design.yaw), s = Math.sin(design.yaw);
  return add([c * point[0] + s * point[2], point[1], -s * point[0] + c * point[2]], design.translation);
}
export function eiffelUpperReceiverDesignAtYaw(yaw: number): EiffelUpperReceiverDesign {
  if (!Number.isFinite(yaw)) throw Error('Upper receiver yaw must be finite');
  const rotation = { yaw, translation: [0, 0, 0] as V };
  return { yaw, translation: subtract([-15, 116.13999938964844, -1.8], transformEiffelUpperReceiverPoint(EIFFEL_RELAY_HANDOFF_START.cartOrigin, rotation)) };
}
function checkDesign(design: EiffelUpperReceiverDesign): void {
  if (![design.yaw, ...design.translation].every(Number.isFinite)) throw Error('Upper receiver isometry must be finite');
  const cart = transformEiffelUpperReceiverPoint(EIFFEL_RELAY_HANDOFF_START.cartOrigin, design);
  if (distance(cart, [-15, 116.13999938964844, -1.8]) > tolerance) throw Error('Upper receiver isometry must preserve the actual landed cart station');
}
const facing = (design: EiffelUpperReceiverDesign): Q => [0, Math.sin(design.yaw / 2), 0, Math.cos(design.yaw / 2)];
const renamedWorkerRole = (role: string) => role.replace(/^deck-rigger-/, `${EIFFEL_UPPER_RECEIVER_WORKER_PREFIX}-`);
const rotate = (point: V, yaw: number) => transformEiffelUpperReceiverPoint(point, { yaw, translation: [0, 0, 0] });
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
interface ReferencePose { readonly feet: readonly V[]; readonly hands: readonly V[]; readonly yaw: number }
function standing(x: number, z: number, yaw: number): ReferencePose {
  const floor = EIFFEL_RELAY_HANDOFF_START.cartOrigin[1];
  return {
    feet: [-1, 1].map(side => add([x, floor, z], rotate([0, 0, side * .12], yaw))),
    hands: [-1, 1].map(side => add([x, floor + .94, z], rotate([.36, 0, side * .16], yaw))),
    yaw,
  };
}
/** Reference-frame relocation; yawπ maps it to world[-.35,0,-.20]. */
export const EIFFEL_UPPER_RECEIVER_TRAY_OFFSET: V = [.35, 0, .20];
/** Shank top .006 + actual hand half-height .040: palm underside meets metal. */
export const EIFFEL_UPPER_RECEIVER_WRENCH_GRIP: V = [.12, .046, 0];
function posePath(points: readonly ReferencePose[], progress: number): ReferencePose {
  const q = Math.max(0, Math.min(1, progress)) * (points.length - 1), index = Math.min(points.length - 2, Math.floor(q));
  const t = q - index, a = points[index]!, b = points[index + 1]!;
  return {
    feet: a.feet.map((foot, i) => {
      const step = smooth(2 * t - i);
      return add(mix(foot, b.feet[i]!, step), [0, .045 * Math.sin(Math.PI * step), 0]);
    }),
    hands: a.hands.map((hand, i) => mix(hand, b.hands[i]!, smooth(t))),
    yaw: a.yaw + (b.yaw - a.yaw) * smooth(t),
  };
}
const oldWork = standing(-9.65, -3.445, 0), boltStation = standing(-8.5, -4.67, -Math.PI / 2);
const oldPath = [oldWork, standing(-9.65, -4.05, -Math.PI / 2), standing(-9.65, -4.67, 0), standing(-9.05, -4.67, 0), boltStation];
const newWork: ReferencePose = { ...standing(-9.30, -3.395, 0), hands: standing(-9.30, -3.245, 0).hands };
/** At yawπ: working station[-14.2,-2.405], laneX−14.3, northZ−.92.
 * Every recurring tool/bolt walk uses this same supported-foot candidate. */
const receiverPath = [newWork, standing(-9.20, -3.75, 0), standing(-9.20, -4.30, -Math.PI / 4), standing(-9.20, -4.88, -Math.PI / 2), standing(-8.85, -4.88, -Math.PI / 2), standing(-8.5, -4.88, -Math.PI / 2), boltStation];
function transferProgress(referenceSeconds: number): number | null {
  if (referenceSeconds >= 117 && referenceSeconds <= 121) return (referenceSeconds - 117) / 4;
  if (referenceSeconds >= 122 && referenceSeconds <= 218) {
    const index = Math.min(3, Math.floor((referenceSeconds - 122) / 24)), local = referenceSeconds - 122 - index * 24;
    if (local >= 8 && local <= 14) return 1 - (local - 8) / 6;
    if (index < 3 && local >= 18 && local <= 23) return (local - 18) / 5;
  }
  return null;
}
function referencePoseChange(referenceSeconds: number): { old: ReferencePose; next: ReferencePose; travel: boolean } {
  const progress = transferProgress(referenceSeconds);
  if (progress !== null) return { old: posePath(oldPath, progress), next: posePath(receiverPath, progress), travel: true };
  const local = (referenceSeconds - 122) % 24;
  const atWork = referenceSeconds <= 117 || referenceSeconds >= 211 || (referenceSeconds >= 122 && local >= 14 && local <= 18);
  return { old: atWork ? oldWork : boltStation, next: atWork ? newWork : boltStation, travel: false };
}
function solveReferencePose(pose: ReferencePose): LongLoadWorkerRole[] {
  const centre: V = [(pose.feet[0]![0] + pose.feet[1]![0]) / 2, 0, (pose.feet[0]![2] + pose.feet[1]![2]) / 2];
  const local = (point: V) => rotate(subtract(point, centre), -pose.yaw);
  const turn: Q = [0, Math.sin(pose.yaw / 2), 0, Math.cos(pose.yaw / 2)];
  const kneeOutward = 1 - smooth((Math.min(...pose.hands.map(p => p[1])) - EIFFEL_RELAY_HANDOFF_START.cartOrigin[1] - .6) / .3);
  return eiffelLongLoadWorkerRoles('deck-rigger', { feet: pose.feet.map(local), hands: pose.hands.map(local), kneeOutward, kneeSameSide: pose.feet[0]![2] > -4, elbowForward: 1 }).map(role => ({
    role: role.role, position: add(rotate(role.position, pose.yaw), centre), quaternion: multiply(turn, role.quaternion),
  }));
}
function receiverReferenceWorker(referenceSeconds: number) {
  if (!Number.isFinite(referenceSeconds) || referenceSeconds < 112 || referenceSeconds > 222) throw Error('Upper reference worker covers fastening source112–222; new supported access must be authored');
  const raw = sampleEiffelRelayHandoffSequence(referenceSeconds, referenceRope).worker;
  const change = referencePoseChange(referenceSeconds), gripWeight = smooth((222 - referenceSeconds) / 4) * smooth((referenceSeconds - 112) / 4);
  const handOffsets = change.next.hands.map((hand, i) => subtract(hand, change.old.hands[i]!));
  const pose: ReferencePose = { ...change.next, hands: raw.hands.map((hand, i) => add(add(hand, handOffsets[i]!), [0, i === 0 ? .046 * gripWeight : 0, 0])) };
  return { ...pose, roles: solveReferencePose(pose), change, handOffsets };
}

/** Auditable connected body poses using unchanged source part dimensions.
 * The relocated station requires separately authored onward access. */
export function sampleEiffelUpperReceiverReferenceWorker(referenceSeconds: number, design: EiffelUpperReceiverDesign) {
  checkDesign(design);
  const original = receiverReferenceWorker(referenceSeconds);
  const roles: LongLoadWorkerRole[] = original.roles.map(role => ({
    role: renamedWorkerRole(role.role),
    position: transformEiffelUpperReceiverPoint(role.position, design),
    quaternion: multiply(facing(design), role.quaternion),
  }));
  return {
    id: EIFFEL_UPPER_RECEIVER_WORKER_PREFIX,
    feet: original.feet.map(p => transformEiffelUpperReceiverPoint(p, design)),
    hands: original.hands.map(p => transformEiffelUpperReceiverPoint(p, design)),
    roles,
  };
}

export interface EiffelUpperReceiverBolt {
  readonly role: typeof EIFFEL_UPPER_RECEIVER_BOLT_ROLES[number];
  readonly position: V;
  readonly quaternion: Q;
  readonly holder: 'tray' | 'worker' | 'cart-nut';
  readonly holderContact: V | null;
  readonly seatedPosition: V;
  readonly turnsTightened: number;
  readonly shaftWithdrawal: number;
  readonly secured: boolean;
}

/** Four distinct upper bolts reverse the actual handoff's storage/carry/extract
 * motion. Time past the secure endpoint remains an explicit awaiting-access
 * state: it cannot silently slack or open the existing world-Z connector. */
export function sampleEiffelUpperReceiver(inputSeconds: number, design: EiffelUpperReceiverDesign) {
  if (!Number.isFinite(inputSeconds)) throw Error('Upper receiver time must be finite');
  checkDesign(design);
  const seconds = Math.max(0, Math.min(EIFFEL_UPPER_RECEIVER_FASTENING_DURATION, inputSeconds));
  const referenceSeconds = 222 - seconds;
  const original = sampleEiffelRelayHandoffSequence(referenceSeconds, referenceRope);
  const referenceWorker = receiverReferenceWorker(referenceSeconds);
  const worker = sampleEiffelUpperReceiverReferenceWorker(referenceSeconds, design);
  const bolts: EiffelUpperReceiverBolt[] = EIFFEL_RELAY_HANDOFF_START.boltPositions.map((_, index) => {
    const role = original.hardwareRoles.find(r => r.role === `cart-bolt-${index}`)!;
    const local = referenceSeconds - (122 + index * 24);
    const turnsReleased = 4 * smooth(local / 4);
    const shaftWithdrawal = .44 * smooth((local - 4) / 2);
    const holder = local >= 17 ? 'tray' : local > 4 ? 'worker' : 'cart-nut';
    const turnsTightened = 4 - turnsReleased;
    const offset: V = holder === 'tray' ? EIFFEL_UPPER_RECEIVER_TRAY_OFFSET : holder === 'worker' ? referenceWorker.handOffsets[1]! : [0, 0, 0];
    const position = transformEiffelUpperReceiverPoint(add(role.position!, offset), design);
    return {
      role: EIFFEL_UPPER_RECEIVER_BOLT_ROLES[index]!,
      position,
      quaternion: multiply(facing(design), role.quaternion!),
      holder,
      holderContact: holder === 'cart-nut' ? null : add(position, [0, holder === 'worker' ? .128 : -.12, 0]),
      seatedPosition: transformEiffelUpperReceiverPoint(EIFFEL_RELAY_HANDOFF_START.boltPositions[index]!, design),
      turnsTightened,
      shaftWithdrawal,
      secured: holder === 'cart-nut' && shaftWithdrawal === 0 && turnsTightened === 4,
    };
  });
  const toolAngle = referenceWorker.change?.travel ? referenceWorker.change.next.yaw + Math.PI : null;
  const originalToolPosition = toolAngle === null ? add(original.wrench.position, referenceWorker.handOffsets[0]!) : subtract(referenceWorker.hands[0]!, rotate(EIFFEL_UPPER_RECEIVER_WRENCH_GRIP, toolAngle));
  const wrench = {
    role: EIFFEL_UPPER_RECEIVER_WRENCH_ROLE,
    position: transformEiffelUpperReceiverPoint(originalToolPosition, design),
    quaternion: multiply(facing(design), toolAngle === null ? original.wrench.quaternion : [0, Math.sin(toolAngle / 2), 0, Math.cos(toolAngle / 2)]),
  };
  const installed = bolts.filter(bolt => bolt.secured).length;
  return {
    seconds, referenceSeconds,
    phase: seconds < 4 ? 'taking-wrench' : seconds < 100 ? 'fastening-upper-cart' : seconds < 110 ? 'stowing-wrench' : 'secured-awaiting-access',
    partId: EIFFEL_UPPER_RECEIVER_PART_ID, ownsPayload: true as const, seated: false as const,
    carrierPose: landed.carrierPose, payloadPose: landed.payloadPose, masterLinkPose: landed.masterLinkPose,
    upperCartPose: { position: [-15, 116.13999938964844, -1.8] as V, quaternion: identity },
    carrierSupport: 'upper-receiver' as const, slingSupport: 'tackle' as const,
    cartSecured: installed === 4, fastening: { installed, required: 4, released: false },
    bolts, worker, wrench,
    secondHoist: { ...landed.secondHoist, attached: true as const, unloadDrop: 0, keeperAngle: 0, pinWithdrawal: 0 },
    hardwareRoles: [...worker.roles, wrench, ...bolts.map(bolt => ({ role: bolt.role, position: bolt.position, quaternion: bolt.quaternion }))],
    geometryAdmitted: false as const,
    pending: ['actual-upper-source-contacts', 'supported-access', 'second-hoist-release', '197m-transfer', 'carrier-extraction', 'final-installation'] as const,
  };
}

/** The next sampler must supply these source/contact witnesses. A scalar
 * called slack is insufficient: the actual clevis and rope end must move. */
export interface EiffelUpperReceiverReleaseWitness {
  readonly receiver: ReturnType<typeof sampleEiffelUpperReceiver>;
  readonly sourceAssetSha256: string;
  readonly upperCartChocked: boolean;
  readonly masterSaddleContact: V;
  readonly masterUndersideContact: V;
  readonly clevisPose: RigidPose;
  readonly rope: readonly V[];
  readonly unloadDrop: number;
  readonly keeperAngle: number;
  readonly pinWithdrawal: number;
  readonly keeperHandContact: V | null;
  readonly pinHandContact: V | null;
}
/** A requirements check, never asset clearance or production admission. */
export function inspectEiffelUpperReceiverRelease(w: EiffelUpperReceiverReleaseWitness) {
  if (!/^[a-f\d]{64}$/i.test(w.sourceAssetSha256)) throw Error('Release requires an identified actual source revision');
  if (!w.receiver.cartSecured || !w.upperCartChocked || w.receiver.bolts.length !== 4 || new Set(w.receiver.bolts.map(b => b.role)).size !== 4 || EIFFEL_UPPER_RECEIVER_BOLT_ROLES.some(role => !w.receiver.bolts.some(b => b.role === role)) || w.receiver.bolts.some(b => !b.secured || b.turnsTightened !== 4 || b.shaftWithdrawal !== 0 || b.holder !== 'cart-nut' || distance(b.position, b.seatedPosition) > tolerance)) throw Error('Secure all four upper bolts and chock the cart before unloading the second hoist');
  if (w.receiver.bolts.some(b => !EIFFEL_UPPER_RECEIVER_HOLE_CENTERS.some(hole => distance(hole, b.position) <= tolerance))) throw Error('A rotated worker reference must still align with the actual four upper-cart holes');
  if (w.receiver.partId !== EIFFEL_UPPER_RECEIVER_PART_ID || w.receiver.seated || distance(w.receiver.carrierPose.position, landed.carrierPose.position) > tolerance || distance(w.receiver.masterLinkPose.position, landed.masterLinkPose.position) > tolerance) throw Error('The received carrier and retained master cannot move during release');
  const numbers = [...w.masterSaddleContact, ...w.masterUndersideContact, ...w.clevisPose.position, ...w.clevisPose.quaternion, ...w.rope.flat(), ...(w.keeperHandContact ?? []), ...(w.pinHandContact ?? []), w.unloadDrop, w.keeperAngle, w.pinWithdrawal];
  if (!numbers.every(Number.isFinite) || w.rope.length < 2) throw Error('Release witnesses must be finite and include the actual rope');
  if (w.unloadDrop < 0 || w.unloadDrop > .002 + tolerance || w.keeperAngle < 0 || w.keeperAngle > Math.PI / 2 + tolerance || w.pinWithdrawal < 0 || w.pinWithdrawal > .084 + tolerance) throw Error('Release exceeds the existing source connector travel');
  const master = w.receiver.masterLinkPose.position;
  if (distance(w.masterUndersideContact, add(master, [0, -.148, 0])) > tolerance || distance(w.masterSaddleContact, w.masterUndersideContact) > tolerance) throw Error('The retained master needs its actual saddle contact');
  if (distance(w.clevisPose.position, add(master, [0, -w.unloadDrop, 0])) > tolerance || distance([w.clevisPose.quaternion[0], w.clevisPose.quaternion[1], w.clevisPose.quaternion[2]], [0, 0, 0]) > tolerance || Math.abs(Math.abs(w.clevisPose.quaternion[3]) - 1) > tolerance) throw Error('Preserve the actual world-Z clevis and apply its geometric unload drop');
  if (distance(w.rope[w.rope.length - 1]!, add(w.clevisPose.position, [0, .325, 0])) > tolerance) throw Error('The paid-out second rope must meet the actual clevis apex');
  if ((w.keeperAngle > tolerance || w.pinWithdrawal > tolerance) && w.unloadDrop < .002 - tolerance) throw Error('Unload the second-hoist pin before opening the keeper');
  if (w.keeperAngle > tolerance && w.keeperAngle < Math.PI / 2 - tolerance && (!w.keeperHandContact || distance(w.keeperHandContact, add(w.clevisPose.position, [.028, .104, .058])) > tolerance)) throw Error('Opening keeper requires its actual hand contact');
  if (w.pinWithdrawal > tolerance) {
    if (w.keeperAngle < Math.PI / 2 - tolerance) throw Error('Open the keeper before withdrawing the pin');
    if (!w.pinHandContact || distance(w.pinHandContact, add(w.clevisPose.position, [0, .104, .048 + w.pinWithdrawal])) > tolerance) throw Error('Pin withdrawal requires its actual pin-head hand contact');
  }
  return { cartSecured: true as const, slingSupport: 'carrier-saddle' as const, released: w.pinWithdrawal >= .084 - tolerance, geometryAdmitted: false as const };
}
