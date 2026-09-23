import { describe, expect, it } from 'vitest';
import { WONDERS, catalogInProgress, catalogReady, isReadyWonder } from '../src/data';
import { expandRecipe } from '../src/engine/geometry';

const HEX = /^#[0-9a-f]{6}$/i;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('wonder catalog', () => {
  it('contains exactly 10 wonders', () => {
    expect(WONDERS).toHaveLength(10);
  });

  it('publishes five Ready films in chronological order and lists the rest as in progress', () => {
    expect(catalogReady().map((w) => w.id)).toEqual([
      'pyramids-of-giza',
      'stonehenge',
      'colosseum',
      'eiffel-tower',
      'sydney-opera-house',
    ]);
    expect(catalogInProgress().map((w) => w.id)).toEqual([
      'petra',
      'chichen-itza',
      'angkor-wat',
      'forbidden-city',
      'machu-picchu',
    ]);
    expect(isReadyWonder('colosseum')).toBe(true);
    expect(isReadyWonder('petra')).toBe(false);
  });

  it('has unique, kebab-case, stable ids', () => {
    const ids = WONDERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(KEBAB);
  });

  it('spans at least 4 regions and 5 eras', () => {
    expect(new Set(WONDERS.map((w) => w.region)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(WONDERS.map((w) => w.era)).size).toBeGreaterThanOrEqual(5);
  });

  it('every wonder has complete content: quote, facts, and a description when shown', () => {
    const readyIds = new Set(catalogReady().map((w) => w.id));
    for (const w of WONDERS) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.location.length).toBeGreaterThan(0);
      expect(w.quote.text.length).toBeGreaterThan(10);
      expect(w.quote.author.length).toBeGreaterThan(0);
      if (readyIds.has(w.id)) expect(w.description).toBe('');
      else expect(w.description.length).toBeGreaterThan(20);
      expect(w.facts.length).toBeGreaterThanOrEqual(3);
      for (const f of w.facts) expect(f.length).toBeGreaterThan(10);
    }
  });

  it('BC wonders use negative years', () => {
    const byId = new Map(WONDERS.map((w) => [w.id, w]));
    expect(byId.get('pyramids-of-giza')!.completedYear).toBeLessThan(0);
    expect(byId.get('stonehenge')!.completedYear).toBeLessThan(0);
    expect(byId.get('petra')!.completedYear).toBeLessThan(0);
    expect(byId.get('eiffel-tower')!.completedYear).toBe(1889);
    expect(byId.get('sydney-opera-house')!.completedYear).toBe(1973);
  });

  it('palettes are valid hex colors', () => {
    for (const w of WONDERS) {
      expect(w.palette.ground).toMatch(HEX);
      expect(w.palette.primary).toMatch(HEX);
      expect(w.palette.accent).toMatch(HEX);
      expect(w.palette.sky).toMatch(HEX);
    }
  });

  it('exactly the lit wonders end at night', () => {
    const night = WONDERS.filter((w) => w.endsAtNight)
      .map((w) => w.id)
      .sort();
    expect(night).toEqual(
      ['colosseum', 'eiffel-tower', 'sydney-opera-house'].sort(),
    );
  });

  it('every structure has stages with parts, within the detail budget', () => {
    for (const w of WONDERS) {
      expect(w.structure.stages.length).toBeGreaterThanOrEqual(1);
      for (const stage of w.structure.stages) {
        expect(stage.parts.length).toBeGreaterThanOrEqual(1);
      }
      const count = expandRecipe(w).length;
      expect(count).toBeGreaterThanOrEqual(20);
      expect(count).toBeLessThanOrEqual(500);
    }
  });

  it('recipe expansion is deterministic for every wonder', () => {
    for (const w of WONDERS) {
      expect(expandRecipe(w)).toEqual(expandRecipe(w));
    }
  });
});
