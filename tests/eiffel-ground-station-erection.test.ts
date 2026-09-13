import { describe, expect, it } from 'vitest';
import {
  EIFFEL_GROUND_STATION_CRANE_ROLES,
  EIFFEL_GROUND_STATION_ERECTION_READY,
  EIFFEL_GROUND_STATION_SUPPORT_MEMBERS,
  EIFFEL_STATION_CRANE_END_SECONDS,
  EIFFEL_STATION_CRANE_START_SECONDS,
  EIFFEL_STATION_ERECTION_END_SECONDS,
  sampleEiffelGroundStationErection,
} from '../src/engine/eiffelGroundStationErection';
import { sampleEiffelFilmEdit } from '../src/engine/eiffelFilmEdit';
import { eiffelTerrainHeightAt } from '../src/engine/eiffelTerrain';

describe('four ground stations built from empty pads', () => {
  it('starts with no plant and only seats full-size members that already touch the ground', () => {
    expect(sampleEiffelGroundStationErection(0)).toEqual({
      seatedSupportCount: 0,
      supportCount: EIFFEL_GROUND_STATION_SUPPORT_MEMBERS.length,
      seatedSupportIds: [],
      craneRoles: [],
      authoredFalsework: false,
      operational: false,
    });
    expect(EIFFEL_GROUND_STATION_SUPPORT_MEMBERS[0]!.minY).toBe(0);
    expect(EIFFEL_GROUND_STATION_SUPPORT_MEMBERS.every((member, index) => index === 0 || member.minY + 1e-12 >= EIFFEL_GROUND_STATION_SUPPORT_MEMBERS[index - 1]!.minY)).toBe(true);
    const foot = EIFFEL_GROUND_STATION_SUPPORT_MEMBERS.find(member => member.minY === 0)!;
    expect(eiffelTerrainHeightAt(foot.center[0], foot.center[2])).toBeCloseTo(0, 10);
    expect(foot.center[1] - foot.axes.reduce((sum, axis, i) => sum + Math.abs(axis[1]!) * foot.half[i]!, 0)).toBeCloseTo(0, 6);
  });

  it('keeps seated identities monotone through forward play and reverse seeks', () => {
    let previous = sampleEiffelGroundStationErection(0);
    for (let i = 1; i <= 180; i++) {
      const next = sampleEiffelGroundStationErection(i / 20);
      expect(next.seatedSupportCount).toBeGreaterThanOrEqual(previous.seatedSupportCount);
      expect(next.seatedSupportIds.slice(0, previous.seatedSupportCount)).toEqual(previous.seatedSupportIds);
      const previousMachine=previous.craneRoles.filter(role=>role!=='guides');
      const nextMachine=next.craneRoles.filter(role=>role!=='guides');
      expect(nextMachine.slice(0, previousMachine.length)).toEqual(previousMachine);
      if (previous.authoredFalsework) expect(next.authoredFalsework).toBe(true);
      if (previous.operational) expect(next.operational).toBe(true);
      previous = next;
    }
    expect(sampleEiffelGroundStationErection(EIFFEL_STATION_CRANE_START_SECONDS - 1e-6).craneRoles).toEqual([]);
    expect(sampleEiffelGroundStationErection(EIFFEL_STATION_CRANE_END_SECONDS).craneRoles).toEqual([...EIFFEL_GROUND_STATION_CRANE_ROLES, 'guides']);
    expect(sampleEiffelGroundStationErection(EIFFEL_STATION_ERECTION_END_SECONDS)).toBe(EIFFEL_GROUND_STATION_ERECTION_READY);
    const mid = sampleEiffelGroundStationErection(4);
    sampleEiffelGroundStationErection(9);
    sampleEiffelGroundStationErection(0);
    expect(sampleEiffelGroundStationErection(4)).toEqual(mid);
  });

  it('does not hand the cinematic film a finished station before the approach', () => {
    expect(sampleEiffelFilmEdit('cinematic', 0).stationErection.seatedSupportCount).toBe(0);
    expect(sampleEiffelFilmEdit('cinematic', 0).stationErection.operational).toBe(false);
    expect(sampleEiffelFilmEdit('cinematic', 4 / 180).stationErection.seatedSupportCount).toBeGreaterThan(0);
    expect(sampleEiffelFilmEdit('cinematic', 4 / 180).stationErection.operational).toBe(false);
    expect(sampleEiffelFilmEdit('cinematic', 9 / 180).stationErection).toBe(EIFFEL_GROUND_STATION_ERECTION_READY);
    expect(sampleEiffelFilmEdit('detailed', 0).stationErection).toBe(EIFFEL_GROUND_STATION_ERECTION_READY);
  });
});
