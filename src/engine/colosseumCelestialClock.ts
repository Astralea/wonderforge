/** One continuous authored day; astronomical time never jumps or reverses. */
import { COLOSSEUM_EPHEMERIS } from '../data/colosseumEphemeris';

export const COLOSSEUM_CELESTIAL_CLOCK = {
  calendar: 'Julian',
  date: 'AD 0080-Jun-21',
  timeScale: 'UT1',
  knots: [[0, 4], [0.4, 12], [0.76, 18.1], [0.84, 18.8], [0.88, 19.05], [1, 20.15]] as const,
} as const;

export interface ColosseumCelestialClockSample {
  t: number;
  /** Hours since the selected Julian date's midnight, in UT1. */
  hoursUt1: number;
  julianDayUt1: number;
  /** Analytic derivative, hours per unit of normalized film time. */
  hoursPerFilmUnit: number;
}

const KNOTS = COLOSSEUM_CELESTIAL_CLOCK.knots;
const WIDTHS = KNOTS.slice(1).map((knot, i) => knot[0] - KNOTS[i][0]);
const SECANTS = WIDTHS.map((width, i) => (KNOTS[i + 1][1] - KNOTS[i][1]) / width);

function endpointTangent(h0: number, h1: number, d0: number, d1: number): number {
  const tangent = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(tangent) !== Math.sign(d0)) return 0;
  if (Math.sign(d0) !== Math.sign(d1) && Math.abs(tangent) > Math.abs(3 * d0)) return 3 * d0;
  return tangent;
}

// PCHIP weighted harmonic derivatives preserve each monotone interval while
// sharing one tangent at every interior knot. Unconstrained cubics can send
// the Moon below its rising path by overshooting an evening interval.
const TANGENTS = KNOTS.map((_, i) => {
  if (i === 0) return endpointTangent(WIDTHS[0], WIDTHS[1], SECANTS[0], SECANTS[1]);
  if (i === KNOTS.length - 1) {
    const last = WIDTHS.length - 1;
    return endpointTangent(WIDTHS[last], WIDTHS[last - 1], SECANTS[last], SECANTS[last - 1]);
  }
  const before = SECANTS[i - 1], after = SECANTS[i];
  if (before * after <= 0) return 0;
  const w1 = 2 * WIDTHS[i] + WIDTHS[i - 1];
  const w2 = WIDTHS[i] + 2 * WIDTHS[i - 1];
  return (w1 + w2) / (w1 / before + w2 / after);
});

export function celestialClockAt(rawT: number): ColosseumCelestialClockSample {
  if (!Number.isFinite(rawT)) throw new RangeError('Finite normalized film time is required.');
  const t = Math.min(1, Math.max(0, rawT));
  let index = 0;
  while (index < WIDTHS.length - 1 && t > KNOTS[index + 1][0]) index++;
  const h = WIDTHS[index];
  const p = (t - KNOTS[index][0]) / h;
  const p2 = p * p, p3 = p2 * p;
  const y0 = KNOTS[index][1], y1 = KNOTS[index + 1][1];
  const m0 = TANGENTS[index], m1 = TANGENTS[index + 1];
  const hoursUt1 = (2 * p3 - 3 * p2 + 1) * y0 + (p3 - 2 * p2 + p) * h * m0 +
    (-2 * p3 + 3 * p2) * y1 + (p3 - p2) * h * m1;
  const derivative = ((6 * p2 - 6 * p) * y0 + (3 * p2 - 4 * p + 1) * h * m0 +
    (-6 * p2 + 6 * p) * y1 + (3 * p2 - 2 * p) * h * m1) / h;
  return {
    t, hoursUt1,
    julianDayUt1: COLOSSEUM_EPHEMERIS.startJulianDay + hoursUt1 / 24,
    hoursPerFilmUnit: rawT < 0 || rawT > 1 ? 0 : Math.max(0, derivative),
  };
}
