import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { PetraConstructionPlan } from '../../data/petraTypes';
import {
  petraVerticalHalfExtent,
  type ActivePetraOperation,
} from '../../engine/petraConstruction';
import { petraTerrainHeightAt } from '../../engine/petraTerrain';
import type { MaterialLibrary } from './MaterialLibrary';

const MAX_OPERATIONS = 12;
const WORKERS_PER = 3;
const UP = new Vector3(0, 1, 0);
const YAW_AXIS = new Vector3(0, 1, 0);
const LEAN_AXIS = new Vector3(1, 0, 0);

export class PetraWorkSystem {
  readonly group = new Group();
  private readonly bodyGeometry = new CylinderGeometry(0.26, 0.36, 0.98, 6);
  private readonly headGeometry = new SphereGeometry(0.24, 7, 5);
  private readonly legGeometry = new CylinderGeometry(0.07, 0.085, 0.62, 5);
  private readonly armGeometry = new CylinderGeometry(0.85, 1, 1, 5, 1, true);
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly dustGeometry = new SphereGeometry(0.5, 7, 4);
  private readonly bodies: InstancedMesh;
  private readonly heads: InstancedMesh;
  private readonly legs: InstancedMesh;
  private readonly arms: InstancedMesh;
  private readonly sledDecks: InstancedMesh;
  private readonly sledRunners: InstancedMesh;
  private readonly chuteLogs: InstancedMesh;
  private readonly dust: InstancedMesh;
  private readonly materials: MeshStandardMaterial[] = [];

  constructor(materials: MaterialLibrary, _plan: PetraConstructionPlan) {
    this.group.name = 'petra-work-system';
    const skin = materials.skin.clone();
    const linen = materials.linen.clone();
    linen.color.set('#c4a07c');
    const timber = materials.wood.clone();
    timber.color.set('#6e472a');
    const dustMat = materials.sand.clone();
    dustMat.color.set('#c9a06a');
    dustMat.transparent = true;
    dustMat.opacity = 0.32;
    dustMat.depthWrite = false;
    this.materials.push(skin, linen, timber, dustMat);
    this.bodies = new InstancedMesh(this.bodyGeometry, linen, MAX_OPERATIONS * WORKERS_PER);
    this.heads = new InstancedMesh(this.headGeometry, skin, MAX_OPERATIONS * WORKERS_PER);
    this.legs = new InstancedMesh(this.legGeometry, linen, MAX_OPERATIONS * WORKERS_PER * 2);
    this.arms = new InstancedMesh(this.armGeometry, skin, MAX_OPERATIONS * WORKERS_PER * 2);
    this.sledDecks = new InstancedMesh(this.boxGeometry, timber, MAX_OPERATIONS);
    this.sledRunners = new InstancedMesh(this.boxGeometry, timber, MAX_OPERATIONS * 2);
    this.chuteLogs = new InstancedMesh(this.boxGeometry, timber, MAX_OPERATIONS * 4);
    this.dust = new InstancedMesh(this.dustGeometry, dustMat, MAX_OPERATIONS * 2);
    for (const mesh of [
      this.bodies, this.heads, this.legs, this.arms,
      this.sledDecks, this.sledRunners, this.chuteLogs,
    ]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  update(operations: ActivePetraOperation[], t: number): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const leanQuat = new Quaternion();
    const cellPos = new Vector3();
    const midpoint = new Vector3();
    const forward = new Vector3();
    const lateral = new Vector3();
    let bodies = 0;
    let legs = 0;
    let arms = 0;
    let sleds = 0;
    let runners = 0;
    let chutes = 0;
    let dust = 0;

    const compose = (pos: Vector3, yaw: number, scale: Vector3, lean = 0) => {
      quaternion.setFromAxisAngle(YAW_AXIS, yaw);
      if (lean !== 0) {
        leanQuat.setFromAxisAngle(LEAN_AXIS, lean);
        quaternion.multiply(leanQuat);
      }
      matrix.compose(pos, quaternion, scale);
    };
    const alongScratch = new Vector3();
    const composeAlong = (from: Vector3, to: Vector3, radius: number) => {
      alongScratch.copy(to).sub(from);
      const length = Math.max(0.05, alongScratch.length());
      quaternion.setFromUnitVectors(UP, alongScratch.multiplyScalar(1 / length));
      midpoint.copy(from).lerp(to, 0.5);
      matrix.compose(midpoint, quaternion, new Vector3(radius, length, radius));
    };

    for (const operation of operations) {
      const { cell, state } = operation;
      cellPos.set(...state.position);
      const yaw = state.rotation[1];
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const halfY = petraVerticalHalfExtent(cell.dimensions);
      const bottom = state.position[1] - halfY;
      const hauling = state.mechanism === 'sled';
      const cutting = state.phase === 'cut';
      const lowering = state.phase === 'lowered';

      if (hauling) {
        compose(new Vector3(cellPos.x, bottom - state.sledLift * 0.15 + 0.16, cellPos.z), yaw, new Vector3(
          Math.max(cell.dimensions[0], 1.1) + 0.35,
          0.12,
          Math.max(cell.dimensions[2], 1.2) + 0.55,
        ));
        this.sledDecks.setMatrixAt(sleds, matrix);
        sleds += 1;
        for (const side of [-1, 1] as const) {
          compose(
            new Vector3(cellPos.x + lateral.x * side * 0.38, bottom - state.sledLift + 0.07, cellPos.z),
            yaw,
            new Vector3(0.12, 0.12, Math.max(cell.dimensions[2], 1.3) + 0.4),
          );
          this.sledRunners.setMatrixAt(runners, matrix);
          runners += 1;
        }
      }

      if (lowering && state.support === 'timber-chute') {
        const side = cellPos.x < 0 ? -1 : 1;
        for (let log = 0; log < 3 && chutes < MAX_OPERATIONS * 4; log += 1) {
          compose(
            new Vector3(side * (12.2 + log * 0.15), lerp(cellPos.y, 1.2, log / 3), -1.1 - log * 1.4),
            0.4 * side,
            new Vector3(0.22, 0.22, 3.4),
          );
          this.chuteLogs.setMatrixAt(chutes, matrix);
          chutes += 1;
        }
      }

      for (let worker = 0; worker < WORKERS_PER && bodies < MAX_OPERATIONS * WORKERS_PER; worker += 1) {
        const along = cutting ? 1.1 + worker * 0.55 : hauling ? -1.35 - worker * 0.7 : 0.8 + worker * 0.45;
        const side = worker === 1 ? 0.55 : worker === 2 ? -0.55 : 0;
        const ground = petraTerrainHeightAt(
          cellPos.x + forward.x * along + lateral.x * side,
          cellPos.z + forward.z * along + lateral.z * side,
        );
        const x = cellPos.x + forward.x * along + lateral.x * side;
        const z = cellPos.z + forward.z * along + lateral.z * side;
        const y = cutting || lowering ? Math.max(ground, bottom + 0.2) : ground;
        const bob = Math.sin(t * 160 + bodies * 1.7) * 0.035;
        const lean = cutting ? 0.38 : hauling ? 0.3 : 0.18;
        compose(new Vector3(x, y + 0.98 + bob, z), yaw, new Vector3(1.22, 1.1, 1.22), lean);
        this.bodies.setMatrixAt(bodies, matrix);
        compose(new Vector3(x + forward.x * lean * 0.5, y + 1.62 + bob, z + forward.z * lean * 0.5), yaw, new Vector3(1.22, 1.22, 1.22));
        this.heads.setMatrixAt(bodies, matrix);
        const reach = new Vector3(x + forward.x * 0.5, y + 1.08 + bob, z + forward.z * 0.5);
        for (const legSide of [-1, 1] as const) {
          compose(new Vector3(x + lateral.x * legSide * 0.12, y + 0.31, z + lateral.z * legSide * 0.12), yaw, new Vector3(1, 1, 1));
          this.legs.setMatrixAt(legs, matrix);
          legs += 1;
        }
        for (const armSide of [-1, 1] as const) {
          const shoulder = new Vector3(x + lateral.x * armSide * 0.2, y + 1.28 + bob, z + lateral.z * armSide * 0.2);
          composeAlong(shoulder, reach, 0.05);
          this.arms.setMatrixAt(arms, matrix);
          arms += 1;
        }
        bodies += 1;
      }

      if (state.contactDust && state.contactDustAmount > 0.08 && dust < MAX_OPERATIONS * 2) {
        compose(
          new Vector3(cellPos.x, bottom + 0.06, cellPos.z),
          yaw,
          new Vector3(1.1 + state.contactDustAmount, 0.16, 0.9 + state.contactDustAmount),
        );
        this.dust.setMatrixAt(dust, matrix);
        dust += 1;
      }
    }

    const counts: Array<[InstancedMesh, number]> = [
      [this.bodies, bodies],
      [this.heads, bodies],
      [this.legs, legs],
      [this.arms, arms],
      [this.sledDecks, sleds],
      [this.sledRunners, runners],
      [this.chuteLogs, chutes],
      [this.dust, dust],
    ];
    for (const [mesh, count] of counts) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.bodyGeometry.dispose();
    this.headGeometry.dispose();
    this.legGeometry.dispose();
    this.armGeometry.dispose();
    this.boxGeometry.dispose();
    this.dustGeometry.dispose();
    for (const mesh of [
      this.bodies, this.heads, this.legs, this.arms,
      this.sledDecks, this.sledRunners, this.chuteLogs, this.dust,
    ]) mesh.dispose();
    for (const material of this.materials) material.dispose();
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
