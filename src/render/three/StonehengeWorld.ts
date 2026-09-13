import { Group, type Vector3 } from 'three';
import { STONEHENGE_CONSTRUCTION } from '../../data/stonehengeConstruction';
import type { StonehengeSkySample } from '../../data/stonehengeSky';
import type { LightState } from '../../engine/daynight';
import type { MaterialLibrary } from './MaterialLibrary';
import { StonehengeEnvironment } from './StonehengeEnvironment';
import { StonehengeSkyDome } from './StonehengeSkyDome';
import { StonehengeStoneSystem } from './StonehengeStoneSystem';
import { StonehengeWorkSystem } from './StonehengeWorkSystem';

export class StonehengeWorld {
  readonly group = new Group();
  private readonly sky: StonehengeSkyDome;
  private readonly environment: StonehengeEnvironment;
  private readonly stones: StonehengeStoneSystem;
  private readonly work: StonehengeWorkSystem;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'stonehenge-reference-world';
    this.sky = new StonehengeSkyDome();
    this.environment = new StonehengeEnvironment(materials);
    this.stones = new StonehengeStoneSystem(STONEHENGE_CONSTRUCTION, materials);
    this.work = new StonehengeWorkSystem(materials, STONEHENGE_CONSTRUCTION);
    this.group.add(this.sky.mesh, this.environment.group, this.stones.group, this.work.group);
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: StonehengeSkySample): void {
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
