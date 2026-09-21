/**
 * Authoritative Salisbury Plain support surface, in world metres.
 * Pure construction state and Three.js terrain/props consume this same sample.
 *
 * The working floor stays nearly flat. Beyond it the horizon is offset
 * chalk lobes (NW, SE, SW), not a circular ridge centred on the henge.
 */
export function stonehengeTerrainHeightAt(x: number, z: number): number {
  const radius = Math.hypot(x, z);
  const inner = Math.max(0, Math.min(1, (radius - 88) / 150));
  const nw = Math.exp(-((x + 280) ** 2 + (z + 210) ** 2) / (2 * 170 ** 2));
  const se = Math.exp(-((x - 250) ** 2 + (z - 250) ** 2) / (2 * 185 ** 2));
  const sw = Math.exp(-((x + 140) ** 2 + (z - 310) ** 2) / (2 * 150 ** 2));
  const lobes = nw * 15.5 + se * 12.5 + sw * 9.2;
  const rolling =
    Math.sin(x * 0.011 + z * 0.007) * 4.1
    + Math.cos(z * 0.009 - x * 0.006) * 3.0
    + Math.sin((x * 0.55 + z) * 0.008) * 2.1;
  const downs = inner * (lobes + rolling);
  const nearFade = Math.max(0, Math.min(1, (radius - 24) / 72));
  const turfRelief = nearFade * (
    Math.sin(x * 0.12 + z * 0.055) * 0.16
    + Math.cos(z * 0.098 - x * 0.041) * 0.11
  );
  return downs + turfRelief;
}
