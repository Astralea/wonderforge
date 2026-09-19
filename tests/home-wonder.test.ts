import { describe, expect, it } from 'vitest';
import { catalogReady } from '../src/data';
import { HOME_WONDER_ID, homeWonderId } from '../src/data/homeWonder';

const READY = catalogReady().map((wonder) => wonder.id);

describe('homepage ambient wonder (Spec 05)', () => {
  it('defaults to the Pyramids of Giza and never stages Colosseum', () => {
    expect(READY).toEqual([
      'pyramids-of-giza',
      'stonehenge',
      'colosseum',
      'eiffel-tower',
    ]);
    expect(HOME_WONDER_ID).toBe('pyramids-of-giza');
    expect(homeWonderId(READY)).toBe('pyramids-of-giza');
    expect(homeWonderId(READY)).not.toBe('colosseum');
    expect(homeWonderId(READY)).not.toBe('stonehenge');
    expect(homeWonderId(READY)).not.toBe('eiffel-tower');
  });

  it('does not pick unpublished catalog entries', () => {
    expect(homeWonderId(READY)).not.toBe('sydney-opera-house');
    expect(homeWonderId(READY)).not.toBe('petra');
  });
});
