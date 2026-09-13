import { sampleEiffelLongLoadFilm } from './eiffelLongLoadFilm';
import { EIFFEL_FIRST_FLOOR_Y } from './eiffelFirstFloorSupply';
import type { RigidVec3 as V } from './eiffelRigid';

export const EIFFEL_LONG_LOAD_DRIVE_ORIGIN: V = [-24.08, EIFFEL_FIRST_FLOOR_Y + .8, -4.69];
export const EIFFEL_LONG_LOAD_DRIVE_RATIO = 2;
const world = (p: V): V => p.map((v, k) => v + EIFFEL_LONG_LOAD_DRIVE_ORIGIN[k]!) as unknown as V;

/** One clock drives the hoist, mating gears, crank and rigid connecting rod. */
export function sampleEiffelLongLoadDrive(seconds: number) {
  const load = sampleEiffelLongLoadFilm(seconds);
  // Receiver's local +X drum axis points along world -Z. Mating gears reverse.
  const angle = EIFFEL_LONG_LOAD_DRIVE_RATIO * load.drumAngle;
  const pin: V = [.1 * Math.cos(angle), .1 * Math.sin(angle), -.51];
  const slider: V = [pin[0] - Math.sqrt(.5 ** 2 - pin[1] ** 2), 0, -.51];
  return {
    seconds: load.seconds,
    crankAngle: angle,
    crankOrigin: EIFFEL_LONG_LOAD_DRIVE_ORIGIN,
    crankPin: world(pin),
    sliderOrigin: world(slider),
    rodOrigin: world([(pin[0] + slider[0]) / 2, pin[1] / 2, -.51]),
    rodAngle: Math.atan2(pin[1], pin[0] - slider[0]),
  };
}
