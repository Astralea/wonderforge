import { SYDNEY_CRANE_BASES, SYDNEY_YARD } from '../data/sydneyConstruction';
import type { Vec3 } from '../data/constructionTypes';
import {
  sydneyCraneRigAt,
  sydneyFalseworkAt,
  sydneyFalseworkWindowAt,
  type ActiveSydneyOperation,
} from './sydneyConstruction';
import { mulberry32 } from './random';
import { sydneyTerrainHeightAt } from './sydneyTerrain';

export type SydneyCrewRole =
  | 'dresser'
  | 'hauler'
  | 'driver'
  | 'slinger'
  | 'tag-line'
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
const TILE_FROM: [number, number] = [24, 64];
const TILE_TO: [number, number] = [14, 40];

function salt(id: string): [number, number, number, number, number, number] {
  const roll = mulberry32(id);
  return [roll(), roll(), roll(), roll(), roll(), roll()];
}

function pingpong(x: number): { u: number; forward: boolean } {
  const wrapped = x - Math.floor(x);
  if (wrapped < 0.5) return { u: wrapped * 2, forward: true };
  return { u: 2 - wrapped * 2, forward: false };
}

function travelMeters(phase: ActiveSydneyOperation['state']['phase'], local: number): number {
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
  crews.push({ id, role, position: [x, y, z], yaw, lean, gait, arm });
}

function labourForOperation(
  operation: ActiveSydneyOperation,
  crews: SydneyCrewPose[],
  rigs: SydneyRigMotion[],
): void {
  const { part, state } = operation;
  const [px, , pz] = state.position;
  const yaw = state.rotation[1];
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const lx = Math.cos(yaw);
  const lz = -Math.sin(yaw);
  const local = state.phaseLocal;
  const travel = travelMeters(state.phase, local);
  const rig = sydneyCraneRigAt(part, state);

  if (state.phase === 'cast') {
    for (let i = 0; i < 2; i += 1) {
      const id = `${part.id}-dresser-${i}`;
      const s = salt(id);
      const { u, forward } = pingpong(local * (1.05 + s[0] * 1.5) + s[1]);
      const x = px + (u - 0.5) * (3.8 + s[2] * 3.2) + lx * (s[3] * 2.8 - 1.2);
      const z = pz + (u - 0.5) * (1.4 + s[4] * 2) + lz * (i === 0 ? 1.6 : -1.8);
      pushCrew(
        crews,
        id,
        'dresser',
        x,
        z,
        forward ? yaw + s[5] * 0.35 : yaw + Math.PI - s[5] * 0.35,
        0.08 + s[0] * 0.16,
        travel / STRIDE * (0.55 + s[1]) + s[2] * 7,
        local * (16 + s[3] * 20) + s[4] * 5,
      );
    }
  }

  if (state.mechanism === 'trolley') {
    const hauls = [
      { along: 6.4, side: 1.2, lean: 0.26, gait: 1.02, yaw: 0 },
      { along: 3.8, side: -2.4, lean: 0.18, gait: 0.58, yaw: 0.22 },
      { along: 1.6, side: 2.8, lean: 0.1, gait: 0.3, yaw: -0.4 },
    ] as const;
    for (let i = 0; i < hauls.length; i += 1) {
      const id = `${part.id}-hauler-${i}`;
      const s = salt(id);
      const job = hauls[i]!;
      pushCrew(
        crews,
        id,
        'hauler',
        px + fx * (job.along + (s[0] - 0.5) * 1.2) + lx * (job.side + (s[1] - 0.5) * 0.8),
        pz + fz * (job.along + (s[0] - 0.5) * 1.2) + lz * (job.side + (s[1] - 0.5) * 0.8),
        yaw + job.yaw + (s[3] - 0.5) * 0.22,
        job.lean + s[4] * 0.07,
        travel / STRIDE * job.gait + s[5] * 11 + i * 3.4,
        travel / STRIDE * (0.18 + s[1] * 0.45) + s[2] * 8,
      );
    }
    const driverId = `${part.id}-driver`;
    const ds = salt(driverId);
    pushCrew(
      crews,
      driverId,
      'driver',
      px + lx * (2.4 + ds[0] * 1.2) + fx * (ds[1] - 0.4) * 1.6,
      pz + lz * (2.4 + ds[0] * 1.2) + fz * (ds[1] - 0.4) * 1.6,
      yaw + (ds[2] - 0.5) * 0.45,
      0.04 + ds[3] * 0.1,
      travel / STRIDE * (0.45 + ds[4] * 0.65) + ds[5] * 4,
      travel / STRIDE * 0.28 + ds[0] * 4,
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
      const x = px + fx * (job.along + (u - 0.5) * (job.walk ? 2.6 : 0.35)) + lx * job.side * (0.65 + s[2] * 0.5);
      const z = pz + fz * (job.along + (u - 0.5) * (job.walk ? 2.6 : 0.35)) + lz * job.side * (0.65 + s[2] * 0.5);
      pushCrew(
        crews,
        id,
        'slinger',
        x,
        z,
        forward ? yaw + s[3] * 0.4 : yaw + Math.PI - s[3] * 0.4,
        0.12 + s[4] * 0.16,
        travel / STRIDE * (0.4 + s[5]) + i * 4.1,
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
      const x = state.position[0] + lx * side * (4.2 + s[2] * 2) + fx * (u - 0.5) * 3;
      const z = state.position[2] + lz * side * (4.2 + s[2] * 2) + fz * (u - 0.5) * 3;
      pushCrew(
        crews,
        id,
        'tag-line',
        x,
        z,
        Math.atan2(state.position[0] - x, state.position[2] - z),
        0.22 + s[3] * 0.12,
        travel / STRIDE * (0.7 + s[4]) + i * 2.8,
        local * 20 + s[5] * 5,
      );
    }
    const handId = `${part.id}-crane-hand`;
    const hs = salt(handId);
    pushCrew(
      crews,
      handId,
      'crane-hand',
      rig.base[0] + hs[0] * 1.6,
      rig.base[2] + hs[1] * 1.6,
      rig.yaw + hs[2] * 0.4,
      0.04,
      local * (6 + hs[3] * 4),
      local * 8 + hs[4] * 3,
      rig.mastTop[1] - 6,
    );
    const hoistSpin = (rig.hook[1] - rig.base[1]) / 8;
    rigs.push({ partId: part.id, trolleySpin: 0, hoistSpin });
  }
}

function falseworkLabour(t: number, crews: SydneyCrewPose[]): void {
  const bays = sydneyFalseworkAt(t);
  if (bays.length === 0) return;
  const occupied = [0, 3, 6];
  for (const station of occupied) {
    const bay = bays.find((entry) => entry.station === station);
    if (!bay) continue;
    const window = sydneyFalseworkWindowAt(t);
    const raisingThis = window?.kind === 'raising' && window.group === bay.group;
    if (raisingThis) {
      const id = `climb-${station}`;
      const s = salt(id);
      const rise = (t - window!.raiseFrom) / Math.max(0.001, window!.raiseUntil - window!.raiseFrom);
      const climbY = bay.footY + Math.min(bay.height - 1.2, rise * bay.height * (0.85 + s[0] * 0.12));
      const offset = 2.4 + s[1] * 1.1;
      pushCrew(
        crews,
        id,
        'climber',
        bay.position[0] + Math.cos(bay.yaw) * offset,
        bay.position[2] + Math.sin(bay.yaw) * offset,
        bay.yaw + Math.PI + (s[2] - 0.5) * 0.3,
        0.18 + s[3] * 0.1,
        rise * (18 + s[4] * 10) + station * 2.7,
        rise * 22 + s[5] * 4,
        climbY,
      );
      continue;
    }
    const holdWindow = !raisingThis && t >= 0.24 && t < 0.78 && bay.height > 8;
    if (!holdWindow) continue;
    for (let i = 0; i < 2; i += 1) {
      const id = `deck-${station}-${i}`;
      const s = salt(id);
      const { u, forward } = i === 0
        ? pingpong(t * (4.2 + s[0] * 3) + s[1])
        : { u: 0.35 + s[0] * 0.3, forward: true };
      const x = bay.position[0] + Math.cos(bay.yaw) * ((u - 0.5) * 3.6) + Math.sin(bay.yaw) * (i === 0 ? 1.2 : -1.4);
      const z = bay.position[2] + Math.sin(bay.yaw) * ((u - 0.5) * 3.6) - Math.cos(bay.yaw) * (i === 0 ? 1.2 : -1.4);
      pushCrew(
        crews,
        id,
        'deck-mason',
        x,
        z,
        forward ? bay.yaw + s[2] * 0.4 : bay.yaw + Math.PI,
        0.1 + s[3] * 0.14,
        t * (22 + s[4] * 16) + station * 3.1 + i * 5.4,
        t * (18 + s[5] * 12) + i * 4,
        bay.deckY,
      );
    }
  }
}

function idleYard(t: number, crews: SydneyCrewPose[]): void {
  if (t < 0.08 || t > 0.92) return;
  for (let i = 0; i < 2; i += 1) {
    const id = `tiler-${i}`;
    const s = salt(id);
    const { u, forward } = pingpong(t * (1.4 + s[0]) + s[1] + i * 0.3);
    const x = TILE_FROM[0] + (TILE_TO[0] - TILE_FROM[0]) * u + (s[2] - 0.5) * 2;
    const z = TILE_FROM[1] + (TILE_TO[1] - TILE_FROM[1]) * u + (s[3] - 0.5) * 2;
    pushCrew(
      crews,
      id,
      'tiler',
      x,
      z,
      forward ? Math.atan2(TILE_TO[0] - TILE_FROM[0], TILE_TO[1] - TILE_FROM[1]) : Math.atan2(TILE_FROM[0] - TILE_TO[0], TILE_FROM[1] - TILE_TO[1]),
      0.08 + s[4] * 0.1,
      t * (14 + s[5] * 8) + i * 6,
      t * 16 + s[0] * 5,
    );
  }
  const yardId = 'yard-hand';
  const ys = salt(yardId);
  const { u } = pingpong(t * 1.1 + ys[0]);
  pushCrew(
    crews,
    yardId,
    'dresser',
    SYDNEY_YARD[0] + (u - 0.5) * 10,
    SYDNEY_YARD[2] + ys[1] * 4,
    ys[2] * Math.PI * 2,
    0.06,
    t * 12 + ys[3] * 5,
    t * 9 + ys[4] * 4,
  );
  for (let crane = 0; crane < SYDNEY_CRANE_BASES.length; crane += 1) {
    if (t < 0.1 || t > 0.92) continue;
    const base = SYDNEY_CRANE_BASES[crane]!;
    const id = `crane-idle-${crane}`;
    const s = salt(id);
    pushCrew(
      crews,
      id,
      'crane-hand',
      base[0] + s[0] * 2 - 1,
      base[2] + s[1] * 2 - 1,
      s[2] * 4,
      0.03,
      t * (5 + s[3] * 3),
      t * 4 + s[4],
      base[1],
    );
  }
}

export function sydneyLabourAt(operations: ActiveSydneyOperation[], t: number): SydneyLabour {
  const crews: SydneyCrewPose[] = [];
  const rigs: SydneyRigMotion[] = [];
  for (const operation of operations) labourForOperation(operation, crews, rigs);
  falseworkLabour(t, crews);
  idleYard(t, crews);
  return { crews, rigs };
}
