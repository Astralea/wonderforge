import type { EiffelKitManifest, EiffelKitPart } from '../data/eiffelKitTypes';
import { sampleEiffelCrane, type EiffelCraneSample, type EiffelCraneStation } from './eiffelCrane';
import { interpolateRigidPose, transformedRigidBounds, type RigidPose, type RigidVec3 } from './eiffelRigid';

const LEGS = ['ne', 'se', 'sw', 'nw'] as const;
const START = 0.06;
const END = 0.28;
const PARTS_PER_LEG = 4;
const CLEARANCE = 0.75;

export interface EiffelKitSupportSurface {
  readonly sourceGroup: string;
  readonly min: RigidVec3;
  readonly max: RigidVec3;
  readonly topY: number;
  /** Four authored bearing plates below the temporary grillage. */
  readonly bearingPads: readonly { readonly min: RigidVec3; readonly max: RigidVec3 }[];
}

export interface EiffelKitPilotOperation {
  readonly part: EiffelKitPart;
  readonly support: EiffelKitSupportSurface;
  readonly station: EiffelCraneStation;
  readonly start: number;
  readonly end: number;
  readonly pickupPose: RigidPose;
  readonly clearPose: RigidPose;
  readonly seatApproachPose: RigidPose;
}

export interface EiffelKitPilotPlan {
  readonly constructionReady: false;
  readonly operations: readonly EiffelKitPilotOperation[];
  readonly remainingGates: readonly string[];
}

export interface EiffelKitPilotSample {
  readonly phase: 'queued' | 'pickup' | 'hoist' | 'transfer' | 'lower' | 'seated';
  readonly pose: RigidPose;
  readonly crane: EiffelCraneSample | null;
}

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

function foundationSurfaces(manifest: EiffelKitManifest): EiffelKitSupportSurface[] {
  const groups = new Map<string, EiffelKitPart[]>();
  for (const part of manifest.parts) {
    if (part.group !== 'foundation') continue;
    if (!groups.has(part.sourceGroup)) groups.set(part.sourceGroup, []);
    groups.get(part.sourceGroup)!.push(part);
  }
  return [...groups].map(([sourceGroup, parts]) => {
    // The narrow bearing posts reach 4.25 m, but cannot support the old broad
    // deck. Use the four 1.5 m bearing plates and bridge them with an authored
    // temporary grillage; never treat the union AABB as a solid top surface.
    const bearingPads = parts
      .filter(part => part.material === 'dark-iron'
        && part.boundsMax[0] - part.boundsMin[0] >= 1.4
        && part.boundsMax[2] - part.boundsMin[2] >= 1.4)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (bearingPads.length !== 4) throw new Error(`Foundation ${sourceGroup} requires four authored bearing pads`);
    const topY = Math.min(...bearingPads.map(part => part.boundsMax[1]));
    return {
    sourceGroup,
    min: [
      Math.min(...parts.map(part => part.boundsMin[0])),
      Math.min(...parts.map(part => part.boundsMin[1])),
      Math.min(...parts.map(part => part.boundsMin[2])),
    ],
    max: [
      Math.max(...parts.map(part => part.boundsMax[0])),
      Math.max(...parts.map(part => part.boundsMax[1])),
      Math.max(...parts.map(part => part.boundsMax[2])),
    ],
    topY,
    bearingPads: bearingPads.map(part => ({ min: part.boundsMin, max: part.boundsMax })),
  }; });
}

function surfaceCenter(surface: EiffelKitSupportSurface): RigidVec3 {
  return [
    (surface.min[0] + surface.max[0]) / 2,
    surface.topY,
    (surface.min[2] + surface.max[2]) / 2,
  ];
}

function horizontalDistance(a: RigidVec3, b: RigidVec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

/**
 * A deliberately bounded production pilot: four pillar cranes place sixteen
 * first-tier iron pieces from completed masonry bearings. It does not claim
 * that the rest of the construction kit has supported routes yet.
 */
export function createEiffelKitPilotPlan(manifest: EiffelKitManifest): EiffelKitPilotPlan {
  if (manifest.schemaVersion !== 2) throw new Error('Eiffel kit pilot requires schema version 2');
  const surfaces = foundationSurfaces(manifest);
  if (surfaces.length !== manifest.metadata.foundationBearings) {
    throw new Error('Eiffel kit pilot requires every authored foundation bearing');
  }

  const selected = LEGS.flatMap(leg => {
    const candidates = manifest.parts
      .filter(part => part.group === 'leg' && part.stage === 1 && part.leg === leg)
      .map(part => {
        const supports = surfaces.filter(surface => surface.sourceGroup.startsWith(`foundation-${leg}-`));
        const support = supports.sort((a, b) =>
          horizontalDistance(part.finalPose.position, surfaceCenter(a)) -
          horizontalDistance(part.finalPose.position, surfaceCenter(b))
        )[0];
        if (!support) throw new Error(`No foundation support for ${part.id}`);
        return { part, support, reach: horizontalDistance(part.finalPose.position, surfaceCenter(support)) };
      })
      .filter(candidate => candidate.reach <= 7.2)
      .sort((a, b) => a.part.id.localeCompare(b.part.id));
    if (candidates.length < PARTS_PER_LEG) throw new Error(`Insufficient bounded first-tier operations for ${leg}`);
    return candidates.slice(0, PARTS_PER_LEG);
  });

  const waveDuration = (END - START) / PARTS_PER_LEG;
  const operations = selected.map(({ part, support }, index): EiffelKitPilotOperation => {
    const wave = index % PARTS_PER_LEG;
    const supportCenter = surfaceCenter(support);
    const radialLength = Math.hypot(supportCenter[0], supportCenter[2]);
    const radial: RigidVec3 = radialLength > 1e-6
      ? [supportCenter[0] / radialLength, 0, supportCenter[2] / radialLength]
      : [1, 0, 0];
    // A 0.45 m grillage visibly bridges the four real bearing plates.
    const base: RigidVec3 = [supportCenter[0], support.topY + .45, supportCenter[2]];
    const localBottom = part.localBounds.min[1];
    const pickupRadius = Math.hypot(
      Math.max(Math.abs(part.localBounds.min[0]), Math.abs(part.localBounds.max[0])),
      Math.max(Math.abs(part.localBounds.min[2]), Math.abs(part.localBounds.max[2])),
    );
    const pickupOffset = pickupRadius + .65;
    const yaw = -Math.atan2(radial[2], radial[0]);
    const pickupPose: RigidPose = {
      position: [base[0] + radial[0] * pickupOffset, base[1] + .3 - localBottom, base[2] + radial[2] * pickupOffset],
      quaternion: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
    };
    const clearBottom = Math.max(10.2 + CLEARANCE, support.topY + part.transportSize[1] + CLEARANCE);
    const orientedLocalBounds = transformedRigidBounds(
      { position: [0, 0, 0], quaternion: part.finalPose.quaternion },
      part.localBounds.min,
      part.localBounds.max,
    );
    const clearPose: RigidPose = {
      position: [base[0], clearBottom - orientedLocalBounds.min[1], base[2]],
      quaternion: part.finalPose.quaternion,
    };
    const finalBounds = transformedRigidBounds(part.finalPose, part.localBounds.min, part.localBounds.max);
    const seatApproachPose: RigidPose = {
      position: [part.finalPose.position[0], part.finalPose.position[1] + clearBottom - finalBounds.min[1], part.finalPose.position[2]],
      quaternion: part.finalPose.quaternion,
    };
    return {
      part,
      support,
      station: { base, mastHeight: 12, boomLength: 8.4 },
      start: START + wave * waveDuration,
      end: START + (wave + 1) * waveDuration,
      pickupPose,
      clearPose,
      seatApproachPose,
    };
  });

  return {
    constructionReady: false,
    operations,
    remainingGates: [
      'dependencies and supported stations above the first iron tier',
      'geometry-aware swept collision checks for every remaining route',
      'freight-elevator handoffs at the first, second and intermediate upper levels',
      'browser performance for the complete 13,814-piece schedule',
    ],
  };
}

export function sampleEiffelKitPilotOperation(operation: EiffelKitPilotOperation, rawT: number): EiffelKitPilotSample {
  if (!Number.isFinite(rawT)) throw new Error('Eiffel kit pilot time must be finite');
  if (rawT < operation.start) return { phase: 'queued', pose: operation.pickupPose, crane: null };
  if (rawT >= operation.end) return { phase: 'seated', pose: operation.part.finalPose, crane: null };
  const p = (rawT - operation.start) / (operation.end - operation.start);
  let phase: EiffelKitPilotSample['phase'];
  let pose: RigidPose;
  if (p < 0.12) {
    phase = 'pickup';
    pose = operation.pickupPose;
  } else if (p < 0.48) {
    phase = 'hoist';
    pose = interpolateRigidPose(operation.pickupPose, operation.clearPose, smooth((p - 0.12) / 0.36));
  } else if (p < 0.76) {
    phase = 'transfer';
    pose = interpolateRigidPose(operation.clearPose, operation.seatApproachPose, smooth((p - 0.48) / 0.28));
  } else {
    phase = 'lower';
    pose = interpolateRigidPose(operation.seatApproachPose, operation.part.finalPose, smooth((p - 0.76) / 0.24));
  }
  return { phase, pose, crane: sampleEiffelCrane(operation.station, pose, operation.part.pickupLugs) };
}

export function eiffelKitPilotStateAt(
  plan: EiffelKitPilotPlan,
  part: EiffelKitPart,
  t: number,
): { readonly phase: 'queued' } | { readonly phase: 'seated' } | { readonly phase: 'moving'; readonly pose: RigidPose } {
  if (part.group === 'foundation') return { phase: 'seated' };
  const operation = plan.operations.find(candidate => candidate.part.id === part.id);
  if (!operation) return { phase: 'queued' };
  const sample = sampleEiffelKitPilotOperation(operation, t);
  if (sample.phase === 'queued') return { phase: 'queued' };
  if (sample.phase === 'seated') return { phase: 'seated' };
  return { phase: 'moving', pose: sample.pose };
}
