import { transformRigidPoint, type RigidPose, type RigidVec3 } from './eiffelRigid';

export interface EiffelCraneStation {
  readonly base: RigidVec3;
  readonly mastHeight: number;
  readonly boomLength: number;
  /** Fixed authored bearing pad, metres. Omission preserves the legacy rig. */
  readonly supportPadSize?: RigidVec3;
}

export interface EiffelCraneSample {
  readonly base: RigidVec3;
  readonly pivot: RigidVec3;
  readonly boomTip: RigidVec3;
  readonly hook: RigidVec3;
  readonly lugs: readonly RigidVec3[];
  readonly ropeLength: number;
  readonly horizontalReach: number;
  readonly boomLength: number;
  readonly supportPadSize?: RigidVec3;
}

const finiteVec3 = (value: RigidVec3): boolean => value.every(Number.isFinite);

/**
 * Samples a fixed, authored creeper crane. The caller remains responsible for
 * placing `base` on a real, already-seated support surface.
 */
export function sampleEiffelCrane(
  station: EiffelCraneStation,
  cargoPose: RigidPose,
  localLugs: readonly RigidVec3[],
  slingRise = 1.5,
): EiffelCraneSample {
  if (!finiteVec3(station.base)) throw new Error('Eiffel crane base must be finite');
  if (station.supportPadSize && (!finiteVec3(station.supportPadSize) || station.supportPadSize.some(value => value <= 0))) {
    throw new Error('Eiffel crane bearing pad must have finite positive dimensions');
  }
  if (!Number.isFinite(station.mastHeight) || station.mastHeight <= 0) {
    throw new Error('Eiffel crane mast height must be finite and positive');
  }
  if (station.mastHeight > 22) throw new Error('Eiffel crane mast height exceeds 22 m');
  if (!Number.isFinite(station.boomLength) || station.boomLength <= 0) {
    throw new Error('Eiffel crane boom length must be finite and positive');
  }
  if (station.boomLength > 8.4) throw new Error('Eiffel crane boom length exceeds 8.4 m');
  if (!Number.isFinite(slingRise) || slingRise <= 0) {
    throw new Error('Eiffel crane sling rise must be finite and positive');
  }
  if (localLugs.length === 0) throw new Error('Eiffel crane requires at least one lift lug');
  for (const lug of localLugs) {
    if (!finiteVec3(lug)) throw new Error('Eiffel crane lift lugs must be finite');
  }

  const lugs = localLugs.map(lug => transformRigidPoint(cargoPose, lug));
  const centroidX = lugs.reduce((sum, lug) => sum + lug[0], 0) / lugs.length;
  const centroidZ = lugs.reduce((sum, lug) => sum + lug[2], 0) / lugs.length;
  const highestLug = Math.max(...lugs.map(lug => lug[1]));
  const pivot: RigidVec3 = [
    station.base[0],
    station.base[1] + station.mastHeight,
    station.base[2],
  ];
  const hook: RigidVec3 = [centroidX, highestLug + slingRise, centroidZ];
  const horizontalReach = Math.hypot(hook[0] - pivot[0], hook[2] - pivot[2]);
  if (horizontalReach > station.boomLength) {
    throw new Error(
      `Eiffel crane cargo is unreachable: ${horizontalReach.toFixed(3)} m reach exceeds ${station.boomLength.toFixed(3)} m boom`,
    );
  }

  const verticalBoom = Math.sqrt(Math.max(0, station.boomLength ** 2 - horizontalReach ** 2));
  const boomTip: RigidVec3 = [hook[0], pivot[1] + verticalBoom, hook[2]];
  const ropeLength = boomTip[1] - hook[1];
  if (!(ropeLength > 0)) {
    throw new Error(
      `Eiffel crane hook must remain below the boom tip with a positive cable; clearance is ${ropeLength.toFixed(3)} m`,
    );
  }

  return {
    base: [...station.base],
    pivot,
    boomTip,
    hook,
    lugs,
    ropeLength,
    horizontalReach,
    boomLength: station.boomLength,
    ...(station.supportPadSize ? { supportPadSize: station.supportPadSize } : {}),
  };
}
