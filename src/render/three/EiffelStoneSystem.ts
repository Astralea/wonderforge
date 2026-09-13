import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EiffelConstructionPlan, EiffelPart, EiffelPartKind } from '../../data/eiffelTypes';
import {
  activeEiffelOperationsAt,
  eiffelPartStateAt,
  type ActiveEiffelOperation,
} from '../../engine/eiffelConstruction';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

const ALIGN_X = new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2));
const ALIGN_Z = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0));
const BAR_KINDS = new Set<EiffelPartKind>(['chord', 'brace', 'arch']);
const Y_UP = new Vector3(0, 1, 0);
const ARCH_DIR = new Vector3();
export const EIFFEL_DARK_IRON = '#5a3824';
export const EIFFEL_BRACE_IRON = '#8a5a36';
export const EIFFEL_FAR_IRON = '#b88858';
export const EIFFEL_BRACE_WEB = { wall: 0.4, depth: 0.28 } as const;
export const EIFFEL_BRACE_WEB_CLIMB = { wall: 0.62, depth: 0.28 } as const;
export const EIFFEL_CHORD_LACE = { post: 0.22, inset: 0.38, lace: 0.04 } as const;
export const EIFFEL_CHORD_LACE_CLIMB = { post: 0.29, inset: 0.36, lace: 0.045 } as const;

function setTransform(
  mesh: InstancedMesh,
  index: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  dimensions: readonly [number, number, number],
  kind: EiffelPartKind,
  matrix: Matrix4,
  quaternion: Quaternion,
): void {
  const [dx, dy, dz] = dimensions;
  if (kind === 'arch' && dx >= dy && dx >= dz) {
    const pitch = rotation[0];
    const yaw = rotation[1];
    ARCH_DIR.set(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
    if (ARCH_DIR.lengthSq() < 1e-8) ARCH_DIR.copy(Y_UP);
    else ARCH_DIR.normalize();
    quaternion.setFromUnitVectors(Y_UP, ARCH_DIR);
    const thick = Math.min(dy, dz);
    matrix.compose(new Vector3(...position), quaternion, new Vector3(thick, dx, thick));
    mesh.setMatrixAt(index, matrix);
    return;
  }
  quaternion.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2], 'YXZ'));
  if (!BAR_KINDS.has(kind)) {
    matrix.compose(new Vector3(...position), quaternion, new Vector3(dx, dy, dz));
    mesh.setMatrixAt(index, matrix);
    return;
  }
  let length = dy;
  let thick = Math.min(dx, dz);
  if (dx >= dy && dx >= dz) {
    length = dx;
    thick = Math.min(dy, dz);
    quaternion.multiply(ALIGN_X);
  } else if (dz >= dy && dz >= dx) {
    length = dz;
    thick = Math.min(dx, dy);
    quaternion.multiply(ALIGN_Z);
  }
  const spread = thick;
  matrix.compose(new Vector3(...position), quaternion, new Vector3(spread, length, thick));
  mesh.setMatrixAt(index, matrix);
}

function ironColor(
  material: EiffelPart['material'],
  variation: number,
  target: Color,
  kind: EiffelPartKind,
  leg: EiffelPart['leg'],
): Color {
  const far = leg === 'ne' || leg === 'nw';
  if (material === 'masonry') target.set('#c4b4a0');
  else if (material === 'dark-iron' && far) target.set(EIFFEL_FAR_IRON);
  else if (material === 'dark-iron' && kind === 'brace') target.set(EIFFEL_BRACE_IRON);
  else if (material === 'dark-iron') target.set(EIFFEL_DARK_IRON);
  else target.set('#d8b078');
  target.offsetHSL(variation * 0.008, variation * 0.012, variation * 0.03);
  return target;
}

function createEiffelLatticeGeometry(): BufferGeometry {
  const cellsX = 5;
  const cellsY = 4;
  const bar = 0.038;
  const pieces: BufferGeometry[] = [];
  const place = (geometry: BufferGeometry, x: number, y: number) => {
    geometry.translate(x, y, 0);
    pieces.push(geometry);
  };
  for (let column = 0; column <= cellsX; column += 1) {
    place(new BoxGeometry(bar, 1, 1), column / cellsX - 0.5, 0);
  }
  for (let row = 0; row <= cellsY; row += 1) {
    place(new BoxGeometry(1, bar, 1), 0, row / cellsY - 0.5);
  }
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) throw new Error('eiffel lattice merge failed');
  return merged;
}

function createEiffelChordGeometry(laceSpec: { post: number; inset: number; lace: number } = EIFFEL_CHORD_LACE): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const { post, inset, lace } = laceSpec;
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const g = new BoxGeometry(post, 1, post);
      g.translate(sx * inset, 0, sz * inset);
      pieces.push(g);
    }
  }
  for (const y of [-0.4, -0.2, 0, 0.2, 0.4]) {
    for (const edge of [
      { sx: 0, sz: -inset, dx: 1 - post, dz: lace },
      { sx: 0, sz: inset, dx: 1 - post, dz: lace },
      { sx: -inset, sz: 0, dx: lace, dz: 1 - post },
      { sx: inset, sz: 0, dx: lace, dz: 1 - post },
    ] as const) {
      const g = new BoxGeometry(edge.dx, lace, edge.dz);
      g.translate(edge.sx, y, edge.sz);
      pieces.push(g);
    }
  }
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) throw new Error('eiffel chord merge failed');
  return merged;
}

function createEiffelArchGeometry(): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const post = 0.28;
  const inset = 0.32;
  const lace = 0.1;
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const g = new BoxGeometry(post, 1, post);
      g.translate(sx * inset, 0, sz * inset);
      pieces.push(g);
    }
  }
  for (const y of [-0.42, -0.14, 0.14, 0.42]) {
    for (const edge of [
      { sx: 0, sz: -inset, dx: 1 - post, dz: lace },
      { sx: 0, sz: inset, dx: 1 - post, dz: lace },
      { sx: -inset, sz: 0, dx: lace, dz: 1 - post },
      { sx: inset, sz: 0, dx: lace, dz: 1 - post },
    ] as const) {
      const g = new BoxGeometry(edge.dx, lace, edge.dz);
      g.translate(edge.sx, y, edge.sz);
      pieces.push(g);
    }
  }
  const rise = 0.84;
  const span = inset * 2;
  const diag = Math.hypot(span, rise);
  const tilt = Math.atan2(span, rise);
  for (const sz of [-inset, inset] as const) {
    for (const sign of [-1, 1] as const) {
      const g = new BoxGeometry(lace, diag, lace);
      g.rotateZ(sign * tilt);
      g.translate(0, 0, sz);
      pieces.push(g);
    }
  }
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) throw new Error('eiffel arch merge failed');
  return merged;
}

function createEiffelBraceGeometry(web: { wall: number; depth: number } = EIFFEL_BRACE_WEB): BufferGeometry {
  const webMesh = new BoxGeometry(web.wall, 1, web.depth);
  const capA = new BoxGeometry(1.05, 0.1, 1.05);
  capA.translate(0, 0.45, 0);
  const capB = new BoxGeometry(1.05, 0.1, 1.05);
  capB.translate(0, -0.45, 0);
  const merged = mergeGeometries([webMesh, capA, capB], false);
  webMesh.dispose();
  capA.dispose();
  capB.dispose();
  if (!merged) throw new Error('eiffel brace merge failed');
  return merged;
}

export function createEiffelPartGeometry(kind: EiffelPartKind): BufferGeometry {
  if (kind === 'lattice') return createEiffelLatticeGeometry();
  if (kind === 'chord') return createEiffelChordGeometry();
  if (kind === 'brace') return createEiffelBraceGeometry();
  if (kind === 'arch') return createEiffelArchGeometry();
  if (kind === 'pier' || kind === 'girder') return new BoxGeometry(1, 1, 1, 1, 1, 1);
  return new CylinderGeometry(0.5, 0.5, 1, 7);
}

function isClimbingLattice(part: EiffelPart): boolean {
  return !(part.group === 'leg' && part.storey < 8);
}

const KINDS: EiffelPartKind[] = ['pier', 'chord', 'brace', 'girder', 'arch', 'lattice'];

export class EiffelStoneSystem {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly localMaterials: MeshStandardMaterial[] = [];
  private readonly batches: Array<{ parts: EiffelPart[]; mesh: InstancedMesh }>;
  private readonly activeMeshes: Record<EiffelPartKind, InstancedMesh>;
  private readonly iron: MeshStandardMaterial;

  constructor(
    private readonly plan: EiffelConstructionPlan,
    _materials: MaterialLibrary,
  ) {
    this.group.name = 'eiffel-physical-iron-system';
    const iron = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.26,
      metalness: 0.7,
      emissive: '#5a3820',
      emissiveIntensity: 0,
    });
    injectMaterialRecipe(iron, 'puddled-iron');
    this.localMaterials.push(iron);
    this.iron = iron;

    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const makeBatch = (name: string, kind: EiffelPartKind, parts: EiffelPart[], geometry: BufferGeometry) => {
      this.geometries.push(geometry);
      const mesh = new InstancedMesh(geometry, iron, Math.max(1, parts.length));
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      parts.forEach((part, index) => {
        setTransform(mesh, index, part.finalPosition, part.finalRotation, part.dimensions, kind, matrix, quaternion);
        mesh.setColorAt(index, ironColor(part.material, part.colorVariation, color, kind, part.leg));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      return { parts, mesh };
    };
    const lowerBraces = plan.parts.filter((part) => part.kind === 'brace' && !isClimbingLattice(part));
    const climbBraces = plan.parts.filter((part) => part.kind === 'brace' && isClimbingLattice(part));
    const lowerChords = plan.parts.filter((part) => part.kind === 'chord' && !isClimbingLattice(part));
    const climbChords = plan.parts.filter((part) => part.kind === 'chord' && isClimbingLattice(part));
    this.batches = [
      ...KINDS.filter((kind) => kind !== 'brace' && kind !== 'chord').map((kind) =>
        makeBatch(
          `eiffel-parts-${kind}`,
          kind,
          plan.parts.filter((part) => part.kind === kind),
          createEiffelPartGeometry(kind),
        ),
      ),
      makeBatch('eiffel-parts-chord', 'chord', lowerChords, createEiffelChordGeometry(EIFFEL_CHORD_LACE)),
      makeBatch('eiffel-parts-chord-climb', 'chord', climbChords, createEiffelChordGeometry(EIFFEL_CHORD_LACE_CLIMB)),
      makeBatch('eiffel-parts-brace', 'brace', lowerBraces, createEiffelBraceGeometry(EIFFEL_BRACE_WEB)),
      makeBatch('eiffel-parts-brace-climb', 'brace', climbBraces, createEiffelBraceGeometry(EIFFEL_BRACE_WEB_CLIMB)),
    ];

    this.activeMeshes = {
      pier: this.createActiveMesh('pier', iron),
      chord: this.createActiveMesh('chord', iron),
      brace: this.createActiveMesh('brace', iron),
      girder: this.createActiveMesh('girder', iron),
      arch: this.createActiveMesh('arch', iron),
      lattice: this.createActiveMesh('lattice', iron),
    };
  }

  private createActiveMesh(kind: EiffelPartKind, material: MeshStandardMaterial): InstancedMesh {
    const geometry = createEiffelPartGeometry(kind);
    this.geometries.push(geometry);
    const mesh = new InstancedMesh(geometry, material, this.plan.maxActive);
    mesh.name = `eiffel-active-${kind}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.group.add(mesh);
    return mesh;
  }

  update(t: number): ActiveEiffelOperation[] {
    this.iron.emissiveIntensity = t > 0.86 ? ((t - 0.86) / 0.14) * 0.95 : 0;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color();
    const route = this.plan.routes[0]!;
    for (const batch of this.batches) {
      let cursor = 0;
      for (const part of batch.parts) {
        const state = eiffelPartStateAt(part, route, t);
        if (!state.visible || state.phase !== 'seated') continue;
        setTransform(batch.mesh, cursor, state.position, state.rotation, part.dimensions, part.kind, matrix, quaternion);
        batch.mesh.setColorAt(cursor, ironColor(part.material, part.colorVariation, color, part.kind, part.leg));
        cursor += 1;
      }
      batch.mesh.count = cursor;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }

    const operations = activeEiffelOperationsAt(this.plan, t);
    const cursors: Record<EiffelPartKind, number> = {
      pier: 0, chord: 0, brace: 0, girder: 0, arch: 0, lattice: 0,
    };
    for (const operation of operations) {
      const kind = operation.part.kind;
      const mesh = this.activeMeshes[kind];
      const index = cursors[kind];
      setTransform(
        mesh,
        index,
        operation.state.position,
        operation.state.rotation,
        operation.part.dimensions,
        kind,
        matrix,
        quaternion,
      );
      mesh.setColorAt(index, ironColor(operation.part.material, operation.part.colorVariation, color, kind, operation.part.leg));
      cursors[kind] += 1;
    }
    for (const kind of KINDS) {
      const mesh = this.activeMeshes[kind];
      mesh.count = cursors[kind];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    return operations;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const batch of this.batches) batch.mesh.dispose();
    for (const mesh of Object.values(this.activeMeshes)) mesh.dispose();
    for (const material of this.localMaterials) material.dispose();
  }
}
