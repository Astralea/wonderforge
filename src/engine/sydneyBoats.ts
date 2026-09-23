import { SYDNEY_WATER_Y } from './sydneyTerrain';

/** Local +X is the existing workboat kit's bow. Curves are single voyages
 * over the film, never modulo loops; scrubbing reconstructs the same pose. */
type Point = readonly [number, number];
export interface SydneyBoatRoute {
  readonly id: string;
  readonly from: Point;
  readonly via: Point;
  readonly to: Point;
  readonly berthYaw?: number;
}
export const SYDNEY_BOAT_ROUTES: readonly SydneyBoatRoute[] = [
  {
    id: 'farm-cove-outbound',
    from: [110, -80],
    via: [160, -50],
    to: [220, -30],
  },
  { id: 'harbour-inbound', from: [250, 35], via: [210, -40], to: [175, -120] },
  { id: 'cove-tender', from: [105, 80], via: [150, 110], to: [200, 140] },
  {
    id: 'point-berth',
    from: [120, -145],
    via: [120, -145],
    to: [120, -145],
    berthYaw: 0,
  },
  {
    id: 'western-outbound',
    from: [-105, -100],
    via: [-160, -75],
    to: [-235, -20],
  },
  { id: 'quay-tender', from: [-270, 280], via: [-235, 225], to: [-205, 180] },
  {
    id: 'quay-berth',
    from: [-260, 400],
    via: [-260, 400],
    to: [-260, 400],
    berthYaw: Math.PI,
  },
  {
    id: 'cove-berth',
    from: [85, 155],
    via: [85, 155],
    to: [85, 155],
    berthYaw: 0,
  },
];
export interface SydneyBoatPose {
  readonly id: string;
  readonly position: readonly [number, number, number];
  readonly yaw: number;
}
export function sydneyBoatsAt(time: number): SydneyBoatPose[] {
  const t = Math.max(0, Math.min(1, time));
  return SYDNEY_BOAT_ROUTES.map((route) => {
    const { from: a, via: b, to: c } = route;
    const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
    const z = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
    const dx = (1 - t) * (b[0] - a[0]) + t * (c[0] - b[0]);
    const dz = (1 - t) * (b[1] - a[1]) + t * (c[1] - b[1]);
    return {
      id: route.id,
      position: [x, SYDNEY_WATER_Y + 0.03, z],
      yaw: route.berthYaw ?? -Math.atan2(dz, dx),
    };
  });
}
