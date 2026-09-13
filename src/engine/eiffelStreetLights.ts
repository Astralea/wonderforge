import { eiffelTerrainHeightAt } from './eiffelTerrain';

export interface EiffelStreetLamp {
  readonly id: string;
  readonly base: readonly [number, number, number];
  readonly apertureY: number;
  readonly height: number;
}

export const EIFFEL_STREET_PAVING_LIFT = 0.24;
export const EIFFEL_STREET_LAMP_POOL_RADIUS = 1.25;

/** Existing gas standards baked into paris-city.glb by
 * scripts/blender_paris_exposition.py. These are original, compressed period
 * scenery, not surveyed historic lamp locations. Never add a second pole here.
 * The x=±181.5 footways lie inside the authored 3m south-bank paving strips.
 */
export const EIFFEL_STREET_LAMPS: readonly EiffelStreetLamp[] = [-1, 1].flatMap(side =>
  Array.from({ length: 9 }, (_, index) => {
    const x = side * 181.5, z = 28 + index * 52;
    const y = eiffelTerrainHeightAt(x, z) + EIFFEL_STREET_PAVING_LIFT;
    return { id: `gas-${side < 0 ? 'west' : 'east'}-${index + 1}`,
      base: [x, y, z] as const, apertureY: y + 4.1, height: 4.49 };
  }),
);

export function eiffelStreetLampAmount(raw: number): number {
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
}
