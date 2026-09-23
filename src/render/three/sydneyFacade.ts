import {
  BufferAttribute,
  Color,
  type BufferGeometry,
  type MeshStandardMaterial,
} from 'three';

/** Shared night level for every Sydney window: 0 by day, 1 in full night. */
export const SYDNEY_CITY_NIGHT = { value: 0 };
const WARM = { value: new Color(1.0, 0.7, 0.4).multiplyScalar(1.15) };

/** Marks every vertex of `geometry` as facade (1) or plain (0). Materials
 * configured below only draw windows where this attribute is 1. */
export function markSydneyFacade(geometry: BufferGeometry, value = 1): void {
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute(
    'sydFacade',
    new BufferAttribute(new Float32Array(count).fill(value), 1),
  );
}

const VERTEX_DECL = `attribute float sydFacade;
varying vec3 vSydWorld;
varying vec3 vSydNormal;
varying float vSydFacade;
varying float vSydSeed;
`;
const VERTEX_BODY = `
{
  vec4 sydWorld = vec4(transformed, 1.0);
  vec3 sydN = objectNormal;
  #ifdef USE_INSTANCING
    sydWorld = instanceMatrix * sydWorld;
    sydN = mat3(instanceMatrix) * sydN;
    vSydSeed = instanceMatrix[3].x * 0.0131 + instanceMatrix[3].z * 0.0297;
  #else
    vSydSeed = 0.0;
  #endif
  sydWorld = modelMatrix * sydWorld;
  vSydWorld = sydWorld.xyz;
  vSydNormal = mat3(modelMatrix) * sydN;
  vSydFacade = sydFacade;
}
`;
const FRAGMENT_DECL = `uniform float uSydNight;
uniform vec3 uSydWarm;
varying vec3 vSydWorld;
varying vec3 vSydNormal;
varying float vSydFacade;
varying float vSydSeed;
float sydHash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}
`;
// Window cells 3.2 m wide by 3.5 m storeys in world space. When a cell falls
// below a few pixels the pattern resolves to its average coverage instead of
// aliasing, so distant towers never shimmer while the camera orbits.
const FRAGMENT_BODY = `
{
  vec3 sydN = normalize(vSydNormal);
  float sydWall = vSydFacade * (1.0 - smoothstep(0.3, 0.45, abs(sydN.y)));
  if (sydWall > 0.001) {
    vec2 sydT = normalize(vec2(-sydN.z, sydN.x));
    vec2 sydUV = vec2(dot(vSydWorld.xz, sydT) / 3.2, vSydWorld.y / 3.5);
    vec2 sydCell = floor(sydUV);
    vec2 sydF = fract(sydUV);
    float sydPane = step(0.2, sydF.x) * step(sydF.x, 0.8) * step(0.3, sydF.y) * step(sydF.y, 0.82);
    float sydBlur = clamp((max(fwidth(sydUV.x), fwidth(sydUV.y)) - 0.18) * 3.0, 0.0, 1.0);
    float sydCover = mix(sydPane, 0.37, sydBlur) * sydWall;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.38 + vec3(0.025, 0.035, 0.05), sydCover * 0.8);
    float sydFace = floor(dot(sydN.xz, vec2(3.1, 7.3)) + 0.5);
    float sydLit = step(0.56, sydHash(sydCell + vec2(vSydSeed * 97.0 + sydFace * 13.0, vSydSeed * 41.0)));
    sydLit = mix(sydLit, 0.44, sydBlur);
    totalEmissiveRadiance += uSydWarm * (uSydNight * sydLit * sydCover);
  }
}
`;

/** World-space windows and night glow on facade walls. Chains any existing
 * onBeforeCompile (the shared material recipes) rather than replacing it. */
export function applySydneyFacade(material: MeshStandardMaterial): void {
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.uSydNight = SYDNEY_CITY_NIGHT;
    shader.uniforms.uSydWarm = WARM;
    shader.vertexShader = (VERTEX_DECL + shader.vertexShader).replace(
      '#include <project_vertex>',
      `#include <project_vertex>${VERTEX_BODY}`,
    );
    shader.fragmentShader = (FRAGMENT_DECL + shader.fragmentShader).replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>${FRAGMENT_BODY}`,
    );
  };
  material.customProgramCacheKey = () => `${previousKey()}:sydney-facade-v1`;
}

/** Instanced window panes: each whole pane is either lit or dark at night. */
export function applySydneyPaneGlow(material: MeshStandardMaterial): void {
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.uSydNight = SYDNEY_CITY_NIGHT;
    shader.uniforms.uSydWarm = WARM;
    shader.vertexShader = `varying float vSydLit;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      #ifdef USE_INSTANCING
        vSydLit = step(0.5, fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453));
      #else
        vSydLit = 0.0;
      #endif`,
    );
    shader.fragmentShader =
      `uniform float uSydNight;\nuniform vec3 uSydWarm;\nvarying float vSydLit;\n${shader.fragmentShader}`.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uSydWarm * (uSydNight * vSydLit * 0.9);',
      );
  };
  material.customProgramCacheKey = () => `${previousKey()}:sydney-pane-v1`;
}
