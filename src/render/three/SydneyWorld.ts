import { Group, type Vector3 } from 'three';
import { SYDNEY_CONSTRUCTION } from '../../data/sydneyConstruction';
import type { SydneySkySample } from '../../data/sydneySky';
import type { LightState } from '../../engine/daynight';
import type { MaterialLibrary } from './MaterialLibrary';
import { SydneyEnvironment } from './SydneyEnvironment';
import { SydneySkyDome } from './SydneySkyDome';
import { SydneyStoneSystem } from './SydneyStoneSystem';
import { SydneyWorkSystem } from './SydneyWorkSystem';

export class SydneyWorld {
  readonly group = new Group();
  private readonly sky: SydneySkyDome;
  private readonly environment: SydneyEnvironment;
  private readonly stones: SydneyStoneSystem;
  private readonly work: SydneyWorkSystem;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'sydney-reference-world';
    this.sky = new SydneySkyDome();
    this.environment = new SydneyEnvironment(materials);
    this.stones = new SydneyStoneSystem(SYDNEY_CONSTRUCTION, materials);
    this.work = new SydneyWorkSystem(materials, SYDNEY_CONSTRUCTION);
    this.group.add(this.sky.mesh, this.environment.group, this.stones.group, this.work.group);
  }

  get ready(): Promise<void> {
    return Promise.all([this.environment.ready, this.stones.ready]).then(() => undefined);
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: SydneySkySample): void {
    const active = this.stones.update(t, light.emissive);
    this.work.update(active, t);
    this.environment.update(t, light, sky, sunDirection.y);
    this.sky.update(t, sky, sunDirection);
  }

  dispose(): void {
    this.sky.dispose();
    this.environment.dispose();
    this.stones.dispose();
    this.work.dispose();
  }
}
