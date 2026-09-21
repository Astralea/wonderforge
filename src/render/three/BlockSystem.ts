import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type {
  BlockMaterial,
  ConstructionBlock,
  CoreFillCell,
  GizaConstructionPlan,
  MonumentId,
  MonumentPlan,
} from '../../data/constructionTypes';
import { activeConstructionStatesAt, type ActiveConstructionState } from '../../engine/construction';
import {
  gizaCoreOccupancyVolume,
  type GizaCoreOccupancyVolume,
} from '../../engine/gizaOccupancy';
import type { MaterialLibrary } from './MaterialLibrary';

interface SettledBatch {
  blocks: ConstructionBlock[];
  mesh: InstancedMesh;
}

interface CoreBatch {
  monument: Exclude<MonumentId, 'temple'>;
  cells: CoreFillCell[];
  mesh: InstancedMesh;
  courseStarts: number[];
  lastKey: string;
}

interface CoreOccupancy {
  monument: Exclude<MonumentId, 'temple'>;
  mesh: Mesh;
  lastKey: string;
}

function upperBound(blocks: ConstructionBlock[], t: number): number {
  let low = 0;
  let high = blocks.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const block = blocks[middle]!;
    if (block.start + block.duration <= t) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Settled order: ascending seat time. The settled set at any `t` is then a
 * true prefix, whatever the schedule does. Plan order is NOT good enough:
 * starts ascend, but durations vary per course (heavy courses move stones
 * more deliberately), so `start + duration` zigzags at course boundaries —
 * and a binary search over that once dropped whole wedges of finished
 * masonry near the end of the movie.
 */
function bySeatTime(a: ConstructionBlock, b: ConstructionBlock): number {
  return a.start + a.duration - (b.start + b.duration);
}

export class BlockSystem {
  readonly group = new Group();
  private readonly geometry = new BoxGeometry(1, 1, 1, 1, 1, 1);
  private readonly settled: SettledBatch[] = [];
  private readonly activeBatches = new Map<BlockMaterial, InstancedMesh>();
  private readonly coreBatches: CoreBatch[] = [];
  private readonly occupancies: CoreOccupancy[] = [];
  private readonly occupancyMaterial: MeshStandardMaterial;

  constructor(
    private readonly plan: GizaConstructionPlan,
    materials: MaterialLibrary,
  ) {
    this.group.name = 'physical-masonry-block-system';
    const materialKeys: BlockMaterial[] = ['core-limestone', 'casing-limestone', 'granite'];
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const color = new Color();

    for (const materialKey of materialKeys) {
      const blocks = plan.blocks
        .filter((block) => block.material === materialKey)
        .sort(bySeatTime);
      const batch = new InstancedMesh(this.geometry, materials.block[materialKey], blocks.length);
      batch.name = `settled-${materialKey}-stones`;
      batch.castShadow = true;
      batch.receiveShadow = true;
      batch.count = 0;
      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index]!;
        rotation.setFromAxisAngle(new Vector3(0, 1, 0), block.finalYaw);
        matrix.compose(
          new Vector3(...block.finalPosition),
          rotation,
          new Vector3(...block.dimensions),
        );
        batch.setMatrixAt(index, matrix);
        const brightness = 1 + block.colorVariation * 0.055;
        color.setRGB(brightness, brightness, brightness);
        batch.setColorAt(index, color);
      }
      batch.instanceMatrix.needsUpdate = true;
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
      // InstancedMesh caches its bounding sphere on FIRST render. The movie's
      // first frame renders these with count 0, so the cached bounds are
      // degenerate at the world origin — and when the late-movie camera
      // excludes the origin, the whole batch is culled from the camera pass
      // while the sun's wider shadow frustum still draws it: finished
      // pyramids vanished leaving only their shadows. These batches span the
      // scene and mutate every frame; culling them is never a win.
      batch.frustumCulled = false;
      this.settled.push({ blocks, mesh: batch });
      this.group.add(batch);
    }

    for (const materialKey of materialKeys) {
      const active = new InstancedMesh(this.geometry, materials.block[materialKey], 24);
      active.name = `active-${materialKey}-construction-stones`;
      active.castShadow = true;
      active.receiveShadow = true;
      active.count = 0;
      active.frustumCulled = false; // per-frame instances; see settled note
      this.activeBatches.set(materialKey, active);
      this.group.add(active);
    }

    this.occupancyMaterial = materials.block['core-limestone'].clone();
    this.occupancyMaterial.transparent = false;
    this.occupancyMaterial.opacity = 1;
    this.occupancyMaterial.depthWrite = true;
    this.occupancyMaterial.polygonOffset = true;
    this.occupancyMaterial.polygonOffsetFactor = 1;
    this.occupancyMaterial.polygonOffsetUnits = 1;

    for (const monument of ['khufu', 'khafre', 'menkaure'] as const) {
      const cells = plan.coreCells.filter((cell) => cell.monument === monument).sort((a, b) => a.readyAt - b.readyAt);
      const courseStarts: number[] = [];
      for (const block of plan.blocks) {
        if (block.monument === monument) {
          courseStarts[block.course] = Math.min(courseStarts[block.course] ?? Infinity, block.start);
        }
      }
      const core = new InstancedMesh(this.geometry, materials.block['core-limestone'], cells.length);
      core.name = `${monument}-supported-stacked-core-fill`;
      core.castShadow = true;
      core.receiveShadow = true;
      core.count = 0;
      core.frustumCulled = false; // per-frame instances; see settled note
      this.coreBatches.push({ monument, cells, mesh: core, courseStarts, lastKey: '' });
      this.group.add(core);

      const occupancy = new Mesh(placeholderOccupancyGeometry(), this.occupancyMaterial);
      occupancy.name = `${monument}-core-occupancy`;
      occupancy.castShadow = true;
      occupancy.receiveShadow = true;
      occupancy.visible = false;
      occupancy.frustumCulled = false;
      this.occupancies.push({ monument, mesh: occupancy, lastKey: '' });
      this.group.add(occupancy);
    }
  }

  private updateCoreFill(t: number): void {
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const color = new Color();
    const axis = new Vector3(0, 1, 0);
    for (const batch of this.coreBatches) {
      let courseLow = 0;
      let courseHigh = batch.courseStarts.length;
      while (courseLow < courseHigh) {
        const mid = (courseLow + courseHigh) >>> 1;
        if (batch.courseStarts[mid]! <= t) courseLow = mid + 1;
        else courseHigh = mid;
      }
      const activeCourse = courseLow - 1;
      let cellLow = 0;
      let cellHigh = batch.cells.length;
      while (cellLow < cellHigh) {
        const mid = (cellLow + cellHigh) >>> 1;
        if (batch.cells[mid]!.readyAt <= t) cellLow = mid + 1;
        else cellHigh = mid;
      }
      const key = `${activeCourse}:${cellLow}`;
      if (batch.lastKey === key) continue;
      batch.lastKey = key;
      if (activeCourse < 0) {
        batch.mesh.count = 0;
        this.hideOccupancy(batch.monument);
        continue;
      }
      this.updateOccupancy(this.plan.monuments[batch.monument], activeCourse);
      // Keep the working deck plus three supporting courses as visible rubble.
      // Deeper fill is a gapless occupancy frustum so casing joints cannot
      // transmit the key light onto the far inner face.
      const minimumVisibleCourse = Math.max(0, activeCourse - 3);
      let cursor = 0;
      for (const cell of batch.cells) {
        if (
          cell.course < minimumVisibleCourse
          || cell.course > activeCourse
          || cell.readyAt > t
        ) continue;
        rotation.setFromAxisAngle(axis, cell.colorVariation * 0.035);
        matrix.compose(
          new Vector3(...cell.finalPosition),
          rotation,
          new Vector3(...cell.dimensions),
        );
        batch.mesh.setMatrixAt(cursor, matrix);
        const brightness = 0.91 + cell.colorVariation * 0.045;
        color.setRGB(brightness, brightness * 0.985, brightness * 0.94);
        batch.mesh.setColorAt(cursor, color);
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
  }

  private hideOccupancy(monument: Exclude<MonumentId, 'temple'>): void {
    const occupancy = this.occupancies.find((entry) => entry.monument === monument);
    if (!occupancy) return;
    occupancy.mesh.visible = false;
    occupancy.lastKey = '';
  }

  private updateOccupancy(monument: MonumentPlan, activeCourse: number): void {
    const occupancy = this.occupancies.find((entry) => entry.monument === monument.id);
    if (!occupancy) return;
    const volume = gizaCoreOccupancyVolume(monument, activeCourse);
    if (!volume) {
      this.hideOccupancy(monument.id);
      return;
    }
    const key = occupancyKey(volume);
    if (occupancy.lastKey !== key) {
      occupancy.mesh.geometry.dispose();
      occupancy.mesh.geometry = occupancyGeometry(volume);
      occupancy.lastKey = key;
    }
    occupancy.mesh.position.set(volume.x, volume.y, volume.z);
    occupancy.mesh.visible = true;
  }

  update(t: number): ActiveConstructionState[] {
    for (const batch of this.settled) batch.mesh.count = upperBound(batch.blocks, t);
    this.updateCoreFill(t);
    const active = activeConstructionStatesAt(this.plan, t);
    const cursors = new Map<BlockMaterial, number>();
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    for (const operation of active) {
      const material = operation.block.material;
      const batch = this.activeBatches.get(material)!;
      const cursor = cursors.get(material) ?? 0;
      rotation.setFromEuler(new Euler(operation.state.pitch, operation.state.yaw, 0, 'YXZ'));
      matrix.compose(
        new Vector3(...operation.state.position),
        rotation,
        new Vector3(...operation.block.dimensions),
      );
      batch.setMatrixAt(cursor, matrix);
      cursors.set(material, cursor + 1);
    }
    for (const [material, batch] of this.activeBatches) {
      batch.count = cursors.get(material) ?? 0;
      batch.instanceMatrix.needsUpdate = true;
    }
    return active;
  }

  dispose(): void {
    for (const batch of this.settled) batch.mesh.dispose();
    for (const batch of this.coreBatches) batch.mesh.dispose();
    for (const mesh of this.activeBatches.values()) mesh.dispose();
    this.geometry.dispose();
    this.occupancyMaterial.dispose();
    for (const occupancy of this.occupancies) occupancy.mesh.geometry.dispose();
  }
}

function occupancyKey(volume: GizaCoreOccupancyVolume): string {
  return `${volume.height.toFixed(4)}:${volume.bottomWidth.toFixed(4)}:${volume.topWidth.toFixed(4)}`;
}

function occupancyGeometry(volume: GizaCoreOccupancyVolume): CylinderGeometry {
  // 4-sided cylinder vertices sit on the axes. Rotate 45° and use the
  // circumscribed radius so the faces stay axis-aligned with the casing.
  const geometry = new CylinderGeometry(
    (volume.topWidth / 2) * Math.SQRT2,
    (volume.bottomWidth / 2) * Math.SQRT2,
    volume.height,
    4,
  );
  geometry.rotateY(Math.PI / 4);
  return geometry;
}

function placeholderOccupancyGeometry(): CylinderGeometry {
  return occupancyGeometry({
    height: 1,
    bottomWidth: 1,
    topWidth: 1,
    x: 0,
    y: 0,
    z: 0,
  });
}
