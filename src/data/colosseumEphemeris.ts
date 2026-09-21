/** Offline apparent topocentric ephemerides; see Spec 12 and the provenance manifest. */
import { COLOSSEUM_EPHEMERIS_ROWS } from './colosseumEphemeris.generated';

export type ColosseumEphemerisRow = readonly [
  sunAzimuthDegrees: number,
  sunElevationDegrees: number,
  sunDistanceKm: number,
  sunAngularRadiusDegrees: number,
  moonAzimuthDegrees: number,
  moonElevationDegrees: number,
  moonDistanceKm: number,
  moonAngularRadiusDegrees: number,
  moonIlluminatedFraction: number,
  moonPhaseAngleDegrees: number,
  moonElongationDegrees: number,
  moonWaxing: number,
  deltaTSeconds: number,
];

export const COLOSSEUM_EPHEMERIS = {
  id: 'colosseum-jpl-de441-ad80-june21',
  source: 'JPL Horizons / DE441',
  observer: { latitudeDegrees: 41.8902, longitudeDegrees: 12.4922, altitudeMetres: 25 },
  axes: '+X east, +Y up, +Z north',
  azimuthConvention: 'clockwise from north: 0 north, 90 east, 180 south, 270 west',
  calendar: 'Julian',
  timeScale: 'UT1',
  apparentCoordinates: 'AIRLESS',
  startDate: 'AD 0080-Jun-21 00:00:00 UT1 (Julian)',
  endDate: 'AD 0080-Jun-23 06:00:00 UT1 (Julian)',
  startJulianDay: 1_750_449.5,
  endJulianDay: 1_750_451.75,
  stepMinutes: 5,
  rows: COLOSSEUM_EPHEMERIS_ROWS,
  interpretation:
    'Representative authored dates during the construction era, not a dedication-date claim. ' +
    'The selected Jun21 evening has a nearly full waning Moon rising after the Sun sets. ' +
    'Horizons reconstructs ancient Earth rotation through an estimated TDB−UT1 model; ' +
    'interpolation error is measured against that model, not against an ancient observation. ' +
    'Apparent directions include topocentric parallax and light-time/aberration, but no ' +
    'atmospheric refraction, local terrain horizon or weather extinction. No modern UTC or daylight saving is implied.',
  sources: [
    'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
    'https://ssd.jpl.nasa.gov/horizons/manual.html#observer-table',
    'https://ssd.jpl.nasa.gov/horizons/manual.html#long-term-ephemerides',
  ],
  provenance: 'artifacts/colosseum-moonrise-2026-09-20/ephemeris/manifest.json',
} as const;
