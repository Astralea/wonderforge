import frozen from '../../artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json';
import type { EiffelGroundLiftPilotSample } from './eiffelGroundLiftPilot';
import { interpolateRigidPose, transformRigidPoint, type RigidPose, type RigidVec3 as V } from './eiffelRigid';

export const EIFFEL_JOINT_CAMPAIGN_DURATION = 135;
export const EIFFEL_JOINT_CAMPAIGN_FREEZE = frozen.freeze;
export const EIFFEL_JOINT_CAMPAIGN_PART_IDS = ['lower-ne-02-m012-c001', 'lower-ne-02-m012-c002'] as const;
export const EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES = [46, 114] as const;
export const EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT = 126;
/** Admitted by frozen external geometry, cart channels and support contracts; installation and removal remain authored setup omissions. */
export const EIFFEL_JOINT_CAMPAIGN_ADMITTED = true;
export const EIFFEL_JOINT_CAMPAIGN_CONTEXT = {
  partIds: EIFFEL_JOINT_CAMPAIGN_PART_IDS, freeze: frozen.freeze,
  duration: EIFFEL_JOINT_CAMPAIGN_DURATION, seatTimes: EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES,
  permanentConnectedAt: EIFFEL_JOINT_CAMPAIGN_CONNECTED_AT,
  sourceManifestSHA256: frozen.sourceManifestSHA256,
  preparedStructureAssumption: 'The installed NE crane, braced joint support and two loaded ground stock carts are prepared before this chapter. Captive fastening plates travel on the first beam. Equipment installation and stock loading are not reconstructed.',
  supportLimit: 'Both parts retain temporary joint support until the permanent cheek plates are fastened at126 seconds. Static contact and external clearance do not certify structural capacity or equipment installation/removal.',
} as const;

type Carrier = EiffelGroundLiftPilotSample['carrier'] & { readonly id: string; readonly yaw: number; readonly steeringYaw: number; readonly state: 'loaded' | 'empty'; };
type Load = { readonly partId: string; readonly pose: RigidPose; readonly support: 'carrier' | 'slings' | 'temporary-joints' | 'permanent-joints'; readonly state: 'stock' | 'moving' | 'seated' };
export interface EiffelJointCampaignSample extends Omit<EiffelGroundLiftPilotSample, 'carrier'> {
  readonly carrier: Carrier;
  readonly activeLoadIndex: 0 | 1;
  readonly localSeconds: number;
  readonly campaignPhase: string;
  readonly loads: readonly [Load, Load];
  readonly carriers: readonly [Carrier, Carrier];
  readonly basketLoops: readonly { readonly loadIndex: 0 | 1; readonly partId: string; readonly points: readonly V[]; readonly length: number }[];
  readonly payloadCOM: V;
  readonly hookHorizontalCOMResidual: number;
  readonly fasteningProgress: number;
  readonly permanentConnected: boolean;
}
const v = (a: readonly number[]): V => [a[0]!, a[1]!, a[2]!];
const pose = (p: { position: number[]; quaternion: number[] }): RigidPose => ({ position: v(p.position), quaternion: [p.quaternion[0]!, p.quaternion[1]!, p.quaternion[2]!, p.quaternion[3]!] });
const routes = frozen.loads.map(l => ({ pickup: pose(l.route.pickup), high: pose(l.route.high), rotated: pose(l.route.rotated), approach: pose(l.route.approach), side: pose(l.route.side), final: pose(l.route.final) }));
const heel = v(frozen.station.heel), root = v(frozen.station.root), heading = 0;
const forward: V = [Math.sin(heading), 0, Math.cos(heading)], right: V = [Math.cos(heading), 0, -Math.sin(heading)];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, t: number): V => [a[0] * t, a[1] * t, a[2] * t];
const sub = (a: V, b: V): V => add(a, mul(b, -1));
const mix = (a: V, b: V, t: number): V => add(a, mul(sub(b, a), t));
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => { const a = clamp(t); return a * a * (3 - 2 * a); };
const unit = (a: V): V => mul(a, 1 / Math.hypot(...a));
const yawQ = (a: number): RigidPose['quaternion'] => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
const polar = (p: V) => { const x = p[0] - heel[0], z = p[2] - heel[2], k = Math.SQRT1_2; return { r: Math.hypot(x, z), a: Math.atan2((x + z) * k, (-x + z) * k) }; };
const polarPoint = (r: number, a: number, y: number): V => [heel[0] + Math.SQRT1_2 * r * (Math.sin(a) - Math.cos(a)), y, heel[2] + Math.SQRT1_2 * r * (Math.sin(a) + Math.cos(a))];
function suspended(index: number, p: RigidPose) {
  const load = frozen.loads[index]!, lugs = load.riggingLugs.map(a => transformRigidPoint(p, v(a))) as [V, V];
  const delta = sub(lugs[1], lugs[0]), axis = unit(delta), halfSpan = Math.hypot(...delta) / 2;
  const up = unit(sub([0, 1, 0], mul(axis, axis[1])));
  return { lugs, hook: add(mix(lugs[0], lugs[1], .5), mul(up, Math.sqrt(load.slingLength ** 2 - halfSpan ** 2))) };
}
/** One-second velocity ramps bound18m/13s arrival at1.5m/s without position jumps. */
function arrivalDistance(seconds: number, duration: number, distance: number): number {
  const t = Math.max(0, Math.min(duration, seconds)), speed = distance / (duration - 1);
  if (t < 1) return .5 * speed * t * t;
  if (t > duration - 1) return distance - .5 * speed * (duration - t) ** 2;
  return speed * (t - .5);
}
function carrierAt(index: number, seconds: number): Carrier {
  const r = routes[index]!, start = index === 0 ? 0 : 65, duration = index === 0 ? 10 : 13, stockDistance = frozen.cart.stockDistances[index]!;
  const cartPickup = add(r.pickup.position, [.06, 0, 0]);
  const origin = add(cartPickup, mul(forward, -stockDistance));
  let center = add(origin, mul(forward, arrivalDistance(seconds - start, duration, stockDistance))), yaw = heading;
  let distance = arrivalDistance(seconds - start, duration, stockDistance), moving = seconds > start && seconds < start + duration;
  // First empty cart clears the shared approach before the second loaded cart departs.
  if (index === 0 && seconds >= 15) {
    const a = add(cartPickup, mul(forward, -10)), t = smooth((seconds - 15) / 10);
    center = mix(cartPickup, a, t); distance = 10 - 10 * t; moving = seconds < 25;
    if (seconds >= 25) {
      const u = smooth((seconds - 25) / 6), control = add(a, mul(forward, -2)), end = add(control, mul(right, 4));
      center = mix(mix(a, control, u), mix(control, end, u), u);
      const tangent = add(mul(sub(control, a), 2 * (1 - u)), mul(sub(end, control), 2 * u));
      yaw = Math.atan2(-tangent[0], -tangent[2]); moving = seconds < 31;
      // Numerically integrated fixed quadratic arc: deterministic wheel rolling.
      let length = 0, prior = a;
      for (let i = 1; i <= 32; i++) { const f = u * i / 32, p = mix(mix(a, control, f), mix(control, end, f), f); length += Math.hypot(...sub(p, prior)); prior = p; }
      distance = -length;
    }
  }
  const bedPose: RigidPose = { position: [center[0], frozen.cart.bedTopY - .12, center[2]], quaternion: yawQ(yaw) };
  const wheelCenters = [-1, 1].flatMap(x => [-1, 1].map(z => transformRigidPoint({ position: [center[0], .4, center[2]], quaternion: yawQ(yaw) }, [x * .79, 0, z * 1.9205953089396162])));
  return { id: `joint-cart-${index}`, bedPose, bedSize: [1.8, .24, frozen.cart.length], bedTopY: frozen.cart.bedTopY, groundY: 0, distance, moving, wheelRadius: .4, wheelAngle: distance / .4, wheelCenters, yaw, steeringYaw: yaw, state: seconds < (index === 0 ? 14 : 82) ? 'loaded' : 'empty' };
}
function loadPose(index: number, seconds: number, carrier: Carrier) {
  const r = routes[index]!, start = index === 0 ? 0 : 65, arrival = index === 0 ? 10 : 13, local = seconds - start;
  const rig = arrival + 4, hoist = rig + 12, rotate = hoist + 6, slew = rotate + 8, lower = slew + 4, seat = lower + 2;
  let p = r.final, phase: EiffelGroundLiftPilotSample['phase'] = 'lower', phaseProgress = 1, campaignPhase = 'seated';
  if (local < arrival) { p = { ...r.pickup, position: [carrier.bedPose.position[0] - .06, r.pickup.position[1], carrier.bedPose.position[2]] }; phase = 'cart-arrival'; phaseProgress = clamp(local / arrival); campaignPhase = local < 0 ? 'stock' : phase; }
  else if (local < rig) { p = r.pickup; phase = 'rigging'; phaseProgress = (local - arrival) / 4; campaignPhase = phase; }
  else if (local < hoist) { phase = 'hoist'; phaseProgress = (local - rig) / 12; p = interpolateRigidPose(r.pickup, r.high, smooth(phaseProgress)); campaignPhase = phase; }
  else if (local < rotate) { phase = 'rotation'; phaseProgress = (local - hoist) / 6; p = interpolateRigidPose(r.high, r.rotated, smooth(phaseProgress)); campaignPhase = phase; }
  else if (local < slew) { phase = 'slew'; phaseProgress = (local - rotate) / 8; const a = polar(r.rotated.position), b = polar(r.approach.position), t = smooth(phaseProgress); p = { ...r.rotated, position: polarPoint(a.r + (b.r - a.r) * t, a.a + (b.a - a.a) * t, r.high.position[1]) }; campaignPhase = phase; }
  else if (local < lower) { phaseProgress = (local - slew) / 4; p = interpolateRigidPose(r.approach, r.side, smooth(phaseProgress)); campaignPhase = 'lower-beside-joint'; }
  else if (local < seat) { phaseProgress = (local - lower) / 2; p = interpolateRigidPose(r.side, r.final, smooth(phaseProgress)); campaignPhase = 'slide-seat'; }
  return { pose: interpolateRigidPose(p, p, 0), phase, phaseProgress, campaignPhase, seat: start + seat, rigAt: start + rig };
}
/** Both ground stock poses are present from t=0; neither cargo is synthesized aloft. */
export function sampleEiffelJointCampaign(rawSeconds: number): EiffelJointCampaignSample {
  if (!Number.isFinite(rawSeconds)) throw new Error('Joint campaign time must be finite');
  const seconds = Math.max(0, Math.min(EIFFEL_JOINT_CAMPAIGN_DURATION, rawSeconds));
  const index: 0 | 1 = seconds < 65 ? 0 : 1, localSeconds = seconds - (index === 0 ? 0 : 65);
  const carriers = [carrierAt(0, seconds), carrierAt(1, seconds)] as const;
  const motion = [loadPose(0, seconds, carriers[0]), loadPose(1, seconds, carriers[1])] as const, active = motion[index], r = routes[index]!, length = frozen.loads[index]!.slingLength;
  const suspendedLoad = suspended(index, active.pose), pickup = suspended(index, r.pickup), final = suspended(index, r.final);
  const arrival = index === 0 ? 10 : 13, unrigAt = index === 0 ? 46 : 126, recoverAt = unrigAt + 3;
  let hook = suspendedLoad.hook, attachmentProgress = 1, phase: EiffelGroundLiftPilotSample['phase'] = active.phase, phaseProgress = active.phaseProgress, campaignPhase = active.campaignPhase;
  if (localSeconds < arrival) { hook = add(pickup.hook, [0, 2.1, 0]); attachmentProgress = 0; }
  else if (seconds < active.rigAt) { hook = mix(add(pickup.hook, [0, 2.1, 0]), pickup.hook, smooth((localSeconds - arrival) / 4)); attachmentProgress = smooth((localSeconds - arrival) / 4); }
  if (seconds >= active.seat && seconds < unrigAt) { hook = final.hook; campaignPhase = 'fastening'; }
  if (seconds >= unrigAt) { phase = 'unrigging'; phaseProgress = clamp((seconds - unrigAt) / 3); attachmentProgress = 1 - smooth(phaseProgress); hook = add(final.hook, [0, 2.1 * smooth(phaseProgress), 0]); campaignPhase = phase; }
  const finalPolar = polar(final.hook), recovered: V = [final.hook[0], heel[1] + Math.sqrt(180 - finalPolar.r ** 2) - 2, final.hook[2]];
  if (seconds >= recoverAt) { phase = 'hook-recovery'; phaseProgress = clamp((seconds - recoverAt) / 6); hook = mix(add(final.hook, [0,2.1,0]), recovered, smooth(phaseProgress)); attachmentProgress = 0; campaignPhase = phase; }
  if (seconds >= 55 && seconds < 65) {
    const next = add(suspended(1, routes[1]!.pickup).hook, [0, 2.1, 0]), a = polar(recovered), b = polar(next);
    if (seconds < 60) { const t = smooth((seconds - 55) / 5); hook = polarPoint(a.r + (b.r - a.r) * t, a.a + (b.a - a.a) * t, recovered[1]); }
    else hook = mix([next[0],recovered[1],next[2]], next, smooth((seconds - 60) / 5));
    campaignPhase = 'empty-hook-transfer'; attachmentProgress = 0;
  }
  const hp = polar(hook), rise = Math.sqrt(180 - hp.r ** 2), tieRise = Math.sqrt(148 - hp.r ** 2), tip: V = [hook[0], heel[1] + rise, hook[2]];
  const rigLugs = phase === 'cart-arrival' || phase === 'rigging' ? pickup.lugs : suspendedLoad.lugs;
  const slings = rigLugs.map((lug, i) => {
    let end = lug;
    if (seconds >= unrigAt || campaignPhase === 'empty-hook-transfer') {
      const initial = unit(sub(final.lugs[i]!, final.hook)), t = smooth((seconds - unrigAt) / 3);
      const direction = unit(mix(initial, [0,-1,0], t)); end = add(hook,mul(direction,length));
    } else if (phase === 'cart-arrival' || phase === 'rigging') {
      const direction = unit(mix([0,-1,0], unit(sub(pickup.lugs[i]!,pickup.hook)), attachmentProgress)); end = add(hook,mul(direction,length));
    }
    return { length, points: [hook, mix(hook,end,.5),end] as readonly [V,V,V] };
  });
  const withinWorkingAnnulus = hp.r >= 5.5 - 1e-8 && hp.r <= 12 + 1e-8, withinReviewSector = hp.a >= Math.PI / 3 - 1e-8 && hp.a <= 121.65 * Math.PI / 180 + 1e-8;
  const loads = motion.map((m, i): Load => ({ partId: EIFFEL_JOINT_CAMPAIGN_PART_IDS[i]!, pose: m.pose, state: seconds >= EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[i]! ? 'seated' : seconds < (i === 0 ? 0 : 65) ? 'stock' : 'moving', support: seconds >= EIFFEL_JOINT_CAMPAIGN_SEAT_TIMES[i]! ? seconds >= 126 ? 'permanent-joints' : 'temporary-joints' : seconds < m.rigAt ? 'carrier' : 'slings' })) as unknown as readonly [Load, Load];
  const basketLoops = motion.flatMap((m, loadIndex) => {
    const data = frozen.loads[loadIndex]!, h = data.basketHalfSection;
    return data.riggingLugs.map(eye => {
      const z = eye[2]!, local: V[] = [v(eye), [h,h,z], [-h,h,z], [-h,-h,z], [h,-h,z], v(eye)];
      const points = local.map(p => transformRigidPoint(m.pose,p));
      const length = points.slice(1).reduce((sum,p,i) => sum + Math.hypot(...sub(p,points[i]!)),0);
      return {loadIndex: loadIndex as 0|1, partId: EIFFEL_JOINT_CAMPAIGN_PART_IDS[loadIndex]!,points,length};
    });
  });
  const payloadCOM = transformRigidPoint(active.pose,v(frozen.loads[index]!.liftCOMLocal));
  const hookHorizontalCOMResidual = Math.hypot(hook[0]-payloadCOM[0],hook[2]-payloadCOM[2]);
  return { basketLoops, payloadCOM, hookHorizontalCOMResidual, seconds, phase, phaseProgress, reviewOnly: true, activeLoadIndex: index, localSeconds, campaignPhase, loads, carriers, carrier: carriers[index], payload: { partId: loads[index].partId, pose: active.pose, support: seconds >= active.seat ? 'final-joints' : seconds < active.rigAt ? 'carrier' : 'slings' }, crane: { root, rootYaw: -Math.PI / 4, heel, reach: hp.r, yaw: hp.a, boomAngle: Math.asin(hp.r / Math.sqrt(180)), tieAngle: Math.asin(hp.r / Math.sqrt(148)), slider: rise - tieRise, boomTip: tip, hook, hoistRopeLength: tip[1] - hook[1], withinWorkingAnnulus, withinReviewSector }, rigging: { attached: seconds >= active.rigAt && seconds < unrigAt, attachmentProgress, lugs: rigLugs, slings }, reviewIssues: [...(!withinWorkingAnnulus ? ['actual-hook-outside-working-annulus' as const] : []), ...(!withinReviewSector ? ['actual-hook-outside-reviewed-sector' as const] : [])], fasteningProgress: smooth((seconds - 114) / 12), permanentConnected: seconds >= 126 };
}
