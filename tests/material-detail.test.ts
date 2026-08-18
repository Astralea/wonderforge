import { describe, expect, it } from 'vitest';
import {
  MATERIAL_DETAIL_RECIPES,
  materialDetailFor,
  type MaterialDetailRole,
} from '../src/data/materialDetail';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import type { Wonder } from '../src/data/types';

const fixtureWonder: Wonder = {
  id: 'detail-fixture',
  name: 'Fixture',
  location: 'Nowhere',
  region: 'Testland',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: 'q', author: 'a' },
  description: 'd',
  facts: ['a', 'b', 'c'],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

describe('material detail recipes', () => {
  it('declares unique, well-formed recipes', () => {
    const roles = MATERIAL_DETAIL_RECIPES.map((recipe) => recipe.role);
    expect(new Set(roles).size).toBe(roles.length);
    expect(roles.length).toBeGreaterThanOrEqual(12);
    for (const recipe of MATERIAL_DETAIL_RECIPES) {
      expect(recipe.description.length).toBeGreaterThanOrEqual(24);
      expect(recipe.grain || recipe.banding || recipe.mottle || recipe.ripple).toBeTruthy();
      for (const term of [recipe.grain, recipe.banding, recipe.mottle]) {
        if (!term) continue;
        expect(term.scale).toBeGreaterThan(0);
        expect(term.amplitude).toBeGreaterThan(0);
        expect(term.amplitude).toBeLessThanOrEqual(0.1);
      }
      if (recipe.grain?.anisotropy !== undefined) {
        expect(recipe.grain.anisotropy).toBeGreaterThan(0);
        expect(recipe.grain.anisotropy).toBeLessThanOrEqual(1);
      }
    }
  });

  it('restricts the animated ripple to the Nile water role', () => {
    for (const recipe of MATERIAL_DETAIL_RECIPES) {
      expect(recipe.ripple !== undefined).toBe(recipe.role === 'water');
    }
    const water = materialDetailFor('water');
    expect(water.ripple?.roughness).toBeGreaterThan(0);
    expect(water.ripple?.speed).toBeGreaterThan(0);
  });

  it('samples carried materials in object space and placed surfaces in world space', () => {
    const objectRoles: MaterialDetailRole[] = [
      'core-limestone',
      'casing-limestone',
      'granite',
      'wood',
      'linen',
      'foliage',
    ];
    const worldRoles: MaterialDetailRole[] = [
      'sand',
      'compacted-earth',
      'quarry-cut',
      'water',
      'whitewash',
      'mud-brick',
      'city-roof',
      'city-accent',
      'farmland',
    ];
    for (const role of objectRoles) expect(materialDetailFor(role).space).toBe('object');
    for (const role of worldRoles) expect(materialDetailFor(role).space).toBe('world');
  });

  it('rejects unknown roles', () => {
    expect(() => materialDetailFor('marble' as MaterialDetailRole)).toThrow(/Unknown/);
  });
});

describe('material detail wiring', () => {
  it('injects onBeforeCompile and unique cache keys into every recipe target', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const targets = [
      library.block['core-limestone'],
      library.block['casing-limestone'],
      library.block.granite,
      library.sand,
      library.compactedEarth,
      library.quarryCut,
      library.wood,
      library.water,
      library.whitewash,
      library.city,
      library.cityRoof,
      library.cityAccent,
      library.linen,
      library.foliage,
      library.farmland,
    ];
    const keys = new Set<string>();
    for (const material of targets) {
      const key = material.customProgramCacheKey();
      expect(key).toMatch(/^wf-detail:/);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    expect(keys.size).toBe(MATERIAL_DETAIL_RECIPES.length);
  });

  it('leaves non-recipe materials and the disposal list untouched', () => {
    const library = createMaterialLibrary(fixtureWonder);
    expect(library.horizon.customProgramCacheKey()).not.toMatch(/^wf-detail:/);
    expect(library.rope.customProgramCacheKey()).not.toMatch(/^wf-detail:/);
    expect(library.skin.customProgramCacheKey()).not.toMatch(/^wf-detail:/);
    expect(library.legacy.primary.customProgramCacheKey()).not.toMatch(/^wf-detail:/);
    expect(library.legacy.accent.customProgramCacheKey()).not.toMatch(/^wf-detail:/);
    expect(library.all.length).toBe(new Set(library.all).size);
  });

  it('keeps legacy shared materials consistent with the reference scene', () => {
    const library = createMaterialLibrary(fixtureWonder);
    // Legacy wonders reuse sand/foliage/water/casing, so the same injected
    // instances must back both records.
    expect(library.legacy.ground).toBe(library.sand);
    expect(library.legacy.water).toBe(library.water);
    expect(library.legacy.casing).toBe(library.block['casing-limestone']);
  });
});
