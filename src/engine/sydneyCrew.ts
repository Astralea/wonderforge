import type { Vec3 } from '../data/constructionTypes';
import {
  sydneyCraneRigAt,
  sydneyFalseworkAt,
  sydneySourcePose,
  sydneyStagingPose,
  type ActiveSydneyOperation,
} from './sydneyConstruction';
import { mulberry32 } from './random';
import {
  sydneyTerrainHeightAt,
  sydneyBuildingToWorld,
  SYDNEY_BUILDING_YAW,
} from './sydneyTerrain';
import { sydneyPodiumHeightAt } from '../data/sydneyShells';

export type SydneyCrewRole =
  | 'dresser'
  | 'hauler'
  | 'driver'
  | 'slinger'
  | 'signalman'
  | 'deck-mason'
  | 'climber'
  | 'tiler'
  | 'crane-hand';

export interface SydneyCrewPose {
  id: string;
  role: SydneyCrewRole;
  position: Vec3;
  yaw: number;
  lean: number;
  gait: number;
  arm: number;
}

export interface SydneyRigMotion {
  partId: string;
  trolleySpin: number;
  hoistSpin: number;
}

export interface SydneyLabour {
  crews: SydneyCrewPose[];
  rigs: SydneyRigMotion[];
}

const STRIDE = 0.9;

function salt(id: string): [number, number, number, number, number, number] {
  const roll = mulberry32(id);
  return [roll(), roll(), roll(), roll(), roll(), roll()];
}

function pingpong(x: number): { u: number; forward: boolean } {
  const wrapped = x - Math.floor(x);
  if (wrapped < 0.5) return { u: wrapped * 2, forward: true };
  return { u: 2 - wrapped * 2, forward: false };
}

function travelMeters(
  phase: ActiveSydneyOperation['state']['phase'],
  local: number,
): number {
  if (phase === 'cast') return local * 5;
  if (phase === 'hauled') return 5 + local * 42;
  if (phase === 'staged') return 47 + local * 4;
  if (phase === 'hoisted') return 51 + local * 24;
  return 76;
}

function groundAt(x: number, z: number): number {
  return sydneyTerrainHeightAt(x, z);
}

function pushCrew(
  crews: SydneyCrewPose[],
  id: string,
  role: SydneyCrewRole,
  x: number,
  z: number,
  yaw: number,
  lean: number,
  gait: number,
  arm: number,
  y = groundAt(x, z),
): void {
  // Ground workers cannot stand within an authored wall, stair or water.
  if (Math.abs(y - groundAt(x, z)) < 0.01) {
    for (const dx of [-0.65, 0.65])
      for (const dz of [-0.65, 0.65]) {
        const ground = groundAt(x + dx, z + dz);
        if (
          ground < 1 ||
          (sydneyPodiumHeightAt(x + dx, z + dz) ?? ground) > ground + 0.1
        )
          return;
      }
  }
  crews.push({ id, role, position: [x, y, z], yaw, lean, gait, arm });
}

function labourForOperation(
  operation: ActiveSydneyOperation,
  crews: SydneyCrewPose[],
  rigs: SydneyRigMotion[],
): void {
  const { part, state } = operation;
  const [px, , pz] = state.position;
  // The patch is baked in its final orientation; its rotation is not the
  // direction of the trolley's ground route.
  const source = sydneySourcePose(part),
    staging = sydneyStagingPose(part);
  const yaw =
    state.mechanism === 'trolley'
      ? Math.atan2(staging[0] - source[0], staging[2] - source[2])
      : state.rotation[1];
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const lx = Math.cos(yaw);
  const lz = -Math.sin(yaw);
  const local = state.phaseLocal;
  const travel = travelMeters(state.phase, local);
  const rig = sydneyCraneRigAt(part, state);

  if (state.phase === 'cast' && part.graph === 'podium') {
    // A complete cast bay is already rendered at final size. Work on its
    // seated top instead of floating beside an upper-storey pour at its base.
    if (Math.min(part.dimensions[0], part.dimensions[2]) < 2) return;
    let floor = -Infinity;
    const vertices = part.authoredVertices;
    if (vertices)
      for (let i = 0; i < vertices.length; i += 9) {
        const ax = vertices[i]!,
          az = vertices[i + 2]!,
          bx = vertices[i + 3]!,
          bz = vertices[i + 5]!,
          cx = vertices[i + 6]!,
          cz = vertices[i + 8]!;
        const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (Math.abs(det) < 1e-8) continue;
        const u = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
        const v = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
        if (u >= 0 && v >= 0 && u + v <= 1)
          floor = Math.max(
            floor,
            u * vertices[i + 1]! +
              v * vertices[i + 4]! +
              (1 - u - v) * vertices[i + 7]!,
          );
      }
    if (Number.isFinite(floor))
      pushCrew(
        crews,
        `${part.id}-concrete-hand`,
        'dresser',
        px,
        pz,
        0,
        0.1,
        local * 8,
        local * 10,
        floor,
      );
    return;
  }

  if (state.phase === 'cast') {
    for (let i = 0; i < 2; i += 1) {
      const id = `${part.id}-dresser-${i}`;
      const s = salt(id);
      const { u, forward } = pingpong(local * (1.05 + s[0] * 1.5) + s[1]);
      const x = px + (i === 0 ? 1 : -1) * (part.dimensions[0] / 2 + 1.2);
      const z = pz + (u - 0.5) * Math.max(1, part.dimensions[2] - 1);
      pushCrew(
        crews,
        id,
        'dresser',
        x,
        z,
        forward ? yaw + s[5] * 0.35 : yaw + Math.PI - s[5] * 0.35,
        0.08 + s[0] * 0.16,
        (travel / STRIDE) * (0.55 + s[1]) + s[2] * 7,
        local * (16 + s[3] * 20) + s[4] * 5,
      );
    }
  }

  if (state.mechanism === 'trolley') {
    const halfLateral =
      (Math.abs(lx) * part.dimensions[0]) / 2 +
      (Math.abs(lz) * part.dimensions[2]) / 2;
    const hauls = [
      { along: 6.4, side: 1.2, lean: 0.26, gait: 1.02, yaw: 0 },
      { along: 3.8, side: -2.4, lean: 0.18, gait: 0.58, yaw: 0.22 },
      { along: 1.6, side: 2.8, lean: 0.1, gait: 0.3, yaw: -0.4 },
    ] as const;
    for (let i = 0; i < hauls.length; i += 1) {
      const id = `${part.id}-hauler-${i}`;
      const s = salt(id);
      const job = hauls[i]!;
      const safeSide = Math.sign(job.side) * (halfLateral + 1.1 + i * 0.3);
      pushCrew(
        crews,
        id,
        'hauler',
        px + fx * (job.along + (s[0] - 0.5) * 1.2) + lx * safeSide,
        pz + fz * (job.along + (s[0] - 0.5) * 1.2) + lz * safeSide,
        yaw + job.yaw + (s[3] - 0.5) * 0.22,
        job.lean + s[4] * 0.07,
        (travel / STRIDE) * job.gait + s[5] * 11 + i * 3.4,
        (travel / STRIDE) * (0.18 + s[1] * 0.45) + s[2] * 8,
      );
    }
    const driverId = `${part.id}-driver`;
    const ds = salt(driverId);
    pushCrew(
      crews,
      driverId,
      'driver',
      px + lx * (halfLateral + 1.8 + ds[0]) + fx * (ds[1] - 0.4) * 1.6,
      pz + lz * (halfLateral + 1.8 + ds[0]) + fz * (ds[1] - 0.4) * 1.6,
      yaw + (ds[2] - 0.5) * 0.45,
      0.04 + ds[3] * 0.1,
      (travel / STRIDE) * (0.45 + ds[4] * 0.65) + ds[5] * 4,
      (travel / STRIDE) * 0.28 + ds[0] * 4,
    );
    rigs.push({ partId: part.id, trolleySpin: travel / 0.55, hoistSpin: 0 });
  }

  if (state.phase === 'staged') {
    const jobs = [
      { along: 3.1, side: 2.6, walk: true },
      { along: -2.4, side: 3.0, walk: false },
      { along: 0.6, side: -3.2, walk: true },
    ] as const;
    for (let i = 0; i < jobs.length; i += 1) {
      const id = `${part.id}-slinger-${i}`;
      const s = salt(id);
      const job = jobs[i]!;
      const { u, forward } = job.walk
        ? pingpong(local * (0.75 + s[0] * 1.35) + s[1])
        : { u: 0.32 + s[0] * 0.28, forward: true };
      const x =
        px +
        fx * (job.along + (u - 0.5) * (job.walk ? 2.6 : 0.35)) +
        lx * Math.sign(job.side) * (part.dimensions[0] / 2 + 1.3);
      const z =
        pz +
        fz * (job.along + (u - 0.5) * (job.walk ? 2.6 : 0.35)) +
        lz * Math.sign(job.side) * (part.dimensions[0] / 2 + 1.3);
      pushCrew(
        crews,
        id,
        'slinger',
        x,
        z,
        forward ? yaw + s[3] * 0.4 : yaw + Math.PI - s[3] * 0.4,
        0.12 + s[4] * 0.16,
        (travel / STRIDE) * (0.4 + s[5]) + i * 4.1,
        local * (14 + s[0] * 18) + s[1] * 6,
      );
    }
  }

  if (state.mechanism === 'crane' && rig) {
    for (let i = 0; i < 2; i += 1) {
      const id = `${part.id}-tag-${i}`;
      const s = salt(id);
      const side = i === 0 ? 1 : -1;
      const { u } = pingpong(local * (0.9 + s[0]) + s[1]);
      const x = staging[0] + side * (part.dimensions[0] / 2 + 2 + s[2]);
      const z = staging[2] + (u - 0.5) * 3;
      pushCrew(
        crews,
        id,
        'signalman',
        x,
        z,
        Math.atan2(state.position[0] - x, state.position[2] - z),
        0.22 + s[3] * 0.12,
        (travel / STRIDE) * (0.7 + s[4]) + i * 2.8,
        local * 20 + s[5] * 5,
      );
    }
    const handId = `${part.id}-crane-hand`;
    const hs = salt(handId);
    pushCrew(
      crews,
      handId,
      'crane-hand',
      rig.base[0] - Math.sin(rig.yaw) * 3,
      rig.base[2] - Math.cos(rig.yaw) * 3,
      rig.yaw + hs[2] * 0.4,
      0.04,
      local * (6 + hs[3] * 4),
      local * 8 + hs[4] * 3,
      rig.mastTop[1] - 9.1,
    );
    const hoistSpin = (rig.hook[1] - rig.base[1]) / 8;
    rigs.push({ partId: part.id, trolleySpin: 0, hoistSpin });
  }
}

function falseworkLabour(t: number, crews: SydneyCrewPose[]): void {
  const bays = sydneyFalseworkAt(t);
  if (bays.length === 0) return;
  // Roof clearance can remove a station. Choose from the actual erected bays,
  // never from the old pre-rebuild station IDs (all three were absent).
  for (const bay of bays.filter((entry) => entry.height >= 12)) {
    const station = bay.station;
    // Deck crews enter only after the support has been erected; the scene
    // contains no ladder on which to place the former floating climbers.
    const holdWindow = t >= 0.25 && t < 0.82 && bay.height > 8;
    if (!holdWindow) continue;
    for (let i = 0; i < 2; i += 1) {
      const id = `deck-${station}-${i}`;
      const s = salt(id);
      const seconds = t * 60;
      const { u, forward } =
        i === 0
          ? pingpong(seconds * 0.16 + s[1])
          : { u: 0.35 + s[0] * 0.3, forward: true };
      const localX = (u - 0.5) * 1.8,
        localZ = i === 0 ? 0.7 : -0.7;
      const x =
        bay.position[0] +
        Math.cos(bay.yaw) * localX +
        Math.sin(bay.yaw) * localZ;
      const z =
        bay.position[2] -
        Math.sin(bay.yaw) * localX +
        Math.cos(bay.yaw) * localZ;
      pushCrew(
        crews,
        id,
        'deck-mason',
        x,
        z,
        bay.yaw + (forward ? Math.PI / 2 : -Math.PI / 2),
        0.1 + s[3] * 0.14,
        seconds * (6 + s[4]) + station * 3.1 + i * 5.4,
        seconds * (3 + s[5]) + i * 4,
        bay.deckY + 0.38,
      );
    }
  }
}

/** Persistent crews use film seconds, not a fraction-of-a-cycle per film.
 * Parallel paths flank the casting beds and trolley lanes on supported land. */
function idleYard(t: number, crews: SydneyCrewPose[]): void {
  if (t < 0.08 || t >= 0.82) return;
  const seconds = t * 60;
  for (let i = 0; i < 8; i++) {
    const localX = i < 4 ? 30 + (i % 2) * 4 : -51 - (i % 2) * 4;
    const phase =
      seconds * ((Math.PI * 2) / 36) + (Math.floor(i / 2) * Math.PI) / 2;
    const localZ = 153 + 14 * Math.sin(phase);
    const { x, z } = sydneyBuildingToWorld(localX, localZ);
    const velocity = 14 * ((Math.PI * 2) / 36) * Math.cos(phase);
    const id = `yard-route-${i}`;
    pushCrew(
      crews,
      id,
      'hauler',
      x,
      z,
      SYDNEY_BUILDING_YAW + (velocity >= 0 ? 0 : Math.PI),
      0.06,
      ((localZ - 139) / STRIDE) * Math.PI * 2,
      seconds * 4 + i,
    );
  }
  for (let i = 0; i < 4; i++) {
    const { x, z } = sydneyBuildingToWorld(
      -9 - (i % 2) * 3,
      146 + Math.floor(i / 2) * 8,
    );
    pushCrew(
      crews,
      `yard-dresser-${i}`,
      'dresser',
      x,
      z,
      Math.PI / 2,
      0.1,
      0,
      seconds * (3.2 + i * 0.13) + i * 2,
    );
  }
}

export function sydneyLabourAt(
  operations: ActiveSydneyOperation[],
  t: number,
): SydneyLabour {
  const crews: SydneyCrewPose[] = [];
  const rigs: SydneyRigMotion[] = [];
  for (const operation of operations)
    labourForOperation(operation, crews, rigs);
  falseworkLabour(t, crews);
  idleYard(t, crews);
  return { crews, rigs };
}
