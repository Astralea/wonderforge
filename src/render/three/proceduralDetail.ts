// Injects the typed recipes from src/data/materialDetail.ts into the shared
// MeshStandardMaterial kit via onBeforeCompile (Spec 06). Pure GLSL value
// noise: no textures, no extra draw calls, no runtime randomness. The only
// animated term is the Nile ripple, phased from playback t.
//
// Every injected material sets a unique customProgramCacheKey so program
// variants never collide, per the kept threejs-aaa-graphics-builder cookbook.

import type { MeshStandardMaterial } from 'three';
import {
  MATERIAL_DETAIL_RECIPES,
  type MaterialDetailRecipe,
  type MaterialDetailRole,
} from '../../data/materialDetail';
import type { MaterialLibrary } from './MaterialLibrary';

type ShaderUniforms = Record<string, { value: unknown }>;

type ShaderLike = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: ShaderUniforms;
};

/** GLSL literals need a decimal point. */
function f(value: number): string {
  const text = String(value);
  return text.includes('.') || text.includes('e') ? text : `${text}.0`;
}

const NOISE_GLSL = `
float wfHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float wfNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wfHash(i), wfHash(i + vec2(1.0, 0.0)), f.x),
             mix(wfHash(i + vec2(0.0, 1.0)), wfHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float wfFbm(vec2 p) {
  return wfNoise(p) * 0.65 + wfNoise(p * 2.13 + 7.3) * 0.35;
}
`;

function vertexPositionSnippet(recipe: MaterialDetailRecipe): string {
  if (recipe.space === 'object') {
    return '\n  vWfDetailPos = position;\n';
  }
  return `
  vec4 wfWorldPos = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wfWorldPos = instanceMatrix * wfWorldPos;
  #endif
  vWfDetailPos = (modelMatrix * wfWorldPos).xyz;
`;
}

function grainSnippet(recipe: MaterialDetailRecipe): string {
  const grain = recipe.grain;
  if (!grain) return '';
  const aniso = f(grain.anisotropy ?? 1);
  const sample = recipe.plane === 'xz'
    ? `wfFbm(vec2(wfP.x * ${f(grain.scale)}, wfP.z * ${f(grain.scale)}))`
    : `wfFbm(vec2((wfP.x + wfP.z * 0.35) * ${f(grain.scale)}, wfP.y * ${f(grain.scale)} * ${aniso}))`;
  const swing = recipe.roughnessSwing
    ? `\n  wfRough += (wfGrain - 0.5) * ${f(recipe.roughnessSwing * 2)};`
    : '';
  return `
  float wfGrain = ${sample};
  wfDetail += (wfGrain - 0.5) * ${f(grain.amplitude * 2)};${swing}
`;
}

function bandingSnippet(recipe: MaterialDetailRecipe): string {
  const banding = recipe.banding;
  if (!banding) return '';
  return `
  wfDetail += sin((wfP.y * ${f(banding.scale)} + wfNoise(wfP.xz * 0.8) * 0.6) * 6.28318) * ${f(banding.amplitude)};
`;
}

function mottleSnippet(recipe: MaterialDetailRecipe): string {
  const mottle = recipe.mottle;
  if (!mottle) return '';
  return `
  wfDetail += (wfFbm(wfP.xz * ${f(mottle.scale)}) - 0.5) * ${f(mottle.amplitude * 2)};
`;
}

function rippleSnippet(recipe: MaterialDetailRecipe): string {
  const ripple = recipe.ripple;
  if (!ripple) return '';
  return `
  wfRp = vec2(wfP.x * ${f(ripple.scale)} + uWfTime * ${f(ripple.speed)},
              wfP.z * ${f(ripple.scale * 0.55)} - uWfTime * ${f(ripple.speed * 0.3)});
  wfRip = wfFbm(wfRp) - 0.5;
  wfDetail += wfRip * ${f(ripple.amplitude * 2)};
  wfRough += wfRip * ${f(ripple.roughness)};
`;
}

function normalRippleSnippet(recipe: MaterialDetailRecipe): string {
  const ripple = recipe.ripple;
  const normalRipple = recipe.normalRipple;
  if (!ripple || !normalRipple) return '#include <normal_fragment_maps>';
  const step = 0.08;
  return `#include <normal_fragment_maps>
// The visible water surfaces are flat, upward-facing world-XZ ribbons. Their
// ripple-field gradient is therefore a cheap tangent-space slope; transform
// that world-space slope to view space before perturbing three.js's normal.
const float wfNormalStep = ${f(step)};
float wfRippleBase = wfRip + 0.5;
vec2 wfRippleGradient = vec2(
  (wfFbm(wfRp + vec2(wfNormalStep, 0.0)) - wfRippleBase) / wfNormalStep * ${f(ripple.scale)},
  (wfFbm(wfRp + vec2(0.0, wfNormalStep)) - wfRippleBase) / wfNormalStep * ${f(ripple.scale * 0.55)}
);
vec3 wfRippleSlopeWorld = vec3(-wfRippleGradient.x, 0.0, -wfRippleGradient.y) * ${f(normalRipple.strength)};
normal = normalize(normal + mat3(viewMatrix) * wfRippleSlopeWorld);`;
}

function detailBlock(recipe: MaterialDetailRecipe): string {
  return `#include <color_fragment>
float wfDetail = 0.0;
float wfRough = 0.0;
${recipe.ripple ? 'vec2 wfRp;\nfloat wfRip;' : ''}
{
  vec3 wfP = vWfDetailPos;${grainSnippet(recipe)}${bandingSnippet(recipe)}${mottleSnippet(recipe)}${rippleSnippet(recipe)}
}
diffuseColor.rgb *= 1.0 + wfDetail;
`;
}

function injectRecipe(material: MeshStandardMaterial, recipe: MaterialDetailRecipe): void {
  const cacheKey = `wf-detail:${recipe.role}`;
  material.onBeforeCompile = (shader) => {
    const target = shader as unknown as ShaderLike;

    if (recipe.ripple) {
      target.uniforms.uWfTime = { value: 0 };
      // onBeforeCompile runs once per program VARIANT (the water material
      // compiles both instanced and non-instanced programs). Keep every
      // variant's shader handle: holding only the last one froze the ripple
      // on the instanced irrigation channels at phase 0.
      const shaders = (material.userData.wfDetailShaders ??= []) as ShaderLike[];
      shaders.push(target);
    }

    target.vertexShader = `varying vec3 vWfDetailPos;\n${target.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>${vertexPositionSnippet(recipe)}`,
    );

    const timeUniform = recipe.ripple ? 'uniform float uWfTime;\n' : '';
    target.fragmentShader = `varying vec3 vWfDetailPos;\n${timeUniform}${NOISE_GLSL}${target.fragmentShader}`
      .replace('#include <color_fragment>', detailBlock(recipe))
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + wfRough, 0.05, 1.0);',
      )
      .replace('#include <normal_fragment_maps>', normalRippleSnippet(recipe));
  };
  material.customProgramCacheKey = () => cacheKey;
}

const TARGETS: Record<MaterialDetailRole, (materials: MaterialLibrary) => MeshStandardMaterial> = {
  'core-limestone': (m) => m.block['core-limestone'],
  'casing-limestone': (m) => m.block['casing-limestone'],
  granite: (m) => m.block.granite,
  sand: (m) => m.sand,
  'compacted-earth': (m) => m.compactedEarth,
  'quarry-cut': (m) => m.quarryCut,
  wood: (m) => m.wood,
  water: (m) => m.water,
  whitewash: (m) => m.whitewash,
  'mud-brick': (m) => m.city,
  'city-roof': (m) => m.cityRoof,
  'city-accent': (m) => m.cityAccent,
  linen: (m) => m.linen,
  foliage: (m) => m.foliage,
  farmland: (m) => m.farmland,
};

export function applyMaterialDetail(materials: MaterialLibrary): void {
  for (const recipe of MATERIAL_DETAIL_RECIPES) {
    injectRecipe(TARGETS[recipe.role](materials), recipe);
  }
}

/** Advance deterministic, playback-derived detail time (Nile ripple). */
export function updateMaterialDetailTime(materials: MaterialLibrary, t: number): void {
  const shaders = materials.water.userData.wfDetailShaders as ShaderLike[] | undefined;
  if (!shaders) return;
  for (const shader of shaders) shader.uniforms.uWfTime.value = t;
}
