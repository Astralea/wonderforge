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
import type { SydneyConstructionPlan } from '../../data/sydneyTypes';
import {
  sydneyCraneStateAt,
  type SydneyCraneState,
  SYDNEY_CRANE_MAST_HEIGHT,
  sydneyFalseworkAt,
  sydneyVerticalHalfExtent,
  type ActiveSydneyOperation,
} from '../../engine/sydneyConstruction';
import { sydneyLabourAt, type SydneyCrewPose } from '../../engine/sydneyCrew';
import { sydneyPlantAt, type SydneyPlantPose } from '../../engine/sydneyPlant';
import { sydneyTerrainHeightAt } from '../../engine/sydneyTerrain';
import type { MaterialLibrary } from './MaterialLibrary';

const MAX_OPERATIONS = 18;
const MAX_WORKERS = 192;
const FIGURE = 1;
const MAX_FALSEWORK_POLES = 3200;
const MAX_FALSEWORK_DECKS = 80;
const MAX_PLANT_BOX = 700;
const MAX_PLANT_CYL = 80;
const UP = new Vector3(0, 1, 0);
const YAW_AXIS = new Vector3(0, 1, 0);
const LEAN_AXIS = new Vector3(1, 0, 0);

export class SydneyWorkSystem {
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
  private readonly trolleyDecks: InstancedMesh;
  private readonly trolleyWheels: InstancedMesh;
  private readonly plantYellow: InstancedMesh;
  private readonly plantDark: InstancedMesh;
  private readonly plantCyls: InstancedMesh;
  private readonly ropes: InstancedMesh;
  private readonly falseworkPoles: InstancedMesh;
  private readonly falseworkDecks: InstancedMesh;
  private readonly dust: InstancedMesh;
  private readonly materials: MeshStandardMaterial[] = [];

  constructor(
    materials: MaterialLibrary,
    private readonly plan: SydneyConstructionPlan,
  ) {
    this.group.name = 'sydney-work-system';
    const skin = materials.skin.clone();
    const linen = materials.linen.clone();
    linen.color.set('#e24a1c');
    const steel = materials.wood.clone();
    steel.color.set('#5a6570');
    const yellow = materials.wood.clone();
    yellow.color.set('#e0b21a');
    yellow.roughness = 0.55;
    const dark = materials.wood.clone();
    dark.color.set('#2a2e32');
    dark.roughness = 0.7;
    const timber = materials.wood.clone();
    timber.color.set('#6a4a2c');
    const ropeMat = materials.rope.clone();
    ropeMat.color.set('#7a5a32');
    const dustMat = materials.sand.clone();
    dustMat.color.set('#c4b49a');
    dustMat.transparent = true;
    dustMat.opacity = 0.28;
    dustMat.depthWrite = false;
    this.materials.push(
      skin,
      linen,
      steel,
      yellow,
      dark,
      timber,
      ropeMat,
      dustMat,
    );
    this.bodies = new InstancedMesh(this.bodyGeometry, linen, MAX_WORKERS);
    this.heads = new InstancedMesh(this.headGeometry, skin, MAX_WORKERS);
    this.legs = new InstancedMesh(this.legGeometry, linen, MAX_WORKERS * 2);
    this.arms = new InstancedMesh(this.armGeometry, skin, MAX_WORKERS * 2);
    this.trolleyDecks = new InstancedMesh(
      this.boxGeometry,
      yellow,
      MAX_OPERATIONS,
    );
    this.trolleyWheels = new InstancedMesh(
      this.wheelGeometry,
      dark,
      MAX_OPERATIONS * 4,
    );
    this.plantYellow = new InstancedMesh(
      this.boxGeometry,
      yellow,
      MAX_PLANT_BOX,
    );
    this.plantYellow.name = 'sydney-crane-and-plant-members';
    this.plantDark = new InstancedMesh(this.boxGeometry, dark, MAX_PLANT_BOX);
    this.plantCyls = new InstancedMesh(this.wheelGeometry, dark, MAX_PLANT_CYL);
    this.ropes = new InstancedMesh(
      this.armGeometry,
      ropeMat,
      MAX_OPERATIONS * 4,
    );
    this.ropes.name = 'sydney-crane-cables';
    this.falseworkPoles = new InstancedMesh(
      this.poleGeometry,
      steel,
      MAX_FALSEWORK_POLES,
    );
    this.falseworkDecks = new InstancedMesh(
      this.boxGeometry,
      timber,
      MAX_FALSEWORK_DECKS,
    );
    this.bodies.name = 'sydney-worker-bodies';
    this.heads.name = 'sydney-worker-heads';
    this.legs.name = 'sydney-worker-legs';
    this.arms.name = 'sydney-worker-arms';
    this.falseworkPoles.name = 'sydney-falsework-poles';
    this.falseworkDecks.name = 'sydney-falsework-decks';
    this.trolleyDecks.name = 'sydney-trolley-decks';
    this.trolleyWheels.name = 'sydney-trolley-wheels';
    this.dust = new InstancedMesh(
      this.dustGeometry,
      dustMat,
      MAX_OPERATIONS * 2,
    );
    for (const mesh of [
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.trolleyDecks,
      this.trolleyWheels,
      this.plantYellow,
      this.plantDark,
      this.plantCyls,
      this.ropes,
      this.falseworkPoles,
      this.falseworkDecks,
    ]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  update(operations: ActiveSydneyOperation[], t: number): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const leanQuat = new Quaternion();
    const spinQuat = new Quaternion();
    const axle = new Vector3();
    const partPos = new Vector3();
    const midpoint = new Vector3();
    const forward = new Vector3();
    const lateral = new Vector3();
    const alongScratch = new Vector3();
    let bodies = 0;
    let legs = 0;
    let arms = 0;
    let decks = 0;
    let wheels = 0;
    let yellowBoxes = 0;
    let darkBoxes = 0;
    let plantCyls = 0;
    let ropes = 0;
    let poles = 0;
    let workDecks = 0;
    let dust = 0;

    const compose = (pos: Vector3, yaw: number, scale: Vector3, lean = 0) => {
      quaternion.setFromAxisAngle(YAW_AXIS, yaw);
      if (lean !== 0) {
        leanQuat.setFromAxisAngle(LEAN_AXIS, lean);
        quaternion.multiply(leanQuat);
      }
      matrix.compose(pos, quaternion, scale);
    };
    const composeAlong = (from: Vector3, to: Vector3, radius: number) => {
      alongScratch.copy(to).sub(from);
      const length = Math.max(0.05, alongScratch.length());
      quaternion.setFromUnitVectors(
        UP,
        alongScratch.multiplyScalar(1 / length),
      );
      midpoint.copy(from).lerp(to, 0.5);
      matrix.compose(midpoint, quaternion, new Vector3(radius, length, radius));
    };
    const composeWheel = (
      pos: Vector3,
      yaw: number,
      spin: number,
      radius: number,
      thickness: number,
    ) => {
      axle.set(Math.cos(yaw), 0, -Math.sin(yaw));
      spinQuat.setFromAxisAngle(UP, spin);
      quaternion.setFromUnitVectors(UP, axle);
      quaternion.multiply(spinQuat);
      matrix.compose(pos, quaternion, new Vector3(radius, thickness, radius));
    };
    const pushYellow = (
      pos: Vector3,
      yaw: number,
      scale: Vector3,
      lean = 0,
    ) => {
      if (yellowBoxes >= MAX_PLANT_BOX) return;
      compose(pos, yaw, scale, lean);
      this.plantYellow.setMatrixAt(yellowBoxes, matrix);
      yellowBoxes += 1;
    };
    const pushDark = (pos: Vector3, yaw: number, scale: Vector3, lean = 0) => {
      if (darkBoxes >= MAX_PLANT_BOX) return;
      compose(pos, yaw, scale, lean);
      this.plantDark.setMatrixAt(darkBoxes, matrix);
      darkBoxes += 1;
    };
    const pushCyl = (
      pos: Vector3,
      yaw: number,
      radius: number,
      thickness: number,
    ) => {
      if (plantCyls >= MAX_PLANT_CYL) return;
      composeWheel(pos, yaw, 0, radius, thickness);
      this.plantCyls.setMatrixAt(plantCyls, matrix);
      plantCyls += 1;
    };
    const placeTowerCrane = (
      pose: SydneyPlantPose,
      active: SydneyCraneState,
    ) => {
      const [bx, by, bz] = pose.position;
      const mastH = SYDNEY_CRANE_MAST_HEIGHT;
      const yaw = active.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const section = mastH / 5;
      for (let lift = 0; lift < 5; lift += 1) {
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) {
            pushYellow(
              new Vector3(
                bx + sx * 1.35,
                by + (lift + 0.5) * section,
                bz + sz * 1.35,
              ),
              0,
              new Vector3(0.3, section, 0.3),
            );
          }
        for (const sz of [-1, 1]) {
          composeAlong(
            new Vector3(bx - 1.35, by + lift * section, bz + sz * 1.35),
            new Vector3(bx + 1.35, by + (lift + 1) * section, bz + sz * 1.35),
            0.22,
          );
          this.plantYellow.setMatrixAt(yellowBoxes++, matrix);
        }
      }
      pushDark(
        new Vector3(bx + fx * 3.2, by + mastH - 7, bz + fz * 3.2),
        yaw,
        new Vector3(5.4, 4.2, 4.8),
      );
      // Service platform turns with the crane. The visible crane hand stands
      // on this slab, outside the opaque cabin volume.
      pushDark(
        new Vector3(bx - fx * 3, by + mastH - 9.29, bz - fz * 3),
        yaw,
        new Vector3(4.8, 0.38, 6.4),
      );
      composeAlong(
        new Vector3(bx, by + mastH - 14, bz),
        new Vector3(bx - fx * 4.6, by + mastH - 9.48, bz - fz * 4.6),
        0.35,
      );
      this.plantYellow.setMatrixAt(yellowBoxes++, matrix);
      const tip = new Vector3(...active.jibTip);
      const jibRoot = new Vector3(bx, by + mastH, bz);
      alongScratch.copy(tip).sub(jibRoot);
      const jibLen = Math.max(0.05, alongScratch.length());
      quaternion.setFromUnitVectors(
        UP,
        alongScratch.multiplyScalar(1 / jibLen),
      );
      midpoint.copy(jibRoot).lerp(tip, 0.5);
      if (yellowBoxes < MAX_PLANT_BOX) {
        matrix.compose(midpoint, quaternion, new Vector3(1.9, jibLen, 1.9));
        this.plantYellow.setMatrixAt(yellowBoxes, matrix);
        yellowBoxes += 1;
      }
      pushYellow(
        new Vector3(bx - fx * 16, by + mastH - 4, bz - fz * 16),
        yaw,
        new Vector3(3.2, 1.6, 18),
      );
      pushDark(
        new Vector3(bx - fx * 22, by + mastH - 6, bz - fz * 22),
        yaw,
        new Vector3(4.8, 3.6, 6.2),
      );
      if (ropes < MAX_OPERATIONS * 4) {
        composeAlong(
          new Vector3(active.jibTip[0], active.jibTip[1], active.jibTip[2]),
          new Vector3(active.hook[0], active.hook[1], active.hook[2]),
          0.14,
        );
        this.ropes.setMatrixAt(ropes, matrix);
        ropes += 1;
        composeAlong(
          new Vector3(...active.hook),
          new Vector3(active.hook[0], active.hook[1] - 1.2, active.hook[2]),
          0.11,
        );
        this.ropes.setMatrixAt(ropes++, matrix);
      }
    };
    const placeCrawler = (pose: SydneyPlantPose) => {
      const [x, y, z] = pose.position;
      const yaw = pose.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      pushDark(new Vector3(x, y + 1.6, z), yaw, new Vector3(12.5, 2.4, 22));
      pushYellow(new Vector3(x, y + 5.2, z), yaw, new Vector3(12.4, 6.2, 11));
      const boomRoot = new Vector3(x + fx * 3, y + 8.2, z + fz * 3);
      const boomTip = new Vector3(
        x + fx * 36,
        y + 8.2 + 22 + pose.articulation * 12,
        z + fz * 36,
      );
      alongScratch.copy(boomTip).sub(boomRoot);
      const boomLen = Math.max(0.05, alongScratch.length());
      quaternion.setFromUnitVectors(
        UP,
        alongScratch.multiplyScalar(1 / boomLen),
      );
      midpoint.copy(boomRoot).lerp(boomTip, 0.5);
      if (yellowBoxes < MAX_PLANT_BOX) {
        matrix.compose(midpoint, quaternion, new Vector3(1.5, boomLen, 1.5));
        this.plantYellow.setMatrixAt(yellowBoxes, matrix);
        yellowBoxes += 1;
      }
      pushCyl(
        new Vector3(x + Math.cos(yaw) * 5.1, y + 2, z - Math.sin(yaw) * 5.1),
        yaw,
        2.0,
        5.6,
      );
      pushCyl(
        new Vector3(x - Math.cos(yaw) * 5.1, y + 2, z + Math.sin(yaw) * 5.1),
        yaw,
        2.0,
        5.6,
      );
    };
    const placeDozer = (pose: SydneyPlantPose) => {
      const [x, y, z] = pose.position;
      const yaw = pose.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const lx = Math.cos(yaw);
      const lz = -Math.sin(yaw);
      pushYellow(new Vector3(x, y + 3.6, z), yaw, new Vector3(13.2, 5.2, 22));
      pushDark(
        new Vector3(x - fx * 3.6, y + 7.2, z - fz * 3.6),
        yaw,
        new Vector3(7.8, 4.8, 9.6),
      );
      pushYellow(
        new Vector3(
          x + fx * 12.6,
          y + 3.4 + pose.articulation * 1.4,
          z + fz * 12.6,
        ),
        yaw,
        new Vector3(15.6, 6.8, 1.6),
        pose.articulation * 0.4,
      );
      pushDark(
        new Vector3(x + lx * 6.4, y + 1.1, z + lz * 6.4),
        yaw,
        new Vector3(3.4, 2.2, 20),
      );
      pushDark(
        new Vector3(x - lx * 6.4, y + 1.1, z - lz * 6.4),
        yaw,
        new Vector3(3.4, 2.2, 20),
      );
    };
    const placeTruck = (pose: SydneyPlantPose) => {
      const [x, y, z] = pose.position;
      const yaw = pose.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      pushDark(
        new Vector3(x + fx * 6.8, y + 4.0, z + fz * 6.8),
        yaw,
        new Vector3(7.2, 5.4, 6.6),
      );
      pushYellow(
        new Vector3(
          x - fx * 4.2,
          y + 4.1 + pose.articulation * 2,
          z - fz * 4.2,
        ),
        yaw,
        new Vector3(6.2, 3.8, 14.4),
        -pose.articulation * 0.55,
      );
      for (const along of [-5.0, 1.0, 6.6] as const) {
        for (const side of [-1, 1] as const) {
          pushCyl(
            new Vector3(
              x + fx * along + Math.cos(yaw) * side * 3.3,
              y + 1.55,
              z + fz * along - Math.sin(yaw) * side * 3.3,
            ),
            yaw,
            1.55,
            1.05,
          );
        }
      }
    };

    const labour = sydneyLabourAt(operations, t);
    const motion = new Map(labour.rigs.map((rig) => [rig.partId, rig]));
    const placeWorker = (crew: SydneyCrewPose) => {
      if (bodies >= MAX_WORKERS) return;
      const [x, footY, z] = crew.position;
      const yaw = crew.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const lx = Math.cos(yaw);
      const lz = -Math.sin(yaw);
      const climb = crew.role === 'climber';
      const bob =
        Math.abs(Math.sin(crew.gait)) * (climb ? 0.14 : 0.07) * FIGURE;
      const stride = Math.sin(crew.gait) * (climb ? 0.18 : 0.34) * FIGURE;
      compose(
        new Vector3(
          x + fx * stride * 0.12,
          footY + 0.98 * FIGURE + bob,
          z + fz * stride * 0.12,
        ),
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
      const hammer =
        crew.role === 'deck-mason' ||
        crew.role === 'dresser' ||
        crew.role === 'slinger' ||
        crew.role === 'tiler';
      const haul = crew.role === 'hauler';
      const reach = climb
        ? new Vector3(
            x + fx * 0.2 * FIGURE,
            footY + (1.85 + Math.abs(Math.sin(crew.arm)) * 0.85) * FIGURE,
            z + fz * 0.2 * FIGURE,
          )
        : hammer
          ? new Vector3(
              x + fx * 0.7 * FIGURE,
              footY + (1.4 + Math.abs(Math.sin(crew.arm)) * 0.7) * FIGURE,
              z + fz * 0.7 * FIGURE,
            )
          : haul
            ? new Vector3(
                x + fx * 0.95 * FIGURE,
                footY + 1.05 * FIGURE + bob,
                z + fz * 0.95 * FIGURE,
              )
            : new Vector3(
                x + fx * 0.55 * FIGURE,
                footY + 1.1 * FIGURE + bob,
                z + fz * 0.55 * FIGURE,
              );
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
        const swing = haul
          ? 0.08
          : Math.sin(crew.gait + (armSide > 0 ? 0 : Math.PI)) * 0.22 * FIGURE;
        const shoulder = new Vector3(
          x + lx * armSide * 0.2 * FIGURE,
          footY + 1.26 * FIGURE + bob,
          z + lz * armSide * 0.2 * FIGURE,
        );
        const hand = hammer
          ? reach
          : new Vector3(reach.x + lx * swing, reach.y, reach.z + lz * swing);
        if (crew.role === 'signalman' && armSide === 1) {
          hand.set(
            x + lx * 0.55,
            footY + 1.9 + Math.sin(crew.arm) * 0.15,
            z + lz * 0.55,
          );
        }
        composeAlong(shoulder, hand, 0.05 * FIGURE);
        this.arms.setMatrixAt(arms, matrix);
        arms += 1;
      }
      bodies += 1;
    };
    for (const crew of labour.crews) placeWorker(crew);

    for (const bay of sydneyFalseworkAt(t)) {
      const yaw = bay.yaw;
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const [x, , z] = bay.position;
      const foot = bay.footY;
      if (workDecks < MAX_FALSEWORK_DECKS) {
        compose(
          new Vector3(x, bay.deckY + 0.19, z),
          yaw,
          new Vector3(4.6, 0.38, 3.2),
        );
        this.falseworkDecks.setMatrixAt(workDecks, matrix);
        workDecks += 1;
      }
      const corners = [
        [-2.1, -1.4],
        [2.1, -1.4],
        [-2.1, 1.4],
        [2.1, 1.4],
      ] as const;
      if (bay.capHeight > 0) {
        // A slender central adjustable head meets the exact rib underside;
        // the crew deck stays at least five metres below the pitched roof.
        compose(
          new Vector3(x, bay.deckY + 0.38 + bay.capHeight / 2, z),
          yaw,
          new Vector3(2.5, bay.capHeight, 2.5),
        );
        this.falseworkPoles.setMatrixAt(poles++, matrix);
      }
      for (let lift = 0; lift < bay.segmentCount; lift += 1) {
        const cy = foot + lift * bay.segmentLength + bay.segmentLength / 2;
        for (const side of [-1, 1]) {
          composeAlong(
            new Vector3(
              x - lateral.x * 2.1 + forward.x * side * 1.4,
              foot + lift * bay.segmentLength,
              z - lateral.z * 2.1 + forward.z * side * 1.4,
            ),
            new Vector3(
              x + lateral.x * 2.1 + forward.x * side * 1.4,
              foot + (lift + 1) * bay.segmentLength,
              z + lateral.z * 2.1 + forward.z * side * 1.4,
            ),
            1.8,
          );
          this.falseworkPoles.setMatrixAt(poles++, matrix);
        }
        for (const [ox, oz] of corners) {
          if (poles >= MAX_FALSEWORK_POLES) break;
          const px = x + lateral.x * ox + forward.x * oz;
          const pz = z + lateral.z * ox + forward.z * oz;
          compose(
            new Vector3(px, cy, pz),
            yaw,
            new Vector3(3, bay.segmentLength, 3),
          );
          this.falseworkPoles.setMatrixAt(poles, matrix);
          poles += 1;
        }
      }
    }

    for (const pose of sydneyPlantAt(t)) {
      const firstYellow = yellowBoxes,
        firstDark = darkBoxes,
        firstCylinder = plantCyls;
      if (pose.kind === 'tower-crane') {
        const index = pose.id === 'tower-crane-0' ? 0 : 1;
        placeTowerCrane(pose, sydneyCraneStateAt(index as 0 | 1, t, this.plan));
      } else if (pose.kind === 'crawler-crane') placeCrawler(pose);
      else if (pose.kind === 'dozer') placeDozer(pose);
      else placeTruck(pose);
      if (pose.kind !== 'tower-crane') {
        const transform = new Matrix4()
          .makeTranslation(...pose.position)
          .scale(new Vector3(0.45, 0.45, 0.45))
          .multiply(
            new Matrix4().makeTranslation(
              -pose.position[0],
              -pose.position[1],
              -pose.position[2],
            ),
          );
        for (const [mesh, start, end] of [
          [this.plantYellow, firstYellow, yellowBoxes],
          [this.plantDark, firstDark, darkBoxes],
          [this.plantCyls, firstCylinder, plantCyls],
        ] as const) {
          for (let i = start; i < end; i++) {
            mesh.getMatrixAt(i, matrix);
            matrix.premultiply(transform);
            mesh.setMatrixAt(i, matrix);
          }
        }
      }
    }

    for (const operation of operations) {
      const { part, state } = operation;
      partPos.set(...state.position);
      const yaw = state.rotation[1];
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const halfY = sydneyVerticalHalfExtent(part.dimensions);
      const bottom = state.position[1] - halfY;
      if (
        part.graph === 'podium' &&
        state.phase === 'cast' &&
        !part.authoredVertices
      ) {
        for (const side of [-1, 1]) {
          pushDark(
            new Vector3(
              partPos.x + side * (part.dimensions[0] / 2 + 0.08),
              partPos.y,
              partPos.z,
            ),
            0,
            new Vector3(0.16, part.dimensions[1], part.dimensions[2] + 0.2),
          );
          pushDark(
            new Vector3(
              partPos.x,
              partPos.y,
              partPos.z + side * (part.dimensions[2] / 2 + 0.08),
            ),
            0,
            new Vector3(part.dimensions[0], part.dimensions[1], 0.16),
          );
        }
      }

      if (
        part.graph === 'shell' &&
        (state.phase === 'cast' || state.phase === 'staged')
      ) {
        for (const side of [-1, 1]) {
          const x = partPos.x + side * Math.max(0.4, part.dimensions[0] * 0.3),
            ground = sydneyTerrainHeightAt(x, partPos.z),
            h = bottom - 0.18 - ground;
          if (h > 0)
            pushDark(
              new Vector3(x, ground + h / 2, partPos.z),
              0,
              new Vector3(0.6, h, Math.max(1, part.dimensions[2] + 0.2)),
            );
        }
        // A full bearing deck catches the true lowest point of a curved
        // final-orientation patch, which need not lie directly over a trestle.
        pushDark(
          new Vector3(partPos.x, bottom - 0.09, partPos.z),
          0,
          new Vector3(part.dimensions[0] + 0.2, 0.18, part.dimensions[2] + 0.2),
        );
      }

      if (state.mechanism === 'trolley') {
        compose(
          new Vector3(partPos.x, bottom - 0.19, partPos.z),
          yaw,
          new Vector3(
            Math.max(part.dimensions[0], 2.2) + 1.6,
            0.38,
            Math.max(part.dimensions[2], 2.4) + 1.8,
          ),
        );
        this.trolleyDecks.setMatrixAt(decks, matrix);
        decks += 1;
        const spin = motion.get(part.id)?.trolleySpin ?? 0;
        for (const along of [-0.9, 0.9] as const) {
          for (const side of [-1, 1] as const) {
            composeWheel(
              new Vector3(
                partPos.x + forward.x * along + lateral.x * side * 0.9,
                bottom - state.trolleyLift + 0.35,
                partPos.z + forward.z * along + lateral.z * side * 0.9,
              ),
              yaw,
              spin,
              0.35,
              0.22,
            );
            this.trolleyWheels.setMatrixAt(wheels, matrix);
            wheels += 1;
          }
        }
      }

      if (state.contactDust && dust < MAX_OPERATIONS * 2) {
        compose(
          new Vector3(
            partPos.x,
            sydneyTerrainHeightAt(partPos.x, partPos.z) + 0.6,
            partPos.z,
          ),
          yaw,
          new Vector3(
            2.4 + state.contactDustAmount * 2,
            0.8,
            2.4 + state.contactDustAmount * 2,
          ),
        );
        this.dust.setMatrixAt(dust, matrix);
        dust += 1;
      }
    }

    this.bodies.count = bodies;
    this.heads.count = bodies;
    this.legs.count = legs;
    this.arms.count = arms;
    this.trolleyDecks.count = decks;
    this.trolleyWheels.count = wheels;
    this.plantYellow.count = yellowBoxes;
    this.plantDark.count = darkBoxes;
    this.plantCyls.count = plantCyls;
    this.ropes.count = ropes;
    this.falseworkPoles.count = poles;
    this.falseworkDecks.count = workDecks;
    this.dust.count = dust;
    for (const mesh of [
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.trolleyDecks,
      this.trolleyWheels,
      this.plantYellow,
      this.plantDark,
      this.plantCyls,
      this.ropes,
      this.falseworkPoles,
      this.falseworkDecks,
      this.dust,
    ]) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const geometry of [
      this.bodyGeometry,
      this.headGeometry,
      this.legGeometry,
      this.armGeometry,
      this.boxGeometry,
      this.poleGeometry,
      this.wheelGeometry,
      this.dustGeometry,
    ])
      geometry.dispose();
    for (const mesh of [
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.trolleyDecks,
      this.trolleyWheels,
      this.plantYellow,
      this.plantDark,
      this.plantCyls,
      this.ropes,
      this.falseworkPoles,
      this.falseworkDecks,
      this.dust,
    ])
      mesh.dispose();
    for (const material of this.materials) material.dispose();
  }
}
