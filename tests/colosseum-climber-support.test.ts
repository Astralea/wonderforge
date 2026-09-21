import { describe, expect, it } from 'vitest';
import { colosseumLabourAt, type ColosseumCrewPose } from '../src/engine/colosseumCrew';
import { colosseumScaffoldsAt } from '../src/engine/colosseumConstruction';
import { colosseumTerrainHeightAt } from '../src/engine/colosseumTerrain';

const scaffoldCrews = (t: number) => colosseumLabourAt([], t).crews.filter(crew => /^(climb|base|deck)-/.test(crew.id));
const stationOf = (crew: ColosseumCrewPose) => Number(crew.id.split('-').at(-1));
const crewAt = (t: number, station: number) => scaffoldCrews(t).find(crew => stationOf(crew) === station)!;

describe('Colosseum final scaffold climber support', () => {
  it('keeps the moon-low-shot workers below their own actual retained timber', () => {
    const bays = colosseumScaffoldsAt(0.93);
    const crews = scaffoldCrews(0.93);
    expect(crews.map(crew => crew.id)).toEqual(['climb-0', 'base-1', 'climb-3', 'base-17']);
    for (const crew of crews) {
      const bay = bays.find(value => value.station === stationOf(crew))!;
      expect(crew.position[1], crew.id).toBeLessThanOrEqual(bay.deckY);
      expect(crew.position[1]).toBeGreaterThanOrEqual(bay.footY);
    }
  });

  it('retains station identity when earlier bays have already been removed', () => {
    const bays = colosseumScaffoldsAt(0.979);
    expect(bays[0].station).not.toBe(0);
    expect(bays.find(bay => bay.station === 0)).toBeUndefined();
    for (const station of [0, 3]) {
      const before = crewAt(0.93, station), after = crewAt(0.979, station);
      expect(after.position[0]).toBe(before.position[0]);
      expect(after.position[2]).toBe(before.position[2]);
      expect(after.position[1]).toBeCloseTo(colosseumTerrainHeightAt(after.position[0], after.position[2]), 10);
    }
  });

  it('joins pre-strike descent to the final strike without upward jumps or ground handoff drops', () => {
    for (const station of [0, 1, 3, 17]) {
      const before = crewAt(0.9 - 1e-8, station), after = crewAt(0.9 + 1e-8, station);
      expect(Math.abs(after.position[1] - before.position[1]), `station${station}`).toBeLessThan(0.001);
      if (station === 1 || station === 17) expect(before.position[1]).toBeLessThan(0.001);
    }
  });

  it('descends continuously while each station strikes discrete fixed-length lifts', () => {
    for (const station of [0, 3]) {
      let previous = crewAt(0.9, station);
      let previousHeight = colosseumScaffoldsAt(0.9).find(bay => bay.station === station)!.height;
      for (let frame = 1; frame < 288; frame++) {
        const t = 0.9 + frame / 3600;
        const crew = crewAt(t, station);
        const bay = colosseumScaffoldsAt(t).find(value => value.station === station);
        const height = bay?.height ?? 0;
        expect(crew.position[1]).toBeLessThanOrEqual((bay?.deckY ?? 0) + 1e-10);
        expect(crew.position[1]).toBeLessThanOrEqual(previous.position[1] + 1e-10);
        expect(previous.position[1] - crew.position[1]).toBeLessThan(0.2);
        if (height !== previousHeight) {
          // Find the actual construction sampler's removal boundary. Foot
          // motion must remain continuous across it, not snap down one lift.
          let a = t - 1 / 3600, b = t;
          for (let i = 0; i < 26; i++) {
            const middle = (a + b) / 2;
            const h = colosseumScaffoldsAt(middle).find(value => value.station === station)?.height ?? 0;
            if (h === previousHeight) a = middle;
            else b = middle;
          }
          const below = crewAt(a - 1e-9, station), above = crewAt(b + 1e-9, station);
          expect(Math.abs(above.position[1] - below.position[1])).toBeLessThan(0.001);
        }
        previous = crew;
        previousHeight = height;
      }
      expect(crewAt(0.98 - 1e-8, station).position[1]).toBe(0);
    }
  });

  it('preserves worker roles, count, animated gait and reverse-seek determinism', () => {
    const samples = [0.12, 0.22, 0.88, 0.9, 0.93, 0.97, 0.979];
    const forward = samples.map(scaffoldCrews);
    for (let i = samples.length - 1; i >= 0; i--) expect(scaffoldCrews(samples[i])).toEqual(forward[i]);
    for (const t of [0.9, 0.93, 0.979]) {
      const crews = scaffoldCrews(t);
      expect(crews).toHaveLength(4);
      expect(crews.every(crew => crew.role === 'climber')).toBe(true);
    }
    expect(Math.abs(crewAt(0.93, 0).gait - crewAt(0.94, 0).gait)).toBeGreaterThan(0.1);
    expect(scaffoldCrews(0.98)).toHaveLength(0);
  });
});
