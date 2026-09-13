import type { RigidPose, RigidQuat, RigidVec3 } from './eiffelRigid';

export const EIFFEL_SUMMIT_GIN_POLE_CLIMB_DURATION = 70;
export const EIFFEL_SUMMIT_GIN_POLE_X = -0.9;
export const EIFFEL_SUMMIT_GIN_POLE_Z = 0;
export const EIFFEL_SUMMIT_GIN_POLE_LENGTH = 6;
export const EIFFEL_SUMMIT_GIN_POLE_START_Y = 300.9;
export const EIFFEL_SUMMIT_GIN_POLE_END_Y = 305.566667;
export const EIFFEL_SUMMIT_GIN_POLE_JIB_LENGTH = 3;
export const EIFFEL_SUMMIT_GIN_POLE_ROPE_PER_CRANK_REVOLUTION = 0.2199;
export const EIFFEL_SUMMIT_GIN_POLE_ROPE_RADIUS = 0.006;

export type EiffelGinPoleGuideId =
  | 'old-lower'
  | 'old-upper'
  | 'new-lower'
  | 'new-upper';
export type EiffelGinPoleClimbPhase =
  | 'prepare'
  | 'open-old-lower'
  | 'lift-to-new-upper'
  | 'latch-new-upper'
  | 'lift-to-old-upper-release'
  | 'open-old-upper'
  | 'final-lift'
  | 'lock-and-unload'
  | 'park';

export interface EiffelGinPoleGuideState {
  readonly id: EiffelGinPoleGuideId;
  readonly centerY: number;
  readonly hinge: RigidVec3;
  /** Zero is closed around the pole; PI/2 is fully swung clear. */
  readonly angle: number;
  readonly leafQuaternions: readonly [RigidQuat, RigidQuat];
  readonly hingePinInsertion: number;
  readonly keeperClosure: number;
  readonly installed: boolean;
  readonly latched: boolean;
  readonly geometricallyEngaged: boolean;
}

export interface EiffelSummitGinPoleClimbSample {
  readonly seconds: number;
  readonly phase: EiffelGinPoleClimbPhase;
  readonly poleBottomY: number;
  /** Candidate GLB is authored with its station root at local origin. */
  readonly sourceRootPose: RigidPose;
  readonly sourceRootTranslation: RigidVec3;
  /** Semantic pole-bottom pose; the authored pole mesh centre is local Y=3. */
  readonly polePose: RigidPose;
  readonly jibPose: RigidPose;
  readonly guides: readonly EiffelGinPoleGuideState[];
  readonly engagedGuideIds: readonly EiffelGinPoleGuideId[];
  readonly engagedGuideCount: number;
  /** The drive bears axial load; closed guides are lateral guides only. */
  readonly driveLoaded: boolean;
  readonly finalShoesTightening: number;
  readonly axialPin: {
    readonly guideId: 'old-upper' | 'new-upper' | null;
    readonly insertion: number;
    readonly withdrawalZ: number;
    readonly locked: boolean;
    readonly poleHoleLocalY: 1.4;
    readonly diameter: 0.022;
  };
  readonly drive: {
    readonly fairlead: RigidVec3;
    readonly movingLug: RigidVec3;
    readonly span: number;
    readonly takeup: number;
    readonly crankRevolutions: number;
    readonly crankAngle: number;
    readonly crankSpeedRps: number;
    readonly peakLimitRps: 1;
    readonly kinematicOnly: true;
    readonly rope: {
      /** Ordered world-space centreline; render as straight segments only. */
      readonly points: readonly RigidVec3[];
      /** Fixed centreline through the west-sheave exit, suitable for caching. */
      readonly fixedPoints: readonly RigidVec3[];
      readonly radius: typeof EIFFEL_SUMMIT_GIN_POLE_ROPE_RADIUS;
      readonly fixedLength: number;
      readonly deployedLength: number;
      readonly freeLength: number;
    };
  };
}

export interface EiffelGinPoleRoleTransform {
  readonly role: string;
  /** Absolute world position for roots; authored parent-local position for children. */
  readonly position?: RigidVec3;
  readonly quaternion?: RigidQuat;
}

const GUIDE_Y: Readonly<Record<EiffelGinPoleGuideId, number>> = {
  'old-lower': 301.85,
  'old-upper': 302.3,
  'new-lower': 305.766667,
  'new-upper': 306.966667,
};
const FAIRLEAD: RigidVec3 = [-1.1, 307.2, 0.34];
const IDENTITY: RigidQuat = [0, 0, 0, 1];
const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const ramp = (seconds: number, start: number, end: number) =>
  smooth((seconds - start) / (end - start));
const yQuat = (angle: number): RigidQuat => [
  0,
  Math.sin(angle / 2),
  0,
  Math.cos(angle / 2),
];

function phaseAt(seconds: number): EiffelGinPoleClimbPhase {
  if (seconds < 5) return 'prepare';
  if (seconds < 9) return 'open-old-lower';
  if (seconds < 14) return 'lift-to-new-upper';
  if (seconds < 20) return 'latch-new-upper';
  if (seconds < 27) return 'lift-to-old-upper-release';
  if (seconds < 32) return 'open-old-upper';
  if (seconds < 60) return 'final-lift';
  if (seconds < 66) return 'lock-and-unload';
  return 'park';
}

function poleBottomAt(seconds: number): number {
  if (seconds < 9) return EIFFEL_SUMMIT_GIN_POLE_START_Y;
  if (seconds < 14)
    return EIFFEL_SUMMIT_GIN_POLE_START_Y + 0.4 * ramp(seconds, 9, 14);
  if (seconds < 20) return EIFFEL_SUMMIT_GIN_POLE_START_Y + 0.4;
  if (seconds < 27)
    return EIFFEL_SUMMIT_GIN_POLE_START_Y +
      0.4 +
      0.7 * ramp(seconds, 20, 27);
  if (seconds < 32) return EIFFEL_SUMMIT_GIN_POLE_START_Y + 1.1;
  if (seconds < 60)
    return EIFFEL_SUMMIT_GIN_POLE_START_Y +
      1.1 +
      (EIFFEL_SUMMIT_GIN_POLE_END_Y - EIFFEL_SUMMIT_GIN_POLE_START_Y - 1.1) *
        ramp(seconds, 32, 60);
  return EIFFEL_SUMMIT_GIN_POLE_END_Y;
}

function guideMotion(id: EiffelGinPoleGuideId, seconds: number) {
  if (id === 'old-lower') {
    return {
      angle: (Math.PI / 2) * ramp(seconds, 7, 9),
      pin: 1 - ramp(seconds, 6, 7),
      keeper: 1 - ramp(seconds, 5, 6),
    };
  }
  if (id === 'old-upper') {
    return {
      angle: (Math.PI / 2) * ramp(seconds, 30, 32),
      pin: 1 - ramp(seconds, 29, 30),
      keeper: 1 - ramp(seconds, 27, 29),
    };
  }
  if (id === 'new-upper') {
    return {
      angle: (Math.PI / 2) * (1 - ramp(seconds, 14, 18)),
      pin: ramp(seconds, 18, 19),
      keeper: ramp(seconds, 19, 20),
    };
  }
  return { angle: 0, pin: 1, keeper: 1 };
}

function guideState(
  id: EiffelGinPoleGuideId,
  seconds: number,
  poleBottomY: number,
): EiffelGinPoleGuideState {
  const centerY = GUIDE_Y[id];
  const motion = guideMotion(id, seconds);
  const latched =
    motion.angle <= 1e-12 && motion.pin >= 1 - 1e-12 && motion.keeper >= 1 - 1e-12;
  const longitudinalOverlap =
    poleBottomY <= centerY - 0.06 + 1e-12 &&
    poleBottomY + EIFFEL_SUMMIT_GIN_POLE_LENGTH >= centerY + 0.06 - 1e-12;
  return {
    id,
    centerY,
    hinge: [-0.4, centerY, 0],
    angle: motion.angle,
    leafQuaternions: [yQuat(motion.angle), yQuat(-motion.angle)],
    hingePinInsertion: motion.pin,
    keeperClosure: motion.keeper,
    installed: true,
    latched,
    geometricallyEngaged: latched && longitudinalOverlap,
  };
}

const initialMovingLug: RigidVec3 = [
  -1.1,
  EIFFEL_SUMMIT_GIN_POLE_START_Y + 0.08,
  0.34,
];
const distance = (a: RigidVec3, b: RigidVec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const initialSpan = distance(FAIRLEAD, initialMovingLug);

const lineLength = (points: readonly RigidVec3[]) =>
  points.slice(1).reduce((sum, point, index) => sum + distance(points[index]!, point), 0);
const arc = (
  center: RigidVec3,
  radius: number,
  start: number,
  end: number,
  plane: 'yz' | 'xy',
  segments = 12,
): readonly RigidVec3[] =>
  Array.from({ length: segments + 1 }, (_, index) => {
    const angle = start + ((end - start) * index) / segments;
    return plane === 'yz'
      ? [center[0], center[1] + radius * Math.sin(angle), center[2] + radius * Math.cos(angle)]
      : [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle), center[2]];
  });

const FIXED_ROPE_POINTS: readonly RigidVec3[] = [
  [0.25, 306.98, -0.12],
  [0.25, 306.98, 0.28],
  ...arc([0.25, 307.04, 0.28], 0.06, -Math.PI / 2, 0, 'yz').slice(1),
  [0.25, 307.22, 0.34],
  ...arc([0.19, 307.22, 0.34], 0.06, 0, Math.PI / 2, 'xy').slice(1),
  [-1.02, 307.28, 0.34],
  ...arc([-1.02, 307.2, 0.34], 0.08, Math.PI / 2, Math.PI, 'xy').slice(1),
];
const FIXED_ROPE_LENGTH = lineLength(FIXED_ROPE_POINTS);

function liftVelocity(seconds: number): number {
  const segment =
    seconds >= 9 && seconds <= 14
      ? { start: 9, end: 14, distance: 0.4 }
      : seconds >= 20 && seconds <= 27
        ? { start: 20, end: 27, distance: 0.7 }
        : seconds >= 32 && seconds <= 60
          ? {
              start: 32,
              end: 60,
              distance:
                EIFFEL_SUMMIT_GIN_POLE_END_Y -
                EIFFEL_SUMMIT_GIN_POLE_START_Y -
                1.1,
            }
          : null;
  if (!segment) return 0;
  const u = clamp((seconds - segment.start) / (segment.end - segment.start));
  return (segment.distance * 6 * u * (1 - u)) / (segment.end - segment.start);
}

export function sampleEiffelSummitGinPoleClimb(
  rawSeconds: number,
): EiffelSummitGinPoleClimbSample {
  if (!Number.isFinite(rawSeconds))
    throw new Error('Eiffel summit gin-pole time must be finite');
  const seconds = clamp(rawSeconds, 0, EIFFEL_SUMMIT_GIN_POLE_CLIMB_DURATION);
  const poleBottomY = poleBottomAt(seconds);
  const polePose: RigidPose = {
    position: [EIFFEL_SUMMIT_GIN_POLE_X, poleBottomY, EIFFEL_SUMMIT_GIN_POLE_Z],
    quaternion: IDENTITY,
  };
  const jibPose: RigidPose = {
    position: [
      EIFFEL_SUMMIT_GIN_POLE_X,
      poleBottomY + EIFFEL_SUMMIT_GIN_POLE_LENGTH,
      EIFFEL_SUMMIT_GIN_POLE_Z,
    ],
    quaternion: IDENTITY,
  };
  const ids: readonly EiffelGinPoleGuideId[] = [
    'old-lower',
    'old-upper',
    'new-lower',
    'new-upper',
  ];
  const guides = ids.map((id) => guideState(id, seconds, poleBottomY));
  const engagedGuideIds = guides
    .filter((guide) => guide.geometricallyEngaged)
    .map((guide) => guide.id);
  const movingLug: RigidVec3 = [
    -1.1,
    poleBottomY + 0.08,
    0.34,
  ];
  const span = distance(FAIRLEAD, movingLug);
  const takeup = initialSpan - span;
  const oldInsertion = 1 - ramp(seconds, 5, 7);
  const newInsertion = ramp(seconds, 60, 63);
  const axialPin =
    seconds < 7
      ? { guideId: 'old-upper' as const, insertion: oldInsertion }
      : seconds < 60
        ? { guideId: null, insertion: 0 }
        : { guideId: 'new-upper' as const, insertion: newInsertion };
  const crankRevolutions =
    takeup / EIFFEL_SUMMIT_GIN_POLE_ROPE_PER_CRANK_REVOLUTION;
  return {
    seconds,
    phase: phaseAt(seconds),
    poleBottomY,
    sourceRootPose: { position: [0, poleBottomY, 0], quaternion: IDENTITY },
    sourceRootTranslation: [0, poleBottomY - EIFFEL_SUMMIT_GIN_POLE_START_Y, 0],
    polePose,
    jibPose,
    guides,
    engagedGuideIds,
    engagedGuideCount: engagedGuideIds.length,
    driveLoaded: seconds >= 5 && seconds < 66,
    finalShoesTightening: ramp(seconds, 60, 64),
    axialPin: {
      ...axialPin,
      withdrawalZ: 0.24 * (1 - axialPin.insertion),
      locked: axialPin.insertion >= 1 - 1e-12,
      poleHoleLocalY: 1.4,
      diameter: 0.022,
    },
    drive: {
      fairlead: FAIRLEAD,
      movingLug,
      span,
      takeup,
      crankRevolutions,
      crankAngle: crankRevolutions * Math.PI * 2,
      crankSpeedRps:
        liftVelocity(seconds) /
        EIFFEL_SUMMIT_GIN_POLE_ROPE_PER_CRANK_REVOLUTION,
      peakLimitRps: 1,
      kinematicOnly: true,
      rope: {
        points: [...FIXED_ROPE_POINTS, movingLug],
        fixedPoints: FIXED_ROPE_POINTS,
        radius: EIFFEL_SUMMIT_GIN_POLE_ROPE_RADIUS,
        fixedLength: FIXED_ROPE_LENGTH,
        deployedLength: span,
        freeLength: FIXED_ROPE_LENGTH + span,
      },
    },
  };
}

const xQuat = (angle: number): RigidQuat => [
  Math.sin(angle / 2),
  0,
  0,
  Math.cos(angle / 2),
];
const zQuat = (angle: number): RigidQuat => [
  0,
  0,
  Math.sin(angle / 2),
  Math.cos(angle / 2),
];

/**
 * Adapter for the actual world-authored GLB. Fixed guide roots are deliberately
 * omitted: applying the legacy whole-asset sourceRootPose would move their mast
 * contacts. Positions below are absolute only for `moving-pole`; leaf, latch,
 * axial-pin, jib and drive transforms are local to their authored parents.
 */
export function eiffelSummitGinPoleRoleTransforms(
  sample: EiffelSummitGinPoleClimbSample,
): readonly EiffelGinPoleRoleTransform[] {
  const result: EiffelGinPoleRoleTransform[] = [
    { role: 'moving-pole', position: sample.polePose.position },
    { role: 'jib-yaw', position: [0, EIFFEL_SUMMIT_GIN_POLE_LENGTH, 0] },
    { role: 'jib-pitch', quaternion: zQuat((78 * Math.PI) / 180) },
  ];
  for (let index = 0; index < sample.guides.length; index++) {
    const guide = sample.guides[index]!;
    for (const [sideIndex, side] of ['north', 'south'].entries()) {
      const sideSign = side === 'north' ? 1 : -1;
      result.push({
        role: `guide-${index}-${side}-leaf`,
        quaternion: guide.leafQuaternions[sideIndex]!,
      });
      result.push({
        role: `guide-${index}-${side}-latch`,
        // The authored keeper pin runs along leaf-local Y. Retain its authored
        // north/south Z station while withdrawing it above the hinge knuckles.
        position: [
          -0.08,
          (index === 0 ? -0.3 : 0.3) * (1 - guide.hingePinInsertion),
          sideSign * 0.13,
        ],
      });
    }
  }
  const oldAxialInsertion =
    sample.seconds < 7 ? sample.axialPin.insertion : 0;
  const newAxialInsertion =
    sample.seconds >= 60 ? sample.axialPin.insertion : 0;
  result.push(
    {
      role: 'guide-1-axial-pin',
      position: [-0.5, 0, 0.24 * (1 - oldAxialInsertion)],
    },
    {
      role: 'guide-3-axial-pin',
      position: [-0.5, 0, 0.24 * (1 - newAxialInsertion)],
    },
    {
      role: 'climb-input-crank',
      quaternion: xQuat(sample.drive.crankAngle),
    },
    {
      role: 'climb-output-gear',
      quaternion: xQuat(-sample.drive.crankAngle / 2),
    },
    {
      role: 'climb-winch-drum',
      quaternion: xQuat(-sample.drive.crankAngle / 2),
    },
    {
      role: 'climb-ratchet-wheel',
      quaternion: xQuat(-sample.drive.crankAngle / 2),
    },
  );
  return result;
}
