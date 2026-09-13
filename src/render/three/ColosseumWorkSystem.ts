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
import type { ColosseumConstructionPlan } from '../../data/colosseumTypes';
import {
  colosseumCenteringAt,
  colosseumCraneRigAt,
  colosseumScaffoldsAt,
  colosseumVerticalHalfExtent,
  type ActiveColosseumOperation,
} from '../../engine/colosseumConstruction';
import { COLOSSEUM_TREADWHEEL_RADIUS, colosseumLabourAt, type ColosseumCrewPose } from '../../engine/colosseumCrew';
import { colosseumTerrainHeightAt } from '../../engine/colosseumTerrain';
import type { MaterialLibrary } from './MaterialLibrary';

const MAX_OPERATIONS = 24;
const MAX_WORKERS = 256;
const FIGURE = 4.4;
const MAX_SCAFFOLD_POLES = 1280;
const MAX_SCAFFOLD_DECKS = 24;
const MAX_SCAFFOLD_BRACES = 48;
const MAX_CENTERING = 80;
const UP = new Vector3(0, 1, 0);
const YAW_AXIS = new Vector3(0, 1, 0);
const LEAN_AXIS = new Vector3(1, 0, 0);

export class ColosseumWorkSystem {
  readonly group = new Group();
  private readonly bodyGeometry = new CylinderGeometry(0.32, 0.42, 0.98, 6);
  private readonly headGeometry = new SphereGeometry(0.28, 7, 5);
  private readonly legGeometry = new CylinderGeometry(0.07, 0.085, 0.62, 5);
  private readonly armGeometry = new CylinderGeometry(0.85, 1, 1, 5, 1, true);
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly poleGeometry = new CylinderGeometry(0.08, 0.1, 1, 6);
  private readonly wheelGeometry = new CylinderGeometry(1, 1, 0.18, 12);
  private readonly dustGeometry = new SphereGeometry(0.5, 7, 4);
  private readonly bodies: InstancedMesh;
  private readonly heads: InstancedMesh;
  private readonly legs: InstancedMesh;
  private readonly arms: InstancedMesh;
  private readonly wagonDecks: InstancedMesh;
  private readonly wagonWheels: InstancedMesh;
  private readonly cranePoles: InstancedMesh;
  private readonly craneBooms: InstancedMesh;
  private readonly treadwheels: InstancedMesh;
  private readonly ropes: InstancedMesh;
  private readonly scaffoldPoles: InstancedMesh;
  private readonly scaffoldDecks: InstancedMesh;
  private readonly scaffoldBraces: InstancedMesh;
  private readonly centering: InstancedMesh;
  private readonly dust: InstancedMesh;
  private readonly materials: MeshStandardMaterial[] = [];

  constructor(materials: MaterialLibrary, _plan: ColosseumConstructionPlan) {
    this.group.name = 'colosseum-work-system';
    const skin = materials.skin.clone();
    const linen = materials.linen.clone();
    linen.color.set('#c94f3c');
    const timber = materials.wood.clone();
    timber.color.set('#6a4328');
    const ropeMat = materials.rope.clone();
    ropeMat.color.set('#7a5a32');
    const dustMat = materials.sand.clone();
    dustMat.color.set('#c4a882');
    dustMat.transparent = true;
    dustMat.opacity = 0.3;
    dustMat.depthWrite = false;
    this.materials.push(skin, linen, timber, ropeMat, dustMat);
    this.bodies = new InstancedMesh(this.bodyGeometry, linen, MAX_WORKERS);
    this.heads = new InstancedMesh(this.headGeometry, skin, MAX_WORKERS);
    this.legs = new InstancedMesh(this.legGeometry, linen, MAX_WORKERS * 2);
    this.arms = new InstancedMesh(this.armGeometry, skin, MAX_WORKERS * 2);
    this.wagonDecks = new InstancedMesh(this.boxGeometry, timber, MAX_OPERATIONS);
    this.wagonWheels = new InstancedMesh(this.wheelGeometry, timber, MAX_OPERATIONS * 4);
    this.cranePoles = new InstancedMesh(this.poleGeometry, timber, MAX_OPERATIONS * 2);
    this.craneBooms = new InstancedMesh(this.boxGeometry, timber, MAX_OPERATIONS);
    this.treadwheels = new InstancedMesh(this.wheelGeometry, timber, MAX_OPERATIONS);
    this.ropes = new InstancedMesh(this.armGeometry, ropeMat, MAX_OPERATIONS * 4);
    this.scaffoldPoles = new InstancedMesh(this.poleGeometry, timber, MAX_SCAFFOLD_POLES);
    this.scaffoldDecks = new InstancedMesh(this.boxGeometry, timber, MAX_SCAFFOLD_DECKS);
    this.scaffoldBraces = new InstancedMesh(this.boxGeometry, timber, MAX_SCAFFOLD_BRACES);
    this.centering = new InstancedMesh(this.boxGeometry, timber, MAX_CENTERING);
    this.dust = new InstancedMesh(this.dustGeometry, dustMat, MAX_OPERATIONS * 2);
    for (const mesh of [
      this.bodies, this.heads, this.legs, this.arms,
      this.wagonDecks, this.wagonWheels, this.cranePoles, this.craneBooms, this.treadwheels,
      this.ropes, this.scaffoldPoles, this.scaffoldDecks, this.scaffoldBraces, this.centering,
    ]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  update(operations: ActiveColosseumOperation[], t: number): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const leanQuat = new Quaternion();
    const spinQuat = new Quaternion();
    const axle = new Vector3();
    const partPos = new Vector3();
    const midpoint = new Vector3();
    const forward = new Vector3();
    const lateral = new Vector3();
    let bodies = 0;
    let legs = 0;
    let arms = 0;
    let decks = 0;
    let wheels = 0;
    let poles = 0;
    let booms = 0;
    let tread = 0;
    let ropes = 0;
    let frames = 0;
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
    const composeWheel = (pos: Vector3, yaw: number, spin: number, radius: number, thickness: number) => {
      axle.set(Math.cos(yaw), 0, -Math.sin(yaw));
      spinQuat.setFromAxisAngle(UP, spin);
      quaternion.setFromUnitVectors(UP, axle);
      quaternion.multiply(spinQuat);
      matrix.compose(pos, quaternion, new Vector3(radius, thickness, radius));
    };
    const labour = colosseumLabourAt(operations, t);
    const motion = new Map(labour.rigs.map((rig) => [rig.partId, rig]));
    const placeWorker = (crew: ColosseumCrewPose) => {
      if (bodies >= MAX_WORKERS) return;
      const [x, footY, z] = crew.position;
      const yaw = crew.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const lx = Math.cos(yaw);
      const lz = -Math.sin(yaw);
      const climb = crew.role === 'climber';
      const bob = Math.abs(Math.sin(crew.gait)) * (climb ? 0.14 : 0.07) * FIGURE;
      const stride = Math.sin(crew.gait) * (climb ? 0.18 : 0.34) * FIGURE;
      compose(
        new Vector3(x + fx * stride * 0.12, footY + 0.98 * FIGURE + bob, z + fz * stride * 0.12),
        yaw,
        new Vector3(FIGURE, FIGURE * 0.92, FIGURE),
        crew.lean,
      );
      this.bodies.setMatrixAt(bodies, matrix);
      compose(
        new Vector3(
          x + fx * (crew.lean * 0.45 * FIGURE + stride * 0.12),
          footY + 1.6 * FIGURE + bob,
          z + fz * (crew.lean * 0.45 * FIGURE + stride * 0.12),
        ),
        yaw,
        new Vector3(FIGURE, FIGURE, FIGURE),
      );
      this.heads.setMatrixAt(bodies, matrix);
      const hammer = crew.role === 'deck-mason' || crew.role === 'dresser' || crew.role === 'slinger';
      const haul = crew.role === 'hauler' || crew.role === 'tag-line';
      const reach = climb
        ? new Vector3(x + fx * 0.2 * FIGURE, footY + (1.85 + Math.abs(Math.sin(crew.arm)) * 0.85) * FIGURE, z + fz * 0.2 * FIGURE)
        : hammer
        ? new Vector3(x + fx * 0.7 * FIGURE, footY + (1.4 + Math.abs(Math.sin(crew.arm)) * 0.7) * FIGURE, z + fz * 0.7 * FIGURE)
        : haul
          ? new Vector3(x + fx * 0.95 * FIGURE, footY + 1.05 * FIGURE + bob, z + fz * 0.95 * FIGURE)
          : new Vector3(x + fx * 0.55 * FIGURE, footY + 1.1 * FIGURE + bob, z + fz * 0.55 * FIGURE);
      for (const legSide of [-1, 1] as const) {
        compose(
          new Vector3(
            x + lx * legSide * 0.12 * FIGURE + fx * stride * legSide,
            footY + 0.31 * FIGURE,
            z + lz * legSide * 0.12 * FIGURE + fz * stride * legSide,
          ),
          yaw,
          new Vector3(FIGURE, FIGURE, FIGURE),
        );
        this.legs.setMatrixAt(legs, matrix);
        legs += 1;
      }
      for (const armSide of [-1, 1] as const) {
        const swing = haul ? 0.08 : Math.sin(crew.gait + (armSide > 0 ? 0 : Math.PI)) * 0.22 * FIGURE;
        const shoulder = new Vector3(
          x + lx * armSide * 0.2 * FIGURE,
          footY + 1.26 * FIGURE + bob,
          z + lz * armSide * 0.2 * FIGURE,
        );
        const hand = hammer
          ? reach
          : new Vector3(reach.x + lx * swing, reach.y, reach.z + lz * swing);
        composeAlong(shoulder, hand, 0.05 * FIGURE);
        this.arms.setMatrixAt(arms, matrix);
        arms += 1;
      }
      bodies += 1;
    };

    let scaffoldPoles = 0;
    let scaffoldDecks = 0;
    let scaffoldBraces = 0;
    for (const bay of colosseumScaffoldsAt(t)) {
      const yaw = bay.yaw;
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const [x, , z] = bay.position;
      const foot = bay.footY;
      if (scaffoldDecks < MAX_SCAFFOLD_DECKS) {
        compose(new Vector3(x, bay.deckY + 0.16, z), yaw, new Vector3(8.8, 0.42, 5.4));
        this.scaffoldDecks.setMatrixAt(scaffoldDecks, matrix);
        scaffoldDecks += 1;
      }
      const corners = [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.6], [2.6, 1.6]] as const;
      for (let lift = 0; lift < bay.segmentCount; lift += 1) {
        const cy = foot + lift * bay.segmentLength + bay.segmentLength / 2;
        for (const [ox, oz] of corners) {
          if (scaffoldPoles >= MAX_SCAFFOLD_POLES) break;
          const px = x + lateral.x * ox + forward.x * oz;
          const pz = z + lateral.z * ox + forward.z * oz;
          compose(new Vector3(px, cy, pz), yaw, new Vector3(12.5, bay.segmentLength, 12.5));
          this.scaffoldPoles.setMatrixAt(scaffoldPoles, matrix);
          scaffoldPoles += 1;
        }
      }
      if (scaffoldBraces < MAX_SCAFFOLD_BRACES - 1) {
        compose(new Vector3(x, foot + bay.height * 0.52, z), yaw, new Vector3(8.2, 0.32, 0.55));
        this.scaffoldBraces.setMatrixAt(scaffoldBraces, matrix);
        scaffoldBraces += 1;
        compose(new Vector3(x, foot + bay.height * 0.52, z), yaw, new Vector3(0.55, 0.32, 5.0));
        this.scaffoldBraces.setMatrixAt(scaffoldBraces, matrix);
        scaffoldBraces += 1;
      }
    }

    for (const bay of colosseumCenteringAt(t)) {
      if (frames + 4 > MAX_CENTERING) break;
      if (bay.heightFactor < 0.2) continue;
      const yaw = bay.yaw;
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      const [sx, sy, sz] = bay.position;
      const ribY = sy - 1.7;
      for (let rib = 0; rib < 4; rib += 1) {
        const along = (rib - 1.5) * 2.2;
        compose(
          new Vector3(sx + forward.x * along * 0.12, ribY, sz + forward.z * along * 0.12),
          yaw,
          new Vector3(0.55, 2.6, bay.span * 0.78),
        );
        this.centering.setMatrixAt(frames, matrix);
        frames += 1;
      }
    }

    for (const operation of operations) {
      const { part, state } = operation;
      partPos.set(...state.position);
      const yaw = state.rotation[1];
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const halfY = colosseumVerticalHalfExtent(part.dimensions);
      const bottom = state.position[1] - halfY;
      const hauling = state.mechanism === 'wagon';
      const rig = colosseumCraneRigAt(part, state);

      if (hauling) {
        compose(new Vector3(partPos.x, bottom - state.wagonLift * 0.2 + 0.42, partPos.z), yaw, new Vector3(
          Math.max(part.dimensions[0], 2.2) + 1.4,
          0.38,
          Math.max(part.dimensions[2], 2.4) + 1.6,
        ));
        this.wagonDecks.setMatrixAt(decks, matrix);
        decks += 1;
        const wagonSpin = motion.get(part.id)?.wagonSpin ?? 0;
        for (const along of [-0.9, 0.9] as const) {
          for (const side of [-1, 1] as const) {
            composeWheel(
              new Vector3(
                partPos.x + forward.x * along + lateral.x * side * 0.85,
                bottom - state.wagonLift + 0.52,
                partPos.z + forward.z * along + lateral.z * side * 0.85,
              ),
              yaw,
              wagonSpin,
              0.72,
              0.22,
            );
            this.wagonWheels.setMatrixAt(wheels, matrix);
            wheels += 1;
          }
        }
        if (ropes < MAX_OPERATIONS * 4) {
          composeAlong(
            new Vector3(partPos.x + forward.x * 1.4, bottom + 0.7, partPos.z + forward.z * 1.4),
            new Vector3(partPos.x + forward.x * 6.2, colosseumTerrainHeightAt(partPos.x, partPos.z) + 1.1 * FIGURE, partPos.z + forward.z * 6.2),
            0.08,
          );
          this.ropes.setMatrixAt(ropes, matrix);
          ropes += 1;
        }
      }

      if (rig) {
        const mastHeight = Math.max(0.8, rig.mastTop[1] - rig.base[1]);
        compose(new Vector3(rig.base[0], rig.base[1] + mastHeight / 2, rig.base[2]), rig.yaw, new Vector3(14, mastHeight, 14));
        this.cranePoles.setMatrixAt(poles, matrix);
        poles += 1;
        compose(
          new Vector3(rig.base[0] + Math.cos(rig.yaw) * 2.1, rig.base[1] + mastHeight * 0.48, rig.base[2] - Math.sin(rig.yaw) * 2.1),
          rig.yaw,
          new Vector3(11, mastHeight * 0.92, 11),
        );
        this.cranePoles.setMatrixAt(poles, matrix);
        poles += 1;
        composeAlong(
          new Vector3(...rig.mastTop),
          new Vector3(...rig.boomTip),
          1.15,
        );
        this.craneBooms.setMatrixAt(booms, matrix);
        booms += 1;
        composeAlong(
          new Vector3(...rig.boomTip),
          new Vector3(...rig.hook),
          0.32,
        );
        this.ropes.setMatrixAt(ropes, matrix);
        ropes += 1;
        composeWheel(
          new Vector3(...rig.treadwheel),
          rig.yaw,
          motion.get(part.id)?.treadwheelSpin ?? 0,
          COLOSSEUM_TREADWHEEL_RADIUS,
          0.38,
        );
        this.treadwheels.setMatrixAt(tread, matrix);
        tread += 1;
      }

      if (state.contactDust && state.contactDustAmount > 0.08 && dust < MAX_OPERATIONS * 2) {
        compose(
          new Vector3(partPos.x, bottom + 0.06, partPos.z),
          yaw,
          new Vector3(1.2 + state.contactDustAmount, 0.16, 1 + state.contactDustAmount),
        );
        this.dust.setMatrixAt(dust, matrix);
        dust += 1;
      }
    }

    for (const crew of labour.crews) placeWorker(crew);

    const counts: Array<[InstancedMesh, number]> = [
      [this.bodies, bodies],
      [this.heads, bodies],
      [this.legs, legs],
      [this.arms, arms],
      [this.wagonDecks, decks],
      [this.wagonWheels, wheels],
      [this.cranePoles, poles],
      [this.craneBooms, booms],
      [this.treadwheels, tread],
      [this.ropes, ropes],
      [this.scaffoldPoles, scaffoldPoles],
      [this.scaffoldDecks, scaffoldDecks],
      [this.scaffoldBraces, scaffoldBraces],
      [this.centering, frames],
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
    this.poleGeometry.dispose();
    this.wheelGeometry.dispose();
    this.dustGeometry.dispose();
    for (const mesh of [
      this.bodies, this.heads, this.legs, this.arms,
      this.wagonDecks, this.wagonWheels, this.cranePoles, this.craneBooms, this.treadwheels,
      this.ropes, this.scaffoldPoles, this.scaffoldDecks, this.scaffoldBraces, this.centering, this.dust,
    ]) mesh.dispose();
    for (const material of this.materials) material.dispose();
  }
}
