import type {
  ForbiddenCityManifest, PalaceFeature, PalaceFeatureKind, PalacePart, PalaceQuaternion,
  PalaceSupport, PalaceVec3,
} from '../data/forbiddenCityTypes';
import { clamp, smoothstep } from './easing';
import { interpolateRigidPose, rotateRigidVector, transformRigidPoint } from './eiffelRigid';
import type { RigidPose } from './eiffelRigid';

export const FORBIDDEN_CITY_DURATION = 180;
export type ForbiddenCityPartPhase = 'queued' | 'moving' | 'seated';
export type ForbiddenCityOperationPhase = 'stock' | 'transport' | 'align' | 'raise' | 'seat' | 'secured';
export interface ForbiddenCityPartSample {
  readonly partId: string;
  readonly phase: ForbiddenCityPartPhase;
  readonly pose: RigidPose;
  readonly owner: 'stock' | 'carrier' | 'rig' | 'structure';
  /** A missing source route is never rendered at the final pose as queued stock. */
  readonly visible: boolean;
  readonly feature?: PalaceFeatureKind;
}
export interface ForbiddenCityRoleSample {
  readonly role: string;
  readonly pose: RigidPose;
  readonly visible: boolean;
}
export interface ForbiddenCityFeatureSample {
  readonly id: PalaceFeatureKind;
  readonly partId: string;
  readonly phase: ForbiddenCityOperationPhase;
  readonly payload: ForbiddenCityPartSample;
  readonly carrier: {
    /** No role is assigned until the saved source supplies its identity and origin convention. */
    readonly role?: string;
    readonly pose?: RigidPose;
    readonly ownsPayload: boolean;
  };
  readonly rope: { readonly points: readonly PalaceVec3[]; readonly attached: boolean };
  /** Authored sole stations / work targets. These are not a solved human rig. */
  readonly crew: readonly {
    readonly id: string;
    readonly station: PalaceVec3;
    readonly job: 'haul' | 'guide' | 'rig' | 'fit' | 'stand-by';
    readonly target?: PalaceVec3;
  }[];
  readonly supportIds: readonly string[];
}
export interface ForbiddenCityConstructionSample {
  readonly seconds: number;
  readonly t: number;
  readonly skyT: number;
  readonly phase: 'arrival' | PalaceFeatureKind | 'reveal';
  readonly parts: readonly ForbiddenCityPartSample[];
  readonly features: readonly ForbiddenCityFeatureSample[];
  readonly roles: readonly ForbiddenCityRoleSample[];
  readonly activeCount: number;
  readonly seatedCount: number;
  readonly admission: { readonly complete: boolean; readonly missing: readonly string[] };
}

const IDENTITY: PalaceQuaternion = [0, 0, 0, 1];
const ZERO: PalaceVec3 = [0, 0, 0];
const TRANSPORT_END = 0.65;
const SEAT_END = 0.94;
const POSITION_TOLERANCE = 0.001;
const distance = (a: PalaceVec3, b: PalaceVec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const subtract = (a: PalaceVec3, b: PalaceVec3): PalaceVec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp = (a: PalaceVec3, b: PalaceVec3, t: number): PalaceVec3 =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function forbiddenCitySeconds(rawSeconds: number): number {
  if (!Number.isFinite(rawSeconds)) throw new Error('Forbidden City time must be finite');
  return clamp(rawSeconds, 0, FORBIDDEN_CITY_DURATION);
}

/** Shared flat/ramp height: interpolate the whole chord, never ease Y independently. */
export function forbiddenCitySupportY(support: PalaceSupport, x: number, z: number): number | null {
  const [minX, maxX, minZ, maxZ] = support.bounds;
  if (x < minX - 1e-6 || x > maxX + 1e-6 || z < minZ - 1e-6 || z > maxZ + 1e-6) return null;
  if (support.kind !== 'ramp') return support.topY;
  if (support.lowY === undefined || support.downhillZ === undefined || support.uphillZ === undefined
    || support.downhillZ === support.uphillZ) return null;
  return support.lowY + (support.topY - support.lowY)
    * clamp((z - support.downhillZ) / (support.uphillZ - support.downhillZ));
}

/** Continuous, fixed-size material route with a deliberate stop at each authored corner. */
export function forbiddenCityRoutePoint(points: readonly PalaceVec3[], rawProgress: number): PalaceVec3 {
  if (points.length === 0) throw new Error('Forbidden City route requires an authored point');
  const progress = clamp(rawProgress);
  const lengths = points.slice(1).map((point, i) => distance(points[i]!, point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total < 1e-9 || progress <= 0) return [...points[0]!];
  if (progress >= 1) return [...points.at(-1)!];
  let travelled = total * progress;
  for (let i = 0; i < lengths.length; i += 1) {
    const length = lengths[i]!;
    if (length < 1e-9) continue;
    if (travelled <= length) return lerp(points[i]!, points[i + 1]!, smoothstep(travelled / length));
    travelled -= length;
  }
  return [...points.at(-1)!];
}

function finalPose(part: PalacePart): RigidPose {
  return { position: part.finalPosition, quaternion: part.finalRotation };
}

function pivotPose(part: PalacePart, feature: PalaceFeature, progress: number): RigidPose {
  const quaternion = interpolateRigidPose(
    { position: ZERO, quaternion: feature.transportRotation ?? part.finalRotation },
    { position: ZERO, quaternion: part.finalRotation },
    smoothstep(progress),
  ).quaternion;
  // The point stays planted through every orientation; interpolating part centres would slide it.
  return { position: subtract(feature.pivot!, rotateRigidVector(quaternion, part.bottomContact)), quaternion };
}

function featurePart(part: PalacePart, feature: PalaceFeature, seconds: number): ForbiddenCityPartSample {
  const [from, to] = feature.window;
  const p = clamp((seconds - from) / (to - from));
  const transportRotation = feature.transportRotation ?? part.finalRotation;
  const route = [feature.stock, ...feature.approach];
  const approach = route.at(-1)!;
  let pose: RigidPose;
  if (p <= TRANSPORT_END) {
    pose = { position: forbiddenCityRoutePoint(route, p / TRANSPORT_END), quaternion: transportRotation };
  } else if (feature.id === 'column' && feature.pivot) {
    pose = pivotPose(part, feature, (p - TRANSPORT_END) / (SEAT_END - TRANSPORT_END));
  } else {
    pose = interpolateRigidPose({ position: approach, quaternion: transportRotation }, finalPose(part),
      smoothstep((p - TRANSPORT_END) / (SEAT_END - TRANSPORT_END)));
  }
  const seated = p >= SEAT_END;
  return {
    partId: part.id, feature: feature.id,
    phase: seated ? 'seated' : seconds <= from ? 'queued' : 'moving',
    pose: seated ? finalPose(part) : pose,
    owner: seated ? 'structure' : p <= 0 ? 'stock' : p <= TRANSPORT_END ? 'carrier' : 'rig',
    visible: true,
  };
}

function parallelPart(part: PalacePart, seconds: number): ForbiddenCityPartSample {
  if (part.prepared) return { partId: part.id, phase: 'seated', pose: finalPose(part), owner: 'structure', visible: true };
  if (!part.delivery) {
    return { partId: part.id, phase: 'queued', pose: finalPose(part), owner: 'stock', visible: false };
  }
  const [from, to] = part.seatWindow;
  const p = clamp((seconds - from) / (to - from));
  const pose = p >= 1 ? finalPose(part) : {
    position: forbiddenCityRoutePoint([part.delivery.stock, ...part.delivery.approach, part.finalPosition], p),
    quaternion: part.finalRotation,
  };
  return {
    partId: part.id, phase: p >= 1 ? 'seated' : p <= 0 ? 'queued' : 'moving', pose,
    owner: p >= 1 ? 'structure' : p <= 0 ? 'stock' : part.delivery.liftHead ? 'rig' : 'carrier',
    visible: true,
  };
}

function featureSample(feature: PalaceFeature, part: PalacePart, payload: ForbiddenCityPartSample,
  seconds: number): ForbiddenCityFeatureSample {
  const p = clamp((seconds - feature.window[0]) / (feature.window[1] - feature.window[0]));
  const phase: ForbiddenCityOperationPhase = p <= 0 ? 'stock' : p < TRANSPORT_END ? 'transport'
    : p < SEAT_END ? feature.id === 'column' ? 'raise' : 'align' : p < 1 ? 'seat' : 'secured';
  const transportRotation = feature.transportRotation ?? part.finalRotation;
  const carrierPartPose: RigidPose = {
    position: forbiddenCityRoutePoint([feature.stock, ...feature.approach], Math.min(p / TRANSPORT_END, 1)),
    quaternion: transportRotation,
  };
  const contact = feature.transportContact ? transformRigidPoint(carrierPartPose, feature.transportContact) : undefined;
  const liftingContact = feature.liftingContact ? transformRigidPoint(payload.pose, feature.liftingContact) : undefined;
  const carrier: ForbiddenCityFeatureSample['carrier'] = {
    ...(contact ? { pose: { position: [contact[0], contact[1] - feature.carrierTop, contact[2]] as PalaceVec3,
      quaternion: IDENTITY } } : {}),
    ownsPayload: !!contact && (payload.owner === 'carrier' || payload.owner === 'stock'),
  };
  return {
    id: feature.id, partId: part.id, phase, payload, carrier,
    rope: { points: liftingContact ? [feature.liftHead, liftingContact] : [],
      attached: !!liftingContact && p >= TRANSPORT_END && p < 1 },
    crew: feature.crewStations.map((station, i) => ({
      id: `${feature.id}-worker-${i}`, station,
      job: p <= 0 || p >= 1 ? 'stand-by' : p < TRANSPORT_END ? 'haul' : feature.id === 'column' ? 'rig' : 'fit',
      ...(liftingContact ? { target: liftingContact } : {}),
    })),
    supportIds: feature.supportIds,
  };
}

/** Contract errors are visible diagnostics, not permission to substitute a floating final pose. */
export function forbiddenCityConstructionIssues(manifest: ForbiddenCityManifest): string[] {
  const issues: string[] = [];
  const parts = new Map(manifest.parts.map((part) => [part.id, part]));
  const supportIds = new Set(manifest.supports.map((support) => support.id));
  const features = new Map(manifest.features.map((feature) => [feature.partId, feature]));
  if (parts.size !== manifest.parts.length) issues.push('duplicate structural part identity');
  if (features.size !== manifest.features.length) issues.push('multiple features own the same part');
  for (const part of manifest.parts) {
    const feature = features.get(part.id);
    if (!part.prepared && !feature && !part.delivery) issues.push(`${part.id}: missing prepared state or delivery route`);
    if (!part.prepared && !(part.seatWindow[1] > part.seatWindow[0] && part.seatWindow[0] >= 0
      && part.seatWindow[1] <= FORBIDDEN_CITY_DURATION)) issues.push(`${part.id}: invalid seat window`);
    for (const id of part.supportIds) {
      const supporter = parts.get(id);
      if (!supporter && !supportIds.has(id)) issues.push(`${part.id}: unknown support ${id}`);
      if (supporter && !supporter.prepared && supporter.seatWindow[1] > part.seatWindow[0]) {
        issues.push(`${part.id}: support ${id} is not seated before delivery`);
      }
    }
    if (part.delivery) for (const id of part.delivery.supportIds) {
      if (!supportIds.has(id) && !parts.has(id)) issues.push(`${part.id}: unknown delivery support ${id}`);
    }
  }
  for (const feature of manifest.features) {
    const part = parts.get(feature.partId);
    if (!part) { issues.push(`${feature.id}: missing structural part ${feature.partId}`); continue; }
    if (!(feature.window[1] > feature.window[0])) issues.push(`${feature.id}: invalid operation window`);
    if (distance(feature.seat, part.finalPosition) > POSITION_TOLERANCE) issues.push(`${feature.id}: seat origin differs from final pose`);
    if (!feature.transportContact) issues.push(`${feature.id}: missing local carrier contact`);
    if (!feature.liftingContact) issues.push(`${feature.id}: missing local lifting contact`);
    if (feature.approach.length === 0) issues.push(`${feature.id}: missing approach route`);
    if (feature.id === 'column') {
      if (!feature.pivot || !feature.transportRotation) issues.push('column: missing supported pivot or transport orientation');
      else {
        if (distance(feature.approach.at(-1) ?? feature.stock, pivotPose(part, feature, 0).position) > POSITION_TOLERANCE) {
          issues.push('column: route does not meet the planted pivot pose');
        }
        if (distance(feature.pivot, transformRigidPoint(finalPose(part), part.bottomContact)) > POSITION_TOLERANCE) {
          issues.push('column: final foot differs from the planted pivot');
        }
      }
    }
  }
  // Sweep interval events, including simultaneous boundary hand-offs. No clock-dependent throttling.
  const events = manifest.parts.filter((part) => !part.prepared && (features.has(part.id) || part.delivery))
    .flatMap((part) => {
      const feature = features.get(part.id);
      const [from, to] = feature?.window ?? part.seatWindow;
      return [{ t: from, delta: 1 }, { t: feature ? from + (to - from) * SEAT_END : to, delta: -1 }];
    }).sort((a, b) => a.t - b.t || a.delta - b.delta);
  let active = 0;
  for (const event of events) { active += event.delta; if (active > 24) { issues.push('more than 24 simultaneous moving parts'); break; } }
  if (manifest.features.reduce((sum, feature) => sum + feature.crewStations.length, 0) > 48) issues.push('more than 48 featured workers');
  return issues;
}

/** Source manifest is immutable. Caching validation avoids scanning dependency edges every frame. */
const issueCache = new WeakMap<ForbiddenCityManifest, readonly string[]>();

export function sampleForbiddenCityConstruction(manifest: ForbiddenCityManifest, rawSeconds: number): ForbiddenCityConstructionSample {
  const seconds = forbiddenCitySeconds(rawSeconds);
  const featureMap = new Map(manifest.features.map((feature) => [feature.partId, feature]));
  const parts = manifest.parts.map((part) => {
    const feature = featureMap.get(part.id);
    return feature ? featurePart(part, feature, seconds) : parallelPart(part, seconds);
  });
  const partMap = new Map(parts.map((part) => [part.partId, part]));
  const sourceMap = new Map(manifest.parts.map((part) => [part.id, part]));
  const features = manifest.features.flatMap((feature) => {
    const part = sourceMap.get(feature.partId);
    const payload = partMap.get(feature.partId);
    return part && payload ? [featureSample(feature, part, payload, seconds)] : [];
  });
  let issues = issueCache.get(manifest);
  if (!issues) { issues = forbiddenCityConstructionIssues(manifest); issueCache.set(manifest, issues); }
  const missing = [...issues, ...(manifest.admission?.missing ?? []),
    'saved carrier role identities and root/contact conventions not bound',
    'worker routes, limb poses and hand contacts not solved against saved geometry'];
  return {
    seconds, t: seconds / FORBIDDEN_CITY_DURATION, skyT: seconds / FORBIDDEN_CITY_DURATION,
    phase: seconds < 18 ? 'arrival' : seconds < 50 ? 'foundation' : seconds < 98 ? 'column' : seconds < 150 ? 'roof' : 'reveal',
    parts, features, roles: [],
    activeCount: parts.filter((part) => part.phase === 'moving').length,
    seatedCount: parts.filter((part) => part.phase === 'seated').length,
    admission: { complete: manifest.admission?.constructionComplete === true && missing.length === 0, missing },
  };
}
