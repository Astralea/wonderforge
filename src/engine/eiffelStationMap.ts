import type { EiffelKitManifest, EiffelKitPart } from '../data/eiffelKitTypes';
import { rotateRigidVector, transformRigidPoint, type RigidVec3 } from './eiffelRigid';

export interface EiffelStationCandidate {
  readonly partId: string;
  readonly supportPartId: string;
  readonly supportPoint: RigidVec3;
  readonly supportLocalPoint: RigidVec3;
  readonly stationPoint: RigidVec3;
  readonly supportFaceAxis: 0 | 1 | 2;
  readonly supportSaddles: readonly [RigidVec3, RigidVec3];
  readonly horizontalReach: number;
  readonly verticalRise: number;
}

export interface EiffelStationGap {
  readonly partId: string;
  readonly stage: number;
  readonly nearestSupportPartId: string | null;
  readonly nearestHorizontalReach: number;
  readonly requiredHorizontalExtension: number;
}
export interface EiffelStationBracket {
  readonly partId: string;
  readonly supportPartId: string;
  readonly saddle: RigidVec3;
  readonly saddles: readonly [RigidVec3, RigidVec3];
  readonly tip: RigidVec3;
  readonly extension: number;
  readonly dependencyPartIds: readonly string[];
}

export interface EiffelStationMapAudit {
  readonly constructionReady: false;
  readonly candidates: ReadonlyMap<string, EiffelStationCandidate>;
  readonly brackets: readonly EiffelStationBracket[];
  readonly gaps: readonly EiffelStationGap[];
}

const CELL = 8;
const key = (x: number, z: number) => `${Math.round(x / CELL)}:${Math.round(z / CELL)}`;
const centerXZ = (part: EiffelKitPart): readonly [number, number] => [
  (part.boundsMin[0] + part.boundsMax[0]) / 2,
  (part.boundsMin[2] + part.boundsMax[2]) / 2,
];

function upperFacePoint(support: EiffelKitPart, targetX: number, targetZ: number): {
  readonly world: RigidVec3; readonly local: RigidVec3; readonly axis: 0 | 1 | 2;
} | null {
  if (support.shape !== 'box') return null;
  let frame = faceFrames.get(support);
  if (!frame) {
    let axis = 0; let sign = 1; let bestUp = -Infinity;
    for (let candidate = 0; candidate < 3; candidate++) for (const candidateSign of [-1, 1]) {
      const unit: [number, number, number] = [0, 0, 0]; unit[candidate] = candidateSign;
      const up = rotateRigidVector(support.finalPose.quaternion, unit)[1];
      if (up > bestUp) { bestUp = up; axis = candidate; sign = candidateSign; }
    }
    const free = [0, 1, 2].filter(candidate => candidate !== axis) as [number, number];
    const originLocal: [number, number, number] = [...support.localBounds.min];
    originLocal[axis] = sign > 0 ? support.localBounds.max[axis]! : support.localBounds.min[axis]!;
    const origin = transformRigidPoint(support.finalPose, originLocal);
    const edge = (edgeAxis: number): RigidVec3 => {
      const vector: [number, number, number] = [0, 0, 0];
      vector[edgeAxis] = support.localBounds.max[edgeAxis]! - support.localBounds.min[edgeAxis]!;
      return rotateRigidVector(support.finalPose.quaternion, vector);
    };
    frame = { axis, sign, bestUp, free, originLocal, origin, u: edge(free[0]), v: edge(free[1]) };
    faceFrames.set(support, frame);
  }
  const { axis, bestUp, free, originLocal, origin, u, v } = frame;
  if (bestUp < .35) return null;
  const tx = targetX - origin[0], tz = targetZ - origin[2];
  const aa = u[0] ** 2 + u[2] ** 2, ab = u[0] * v[0] + u[2] * v[2], bb = v[0] ** 2 + v[2] ** 2;
  const au = u[0] * tx + u[2] * tz, bv = v[0] * tx + v[2] * tz, determinant = aa * bb - ab * ab;
  if (determinant < 1e-12) return null;
  const alpha = Math.max(0, Math.min(1, (au * bb - bv * ab) / determinant));
  const beta = Math.max(0, Math.min(1, (bv * aa - au * ab) / determinant));
  const local = [...originLocal] as [number, number, number];
  local[free[0]] += alpha * (support.localBounds.max[free[0]]! - support.localBounds.min[free[0]]!);
  local[free[1]] += beta * (support.localBounds.max[free[1]]! - support.localBounds.min[free[1]]!);
  const world: RigidVec3 = [origin[0] + u[0] * alpha + v[0] * beta, origin[1] + u[1] * alpha + v[1] * beta, origin[2] + u[2] * alpha + v[2] * beta];
  return { local, world, axis: axis as 0 | 1 | 2 };
}

const faceFrames = new WeakMap<EiffelKitPart, { axis: number; sign: number; bestUp: number; free: [number, number]; originLocal: [number, number, number]; origin: RigidVec3; u: RigidVec3; v: RigidVec3 }>();

/**
 * Finds a bracket foot on the top envelope of an already seated member.
 * This is a geometric station-map audit, not a strength certificate: gaps
 * require authored falsework and every accepted foot still needs collision QA.
 */
export function auditEiffelStationMap(manifest: EiffelKitManifest, maxReach = 7.2): EiffelStationMapAudit {
  if (!(maxReach > 0 && maxReach <= 8.4)) throw new Error('Eiffel station reach must be within the bounded jib');
  const stages = new Map<number, EiffelKitPart[]>();
  for (const part of manifest.parts) {
    if (!stages.has(part.stage)) stages.set(part.stage, []);
    stages.get(part.stage)!.push(part);
  }
  const completed: EiffelKitPart[] = [];
  const candidates = new Map<string, EiffelStationCandidate>();
  const gaps: EiffelStationGap[] = [];
  const brackets: EiffelStationBracket[] = [];
  for (const stage of [...stages.keys()].sort((a, b) => a - b)) {
    const current = stages.get(stage)!.slice().sort((a, b) =>
      a.boundsMin[1] - b.boundsMin[1] || a.id.localeCompare(b.id));
    const grid = new Map<string, EiffelKitPart[]>();
    const add = (part: EiffelKitPart) => {
      const [x, z] = centerXZ(part); const k = key(x, z);
      if (!grid.has(k)) grid.set(k, []); grid.get(k)!.push(part);
    };
    completed.forEach(add);
    for (const part of current) {
      if (part.group !== 'foundation') {
        const [x, z] = centerXZ(part); const gx = Math.round(x / CELL); const gz = Math.round(z / CELL);
        let best: EiffelStationCandidate | null = null;
        for (let ix = gx - 3; ix <= gx + 3; ix++) for (let iz = gz - 3; iz <= gz + 3; iz++) {
          for (const support of grid.get(`${ix}:${iz}`) ?? []) {
            if (support.sourceMember === part.sourceMember) continue;
            const face = upperFacePoint(support, x, z);
            if (!face) continue;
            const verticalRise = part.boundsMin[1] - face.world[1];
            // First-floor loads may be lowered beside a crane resting on a completed
            // deck face above the load's final underside. Restricting feet below
            // that underside incorrectly forces receiver supports through the deck.
            if (verticalRise < (part.stage === 23 ? -4 : -.15) || verticalRise > 22) continue;
            const [sx, , sz] = face.world;
            const horizontalReach = Math.hypot(x - sx, z - sz);
            const ranges = face.local.map((_, localAxis) => localAxis === face.axis ? -1 : support.localBounds.max[localAxis]! - support.localBounds.min[localAxis]!);
            const saddleAxis = ranges.indexOf(Math.max(...ranges));
            const secondLocal = [...face.local] as [number, number, number];
            const midpoint = (support.localBounds.min[saddleAxis]! + support.localBounds.max[saddleAxis]!) / 2;
            secondLocal[saddleAxis] += secondLocal[saddleAxis] <= midpoint ? Math.min(.6, ranges[saddleAxis]! / 3) : -Math.min(.6, ranges[saddleAxis]! / 3);
            const supportSaddles = [face.world, transformRigidPoint(support.finalPose, secondLocal)] as const;
            const score = horizontalReach + (part.stage === 23 ? .7 * verticalRise : 0);
            const bestScore = best ? best.horizontalReach + (part.stage === 23 ? .7 * best.verticalRise : 0) : Infinity;
            if (!best || score < bestScore) best = {
              partId: part.id, supportPartId: support.id,
              supportPoint: face.world, supportLocalPoint: face.local, stationPoint: face.world, supportFaceAxis: face.axis, horizontalReach, verticalRise,
              supportSaddles,
            };
          }
        }
        if (best && best.horizontalReach <= maxReach) candidates.set(part.id, best);
        else if (best && best.horizontalReach - maxReach <= 4) {
          const [x, z] = centerXZ(part);
          const dx = x - best.supportPoint[0]; const dz = z - best.supportPoint[2];
          const length = Math.hypot(dx, dz); const extension = length - maxReach;
          brackets.push({
            partId: part.id, supportPartId: best.supportPartId, saddle: best.supportPoint,
            saddles: best.supportSaddles,
            tip: [best.supportPoint[0] + dx / length * extension, best.supportPoint[1], best.supportPoint[2] + dz / length * extension],
            extension, dependencyPartIds: [best.supportPartId],
          });
          candidates.set(part.id, { ...best, stationPoint: brackets.at(-1)!.tip, horizontalReach: maxReach });
        } else gaps.push({
          partId: part.id, stage: part.stage,
          nearestSupportPartId: best?.supportPartId ?? null,
          nearestHorizontalReach: best?.horizontalReach ?? Number.POSITIVE_INFINITY,
          requiredHorizontalExtension: best ? best.horizontalReach - maxReach : Number.POSITIVE_INFINITY,
        });
      }
      add(part);
    }
    completed.push(...current);
  }
  return { constructionReady: false, candidates, brackets, gaps };
}
