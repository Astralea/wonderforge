import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { EiffelConstructionPlan } from '../../data/eiffelTypes';
import {
  EIFFEL_CREEPER_CABIN,
  EIFFEL_CREEPER_COUNTER,
  EIFFEL_CREEPER_JIB_RADIUS,
  EIFFEL_CREEPER_MAST_RADIUS,
} from '../../data/eiffelConstruction';
import {
  eiffelCraneRigAt,
  eiffelStationCranesAt,
  eiffelVerticalHalfExtent,
  type ActiveEiffelOperation,
} from '../../engine/eiffelConstruction';
import { eiffelLabourAlbedoAt, eiffelLabourAt, type EiffelCrewPose, type EiffelCrewRole } from '../../engine/eiffelCrew';
import { eiffelTerrainHeightAt } from '../../engine/eiffelTerrain';
import { injectMaterialRecipe } from './proceduralDetail';
import type { MaterialLibrary } from './MaterialLibrary';

const MAX_OPERATIONS = 64;
const MAX_WORKERS = 256;
const FIGURE = 7.4;
const TUNIC_DIM = new Color();
const UP = new Vector3(0, 1, 0);
const YAW_AXIS = new Vector3(0, 1, 0);
const LEAN_AXIS = new Vector3(1, 0, 0);
const TUNIC: Record<EiffelCrewRole, Color> = {
  hauler: new Color('#f0e4c8'),
  driver: new Color('#d4b43a'),
  slinger: new Color('#c44a32'),
  riveter: new Color('#e07028'),
  'tag-line': new Color('#d8c890'),
  climber: new Color('#2a6ab0'),
  foreman: new Color('#f4eee0'),
};

export class EiffelWorkSystem {
  readonly group = new Group();
  private readonly plan: EiffelConstructionPlan;
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
  private readonly craneMasts: InstancedMesh;
  private readonly craneBooms: InstancedMesh;
  private readonly craneCabins: InstancedMesh;
  private readonly craneCounters: InstancedMesh;
  private readonly ropes: InstancedMesh;
  private readonly dust: InstancedMesh;
  private readonly materials: MeshStandardMaterial[] = [];

  constructor(materials: MaterialLibrary, plan: EiffelConstructionPlan) {
    this.plan = plan;
    this.group.name = 'eiffel-work-system';
    const skin = materials.skin.clone();
    const linen = materials.linen.clone();
    linen.color.set('#ffffff');
    linen.emissive.set('#000000');
    linen.emissiveIntensity = 0;
    const timber = materials.wood.clone();
    timber.color.set('#6a4328');
    const plant = new MeshStandardMaterial({
      color: '#5a3824',
      roughness: 0.26,
      metalness: 0.7,
      emissive: '#5a3820',
      emissiveIntensity: 0,
    });
    injectMaterialRecipe(plant, 'puddled-iron');
    const gold = new MeshStandardMaterial({
      color: '#e0c040',
      emissive: '#ffcc44',
      emissiveIntensity: 0.55,
      roughness: 0.38,
      metalness: 0.55,
    });
    const ropeMat = materials.rope.clone();
    ropeMat.color.set('#7a5a32');
    const dustMat = materials.sand.clone();
    dustMat.color.set('#8a7a62');
    dustMat.transparent = true;
    dustMat.opacity = 0.28;
    dustMat.depthWrite = false;
    this.materials.push(skin, linen, timber, plant, gold, ropeMat, dustMat);
    this.bodies = new InstancedMesh(this.bodyGeometry, linen, MAX_WORKERS);
    this.bodies.name = 'eiffel-workers';
    this.heads = new InstancedMesh(this.headGeometry, skin, MAX_WORKERS);
    this.legs = new InstancedMesh(this.legGeometry, linen, MAX_WORKERS * 2);
    this.arms = new InstancedMesh(this.armGeometry, skin, MAX_WORKERS * 2);
    this.wagonDecks = new InstancedMesh(this.boxGeometry, timber, MAX_OPERATIONS);
    this.wagonWheels = new InstancedMesh(this.wheelGeometry, timber, MAX_OPERATIONS * 4);
    this.craneMasts = new InstancedMesh(this.poleGeometry, plant, 5);
    this.craneMasts.name = 'eiffel-creeper-masts';
    this.craneBooms = new InstancedMesh(this.boxGeometry, gold, 5);
    this.craneBooms.name = 'eiffel-creeper-booms';
    this.craneCabins = new InstancedMesh(this.boxGeometry, plant, 5);
    this.craneCabins.name = 'eiffel-creeper-cabins';
    this.craneCounters = new InstancedMesh(this.boxGeometry, plant, 5);
    this.craneCounters.name = 'eiffel-creeper-counters';
    this.ropes = new InstancedMesh(this.armGeometry, ropeMat, MAX_OPERATIONS * 4);
    this.dust = new InstancedMesh(this.dustGeometry, dustMat, MAX_OPERATIONS * 2);
    for (const mesh of [
      this.bodies, this.heads, this.legs, this.arms,
      this.wagonDecks, this.wagonWheels, this.craneMasts, this.craneBooms,
      this.craneCabins, this.craneCounters, this.ropes,
    ]) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  update(operations: ActiveEiffelOperation[], t: number): void {
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
    let masts = 0;
    let booms = 0;
    let cabins = 0;
    let counters = 0;
    let ropes = 0;
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
    const labour = eiffelLabourAt(operations, t, this.plan);
    const albedo = eiffelLabourAlbedoAt(t);
    const placeWorker = (crew: EiffelCrewPose) => {
      if (bodies >= MAX_WORKERS) return;
      const [x, footY, z] = crew.position;
      const yaw = crew.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const lx = Math.cos(yaw);
      const lz = -Math.sin(yaw);
      const bob = Math.abs(Math.sin(crew.gait)) * 0.07 * FIGURE;
      const stride = Math.sin(crew.gait) * 0.34 * FIGURE;
      TUNIC_DIM.copy(TUNIC[crew.role]).multiplyScalar(albedo);
      compose(
        new Vector3(x + fx * stride * 0.12, footY + 0.98 * FIGURE + bob, z + fz * stride * 0.12),
        yaw,
        new Vector3(FIGURE, FIGURE * 0.92, FIGURE),
        crew.lean,
      );
      this.bodies.setMatrixAt(bodies, matrix);
      this.bodies.setColorAt(bodies, TUNIC_DIM);
      this.legs.setColorAt(legs, TUNIC_DIM);
      this.legs.setColorAt(legs + 1, TUNIC_DIM);
      compose(
        new Vector3(x + fx * stride * 0.12, footY + 1.6 * FIGURE + bob, z + fz * stride * 0.12),
        yaw,
        new Vector3(FIGURE, FIGURE, FIGURE),
      );
      this.heads.setMatrixAt(bodies, matrix);
      const hammer = crew.role === 'riveter' || crew.role === 'slinger';
      const haul = crew.role === 'hauler' || crew.role === 'tag-line';
      const reach = hammer
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

    const stations = eiffelStationCranesAt(this.plan, t, operations);
    const boomByLeg = new Map(stations.map((station) => [station.leg, station]));
    for (const station of stations) {
      composeAlong(
        new Vector3(...station.base),
        new Vector3(...station.mastTop),
        EIFFEL_CREEPER_MAST_RADIUS,
      );
      this.craneMasts.setMatrixAt(masts, matrix);
      masts += 1;
      composeAlong(
        new Vector3(...station.mastTop),
        new Vector3(...station.boomTip),
        EIFFEL_CREEPER_JIB_RADIUS,
      );
      this.craneBooms.setMatrixAt(booms, matrix);
      booms += 1;
      compose(new Vector3(...station.cabin), station.yaw, new Vector3(...EIFFEL_CREEPER_CABIN));
      this.craneCabins.setMatrixAt(cabins, matrix);
      cabins += 1;
      compose(new Vector3(...station.counter), station.yaw, new Vector3(...EIFFEL_CREEPER_COUNTER));
      this.craneCounters.setMatrixAt(counters, matrix);
      counters += 1;
    }

    for (const operation of operations) {
      const { part, state } = operation;
      partPos.set(...state.position);
      const yaw = state.rotation[1];
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      lateral.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const halfY = eiffelVerticalHalfExtent(part.dimensions);
      const bottom = state.position[1] - halfY;
      const hauling = state.mechanism === 'wagon';
      const rig = eiffelCraneRigAt(part, state);

      if (hauling) {
        compose(new Vector3(partPos.x, bottom - state.wagonLift * 0.2 + 0.62, partPos.z), yaw, new Vector3(
          Math.max(part.dimensions[0], 3.2) + 2.2,
          0.55,
          Math.max(part.dimensions[2], 3.4) + 2.4,
        ));
        this.wagonDecks.setMatrixAt(decks, matrix);
        decks += 1;
        const wagonSpin = t * 8 + part.storey;
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
            new Vector3(partPos.x + forward.x * 6.2, eiffelTerrainHeightAt(partPos.x, partPos.z) + 1.1 * FIGURE, partPos.z + forward.z * 6.2),
            0.08,
          );
          this.ropes.setMatrixAt(ropes, matrix);
          ropes += 1;
        }
      }

      if (rig) {
        const station = boomByLeg.get(part.leg) ?? rig;
        composeAlong(
          new Vector3(...station.boomTip),
          new Vector3(...rig.hook),
          0.12,
        );
        this.ropes.setMatrixAt(ropes, matrix);
        ropes += 1;
      }

      if (state.contactDust && state.contactDustAmount > 0.08 && dust < MAX_OPERATIONS * 2) {
        compose(
          new Vector3(partPos.x, bottom + 0.06, partPos.z),
          yaw,
          new Vector3(2.4 + state.contactDustAmount * 2, 0.45, 2.1 + state.contactDustAmount * 2),
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
      [this.craneMasts, masts],
      [this.craneBooms, booms],
      [this.craneCabins, cabins],
      [this.craneCounters, counters],
      [this.ropes, ropes],
      [this.dust, dust],
    ];
    for (const [mesh, count] of counts) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
      this.wagonDecks, this.wagonWheels, this.craneMasts, this.craneBooms,
      this.craneCabins, this.craneCounters, this.ropes, this.dust,
    ]) mesh.dispose();
    for (const material of this.materials) material.dispose();
  }
}
