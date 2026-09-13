import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderLib } from 'three';
import { configureEiffelTerrainDetail } from '../src/render/three/eiffelTerrainDetail';
import { injectMaterialRecipe } from '../src/render/three/proceduralDetail';

function compile(material: MeshStandardMaterial) {
  const shader = {
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
    uniforms: {} as Record<string, { value: unknown }>,
  };
  material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0], {} as Parameters<typeof material.onBeforeCompile>[1]);
  return shader;
}

function earth() {
  const material = new MeshStandardMaterial({ roughness: 0.98, vertexColors: true });
  injectMaterialRecipe(material, 'compacted-earth');
  return material;
}

describe('Eiffel terrain detail sampling', () => {
  it('replaces only the shared noise field, preserving vertex transforms, recipe amplitudes and bump relief', () => {
    const material = earth();
    const before = compile(material);
    configureEiffelTerrainDetail(material);
    const after = compile(material);
    expect(after.vertexShader).toBe(before.vertexShader);
    // Anything outside this one function must remain the actual shared shader:
    // color management, authored grain/mottle amplitudes, normals and lighting.
    const field = /float wfFbm\(vec2 p\)\s*\{[^}]+\}/;
    const detail = before.fragmentShader.match(/float wfDetail = 0\.0;[\s\S]*?diffuseColor\.rgb \*= 1\.0 \+ wfDetail;/)![0];
    const bumpHeight = detail.replace('diffuseColor.rgb *= 1.0 + wfDetail;', '')
      .replaceAll('wfDetail', 'wfEiffelBumpHeight').replaceAll('wfRough', 'wfEiffelBumpRough')
      .replaceAll('wfFbm', 'wfEiffelUnfilteredFbm');
    const rawField = before.fragmentShader.match(field)![0].replace('wfFbm', 'wfEiffelUnfilteredFbm');
    expect(after.fragmentShader).toContain(rawField);
    expect(after.fragmentShader.indexOf('float wfNoise(vec2 p)')).toBeLessThan(after.fragmentShader.indexOf('float wfEiffelUnfilteredFbm(vec2 p)'));
    expect(bumpHeight).toMatch(/\{\s*vec3 wfP = vWfDetailPos;/);
    expect(bumpHeight).not.toMatch(/float wfDetail|float wfRough/);
    expect(after.fragmentShader).toContain(bumpHeight);
    expect(rawField).not.toMatch(/dFdx|dFdy|fwidth/);
    expect(bumpHeight).not.toMatch(/dFdx|dFdy|fwidth|\bwfFbm\(/);
    expect(after.fragmentShader).not.toMatch(/dFdx\(wfDetail\)|dFdy\(wfDetail\)/);
    const restored = after.fragmentShader
      .replace('uniform float uEiffelTerrainFilter;\n', '')
      .replace(`${rawField}\n`, '')
      .replace(`\n${bumpHeight}`, '')
      .replace('vec2(dFdx(wfEiffelBumpHeight), dFdy(wfEiffelBumpHeight))', 'vec2(dFdx(wfDetail), dFdy(wfDetail))')
      .replace(field, 'NOISE_FIELD');
    expect(restored).toBe(before.fragmentShader.replace(field, 'NOISE_FIELD'));
    expect(after.fragmentShader.match(/float wfFbm\(vec2 p\)/g)).toHaveLength(1);
    expect(after.fragmentShader).toContain('float fine = 1.0 - smoothstep(0.15, 0.5, span * 2.13)');
    expect(after.fragmentShader).toContain('4.0 * xy * xy');
    expect(after.fragmentShader).toContain('0.5 + (n0 - 0.5) * 0.65 * coarse + (n1 - 0.5) * 0.35 * fine');
    material.dispose();
  });

  it('shares a live A/B uniform across program variants without changing other terrain materials', () => {
    const material = earth(), otherWonder = earth();
    const untouched = compile(otherWonder);
    const oldKey = otherWonder.customProgramCacheKey();
    configureEiffelTerrainDetail(material);
    const hook = material.onBeforeCompile;
    configureEiffelTerrainDetail(material);
    expect(material.onBeforeCompile).toBe(hook);
    const a = compile(material), b = compile(material);
    expect(a.uniforms.uEiffelTerrainFilter).toBe(material.userData.eiffelTerrainFilter);
    expect(b.uniforms.uEiffelTerrainFilter).toBe(a.uniforms.uEiffelTerrainFilter);
    expect(a.uniforms.uEiffelTerrainFilter!.value).toBe(1);
    material.userData.eiffelTerrainFilter.value = 0;
    expect(a.uniforms.uEiffelTerrainFilter!.value).toBe(0);
    expect(b.uniforms.uEiffelTerrainFilter!.value).toBe(0);
    expect(compile(otherWonder)).toEqual(untouched);
    expect(otherWonder.userData.eiffelTerrainFilter).toBeUndefined();
    expect(otherWonder.customProgramCacheKey()).toBe(oldKey);
    expect(material.customProgramCacheKey()).not.toBe(oldKey);
    material.dispose(); otherWonder.dispose();
  });

  it('fails explicitly if applied before the actual shared recipe instead of silently losing filtering', () => {
    const material = new MeshStandardMaterial();
    configureEiffelTerrainDetail(material);
    expect(() => compile(material)).toThrow('Eiffel terrain expected the shared two-octave detail field');
    material.dispose();
  });
});
