import { EIFFEL_GROUND_STATIONS, type EiffelGroundStationId } from './eiffelGroundStations';
import { EIFFEL_GROUND_STATION_ERECTION_READY, sampleEiffelGroundStationErection } from './eiffelGroundStationErection';

export type EiffelGroundPlantRetirement = Readonly<Record<EiffelGroundStationId, number>>;
export const EIFFEL_GROUND_PLANT_PRESENT: EiffelGroundPlantRetirement = { ne: 0, nw: 0, sw: 0, se: 0 };
export const EIFFEL_GROUND_PLANT_RETIRE_START = 66;
export const EIFFEL_GROUND_PLANT_RETIRE_DURATION = 12;
export const EIFFEL_GROUND_PLANT_RETIRE_END = 90;

/** First-floor bearing deck must be complete before any station is struck. */
export function sampleEiffelGroundPlantRetirement(seconds: number): EiffelGroundPlantRetirement {
  if (!Number.isFinite(seconds)) throw new Error('Plant retirement time must be finite');
  return Object.fromEntries(EIFFEL_GROUND_STATIONS.map((station, i) => [station.id,
    Math.max(0, Math.min(1, (seconds - EIFFEL_GROUND_PLANT_RETIRE_START - i * 4) / EIFFEL_GROUND_PLANT_RETIRE_DURATION)),
  ])) as Record<EiffelGroundStationId, number>;
}

/** Reverse the supported erection order: crane first, then full-size timbers
 * highest contact first. No structural geometry changes size or position. */
export function sampleEiffelRetiringStation(progress: number) {
  if (progress <= 0) return EIFFEL_GROUND_STATION_ERECTION_READY;
  return sampleEiffelGroundStationErection(9 * (1 - Math.min(1, progress)));
}
