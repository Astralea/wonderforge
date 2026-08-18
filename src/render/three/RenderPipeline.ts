import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { LightState } from '../../engine/daynight';

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
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor('#b8c7c4');

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
    const mobile = width < 700;
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

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.sun.shadow.map?.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
  }
}
