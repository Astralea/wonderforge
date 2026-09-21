/** Metres, seconds, world coordinates. Independent of the construction clock. */
export const EIFFEL_ENDING_BIRD_PERIOD = 48;
export const EIFFEL_ENDING_BIRD_COUNT = 5;
export interface EiffelEndingBirdSample {
  id: number;
  position: readonly [number, number, number];
  heading: number;
  bank: number;
  wingAngle: number;
  wingspan: number;
}
const TAU = Math.PI * 2;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export function eiffelEndingBirdOpacity(seconds: number): number {
  const t = clamp(((Number.isFinite(seconds) ? seconds : 0) - 174) / 3);
  return t * t * (3 - 2 * t);
}
/** Closed, differentiable routes stay >390m in front of the tower and >245m
 * above the site. The flock is staggered rather than synchronized in a V. */
export function sampleEiffelEndingBirds(rawSeconds: number): EiffelEndingBirdSample[] {
  const seconds = Number.isFinite(rawSeconds) ? rawSeconds : 0;
  const time = ((seconds - 174) % EIFFEL_ENDING_BIRD_PERIOD + EIFFEL_ENDING_BIRD_PERIOD) % EIFFEL_ENDING_BIRD_PERIOD;
  return Array.from({ length: EIFFEL_ENDING_BIRD_COUNT }, (_, id) => {
    const a = time / EIFFEL_ENDING_BIRD_PERIOD * TAU + id * 0.16 - 0.9;
    const radiusZ = 26 + id;
    const z = -435 + Math.cos(a) * radiusZ;
    // An oblique oval stays to the camera-right of the tower silhouette. This
    // is an authored world route, never camera-attached or scaled for display.
    const dz = -radiusZ * Math.sin(a);
    const dx = -7 * Math.cos(a) - 0.3057 * dz;
    // Four short wingbeat passages per circuit, with long level glides.
    const burst = Math.max(0, Math.sin(time / 12 * TAU + id * 1.1)) ** 3;
    const wingAngle = 0.08 + burst * 0.48 * Math.sin(time * TAU * 1.75 + id * 1.7);
    return { id, position: [178.8 - 0.3057 * (z + 585) - 18 - Math.sin(a) * 7 + [0, 3, -2, 4, -3][id]!,
      263 + id * 4.5 + Math.sin(a * 2 + id * 0.4) * 1.3,
      z],
    heading: Math.atan2(dx, dz), bank: 0.8 + Math.sin(a) * 0.15,
    wingAngle, wingspan: 1.18 + id * 0.05 };
  });
}
