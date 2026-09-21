import {
  BoxGeometry,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { StonehengeConstructionPlan, StonehengeMaterial, StonehengeStone, StonehengeStoneRole } from '../../data/stonehengeTypes';
import { activeStonehengeOperationsAt, type ActiveStonehengeOperation } from '../../engine/stonehengeConstruction';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

interface SettledBatch {
  stones: StonehengeStone[];
  mesh: InstancedMesh;
}

type StoneShape = StonehengeStoneRole | 'heel';

const shapeFor = (stone: StonehengeStone): StoneShape =>
  stone.id === 'heel-stone' ? 'heel' : stone.role;
const keyFor = (stone: StonehengeStone) => `${stone.material}:${shapeFor(stone)}`;
const seatTime = (stone: StonehengeStone) => stone.start + stone.duration;

function upperBound(stones: StonehengeStone[], t: number): number {
  let low = 0;
  let high = stones.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (seatTime(stones[middle]!) <= t) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Unit stone with weathered silhouette; final dimensions come from instances. */
export function createStonehengeStoneGeometry(role: StonehengeStoneRole, unworked = false): BufferGeometry {
  const geometry = new BoxGeometry(
    1,
    1,
    1,
    role === 'upright' ? (unworked ? 4 : 3) : 6,
    role === 'upright' ? (unworked ? 7 : 6) : 2,
    unworked ? 3 : 2,
  );
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const vertical = y + 0.5;
    const shoulder = Math.max(0, Math.min(1, (vertical - 0.68) / 0.32));
    const faceWeather = Math.sin(x * 17.3 + y * 13.1 + z * 23.7 + (unworked ? 2.3 : 0))
      + Math.sin(x * 7.1 - y * 19.7 + z * 11.3) * 0.45;
    const edgeWeather = faceWeather * (unworked ? 0.064 : role === 'upright' ? 0.032 : 0.022);
    const uprightTaper = role === 'upright'
      ? 1 - vertical * (unworked ? 0.09 : 0.068) - shoulder * shoulder * (unworked ? 0.16 : 0.13)
      : 1;
    const lintelEndTaper = role === 'lintel'
      ? 1 - Math.max(0, Math.abs(x) - 0.34) * 0.12
      : 1;
    const sideWander = role === 'upright'
      ? Math.sin(vertical * 7.2 + (unworked ? 1.7 : 0.3)) * (unworked ? 0.035 : 0.014)
      : 0;
    position.setX(index, x * uprightTaper + Math.sign(x || 1) * edgeWeather + sideWander);
    position.setZ(index, z * uprightTaper * lintelEndTaper + Math.sign(z || 1) * edgeWeather * 0.72);
    if (role === 'lintel') {
      // Worked lintels remain flat enough to seat, with a very shallow crown
      // and chipped ends rather than a machine-perfect cuboid silhouette.
      const crown = (1 - Math.min(1, x * x * 4)) * 0.028;
      const endWear = Math.max(0, Math.abs(x) - 0.38) * 0.035;
      position.setY(index, y < 0 ? -0.5 : y + crown - endWear + edgeWeather * 0.25);
    } else if (Math.abs(y) < 0.49) {
      position.setY(index, y + faceWeather * 0.007);
    }
  }
  position.needsUpdate = true;
  // Weathering may change silhouette, but it may not move the load-bearing
  // envelope. Horizontal uprights bear on local X after the Z-quarter-turn;
  // lintels bear on local Y. Normalize those axes so pure contact math and the
  // rendered underside agree to the centimetre instead of leaving a shader-
  // invisible support contract and a visibly floating mesh.
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  if (role === 'upright') {
    const center = (bounds.min.x + bounds.max.x) * 0.5;
    const span = Math.max(1e-6, bounds.max.x - bounds.min.x);
    for (let index = 0; index < position.count; index += 1) {
      position.setX(index, (position.getX(index) - center) / span);
    }
  } else {
    const center = (bounds.min.y + bounds.max.y) * 0.5;
    const span = Math.max(1e-6, bounds.max.y - bounds.min.y);
    for (let index = 0; index < position.count; index += 1) {
      position.setY(index, (position.getY(index) - center) / span);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function stoneColor(material: StonehengeMaterial, variation: number, target: Color): Color {
  target.set(material === 'sarsen' ? '#a2a397' : '#637781');
  target.offsetHSL(
    variation * 0.006,
    variation * 0.012,
    variation * 0.035,
  );
  return target;
}

function setTransform(
  mesh: InstancedMesh,
  index: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  dimensions: readonly [number, number, number],
  matrix: Matrix4,
  quaternion: Quaternion,
): void {
  quaternion.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2], 'YXZ'));
  matrix.compose(new Vector3(...position), quaternion, new Vector3(...dimensions));
  mesh.setMatrixAt(index, matrix);
}

export class StonehengeStoneSystem {
  readonly group = new Group();
  private readonly geometries = new Map<StoneShape, BufferGeometry>();
  private readonly settled: SettledBatch[] = [];
  private readonly active = new Map<string, InstancedMesh>();
  private readonly localMaterials: MeshStandardMaterial[] = [];

  constructor(
    private readonly plan: StonehengeConstructionPlan,
    _materials: MaterialLibrary,
  ) {
    this.group.name = 'stonehenge-physical-stone-system';
    this.geometries.set('upright', createStonehengeStoneGeometry('upright'));
    this.geometries.set('lintel', createStonehengeStoneGeometry('lintel'));
    this.geometries.set('heel', createStonehengeStoneGeometry('upright', true));
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const materialByStone = new Map<StonehengeMaterial, MeshStandardMaterial>([
      ['sarsen', new MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.96,
        metalness: 0,
        flatShading: false,
      })],
      ['bluestone', new MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.91,
        metalness: 0,
        flatShading: false,
      })],
    ]);
    injectMaterialRecipe(materialByStone.get('sarsen')!, 'sarsen');
    injectMaterialRecipe(materialByStone.get('bluestone')!, 'bluestone');
    this.localMaterials.push(...materialByStone.values());

    const batchKeys = Array.from(new Set(plan.stones.map(keyFor)));
    for (const key of batchKeys) {
      const [material, shape] = key.split(':') as [StonehengeMaterial, StoneShape];
      const stones = plan.stones
        .filter((stone) => keyFor(stone) === key)
        .sort((a, b) => seatTime(a) - seatTime(b));
      const sharedMaterial = materialByStone.get(material)!;
      const geometry = this.geometries.get(shape)!;
      const settled = new InstancedMesh(geometry, sharedMaterial, stones.length);
      settled.name = `stonehenge-settled-${material}-${shape}s`;
      settled.castShadow = true;
      settled.receiveShadow = true;
      settled.count = 0;
      settled.frustumCulled = false;
      stones.forEach((stone, index) => {
        setTransform(settled, index, stone.finalPosition, stone.finalRotation, stone.dimensions, matrix, quaternion);
        settled.setColorAt(index, stoneColor(material, stone.colorVariation, color));
      });
      settled.instanceMatrix.needsUpdate = true;
      if (settled.instanceColor) settled.instanceColor.needsUpdate = true;
      this.settled.push({ stones, mesh: settled });
      this.group.add(settled);

      const active = new InstancedMesh(geometry, sharedMaterial, 20);
      active.name = `stonehenge-active-${material}-${shape}s`;
      active.castShadow = true;
      active.receiveShadow = true;
      active.count = 0;
      active.frustumCulled = false;
      this.active.set(key, active);
      this.group.add(active);
    }
  }

  update(t: number): ActiveStonehengeOperation[] {
    for (const batch of this.settled) batch.mesh.count = upperBound(batch.stones, t);
    const operations = activeStonehengeOperationsAt(this.plan, t);
    const cursors = new Map<string, number>();
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    for (const operation of operations) {
      const key = keyFor(operation.stone);
      const mesh = this.active.get(key)!;
      const cursor = cursors.get(key) ?? 0;
      setTransform(
        mesh,
        cursor,
        operation.state.position,
        operation.state.rotation,
        operation.stone.dimensions,
        matrix,
        quaternion,
      );
      mesh.setColorAt(cursor, stoneColor(
        operation.stone.material,
        operation.stone.colorVariation,
        color,
      ));
      cursors.set(key, cursor + 1);
    }
    for (const [key, mesh] of this.active) {
      mesh.count = cursors.get(key) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    return operations;
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) geometry.dispose();
    // Three r185 owns an instance buffer per InstancedMesh; dispose it where
    // supported instead of leaking it across scene switches (HANDOFF concern).
    for (const batch of this.settled) batch.mesh.dispose();
    for (const mesh of this.active.values()) mesh.dispose();
    for (const material of this.localMaterials) material.dispose();
  }
}
