import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { PetraSkySample } from '../../data/petraSky';
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
  float frameElevation = normalize(vViewRay).y;
  float elevation = max(dir.y, frameElevation * 0.82 + 0.01);
  float skyT = smoothstep(-0.015, 0.18, elevation);
  vec3 color = mix(uHorizon, uZenith, skyT);

  vec2 weatherUv = dir.xz * (1.55 / (dir.y + 0.38)) + vec2(uTime * 0.12, -uTime * 0.04);
  float broad = fbm(weatherUv + dir.y * vec2(1.1, -0.6));
  float detail = fbm(weatherUv * 3.4 + vec2(5.1, -3.2));
  float cloudField = broad * 0.72 + detail * 0.28;
  float altitudeMask = smoothstep(0.08, 0.2, elevation)
    * (1.0 - smoothstep(0.55, 0.82, elevation));
  float cloudBody = smoothstep(0.52, 0.66, cloudField) * altitudeMask;
  float cloudCore = smoothstep(0.62, 0.76, cloudField) * altitudeMask;
  color = mix(color, uCloudShadow, cloudBody * uCloudOpacity * 0.2);
  color = mix(color, uCloudTint, (cloudBody * 0.58 + cloudCore * 0.42) * uCloudOpacity * 0.42);

  float warmBand = exp(-max(0.0, elevation) * 18.0) * uHaze;
  color = mix(color, uHorizon, warmBand * 0.28);
  color *= 0.985 + (detail - 0.5) * 0.02;

  float cosSun = dot(dir, uSunDirection);
  float halo = pow(max(0.0, cosSun), 22.0);
  float disc = smoothstep(0.9997, 0.9999, cosSun);
  color += uSunTint * (halo * 0.16 + disc * 1.8);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float fogBlend = 1.0 - smoothstep(0.0, 0.042, elevation);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogBlend * 0.58);
}
`;

const RIFT_FOG_NEUTRALIZER = new Color('#cbb49a');

export class PetraSkyDome {
  readonly mesh: Mesh;
  private readonly geometry = new SphereGeometry(1_050, 40, 20);
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
        uZenith: { value: new Color('#2f74b0') },
        uHorizon: { value: new Color('#cbb39a') },
        uFogColor: { value: new Color('#bba58c') },
        uSunDirection: { value: new Vector3(0, 1, 0) },
        uSunTint: { value: new Color('#fff3d6') },
        uCloudTint: { value: new Color('#f4eee6') },
        uCloudShadow: { value: new Color('#7e96a6') },
        uCloudOpacity: { value: 0.24 },
        uHaze: { value: 0.13 },
        uTime: { value: 0 },
      },
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'petra-world-space-weather-sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
  }

  update(t: number, sky: PetraSkySample, sunDirection: Vector3): void {
    const uniforms = this.material.uniforms;
    (uniforms.uHorizon!.value as Color).set(sky.horizon);
    (uniforms.uZenith!.value as Color).set(sky.zenith);
    deriveSceneFogColor(sky.horizon, this.fogScratch, RIFT_FOG_NEUTRALIZER);
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
