import type { Vec3 } from '../data/constructionTypes';
import { EIFFEL_CONSTRUCTION, EIFFEL_LEGS, EIFFEL_PLATFORM_1, eiffelLegCenter } from '../data/eiffelConstruction';
import type { ActiveEiffelOperation } from './eiffelConstruction';
import { eiffelCraneRigAt, eiffelVerticalHalfExtent, eiffelWorkingFloorYAt } from './eiffelConstruction';
import { clamp } from './easing';
import { mulberry32 } from './random';
import { eiffelTerrainHeightAt } from './eiffelTerrain';

export type EiffelCrewRole =
  | 'hauler'
  | 'driver'
  | 'slinger'
  | 'riveter'
  | 'tag-line'
  | 'climber'
  | 'foreman';

export interface EiffelCrewPose {
  id: string;
  role: EiffelCrewRole;
  position: Vec3;
  yaw: number;
  lean: number;
  gait: number;
  arm: number;
}

export interface EiffelLabour {
  crews: EiffelCrewPose[];
}

function salt(id: string): [number, number, number, number] {
  const roll = mulberry32(id);
  return [roll(), roll(), roll(), roll()];
}

function pingpong(x: number): number {
  const wrapped = x - Math.floor(x);
  return wrapped < 0.5 ? wrapped * 2 : 2 - wrapped * 2;
}

/** Spec 14: tunics follow the Paris dusk clock, not a fixed day-red. */
export function eiffelLabourAlbedoAt(t: number): number {
  if (t < 0.7) return 1;
  return Math.max(0.22, 1 - (t - 0.7) / 0.18);
}

const GANG_ROLE: EiffelCrewRole[] = ['riveter', 'slinger', 'hauler', 'riveter', 'riveter', 'riveter', 'slinger'];

const OPEN_DECK_STATIONS = [{ count: 3, dx: 0, dz: -5.5, yaw: Math.PI }] as const;
const BUILD_DECK_STATIONS = [
  { count: 3, dx: -9.4, dz: -4.2, yaw: Math.PI * 0.72 },
  { count: 2, dx: 0.8, dz: 5.6, yaw: -0.4 },
  { count: 2, dx: 10.6, dz: -2.8, yaw: Math.PI * 1.18 },
] as const;
const P1_STATIONS = [
  { count: 2, dx: -8.4, dz: -5.8, yaw: Math.PI * 0.85 },
  { count: 2, dx: 7.6, dz: 4.2, yaw: -0.55 },
] as const;

function pushStation(
  crews: EiffelCrewPose[],
  idPrefix: string,
  originX: number,
  originY: number,
  originZ: number,
  t: number,
  stations: readonly { count: number; dx: number; dz: number; yaw: number }[],
  roleAt: (index: number) => EiffelCrewRole,
): void {
  let index = 0;
  for (const [stationIndex, station] of stations.entries()) {
    const alongX = Math.cos(station.yaw);
    const alongZ = Math.sin(station.yaw);
    for (let n = 0; n < station.count; n += 1) {
      const id = `${idPrefix}-${index}`;
      const [n0, n1] = salt(id);
      const along = (n - (station.count - 1) / 2) * 2.15 + (n0 - 0.5) * 0.7;
      const face = station.yaw + (n % 2 === 0 ? 0.42 : -0.58) + (n1 - 0.5) * 0.45 + stationIndex * 0.12;
      crews.push({
        id,
        role: roleAt(index),
        position: [
          originX + station.dx + alongX * along,
          originY,
          originZ + station.dz + alongZ * along + pingpong(t * (0.4 + n0) + n * 0.2) * 0.8,
        ],
        yaw: face,
        lean: (n0 - 0.5) * 0.32 + (n % 2 === 0 ? 0.12 : -0.16),
        gait: pingpong(t * (5.4 + stationIndex) + n1 * 3.1 + n),
        arm: 0.35 + n0 * 0.5,
      });
      index += 1;
    }
  }
}

export function eiffelLabourAt(
  active: readonly ActiveEiffelOperation[],
  t: number,
  plan: typeof EIFFEL_CONSTRUCTION = EIFFEL_CONSTRUCTION,
): EiffelLabour {
  const crews: EiffelCrewPose[] = [];
  for (const [index, leg] of EIFFEL_LEGS.entries()) {
    const [x, z] = eiffelLegCenter(leg.sx, leg.sz, 4);
    const [s0] = salt(`foreman-${leg.key}`);
    const walk = pingpong(t * 0.35 + index * 0.2);
    crews.push({
      id: `foreman-${leg.key}`,
      role: 'foreman',
      position: [
        x + leg.sx * (16 + walk * 8),
        eiffelTerrainHeightAt(x, z) + 0.98,
        z + leg.sz * 14,
      ],
      yaw: Math.atan2(leg.sx, leg.sz),
      lean: 0,
      gait: walk,
      arm: 0.15 + s0 * 0.1,
    });
    if (leg.sz < 0) {
      const deckY = eiffelWorkingFloorYAt(plan, t, leg.key, 400);
      const [dx, dz] = eiffelLegCenter(leg.sx, leg.sz, Math.max(4, deckY));
      const buildDeck = t > 0.36 && deckY > 70;
      pushStation(
        crews,
        `north-gang-${leg.key}`,
        dx,
        deckY + 0.18,
        dz,
        t,
        buildDeck ? BUILD_DECK_STATIONS : OPEN_DECK_STATIONS,
        (n) => GANG_ROLE[n]!,
      );
      if (t > 0.4 && deckY > EIFFEL_PLATFORM_1 + 12) {
        const [px, pz] = eiffelLegCenter(leg.sx, leg.sz, EIFFEL_PLATFORM_1);
        pushStation(
          crews,
          `p1-gang-${leg.key}`,
          px,
          EIFFEL_PLATFORM_1 + 0.22,
          pz,
          t,
          P1_STATIONS,
          (n) => (n % 2 === 0 ? 'riveter' : 'slinger'),
        );
      }
    }
  }
  for (const operation of active) {
    const [s0, s1, s2, s3] = salt(operation.part.id);
    const state = operation.state;
    const yaw = Math.atan2(
      state.position[0] - operation.part.finalPosition[0],
      state.position[2] - operation.part.finalPosition[2],
    );
    const gait = pingpong(t * 6.2 + s0 * 4);
    if (state.phase === 'hauled' || state.phase === 'yard') {
      crews.push({
        id: `${operation.part.id}-hauler`,
        role: 'hauler',
        position: [
          state.position[0] + Math.cos(yaw) * 2.2,
          eiffelTerrainHeightAt(state.position[0], state.position[2]) + 0.95,
          state.position[2] + Math.sin(yaw) * 2.2,
        ],
        yaw,
        lean: (s1 - 0.5) * 0.12,
        gait,
        arm: 0.4 + s2 * 0.3,
      });
      crews.push({
        id: `${operation.part.id}-driver`,
        role: 'driver',
        position: [
          state.position[0] - Math.cos(yaw) * 1.6,
          eiffelTerrainHeightAt(state.position[0], state.position[2]) + 1.05,
          state.position[2] - Math.sin(yaw) * 1.6,
        ],
        yaw,
        lean: -0.04,
        gait: pingpong(t * 5.1 + s3),
        arm: 0.2,
      });
    }
    if (state.phase === 'hoisted' || state.phase === 'staged') {
      const rig = eiffelCraneRigAt(operation.part, state);
      const base = rig?.base ?? state.position;
      const cameraFacing = operation.part.finalPosition[2] < 12;
      if (cameraFacing || s0 > 0.35) {
        crews.push({
          id: `${operation.part.id}-slinger`,
          role: 'slinger',
          position: [base[0] + 1.8, base[1] + 1.0, base[2] - 1.1],
          yaw: rig?.yaw ?? yaw,
          lean: 0.16,
          gait: 0.2 + s1 * 0.2,
          arm: 0.7,
        });
      }
      if (cameraFacing || s1 > 0.28) {
        const ceiling = operation.part.finalPosition[1] - eiffelVerticalHalfExtent(operation.part.dimensions);
        const floorY = eiffelWorkingFloorYAt(plan, t, operation.part.leg, ceiling);
        crews.push({
          id: `${operation.part.id}-riveter`,
          role: 'riveter',
          position: [
            operation.part.finalPosition[0] + (s2 - 0.5) * 4.2,
            floorY + 0.18,
            operation.part.finalPosition[2] - 3.4 + (s3 - 0.5) * 2.2,
          ],
          yaw: yaw + 0.4,
          lean: 0.1,
          gait: pingpong(t * 7 + s0),
          arm: 0.85,
        });
      }
      crews.push({
        id: `${operation.part.id}-tag`,
        role: 'tag-line',
        position: [state.position[0] + 3.4, eiffelTerrainHeightAt(state.position[0], state.position[2]) + 0.95, state.position[2] + 2.2],
        yaw: yaw + Math.PI,
        lean: -0.08,
        gait: 0.3,
        arm: 0.6,
      });
      if (rig && (state.phase === 'hoisted' || cameraFacing)) {
        const mastSpan = Math.max(4, rig.mastTop[1] - rig.base[1] - 5);
        crews.push({
          id: `${operation.part.id}-climber`,
          role: 'climber',
          position: [
            rig.base[0] + Math.cos(rig.yaw) * 1.1,
            rig.base[1] + 2.4 + pingpong(t * 1.1 + s2) * mastSpan,
            rig.base[2] + Math.sin(rig.yaw) * 1.1,
          ],
          yaw: rig.yaw,
          lean: 0.22,
          gait: pingpong(t * 4.4 + s3),
          arm: 0.9,
        });
      }
    }
  }
  return { crews: crews.slice(0, 256) };
}

export function eiffelCrewCapAt(t: number): number {
  return 24 + Math.floor(clamp(t) * 40);
}
