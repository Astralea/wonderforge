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
import type { StonehengeConstructionPlan, StonehengeStone } from '../../data/stonehengeTypes';
import {
  stonehengeVerticalHalfExtent,
  type ActiveStonehengeOperation,
} from '../../engine/stonehengeConstruction';
import { stonehengeTerrainHeightAt } from '../../engine/stonehengeTerrain';
import { ropeSagMeters, sampleParabolicRope } from '../../engine/stonehengeContact';
import type { MaterialLibrary } from './MaterialLibrary';

const MAX_OPERATIONS = 20;
const WORKERS_PER_OPERATION = 3;
const MAX_CRIB_LOGS = 720;
const MAX_PITS = 120;
const MAX_RUBBLE = 800;
const MAX_DUST = MAX_OPERATIONS * 3;
const ROPE_SEGMENTS = 4;
const MAX_ROPE_CYLINDERS = MAX_OPERATIONS * 4 * ROPE_SEGMENTS;
const CRIB_LOG_HEIGHT = 0.22;
const UP = new Vector3(0, 1, 0);
const YAW_AXIS = new Vector3(0, 1, 0);
const LEAN_AXIS = new Vector3(1, 0, 0);

const leanQuaternion = new Quaternion();
const ropeFrom = new Vector3();
const ropeTo = new Vector3();
const alongScratch = new Vector3();

function compose(
  matrix: Matrix4,
  position: Vector3,
  yaw: number,
  scale: Vector3,
  quaternion: Quaternion,
  lean = 0,
): void {
  quaternion.setFromAxisAngle(YAW_AXIS, yaw);
  if (lean !== 0) {
    leanQuaternion.setFromAxisAngle(LEAN_AXIS, lean);
    quaternion.multiply(leanQuaternion);
  }
  matrix.compose(position, quaternion, scale);
}

function composeAlong(
  matrix: Matrix4,
  from: Vector3,
  to: Vector3,
  radius: number,
  quaternion: Quaternion,
): void {
  alongScratch.copy(to).sub(from);
  const length = Math.max(0.05, alongScratch.length());
  quaternion.setFromUnitVectors(UP, alongScratch.multiplyScalar(1 / length));
  alongScratch.copy(from).lerp(to, 0.5);
  matrix.compose(alongScratch, quaternion, new Vector3(radius, length, radius));
}

function setRopeRun(
  mesh: InstancedMesh,
  cursor: number,
  from: Vector3,
  to: Vector3,
  tension: number,
  radius: number,
  matrix: Matrix4,
  quaternion: Quaternion,
): number {
  const span = from.distanceTo(to);
  const points = sampleParabolicRope(
    [from.x, from.y, from.z],
    [to.x, to.y, to.z],
    ropeSagMeters(tension, span),
    ROPE_SEGMENTS,
  );
  for (let index = 0; index < points.length - 1 && cursor < MAX_ROPE_CYLINDERS; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    ropeFrom.set(a[0], a[1], a[2]);
    ropeTo.set(b[0], b[1], b[2]);
    composeAlong(matrix, ropeFrom, ropeTo, radius, quaternion);
    mesh.setMatrixAt(cursor, matrix);
    cursor += 1;
  }
  return cursor;
}

export class StonehengeWorkSystem {
  readonly group = new Group();
  private readonly workerBodyGeometry = new CylinderGeometry(0.26, 0.36, 0.98, 6);
  private readonly workerHeadGeometry = new SphereGeometry(0.24, 7, 5);
  private readonly legGeometry = new CylinderGeometry(0.07, 0.085, 0.62, 5);
  private readonly armGeometry = new CylinderGeometry(0.85, 1, 1, 5, 1, true);
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly pitGeometry = new CylinderGeometry(0.55, 0.98, 0.72, 14);
  private readonly rubbleGeometry = new BoxGeometry(1, 1, 1);
  private readonly dustGeometry = new SphereGeometry(0.5, 7, 4);
  private readonly poleGeometry = new CylinderGeometry(0.7, 1, 1, 6, 1, true);
  private readonly ropeSegmentGeometry = new CylinderGeometry(0.85, 1, 1, 5, 1, true);
  private readonly bodies: InstancedMesh;
  private readonly heads: InstancedMesh;
  private readonly legs: InstancedMesh;
  private readonly arms: InstancedMesh;
  private readonly sledDecks: InstancedMesh;
  private readonly sledRunners: InstancedMesh;
  private readonly frameLogs: InstancedMesh;
  private readonly cribLogs: InstancedMesh;
  private readonly guideBeams: InstancedMesh;
  private readonly pits: InstancedMesh;
  private readonly packingRubble: InstancedMesh;
  private readonly dust: InstancedMesh;
  private readonly ropes: InstancedMesh;
  private readonly pitMaterial: MeshStandardMaterial;
  private readonly rubbleMaterial: MeshStandardMaterial;
  private readonly dustMaterial: MeshStandardMaterial;
  private readonly timberMaterial: MeshStandardMaterial;
  private readonly ropeMaterial: MeshStandardMaterial;

  constructor(
    materials: MaterialLibrary,
    private readonly plan: StonehengeConstructionPlan,
  ) {
    this.group.name = 'stonehenge-operation-bound-work-system';
    const workerCount = MAX_OPERATIONS * WORKERS_PER_OPERATION;
    this.bodies = new InstancedMesh(this.workerBodyGeometry, materials.linen, workerCount);
    this.heads = new InstancedMesh(this.workerHeadGeometry, materials.skin, workerCount);
    this.legs = new InstancedMesh(this.legGeometry, materials.skin, workerCount * 2);
    this.arms = new InstancedMesh(this.armGeometry, materials.skin, workerCount * 2);
    this.timberMaterial = materials.wood.clone();
    this.timberMaterial.color.set('#a67c4f');
    this.timberMaterial.roughness = 0.98;
    this.sledDecks = new InstancedMesh(this.boxGeometry, this.timberMaterial, MAX_OPERATIONS);
    this.sledRunners = new InstancedMesh(this.boxGeometry, this.timberMaterial, MAX_OPERATIONS * 2);
    this.frameLogs = new InstancedMesh(this.poleGeometry, this.timberMaterial, MAX_OPERATIONS * 3);
    this.cribLogs = new InstancedMesh(this.boxGeometry, this.timberMaterial, MAX_CRIB_LOGS);
    this.guideBeams = new InstancedMesh(this.boxGeometry, this.timberMaterial, MAX_OPERATIONS * 2);
    this.pitMaterial = materials.whitewash.clone();
    this.pitMaterial.color.set('#6c6759');
    this.pitMaterial.roughness = 1;
    this.pits = new InstancedMesh(this.pitGeometry, this.pitMaterial, MAX_PITS);
    this.rubbleMaterial = materials.whitewash.clone();
    this.rubbleMaterial.color.set('#e9e5d6');
    this.packingRubble = new InstancedMesh(this.rubbleGeometry, this.rubbleMaterial, MAX_RUBBLE);
    this.dustMaterial = materials.whitewash.clone();
    this.dustMaterial.color.set('#d8d1b5');
    this.dustMaterial.transparent = true;
    this.dustMaterial.opacity = 0.34;
    this.dustMaterial.depthWrite = false;
    this.dust = new InstancedMesh(this.dustGeometry, this.dustMaterial, MAX_DUST);
    this.ropeMaterial = materials.rope.clone();
    this.ropeMaterial.color.set('#7a5a32');
    this.ropeMaterial.roughness = 1;
    this.ropes = new InstancedMesh(this.ropeSegmentGeometry, this.ropeMaterial, MAX_ROPE_CYLINDERS);

    for (const mesh of [
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.sledDecks,
      this.sledRunners,
      this.frameLogs,
      this.cribLogs,
      this.guideBeams,
      this.pits,
      this.packingRubble,
      this.ropes,
    ]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    }
    this.dust.castShadow = false;
    this.dust.receiveShadow = false;
    this.dust.frustumCulled = false;
    this.group.add(
      this.pits,
      this.packingRubble,
      this.sledDecks,
      this.sledRunners,
      this.frameLogs,
      this.cribLogs,
      this.guideBeams,
      this.bodies,
      this.heads,
      this.legs,
      this.arms,
      this.dust,
      this.ropes,
    );
  }

  update(operations: ActiveStonehengeOperation[], t: number): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const from = new Vector3();
    const to = new Vector3();
    let bodyCursor = 0;
    let legCursor = 0;
    let armCursor = 0;
    let sledCursor = 0;
    let runnerCursor = 0;
    let frameCursor = 0;
    let cribCursor = 0;
    let guideCursor = 0;
    let pitCursor = 0;
    let rubbleCursor = 0;
    let dustCursor = 0;
    let ropeCursor = 0;

    for (const operation of operations.slice(0, MAX_OPERATIONS)) {
      const { stone, state } = operation;
      const position = new Vector3(...state.position);
      const yaw = state.rotation[1];
      const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const lateral = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const groundY = stonehengeTerrainHeightAt(position.x, position.z);
      const heel = state.heelPosition
        ? new Vector3(...state.heelPosition)
        : position.clone();
      const supportY = position.y - stonehengeVerticalHalfExtent(stone, state.rotation);
      const hauling = state.mechanism === 'sled';
      const raising = state.mechanism === 'a-frame';
      const cribbing = state.mechanism === 'timber-crib';

      if (hauling || state.mechanism === 'skids') {
        const carrierHeight = Math.max(0.04, state.sledLift);
        const deckHeight = Math.min(0.16, Math.max(0.04, carrierHeight * 0.45));
        const runnerHeight = Math.max(0.04, carrierHeight - deckHeight);
        compose(matrix, new Vector3(position.x, supportY - deckHeight * 0.5, position.z), yaw, new Vector3(stone.dimensions[0] * 1.25, deckHeight, stone.dimensions[1] * 1.04), quaternion);
        this.sledDecks.setMatrixAt(sledCursor, matrix);
        sledCursor += 1;
        for (const side of [-1, 1] as const) {
          const runner = position.clone().addScaledVector(lateral, side * stone.dimensions[0] * 0.48);
          runner.y = groundY + runnerHeight * 0.5;
          compose(matrix, runner, yaw, new Vector3(0.1, runnerHeight, stone.dimensions[1] * 1.1), quaternion);
          this.sledRunners.setMatrixAt(runnerCursor, matrix);
          runnerCursor += 1;
        }
      }

      if (stone.role === 'upright' && ['positioned', 'tilted', 'raised', 'packed'].includes(state.phase)) {
        compose(
          matrix,
          new Vector3(stone.finalPosition[0], -0.22, stone.finalPosition[2]),
          0,
          new Vector3(stone.dimensions[0] * 1.35, 1, stone.dimensions[2] * 1.35),
          quaternion,
        );
        this.pits.setMatrixAt(pitCursor, matrix);
        pitCursor += 1;
      }

      const apex = heel.clone().addScaledVector(forward, 0.95);
      apex.y = Math.min(8.2, stone.dimensions[1] * 0.88 + 1.55);
      if (raising) {
        for (const side of [-1, 1] as const) {
          const foot = heel.clone().addScaledVector(forward, 0.25).addScaledVector(lateral, side * 1.55);
          foot.y = stonehengeTerrainHeightAt(foot.x, foot.z) + 0.04;
          composeAlong(matrix, foot, apex, 0.2, quaternion);
          this.frameLogs.setMatrixAt(frameCursor, matrix);
          frameCursor += 1;
        }
        const left = apex.clone().addScaledVector(lateral, -1.05);
        const right = apex.clone().addScaledVector(lateral, 1.05);
        left.y -= 0.12;
        right.y -= 0.12;
        composeAlong(matrix, left, right, 0.12, quaternion);
        this.frameLogs.setMatrixAt(frameCursor, matrix);
        frameCursor += 1;

        const stoneTop = position.clone().sub(heel).multiplyScalar(2).add(heel);
        for (const side of [-1, 1] as const) {
          from.copy(stoneTop);
          to.copy(apex).addScaledVector(lateral, side * 0.28);
          ropeCursor = setRopeRun(this.ropes, ropeCursor, from, to, state.ropeTension, 0.055, matrix, quaternion);
        }
      }

      if (cribbing) {
        const layers = Math.max(1, Math.min(22, Math.round(state.cribHeight / CRIB_LOG_HEIGHT)));
        const span = Math.max(stone.dimensions[0], stone.dimensions[2]) * 1.08;
        for (let layer = 0; layer < layers && cribCursor + 3 <= MAX_CRIB_LOGS; layer += 1) {
          const y = state.cribHeight - CRIB_LOG_HEIGHT * 0.5 - (layers - 1 - layer) * CRIB_LOG_HEIGHT;
          if (y < 0.06) continue;
          const alongLength = layer % 2 === 0;
          for (let index = 0; index < 3; index += 1) {
            const offset = (index - 1) * 0.36;
            const log = position.clone().addScaledVector(alongLength ? forward : lateral, offset);
            log.y = y;
            compose(
              matrix,
              log,
              yaw + (alongLength ? 0 : Math.PI / 2),
              new Vector3(span, CRIB_LOG_HEIGHT * 0.9, 0.22),
              quaternion,
            );
            this.cribLogs.setMatrixAt(cribCursor, matrix);
            cribCursor += 1;
          }
        }
        from.copy(position).addScaledVector(lateral, -stone.dimensions[0] * 0.42);
        to.copy(position).addScaledVector(lateral, stone.dimensions[0] * 0.42);
        from.y = state.cribHeight + 0.04;
        to.y = state.cribHeight + 0.04;
        ropeCursor = setRopeRun(this.ropes, ropeCursor, from, to, state.ropeTension, 0.045, matrix, quaternion);
      }

      if (state.mechanism === 'guide-rails') {
        for (const side of [-1, 1] as const) {
          const guide = new Vector3(
            stone.finalPosition[0],
            state.cribHeight - 0.08,
            stone.finalPosition[2],
          ).addScaledVector(lateral, side * stone.dimensions[2] * 0.58);
          compose(matrix, guide, stone.finalRotation[1], new Vector3(stone.dimensions[0] * 1.18, 0.16, 0.14), quaternion);
          this.guideBeams.setMatrixAt(guideCursor, matrix);
          guideCursor += 1;
        }
      }

      if (state.phase === 'packed' || (stone.role === 'upright' && state.packingFill > 0)) {
        rubbleCursor = this.placePacking(
          stone,
          heel.y,
          state.packingFill,
          rubbleCursor,
          matrix,
          quaternion,
          10,
        );
      }

      const workersAt = raising ? heel : position;
      const handTargets: Vector3[] = [];
      for (let workerIndex = 0; workerIndex < WORKERS_PER_OPERATION; workerIndex += 1) {
        const side = workerIndex === 0 ? -0.78 : workerIndex === 1 ? 0.78 : 0;
        let along = 1.15 + workerIndex * 0.5;
        let lean = 0;
        if (hauling) {
          along = Math.max(stone.dimensions[1], stone.dimensions[2]) * 0.52 + 1.55 + workerIndex * 0.8;
          lean = 0.32;
        } else if (raising) {
          along = -2.35 - workerIndex * 0.5;
          lean = 0.3;
        } else if (cribbing) {
          along = workerIndex === 2 ? 1.35 : -1.2;
          lean = 0.14;
        } else if (state.phase === 'packed') {
          along = 1.05;
          lean = 0.22;
        }
        const worker = workersAt.clone().addScaledVector(forward, along).addScaledVector(lateral, side);
        const bob = Math.sin(t * 170 + bodyCursor * 1.9) * 0.04;
        worker.y = groundY;
        compose(matrix, new Vector3(worker.x, worker.y + 0.98 + bob, worker.z), yaw, new Vector3(1.28, 1.12, 1.28), quaternion, lean);
        this.bodies.setMatrixAt(bodyCursor, matrix);
        const headForward = lean * 0.55;
        compose(
          matrix,
          new Vector3(worker.x + forward.x * headForward, worker.y + 1.62 + bob, worker.z + forward.z * headForward),
          yaw,
          new Vector3(1.28, 1.28, 1.28),
          quaternion,
        );
        this.heads.setMatrixAt(bodyCursor, matrix);
        for (const legSide of [-1, 1] as const) {
          const leg = worker.clone().addScaledVector(lateral, legSide * 0.12);
          leg.y = groundY + 0.31;
          compose(matrix, leg, yaw + Math.sin(t * 170 + bodyCursor) * 0.26 * legSide, new Vector3(1, 1, 1), quaternion);
          this.legs.setMatrixAt(legCursor, matrix);
          legCursor += 1;
        }
        const reach = worker.clone().addScaledVector(forward, lean > 0 ? 0.55 : 0.18);
        reach.y = worker.y + 1.05 + bob;
        handTargets.push(reach);
        for (const armSide of [-1, 1] as const) {
          const shoulder = worker.clone().addScaledVector(lateral, armSide * 0.2);
          shoulder.y = worker.y + 1.28 + bob;
          composeAlong(matrix, shoulder, reach, 0.055, quaternion);
          this.arms.setMatrixAt(armCursor, matrix);
          armCursor += 1;
        }
        bodyCursor += 1;
      }

      if (hauling && handTargets[0] && handTargets[1]) {
        from.copy(position).addScaledVector(forward, stone.dimensions[1] * 0.55);
        from.y = supportY + 0.18;
        ropeCursor = setRopeRun(this.ropes, ropeCursor, from, handTargets[0], state.ropeTension, 0.05, matrix, quaternion);
        ropeCursor = setRopeRun(this.ropes, ropeCursor, from, handTargets[1], state.ropeTension, 0.05, matrix, quaternion);
      }
      if (raising && handTargets[0] && handTargets[1]) {
        ropeCursor = setRopeRun(this.ropes, ropeCursor, apex, handTargets[0], Math.max(0.45, state.ropeTension * 0.72), 0.05, matrix, quaternion);
        ropeCursor = setRopeRun(this.ropes, ropeCursor, apex, handTargets[1], Math.max(0.45, state.ropeTension * 0.72), 0.05, matrix, quaternion);
      }

      if (state.contactDust && state.contactDustAmount > 0.08) {
        const amount = 0.7 + state.contactDustAmount;
        if (state.contactKind === 'runners') {
          compose(matrix, new Vector3(position.x, supportY + 0.04, position.z), yaw, new Vector3(1.5 * amount, 0.18, 1.1 * amount), quaternion);
          this.dust.setMatrixAt(dustCursor, matrix);
          dustCursor += 1;
        } else if (state.contactKind === 'heel') {
          compose(
            matrix,
            new Vector3(stone.finalPosition[0], 0.08, stone.finalPosition[2]),
            yaw,
            new Vector3(1.15 * amount, 0.16, 1.15 * amount),
            quaternion,
          );
          this.dust.setMatrixAt(dustCursor, matrix);
          dustCursor += 1;
        } else if (state.contactKind === 'crib') {
          compose(matrix, new Vector3(position.x, state.cribHeight + 0.05, position.z), yaw, new Vector3(1.3 * amount, 0.14, 0.9 * amount), quaternion);
          this.dust.setMatrixAt(dustCursor, matrix);
          dustCursor += 1;
        }
      }
    }

    rubbleCursor = this.placeSettledPacking(t, operations, rubbleCursor, matrix, quaternion);

    const counts: Array<[InstancedMesh, number]> = [
      [this.bodies, bodyCursor],
      [this.heads, bodyCursor],
      [this.legs, legCursor],
      [this.arms, armCursor],
      [this.sledDecks, sledCursor],
      [this.sledRunners, runnerCursor],
      [this.frameLogs, frameCursor],
      [this.cribLogs, cribCursor],
      [this.guideBeams, guideCursor],
      [this.pits, pitCursor],
      [this.packingRubble, rubbleCursor],
      [this.dust, dustCursor],
      [this.ropes, ropeCursor],
    ];
    for (const [mesh, count] of counts) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private placePacking(
    stone: StonehengeStone,
    heelY: number,
    fill: number,
    cursor: number,
    matrix: Matrix4,
    quaternion: Quaternion,
    maxPieces: number,
  ): number {
    const count = Math.max(0, Math.min(maxPieces, Math.floor(fill * maxPieces)));
    const radius = Math.max(stone.dimensions[0], stone.dimensions[2]) * 0.42;
    for (let index = 0; index < count && cursor < MAX_RUBBLE; index += 1) {
      const angle = (index / Math.max(1, count)) * Math.PI * 2 + stone.colorVariation;
      const packedY = heelY * (1 - fill) + 0.11 * fill + (index % 3) * 0.035;
      const rubble = new Vector3(
        stone.finalPosition[0] + Math.cos(angle) * (radius + (index % 3) * 0.08),
        Math.max(0.06, packedY),
        stone.finalPosition[2] + Math.sin(angle) * (radius + (index % 3) * 0.08),
      );
      compose(matrix, rubble, angle, new Vector3(0.28, 0.16, 0.24), quaternion);
      this.packingRubble.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
    if (fill < 0.95 && cursor < MAX_RUBBLE) {
      const spoil = new Vector3(
        stone.finalPosition[0] + 1.55,
        0.18 + (1 - fill) * 0.16,
        stone.finalPosition[2] + 0.7,
      );
      compose(matrix, spoil, stone.finalRotation[1], new Vector3(0.85, 0.45 + (1 - fill) * 0.25, 0.7), quaternion);
      this.packingRubble.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
    if (fill > 0.2 && cursor + 4 <= MAX_RUBBLE) {
      const collarRadius = Math.max(stone.dimensions[0], stone.dimensions[2]) * 0.62;
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI * 0.5 + stone.colorVariation * 0.2;
        const collar = new Vector3(
          stone.finalPosition[0] + Math.cos(angle) * collarRadius,
          0.07 * fill,
          stone.finalPosition[2] + Math.sin(angle) * collarRadius,
        );
        compose(matrix, collar, angle, new Vector3(0.72, 0.16 * fill, 0.34), quaternion);
        this.packingRubble.setMatrixAt(cursor, matrix);
        cursor += 1;
      }
    }
    return cursor;
  }

  private placeSettledPacking(
    t: number,
    operations: ActiveStonehengeOperation[],
    cursor: number,
    matrix: Matrix4,
    quaternion: Quaternion,
  ): number {
    const activeIds = new Set(operations.map((operation) => operation.stone.id));
    for (const stone of this.plan.stones) {
      if (
        stone.role !== 'upright'
        || stone.material !== 'sarsen'
        || t < stone.start + stone.duration
        || activeIds.has(stone.id)
      ) {
        continue;
      }
      cursor = this.placePacking(
        stone,
        stone.finalPosition[1] - stone.dimensions[1] * 0.5,
        1,
        cursor,
        matrix,
        quaternion,
        0,
      );
    }
    return cursor;
  }

  dispose(): void {
    for (const mesh of [
      this.bodies, this.heads, this.legs, this.arms, this.sledDecks, this.sledRunners,
      this.frameLogs, this.cribLogs, this.guideBeams, this.pits,
      this.packingRubble, this.dust, this.ropes,
    ]) mesh.dispose();
    this.workerBodyGeometry.dispose();
    this.workerHeadGeometry.dispose();
    this.legGeometry.dispose();
    this.armGeometry.dispose();
    this.boxGeometry.dispose();
    this.pitGeometry.dispose();
    this.rubbleGeometry.dispose();
    this.dustGeometry.dispose();
    this.poleGeometry.dispose();
    this.ropeSegmentGeometry.dispose();
    this.pitMaterial.dispose();
    this.rubbleMaterial.dispose();
    this.dustMaterial.dispose();
    this.timberMaterial.dispose();
    this.ropeMaterial.dispose();
  }
}
