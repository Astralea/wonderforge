import { clamp } from './easing';

/**
 * Spec 48: the authored Champ-de-Mars garden axis is approximately southeast,
 * not geographic south. City of Paris site-map p6 shows the Trocadéro–tower–
 * École Militaire axis; this frame interprets that map, not a surveyed model.
 * https://cdn.paris.fr/paris/2019/07/24/377148e093cc4988f3610326e4ca3fa5.pdf
 * Engineering north/south part identifiers remain local construction labels.
 */
export const EIFFEL_SITE_GEOGRAPHY = {
  positiveZBearing: 135,
  positiveXBearing: 45,
  latitude: 48.858,
  // Illustrative late-autumn morning, not an exact 1889 date/weather claim.
  codaSolarDeclination: -14,
} as const;

const radians = Math.PI / 180;
const finite = (value: number) => Number.isFinite(value) ? value : 0;
const wrapBearing = (value: number) => ((finite(value) % 360) + 360) % 360;

export function geographicBearingToEiffelAzimuth(bearing: number): number {
  return wrapBearing(bearing) - EIFFEL_SITE_GEOGRAPHY.positiveXBearing;
}

export function eiffelAzimuthToGeographicBearing(azimuth: number): number {
  return wrapBearing(finite(azimuth) + EIFFEL_SITE_GEOGRAPHY.positiveXBearing);
}

/**
 * Geometric altitude/azimuth relation, with geographic azimuth clockwise from
 * north: sin(delta) = sin(phi)sin(h) + cos(phi)cos(h)cos(A).
 * IMCCE rise/set geometry: https://promenade.imcce.fr/fr/pages3/367.html
 * This coda samples -8° twilight through 14° morning; no refraction or exact
 * sunrise time is claimed. Rising and setting select opposite meridian sides.
 */
export function eiffelCodaSunAtElevation(rawElevation: number, passage: 'rising' | 'setting') {
  const elevation = clamp(finite(rawElevation), -8, 14);
  const h = elevation * radians;
  const phi = EIFFEL_SITE_GEOGRAPHY.latitude * radians;
  const delta = EIFFEL_SITE_GEOGRAPHY.codaSolarDeclination * radians;
  const cosBearing = (Math.sin(delta) - Math.sin(phi) * Math.sin(h)) / (Math.cos(phi) * Math.cos(h));
  const risingBearing = Math.acos(clamp(cosBearing, -1, 1)) / radians;
  const bearing = passage === 'rising' ? risingBearing : 360 - risingBearing;
  return { azimuth: geographicBearingToEiffelAzimuth(bearing), elevation, bearing };
}

/** Unit direction from the scene toward the sun, matching the renderer/sky. */
export function eiffelSunDirection(azimuth: number, elevation: number): [number, number, number] {
  const a = finite(azimuth) * radians;
  const h = finite(elevation) * radians;
  return [Math.cos(h) * Math.cos(a), Math.sin(h), Math.cos(h) * Math.sin(a)];
}

/** Unit ground-plane projection away from the sun; not a shadow length. */
export function eiffelGroundShadowDirection(azimuth: number): [number, number, number] {
  const a = finite(azimuth) * radians;
  return [-Math.cos(a), 0, -Math.sin(a)];
}
