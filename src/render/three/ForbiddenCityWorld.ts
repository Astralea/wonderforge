import { Group, type Vector3 } from 'three';
import type { LightState } from '../../engine/daynight';
import { FORBIDDEN_CITY_DURATION, sampleForbiddenCityConstruction } from '../../engine/forbiddenCityConstruction';
import { ForbiddenCityConstructionSystem } from './ForbiddenCityConstructionSystem';
import { ForbiddenCityEnvironment } from './ForbiddenCityEnvironment';
import { forbiddenCityAssetUrls, loadForbiddenCityAssetSet, type ForbiddenCityAssetUrls } from './forbiddenCityAssets';

/** Unregistered candidate world. It owns the complete authored asset lifecycle,
 * but deliberately adds no registry, playback, UI, camera, or sky behavior. */
export class ForbiddenCityWorld {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private construction: ForbiddenCityConstructionSystem | null = null;
  private environment: ForbiddenCityEnvironment | null = null;
  private disposed = false;
  private lastT = 0;
  private lastLight: LightState | null = null;

  constructor(urls: ForbiddenCityAssetUrls = forbiddenCityAssetUrls()) {
    this.group.name = 'forbidden-city-reference-world-candidate';
    this.group.visible = false;
    this.ready = this.load(urls).catch(error => { this.dispose(); throw error; });
  }

  private async load(urls: ForbiddenCityAssetUrls): Promise<void> {
    const assets = await loadForbiddenCityAssetSet(urls, () => this.disposed);
    if (this.disposed) return;
    if (assets.manifest.nodeTransformConvention !== 'final pose with local geometry') throw Error('Forbidden City kit transform convention missing');
    this.environment = new ForbiddenCityEnvironment(assets.site);
    this.construction = new ForbiddenCityConstructionSystem(assets.kit, assets.construction, assets.manifest);
    this.group.add(this.environment.group, this.construction.group);
    this.group.userData.manifest = assets.manifest;
    this.group.userData.candidate = true;
    this.group.userData.registered = false;
    this.group.userData.ready = true;
    this.group.visible = true;
    if (this.lastLight) this.apply(this.lastT, this.lastLight);
  }

  private apply(t: number, light: LightState): void {
    if (!this.construction || !this.environment) return;
    const seconds = Math.max(0, Math.min(1, t)) * FORBIDDEN_CITY_DURATION;
    const frame = sampleForbiddenCityConstruction(this.construction.manifest, seconds);
    this.construction.update(frame);
    this.environment.update(frame.seconds, light);
    this.group.userData.frame = { seconds: frame.seconds, phase: frame.phase, admission: frame.admission };
  }

  update(t: number, light: LightState, _sunDirection: Vector3): void {
    if (!Number.isFinite(t)) throw Error('Forbidden City world time must be finite');
    this.lastT = t; this.lastLight = light;
    this.apply(t, light);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.environment?.dispose(); this.construction?.dispose();
    this.environment = null; this.construction = null;
    this.group.clear(); this.group.visible = false;
  }
}
