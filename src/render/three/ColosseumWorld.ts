import { Group, type Vector3 } from 'three';
import { COLOSSEUM_CONSTRUCTION } from '../../data/colosseumConstruction';
import type { ColosseumSkySample } from '../../data/colosseumSky';
import type { LightState } from '../../engine/daynight';
import type { MaterialLibrary } from './MaterialLibrary';
import { ColosseumEnvironment } from './ColosseumEnvironment';
import { ColosseumSkyDome } from './ColosseumSkyDome';
import { ColosseumStoneSystem } from './ColosseumStoneSystem';
import { ColosseumWorkSystem } from './ColosseumWorkSystem';

export class ColosseumWorld {
  readonly group = new Group();
  private readonly sky: ColosseumSkyDome;
  private readonly environment: ColosseumEnvironment;
  private readonly stones: ColosseumStoneSystem;
  private readonly work: ColosseumWorkSystem;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'colosseum-reference-world';
    this.sky = new ColosseumSkyDome();
    this.environment = new ColosseumEnvironment(materials);
    this.stones = new ColosseumStoneSystem(COLOSSEUM_CONSTRUCTION, materials);
    this.work = new ColosseumWorkSystem(materials, COLOSSEUM_CONSTRUCTION);
    this.group.add(this.sky.mesh, this.environment.group, this.stones.group, this.work.group);
  }

  get ready(): Promise<void> {
    return this.environment.ready;
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: ColosseumSkySample): void {
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
