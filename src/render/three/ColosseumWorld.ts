import { Group, PerspectiveCamera, type Camera, type Vector3 } from 'three';
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
  private readonly content = new Group();
  private readonly environment: ColosseumEnvironment;
  private readonly stones: ColosseumStoneSystem;
  private readonly work: ColosseumWorkSystem;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'colosseum-reference-world';
    this.sky = new ColosseumSkyDome();
    this.environment = new ColosseumEnvironment(materials);
    this.stones = new ColosseumStoneSystem(COLOSSEUM_CONSTRUCTION, materials);
    this.work = new ColosseumWorkSystem(materials, COLOSSEUM_CONSTRUCTION);
    // Authoring uses east/up/north. Three's right-handed geographic world uses
    // east/up/south; reflect content once, together with the camera and light.
    // Individual structural transforms and the pure construction graph stay intact.
    this.content.name = 'colosseum-geographic-content';
    this.content.scale.z = -1;
    this.content.add(this.environment.group, this.stones.group, this.work.group);
    this.group.add(this.sky.mesh, this.content);
  }

  get ready(): Promise<void> {
    return Promise.all([this.environment.ready, this.sky.ready]).then(() => {});
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: ColosseumSkySample, camera?: Camera): void {
    const compact = camera instanceof PerspectiveCamera && camera.aspect < .72;
    this.stones.setCompactDetail(compact);
    this.work.setCompactDetail(compact);
    const active = this.stones.update(t);
    this.work.update(active, t);
    this.environment.update(t, light, sky, camera);
    this.sky.update(t, sky, sunDirection);
  }

  dispose(): void {
    this.sky.dispose();
    this.environment.dispose();
    this.stones.dispose();
    this.work.dispose();
  }
}
