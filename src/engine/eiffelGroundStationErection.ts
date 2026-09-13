import frozen from '../../artifacts/eiffel-integration-2026-09-07/guyenet-ne-station.json';
import { eiffelReceiverBeamBox } from './eiffelUpperClearance';
import type { RigidVec3 } from './eiffelRigid';

const IRON_KINDS = new Set(['rail-flange', 'rail-web', 'rail-back-bracket', 'guide-bearer']);
const IDENTITY_AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const;

export interface EiffelGroundStationSupportMember {
  readonly id: string;
  readonly material: 'timber' | 'iron';
  readonly center: RigidVec3;
  readonly half: RigidVec3;
  readonly axes: readonly [RigidVec3, RigidVec3, RigidVec3];
  readonly minY: number;
}

function asVec(value: readonly number[]): RigidVec3 {
  return [value[0]!, value[1]!, value[2]!];
}

function fromBeam(id: string, kind: string, a: readonly number[], b: readonly number[], halfWidth: number): EiffelGroundStationSupportMember {
  const box = eiffelReceiverBeamBox(asVec(a), asVec(b), halfWidth);
  return { id, material: IRON_KINDS.has(kind) ? 'iron' : 'timber', center: box.center, half: box.half, axes: box.axes, minY: Math.min(a[1]!, b[1]!) };
}

function fromAxisBox(id: string, material: EiffelGroundStationSupportMember['material'], center: readonly number[], size: readonly number[]): EiffelGroundStationSupportMember {
  return { id, material, center: asVec(center), half: [size[0]! / 2, size[1]! / 2, size[2]! / 2], axes: IDENTITY_AXES, minY: center[1]! - size[1]! / 2 };
}

/** Full-size falsework, guides and pickup deck, lowest contact first. */
export const EIFFEL_GROUND_STATION_SUPPORT_MEMBERS: readonly EiffelGroundStationSupportMember[] = [
  ...frozen.proposedStructure.map(beam => fromBeam(beam.id, beam.kind, beam.a, beam.b, beam.halfWidth)),
  ...frozen.pickupSupport.map(box => fromAxisBox(box.id, box.id === 'pickup-deck' ? 'timber' : 'iron', box.center, box.size)),
].sort((a, b) => a.minY - b.minY || a.center[1] - b.center[1] || a.id.localeCompare(b.id));

export const EIFFEL_GROUND_STATION_CRANE_ROLES = [
  'safety-base', 'main-screw', 'carriage', 'haul-nut', 'rail-skates',
  'safety-heads', 'head-anchor', 'rotor', 'slider', 'hoist-drum', 'jib', 'tie-left', 'tie-right',
] as const;

export const EIFFEL_STATION_ERECTION_END_SECONDS = 9;
export const EIFFEL_STATION_SUPPORT_SECONDS = 6.2;
export const EIFFEL_STATION_CRANE_START_SECONDS = 6.2;
export const EIFFEL_STATION_CRANE_END_SECONDS = 8.5;

export interface EiffelGroundStationErectionSample {
  readonly seatedSupportCount: number;
  readonly supportCount: number;
  readonly seatedSupportIds: readonly string[];
  readonly craneRoles: readonly string[];
  readonly authoredFalsework: boolean;
  readonly operational: boolean;
}

const ALL_SUPPORT_IDS = EIFFEL_GROUND_STATION_SUPPORT_MEMBERS.map(member => member.id);
const ALL_CRANE_ROLES = [...EIFFEL_GROUND_STATION_CRANE_ROLES, 'guides'];

export const EIFFEL_GROUND_STATION_ERECTION_READY: EiffelGroundStationErectionSample = Object.freeze({
  seatedSupportCount: ALL_SUPPORT_IDS.length,
  supportCount: ALL_SUPPORT_IDS.length,
  seatedSupportIds: ALL_SUPPORT_IDS,
  craneRoles: ALL_CRANE_ROLES,
  authoredFalsework: true,
  operational: true,
});

function sliceRoles(count: number): readonly string[] {
  return EIFFEL_GROUND_STATION_CRANE_ROLES.slice(0, Math.max(0, Math.min(EIFFEL_GROUND_STATION_CRANE_ROLES.length, count)));
}

/** Cinematic viewer seconds. Empty pads at 0; lift-ready plant at 9s. */
export function sampleEiffelGroundStationErection(rawSeconds: number): EiffelGroundStationErectionSample {
  if (!Number.isFinite(rawSeconds)) throw new Error('Station erection time must be finite');
  const seconds = Math.max(0, rawSeconds);
  if (seconds + 1e-9 >= EIFFEL_STATION_ERECTION_END_SECONDS) return EIFFEL_GROUND_STATION_ERECTION_READY;
  const supportCount = ALL_SUPPORT_IDS.length;
  const seatedSupportCount = Math.min(supportCount, Math.floor(supportCount * seconds / EIFFEL_STATION_SUPPORT_SECONDS));
  const craneProgress = (seconds - EIFFEL_STATION_CRANE_START_SECONDS) / (EIFFEL_STATION_CRANE_END_SECONDS - EIFFEL_STATION_CRANE_START_SECONDS);
  const craneCount = seconds < EIFFEL_STATION_CRANE_START_SECONDS ? 0
    : seconds >= EIFFEL_STATION_CRANE_END_SECONDS ? EIFFEL_GROUND_STATION_CRANE_ROLES.length
    : Math.min(EIFFEL_GROUND_STATION_CRANE_ROLES.length, Math.floor(craneProgress * EIFFEL_GROUND_STATION_CRANE_ROLES.length));
  const authoredFalsework = seatedSupportCount === supportCount;
  const craneRoles = authoredFalsework ? [...sliceRoles(craneCount), 'guides'] : sliceRoles(craneCount);
  return {
    seatedSupportCount,
    supportCount,
    seatedSupportIds: ALL_SUPPORT_IDS.slice(0, seatedSupportCount),
    craneRoles,
    authoredFalsework,
    operational: false,
  };
}
