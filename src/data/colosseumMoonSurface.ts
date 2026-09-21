/** Image identity/provenance; the renderer owns loading and GPU resources. */
export const COLOSSEUM_MOON_SURFACE = {
  id: 'nasa-lroc-2019-1k',
  source: 'https://svs.gsfc.nasa.gov/4720/',
  original: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg',
  credit: "NASA's Scientific Visualization Studio",
  width: 1024,
  height: 512,
  bytes: 139068,
  sha256: 'b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109',
  interpretation: 'Native 2019 LROC-derived aesthetic color map, not raw scientific photometry. '
    + 'Mean near-side longitude/latitude framing; no date-exact optical libration claim.',
} as const;
