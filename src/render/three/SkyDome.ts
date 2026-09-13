import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { GIZA_SKY, type SkyKeyframe } from '../../data/gizaSky';
import { deriveSceneFogColor } from './RenderPipeline';

const VERTEX_SHADER = /* glsl */ `
varying vec3 vWorldPosition;

void main() {
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  // Skybox trick: pin the dome to the far plane so it reads as infinitely
  // distant while staying a fixed world-space surface (never camera-attached).
  gl_Position = (projectionMatrix * modelViewMatrix * vec4(position, 1.0)).xyww;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGroundHaze;
uniform vec3 uHazeColor;
uniform vec3 uFogColor;
uniform float uHazeStrength;
uniform float uHazeFalloff;
uniform float uZenithExponent;
uniform float uAtmosphericTextureScale;
uniform float uAtmosphericTextureStrength;
uniform vec3 uSunDirection;
uniform vec3 uSunTint;
uniform float uSunDiscCos;
uniform float uSunDiscIntensity;
uniform float uHaloStrength;
uniform float uWideHaloStrength;

varying vec3 vWorldPosition;

float wfSkyHash(vec2 p) {
  return fract(sin(dot(p, vec2(91.37, 269.53))) * 43758.5453123);
}

float wfSkyNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wfSkyHash(i), wfSkyHash(i + vec2(1.0, 0.0)), f.x),
             mix(wfSkyHash(i + vec2(0.0, 1.0)), wfSkyHash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float wfSkyFbm(vec2 p) {
  return wfSkyNoise(p) * 0.68 + wfSkyNoise(p * 2.07 + 4.3) * 0.32;
}

void main() {
  vec3 dir = normalize(vWorldPosition - cameraPosition);
  float elevation = dir.y;

  vec3 color;
  if (elevation >= 0.0) {
    float gradient = pow(elevation, uZenithExponent);
    color = mix(uHorizon, uZenith, gradient);
  } else {
    color = mix(uHorizon, uGroundHaze, clamp(-elevation * 5.0, 0.0, 1.0));
  }

  float hazeBand = exp(-abs(elevation) * uHazeFalloff) * uHazeStrength;
  color = mix(color, uHazeColor, clamp(hazeBand, 0.0, 1.0));

  // Desert aerosol is not a smooth CSS gradient. A fixed world-directional
  // field supplies only a faint low-sky variation; the mask protects the
  // clean blue zenith and eliminates the noise before it can resemble clouds.
  vec2 aerosolField = dir.xz * uAtmosphericTextureScale +
    vec2(dir.y * 2.17, -dir.y * 1.31);
  float aerosolVariation = wfSkyFbm(aerosolField) - 0.5;
  float aerosolMask = smoothstep(0.015, 0.12, elevation) *
    (1.0 - smoothstep(0.48, 0.76, elevation));
  color *= 1.0 + aerosolVariation * uAtmosphericTextureStrength * aerosolMask;

  float cosSun = dot(dir, uSunDirection);
  float tightGlow = pow(clamp(cosSun, 0.0, 1.0), 650.0);
  float wideGlow = pow(clamp(cosSun, 0.0, 1.0), 5.0);
  float disc = smoothstep(uSunDiscCos - 0.00035, uSunDiscCos + 0.00035, cosSun);
  color += uSunTint * (tightGlow * uHaloStrength + wideGlow * uWideHaloStrength + disc * uSunDiscIntensity);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // The ground plane and horizon heightfield end fully fogged at their far
  // edges, which sit just below eye level. Pin the dome to the exact scene
  // fog color at low elevation so those silhouettes never read as a hard sky
  // band above the fogged terrain. three.js applies scene fog after tone
  // mapping and colorspace conversion, so this mix must happen here — the
  // same value blended pre-tonemap renders as a different output color.
  float fogBlend = 1.0 - smoothstep(0.035, 0.16, elevation);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogBlend);
}
`;

/**
 * Analytical desert skydome for the Giza reference scene (Spec 06). A fixed
 * world-space sphere whose gradient, haze band, and sun disc are sampled from
 * the typed sky description in `src/data/gizaSky.ts`.
 */
export class SkyDome {
  readonly mesh: Mesh;

  private readonly material: ShaderMaterial;
  private readonly geometry: SphereGeometry;
  private readonly fogScratch = new Color();

  constructor() {
    const { dome, sunDisc } = GIZA_SKY;
    this.geometry = new SphereGeometry(dome.radius, 48, 24);
    this.material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new Color('#2f6cb8') },
        uHorizon: { value: new Color('#cfc9ae') },
        uGroundHaze: { value: new Color(dome.groundHaze) },
        uHazeColor: { value: new Color('#d9c39a') },
        uFogColor: { value: new Color('#c7b499') },
        uHazeStrength: { value: 0.35 },
        uHazeFalloff: { value: dome.hazeFalloff },
        uZenithExponent: { value: dome.zenithExponent },
        uAtmosphericTextureScale: { value: dome.atmosphericTexture.scale },
        uAtmosphericTextureStrength: { value: dome.atmosphericTexture.strength },
        uSunDirection: { value: new Vector3(0, 1, 0) },
        uSunTint: { value: new Color('#fff4e0') },
        uSunDiscCos: {
          value: Math.cos((sunDisc.angularRadiusDegrees * Math.PI) / 180),
        },
        uSunDiscIntensity: { value: sunDisc.intensity },
        uHaloStrength: { value: sunDisc.haloStrength },
        uWideHaloStrength: { value: sunDisc.wideHaloStrength },
      },
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'analytical-world-space-sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
  }

  update(sample: SkyKeyframe, sunDirection: Vector3): void {
    const uniforms = this.material.uniforms;
    (uniforms.uZenith!.value as Color).set(sample.zenith);
    (uniforms.uHorizon!.value as Color).set(sample.horizon);
    (uniforms.uSunTint!.value as Color).set(sample.sunTint);
    (uniforms.uSunDirection!.value as Vector3).copy(sunDirection);
    // Dust haze is the horizon color warmed toward the desert floor.
    (uniforms.uHazeColor!.value as Color)
      .set(sample.horizon)
      .lerp(new Color(GIZA_SKY.dome.groundHaze), 0.42);
    // Match the scene fog exactly (light.fog is sample.horizon for Giza) so
    // the fogged far terrain meets the dome seamlessly at the horizon. three
    // uploads its fog uniform converted to the destination color space: for
    // the post-processing pipeline's linear HalfFloat target that is the
    // working space, so the uniform is passed through un-encoded. (When this
    // dome rendered straight to the canvas it needed sRGB encoding here —
    // if the composer is ever removed, that conversion must return.)
    deriveSceneFogColor(sample.horizon, this.fogScratch);
    (uniforms.uFogColor!.value as Color).copy(this.fogScratch);
    uniforms.uHazeStrength!.value = sample.haze * 0.85;
    // Wide forward scatter swells when the sun rides low.
    const lowSun = Math.min(1, Math.max(0, 1 - sunDirection.y / 0.55));
    uniforms.uWideHaloStrength!.value =
      GIZA_SKY.sunDisc.wideHaloStrength * (0.35 + 0.65 * lowSun);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
