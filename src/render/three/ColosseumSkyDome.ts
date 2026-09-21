import {
  BackSide,
  Color,
  DataTexture,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import { COLOSSEUM_SKY, COLOSSEUM_CELESTIAL_ANGULAR_SCALE, type ColosseumSkySample } from '../../data/colosseumSky';
import { deriveSceneFogColor } from './RenderPipeline';
import { colosseumMoonSurfaceBasisAt } from '../../engine/colosseumMoonSurface';

export const COLOSSEUM_MOON_SURFACE_URL = new URL('../../assets/lunar/lroc-color-poles-1k.jpg', import.meta.url).href;

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
uniform float uSunDiscCos;
uniform float uSunVisibility;
uniform vec3 uMoonDirection;
uniform vec3 uMoonLightDirection;
uniform float uMoonDiscSin;
uniform float uMoonVisibility;
uniform sampler2D uMoonSurfaceMap;
uniform float uMoonSurfaceReady;
uniform vec3 uMoonSurfaceRight;
uniform vec3 uMoonSurfaceUp;
uniform float uNight;

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
  float elevation = dir.y;
  float skyT = smoothstep(-0.02, 0.115, elevation);
  vec3 color = mix(uHorizon, uZenith, skyT);

  vec2 weatherUv = dir.xz * (1.55 / max(0.12, dir.y + 0.38)) + vec2(uTime * 0.12, -uTime * 0.04);
  float broad = fbm(weatherUv + dir.y * vec2(1.1, -0.6));
  float detail = fbm(weatherUv * 3.4 + vec2(5.1, -3.2));
  float cloudField = broad * 0.72 + detail * 0.28;
  float altitudeMask = smoothstep(0.008, 0.07, elevation)
    * (1.0 - smoothstep(0.55, 0.82, elevation));
  float cloudBody = smoothstep(0.46, 0.63, cloudField) * altitudeMask;
  float cloudCore = smoothstep(0.62, 0.76, cloudField) * altitudeMask;
  color = mix(color, uCloudShadow, cloudBody * uCloudOpacity * 0.38);
  color = mix(color, uCloudTint, (cloudBody * 0.58 + cloudCore * 0.42) * uCloudOpacity * 0.85);

  float warmBand = exp(-max(0.0, elevation) * 18.0) * uHaze;
  color = mix(color, uHorizon, warmBand * 0.28);
  color *= 0.985 + (detail - 0.5) * 0.02;

  float cosSun = dot(dir, uSunDirection);
  float halo = pow(max(0.0, cosSun), 540.0);
  float wideHalo = pow(max(0.0, cosSun), 6.0);
  float sunAA = max(fwidth(cosSun), 0.000001);
  float horizonMask = smoothstep(-0.0003, 0.0003, elevation);
  float disc = smoothstep(uSunDiscCos - sunAA, uSunDiscCos + sunAA, cosSun);
  // The body is horizon-clipped; light scattered in air has no hard zero-
  // altitude edge. Clipping the halo too made a rectangle beneath the Sun.
  float scatteredHalo = (halo * 0.48 + wideHalo * 0.10)
    * smoothstep(-0.055, 0.025, elevation);
  float sunlight = (scatteredHalo + disc * 2.9 * horizonMask) * uSunVisibility;
  color += uSunTint * sunlight;

  // Project an illuminated sphere onto the sky. The observer-facing centre
  // normal is -Moon, not +Moon. This same Moon-to-Sun vector determines both
  // phase area and the bright limb's rotation; there is no screen-space flip.
  vec3 moonRight = normalize(cross(uMoonDirection, vec3(0.0, 1.0, 0.0)));
  vec3 moonUp = cross(moonRight, uMoonDirection);
  vec2 moonUv = vec2(dot(dir, moonRight), dot(dir, moonUp)) / uMoonDiscSin;
  float r2 = dot(moonUv, moonUv);
  float moonAA = max(fwidth(r2), 0.001);
  float moonDisc = (1.0 - smoothstep(1.0 - moonAA, 1.0 + moonAA, r2))
    * step(0.0, dot(dir, uMoonDirection)) * uMoonVisibility * horizonMask;
  vec3 moonNormal = moonUv.x * moonRight + moonUv.y * moonUp
    - sqrt(max(0.0, 1.0 - r2)) * uMoonDirection;
  float incidence = dot(moonNormal, uMoonLightDirection);
  float terminator = smoothstep(-0.012, 0.012, incidence);
  // Spherical, mean-nearside longitude/latitude mapping. Rotate the surface
  // basis only: the ephemeris-driven sphere normal and terminator stay intact.
  float lunarX = dot(moonNormal, uMoonSurfaceRight);
  float lunarY = dot(moonNormal, uMoonSurfaceUp);
  float lunarZ = max(0.00001, dot(moonNormal, -uMoonDirection));
  vec2 surfaceUv = vec2(0.5 + atan(lunarX, lunarZ) / 6.28318530718,
    0.5 + asin(clamp(lunarY, -1.0, 1.0)) / 3.14159265359);
  vec3 surfaceColor = texture2D(uMoonSurfaceMap, surfaceUv).rgb;
  vec3 fallback = vec3(0.18 + noise(moonUv * 5.0) * 0.22);
  vec3 lunarAlbedo = mix(fallback, surfaceColor, uMoonSurfaceReady);
  // A bounded, predominantly backscattering response avoids the hot centre
  // of a Lambert sphere. Bright highlands remain distinct from dark maria.
  float mu0 = max(0.0, incidence);
  float mu = sqrt(max(0.0, 1.0 - r2));
  float reflected = min(1.0, 2.0 * mu0 / max(0.0001, mu0 + mu));
  float moonRadiance = terminator * mix(sqrt(mu0), reflected, 0.8);
  float transmission = 1.0 - cloudBody * uCloudOpacity * 0.8;
  vec3 lunarColor = vec3(0.98, 0.99, 1.0) * min(vec3(0.68), lunarAlbedo * 1.25 + 0.02)
    * (moonRadiance * mix(0.72, 1.0, uNight) + 0.008 * uNight);
  // Atmospheric scattering lies in front of the distant Moon. Preserve that
  // radiance across its unlit hemisphere instead of cutting a black disc out
  // of the local sky; the lit surface and faint earthshine add their radiance.
  color += lunarColor * moonDisc * transmission;

  // Blend in linear colour space. Thin valley air must not erase the low sun.
  float fogBlend = (1.0 - smoothstep(-0.008, 0.048, elevation))
    * (1.0 - smoothstep(0.12, 0.7, max(sunlight, moonDisc * moonRadiance)));
  color = mix(color, uFogColor, fogBlend);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;


export class ColosseumSkyDome {
  readonly mesh: Mesh;
  readonly ready: Promise<void>;
  private readonly geometry = new SphereGeometry(COLOSSEUM_SKY.domeRadius, 24, 12);
  private readonly material: ShaderMaterial;
  private readonly fogScratch = new Color();
  private readonly fogNeutralizer = new Color();
  private readonly fallbackSurface = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  private surfaceTexture?: Texture;
  private disposed = false;

  constructor(loadSurface: () => Promise<Texture | undefined> = () => typeof document === 'undefined'
    ? Promise.resolve(undefined) : new TextureLoader().loadAsync(COLOSSEUM_MOON_SURFACE_URL)) {
    this.fallbackSurface.needsUpdate = true;
    this.material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new Color('#3a7eb8') },
        uHorizon: { value: new Color('#d4b898') },
        uFogColor: { value: new Color('#c4a882') },
        uSunDirection: { value: new Vector3(0, 1, 0) },
        uSunTint: { value: new Color('#fff3d6') },
        uCloudTint: { value: new Color('#f6f1e8') },
        uCloudShadow: { value: new Color('#7e96aa') },
        uCloudOpacity: { value: 0.22 },
        uHaze: { value: 0.12 },
        uTime: { value: 0 },
        uSunDiscCos: { value: 1 },
        uSunVisibility: { value: 0 },
        uMoonDirection: { value: new Vector3(0, 0, -1) },
        uMoonLightDirection: { value: new Vector3(1, 0, 0) },
        uMoonDiscSin: { value: 0.01 },
        uMoonVisibility: { value: 0 },
        uMoonSurfaceMap: { value: this.fallbackSurface },
        uMoonSurfaceReady: { value: 0 },
        uMoonSurfaceRight: { value: new Vector3(1, 0, 0) },
        uMoonSurfaceUp: { value: new Vector3(0, 1, 0) },
        uNight: { value: 0 },
      },
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'colosseum-world-space-weather-sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
    this.mesh.userData.lunarSurfaceStatus = 'loading';
    this.ready = Promise.resolve().then(loadSurface).then(texture => {
      if (this.disposed) { texture?.dispose(); return; }
      if (!texture) { this.mesh.userData.lunarSurfaceStatus = 'fallback'; return; }
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = true;
      texture.needsUpdate = true;
      this.surfaceTexture = texture;
      this.material.uniforms.uMoonSurfaceMap!.value = texture;
      this.material.uniforms.uMoonSurfaceReady!.value = 1;
      this.mesh.userData.lunarSurfaceStatus = 'ready';
    }).catch(() => {
      if (!this.disposed) this.mesh.userData.lunarSurfaceStatus = 'fallback';
    });
  }

  update(_t: number, sky: ColosseumSkySample, sunDirection: Vector3): void {
    const uniforms = this.material.uniforms;
    (uniforms.uHorizon!.value as Color).set(sky.horizon);
    (uniforms.uZenith!.value as Color).set(sky.zenith);
    deriveSceneFogColor(sky.horizon, this.fogScratch, this.fogNeutralizer.set(sky.fogNeutralizer));
    (uniforms.uFogColor!.value as Color).copy(this.fogScratch);
    (uniforms.uSunDirection!.value as Vector3).copy(sunDirection);
    (uniforms.uSunTint!.value as Color).set(sky.sunTint);
    (uniforms.uCloudTint!.value as Color).set(sky.cloudTint);
    (uniforms.uCloudShadow!.value as Color).set(sky.cloudShadow);
    uniforms.uCloudOpacity!.value = sky.cloudOpacity;
    uniforms.uHaze!.value = sky.haze;
    // The sky clock follows the light sample even in a completed ambient scene.
    uniforms.uTime!.value = sky.t;
    const { sun, moon } = sky.astronomy;
    const radians = Math.PI / 180 * COLOSSEUM_CELESTIAL_ANGULAR_SCALE;
    uniforms.uSunDiscCos!.value = Math.cos(sun.angularRadiusDegrees * radians);
    uniforms.uSunVisibility!.value = sun.horizonVisibility;
    (uniforms.uMoonDirection!.value as Vector3).set(moon.direction[0], moon.direction[1], -moon.direction[2]);
    (uniforms.uMoonLightDirection!.value as Vector3).set(moon.lightDirection[0], moon.lightDirection[1], -moon.lightDirection[2]);
    const surfaceBasis = colosseumMoonSurfaceBasisAt(moon.direction);
    (uniforms.uMoonSurfaceRight!.value as Vector3).set(...surfaceBasis.right);
    (uniforms.uMoonSurfaceUp!.value as Vector3).set(...surfaceBasis.up);
    uniforms.uMoonDiscSin!.value = Math.sin(moon.angularRadiusDegrees * radians);
    uniforms.uMoonVisibility!.value = moon.horizonVisibility;
    uniforms.uNight!.value = Math.max(0, Math.min(1, -sun.elevationDegrees / 12));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.userData.lunarSurfaceStatus = 'disposed';
    this.surfaceTexture?.dispose();
    this.fallbackSurface.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
