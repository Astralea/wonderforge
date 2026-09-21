import { describe, expect, it } from 'vitest';
import { COLOSSEUM_CONSTRUCTION } from '../src/data/colosseumConstruction';
import { sampleColosseumSky } from '../src/data/colosseumSky';
import { celestialClockAt } from '../src/engine/colosseumCelestialClock';
import { colosseumFilmAt, COLOSSEUM_WORK_END } from '../src/engine/colosseumFilm';
import {
  activeColosseumOperationsAt, colosseumCenteringAt, colosseumPartStateAt,
  colosseumScaffoldsAt, seatedColosseumCountAt,
} from '../src/engine/colosseumConstruction';
import { colosseumLabourAt } from '../src/engine/colosseumCrew';

function crossing(body: 'sun' | 'moon', rising: boolean) {
  let a = COLOSSEUM_WORK_END, b = 1;
  for (let i = 0; i < 40; i++) {
    const t = (a + b) / 2;
    if ((sampleColosseumSky(t).astronomy[body].elevationDegrees < 0) === rising) a = t;
    else b = t;
  }
  return (a + b) / 2;
}

describe('Colosseum daylight construction and quiet moonrise', () => {
  it('finishes the physical work before the real sunset, then shows a later moonrise', () => {
    const sunset = crossing('sun', false), moonrise = crossing('moon', true);
    expect(COLOSSEUM_WORK_END).toBe(.8);
    expect(sampleColosseumSky(COLOSSEUM_WORK_END).astronomy.sun.horizonVisibility).toBe(1);
    expect(sampleColosseumSky(COLOSSEUM_WORK_END).astronomy.sun.elevationDegrees).toBeGreaterThan(1);
    expect(sunset).toBeGreaterThan(COLOSSEUM_WORK_END);
    expect(moonrise).toBeGreaterThan(sunset);
    const separationMinutes = (celestialClockAt(moonrise).hoursUt1 - celestialClockAt(sunset).hoursUt1) * 60;
    expect(separationMinutes).toBeGreaterThan(22);
    expect(separationMinutes).toBeLessThan(23);
    expect(colosseumFilmAt(sunset).chapter).toBe('evening');
    expect(colosseumFilmAt(moonrise).constructionT).toBe(1);
  });

  it('keeps every stone seated and removes all work systems throughout the evening', () => {
    const route = COLOSSEUM_CONSTRUCTION.routes[0];
    for (const t of [.8, .84, .88, .94, 1]) {
      const { constructionT } = colosseumFilmAt(t);
      const operations = activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, constructionT);
      expect(operations).toHaveLength(0);
      expect(colosseumScaffoldsAt(constructionT)).toHaveLength(0);
      expect(colosseumCenteringAt(constructionT)).toHaveLength(0);
      expect(colosseumLabourAt(operations, constructionT).crews).toHaveLength(0);
      expect(seatedColosseumCountAt(COLOSSEUM_CONSTRUCTION, constructionT)).toBe(COLOSSEUM_CONSTRUCTION.parts.length);
      for (const part of COLOSSEUM_CONSTRUCTION.parts) {
        const state = colosseumPartStateAt(part, route, constructionT);
        expect(state.phase).toBe('seated');
        expect(state.position).toEqual(part.finalPosition);
        expect(state.rotation).toEqual(part.finalRotation);
        expect(state.scale).toEqual([1, 1, 1]);
      }
    }
  });

  it('keeps the sky advancing over finished masonry and restores active work on reverse seek', () => {
    const active = colosseumFilmAt(.4);
    const operations = activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, active.constructionT);
    expect(operations.length).toBeGreaterThan(0);
    expect(active.chapter).toBe('construction');
    const completed = colosseumFilmAt(.8), later = colosseumFilmAt(1);
    expect(completed.constructionT).toBe(later.constructionT);
    expect(celestialClockAt(1).julianDayUt1).toBeGreaterThan(celestialClockAt(.8).julianDayUt1);
    expect(sampleColosseumSky(1).astronomy.moon.elevationDegrees).toBeGreaterThan(sampleColosseumSky(.88).astronomy.moon.elevationDegrees);
    colosseumLabourAt([], later.constructionT);
    expect(activeColosseumOperationsAt(COLOSSEUM_CONSTRUCTION, colosseumFilmAt(.4).constructionT)).toEqual(operations);
    expect(colosseumFilmAt(-1).constructionT).toBe(0);
    expect(colosseumFilmAt(2).constructionT).toBe(1);
  });
});
