import { Fog, Vector3 } from 'three';
import type { Wonder } from '../../data/types';
import { gizaSunStateAt, sampleGizaSky } from '../../data/gizaSky';
import { sampleColosseumSky } from '../../data/colosseumSky';
import { samplePetraSky, petraSunStateAt } from '../../data/petraSky';
import { sampleStonehengeSky, stonehengeSunStateAt } from '../../data/stonehengeSky';
import { sampleSydneySky, sydneySunStateAt } from '../../data/sydneySky';
import { sampleEiffelSky, eiffelSunStateAt } from '../../data/eiffelSky';
import { cameraStateAt } from '../../engine/camera';
import { lightStateAt, lerpColor } from '../../engine/daynight';
import { colosseumLightState } from '../../engine/colosseumLighting';
import { sampleEiffelCinematicAtmosphere } from '../../engine/eiffelCinematicAtmosphere';
import { clamp } from '../../engine/easing';
import { gizaAmbientOrbitAt, gizaCinematicShotAt } from '../../engine/gizaCamera';
import { colosseumFilmAt } from '../../engine/colosseumFilm';
import { colosseumCinematicShotAt } from '../../engine/colosseumCamera';
import { petraCinematicShotAt } from '../../engine/petraCamera';
import { stonehengeCinematicShotAt } from '../../engine/stonehengeCamera';
import { sydneyCinematicShotAt } from '../../engine/sydneyCamera';
import { eiffelCinematicShotAt } from '../../engine/eiffelCamera';
import { eiffelFilmShotAt, sampleEiffelFilm } from '../../engine/eiffelFilm';
import { eiffelFilmEditShotAt, sampleEiffelFilmEdit, type EiffelFilmEdit } from '../../engine/eiffelFilmEdit';
import { applyColosseumShadow } from './colosseumShadow';
import { applyStonehengeShadow } from './stonehengeShadow';
import { ColosseumWorld } from './ColosseumWorld';
import { EiffelWorld } from './EiffelWorld';
import { EIFFEL_CAMERA_NEAR } from './eiffelRenderPrecision';
import { SYDNEY_CAMERA_NEAR } from './sydneyRenderPrecision';
import { arrivalStageFor } from './wonderArrivalDrawings';
import { GizaWorld } from './GizaWorld';
import { LegacyWorld } from './LegacyWorld';
import { createMaterialLibrary, type MaterialLibrary } from './MaterialLibrary';
import { updateMaterialDetailTime, updateWaterSky } from './proceduralDetail';
import { PetraWorld } from './PetraWorld';
import { RenderPipeline } from './RenderPipeline';
import { referenceWorldKindFor, type ReferenceWorldKind } from './sceneRegistry';
import { StonehengeWorld } from './StonehengeWorld';
import { SydneyWorld } from './SydneyWorld';
import { readRendererDiagnostics } from './diagnostics';

export class WorldScene {
  private readonly pipeline: RenderPipeline;
  private celestialDiagnostics?: Record<string, unknown>;
  private readonly materials: MaterialLibrary;
  private readonly giza?: GizaWorld;
  private readonly stonehenge?: StonehengeWorld;
  private readonly petra?: PetraWorld;
  private readonly colosseum?: ColosseumWorld;
  private readonly sydney?: SydneyWorld;
  private readonly eiffel?: EiffelWorld;
  private readonly legacy?: LegacyWorld;
  private readonly worldKind: ReferenceWorldKind;
  private aspect = 16 / 9;
  private viewportHeight = 900;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly wonder: Wonder,
  ) {
    this.pipeline = new RenderPipeline(canvas);
    this.materials = createMaterialLibrary(wonder);
    this.worldKind = referenceWorldKindFor(wonder.id);
    if (this.worldKind === 'giza') {
      this.giza = new GizaWorld(this.materials);
      this.pipeline.scene.add(this.giza.group);
    } else if (this.worldKind === 'stonehenge') {
      this.stonehenge = new StonehengeWorld(this.materials);
      this.pipeline.scene.add(this.stonehenge.group);
    } else if (this.worldKind === 'petra') {
      this.petra = new PetraWorld(this.materials);
      this.pipeline.scene.add(this.petra.group);
    } else if (this.worldKind === 'colosseum') {
      // Fine distant roof lines and the quiet sky should not crawl under grain.
      this.pipeline.setFilmGrain(0.008);
      this.pipeline.setLensStreakEnabled(false);
      this.colosseum = new ColosseumWorld(this.materials);
      this.pipeline.scene.add(this.colosseum.group);
    } else if (this.worldKind === 'sydney') {
      this.pipeline.setFilmGrain(0.008);
      this.pipeline.setLensStreakEnabled(false);
      this.pipeline.setBloomStrength(0.06);
      this.sydney = new SydneyWorld(this.materials);
      this.pipeline.scene.add(this.sydney.group);
    } else if (this.worldKind === 'eiffel') {
      // Fine Paris panes and distant roofs should not shimmer from display noise.
      this.pipeline.setFilmGrain(0);
      this.pipeline.enableEiffelReflection();
      this.eiffel = new EiffelWorld(this.materials, canvas.clientWidth > 0 && canvas.clientWidth < 700);
      this.pipeline.scene.add(this.eiffel.group);
    } else {
      this.legacy = new LegacyWorld(wonder, this.materials);
      this.pipeline.scene.add(this.legacy.group);
    }
  }

  get loadStage(): string {
    return this.eiffel?.loadStage ?? arrivalStageFor(this.wonder.id);
  }

  get loadProgress(): number { return this.eiffel?.loadProgress ?? 0; }

  get ready(): Promise<void> {
    return this.eiffel?.ready ?? this.colosseum?.ready ?? this.sydney?.ready ?? Promise.resolve();
  }

  resize(width: number, height: number): void {
    this.aspect = width / Math.max(1, height);
    this.viewportHeight = Math.max(1, height);
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

  private updateStonehengeCamera(t: number, fogStretch = 1, orbitElapsed?: number): void {
    const shot = stonehengeCinematicShotAt(t, this.aspect);
    if (this.pipeline.scene.fog instanceof Fog) {
      this.pipeline.scene.fog.near = shot.radius * 1.85 * fogStretch;
      this.pipeline.scene.fog.far = shot.radius * 5.4 * fogStretch;
    }
    const azimuth = shot.azimuth + ((orbitElapsed ?? 0) / 110) * Math.PI * 2;
    const target = new Vector3(...shot.target);
    const horizontal = Math.cos(shot.pitch) * shot.radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(azimuth) * horizontal,
      target.y + Math.sin(shot.pitch) * shot.radius,
      target.z + Math.sin(azimuth) * horizontal,
    );
    this.pipeline.camera.fov = shot.fov;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updatePetraCamera(t: number, fogStretch = 1): void {
    const shot = petraCinematicShotAt(t, this.aspect);
    if (this.pipeline.scene.fog instanceof Fog) {
      this.pipeline.scene.fog.near = shot.radius * 1.55 * fogStretch;
      this.pipeline.scene.fog.far = shot.radius * 4.2 * fogStretch;
    }
    const target = new Vector3(...shot.target);
    const horizontal = Math.cos(shot.pitch) * shot.radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(shot.azimuth) * horizontal,
      target.y + Math.sin(shot.pitch) * shot.radius,
      target.z + Math.sin(shot.azimuth) * horizontal,
    );
    this.pipeline.camera.fov = shot.fov;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updateColosseumCamera(t: number, fogStretch = 1, orbitElapsed?: number): void {
    const shot = colosseumCinematicShotAt(t, this.aspect);
    if (this.pipeline.scene.fog instanceof Fog) {
      this.pipeline.scene.fog.near = shot.radius * 1.12 * fogStretch;
      this.pipeline.scene.fog.far = shot.radius * 3.6 * fogStretch;
    }
    const azimuth = shot.azimuth + ((orbitElapsed ?? 0) / 110) * Math.PI * 2;
    const target = new Vector3(shot.target[0], shot.target[1], -shot.target[2]);
    const horizontal = Math.cos(shot.pitch) * shot.radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(azimuth) * horizontal,
      target.y + Math.sin(shot.pitch) * shot.radius,
      target.z - Math.sin(azimuth) * horizontal,
    );
    this.pipeline.camera.fov = shot.fov;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updateSydneyCamera(t: number, fogStretch = 1): void {
    const shot = sydneyCinematicShotAt(t, this.aspect);
    // Portrait's fog end exceeds the shared 2.4 km clip plane. Keep the
    // extended harbour terrain behind the fully opaque haze, not clipped.
    this.pipeline.camera.far = 12_000;
    // A half-metre near plane loses centimetre-scale facade/road separation
    // across this kilometre-wide view. No scene subject is close to the lens.
    this.pipeline.camera.near = SYDNEY_CAMERA_NEAR;
    if (this.pipeline.scene.fog instanceof Fog) {
      // Spec 13 city pass: moderate harbour haze that still reveals the
      // city; the portrait end stays well inside the 12 km clip plane.
      this.pipeline.scene.fog.near = shot.radius * 1.3 * fogStretch;
      this.pipeline.scene.fog.far = shot.radius * 4.0 * fogStretch;
    }
    const target = new Vector3(...shot.target);
    const horizontal = Math.cos(shot.pitch) * shot.radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(shot.azimuth) * horizontal,
      target.y + Math.sin(shot.pitch) * shot.radius,
      target.z + Math.sin(shot.azimuth) * horizontal,
    );
    this.pipeline.camera.fov = shot.fov;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updateEiffelCamera(t: number, fogStretch = 1, filmMode = false, editCamera?: { edit: EiffelFilmEdit; t: number }, orbitElapsed?: number): void {
    const film = editCamera ? sampleEiffelFilmEdit(editCamera.edit, editCamera.t) : sampleEiffelFilm(t);
    const shot = editCamera ? eiffelFilmEditShotAt(editCamera.edit, editCamera.t, this.aspect) : filmMode ? eiffelFilmShotAt(t, this.aspect) : eiffelCinematicShotAt(t, this.aspect);
    this.pipeline.setEiffelShadowFrame(editCamera?.edit === 'cinematic'
      ? { productionT: film.productionT, shot }
      : null);
    // A closer working lens changes framing, not the Paris air density.
    const atmosphereRadius = filmMode ? eiffelCinematicShotAt(film.productionT, this.aspect).radius : shot.radius;
    if (this.pipeline.scene.fog instanceof Fog) {
      this.pipeline.scene.fog.near = atmosphereRadius * 1.05 * fogStretch;
      this.pipeline.scene.fog.far = atmosphereRadius * 2.7 * fogStretch;
    }
    const azimuth = shot.azimuth + ((orbitElapsed ?? 0) / 130) * Math.PI * 2;
    const target = new Vector3(...shot.target);
    const horizontal = Math.cos(shot.pitch) * shot.radius;
    this.pipeline.camera.position.set(
      target.x + Math.cos(azimuth) * horizontal,
      target.y + Math.sin(shot.pitch) * shot.radius,
      target.z + Math.sin(azimuth) * horizontal,
    );
    // Centimetre-separated Paris panes need depth precision at city distances.
    this.pipeline.camera.near = EIFFEL_CAMERA_NEAR;
    this.pipeline.camera.fov = shot.fov;
    this.pipeline.camera.lookAt(target);
    this.pipeline.camera.updateProjectionMatrix();
  }

  private updateLightRig(lightT: number, motionT = lightT, cinematicSeconds?: number) {
    const parisEnding = this.eiffel && cinematicSeconds !== undefined ? sampleEiffelCinematicAtmosphere(lightT, cinematicSeconds, this.wonder) : undefined;
    const light = parisEnding?.light ?? lightStateAt(lightT, this.wonder);
    // Era/place grounding (Spec 08): Giza re-derives its sun path, sky, fog,
    // and ambient tints from the typed scene description rather than the
    // generic wonder palette.
    const sky = this.giza ? sampleGizaSky(lightT) : undefined;
    const downlandSky = this.stonehenge ? sampleStonehengeSky(lightT) : undefined;
    const riftSky = this.petra ? samplePetraSky(lightT) : undefined;
    const valleySky = this.colosseum ? sampleColosseumSky(lightT) : undefined;
    const harbourSky = this.sydney ? sampleSydneySky(lightT) : undefined;
    const parisSky = this.eiffel ? parisEnding?.sky ?? sampleEiffelSky(lightT) : undefined;
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
      // God-ray density follows the typed dust haze: strongest at dawn/dusk.
      this.pipeline.setAtmosphere(sky.haze);
      this.pipeline.setShadowSoftness(0);
    } else if (downlandSky) {
      const sun = stonehengeSunStateAt(lightT);
      light.sun.azimuth = sun.azimuth;
      light.sun.elevation = sun.elevation;
      light.sun.color = downlandSky.sunTint;
      light.sky = downlandSky.horizon;
      light.fog = downlandSky.horizon;
      // Broad neutral skylight keeps the stone faces readable against the
      // solstice backlight; the authored key still owns the long axis shadows.
      light.ambient.skyColor = '#c5cdd4';
      light.ambient.intensity = Math.max(0.64, light.ambient.intensity + 0.2);
      // Target data owns the humid aerial perspective. Keep it below the old
      // global wash so the blue upper dome survives the cinematic grade.
      this.pipeline.setAtmosphere(downlandSky.haze);
      // Low-sun fill: dusk/dawn key is warm and raking. Keep the key strong
      // enough that the solstice throw on the turf stays a hard axis line.
      if (sun.elevation < 22) {
        const dusk = Math.min(1, (22 - sun.elevation) / 18);
        light.ambient.intensity = Math.min(0.8, light.ambient.intensity + dusk * 0.12);
        light.sun.intensity *= 1 - dusk * 0.1;
        this.pipeline.setShadowSoftness(dusk * 0.28);
      } else {
        this.pipeline.setShadowSoftness(0);
      }
    } else if (riftSky) {
      const sun = petraSunStateAt(lightT);
      light.sun.azimuth = sun.azimuth;
      light.sun.elevation = sun.elevation;
      light.sun.color = riftSky.sunTint;
      // Bias the clear/background toward zenith blue so the Siq never reads as a black void.
      light.sky = riftSky.zenith;
      light.fog = riftSky.horizon;
      light.ambient.skyColor = riftSky.zenith;
      // Keep haze low so the Siq still reads as open air under a dry blue sky.
      this.pipeline.setAtmosphere(Math.min(0.09, riftSky.haze * 0.65));
      light.ambient.intensity = Math.min(0.78, light.ambient.intensity + 0.28);
      light.sun.intensity = Math.max(light.sun.intensity, 1.15);
      if (sun.elevation < 24) {
        const dusk = Math.min(1, (24 - sun.elevation) / 16);
        light.ambient.intensity = Math.min(0.82, light.ambient.intensity + dusk * 0.08);
        light.sun.intensity *= 1 - dusk * 0.08;
        this.pipeline.setShadowSoftness(dusk * 0.4);
      } else {
        this.pipeline.setShadowSoftness(0);
      }
    } else if (valleySky) {
      Object.assign(light, colosseumLightState(valleySky));
      this.pipeline.setAtmosphere(valleySky.haze * 0.82);
      this.pipeline.setShadowSoftness(clamp((22 - valleySky.astronomy.sun.elevationDegrees) / 16) * .4);
      this.celestialDiagnostics = {
        t: valleySky.t,
        julianDayUt1: valleySky.astronomy.julianDayUt1,
        calendar: 'Julian', timeScale: 'UT1', angularScale: 2.4,
        sun: valleySky.astronomy.sun, moon: valleySky.astronomy.moon,
        key: light.keyLight ? 'moon' : 'sun',
        constructionT: colosseumFilmAt(lightT).constructionT,
        workComplete: colosseumFilmAt(lightT).constructionT === 1,
        keyVisibility: (light.keyLight ?? light.sun).visibility,
      };
    } else if (harbourSky) {
      const sun = sydneySunStateAt(lightT);
      light.sun.azimuth = sun.azimuth;
      light.sun.elevation = sun.elevation;
      light.sun.color = harbourSky.sunTint;
      light.sky = harbourSky.horizon;
      light.fog = harbourSky.horizon;
      light.ambient.skyColor = harbourSky.zenith;
      this.pipeline.setAtmosphere(harbourSky.haze);
      light.ambient.intensity = 0.82 - light.emissive * 0.3;
      light.sun.intensity = Math.max(1.65, light.sun.intensity) * (1 - light.emissive * 0.7);
      if (sun.elevation < 18 || light.emissive > 0) {
        const dusk = Math.min(1, Math.max((18 - sun.elevation) / 14, light.emissive));
        light.ambient.intensity = Math.min(0.7, light.ambient.intensity + dusk * 0.12);
        light.sun.intensity *= 1 - dusk * 0.18;
        this.pipeline.setShadowSoftness(dusk * 0.55);
      } else {
        this.pipeline.setShadowSoftness(0);
      }
    } else if (parisEnding) {
      this.pipeline.setAtmosphere(parisEnding.sky.haze);
      this.pipeline.setShadowSoftness(parisEnding.shadowSoftness);
    } else if (parisSky) {
      const sun = eiffelSunStateAt(lightT);
      light.sun.azimuth = sun.azimuth;
      light.sun.elevation = sun.elevation;
      light.sun.color = parisSky.sunTint;
      light.sky = parisSky.horizon;
      light.fog = parisSky.horizon;
      light.ambient.skyColor = parisSky.zenith;
      this.pipeline.setAtmosphere(parisSky.haze);
      // Neutral fill keeps painted iron legible on the shaded face.
      light.ambient.skyColor = '#c6ccd0';
      light.ambient.intensity = Math.min(0.76, light.ambient.intensity + 0.24);
      if (sun.elevation < 18 || light.emissive > 0) {
        const dusk = Math.min(1, Math.max((18 - sun.elevation) / 14, light.emissive));
        light.ambient.intensity = Math.min(0.84, light.ambient.intensity + dusk * 0.14);
        light.sun.intensity *= 1 - dusk * 0.06;
        if (dusk > 0.6) light.sun.color = '#c8d0e8';
        this.pipeline.setShadowSoftness(dusk * 0.45);
      } else {
        this.pipeline.setShadowSoftness(0);
      }
    }
    if (downlandSky) {
      this.pipeline.setEnvironmentNeutralizers('#c5cdc9', '#e8eef4', '#5e7348');
    } else if (riftSky) {
      this.pipeline.setEnvironmentNeutralizers('#cbb49a', '#efe6d8', '#a35c38');
    } else if (valleySky) {
      const night = clamp(-valleySky.astronomy.sun.elevationDegrees / 12);
      this.pipeline.setEnvironmentNeutralizers(valleySky.fogNeutralizer,
        lerpColor('#dbe5ef', '#8a9bb5', night), lerpColor('#727767', '#4a566b', night));
    } else if (harbourSky) {
      this.pipeline.setEnvironmentNeutralizers('#448ebf', '#d8e6f0', '#8a7a6a');
    } else if (parisSky) {
      this.pipeline.setEnvironmentNeutralizers('#6a92b8', '#d9d6d0', '#a2947c');
    } else {
      this.pipeline.setEnvironmentNeutralizers();
    }
    const sunDirection = this.pipeline.updateLight(light);
    if (this.colosseum) applyColosseumShadow(this.pipeline.sun, this.pipeline.keyLightDirection);
    if (this.stonehenge) applyStonehengeShadow(this.pipeline.sun, sunDirection);
    // Deterministic detail time (water ripple), phased from playback t.
    updateMaterialDetailTime(this.materials, motionT);
    const waterSky = sky ?? valleySky ?? harbourSky ?? parisSky;
    if (waterSky) updateWaterSky(this.materials, waterSky, sunDirection);
    return { light, sky, downlandSky, riftSky, valleySky, harbourSky, parisSky, sunDirection };
  }

  private finishFrame(filmTime: number, eiffelShortFilm = false): void {
    // Rank people against this frame's final camera and current route poses,
    // including paused seeks and ambient camera movement.
    this.eiffel?.setCrowdCamera(this.pipeline.camera, this.viewportHeight, eiffelShortFilm);
    // Grain seed: playback t in cinematic mode (scrub-deterministic), elapsed
    // wall time in ambient mode (the documented wall-clock exception).
    this.pipeline.render(filmTime);
    const diagnostics = readRendererDiagnostics(this.pipeline.renderer);
    window.__WONDERFORGE_RENDERER__ = diagnostics;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      renderer: diagnostics,
      ...(this.colosseum ? { colosseumCelestial: this.celestialDiagnostics } : {}),
      ...(this.eiffel ? {eiffelLongLoad:this.eiffel.longLoadDiagnostics,eiffelCrowd:this.eiffel.crowdDiagnostics,eiffelLighting:this.eiffel.lightingDiagnostics,eiffelGroundPlant:this.eiffel.groundPlantDiagnostics} : {}),
      camera: {
        position: this.pipeline.camera.position.toArray(),
        direction: this.pipeline.camera.getWorldDirection(new Vector3()).toArray(),
        fov: this.pipeline.camera.fov,
        aspect: this.pipeline.camera.aspect,
        near: this.pipeline.camera.near,
      },
      scene: this.worldKind === 'giza'
        ? 'giza-reference'
        : this.worldKind === 'stonehenge'
          ? 'stonehenge-reference'
          : this.worldKind === 'petra'
            ? 'petra-reference'
            : this.worldKind === 'colosseum'
              ? 'colosseum-reference'
              : this.worldKind === 'sydney'
                ? 'sydney-opera-house-reference'
                : this.worldKind === 'eiffel'
                  ? 'eiffel-tower-reference'
                : 'legacy-fallback',
    };
    this.pipeline.renderer.domElement.dataset.rendererDiagnostics = JSON.stringify(diagnostics);
  }

  update(constructionT: number, cameraT: number, lightT: number, eiffelEditCamera?: { edit: EiffelFilmEdit; t: number }): void {
    const editedFilm = this.eiffel && eiffelEditCamera ? sampleEiffelFilmEdit(eiffelEditCamera.edit, eiffelEditCamera.t) : undefined;
    const film = this.eiffel ? editedFilm ?? sampleEiffelFilm(lightT) : null;
    const { light, sky, downlandSky, riftSky, valleySky, harbourSky, parisSky, sunDirection } = this.updateLightRig(film?.productionT ?? lightT, film?.motionT ?? lightT, eiffelEditCamera?.edit === 'cinematic' ? eiffelEditCamera.t * 180 : undefined);
    if (this.giza && sky) {
      this.updateGizaCamera(cameraT, sky.fogStretch);
      this.giza.update(constructionT, light, sunDirection, sky);
    } else if (this.stonehenge) {
      this.updateStonehengeCamera(cameraT, downlandSky?.fogStretch);
      this.stonehenge.update(constructionT, light, sunDirection, downlandSky!);
    } else if (this.petra) {
      this.updatePetraCamera(cameraT, riftSky?.fogStretch);
      this.petra.update(constructionT, light, sunDirection, riftSky!);
    } else if (this.colosseum) {
      this.updateColosseumCamera(cameraT, valleySky?.fogStretch);
      this.colosseum.update(colosseumFilmAt(constructionT).constructionT, light, sunDirection, valleySky!, this.pipeline.camera);
    } else if (this.sydney) {
      this.updateSydneyCamera(cameraT, harbourSky?.fogStretch);
      this.sydney.update(constructionT, light, sunDirection, harbourSky!);
    } else if (this.eiffel) {
      this.updateEiffelCamera(cameraT, parisSky?.fogStretch, true, eiffelEditCamera);
      this.eiffel.update(constructionT, light, sunDirection, parisSky!, editedFilm);
    } else if (this.legacy) {
      this.updateLegacyCamera(cameraT);
      this.legacy.update(constructionT);
    }
    this.finishFrame(lightT, eiffelEditCamera?.edit === 'cinematic');
  }

  /**
   * Ambient hero mode (Spec 05 §Home): finished scene, continuous closed
   * orbit, breathing daylight — seamless forever, no periodic snap.
   */
  updateAmbient(elapsedSeconds: number, lightT: number): void {
    const { light, sky, downlandSky, riftSky, valleySky, harbourSky, parisSky, sunDirection } = this.updateLightRig(lightT);
    if (this.giza && sky) {
      this.updateAmbientCamera(elapsedSeconds);
      this.giza.update(1, light, sunDirection, sky);
    } else if (this.stonehenge) {
      this.updateStonehengeCamera(0.86, downlandSky?.fogStretch, elapsedSeconds);
      this.stonehenge.update(1, light, sunDirection, downlandSky!);
    } else if (this.petra) {
      this.updatePetraCamera((elapsedSeconds / 90) % 1, riftSky?.fogStretch);
      this.petra.update(1, light, sunDirection, riftSky!);
    } else if (this.colosseum) {
      this.updateColosseumCamera(0.86, valleySky?.fogStretch, elapsedSeconds);
      this.colosseum.update(1, light, sunDirection, valleySky!, this.pipeline.camera);
    } else if (this.sydney) {
      this.updateSydneyCamera((elapsedSeconds / 90) % 1, harbourSky?.fogStretch);
      this.sydney.update(1, light, sunDirection, harbourSky!);
    } else if (this.eiffel) {
      this.updateEiffelCamera(0.92, parisSky?.fogStretch, false, undefined, elapsedSeconds);
      this.eiffel.update(1, light, sunDirection, parisSky!);
    } else if (this.legacy) {
      this.updateLegacyCamera((elapsedSeconds / 90) % 1);
      this.legacy.update(1);
    }
    this.finishFrame(elapsedSeconds % 64);
  }

  dispose(): void {
    this.giza?.dispose();
    this.stonehenge?.dispose();
    this.petra?.dispose();
    this.colosseum?.dispose();
    this.sydney?.dispose();
    this.eiffel?.dispose();
    this.legacy?.dispose();
    for (const material of this.materials.all) material.dispose();
    this.pipeline.dispose();
    delete window.__WONDERFORGE_RENDERER__;
    delete window.__THREE_GAME_DIAGNOSTICS__;
  }
}
