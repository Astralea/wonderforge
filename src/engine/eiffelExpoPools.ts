import { eiffelTerrainHeightAt } from './eiffelTerrain';

/** Dimensions and levels of the existing, unchanged Paris GLB basin solids. */
export const EIFFEL_EXPO_POOL_PLANS = [
  { x: 0, z: 230, width: 20, length: 68 },
  { x: 0, z: 310, width: 18, length: 24 },
].map(pool => {
  const base = eiffelTerrainHeightAt(pool.x, pool.z);
  return { ...pool, base, floorBottom: base - .04, floorTop: base + .10,
    copingBottom: base + .15, waterY: base + .32 };
});

