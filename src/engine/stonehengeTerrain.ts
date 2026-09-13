/**
 * Authoritative Salisbury Plain support surface, in world metres.
 * Pure construction state and Three.js terrain/props consume this same sample.
 */
export function stonehengeTerrainHeightAt(x: number, z: number): number {
  const radius = Math.hypot(x, z);
  const fade = Math.max(0, Math.min(1, (radius - 220) / 200));
  const downs = fade * (
    Math.sin(x * 0.009 + z * 0.005) * 11.5
    + Math.cos(z * 0.011 - x * 0.004) * 7.2
    + Math.sin((x + z) * 0.007) * 4.8
    + Math.sin(x * 0.028 - z * 0.022) * 2.4
  );
  const nearFade = Math.max(0, Math.min(1, (radius - 24) / 72));
  const turfRelief = nearFade * (
    Math.sin(x * 0.12 + z * 0.055) * 0.16
    + Math.cos(z * 0.098 - x * 0.041) * 0.11
  );
  return downs + turfRelief;
}
