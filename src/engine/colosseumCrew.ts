import { COLOSSEUM_A, COLOSSEUM_B, ellipsePoint, ellipseYaw } from '../data/colosseumConstruction';
import type { Vec3 } from '../data/constructionTypes';
import {
  COLOSSEUM_SCAFFOLD_SEGMENT,
  COLOSSEUM_SCAFFOLD_STATIONS,
  colosseumCraneRigAt,
  colosseumScaffoldStackHeightAt,
  colosseumScaffoldWindowAt,
  colosseumScaffoldsAt,
  type ActiveColosseumOperation,
} from './colosseumConstruction';
import { clamp } from './easing';
import { mulberry32 } from './random';
import { colosseumTerrainHeightAt } from './colosseumTerrain';

export type ColosseumCrewRole =
  | 'dresser'
  | 'hauler'
  | 'driver'
  | 'slinger'
  | 'wheel-walker'
  | 'tag-line'
  | 'deck-mason'
  | 'climber'
  | 'mixer'
  | 'bearer';

export interface ColosseumCrewPose {
  id: string;
  role: ColosseumCrewRole;
  position: Vec3;
  yaw: number;
  lean: number;
  gait: number;
  arm: number;
}

export interface ColosseumRigMotion {
  partId: string;
  wagonSpin: number;
  treadwheelSpin: number;
}

export interface ColosseumLabour {
  crews: ColosseumCrewPose[];
  rigs: ColosseumRigMotion[];
}

const TAU = Math.PI * 2;
const STRIDE = 0.9;
export const COLOSSEUM_TREADWHEEL_RADIUS = 2.55;
const MIX_FROM: [number, number] = [114, -6];
const MIX_TO: [number, number] = [125, 5];
const TIMBER_FROM: [number, number] = [102, -14];
const TIMBER_TO: [number, number] = [112, -4];

function salt(id: string): [number, number, number, number, number, number] {
  const roll = mulberry32(id);
  return [roll(), roll(), roll(), roll(), roll(), roll()];
}

function pingpong(x: number): { u: number; forward: boolean } {
  const wrapped = x - Math.floor(x);
  if (wrapped < 0.5) return { u: wrapped * 2, forward: true };
  return { u: 2 - wrapped * 2, forward: false };
}

function treadwheelSpinFromHook(rig: NonNullable<ReturnType<typeof colosseumCraneRigAt>>): number {
  return (rig.hook[1] - rig.base[1]) / COLOSSEUM_TREADWHEEL_RADIUS;
}

function travelMeters(phase: ActiveColosseumOperation['state']['phase'], local: number): number {
  if (phase === 'quarry') return local * 6;
  if (phase === 'hauled') return 6 + local * 48;
  if (phase === 'staged') return 54 + local * 4;
  if (phase === 'hoisted') return 58 + local * 22;
  return 80;
}

function groundAt(x: number, z: number): number {
  return colosseumTerrainHeightAt(x, z);
}

function pushCrew(
  crews: ColosseumCrewPose[],
  id: string,
  role: ColosseumCrewRole,
  x: number,
  z: number,
  yaw: number,
  lean: number,
  gait: number,
  arm: number,
  y = groundAt(x, z),
): void {
  crews.push({
    id,
    role,
    position: [x, y, z],
    yaw,
    lean,
    gait,
    arm,
  });
}

function labourForOperation(operation: ActiveColosseumOperation, crews: ColosseumCrewPose[], rigs: ColosseumRigMotion[]): void {
  const { part, state } = operation;
  const [px, , pz] = state.position;
  const yaw = state.rotation[1];
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const lx = Math.cos(yaw);
  const lz = -Math.sin(yaw);
  const local = state.phaseLocal;
  const travel = travelMeters(state.phase, local);
  const rig = colosseumCraneRigAt(part, state);

  if (state.phase === 'quarry') {
    for (let i = 0; i < 2; i += 1) {
      const id = `${part.id}-dresser-${i}`;
      const s = salt(id);
      const { u, forward } = pingpong(local * (1.1 + s[0] * 1.6) + s[1]);
      const x = px + (u - 0.5) * (4.2 + s[2] * 4) + lx * (s[3] * 3.2 - 1.6);
      const z = pz + (u - 0.5) * (1.6 + s[4] * 2.4) + lz * (i === 0 ? 1.4 : -2.1);
      pushCrew(
        crews,
        id,
        'dresser',
        x,
        z,
        forward ? yaw + s[5] * 0.4 : yaw + Math.PI - s[5] * 0.4,
        0.08 + s[0] * 0.18,
        travel / STRIDE * (0.6 + s[1]) + s[2] * 8,
        local * (18 + s[3] * 22) + s[4] * 6,
      );
    }
  }

  if (state.mechanism === 'wagon') {
    const hauls = [
      { along: 7.2, side: 1.1, lean: 0.28, gait: 1.05, yaw: 0 },
      { along: 4.4, side: -2.6, lean: 0.2, gait: 0.62, yaw: 0.18 },
      { along: 2.1, side: 3.2, lean: 0.08, gait: 0.28, yaw: -0.35 },
      { along: 0.4, side: -1.2, lean: 0.32, gait: 0.12, yaw: 0.55 },
    ] as const;
    for (let i = 0; i < hauls.length; i += 1) {
      const id = `${part.id}-hauler-${i}`;
      const s = salt(id);
      const job = hauls[i]!;
      const along = job.along + (s[0] - 0.5) * 1.4;
      const side = job.side + (s[1] - 0.5) * 0.9;
      pushCrew(
        crews,
        id,
        'hauler',
        px + fx * along + lx * side,
        pz + fz * along + lz * side,
        yaw + job.yaw + (s[3] - 0.5) * 0.25,
        job.lean + s[4] * 0.08,
        travel / STRIDE * job.gait + s[5] * 13 + i * 3.7,
        travel / STRIDE * (0.2 + s[1] * 0.5) + s[2] * 9,
      );
    }
    const driverId = `${part.id}-driver`;
    const ds = salt(driverId);
    pushCrew(
      crews,
      driverId,
      'driver',
      px + lx * (2.6 + ds[0] * 1.4) + fx * (ds[1] - 0.4) * 1.8,
      pz + lz * (2.6 + ds[0] * 1.4) + fz * (ds[1] - 0.4) * 1.8,
      yaw + (ds[2] - 0.5) * 0.5,
      0.04 + ds[3] * 0.12,
      travel / STRIDE * (0.5 + ds[4] * 0.7) + ds[5] * 5,
      travel / STRIDE * 0.3 + ds[0] * 4,
    );
    rigs.push({ partId: part.id, wagonSpin: travel / 0.55, treadwheelSpin: 0 });
  }

  if (state.phase === 'staged') {
    const jobs = [
      { along: 3.2, side: 2.4, walk: true },
      { along: -2.8, side: 3.1, walk: false },
      { along: 0.4, side: -3.4, walk: true },
    ] as const;
    for (let i = 0; i < jobs.length; i += 1) {
      const id = `${part.id}-slinger-${i}`;
      const s = salt(id);
      const job = jobs[i]!;
      const { u, forward } = job.walk
        ? pingpong(local * (0.8 + s[0] * 1.4) + s[1])
        : { u: 0.35 + s[0] * 0.3, forward: true };
      const x = px + fx * (job.along + (u - 0.5) * (job.walk ? 2.8 : 0.4)) + lx * job.side * (0.7 + s[2] * 0.5);
      const z = pz + fz * (job.along + (u - 0.5) * (job.walk ? 2.8 : 0.4)) + lz * job.side * (0.7 + s[2] * 0.5);
      pushCrew(
        crews,
        id,
        'slinger',
        x,
        z,
        job.walk ? (forward ? yaw : yaw + Math.PI) + (s[3] - 0.5) * 0.4 : yaw + Math.PI * (s[4] - 0.3),
        job.walk ? 0.12 + s[5] * 0.12 : 0.2 + s[0] * 0.1,
        (job.walk ? travel : local * 8) / STRIDE * (0.5 + s[1]) + s[2] * 9,
        local * (10 + s[3] * 24) + s[4] * 5,
      );
    }
  }

  if (rig) {
    const spin = treadwheelSpinFromHook(rig);
    const wfx = Math.sin(rig.yaw);
    const wfz = Math.cos(rig.yaw);
    const wlx = Math.cos(rig.yaw);
    const wlz = -Math.sin(rig.yaw);
    for (let i = 0; i < 2; i += 1) {
      const id = `${part.id}-wheel-${i}`;
      const s = salt(id);
      const walking = i === 0;
      const along = walking
        ? Math.sin(spin * (0.7 + s[0] * 0.6) + s[1] * 2) * (0.35 + s[2] * 0.5)
        : 0.12 + s[0] * 0.22;
      const side = walking
        ? (0.85 + s[3] * 0.5)
        : -(1.6 + s[3] * 0.9);
      pushCrew(
        crews,
        id,
        'wheel-walker',
        rig.treadwheel[0] + wfx * along + wlx * side,
        rig.treadwheel[2] + wfz * along + wlz * side,
        rig.yaw + (walking ? 0 : Math.PI * 0.35) + (s[4] - 0.5) * 0.4,
        walking ? 0.18 + s[5] * 0.12 : 0.08 + s[5] * 0.1,
        walking
          ? (spin * COLOSSEUM_TREADWHEEL_RADIUS) / STRIDE * (0.6 + s[0]) + s[1] * 8
          : spin * 0.4 + s[1] * 11,
        walking ? spin * (2 + s[2] * 4) + s[3] * 5 : s[2] * 14 + spin * 0.25,
      );
    }
    if (local > 0.38) {
      for (let i = 0; i < 2; i += 1) {
        const id = `${part.id}-tag-${i}`;
        const s = salt(id);
        const side = (i === 0 ? 3.4 : -3.8) + (s[0] - 0.5) * 1.6;
        const along = (s[1] - 0.5) * 3.2;
        pushCrew(
          crews,
          id,
          'tag-line',
          px + lx * side + fx * along,
          pz + lz * side + fz * along,
          yaw + (s[2] - 0.5) * 0.8,
          0.12 + s[3] * 0.16,
          travel / STRIDE * (0.5 + s[4]) + s[5] * 6,
          travel / STRIDE * 0.4 + s[0] * 5,
        );
      }
    }
    rigs.push({ partId: part.id, wagonSpin: 0, treadwheelSpin: spin });
  }
}

function yardShuttles(t: number, crews: ColosseumCrewPose[]): void {
  if (t <= 0.06 || t >= 0.93) return;
  for (let i = 0; i < 6; i += 1) {
    const id = `mixer-${i}`;
    const s = salt(id);
    if (i > 0 && s[0] < 0.38) {
      const x = MIX_FROM[0] + s[1] * 10;
      const z = MIX_FROM[1] + s[2] * 8;
      pushCrew(
        crews,
        id,
        'mixer',
        x,
        z,
        s[3] * TAU,
        0.1 + s[4] * 0.16,
        t * (9 + s[5] * 18) + s[1] * 12,
        t * (14 + s[0] * 20) + s[2] * 8,
      );
      continue;
    }
    const { u, forward } = pingpong(t * (0.7 + s[1] * 2.2) + s[2]);
    const x = MIX_FROM[0] + (MIX_TO[0] - MIX_FROM[0]) * u + (s[3] - 0.5) * 3.4;
    const z = MIX_FROM[1] + (MIX_TO[1] - MIX_FROM[1]) * u + (s[4] - 0.5) * 2.8;
    const yaw = Math.atan2(MIX_TO[0] - MIX_FROM[0], MIX_TO[1] - MIX_FROM[1]);
    pushCrew(
      crews,
      id,
      'mixer',
      x,
      z,
      forward ? yaw + (s[5] - 0.5) * 0.5 : yaw + Math.PI + (s[0] - 0.5) * 0.5,
      0.1 + s[1] * 0.16,
      (t * (22 + s[2] * 28) + s[3] * 9) / STRIDE,
      t * (12 + s[4] * 16) + s[5] * 7,
    );
  }
  for (let i = 0; i < 4; i += 1) {
    const id = `bearer-${i}`;
    const s = salt(id);
    const { u, forward } = pingpong(t * (0.6 + s[0] * 1.8) + s[1]);
    const x = TIMBER_FROM[0] + (TIMBER_TO[0] - TIMBER_FROM[0]) * u + (s[2] - 0.5) * 2.4;
    const z = TIMBER_FROM[1] + (TIMBER_TO[1] - TIMBER_FROM[1]) * u + (s[3] - 0.5) * 2.2;
    const yaw = Math.atan2(TIMBER_TO[0] - TIMBER_FROM[0], TIMBER_TO[1] - TIMBER_FROM[1]);
    pushCrew(
      crews,
      id,
      'bearer',
      x,
      z,
      forward ? yaw : yaw + Math.PI,
      0.12 + s[4] * 0.14,
      (t * (18 + s[5] * 24) + s[0] * 8) / STRIDE,
      t * (10 + s[1] * 14) + s[2] * 6,
    );
  }
}

function scaffoldCrews(t: number, crews: ColosseumCrewPose[]): void {
  const window = colosseumScaffoldWindowAt(t);
  if (!window) return;
  const bays = colosseumScaffoldsAt(t);
  const raw = colosseumScaffoldStackHeightAt(t);
  const visible = Math.floor(raw / COLOSSEUM_SCAFFOLD_SEGMENT) * COLOSSEUM_SCAFFOLD_SEGMENT;
  for (let station = 0; station < COLOSSEUM_SCAFFOLD_STATIONS; station += 1) {
    const id = `climb-${station}`;
    const s = salt(id);
    const bay = bays[station];
    const theta = (station / COLOSSEUM_SCAFFOLD_STATIONS) * Math.PI * 2 - Math.PI / 2;
    const yaw = bay?.yaw ?? ellipseYaw(COLOSSEUM_A, COLOSSEUM_B, theta);
    const [sx, sz] = ellipsePoint(COLOSSEUM_A + 7.4, COLOSSEUM_B + 6.6, theta);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const lx = Math.cos(yaw);
    const lz = -Math.sin(yaw);
    const bx = bay?.position[0] ?? sx;
    const bz = bay?.position[2] ?? sz;
    const foot = bay?.footY ?? colosseumTerrainHeightAt(bx, bz);
    const stagger = station === 0 ? 0.04 : 0.12 + s[0] * 0.58;
    const poleX = bx + lx * (2.1 + s[1] * 1.2) - fx * (1.1 + s[2] * 1.4);
    const poleZ = bz + lz * (2.1 + s[1] * 1.2) - fz * (1.1 + s[2] * 1.4);
    const cap = foot + Math.max(visible, 0.35);
    const deckY = bay?.deckY ?? foot + visible;
    // South-arc clusters only — a person on every station reads as a chorus ring.
    const keep = station === 0 || station === 1 || station === 3 || station === 17;
    if (!keep) continue;

    if (window.kind === 'raising' || window.kind === 'striking') {
      if (station === 1 || station === 17) {
        const { u, forward } = pingpong(t * (1.1 + s[5] * 1.6) + s[0]);
        pushCrew(
          crews,
          `base-${station}`,
          'climber',
          bx + lx * (3.4 + u * 2) + fx * (s[1] - 0.5) * 2,
          bz + lz * (3.4 + u * 2) + fz * (s[1] - 0.5) * 2,
          forward ? yaw + 0.4 : yaw + Math.PI,
          0.12,
          t * (14 + s[2] * 16) + s[3] * 9,
          t * (10 + s[4] * 12),
          foot,
        );
        continue;
      }
      const span = window.kind === 'raising'
        ? window.raiseUntil - window.raiseFrom
        : window.strikeUntil - window.strikeFrom;
      const local = window.kind === 'raising'
        ? (t - window.raiseFrom) / span
        : (t - window.strikeFrom) / span;
      const speed = station === 0 ? 0.72 : 0.4 + s[5] * 0.85;
      const u = clamp((local - stagger) / speed);
      const along = window.kind === 'raising' ? u : 1 - u;
      const desired = window.base + window.rise * along;
      const y = Math.min(foot + desired, cap);
      pushCrew(
        crews,
        id,
        'climber',
        poleX,
        poleZ,
        yaw + (s[0] - 0.5) * 0.5,
        0.18 + s[1] * 0.18,
        desired / STRIDE * (0.5 + s[2]) + s[3] * 8,
        desired * (1.6 + s[4] * 2.4) + s[5] * 5,
        y,
      );
      continue;
    }

    const climbIn = 0.028 + s[0] * 0.02;
    const climbOut = 0.028 + s[1] * 0.02;
    if (t < window.raiseUntil + climbIn) {
      const u = clamp((t - window.raiseUntil) / climbIn);
      const y = foot + window.base + window.rise * Math.min(1, 0.55 + u * (0.3 + s[2] * 0.2));
      pushCrew(
        crews,
        id,
        'climber',
        poleX,
        poleZ,
        yaw + (s[3] - 0.5) * 0.4,
        0.2,
        (window.rise * u) / STRIDE * (0.5 + s[4]) + s[5] * 6,
        t * (18 + s[0] * 20) + station,
        Math.min(y, cap),
      );
      continue;
    }
    if (t > window.strikeFrom - climbOut) {
      const u = clamp((t - (window.strikeFrom - climbOut)) / climbOut);
      const y = foot + window.base + window.rise * (1 - u * (0.7 + s[2] * 0.3));
      pushCrew(
        crews,
        id,
        'climber',
        poleX,
        poleZ,
        yaw,
        0.2,
        (window.rise * (1 - u)) / STRIDE + s[3] * 7,
        t * 22 + s[4] * 9,
        Math.min(Math.max(y, foot), cap),
      );
      continue;
    }

    if (s[5] < 0.34) {
      pushCrew(
        crews,
        `deck-${station}`,
        'deck-mason',
        bx + lx * (s[0] * 2.2 - 1.1) - fx * 0.4,
        bz + lz * (s[0] * 2.2 - 1.1) - fz * 0.4,
        yaw + Math.PI + (s[1] - 0.5) * 0.8,
        0.1 + s[2] * 0.12,
        t * (8 + s[3] * 10) + s[4] * 6,
        t * (22 + s[5] * 18) + s[0] * 9,
        deckY,
      );
      continue;
    }
    const rate = 6 + s[0] * 16;
    const pace = Math.sin(t * rate + s[1] * 9);
    const walk = pace * (1.4 + s[2] * 1.8);
    pushCrew(
      crews,
      `deck-${station}`,
      'deck-mason',
      bx + lx * walk - fx * (0.2 + s[3] * 0.5),
      bz + lz * walk - fz * (0.2 + s[3] * 0.5),
      pace >= 0 ? yaw + Math.PI / 2 + s[4] * 0.3 : yaw - Math.PI / 2 - s[4] * 0.3,
      0.08 + s[5] * 0.12,
      t * (10 + s[0] * 18) + s[1] * 8,
      t * (14 + s[2] * 20) + s[3] * 5,
      deckY,
    );
  }
}

export function colosseumLabourAt(operations: ActiveColosseumOperation[], t: number): ColosseumLabour {
  const crews: ColosseumCrewPose[] = [];
  const rigs: ColosseumRigMotion[] = [];
  for (const operation of operations) labourForOperation(operation, crews, rigs);
  scaffoldCrews(t, crews);
  yardShuttles(t, crews);
  return { crews, rigs };
}
