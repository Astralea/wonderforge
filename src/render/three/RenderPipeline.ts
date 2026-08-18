import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HalfFloatType,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { LightState } from '../../engine/daynight';

/**
 * Final display-space grade (runs after tone mapping): a gentle photographic
 * vignette, a whisper of film grain, and a small saturation lift. Grain time
 * is fed from playback `t`, so scrubbing to the same frame always shows the
 * same grain (Spec 02 determinism).
 */
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uGrainTime: { value: 0 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.028 },
    uSaturation: { value: 1.05 },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uGrainTime;
uniform float uVignette;
uniform float uGrain;
uniform float uSaturation;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + uGrainTime * 43.7) * 43758.5453);
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);
  vec2 centered = vUv - 0.5;
  color *= 1.0 - uVignette * dot(centered, centered) * 2.0;
  color += (hash(vUv * 913.0) - 0.5) * uGrain * (0.35 + 0.65 * (1.0 - luma));
  gl_FragColor = vec4(color, 1.0);
}
`,
};

const FOG_NEUTRALIZER = new Color('#c7b499');

/**
 * Scene fog color for a given light-state fog tint. The SkyDome blends to
 * this exact color at low elevation, so any geometry that ends fully fogged
 * (ground plane, horizon heightfield) meets the dome without a visible seam.
 */
export function deriveSceneFogColor(fog: string, target: Color): Color {
  return target.set(fog).lerp(FOG_NEUTRALIZER, 0.28);
}

export class RenderPipeline {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(35, 1, 0.5, 2_400);
  readonly sun = new DirectionalLight('#fff4e0', 2.3);
  readonly ambient = new HemisphereLight('#b9d7e9', '#6f4d2c', 1.05);
  private readonly sunTarget = new Vector3(-15, 7, -17);
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.72;
    this.renderer.shadowMap.enabled = true;
    // Soft PCF: hard-edged shadow texels read as low-budget; the penumbra is
    // most of what "AAA lighting" means at this scale.
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor('#b8c7c4');

    // Cinematic post stack. The scene renders linear into a HalfFloat buffer
    // (three skips tone mapping for render targets), bloom blooms only what
    // is genuinely bright — the sun disc, its halo, lit casing — then
    // OutputPass applies ACES + sRGB and the grade adds vignette and
    // deterministic grain in display space.
    // The default framebuffer had MSAA (antialias: true); a composer target
    // does not unless asked, and without it the thin shadowed joints between
    // blocks alias into hard speckle. 4x multisampled HalfFloat keeps the
    // canvas-quality edges through the post stack.
    this.composer = new EffectComposer(
      this.renderer,
      new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
    );
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.32, 0.55, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE_SHADER);
    this.composer.addPass(this.grade);

    this.scene.fog = new Fog('#c3b59d', 105, 330);
    this.scene.add(this.sun, this.sun.target, this.ambient);
    this.sun.target.position.copy(this.sunTarget);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -82;
    this.sun.shadow.camera.right = 82;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 300;
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.035;
    this.camera.up.set(0, 1, 0);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.camera.aspect = Math.max(0.2, width / Math.max(1, height));
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    const mobile = width < 700;
    // Bloom's mip chain is the one genuinely costly pass; phones keep the
    // grade (vignette/grain are one cheap fullscreen draw) but skip bloom.
    this.bloom.enabled = !mobile;
    const shadowSize = mobile ? 1024 : 2048;
    if (this.sun.shadow.mapSize.width !== shadowSize) {
      this.sun.shadow.mapSize.set(shadowSize, shadowSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  updateLight(light: LightState): Vector3 {
    const azimuth = (light.sun.azimuth * Math.PI) / 180;
    const elevation = (light.sun.elevation * Math.PI) / 180;
    const direction = new Vector3(
      Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.sin(azimuth),
    ).normalize();
    this.sun.color.set(light.sun.color);
    this.sun.intensity = 0.72 + light.sun.intensity * 1.72;
    this.sun.position.copy(this.sunTarget).addScaledVector(direction, 145);
    this.ambient.color.set(light.ambient.skyColor).lerp(new Color('#fff5df'), 0.43);
    this.ambient.groundColor.set(light.ambient.groundColor).lerp(new Color('#8b6a42'), 0.32);
    this.ambient.intensity = 0.9 + light.ambient.intensity * 1.65;
    this.scene.background = new Color(light.sky);
    if (this.scene.fog instanceof Fog) {
      deriveSceneFogColor(light.fog, this.scene.fog.color);
    }
    return direction;
  }

  /** `filmTime` seeds the grade's grain; playback `t` keeps scrubs identical. */
  render(filmTime = 0): void {
    this.grade.uniforms.uGrainTime!.value = filmTime;
    // info auto-resets on every internal render() the composer issues, which
    // would leave diagnostics reporting only the final fullscreen quad.
    // Accumulate across the whole frame so the budget numbers stay honest
    // (they now include the bloom mip chain and the grade).
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.composer.render();
  }

  dispose(): void {
    this.sun.shadow.map?.dispose();
    this.bloom.dispose();
    this.composer.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
  }
}
