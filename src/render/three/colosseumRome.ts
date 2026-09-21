import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COLOSSEUM_HOUSING, COLOSSEUM_HOUSING_GLB, colosseumHousingById, type ColosseumHousingId } from '../../data/colosseumHousing';

export const COLOSSEUM_ROME_KIT_GLB = '/models/colosseum-rome/rome-kit.glb';

export type ColosseumRomeRole = 'brick' | 'plaster' | 'tile' | 'foliage' | 'timber' | 'stone' | 'void';

export interface ColosseumRomeKit {
  insula: Object3D;
  palace: Object3D;
  pine: Object3D;
  cypress: Object3D;
}

export const ROME_ROLE_COLOR: Record<ColosseumRomeRole, Color> = {
  brick: new Color('#a27e65'),
  plaster: new Color('#c9bea7'),
  tile: new Color('#a4664b'),
  foliage: new Color('#3a5a34'),
  timber: new Color('#5a3c24'),
  stone: new Color('#b5aa93'),
  void: new Color('#1c1612'),
};

async function readKitBuffer(path = COLOSSEUM_ROME_KIT_GLB): Promise<ArrayBuffer> {
  try {
    const response = await fetch(path);
    if (response.ok) return await response.arrayBuffer();
  } catch {
    /* Vitest may expose fetch without a preview server. */
  }
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error(`Colosseum Rome kit missing: ${path}`);
  }
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const file = resolve(process.cwd(), `public${path}`);
  const buffer = readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function findNamed(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (found) return found;
  throw new Error(`Colosseum Rome prototype missing: ${name}`);
}

export async function loadColosseumRomeKit(): Promise<ColosseumRomeKit> {
  const gltf = await new GLTFLoader().parseAsync(await readKitBuffer(), '');
  const root = gltf.scene;
  return {
    insula: findNamed(root, 'insula'),
    palace: findNamed(root, 'palace-wing'),
    pine: findNamed(root, 'umbrella-pine'),
    cypress: findNamed(root, 'cypress'),
  };
}

export async function loadColosseumHousingKit(): Promise<Record<ColosseumHousingId, Object3D>> {
  const gltf = await new GLTFLoader().parseAsync(await readKitBuffer(COLOSSEUM_HOUSING_GLB), '');
  return Object.fromEntries(COLOSSEUM_HOUSING.map(profile =>
    [profile.id, findNamed(gltf.scene, `housing-${profile.id}`)])) as Record<ColosseumHousingId, Object3D>;
}

export function paintRole(name: string): ColosseumRomeRole {
  const n = name.toLowerCase();
  if (n.includes('plaster')) return 'plaster';
  if (n.includes('roof') || n.includes('tile')) return 'tile';
  if (n.includes('crown') || n.includes('foliage')) return 'foliage';
  if (n.includes('trunk') || n.includes('timber')) return 'timber';
  if (n.includes('plinth') || n.includes('cornice') || n.includes('stone') || n.includes('balcony')) {
    return 'stone';
  }
  if (n.includes('window') || n.includes('void') || n.includes('arch') || n.includes('door')) return 'void';
  return 'brick';
}

export function colorGeometry(geometry: BufferGeometry, color: Color): BufferGeometry {
  const count = geometry.getAttribute('position')?.count ?? 0;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

function asNonIndexed(geometry: BufferGeometry): BufferGeometry {
  if (!geometry.index) return geometry;
  const next = geometry.toNonIndexed();
  geometry.dispose();
  return next;
}

function prepareGeometry(geometry: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'color') {
      geometry.deleteAttribute(name);
    }
  }
  return asNonIndexed(geometry);
}

/** Runtime detail tier: preserve authored silhouettes and openings, discard
 * the ten hidden/back faces of tiny recessed window boxes and course strips. */
function simplifyRomePiece(source: BufferGeometry, name: string, role: ColosseumRomeRole): BufferGeometry {
  source.computeBoundingBox();
  const box = source.boundingBox!;
  const center = box.getCenter(new Vector3()), size = box.getSize(new Vector3());
  if (name.includes('pine-crown')) {
    const crown = new IcosahedronGeometry(1, 0);
    crown.computeBoundingBox();
    const extents = crown.boundingBox!.getSize(new Vector3());
    crown.scale(size.x / extents.x, size.y / extents.y, size.z / extents.z).translate(center.x, center.y, center.z);
    source.dispose();
    return crown;
  }
  const planar = role === 'void' || name.includes('course-') || name.includes('court-');
  if (!planar) return source;
  const expanded = asNonIndexed(source);
  const positions = expanded.getAttribute('position'), normals = expanded.getAttribute('normal');
  const axis = name.includes('court-') ? 1 : size.x < size.z ? 0 : 2;
  const sign = axis === 1 ? 1 : Math.sign(axis === 0 ? center.x : center.z) || 1;
  const vertices: number[] = [];
  for (let i = 0; i < positions.count; i += 3) {
    const n = axis === 0 ? normals.getX(i) : axis === 1 ? normals.getY(i) : normals.getZ(i);
    if (n * sign < .9) continue;
    for (let j = 0; j < 3; j++) vertices.push(positions.getX(i+j), positions.getY(i+j), positions.getZ(i+j));
  }
  if (vertices.length === 0) return expanded;
  const flat = new BufferGeometry();
  flat.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  flat.computeVertexNormals(); expanded.dispose();
  return flat;
}

export function flattenRomeRole(root: Object3D, role: ColosseumRomeRole): BufferGeometry | null {
  const pieces: BufferGeometry[] = [];
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (paintRole(object.name) !== role) return;
    let geometry = object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    geometry = simplifyRomePiece(geometry, object.name, role);
    colorGeometry(geometry, ROME_ROLE_COLOR[role]);
    pieces.push(prepareGeometry(geometry));
  });
  if (pieces.length === 0) return null;
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!merged) return null;
  merged.computeVertexNormals();
  return merged;
}

export function flattenRomeRoles(root: Object3D, roles: readonly ColosseumRomeRole[]): BufferGeometry | null {
  const pieces: BufferGeometry[] = [];
  for (const role of roles) {
    const part = flattenRomeRole(root, role);
    if (part) pieces.push(part);
  }
  if (pieces.length === 0) return null;
  if (pieces.length === 1) return pieces[0]!;
  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  merged?.computeVertexNormals();
  return merged;
}

function hipRoof(width: number, depth: number, height: number): BufferGeometry {
  const hw = width * 0.52;
  const hd = depth * 0.52;
  const ridge = Math.min(width, depth) * 0.18;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        -hw, 0, -hd, hw, 0, -hd, ridge, height, 0,
        -hw, 0, -hd, ridge, height, 0, -ridge, height, 0,
        hw, 0, -hd, hw, 0, hd, ridge, height, 0,
        hw, 0, hd, -hw, 0, hd, -ridge, height, 0,
        hw, 0, hd, -ridge, height, 0, ridge, height, 0,
        -hw, 0, hd, -hw, 0, -hd, -ridge, height, 0,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function mergeColored(pieces: BufferGeometry[]): BufferGeometry {
  const prepared = pieces.map(prepareGeometry);
  const merged = mergeGeometries(prepared, false);
  for (const piece of prepared) piece.dispose();
  if (!merged) throw new Error('Rome procedural merge failed');
  merged.computeVertexNormals();
  return merged;
}

export function createProceduralInsulaBrick(): BufferGeometry {
  const w = 10.2;
  const d = 8.4;
  const h = 8.8;
  const thick = 2.2;
  const brick = ROME_ROLE_COLOR.brick;
  const stone = ROME_ROLE_COLOR.stone;
  const voidColor = ROME_ROLE_COLOR.void;
  const north = colorGeometry(new BoxGeometry(w, h, thick).translate(0, h / 2, d / 2 - thick / 2), brick);
  const south = colorGeometry(new BoxGeometry(w, h, thick).translate(0, h / 2, -(d / 2 - thick / 2)), brick);
  const east = colorGeometry(new BoxGeometry(thick, h, d - thick * 2).translate(w / 2 - thick / 2, h / 2, 0), brick);
  const west = colorGeometry(new BoxGeometry(thick, h, d - thick * 2).translate(-(w / 2 - thick / 2), h / 2, 0), brick);
  const plinth = colorGeometry(new BoxGeometry(w + 0.45, 0.48, d + 0.45).translate(0, 0.24, 0), stone);
  const cornice = colorGeometry(new BoxGeometry(w + 0.38, 0.16, d + 0.38).translate(0, h - 0.1, 0), stone);
  const court = colorGeometry(
    new BoxGeometry(w - thick * 2 - 0.15, 0.12, d - thick * 2 - 0.15).translate(0, 0.16, 0),
    stone,
  );
  const courses: BufferGeometry[] = [];
  for (const y of [1.95, 4.65]) {
    courses.push(
      colorGeometry(new BoxGeometry(w + 0.22, 0.12, thick + 0.2).translate(0, y, d / 2 - thick / 2), brick),
      colorGeometry(new BoxGeometry(w + 0.22, 0.12, thick + 0.2).translate(0, y, -(d / 2 - thick / 2)), brick),
      colorGeometry(new BoxGeometry(thick + 0.2, 0.12, d - thick * 2).translate(w / 2 - thick / 2, y, 0), brick),
      colorGeometry(new BoxGeometry(thick + 0.2, 0.12, d - thick * 2).translate(-(w / 2 - thick / 2), y, 0), brick),
    );
  }
  const windows: BufferGeometry[] = [];
  for (const z of [d / 2 + 0.04, -d / 2 - 0.04]) {
    for (const y of [2.3, 5.0, 7.4]) {
      for (const x of [-3.1, 0, 3.1]) {
        windows.push(colorGeometry(new BoxGeometry(0.95, 1.2, 0.14).translate(x, y, z), voidColor));
      }
    }
  }
  for (const x of [w / 2 + 0.04, -(w / 2 + 0.04)]) {
    for (const y of [2.3, 5.0, 7.4]) {
      for (const z of [-1.55, 1.55]) {
        windows.push(colorGeometry(new BoxGeometry(0.14, 1.15, 0.85).translate(x, y, z), voidColor));
      }
    }
  }
  const door = colorGeometry(new BoxGeometry(1.2, 2.2, 0.16).translate(0, 1.1, d / 2 + 0.06), voidColor);
  return mergeColored([
    north,
    south,
    east,
    west,
    plinth,
    cornice,
    court,
    ...courses,
    door,
    ...windows,
  ]);
}

export function createProceduralInsulaRoof(): BufferGeometry {
  const w = 10.2;
  const d = 8.4;
  const h = 8.8;
  const thick = 2.2;
  const tile = ROME_ROLE_COLOR.tile;
  const north = colorGeometry(hipRoof(w + 0.7, thick + 0.9, 1.7).translate(0, h, d / 2 - thick / 2), tile);
  const south = colorGeometry(hipRoof(w + 0.7, thick + 0.9, 1.7).translate(0, h, -(d / 2 - thick / 2)), tile);
  const east = colorGeometry(hipRoof(thick + 0.9, d - thick, 1.55).translate(w / 2 - thick / 2, h, 0), tile);
  const west = colorGeometry(hipRoof(thick + 0.9, d - thick, 1.55).translate(-(w / 2 - thick / 2), h, 0), tile);
  return mergeColored([north, south, east, west]);
}

export function createProceduralPalaceBrick(): BufferGeometry {
  const w = 16;
  const d = 9.2;
  const h = 7.2;
  const body = colorGeometry(new BoxGeometry(w, h, d).translate(0, h / 2, 0), ROME_ROLE_COLOR.brick);
  const plinth = colorGeometry(new BoxGeometry(w + 0.8, 0.7, d + 0.8).translate(0, 0.35, 0), ROME_ROLE_COLOR.stone);
  const cornice = colorGeometry(new BoxGeometry(w + 0.55, 0.28, d + 0.55).translate(0, h - 0.1, 0), ROME_ROLE_COLOR.stone);
  const voids = [-5.4, -1.8, 1.8, 5.4].map((x) =>
    colorGeometry(new BoxGeometry(1.6, 2.4, 0.22).translate(x, 2.4, d * 0.5 + 0.08), ROME_ROLE_COLOR.void),
  );
  return mergeColored([body, plinth, cornice, ...voids]);
}

export function createProceduralPalaceRoof(): BufferGeometry {
  const roof = colorGeometry(hipRoof(17.2, 10.4, 2.8).translate(0, 7.2, 0), ROME_ROLE_COLOR.tile);
  const eaves = colorGeometry(new BoxGeometry(17.25, 0.12, 10.45).translate(0, 7.25, 0), ROME_ROLE_COLOR.tile);
  return mergeColored([roof, eaves]);
}

export function createProceduralPineCrown(): BufferGeometry {
  const layers = [
    { y: 9.05, sx: 3.8, sy: 0.52 },
    { y: 9.45, sx: 2.9, sy: 0.46 },
    { y: 9.95, sx: 1.7, sy: 0.4 },
  ].map(({ y, sx, sy }) => {
    const sphere = new SphereGeometry(1, 10, 7);
    sphere.scale(sx, sy, sx);
    sphere.translate(0, y, 0);
    return colorGeometry(sphere, ROME_ROLE_COLOR.foliage);
  });
  return mergeColored(layers);
}

export function createProceduralPineTrunk(): BufferGeometry {
  const trunk = new CylinderGeometry(0.22, 0.34, 9.2, 8);
  trunk.translate(0, 4.6, 0);
  return colorGeometry(trunk, ROME_ROLE_COLOR.timber);
}

export function createProceduralCypress(): BufferGeometry {
  const trunk = colorGeometry(new CylinderGeometry(0.12, 0.18, 2.2, 6).translate(0, 1.1, 0), ROME_ROLE_COLOR.timber);
  const low = colorGeometry(new ConeGeometry(1.15, 4.4, 7).translate(0, 3.4, 0), ROME_ROLE_COLOR.foliage);
  const mid = colorGeometry(new ConeGeometry(0.78, 3.2, 7).translate(0, 6.2, 0), ROME_ROLE_COLOR.foliage);
  const tip = colorGeometry(new ConeGeometry(0.42, 2, 7).translate(0, 8.4, 0), ROME_ROLE_COLOR.foliage);
  return mergeColored([trunk, low, mid, tip]);
}

export function lotMatrix(x: number, y: number, z: number, yaw: number, scale: number): Matrix4 {
  return new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
    new Vector3(scale, scale, scale),
  );
}

/** Shared authored dimensions keep the offline fallback legible too. */
export function createProceduralHousing(id: ColosseumHousingId, part: 'body' | 'roof', detail: 'full' | 'compact' = 'full'): BufferGeometry {
  const profile = colosseumHousingById(id);
  const pieces: BufferGeometry[] = [];
  if (part === 'body') pieces.push(colorGeometry(new BoxGeometry(10.5, .24, 8.45).translate(0, .12, 0), ROME_ROLE_COLOR.stone));
  for (let i = 0; i < profile.wings.length; i++) {
    const wing = profile.wings[i]!;
    if (part === 'roof') {
      const hw = (wing.width + .42) / 2, hd = (wing.depth + .42) / 2, ridge = Math.min(hw, hd) * .42;
      const vertices = [[-hw,0,-hd],[hw,0,-hd],[hw,0,hd],[-hw,0,hd],[-ridge,wing.roof,0],[ridge,wing.roof,0]];
      const triangles = [0,5,1,0,4,5,1,5,2,2,4,3,2,5,4,3,4,0];
      const roof = new BufferGeometry();
      roof.setAttribute('position', new Float32BufferAttribute(triangles.flatMap(index => vertices[index]!), 3));
      roof.computeVertexNormals(); roof.translate(wing.x, wing.height, wing.z);
      pieces.push(colorGeometry(roof, ROME_ROLE_COLOR.tile));
      continue;
    }
    const role = id === 'corner' && i === 0 ? 'brick' : 'plaster';
    pieces.push(colorGeometry(new BoxGeometry(wing.width, wing.height, wing.depth)
      .translate(wing.x, wing.height / 2, wing.z), ROME_ROLE_COLOR[role]));
    if (detail === 'compact') continue;
    for (const side of [-1, 1]) {
      const faceZ = wing.z + side * (wing.depth / 2 + .015);
      if (Math.abs(faceZ) < 3.85) continue;
      const levels = Math.max(1, Math.round(wing.height / 3));
      for (let level = 0; level < levels; level++) for (const offset of [-.24, .24]) {
        const height = level ? 1.3 : id === 'frontage' ? 2.25 : 1.5;
        const width = id === 'frontage' && level === 0 ? 1.2 : .75;
        const opening = new PlaneGeometry(width, height);
        if (side < 0) opening.rotateY(Math.PI);
        opening.translate(wing.x + wing.width * offset, 1.25 + level * 2.7, faceZ);
        pieces.push(colorGeometry(opening, ROME_ROLE_COLOR.void));
      }
    }
  }
  return mergeColored(pieces);
}

/** Portrait tier removes faces covered by tiled roofs or earth and the
 * subpixel plinth edge; retains each wall and the exposed courtyard floor. */
export function compactHousingBody(source: BufferGeometry): BufferGeometry {
  const expanded = source.index ? source.toNonIndexed() : source;
  const positions = expanded.getAttribute('position');
  const normals = expanded.getAttribute('normal');
  const colors = expanded.getAttribute('color');
  const keptPositions: number[] = [], keptNormals: number[] = [], keptColors: number[] = [];
  for (let i = 0; i < positions.count; i += 3) {
    const stone = Math.abs(colors.getX(i) - ROME_ROLE_COLOR.stone.r) < .001 &&
      Math.abs(colors.getY(i) - ROME_ROLE_COLOR.stone.g) < .001;
    const y = normals.getY(i);
    if (stone ? y < .9 : Math.abs(y) > .9) continue;
    for (let j = 0; j < 3; j++) {
      keptPositions.push(positions.getX(i+j),positions.getY(i+j),positions.getZ(i+j));
      keptNormals.push(normals.getX(i+j),normals.getY(i+j),normals.getZ(i+j));
      keptColors.push(colors.getX(i+j),colors.getY(i+j),colors.getZ(i+j));
    }
  }
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(keptPositions,3));
  result.setAttribute('normal', new Float32BufferAttribute(keptNormals,3));
  result.setAttribute('color', new Float32BufferAttribute(keptColors,3));
  if (expanded !== source) expanded.dispose();
  source.dispose();
  return result;
}
