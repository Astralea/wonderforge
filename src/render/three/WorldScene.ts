import { Fog, Vector3 } from 'three';
import type { Wonder } from '../../data/types';
import { gizaSunStateAt, sampleGizaSky } from '../../data/gizaSky';
import { cameraStateAt } from '../../engine/camera';
import { lightStateAt } from '../../engine/daynight';
import { clamp } from '../../engine/easing';
import { gizaAmbientOrbitAt, gizaCinematicShotAt } from '../../engine/gizaCamera';
import { GizaWorld } from './GizaWorld';
import { LegacyWorld } from './LegacyWorld';
import { createMaterialLibrary, type MaterialLibrary } from './MaterialLibrary';
import { updateMaterialDetailTime } from './proceduralDetail';
import { RenderPipeline } from './RenderPipeline';
import { readRendererDiagnostics } from './diagnostics';

export class WorldScene {
  private readonly pipeline: RenderPipeline;
  private readonly materials: MaterialLibrary;
  private readonly giza?: GizaWorld;
  private readonly legacy?: LegacyWorld;
  private aspect = 16 / 9;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly wonder: Wonder,
  ) {
    this.pipeline = new RenderPipeline(canvas);
    this.materials = createMaterialLibrary(wonder);
    if (wonder.id === 'pyramids-of-giza') {
      this.giza = new GizaWorld(this.materials);
      this.pipeline.scene.add(this.giza.group);
    } else {
      this.legacy = new LegacyWorld(wonder, this.materials);
      this.pipeline.scene.add(this.legacy.group);
    }
  }

  resize(width: number, height: number): void {
    this.aspect = width / Math.max(1, height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.35 : 1.75);
    this.pipeline.resize(width, height, pixelRatio);
  }

  private updateGizaCamera(t: number, fogStretch = 1): void {
    // Shot schedule, breathing pitch, and reveal widening are pure engine
    // math (gizaCinematicShotAt) so the frustum contract tests see exactly
    // what ships. This layer only applies the state to Three.js objects.
    const shot = gizaCinematicShotAt(t, this.aspect);
    if (this.pipeline.scene.fog instanceof Fog) {
      // fogStretch (typed sky data): dawn reads long so morning mist stays a
      // mood instead of erasing the camp; midday is the 1.0 reference.
      this.pipeline.scene.fog.near = shot.radius * 0.62 * fogStretch;
      this.pipeline.scene.fog.far = shot.radius * 2.25 * fogStretch;
    }
    const target = new Vector3(...shot.target);
    const horizontal = Math.cos(shot.pitch) * shot.radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(shot.azimuth) * horizontal,
      target.y + Math.sin(shot.pitch) * shot.radius,
      target.z + Math.sin(shot.azimuth) * horizontal,
    );
    this.pipeline.camera.fov = this.aspect < 0.72 ? 42 : 35;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  /**
   * Ambient hero orbit (Spec 02 §Camera, Spec 05 §Home): a continuous closed
   * orbit — constant azimuth rate, fixed ensemble target, constant radius —
   * so the homepage loop has no periodic snap.
   */
  private updateAmbientCamera(elapsedSeconds: number): void {
    const narrowExponent = this.aspect < 0.72 ? 0.25 : 0.62;
    const narrow = Math.pow(clamp(1.78 / Math.max(0.3, this.aspect), 1, 2.2), narrowExponent);
    const radius = 148 * 0.95 * narrow;
    if (this.pipeline.scene.fog instanceof Fog) {
      this.pipeline.scene.fog.near = radius * 0.62;
      this.pipeline.scene.fog.far = radius * 2.25;
    }
    const { azimuth, pitch } = gizaAmbientOrbitAt(elapsedSeconds, this.aspect);
    const target = new Vector3(-31, 7.8, -31);
    const horizontal = Math.cos(pitch) * radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(azimuth) * horizontal,
      target.y + Math.sin(pitch) * radius,
      target.z + Math.sin(azimuth) * horizontal,
    );
    this.pipeline.camera.fov = this.aspect < 0.72 ? 42 : 35;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updateLegacyCamera(t: number): void {
    const camera = cameraStateAt(t, this.wonder.structure, undefined, this.aspect);
    this.pipeline.camera.position.set(...camera.position);
    this.pipeline.camera.fov = camera.fov;
    this.pipeline.camera.lookAt(...camera.target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updateLightRig(lightT: number) {
    const light = lightStateAt(lightT, this.wonder);
    // Era/place grounding (Spec 08): Giza re-derives its sun path, sky, fog,
    // and ambient tints from the typed scene description rather than the
    // generic wonder palette.
    const sky = this.giza ? sampleGizaSky(lightT) : undefined;
    if (sky) {
      const sun = gizaSunStateAt(lightT);
      light.sun.azimuth = sun.azimuth;
      light.sun.elevation = sun.elevation;
      light.sky = sky.horizon;
      light.fog = sky.horizon;
      light.ambient.skyColor = sky.zenith;
      // The key light carries the sun's own tint: a warm low-angle key at
      // dawn and dusk gives the raking shadows the visual director asked
      // for, instead of the generic wonder-palette white.
      light.sun.color = sky.sunTint;
    }
    const sunDirection = this.pipeline.updateLight(light);
    // Deterministic detail time (Nile ripple), phased from playback t.
    updateMaterialDetailTime(this.materials, lightT);
    return { light, sky, sunDirection };
  }

  private finishFrame(): void {
    this.pipeline.render();
    const diagnostics = readRendererDiagnostics(this.pipeline.renderer);
    window.__WONDERFORGE_RENDERER__ = diagnostics;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      renderer: diagnostics,
      scene: this.giza ? 'giza-reference' : 'legacy-fallback',
    };
    this.pipeline.renderer.domElement.dataset.rendererDiagnostics = JSON.stringify(diagnostics);
  }

  update(constructionT: number, cameraT: number, lightT: number): void {
    const { light, sky, sunDirection } = this.updateLightRig(lightT);
    if (this.giza && sky) {
      this.updateGizaCamera(cameraT, sky.fogStretch);
      this.giza.update(constructionT, light, sunDirection, sky);
    } else if (this.legacy) {
      this.updateLegacyCamera(cameraT);
      this.legacy.update(constructionT);
    }
    this.finishFrame();
  }

  /**
   * Ambient hero mode (Spec 05 §Home): finished scene, continuous closed
   * orbit, breathing daylight — seamless forever, no periodic snap.
   */
  updateAmbient(elapsedSeconds: number, lightT: number): void {
    const { light, sky, sunDirection } = this.updateLightRig(lightT);
    if (this.giza && sky) {
      this.updateAmbientCamera(elapsedSeconds);
      this.giza.update(1, light, sunDirection, sky);
    } else if (this.legacy) {
      this.updateLegacyCamera((elapsedSeconds / 90) % 1);
      this.legacy.update(1);
    }
    this.finishFrame();
  }

  dispose(): void {
    this.giza?.dispose();
    this.legacy?.dispose();
    for (const material of this.materials.all) material.dispose();
    this.pipeline.dispose();
    delete window.__WONDERFORGE_RENDERER__;
    delete window.__THREE_GAME_DIAGNOSTICS__;
  }
}
