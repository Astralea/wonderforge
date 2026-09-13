import type { MeshStandardMaterial } from 'three';

/** Filter only the rebuilt Eiffel terrain after its compacted-earth recipe is injected. */
export function configureEiffelTerrainDetail(material: MeshStandardMaterial): void {
  if (material.userData.eiffelTerrainFilter) return;
  const enabled = { value: 1 };
  material.userData.eiffelTerrainFilter = enabled;
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    const original = /float wfFbm\(vec2 p\)\s*\{\s*return wfNoise\(p\) \* 0\.65 \+ wfNoise\(p \* 2\.13 \+ 7\.3\) \* 0\.35;\s*\}/;
    if (!original.test(shader.fragmentShader)) {
      throw new Error('Eiffel terrain expected the shared two-octave detail field');
    }
    // The shared bump code differentiates wfDetail. Its input must not depend
    // on dFdx/dFdy used by the color filter (undefined higher derivatives).
    // Copy the actual injected recipe, rather than reauthoring its constants.
    const detail = shader.fragmentShader.match(/float wfDetail = 0\.0;[\s\S]*?diffuseColor\.rgb \*= 1\.0 \+ wfDetail;/)?.[0];
    const bumpDerivative = 'vec2(dFdx(wfDetail), dFdy(wfDetail))';
    if (!detail || !shader.fragmentShader.includes(bumpDerivative)) {
      throw new Error('Eiffel terrain expected the shared detail height and bump derivative');
    }
    const rawField = shader.fragmentShader.match(original)![0].replace('wfFbm', 'wfEiffelUnfilteredFbm');
    const bumpHeight = detail
      .replace('diffuseColor.rgb *= 1.0 + wfDetail;', '')
      .replaceAll('wfDetail', 'wfEiffelBumpHeight')
      .replaceAll('wfRough', 'wfEiffelBumpRough')
      .replaceAll('wfFbm', 'wfEiffelUnfilteredFbm');
    shader.fragmentShader = shader.fragmentShader
      .replace(detail, `${detail}\n${bumpHeight}`)
      .replace(bumpDerivative, 'vec2(dFdx(wfEiffelBumpHeight), dFdy(wfEiffelBumpHeight))');
    shader.uniforms.uEiffelTerrainFilter = enabled;
    shader.fragmentShader = 'uniform float uEiffelTerrainFilter;\n' + shader.fragmentShader.replace(original, `${rawField}\nfloat wfFbm(vec2 p) {
  vec2 dx = dFdx(p), dy = dFdy(p);
  // Largest singular value of the screen-to-noise Jacobian: unlike the
  // longest column, it also catches diagonally elongated pixel footprints.
  float xx = dot(dx, dx), yy = dot(dy, dy), xy = dot(dx, dy);
  float span = sqrt(max(0.0, 0.5 * (xx + yy + sqrt(max(0.0,
    (xx - yy) * (xx - yy) + 4.0 * xy * xy)))));
  float coarse = 1.0 - smoothstep(0.15, 0.5, span);
  float fine = 1.0 - smoothstep(0.15, 0.5, span * 2.13);
  float n0 = wfNoise(p), n1 = wfNoise(p * 2.13 + 7.3);
  float unfiltered = n0 * 0.65 + n1 * 0.35;
  float filtered = 0.5 + (n0 - 0.5) * 0.65 * coarse + (n1 - 0.5) * 0.35 * fine;
  return mix(unfiltered, filtered, uEiffelTerrainFilter);
}`);
  };
  material.customProgramCacheKey = () => `${previousKey()}:eiffel-terrain-footprint-v2`;
  material.needsUpdate = true;
}
