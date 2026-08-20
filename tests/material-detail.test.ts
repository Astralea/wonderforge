import { describe, expect, it } from 'vitest';
import {
  MATERIAL_DETAIL_RECIPES,
  materialDetailFor,
  type MaterialDetailRole,
} from '../src/data/materialDetail';
import { createMaterialLibrary } from '../src/render/three/MaterialLibrary';
import {
  applyClothSway,
  updateClothSwayTime,
  updateMaterialDetailTime,
  type ClothSwayKind,
} from '../src/render/three/proceduralDetail';
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
      if (recipe.normalRipple) {
        expect(recipe.ripple).toBeDefined();
        expect(recipe.normalRipple.strength).toBeGreaterThan(0);
        expect(recipe.normalRipple.strength).toBeLessThanOrEqual(1);
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
    expect(water.normalRipple?.strength).toBeGreaterThan(0);
    for (const recipe of MATERIAL_DETAIL_RECIPES) {
      expect(recipe.normalRipple !== undefined).toBe(recipe.role === 'water');
    }
  });

  it('restricts the chop octave and analytic sky reflection to the water role', () => {
    for (const recipe of MATERIAL_DETAIL_RECIPES) {
      expect(recipe.skyReflection !== undefined).toBe(recipe.role === 'water');
      expect(recipe.chop !== undefined).toBe(recipe.role === 'water');
      // Chop is a second octave of the swell, never a standalone term.
      if (recipe.chop) expect(recipe.ripple).toBeDefined();
    }
    const water = materialDetailFor('water');
    // The chop is finer and faster than the broad swell, and the reflection
    // stays subtle enough to keep the authored ripple read.
    expect(water.chop!.scale).toBeGreaterThan(water.ripple!.scale);
    expect(water.chop!.amplitude).toBeLessThan(water.ripple!.amplitude);
    expect(water.skyReflection!.strength).toBeGreaterThan(0);
    expect(water.skyReflection!.strength).toBeLessThanOrEqual(1);
  });

  it('restricts normal relief to stone roles with a grain term to key the footprint fade', () => {
    const stoneRoles: MaterialDetailRole[] = [
      'core-limestone',
      'casing-limestone',
      'granite',
      'quarry-cut',
    ];
    for (const recipe of MATERIAL_DETAIL_RECIPES) {
      const isStone = stoneRoles.includes(recipe.role);
      expect(recipe.normalBump !== undefined).toBe(isStone);
      if (!recipe.normalBump) continue;
      // The pixel-footprint fade derives noise-cell size from the grain scale.
      expect(recipe.grain).toBeDefined();
      expect(recipe.normalBump.strength).toBeGreaterThan(0);
      expect(recipe.normalBump.strength).toBeLessThanOrEqual(0.5);
    }
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

  it('uses a dielectric low-roughness water base for sun glints', () => {
    const { water } = createMaterialLibrary(fixtureWonder);
    expect(water.roughness).toBeGreaterThanOrEqual(0.12);
    expect(water.roughness).toBeLessThanOrEqual(0.18);
    expect(water.metalness).toBe(0);
  });

  it('injects a deterministic ripple-gradient normal into every water variant', () => {
    const library = createMaterialLibrary(fixtureWonder);
    type TestShader = {
      uniforms: Record<string, { value: unknown }>;
      vertexShader: string;
      fragmentShader: string;
    };
    const compile = library.water.onBeforeCompile as unknown as (shader: TestShader) => void;
    const shaders: TestShader[] = Array.from({ length: 2 }, () => ({
      uniforms: {},
      vertexShader: '#include <project_vertex>',
      fragmentShader: [
        '#include <color_fragment>',
        '#include <roughnessmap_fragment>',
        '#include <normal_fragment_maps>',
      ].join('\n'),
    }));

    for (const shader of shaders) compile(shader);

    const variants = library.water.userData.wfDetailShaders as TestShader[];
    expect(Array.isArray(variants)).toBe(true);
    expect(variants).toEqual(shaders);
    for (const shader of shaders) {
      expect(shader.fragmentShader).toContain('wfFbm(wfRp + vec2(wfNormalStep, 0.0))');
      expect(shader.fragmentShader).toContain('wfFbm(wfRp + vec2(0.0, wfNormalStep))');
      expect(shader.fragmentShader).toContain('mat3(viewMatrix) * wfRippleSlopeWorld');
      expect(shader.fragmentShader.indexOf('#include <normal_fragment_maps>'))
        .toBeLessThan(shader.fragmentShader.indexOf('wfRippleGradient'));
    }

    updateMaterialDetailTime(library, 0.625);
    for (const shader of shaders) expect(shader.uniforms['uWfTime']!.value).toBe(0.625);
  });

  it('injects derivative-based stone relief with a pixel-footprint fade after the normal chunk', () => {
    const library = createMaterialLibrary(fixtureWonder);
    type TestShader = {
      uniforms: Record<string, { value: unknown }>;
      vertexShader: string;
      fragmentShader: string;
    };
    const blank = (): TestShader => ({
      uniforms: {},
      vertexShader: '#include <project_vertex>',
      fragmentShader: [
        '#include <color_fragment>',
        '#include <roughnessmap_fragment>',
        '#include <normal_fragment_maps>',
      ].join('\n'),
    });

    const stone = blank();
    const compileStone = library.block['core-limestone']
      .onBeforeCompile as unknown as (shader: TestShader) => void;
    compileStone(stone);
    // The perturbation rides the recipe's own height field — no texture
    // fetches, no extra noise samples — and retires before pixel-size cells.
    expect(stone.fragmentShader).toContain('dFdx(wfDetail)');
    expect(stone.fragmentShader).toContain('wfReliefFade');
    expect(stone.fragmentShader).toContain('fwidth(vWfDetailPos.x');
    expect(stone.fragmentShader).toContain('gl_FrontFacing');
    expect(stone.fragmentShader.indexOf('#include <normal_fragment_maps>'))
      .toBeLessThan(stone.fragmentShader.indexOf('wfDhdxy'));
    // The detail field must exist before the normal perturbation reads it.
    expect(stone.fragmentShader.indexOf('float wfDetail'))
      .toBeLessThan(stone.fragmentShader.indexOf('dFdx(wfDetail)'));

    // Non-stone roles (e.g. timber) get no relief terms.
    const wood = blank();
    const compileWood = library.wood.onBeforeCompile as unknown as (shader: TestShader) => void;
    compileWood(wood);
    expect(wood.fragmentShader).not.toContain('wfDhdxy');
    expect(wood.fragmentShader).not.toContain('wfReliefFade');
  });
});

describe('cloth sway (Spec 06 §Materials and color)', () => {
  type TestShader = {
    uniforms: Record<string, { value: unknown }>;
    vertexShader: string;
    fragmentShader: string;
  };
  const blank = (): TestShader => ({
    uniforms: {},
    vertexShader: ['#include <begin_vertex>', '#include <project_vertex>'].join('\n'),
    fragmentShader: [
      '#include <color_fragment>',
      '#include <roughnessmap_fragment>',
      '#include <normal_fragment_maps>',
    ].join('\n'),
  });
  const kinds: ClothSwayKind[] = ['sail', 'tent', 'awning'];

  it('injects playback-phased vertex displacement into dedicated linen clones', () => {
    const library = createMaterialLibrary(fixtureWonder);
    for (const kind of kinds) {
      const clone = library.linen.clone();
      applyClothSway(clone, kind);
      const shader = blank();
      (clone.onBeforeCompile as unknown as (s: TestShader) => void)(shader);
      // Displacement happens in object space before instancing/projection.
      expect(shader.vertexShader).toContain('uniform float uWfClothTime');
      expect(shader.vertexShader.indexOf('#include <begin_vertex>'))
        .toBeLessThan(shader.vertexShader.indexOf('wfClothPhase'));
      // The linen weave recipe rides along on the clone.
      expect(shader.fragmentShader).toContain('vWfDetailPos');
      // Program variants never collide with the still shared linen.
      expect(clone.customProgramCacheKey()).toBe(`wf-cloth:${kind}`);
      expect(clone.customProgramCacheKey()).not.toBe(library.linen.customProgramCacheKey());
    }
  });

  it('leaves the shared linen of worker clothing still', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const shader = blank();
    (library.linen.onBeforeCompile as unknown as (s: TestShader) => void)(shader);
    expect(shader.vertexShader).not.toContain('uWfClothTime');
    expect(shader.vertexShader).not.toContain('wfClothPhase');
  });

  it('advances sway time on every compiled variant, phased from playback t', () => {
    const library = createMaterialLibrary(fixtureWonder);
    const clone = library.linen.clone();
    applyClothSway(clone, 'awning');
    const variants = [blank(), blank()];
    for (const shader of variants) {
      (clone.onBeforeCompile as unknown as (s: TestShader) => void)(shader);
    }
    updateClothSwayTime([clone], 0.5);
    for (const shader of variants) expect(shader.uniforms['uWfClothTime']!.value).toBe(0.5);
    updateClothSwayTime([clone], 0.75);
    for (const shader of variants) expect(shader.uniforms['uWfClothTime']!.value).toBe(0.75);
  });
});
