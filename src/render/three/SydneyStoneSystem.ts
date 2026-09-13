import {
  BoxGeometry,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { SYDNEY_SPHERE_RADIUS, SYDNEY_SAILS } from '../../data/sydneyConstruction';
import type { SydneySailDef } from '../../data/sydneyConstruction';
import type { SydneyConstructionPlan, SydneyPart, SydneyPartKind } from '../../data/sydneyTypes';
import {
  activeSydneyOperationsAt,
  sydneyPartStateAt,
  type ActiveSydneyOperation,
} from '../../engine/sydneyConstruction';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

/**
 * Set instance transform for blocks and ribs (dimensions used as scale).
 */
function setScaledTransform(
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

/**
 * Set instance transform for sails — scale is always [1,1,1] because the
 * geometry is already authored at full world size from the Utzon sphere.
 */
function setSailTransform(
  mesh: InstancedMesh,
  index: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  matrix: Matrix4,
  quaternion: Quaternion,
): void {
  quaternion.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2], 'YXZ'));
  matrix.compose(new Vector3(...position), quaternion, new Vector3(1, 1, 1));
  mesh.setMatrixAt(index, matrix);
}

function stoneColor(material: SydneyPart['material'], variation: number, target: Color): Color {
  if (material === 'granite') target.set('#8a7a6a');
  else if (material === 'concrete') target.set('#c8c0b4');
  else target.set('#f2ebe0');
  target.offsetHSL(variation * 0.008, variation * 0.014, variation * 0.03);
  return target;
}

/** Unit-box geometry for blocks and ribs (scaled by instance matrix). */
export function createSydneyPartGeometry(kind: SydneyPartKind): BufferGeometry {
  if (kind !== 'sail') return new BoxGeometry(1, 1, 1, 2, 2, 2);
  // Return a unit normalised sphere cap for the test contract.
  // Real per-sail geometries are created by createSailGeometry().
  const geometry = new SphereGeometry(1, 36, 24, 0, Math.PI * 0.62, 0.16, Math.PI * 0.58);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / Math.max(1e-4, size.x), 1 / Math.max(1e-4, size.y), 1 / Math.max(1e-4, size.z));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Build a full-size spherical cap geometry for one sail definition.
 * The geometry is centred at the sail's finalPosition in world space;
 * the renderer places it with scale [1,1,1], applying only position + rotation.
 *
 * Utzon's constraint: all sails are sections of ONE sphere of radius ~75 m.
 * phiStart/phiLength define latitude, thetaHalf the azimuthal half-width.
 */
export function createSailGeometry(sail: SydneySailDef): BufferGeometry {
  const { centre, phiStart, phiLength, thetaHalf } = sail.sphere;
  const thetaStart = -thetaHalf;
  const thetaLength = thetaHalf * 2;
  // Build the cap around the sphere centre
  const geom = new SphereGeometry(
    SYDNEY_SPHERE_RADIUS,
    32,   // widthSegments — enough for a smooth curve
    18,   // heightSegments
    thetaStart + Math.PI / 2,  // SphereGeometry theta is around Y; we orient via sail rotation
    thetaLength,
    phiStart,
    phiLength,
  );
  // Translate so the geometry centroid is at origin; the instance matrix will
  // place it at sail.position.
  geom.computeBoundingBox();
  const box = geom.boundingBox!;
  const c = new Vector3();
  box.getCenter(c);
  geom.translate(
    centre[0] - c.x,
    centre[1] - c.y,
    centre[2] - c.z,
  );
  geom.computeVertexNormals();
  return geom;
}

export class SydneyStoneSystem {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly localMaterials: MeshStandardMaterial[] = [];

  // Separate settled batches for blocks/ribs (scaled) and one mesh per sail (unscaled)
  private readonly scaledBatches: Array<{ parts: SydneyPart[]; mesh: InstancedMesh }>;
  private readonly sailBatches: Array<{ part: SydneyPart; def: SydneySailDef; mesh: InstancedMesh }>;

  // Active (in-motion) meshes
  private readonly activeBlockMesh: InstancedMesh;
  private readonly activeRibMesh: InstancedMesh;
  /** One active mesh per sail def — sails in transit use their own geometry. */
  private readonly activeSailMeshes: Array<{ def: SydneySailDef; mesh: InstancedMesh }>;

  private readonly tileMaterial: MeshStandardMaterial;

  constructor(
    private readonly plan: SydneyConstructionPlan,
    _materials: MaterialLibrary,
  ) {
    this.group.name = 'sydney-physical-stone-system';
    const granite = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0 });
    injectMaterialRecipe(granite, 'granite');
    const concrete = new MeshStandardMaterial({ color: '#c8c0b4', roughness: 0.9, metalness: 0 });
    injectMaterialRecipe(concrete, 'granite');
    const tile = new MeshStandardMaterial({ color: '#f7f1e6', roughness: 0.42, metalness: 0 });
    injectMaterialRecipe(tile, 'hoganas-tile');
    this.localMaterials.push(granite, concrete, tile);
    this.tileMaterial = tile;

    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();

    // --- Settled block and rib batches (scaled by dimensions) ---
    this.scaledBatches = (['block', 'rib'] as const).map((kind) => {
      const parts = plan.parts.filter((part) => part.kind === kind);
      const geometry = createSydneyPartGeometry(kind);
      this.geometries.push(geometry);
      const mat = kind === 'block' ? granite : concrete;
      const mesh = new InstancedMesh(geometry, mat, Math.max(1, parts.length));
      mesh.name = `sydney-parts-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      parts.forEach((part, index) => {
        setScaledTransform(mesh, index, part.finalPosition, part.finalRotation, part.dimensions, matrix, quaternion);
        mesh.setColorAt(index, stoneColor(part.material, part.colorVariation, color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      return { parts, mesh };
    });

    // --- Settled sail batches — one InstancedMesh(1) per sail, full-size geometry ---
    this.sailBatches = [];
    for (const def of SYDNEY_SAILS) {
      const sailPart = plan.parts.find((p) => p.kind === 'sail' && p.sail === def.id);
      if (!sailPart) continue;
      const geom = createSailGeometry(def);
      this.geometries.push(geom);
      const mesh = new InstancedMesh(geom, tile, 1);
      mesh.name = `sydney-sail-settled-${def.id}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      // Pre-write the seated transform (position + rotation, scale 1)
      setSailTransform(mesh, 0, sailPart.finalPosition, sailPart.finalRotation, matrix, quaternion);
      mesh.setColorAt(0, stoneColor('tile', sailPart.colorVariation, color));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      this.sailBatches.push({ part: sailPart, def, mesh });
    }

    // --- Active block / rib meshes (shared unit geometry, scaled) ---
    const blockActiveGeom = createSydneyPartGeometry('block');
    const ribActiveGeom = createSydneyPartGeometry('rib');
    this.geometries.push(blockActiveGeom, ribActiveGeom);
    this.activeBlockMesh = this.makeActiveMesh('block-active', blockActiveGeom, granite);
    this.activeRibMesh = this.makeActiveMesh('rib-active', ribActiveGeom, concrete);

    // --- Active sail meshes — one per def (same full-size geometry, single slot) ---
    this.activeSailMeshes = [];
    for (const def of SYDNEY_SAILS) {
      const geom = createSailGeometry(def);
      this.geometries.push(geom);
      const mesh = this.makeActiveMesh(`sail-active-${def.id}`, geom, tile);
      this.activeSailMeshes.push({ def, mesh });
    }
  }

  private makeActiveMesh(name: string, geometry: BufferGeometry, material: MeshStandardMaterial): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, this.plan.maxActive);
    mesh.name = `sydney-${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.group.add(mesh);
    return mesh;
  }

  update(t: number, emissive = 0): ActiveSydneyOperation[] {
    this.tileMaterial.emissive.setRGB(0.35 * emissive, 0.28 * emissive, 0.16 * emissive);
    this.tileMaterial.emissiveIntensity = emissive * 0.85;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const route = this.plan.routes[0]!;

    // --- Update settled block / rib batches ---
    for (const batch of this.scaledBatches) {
      let cursor = 0;
      for (const part of batch.parts) {
        const state = sydneyPartStateAt(part, route, t);
        if (!state.visible || state.phase !== 'seated') continue;
        setScaledTransform(batch.mesh, cursor, state.position, state.rotation, part.dimensions, matrix, quaternion);
        batch.mesh.setColorAt(cursor, stoneColor(part.material, part.colorVariation, color));
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }

    // --- Update settled sail batches ---
    for (const { part, mesh } of this.sailBatches) {
      const state = sydneyPartStateAt(part, route, t);
      if (state.visible && state.phase === 'seated') {
        mesh.count = 1;
      } else {
        mesh.count = 0;
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // --- Active operations ---
    const operations = activeSydneyOperationsAt(this.plan, t);

    let blockCursor = 0;
    let ribCursor = 0;
    // Reset active sail counts
    for (const { mesh } of this.activeSailMeshes) mesh.count = 0;

    for (const operation of operations) {
      const { part, state } = operation;
      if (part.kind === 'block') {
        setScaledTransform(this.activeBlockMesh, blockCursor, state.position, state.rotation, part.dimensions, matrix, quaternion);
        this.activeBlockMesh.setColorAt(blockCursor, stoneColor(part.material, part.colorVariation, color));
        blockCursor += 1;
      } else if (part.kind === 'rib') {
        setScaledTransform(this.activeRibMesh, ribCursor, state.position, state.rotation, part.dimensions, matrix, quaternion);
        this.activeRibMesh.setColorAt(ribCursor, stoneColor(part.material, part.colorVariation, color));
        ribCursor += 1;
      } else {
        // Sail in transit — use its own def's geometry slot
        const slot = this.activeSailMeshes.find((s) => s.def.id === part.sail);
        if (slot) {
          const idx = slot.mesh.count;
          setSailTransform(slot.mesh, idx, state.position, state.rotation, matrix, quaternion);
          slot.mesh.setColorAt(idx, stoneColor('tile', part.colorVariation, color));
          slot.mesh.count = idx + 1;
          slot.mesh.instanceMatrix.needsUpdate = true;
          if (slot.mesh.instanceColor) slot.mesh.instanceColor.needsUpdate = true;
        }
      }
    }
    this.activeBlockMesh.count = blockCursor;
    this.activeBlockMesh.instanceMatrix.needsUpdate = true;
    if (this.activeBlockMesh.instanceColor) this.activeBlockMesh.instanceColor.needsUpdate = true;
    this.activeRibMesh.count = ribCursor;
    this.activeRibMesh.instanceMatrix.needsUpdate = true;
    if (this.activeRibMesh.instanceColor) this.activeRibMesh.instanceColor.needsUpdate = true;

    return operations;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const { mesh } of this.scaledBatches) mesh.dispose();
    for (const { mesh } of this.sailBatches) mesh.dispose();
    this.activeBlockMesh.dispose();
    this.activeRibMesh.dispose();
    for (const { mesh } of this.activeSailMeshes) mesh.dispose();
    for (const material of this.localMaterials) material.dispose();
  }
}
