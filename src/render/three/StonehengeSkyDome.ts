import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { StonehengeSkySample } from '../../data/stonehengeSky';
import { deriveSceneFogColor } from './RenderPipeline';

const VERTEX_SHADER = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vViewRay;

void main() {
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewRay = viewPosition.xyz;
  gl_Position = (projectionMatrix * viewPosition).xyww;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uFogColor;
uniform vec3 uSunDirection;
uniform vec3 uSunTint;
uniform vec3 uCloudTint;
uniform vec3 uCloudShadow;
uniform float uCloudOpacity;
uniform float uHaze;
uniform float uTime;

varying vec3 vWorldPosition;
varying vec3 vViewRay;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  return noise(p) * 0.58
    + noise(p * 2.07 + vec2(4.1, -2.8)) * 0.29
    + noise(p * 4.13 + vec2(-1.7, 6.2)) * 0.13;
}

void main() {
  vec3 dir = normalize(vWorldPosition - cameraPosition);
  // Stonehenge's authored camera looks down from an elevated orbit, placing
  // the geographic horizon above the frustum. Use the visible frame ray as a
  // second elevation axis so the sky above the hill silhouette can still
  // develop a blue upper dome instead of being pinned entirely to fog color.
  float frameElevation = normalize(vViewRay).y;
  float elevation = max(dir.y, frameElevation * 0.78 + 0.012);
  // Pull the blue zenith down into the real cinematic frustum. The camera is
  // low over the henge, so a physical 90-degree zenith would never enter the
  // frame and the whole visible dome would collapse to horizon grey.
  float skyT = smoothstep(-0.02, 0.16, elevation);
  vec3 color = mix(uHorizon, uZenith, skyT);

  // Broad broken cumulus banks are authored in world direction so camera
  // motion reveals a skyscape instead of dragging a screen-space texture.
  // Gnomonic-style projection: dividing by elevation makes the UV field behave
  // like a flat cloud deck overhead. The previous dir.xz scale pinched at the
  // zenith and painted saturated vertical streaks at the top of the frame.
  // Scale 1.85 keeps mid-band cloud size matching the old 3.35 factor.
  vec2 weatherUv = dir.xz * (1.85 / (dir.y + 0.35)) + vec2(uTime * 0.22, -uTime * 0.075);
  float broad = fbm(weatherUv + dir.y * vec2(1.4, -0.75));
  float detail = fbm(weatherUv * 3.15 + vec2(7.2, -4.9));
  float cloudField = broad * 0.76 + detail * 0.24;
  float altitudeMask = smoothstep(0.055, 0.15, elevation)
    * (1.0 - smoothstep(0.62, 0.88, elevation));
  float cloudBody = smoothstep(0.47, 0.61, cloudField) * altitudeMask;
  float cloudCore = smoothstep(0.59, 0.73, cloudField) * altitudeMask;
  color = mix(color, uCloudShadow, cloudBody * uCloudOpacity * 0.24);
  color = mix(color, uCloudTint, (cloudBody * 0.62 + cloudCore * 0.38) * uCloudOpacity * 0.52);

  // A narrow humid horizon band adds depth without bleaching the upper dome.
  float humidBand = exp(-max(0.0, elevation) * 22.0) * uHaze;
  color = mix(color, uHorizon, humidBand * 0.22);
  color *= 0.982 + (detail - 0.5) * 0.026;

  float cosSun = dot(dir, uSunDirection);
  float halo = pow(max(0.0, cosSun), 24.0);
  float disc = smoothstep(0.99972, 0.9999, cosSun);
  color += uSunTint * (halo * 0.13 + disc * 1.9);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float fogBlend = 1.0 - smoothstep(0.0, 0.038, elevation);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogBlend * 0.72);
}
`;

const DOWNLAND_FOG_NEUTRALIZER = new Color('#c5cdc9');

/** Target-owned, deterministic humid downland sky for the Stonehenge scene. */
export class StonehengeSkyDome {
  readonly mesh: Mesh;
  private readonly geometry = new SphereGeometry(1_100, 40, 20);
  private readonly material: ShaderMaterial;
  private readonly fogScratch = new Color();

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new Color('#6585a0') },
        uHorizon: { value: new Color('#b7c2ba') },
        uFogColor: { value: new Color('#aeb8ae') },
        uSunDirection: { value: new Vector3(0, 1, 0) },
        uSunTint: { value: new Color('#fff4e0') },
        uCloudTint: { value: new Color('#f0eee7') },
        uCloudShadow: { value: new Color('#8196a5') },
        uCloudOpacity: { value: 0.42 },
        uHaze: { value: 0.2 },
        uTime: { value: 0 },
      },
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'stonehenge-world-space-weather-sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
  }

  update(t: number, sky: StonehengeSkySample, sunDirection: Vector3): void {
    const uniforms = this.material.uniforms;
    (uniforms.uHorizon!.value as Color).set(sky.horizon);
    (uniforms.uZenith!.value as Color).set(sky.zenith);
    deriveSceneFogColor(sky.horizon, this.fogScratch, DOWNLAND_FOG_NEUTRALIZER);
    (uniforms.uFogColor!.value as Color).copy(this.fogScratch);
    (uniforms.uSunDirection!.value as Vector3).copy(sunDirection);
    (uniforms.uSunTint!.value as Color).set(sky.sunTint);
    (uniforms.uCloudTint!.value as Color).set(sky.cloudTint);
    (uniforms.uCloudShadow!.value as Color).set(sky.cloudShadow);
    uniforms.uCloudOpacity!.value = sky.cloudOpacity;
    uniforms.uHaze!.value = sky.haze;
    uniforms.uTime!.value = t;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
