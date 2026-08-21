import { Group, type Vector3 } from 'three';
import { GIZA_CONSTRUCTION } from '../../data/gizaConstruction';
import type { SkyKeyframe } from '../../data/gizaSky';
import type { LightState } from '../../engine/daynight';
import { BlockSystem } from './BlockSystem';
import { GizaEnvironment } from './Environment';
import { FieldBirds } from './FieldBirds';
import type { MaterialLibrary } from './MaterialLibrary';
import { WorkerSystem } from './WorkerSystem';

export class GizaWorld {
  readonly group = new Group();
  private readonly environment: GizaEnvironment;
  private readonly blocks: BlockSystem;
  private readonly workers: WorkerSystem;
  private readonly fieldBirds: FieldBirds;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'giza-reference-world';
    this.environment = new GizaEnvironment(GIZA_CONSTRUCTION, materials);
    this.blocks = new BlockSystem(GIZA_CONSTRUCTION, materials);
    this.workers = new WorkerSystem(materials);
    this.fieldBirds = new FieldBirds();
    this.group.add(
      this.environment.group,
      this.blocks.group,
      this.workers.group,
      this.fieldBirds.group,
    );
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: SkyKeyframe): void {
    const active = this.blocks.update(t);
    this.workers.update(active, t);
    this.environment.update(t, light, sunDirection, sky);
    this.fieldBirds.update(t);
  }

  dispose(): void {
    this.environment.dispose();
    this.blocks.dispose();
    this.workers.dispose();
    this.fieldBirds.dispose();
  }
}
