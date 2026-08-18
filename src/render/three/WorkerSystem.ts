import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { ActiveConstructionState } from '../../engine/construction';
import type { MaterialLibrary } from './MaterialLibrary';

const MAX_OPERATIONS = 24;
const WORKERS_PER_OPERATION = 2;

const YAW_AXIS = new Vector3(0, 1, 0);
const LEAN_AXIS = new Vector3(1, 0, 0);
const yawQuaternion = new Quaternion();
const leanQuaternion = new Quaternion();

function compose(
  matrix: Matrix4,
  position: Vector3,
  yaw: number,
  scale: Vector3,
  lean = 0,
): Matrix4 {
  yawQuaternion.setFromAxisAngle(YAW_AXIS, yaw);
  if (lean !== 0) {
    // Tip the torso about its local lateral axis — a hauler leaning into a
    // tensioned rope pitches forward along the direction of travel.
    leanQuaternion.setFromAxisAngle(LEAN_AXIS, lean);
    yawQuaternion.multiply(leanQuaternion);
  }
  return matrix.compose(position, yawQuaternion, scale);
}

export class WorkerSystem {
  readonly group = new Group();
  private readonly bodyGeometry = new CylinderGeometry(0.24, 0.34, 0.95, 6);
  private readonly headGeometry = new SphereGeometry(0.22, 7, 5);
  private readonly legGeometry = new CylinderGeometry(0.075, 0.085, 0.62, 5);
  private readonly sledGeometry = new BoxGeometry(1, 1, 1);
  private readonly leverGeometry = new BoxGeometry(1, 1, 1);
  private readonly dustGeometry = new SphereGeometry(0.5, 8, 5);
  private readonly bodies: InstancedMesh;
  private readonly heads: InstancedMesh;
  private readonly legs: InstancedMesh;
  private readonly sleds: InstancedMesh;
  private readonly runners: InstancedMesh;
  private readonly levers: InstancedMesh;
  private readonly dust: InstancedMesh;
  private readonly ropeGeometry = new BufferGeometry();
  private readonly ropeMaterial = new LineBasicMaterial({ color: '#79502d' });
  private readonly dustMaterial: MeshStandardMaterial;
  private readonly ropes: LineSegments;
  private readonly ropePositions = new Float32Array(MAX_OPERATIONS * 6);

  constructor(materials: MaterialLibrary) {
    this.group.name = 'operation-bound-worker-system';
    const workerCount = MAX_OPERATIONS * WORKERS_PER_OPERATION;
    this.bodies = new InstancedMesh(this.bodyGeometry, materials.linen, workerCount);
    this.heads = new InstancedMesh(this.headGeometry, materials.skin, workerCount);
    this.legs = new InstancedMesh(this.legGeometry, materials.skin, workerCount * 2);
    this.sleds = new InstancedMesh(this.sledGeometry, materials.wood, MAX_OPERATIONS);
    this.runners = new InstancedMesh(this.sledGeometry, materials.wood, MAX_OPERATIONS * 2);
    this.levers = new InstancedMesh(this.leverGeometry, materials.wood, MAX_OPERATIONS);
    this.dustMaterial = materials.compactedEarth.clone();
    this.dustMaterial.transparent = true;
    this.dustMaterial.opacity = 0.42;
    this.dustMaterial.depthWrite = false;
    this.dust = new InstancedMesh(this.dustGeometry, this.dustMaterial, MAX_OPERATIONS);
    const ropeAttribute = new Float32BufferAttribute(this.ropePositions, 3);
    ropeAttribute.setUsage(DynamicDrawUsage);
    this.ropeGeometry.setAttribute('position', ropeAttribute);
    this.ropeGeometry.setDrawRange(0, 0);
    this.ropes = new LineSegments(this.ropeGeometry, this.ropeMaterial);

    for (const item of [this.bodies, this.heads, this.legs, this.sleds, this.runners, this.levers]) {
      item.castShadow = true;
      item.receiveShadow = true;
    }
    this.dust.castShadow = false;
    this.dust.receiveShadow = false;
    // Every mesh here rewrites matrices and count per frame, but three caches
    // the bounding volume from the FIRST render — which happens at t = 0 with
    // zero instances. The stale bounds then get camera-culled late in the
    // movie while the shadow pass still draws them: crews vanished leaving
    // walking shadows. The rope geometry's drawRange changes per frame too.
    for (const item of [this.bodies, this.heads, this.legs, this.sleds, this.runners, this.levers, this.dust, this.ropes]) {
      item.frustumCulled = false;
    }
    this.group.add(this.sleds, this.runners, this.levers, this.bodies, this.heads, this.legs, this.dust, this.ropes);
  }

  update(active: ActiveConstructionState[], t: number): void {
    const matrix = new Matrix4();
    let workerCursor = 0;
    let legCursor = 0;
    let sledCursor = 0;
    let runnerCursor = 0;
    let leverCursor = 0;
    let dustCursor = 0;
    let ropeCursor = 0;

    for (const operation of active.slice(0, MAX_OPERATIONS)) {
      const { block, state } = operation;
      const yaw = state.yaw;
      const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const lateral = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const blockPosition = new Vector3(...state.position);
      const supportY = Math.max(0.08, state.position[1] - block.dimensions[1] * 0.5);
      const isSledPhase = state.phase === 'loaded' || state.phase === 'hauled' || state.phase === 'queued' || state.phase === 'raised';
      // The engine lifts a sled-borne block by state.sledLift; the surface
      // the crew stands on — and the sled bed fills — is below that gap.
      const groundY = supportY - state.sledLift;
      const hauling = isSledPhase && state.phase !== 'loaded';

      if (isSledPhase) {
        // Deck directly under the stone, runners under the deck, both inside
        // the engine's sled gap so the assembly sits ON the surface.
        compose(matrix, new Vector3(blockPosition.x, supportY - 0.08, blockPosition.z), yaw, new Vector3(block.dimensions[0] * 1.2, 0.16, block.dimensions[2] * 1.35));
        this.sleds.setMatrixAt(sledCursor, matrix);
        sledCursor += 1;
        for (const side of [-1, 1] as const) {
          const runnerPosition = blockPosition.clone().addScaledVector(lateral, side * block.dimensions[0] * 0.48);
          runnerPosition.y = supportY - 0.24;
          compose(matrix, runnerPosition, yaw, new Vector3(0.1, 0.16, block.dimensions[2] * 1.65));
          this.runners.setMatrixAt(runnerCursor, matrix);
          runnerCursor += 1;
        }
      }

      for (let workerIndex = 0; workerIndex < WORKERS_PER_OPERATION; workerIndex += 1) {
        // Haul teams pull from AHEAD of the sled, leaning into the rope —
        // crews behind a moving sled read as following it, not moving it
        // (Spec 08: "haul teams lean into tensioned ropes"). Loading and
        // alignment crews work beside/behind the stone as before.
        const stride = 1.55 + workerIndex * 1.15;
        const side = workerIndex === 0 ? -0.62 : 0.62;
        const along = hauling ? stride + block.dimensions[2] * 0.55 : -stride;
        const lean = hauling ? 0.3 : 0;
        const worker = blockPosition
          .clone()
          .addScaledVector(forward, along)
          .addScaledVector(lateral, side);
        const bob = Math.sin(t * 190 + workerCursor * 1.7) * 0.045;
        worker.y = groundY;
        compose(matrix, new Vector3(worker.x, worker.y + 0.92 + bob, worker.z), yaw, new Vector3(1, 1, 1), lean);
        this.bodies.setMatrixAt(workerCursor, matrix);
        const headForward = hauling ? 0.18 : 0;
        compose(
          matrix,
          new Vector3(worker.x + forward.x * headForward, worker.y + 1.56 + bob, worker.z + forward.z * headForward),
          yaw,
          new Vector3(1, 1, 1),
        );
        this.heads.setMatrixAt(workerCursor, matrix);

        for (const legSide of [-1, 1] as const) {
          const leg = worker.clone().addScaledVector(lateral, legSide * 0.12);
          leg.y += 0.32;
          const step = Math.sin(t * 190 + workerCursor * 1.7) * 0.32 * legSide;
          compose(matrix, leg, yaw + step, new Vector3(1, 1, 1));
          this.legs.setMatrixAt(legCursor, matrix);
          legCursor += 1;
        }
        workerCursor += 1;
      }

      if (hauling) {
        // A taut line from the stone's front lashing up to the lead crew's
        // hands: rising toward the pullers, never slack behind the sled.
        const ropeStart = blockPosition.clone().addScaledVector(forward, block.dimensions[2] * 0.62);
        ropeStart.y = supportY + 0.22;
        const ropeEnd = blockPosition.clone().addScaledVector(forward, block.dimensions[2] * 0.55 + 2.35);
        ropeEnd.y = groundY + 0.86;
        this.ropePositions.set([
          ropeStart.x, ropeStart.y, ropeStart.z,
          ropeEnd.x, ropeEnd.y, ropeEnd.z,
        ], ropeCursor * 6);
        ropeCursor += 1;
      }

      if (state.phase === 'aligned') {
        const leverPosition = blockPosition.clone().addScaledVector(lateral, block.dimensions[0] * 0.74);
        leverPosition.y = supportY + 0.25;
        compose(matrix, leverPosition, yaw + 0.25, new Vector3(0.16, 0.16, 3.2));
        this.levers.setMatrixAt(leverCursor, matrix);
        leverCursor += 1;
      }

      if (state.contactDust) {
        compose(matrix, new Vector3(blockPosition.x, supportY + 0.08, blockPosition.z), yaw, new Vector3(1.7, 0.22, 1.3));
        this.dust.setMatrixAt(dustCursor, matrix);
        dustCursor += 1;
      }
    }

    this.bodies.count = workerCursor;
    this.heads.count = workerCursor;
    this.legs.count = legCursor;
    this.sleds.count = sledCursor;
    this.runners.count = runnerCursor;
    this.levers.count = leverCursor;
    this.dust.count = dustCursor;
    for (const item of [this.bodies, this.heads, this.legs, this.sleds, this.runners, this.levers, this.dust]) {
      item.instanceMatrix.needsUpdate = true;
    }
    this.ropeGeometry.setDrawRange(0, ropeCursor * 2);
    this.ropeGeometry.attributes.position!.needsUpdate = true;
  }

  dispose(): void {
    this.bodyGeometry.dispose();
    this.headGeometry.dispose();
    this.legGeometry.dispose();
    this.sledGeometry.dispose();
    this.leverGeometry.dispose();
    this.dustGeometry.dispose();
    this.ropeGeometry.dispose();
    this.ropeMaterial.dispose();
    this.dustMaterial.dispose();
  }
}
