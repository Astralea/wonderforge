import { Group, type Vector3 } from 'three';
import { PETRA_CONSTRUCTION } from '../../data/petraConstruction';
import type { PetraSkySample } from '../../data/petraSky';
import type { LightState } from '../../engine/daynight';
import type { MaterialLibrary } from './MaterialLibrary';
import { PetraEnvironment } from './PetraEnvironment';
import { PetraSkyDome } from './PetraSkyDome';
import { PetraStoneSystem } from './PetraStoneSystem';
import { PetraWorkSystem } from './PetraWorkSystem';

export class PetraWorld {
  readonly group = new Group();
  private readonly sky: PetraSkyDome;
  private readonly environment: PetraEnvironment;
  private readonly stones: PetraStoneSystem;
  private readonly work: PetraWorkSystem;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'petra-reference-world';
    this.sky = new PetraSkyDome();
    this.environment = new PetraEnvironment(materials);
    this.stones = new PetraStoneSystem(PETRA_CONSTRUCTION, materials);
    this.work = new PetraWorkSystem(materials, PETRA_CONSTRUCTION);
    this.group.add(this.sky.mesh, this.environment.group, this.stones.group, this.work.group);
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: PetraSkySample): void {
    const active = this.stones.update(t);
    this.work.update(active, t);
    this.environment.update(t, light, sky);
    this.sky.update(t, sky, sunDirection);
  }

  dispose(): void {
    this.sky.dispose();
    this.environment.dispose();
    this.stones.dispose();
    this.work.dispose();
  }
}
