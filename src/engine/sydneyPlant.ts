import type { Vec3 } from '../data/constructionTypes';
import { SYDNEY_CRANE_BASES } from '../data/sydneyConstruction';
import { clamp } from './easing';
import { sydneyTerrainHeightAt } from './sydneyTerrain';

export type SydneyPlantKind = 'tower-crane' | 'crawler-crane' | 'dozer' | 'dump-truck';

export interface SydneyPlantPose {
  id: string;
  kind: SydneyPlantKind;
  position: Vec3;
  yaw: number;
  /** Blade drop, dump-bed tilt, or jib luff in 0–1. */
  articulation: number;
}

const pingPong = (t: number, speed: number, salt: number) => {
  const cycle = ((t * speed + salt) % 2 + 2) % 2;
  return cycle < 1 ? cycle : 2 - cycle;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const onGround = (x: number, z: number): Vec3 => [x, sydneyTerrainHeightAt(x, z), z];

/** Modern 1959–1973 civil plant. Ground contact is the shared peninsula sampler. */
export function sydneyPlantAt(rawT: number): SydneyPlantPose[] {
  const t = clamp(rawT);
  const poses: SydneyPlantPose[] = [];

  if (t >= 0.05 && t <= 0.93) {
    for (let crane = 0; crane < SYDNEY_CRANE_BASES.length; crane += 1) {
      const base = SYDNEY_CRANE_BASES[crane]!;
      poses.push({
        id: `tower-crane-${crane}`,
        kind: 'tower-crane',
        position: [base[0], base[1], base[2]],
        yaw: crane === 0 ? -0.42 : 0.68,
        articulation: 0.38,
      });
    }
  }

  if (t >= 0.08 && t <= 0.72) {
    poses.push({
      id: 'crawler-crane-yard',
      kind: 'crawler-crane',
      position: onGround(18, 74),
      yaw: -0.52 + pingPong(t, 1.35, 0.18) * 0.4,
      articulation: 0.26 + pingPong(t, 2.05, 0.4) * 0.22,
    });
  }

  if (t >= 0.02 && t <= 0.46) {
    const yardU = pingPong(t, 2.35, 0.08);
    poses.push({
      id: 'dozer-yard',
      kind: 'dozer',
      position: onGround(lerp(-12, 22, yardU), 76),
      yaw: 1.57,
      articulation: 0.12 + pingPong(t, 6.2, 0.2) * 0.18,
    });
    const apronU = pingPong(t, 1.92, 0.41);
    poses.push({
      id: 'dozer-apron',
      kind: 'dozer',
      position: onGround(lerp(-18, 16, apronU), 46),
      yaw: 1.57,
      articulation: 0.1 + pingPong(t, 5.4, 0.55) * 0.2,
    });
    const westU = pingPong(t, 2.08, 0.73);
    poses.push({
      id: 'dozer-west',
      kind: 'dozer',
      position: onGround(-44, lerp(-8, 28, westU)),
      yaw: 0,
      articulation: 0.14 + pingPong(t, 5.8, 0.9) * 0.16,
    });
  }

  if (t >= 0.04 && t <= 0.52) {
    for (let truck = 0; truck < 3; truck += 1) {
      const u = pingPong(t, 1.55, truck * 0.31);
      const x = lerp(12, -14, u);
      const z = lerp(82, 108, u);
      poses.push({
        id: `dump-truck-${truck}`,
        kind: 'dump-truck',
        position: onGround(x, z),
        yaw: Math.atan2(-14 - 12, 108 - 82),
        articulation: u > 0.86 ? (u - 0.86) / 0.14 : 0,
      });
    }
  }

  return poses;
}
