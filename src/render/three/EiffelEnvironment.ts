import { EiffelStreetLights } from './EiffelStreetLights';
import { configureEiffelWater } from './eiffelWater';
import { batchEiffelStaticScatter } from './eiffelStaticScatter';
import { batchEiffelTerrain } from './eiffelTerrainChunks';
import { EIFFEL_EXPO_POOL_PLANS } from '../../engine/eiffelExpoPools';
export { EIFFEL_EXPO_POOL_PLANS } from '../../engine/eiffelExpoPools';
import { configureEiffelTerrainDetail } from './eiffelTerrainDetail';
import {
  BoxGeometry,
  BufferGeometry,
  BatchedMesh,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Frustum,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Sphere,
  type PerspectiveCamera,
  Vector3,
} from 'three';
import { EIFFEL_ENVIRONMENT } from '../../data/eiffelEnvironment';
import { EIFFEL_TRAFFIC_ACTORS, EIFFEL_TRAFFIC_ROUTES, type EiffelTrafficActor } from '../../data/eiffelTraffic';
import { EIFFEL_HEIGHT, EIFFEL_PLATFORM_1, EIFFEL_PLATFORM_2, EIFFEL_YARD, eiffelArchPoint, eiffelOffsetAt } from '../../data/eiffelConstruction';
import type { EiffelSkySample } from '../../data/eiffelSky';
import type { LightState } from '../../engine/daynight';
import { mulberry32 } from '../../engine/random';
import { EIFFEL_SEINE_WATER_Y, eiffelTerrainHeightAt } from '../../engine/eiffelTerrain';
import { eiffelTrafficPoseAt } from '../../engine/eiffelTraffic';
import { selectEiffelCrowdDetail } from '../../engine/eiffelCrowdDetail';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadEiffelPalaisGlb } from './eiffelPalais';
import { loadEiffelParisCity, loadEiffelParisLife } from './eiffelParis';
import { loadEiffelPhotoEntrance } from './eiffelPhotoEntrance';

type GroundVertex = { p: Vector3; n: Vector3; c: Vector3 };

/** Cut only the basin footprint, retaining the exact exterior triangle planes.
 * A vertex-only height edit would also distort the surrounding 15 m grid cells.
 */
export function excavateEiffelExpoBasins(source: BufferGeometry): BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  const index = source.index, p = source.getAttribute('position'),
    n = source.getAttribute('normal'), c = source.getAttribute('color');
  const blend = (a: GroundVertex, b: GroundVertex, t: number): GroundVertex => ({
    p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t), c: a.c.clone().lerp(b.c, t),
  });
  const emit = (polygon: GroundVertex[]) => {
    for (let i = 1; i + 1 < polygon.length; i++) {
      const tri = [polygon[0]!, polygon[i]!, polygon[i + 1]!];
      if (tri[1]!.p.clone().sub(tri[0]!.p).cross(tri[2]!.p.clone().sub(tri[0]!.p)).lengthSq() < 1e-16) continue;
      for (const v of tri) { positions.push(...v.p.toArray()); normals.push(...v.n.toArray()); colors.push(...v.c.toArray()); }
    }
  };
  const split = (polygon: GroundVertex[], axis: 'x' | 'z', bound: number, sign: number) => {
    const inside: GroundVertex[] = [], outside: GroundVertex[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!,
        da = (a.p[axis] - bound) * sign, db = (b.p[axis] - bound) * sign;
      if (da >= 0) inside.push(a);
      if (da <= 0) outside.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const v = blend(a, b, da / (da - db)); v.p[axis] = bound;
        inside.push(v); outside.push(v);
      }
    }
    return { inside, outside };
  };
  const cutEarth = new Color('#9a8a70');
  const wall = (a: GroundVertex, b: GroundVertex, floor: number) => {
    // A bank can cross the level base along an edge; split there rather than
    // constructing a self-intersecting quad between cut and filled ground.
    const ends = [a];
    if ((a.p.y - floor) * (b.p.y - floor) < 0) ends.push(blend(a, b, (floor - a.p.y) / (b.p.y - a.p.y)));
    ends.push(b);
    for (let i = 1; i < ends.length; i++) {
      const first = ends[i - 1]!.p, last = ends[i]!.p,
        lowLast = last.clone().setY(floor), lowFirst = first.clone().setY(floor);
      const faceNormal = last.clone().sub(first).cross(lowLast.clone().sub(first));
      if (faceNormal.lengthSq() < 1e-16) faceNormal.copy(lowLast).sub(first).cross(lowFirst.clone().sub(first));
      faceNormal.normalize();
      emit([first, last, lowLast, lowFirst].map(point => ({ p: point, n: faceNormal,
        c: new Vector3(cutEarth.r, cutEarth.g, cutEarth.b) })));
    }
  };
  for (let offset = 0; offset < (index?.count ?? p.count); offset += 3) {
    const triangle = [0, 1, 2].map(corner => {
      const i = index ? index.getX(offset + corner) : offset + corner;
      return { p: new Vector3().fromBufferAttribute(p, i), n: new Vector3().fromBufferAttribute(n, i), c: new Vector3().fromBufferAttribute(c, i) };
    });
    const pool = EIFFEL_EXPO_POOL_PLANS.find(pool =>
      Math.max(...triangle.map(v => v.p.x)) > pool.x - pool.width / 2 - .7 &&
      Math.min(...triangle.map(v => v.p.x)) < pool.x + pool.width / 2 + .7 &&
      Math.max(...triangle.map(v => v.p.z)) > pool.z - pool.length / 2 - .7 &&
      Math.min(...triangle.map(v => v.p.z)) < pool.z + pool.length / 2 + .7);
    if (!pool) { emit(triangle); continue; }
    const bounds = [
      ['x', pool.x - pool.width / 2 - .7, 1], ['x', pool.x + pool.width / 2 + .7, -1],
      ['z', pool.z - pool.length / 2 - .7, 1], ['z', pool.z + pool.length / 2 + .7, -1],
    ] as const;
    let inside = triangle;
    for (const [axis, bound, sign] of bounds) {
      const pieces = split(inside, axis, bound, sign); emit(pieces.outside); inside = pieces.inside;
    }
    if (inside.length < 3) continue;
    for (let i = 0; i < inside.length; i++) {
      const a = inside[i]!, b = inside[(i + 1) % inside.length]!;
      if (bounds.some(([axis, bound]) => Math.abs(a.p[axis] - bound) < 1e-8 && Math.abs(b.p[axis] - bound) < 1e-8)) wall(a, b, pool.floorBottom);
    }
    emit(inside.map(v => ({ p: v.p.clone().setY(pool.floorBottom), n: new Vector3(0, 1, 0), c: v.c })));
  }
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3))
    .setAttribute('normal', new Float32BufferAttribute(normals, 3))
    .setAttribute('color', new Float32BufferAttribute(colors, 3));
}

/** Fill only the authored gaps below coping and pedestal solids. */
export function createEiffelExpoPoolUnderbeds(): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const ring = (pool: typeof EIFFEL_EXPO_POOL_PLANS[number], outerX: number, outerZ: number, innerX: number, innerZ: number, bottom: number, top: number) => {
    for (const sign of [-1, 1]) {
      pieces.push(new BoxGeometry(outerX - innerX, top - bottom, outerZ * 2)
        .translate(pool.x + sign * (outerX + innerX) / 2, (top + bottom) / 2, pool.z));
      pieces.push(new BoxGeometry(innerX * 2, top - bottom, outerZ - innerZ)
        .translate(pool.x, (top + bottom) / 2, pool.z + sign * (outerZ + innerZ) / 2));
    }
  };
  for (const pool of EIFFEL_EXPO_POOL_PLANS) {
    const x = pool.width / 2, z = pool.length / 2;
    ring(pool, x + .7, z + .7, x + .45, z + .45, pool.floorBottom, pool.copingBottom);
    ring(pool, x + .45, z + .45, x, z, pool.floorTop, pool.copingBottom);
    if (pool.z === 230) for (const dz of [-24, 24]) {
      pieces.push(new CylinderGeometry(2.7, 2.7, .30, 12).translate(pool.x, pool.floorTop + .15, pool.z + dz));
    }
  }
  const merged = mergeGeometries(pieces)!;
  for (const piece of pieces) piece.dispose();
  return merged;
}

export class EiffelEnvironment {
  readonly group = new Group();
  readonly ready: Promise<void>;
  palaisSource: 'blender' | 'procedural' = 'procedural';
  parisSource: 'blender' | 'procedural' = 'procedural';
  lifeSource: 'blender' | 'static' = 'static';
  entranceSource: 'blender' | 'missing' = 'missing';
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly streetLights: EiffelStreetLights | null;
  private readonly lanterns: Group;
  private readonly lanternMaterial: MeshStandardMaterial;
  private readonly masonry: MeshStandardMaterial;
  private readonly forgeMaterial: MeshStandardMaterial;
  private readonly windowMaterial: MeshStandardMaterial;
  private readonly foam: InstancedMesh;
  private readonly expoPools: InstancedMesh | null;
  private readonly trees: InstancedMesh;
  private readonly trunks: InstancedMesh;
  private readonly staticTreeBatches: BatchedMesh[] = [];
  private readonly staticArchitectureBatches: BatchedMesh[] = [];
  private terrainBatch: BatchedMesh | null = null;
  private roofs!: InstancedMesh;
  private mansards!: InstancedMesh;
  private dormers!: InstancedMesh;
  private chimneys!: InstancedMesh;
  private barges!: InstancedMesh;
  private windows!: InstancedMesh;
  private plinths!: InstancedMesh;
  private cornices!: InstancedMesh;
  private balconies!: InstancedMesh;
  private houses!: InstancedMesh;
  private stocks!: InstancedMesh;
  private forges!: InstancedMesh;
  private falsework!: InstancedMesh;
  private createFallbackScatter: (() => void) | null = null;
  private disposed = false;
  private currentT = 0;
  private crowdCamera: PerspectiveCamera | null = null;
  private crowdViewportHeight = 900;
  private crowdUsefulCount = 0;
  private crowdVisibleDetailCount = 0;
  private readonly crowdMinimumPixels = 12;
  private readonly crowdActors = EIFFEL_TRAFFIC_ACTORS.filter(actor => actor.kind.startsWith('pedestrian'));
  private readonly crowdCapacities = Object.fromEntries(['pedestrian-man', 'pedestrian-woman'].map(kind =>
    [kind, EIFFEL_TRAFFIC_ACTORS.filter(actor => actor.kind === kind && actor.lod !== 'far').length]));
  private crowdSelected: ReadonlySet<string> = new Set(EIFFEL_TRAFFIC_ACTORS
    .filter(actor => actor.kind.startsWith('pedestrian') && actor.lod !== 'far').map(actor => actor.id));
  private readonly crowdColors = new Map(EIFFEL_TRAFFIC_ACTORS.filter(actor => actor.kind.startsWith('pedestrian'))
    .map((actor, index) => [actor.id, [
      new Color(['#493947', '#3f5368', '#6c493b', '#4d6045', '#75664d', '#5d3c3a'][index % 6]!),
      new Color(['#a97355', '#c69069', '#8c5b43', '#d0a079'][index % 4]!),
    ]]));

  get crowdDiagnostics(): Record<string, unknown> {
    return {
      mode: this.crowdCamera ? 'camera' : 'initial',
      minimumPixels: this.crowdMinimumPixels,
      usefulCandidateCount: this.crowdUsefulCount,
      visibleDetailedCount: this.crowdVisibleDetailCount,
      capacities: { ...this.crowdCapacities },
      selectedIds: [...this.crowdSelected].sort(),
      detailedCount: this.crowdSelected.size,
      silhouetteCount: this.crowdActors.length - this.crowdSelected.size,
      actorCount: this.crowdActors.length,
    };
  }

  /** Called after the final camera pose, including paused orbit controls. */
  setCrowdCamera(camera: PerspectiveCamera, viewportHeight = 900): void {
    this.crowdCamera = camera;
    this.crowdViewportHeight = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 900;
    if (this.selectCrowd(this.currentT)) this.updateParisTraffic(this.currentT);
  }

  private selectCrowd(t: number): boolean {
    if (!this.crowdCamera || !this.farTraffic) return false;
    const camera = this.crowdCamera;
    camera.updateMatrixWorld(true);
    this.group.updateWorldMatrix(true, false);
    const viewProjection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new Frustum().setFromProjectionMatrix(viewProjection);
    const center = new Vector3();
    const eye = new Vector3();
    const sphere = new Sphere(center, 1);
    const candidates = this.crowdActors.map(actor => {
      const pose = eiffelTrafficPoseAt(actor, t, this.rebuiltTower);
      center.set(pose.position[0], pose.position[1] + .9, pose.position[2]).applyMatrix4(this.group.matrixWorld);
      eye.copy(center).applyMatrix4(camera.matrixWorldInverse);
      return { id: actor.id, kind: actor.kind,
        inFrustum: eye.z < 0 && frustum.intersectsSphere(sphere),
        projectedHeight: eye.z < 0 ? .9 * camera.projectionMatrix.elements[5]! * this.crowdViewportHeight / -eye.z : 0 };
    });
    const selected = selectEiffelCrowdDetail(candidates, this.crowdCapacities, this.crowdMinimumPixels);
    this.crowdUsefulCount = candidates.filter(actor => actor.inFrustum && actor.projectedHeight >= this.crowdMinimumPixels).length;
    this.crowdVisibleDetailCount = candidates.filter(actor => actor.inFrustum && selected.has(actor.id)).length;
    if (selected.size === this.crowdSelected.size && [...selected].every(id => this.crowdSelected.has(id))) return false;
    this.crowdSelected = selected;
    for (const batch of this.trafficBatches) {
      if (batch.kind.startsWith('pedestrian')) {
        batch.specs = this.crowdActors.filter(actor => actor.kind === batch.kind && selected.has(actor.id));
      }
    }
    this.farTraffic.people.specs = this.crowdActors.filter(actor => !selected.has(actor.id));
    return true;
  }

  private readonly parisAssetRoots: Group[] = [];
  private readonly trafficMoorings: InstancedMesh[] = [];
  private readonly detailedTrafficMeshes: BatchedMesh[] = [];
  private farTraffic: {
    people: { mesh: BatchedMesh; headMesh: BatchedMesh; specs: EiffelTrafficActor[]; ids: number[]; headIds: number[] };
    vehicles: { mesh: BatchedMesh; specs: EiffelTrafficActor[]; ids: number[] };
    horses: { mesh: BatchedMesh; specs: EiffelTrafficActor[]; ids: number[] };
    wheels: { mesh: BatchedMesh; entries: Array<{ spec: EiffelTrafficActor; id: number; offset: readonly [number, number, number] }> };
  } | null = null;
  private readonly trafficBatches: Array<{
    kind: EiffelTrafficActor['kind'] | 'horse';
    specs: EiffelTrafficActor[];
    mesh: BatchedMesh;
    instanceIds: number[];
    geometryId: number;
    geometry: BufferGeometry;
    rigidLocal: Matrix4;
    pivotLocal: Matrix4 | null;
    meshFromPivot: Matrix4 | null;
    articulation: 'wheel' | 'leg' | 'arm' | null;
    articulationSign: number;
  }> = [];

  constructor(materials: MaterialLibrary, private readonly rebuiltTower = false) {
    this.group.name = 'eiffel-environment';
    const grass = new MeshStandardMaterial({ color: this.rebuiltTower ? '#ffffff' : '#8aa05e', roughness: 0.98, vertexColors: true });
    const foliage = new MeshStandardMaterial({ color: this.rebuiltTower ? '#607d46' : '#4a6a38', roughness: 0.94 });
    const masonry = new MeshStandardMaterial({
      color: '#e8ddd0',
      roughness: 0.96,
      emissive: '#ffcc88',
      emissiveIntensity: 0,
    });
    const roof = new MeshStandardMaterial({ color: '#c45a38', roughness: 0.9 });
    const zinc = new MeshStandardMaterial({ color: '#5c5a54', roughness: 0.82 });
    const timber = new MeshStandardMaterial({ color: '#6a4a30', roughness: 0.92 });
    const bargeHull = new MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.92 });
    const forgeHot = new MeshStandardMaterial({
      color: '#3a2a22',
      emissive: '#ff6a22',
      emissiveIntensity: 0.35,
      roughness: 0.7,
    });
    const windowGlass = new MeshStandardMaterial({
      color: '#16141c',
      emissive: '#ffc878',
      emissiveIntensity: 0,
      roughness: 0.45,
      metalness: 0.12,
    });
    if (this.rebuiltTower) windowGlass.side = DoubleSide;
    const lantern = new MeshStandardMaterial({
      color: '#ffe8b0',
      emissive: '#ffcc66',
      emissiveIntensity: 0,
      roughness: 0.35,
      metalness: 0.2,
    });
    materials.water.color.set('#5a7a8c');
    if (this.rebuiltTower) configureEiffelWater(materials.water);
    injectMaterialRecipe(grass, 'compacted-earth');
    if (this.rebuiltTower) configureEiffelTerrainDetail(grass);
    injectMaterialRecipe(foliage, 'foliage');
    injectMaterialRecipe(masonry, 'haussmann-stucco');
    injectMaterialRecipe(roof, 'paris-tile');
    this.materials.push(grass, foliage, masonry, roof, zinc, timber, lantern, bargeHull, forgeHot, windowGlass);
    this.lanternMaterial = lantern;
    this.masonry = masonry;
    this.forgeMaterial = forgeHot;
    this.windowMaterial = windowGlass;

    this.group.add(this.createTerrain(grass));
    this.group.add(this.createSeine(materials.water));
    this.expoPools = this.rebuiltTower ? this.createExpoPools(materials.water) : null;
    if (this.expoPools) this.group.add(this.expoPools);
    if (this.rebuiltTower) {
      const underbed = createEiffelExpoPoolUnderbeds(); this.geometries.push(underbed);
      const stone = new MeshStandardMaterial({ color: new Color(.74540418, .66538727, .53327638), roughness: .9 });
      this.materials.push(stone);
      const mesh = new Mesh(underbed, stone); mesh.name = 'eiffel-expo-pool-underbeds';
      mesh.receiveShadow = true; this.group.add(mesh);
    }
    if (this.rebuiltTower) this.group.add(this.createSeineQuays(masonry, zinc));
    this.foam = this.createFoam(materials);
    this.group.add(this.foam);
    const palaisReady = this.mountPalais(zinc, windowGlass);
    if (!this.rebuiltTower) this.group.add(this.createEcole(masonry, roof));
    if (!this.rebuiltTower) this.group.add(this.createChapel(roof));
    this.group.add(this.createYardRoad());
    if (!this.rebuiltTower) this.group.add(this.createChampPaths());
    this.lanterns = this.createLanterns(lantern);
    this.group.add(this.lanterns);
    this.streetLights = this.rebuiltTower ? new EiffelStreetLights() : null;
    if (this.streetLights) this.group.add(this.streetLights.group);

    const crownParts = [];
    if (this.rebuiltTower) {
      const left = new IcosahedronGeometry(4.5, 0);
      left.scale(1.05, 0.78, 1.0);
      left.translate(-2.5, 1.9, 0);
      const right = new IcosahedronGeometry(4.35, 0);
      right.scale(1.08, 0.82, 0.96);
      right.translate(2.35, 2.15, 0.65);
      const crown = new SphereGeometry(4.0, 3, 2);
      crown.scale(1.15, 0.72, 1.08);
      crown.translate(0, 3.35, -0.55);
      crownParts.push(left, right, crown);
    } else {
      const umbrella = new ConeGeometry(7.4, 5.4, 6);
      umbrella.rotateX(Math.PI);
      umbrella.translate(0, 2.2, 0);
      const puff = new SphereGeometry(3.4, 5, 3);
      puff.scale(1.15, 0.42, 1.12);
      puff.translate(0, 4.6, 0);
      crownParts.push(umbrella, puff);
    }
    const mergeableCrowns = crownParts.map((part) => part.index ? part.toNonIndexed() : part);
    const treeGeometry = mergeGeometries(mergeableCrowns, false);
    for (const part of crownParts) part.dispose();
    for (let i = 0; i < mergeableCrowns.length; i += 1) {
      if (mergeableCrowns[i] !== crownParts[i]) mergeableCrowns[i]!.dispose();
    }
    if (!treeGeometry) throw new Error('eiffel plane-tree merge failed');
    const trunkGeometry = new CylinderGeometry(0.42, 0.7, 11.4, this.rebuiltTower ? 5 : 6);
    this.geometries.push(treeGeometry, trunkGeometry);
    this.trees = new InstancedMesh(treeGeometry, foliage, EIFFEL_ENVIRONMENT.ecology.trees);
    this.trees.name = 'eiffel-plane-trees';
    this.trunks = new InstancedMesh(trunkGeometry, timber, EIFFEL_ENVIRONMENT.ecology.trees);
    for (const mesh of [this.trees, this.trunks]) {
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    const allocateFallback = () => {
      const houseGeometry = new BoxGeometry(1, 1, 1);
      const windowGeometry = this.rebuiltTower ? new PlaneGeometry(1, 1) : houseGeometry;
      const mansardGeometry = houseGeometry.clone();
      if (this.rebuiltTower) {
        const positions = mansardGeometry.attributes.position!;
        for (let i = 0; i < positions.count; i++) {
          if (positions.getY(i) > 0) {
            positions.setX(i, positions.getX(i) * .68);
            positions.setZ(i, positions.getZ(i) * .68);
          }
        }
        mansardGeometry.computeVertexNormals();
      }
      this.geometries.push(mansardGeometry);
      this.geometries.push(houseGeometry);
      if (windowGeometry !== houseGeometry) this.geometries.push(windowGeometry);
      this.houses = new InstancedMesh(houseGeometry, masonry, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.roofs = new InstancedMesh(houseGeometry, roof, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.mansards = new InstancedMesh(mansardGeometry, zinc, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.mansards.name = 'eiffel-haussmann-mansards';
      this.dormers = new InstancedMesh(houseGeometry, windowGlass, EIFFEL_ENVIRONMENT.ecology.roofs * 4);
      this.dormers.name = 'eiffel-haussmann-dormers';
      this.chimneys = new InstancedMesh(houseGeometry, zinc, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.chimneys.name = 'eiffel-haussmann-chimneys';
      this.barges = new InstancedMesh(houseGeometry, bargeHull, 8);
      this.barges.name = 'eiffel-seine-barges';
      const rustication = masonry.clone();
      rustication.color.set('#c8b8a4');
      rustication.roughness = 0.98;
      const corniceStone = masonry.clone();
      corniceStone.color.set('#ddd4c8');
      corniceStone.roughness = 0.88;
      this.materials.push(rustication, corniceStone);
      this.windows = new InstancedMesh(windowGeometry, windowGlass, EIFFEL_ENVIRONMENT.ecology.roofs * 36);
      this.windows.name = 'eiffel-haussmann-windows';
      this.plinths = new InstancedMesh(houseGeometry, rustication, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.plinths.name = 'eiffel-haussmann-plinths';
      this.cornices = new InstancedMesh(houseGeometry, corniceStone, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.cornices.name = 'eiffel-haussmann-cornices';
      this.balconies = new InstancedMesh(houseGeometry, corniceStone, EIFFEL_ENVIRONMENT.ecology.roofs);
      this.balconies.name = 'eiffel-haussmann-balconies';
      this.stocks = new InstancedMesh(houseGeometry, timber, EIFFEL_ENVIRONMENT.site.stocks);
      this.forges = new InstancedMesh(houseGeometry, forgeHot, EIFFEL_ENVIRONMENT.site.forges);
      this.falsework = new InstancedMesh(houseGeometry, timber, 16);
      this.falsework.name = 'eiffel-arch-falsework';
      this.falsework.visible = !this.rebuiltTower;
      for (const mesh of [
        this.houses, this.roofs, this.mansards,
        this.dormers, this.chimneys, this.barges, this.windows, this.plinths, this.cornices,
        this.balconies, this.stocks, this.forges, this.falsework,
      ]) {
        mesh.castShadow = !(this.rebuiltTower && mesh === this.windows);
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        this.group.add(mesh);
      }
    };
    if (!this.rebuiltTower) allocateFallback();
    const finishScatter = this.placeScatter();
    if (this.rebuiltTower) {
      // Keep the original RNG continuation: fallback poses must not change
      // depending on which asset fails first or whether the viewer seeks.
      this.createFallbackScatter = () => { allocateFallback(); finishScatter(); };
    } else finishScatter();
    if(this.rebuiltTower)for(const source of[this.trees,this.trunks]){
      const batch=batchEiffelStaticScatter(source);
      source.visible=false;this.staticTreeBatches.push(batch);this.group.add(batch);
    }
    this.ready = Promise.all([
      palaisReady,
      this.rebuiltTower ? this.mountParisCity(roof) : Promise.resolve(),
      this.rebuiltTower ? this.mountParisTraffic() : Promise.resolve(),
      this.rebuiltTower ? this.mountPhotoEntrance() : Promise.resolve(),
    ]).then(() => { this.createFallbackScatter = null; });
  }

  private createTerrain(material: MeshStandardMaterial): Mesh {
    const geometry = new PlaneGeometry(
      EIFFEL_ENVIRONMENT.terrain.radius * 2,
      EIFFEL_ENVIRONMENT.terrain.radius * 2,
      EIFFEL_ENVIRONMENT.terrain.segments,
      EIFFEL_ENVIRONMENT.terrain.segments,
    );
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position!;
    const colors = new Float32Array(positions.count * 3);
    const lawn = new Color('#8aa05e');
    const bank = new Color('#9a8a70');
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      // Preserve detailed ground near the erection yard; stretch only the outer
      // terrain cells beyond the fully fogged horizon.
      const stretch = (v: number) => this.rebuiltTower && Math.abs(v) > 450
        ? Math.sign(v) * (450 + (Math.abs(v) - 450) * 15) : v;
      const x = stretch(positions.getX(i));
      const z = stretch(positions.getZ(i));
      positions.setX(i, x);
      positions.setZ(i, z);
      const y = eiffelTerrainHeightAt(x, z);
      positions.setY(i, y);
      scratch.copy(lawn).lerp(bank, Math.min(1, Math.max(0, (-z - 40) / 160)));
      const allee = Math.min(1, Math.max(0, 1 - Math.abs(Math.abs(x) - 100) / 9));
      scratch.lerp(bank, allee * 0.4);
      colors[i * 3] = scratch.r;
      colors[i * 3 + 1] = scratch.g;
      colors[i * 3 + 2] = scratch.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const prepared = this.rebuiltTower ? excavateEiffelExpoBasins(geometry) : geometry;
    if (prepared !== geometry) geometry.dispose();
    this.geometries.push(prepared);
    if(this.rebuiltTower){
      // Excavation retains position/normal/color but no UV. Recover the original
      // plane coordinates only for grouping; do not alter its attribute set.
      const unstretch=(v:number)=>Math.abs(v)>450?Math.sign(v)*(450+(Math.abs(v)-450)/15):v;
      const p=prepared.getAttribute('position'),diameter=EIFFEL_ENVIRONMENT.terrain.radius*2;
      this.terrainBatch=batchEiffelTerrain(prepared,material,v=>[unstretch(p.getX(v))/diameter+.5,.5-unstretch(p.getZ(v))/diameter]);
      return this.terrainBatch;
    }
    const mesh = new Mesh(prepared, material);
    mesh.name = 'eiffel-champ-floor';
    mesh.receiveShadow = true;
    return mesh;
  }

  private createSeine(water: MeshStandardMaterial): Mesh {
    if (this.rebuiltTower && !water.userData.eiffelSeineFade) {
      const previousCompile = water.onBeforeCompile.bind(water);
      const previousCacheKey = water.customProgramCacheKey.bind(water);
      water.onBeforeCompile = (shader, renderer) => {
        previousCompile(shader, renderer);
        shader.vertexShader = `varying float vEiffelSeineFade;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvEiffelSeineFade = smoothstep(480.0, 720.0, abs(position.x));',
        );
        shader.fragmentShader = `varying float vEiffelSeineFade;\n${shader.fragmentShader}`.replace(
          '#include <alphamap_fragment>',
          '#include <alphamap_fragment>\ndiffuseColor.a *= 1.0 - vEiffelSeineFade;\nif (diffuseColor.a < 0.01) discard;',
        );
      };
      water.customProgramCacheKey = () => `${previousCacheKey()}:eiffel-seine-fade-v1`;
      water.userData.eiffelSeineFade = true;
      water.needsUpdate = true;
    }
    // The river remains physically continuous through the full terrain
    // channel; its material fades only after the simulated traffic domain.
    const geometry = new PlaneGeometry(this.rebuiltTower ? 7800 : 520, 92, this.rebuiltTower ? 16 : 8, 2);
    geometry.rotateX(-Math.PI / 2);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, water);
    mesh.name = 'eiffel-seine';
    mesh.position.set(0, EIFFEL_SEINE_WATER_Y, -175);
    mesh.rotation.y = 0.08;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createExpoPools(water: MeshStandardMaterial): InstancedMesh {
    const geometry = new PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    this.geometries.push(geometry);
    const pools = new InstancedMesh(geometry, water, 2);
    pools.name = 'eiffel-expo-reflecting-pools';
    const matrix = new Matrix4();
    EIFFEL_EXPO_POOL_PLANS.forEach((pool, index) => {
      matrix.compose(
        new Vector3(pool.x, pool.waterY, pool.z),
        new Quaternion(),
        new Vector3(pool.width, 1, pool.length),
      );
      pools.setMatrixAt(index, matrix);
    });
    pools.instanceMatrix.needsUpdate = true;
    pools.receiveShadow = true;
    pools.frustumCulled = false;
    return pools;
  }

  private createSeineQuays(masonry: MeshStandardMaterial, zinc: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'eiffel-seine-quays';
    const stone = masonry.clone();
    stone.color.set('#b8aa96');
    stone.roughness = 0.98;
    const iron = zinc.clone();
    iron.color.set('#4c514f');
    iron.roughness = 0.72;
    this.materials.push(stone, iron);

    const block = new BoxGeometry(1, 1, 1);
    this.geometries.push(block);
    const stonework = new InstancedMesh(block, stone, 100);
    stonework.name = 'eiffel-pont-d-iena-stonework';
    stonework.userData.archCount = 5;
    stonework.userData.voussoirsPerArch = 9;
    const railings = new InstancedMesh(block, iron, 16);
    railings.name = 'eiffel-pont-d-iena-railings';
    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    const waterY = EIFFEL_SEINE_WATER_Y;
    let stoneCount = 0;
    let railingCount = 0;
    const place = (
      mesh: InstancedMesh,
      index: number,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      yaw = 0,
    ) => {
      position.set(x, y, z);
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      scale.set(sx, sy, sz);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    };

    // Long embankments establish the river as a spatial layer throughout the
    // orbit. The central crossing is the Pont d'Iena, aligned with the tower
    // and the 1878 Palais rather than reading as a generic park path.
    for (const z of [-124, -226]) {
      place(stonework, stoneCount++, 0, waterY + 0.8, z, 920, 2.4, 5.2, 0.08);
      place(railings, railingCount++, 0, waterY + 2.45, z, 920, 0.7, 0.34, 0.08);
    }
    place(stonework, stoneCount++, 0, waterY + 5.4, -175, 22, 1.4, 112);
    // Five shallow semicircular stone arches. Each economical voussoir follows
    // the curve, leaving a continuous open soffit instead of a slab on posts.
    for (const centerZ of [-215, -195, -175, -155, -135]) {
      for (let segment = 0; segment < 9; segment += 1) {
        const theta = ((segment + 0.5) / 9) * Math.PI;
        position.set(
          0,
          waterY + 0.55 + Math.sin(theta) * 4.3,
          centerZ + Math.cos(theta) * 4.3,
        );
        quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2 - theta);
        scale.set(22, 1.35, 3.15);
        matrix.compose(position, quaternion, scale);
        stonework.setMatrixAt(stoneCount++, matrix);
      }
    }
    for (const z of [-225, -205, -185, -165, -145, -125]) {
      place(stonework, stoneCount++, 0, waterY + 1.35, z, 22, 2.7, 4.2);
    }
    for (const x of [-10.6, 10.6]) {
      place(railings, railingCount++, x, waterY + 6.75, -175, 0.42, 1.25, 112);
    }
    // Short inclined approaches meet the carved banks at both ends.
    for (const [z, y, pitch] of [
      [-111, waterY + 3, 0.15],
      [-239, waterY + 7.3, 0.2],
    ] as const) {
      position.set(0, y, z);
      quaternion.setFromAxisAngle(new Vector3(1, 0, 0), pitch);
      scale.set(22, 1.25, 24);
      matrix.compose(position, quaternion, scale);
      stonework.setMatrixAt(stoneCount++, matrix);
    }
    // Two quieter crossings keep the water legible from the reverse arc.
    for (const x of [-430, 430]) {
      const riverCenterZ = -175 - Math.tan(0.08) * x;
      place(stonework, stoneCount++, x, waterY + 5.9, riverCenterZ, 15, 1.8, 108);
      for (const z of [riverCenterZ - 29, riverCenterZ, riverCenterZ + 29]) {
        place(stonework, stoneCount++, x, waterY + 2, z, 9, 6, 5);
      }
      for (const dx of [-7.1, 7.1]) {
        place(railings, railingCount++, x + dx, waterY + 7.4, riverCenterZ, 0.34, 1, 108);
      }
    }
    stonework.count = stoneCount;
    railings.count = railingCount;
    stonework.instanceMatrix.needsUpdate = true;
    railings.instanceMatrix.needsUpdate = true;
    stonework.castShadow = true;
    stonework.receiveShadow = true;
    railings.castShadow = true;
    stonework.frustumCulled = false;
    railings.frustumCulled = false;
    group.add(stonework, railings);
    return group;
  }

  private async mountPalais(zinc: MeshStandardMaterial, windowGlass: MeshStandardMaterial): Promise<void> {
    const palais = new Group();
    palais.name = 'eiffel-palais-trocadero';
    this.group.add(palais);
    const ochre = this.masonry.clone();
    ochre.color.set('#a89070');
    ochre.emissive.set('#3a2818');
    const arcadeStone = this.masonry.clone();
    arcadeStone.color.set('#7a6a58');
    this.materials.push(ochre, arcadeStone);
    try {
      const loaded = await loadEiffelPalaisGlb(ochre, arcadeStone, zinc, windowGlass);
      if (this.disposed) {
        const geometries = new Set<import('three').BufferGeometry>();
        loaded.traverse((object) => { if (object instanceof Mesh) geometries.add(object.geometry); });
        for (const geometry of geometries) geometry.dispose();
        return;
      }
      if (this.rebuiltTower) {
        // Static background architecture is batched by material, not by window.
        loaded.updateMatrixWorld(true);
        const sets = new Map<MeshStandardMaterial, Mesh[]>();
        const originals = new Set<import('three').BufferGeometry>();
        loaded.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const material = object.material as MeshStandardMaterial;
          if (!sets.has(material)) sets.set(material, []);
          sets.get(material)!.push(object);
          originals.add(object.geometry);
        });
        for (const [material, pieces] of sets) {
          const batch = new BatchedMesh(pieces.length,
            pieces.reduce((sum, piece) => sum + piece.geometry.getAttribute('position').count, 0),
            pieces.reduce((sum, piece) => sum + (piece.geometry.index?.count ?? 0), 0), material);
          for (const piece of pieces) {
            const geometryId = batch.addGeometry(piece.geometry);
            const instanceId = batch.addInstance(geometryId);
            batch.setMatrixAt(instanceId, piece.matrixWorld);
          }
          batch.castShadow = true; batch.receiveShadow = true; batch.frustumCulled = false;
          batch.perObjectFrustumCulled = true; batch.sortObjects = false;
          palais.add(batch); this.staticArchitectureBatches.push(batch);
        }
        for (const geometry of originals) geometry.dispose();
        palais.userData.palaisSource = 'blender';
        this.palaisSource = 'blender';
        return;
      }
      while (loaded.children.length > 0) palais.add(loaded.children[0]!);
      palais.userData.palaisSource = 'blender';
      this.palaisSource = 'blender';
      palais.traverse((obj) => {
        if (obj instanceof Mesh) this.geometries.push(obj.geometry);
      });
    } catch {
      if (this.disposed) return;
      const built = this.createTrocadero(this.masonry, zinc, windowGlass);
      while (built.children.length > 0) palais.add(built.children[0]!);
      this.palaisSource = 'procedural';
    }
  }

  private disposeParisAsset(root: Group): void {
    const geometries = new Set<import('three').BufferGeometry>();
    const materials = new Set<import('three').Material>();
    const batches = new Set<BatchedMesh>();
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object instanceof BatchedMesh) batches.add(object);
      else geometries.add(object.geometry);
      const assigned = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of assigned) materials.add(material);
    });
    // BatchedMesh owns matrix, indirect and optional color textures in
    // addition to its packed geometry; disposing geometry alone leaks them.
    for (const batch of batches) batch.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  private ensureFallbackScatter(): void {
    if (this.disposed || !this.createFallbackScatter) return;
    const build = this.createFallbackScatter;
    this.createFallbackScatter = null;
    build();
    if (this.parisSource === 'blender') this.setFallbackCityVisible(false);
    if (this.lifeSource === 'blender') this.barges.visible = false;
  }

  private setFallbackCityVisible(visible: boolean): void {
    if (!this.houses) return;
    for (const mesh of [this.houses, this.roofs, this.mansards, this.dormers,
      this.chimneys, this.windows, this.plinths, this.cornices, this.balconies,
      this.stocks, this.forges]) mesh.visible = visible;
  }

  private async mountParisCity(roof: MeshStandardMaterial): Promise<void> {
    try {
      const city = await loadEiffelParisCity(() => this.disposed);
      if (this.disposed) {
        this.disposeParisAsset(city);
        return;
      }
      this.parisAssetRoots.push(city);
      this.streetLights?.setCityAvailable(true);
      this.group.add(city);
      this.parisSource = 'blender';
      this.setFallbackCityVisible(false);
    } catch {
      if (this.disposed) return;
      this.parisSource = 'procedural';
      this.ensureFallbackScatter();
      this.group.add(this.createEcole(this.masonry, roof), this.createChampPaths());
    }
  }

  private async mountParisTraffic(): Promise<void> {
    try {
      const loaded = await loadEiffelParisLife();
      if (this.disposed) {
        this.disposeParisAsset(loaded.root);
        return;
      }
      this.parisAssetRoots.push(loaded.root);
      const traffic = new Group();
      traffic.name = 'eiffel-paris-1889-traffic';
      const trafficMaterial = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.84 });
      this.materials.push(trafficMaterial);
      loaded.root.updateMatrixWorld(true);
      const kinds = [...new Set(EIFFEL_TRAFFIC_ACTORS.map((actor) => actor.kind)), 'horse'] as const;
      type PendingTrafficPart = Omit<(typeof this.trafficBatches)[number], 'mesh' | 'instanceIds' | 'geometryId'> & {
        category: 'people' | 'wagons' | 'horses' | 'vessels';
      };
      const pendingParts: PendingTrafficPart[] = [];
      for (const kind of kinds) {
        const prototype = loaded.prototypes.get(kind);
        if (!prototype) continue;
        const specs = kind === 'horse'
          ? EIFFEL_TRAFFIC_ACTORS.filter((actor) => (actor.kind === 'cart' || actor.kind === 'carriage') && actor.lod !== 'far')
          : EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind === kind && actor.lod !== 'far');
        if (specs.length === 0) continue;
        prototype.updateMatrixWorld(true);
        const prototypeInverse = prototype.matrixWorld.clone().invert();
        const pivots: Object3D[] = [];
        prototype.traverse((object) => {
          if (!(object instanceof Mesh) && /^(wheel|leg|arm)[-_]/.test(object.name.toLowerCase())) pivots.push(object);
        });
        const groupedMeshes = new Map<Object3D | null, Mesh[]>();
        prototype.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          let pivot: Object3D | null = object.parent;
          while (pivot && pivot !== prototype && !/^(wheel|leg|arm)[-_]/.test(pivot.name.toLowerCase())) pivot = pivot.parent;
          if (pivot === prototype) pivot = null;
          const group = groupedMeshes.get(pivot) ?? [];
          group.push(object);
          groupedMeshes.set(pivot, group);
        });
        for (const [pivot, sourceMeshes] of groupedMeshes) {
          const articulation = pivot
            ? (pivot.name.toLowerCase().startsWith('wheel')
                ? 'wheel'
                : pivot.name.toLowerCase().startsWith('arm') ? 'arm' : 'leg')
            : null;
          const referenceInverse = (pivot ?? prototype).matrixWorld.clone().invert();
          const pieces = sourceMeshes.map((source) => {
            const geometry = source.geometry.clone();
            geometry.applyMatrix4(referenceInverse.clone().multiply(source.matrixWorld));
            for (const attribute of Object.keys(geometry.attributes)) {
              if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
            }
            const sourceMaterial = Array.isArray(source.material) ? source.material[0] : source.material;
            const color = sourceMaterial instanceof MeshStandardMaterial ? sourceMaterial.color : new Color('#777777');
            const colors = new Float32Array(geometry.attributes.position!.count * 3);
            for (let i = 0; i < geometry.attributes.position!.count; i += 1) {
              colors[i * 3] = color.r;
              colors[i * 3 + 1] = color.g;
              colors[i * 3 + 2] = color.b;
            }
            geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
            return geometry;
          });
          const merged = mergeGeometries(pieces, false);
          for (const piece of pieces) piece.dispose();
          if (!merged) throw new Error(`Paris traffic merge failed for ${kind}`);
          // A BatchedMesh can contain many geometry layouts as long as they
          // agree on indexedness. Life assets are small, so normalizing once
          // to non-indexed geometry makes the mixed actor batch reliable.
          const geometry = merged.index ? merged.toNonIndexed() : merged;
          if (geometry !== merged) merged.dispose();
          this.geometries.push(geometry);
          const rigidLocal = pivot ? new Matrix4() : prototypeInverse.clone().multiply(prototype.matrixWorld);
          const pivotLocal = pivot ? prototypeInverse.clone().multiply(pivot.matrixWorld) : null;
          const meshFromPivot = pivot ? new Matrix4() : null;
          const category = kind === 'horse' ? 'horses'
            : kind === 'cart' || kind === 'carriage' ? 'wagons'
              : kind === 'steam-boat' || kind === 'barge' ? 'vessels' : 'people';
          pendingParts.push({
            category,
            kind,
            specs: [...specs],
            geometry,
            rigidLocal,
            pivotLocal,
            meshFromPivot,
            articulation,
            articulationSign: pivot ? (pivots.indexOf(pivot) % 2 === 0 ? 1 : -1) : 1,
          });
        }
      }
      for (const category of ['people', 'wagons', 'horses', 'vessels'] as const) {
        const parts = pendingParts.filter((part) => part.category === category);
        if (parts.length === 0) continue;
        const instanceCapacity = parts.reduce((sum, part) => sum + part.specs.length, 0);
        const vertexCapacity = parts.reduce((sum, part) => sum + part.geometry.attributes.position!.count, 0);
        const mesh = new BatchedMesh(instanceCapacity, vertexCapacity, vertexCapacity, trafficMaterial);
        mesh.name = `eiffel-traffic-near-${category}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.perObjectFrustumCulled = true;
        // Slot reassignment spans the city; whole-batch cached bounds are stale.
        mesh.frustumCulled = false;
        mesh.sortObjects = false;
        traffic.add(mesh);
        this.detailedTrafficMeshes.push(mesh);
        const metadata: Array<{ kind: string; articulation: string | null; geometryId: number; instanceIds: number[] }> = [];
        for (const part of parts) {
          const geometryId = mesh.addGeometry(part.geometry);
          const instanceIds = part.specs.map(() => mesh.addInstance(geometryId));
          this.trafficBatches.push({ ...part, mesh, geometryId, instanceIds });
          metadata.push({ kind: part.kind, articulation: part.articulation, geometryId, instanceIds });
        }
        mesh.userData.trafficParts = metadata;
      }
      this.mountFarParisTraffic(traffic);
      const bargeSpecs = EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.kind === 'barge');
      const ropeGeometry = new CylinderGeometry(0.035, 0.035, 1, 4);
      const ropeMaterial = new MeshStandardMaterial({ color: '#443126', roughness: 1 });
      const moorings = new InstancedMesh(ropeGeometry, ropeMaterial, bargeSpecs.length * 2);
      const bollardGeometry = new CylinderGeometry(0.16, 0.22, 0.5, 8);
      const bollards = new InstancedMesh(bollardGeometry, ropeMaterial, bargeSpecs.length * 2);
      bollards.name = 'eiffel-quay-mooring-bollards';
      bollards.castShadow = false;
      moorings.name = 'eiffel-barge-mooring-lines';
      moorings.castShadow = false;
      moorings.frustumCulled = false;
      const up = new Vector3(0, 1, 0);
      let mooringIndex = 0;
      for (const spec of bargeSpecs) {
        const pose = eiffelTrafficPoseAt(spec, 0);
        const route = EIFFEL_TRAFFIC_ROUTES.find((candidate) => candidate.id === spec.routeId);
        if (!route || route.surface !== 'water') continue;
        const bankAcross = Math.sign(route.across) * 51;
        const towardBank = Math.sign(route.across)
          * Math.sign(Math.cos(pose.yaw) * Math.sin(.08) - Math.sin(pose.yaw) * Math.cos(.08));
        for (const fore of [-5.5, 5.5]) {
          const start = new Vector3(
            pose.position[0] + Math.sin(pose.yaw) * fore + Math.cos(pose.yaw) * towardBank * 2.45,
            EIFFEL_SEINE_WATER_Y + 0.75,
            pose.position[2] + Math.cos(pose.yaw) * fore - Math.sin(pose.yaw) * towardBank * 2.45,
          );
          const end = new Vector3(
            start.x,
            EIFFEL_SEINE_WATER_Y + 2.25,
            -175 - Math.tan(0.08) * start.x + bankAcross / Math.cos(0.08),
          );
          const delta = end.clone().sub(start);
          const midpoint = start.clone().add(end).multiplyScalar(0.5);
          const rotation = new Quaternion().setFromUnitVectors(up, delta.clone().normalize());
          const mooringMatrix = new Matrix4().compose(midpoint, rotation, new Vector3(1, delta.length(), 1));
          moorings.setMatrixAt(mooringIndex, mooringMatrix);
          bollards.setMatrixAt(mooringIndex++, new Matrix4().makeTranslation(end.x, end.y, end.z));
        }
      }
      moorings.count = mooringIndex;
      moorings.instanceMatrix.needsUpdate = true;
      bollards.count = mooringIndex;
      bollards.instanceMatrix.needsUpdate = true;
      this.geometries.push(ropeGeometry, bollardGeometry);
      this.materials.push(ropeMaterial);
      traffic.add(moorings, bollards);
      this.trafficMoorings.push(moorings, bollards);
      this.group.add(traffic);
      if (this.barges) this.barges.visible = false;
      this.lifeSource = 'blender';
      this.updateParisTraffic(this.currentT);
    } catch {
      if (this.disposed) return;
      this.lifeSource = 'static';
      this.ensureFallbackScatter();
    }
  }

  private async mountPhotoEntrance(): Promise<void> {
    try {
      const entrance = await loadEiffelPhotoEntrance(() => this.disposed);
      if (this.disposed || entrance.children.length === 0) return;
      this.parisAssetRoots.push(entrance);
      this.group.add(entrance);
      this.entranceSource = 'blender';
    } catch {
      this.entranceSource = 'missing';
    }
  }

  private mountFarParisTraffic(parent: Group): void {
    const farPeople = EIFFEL_TRAFFIC_ACTORS.filter((actor) => actor.lod === 'far' && actor.kind.startsWith('pedestrian'));
    const farVehicles = EIFFEL_TRAFFIC_ACTORS.filter((actor) =>
      actor.lod === 'far' && (actor.kind === 'cart' || actor.kind === 'carriage'),
    );
    const part = (size: readonly [number, number, number], at: readonly [number, number, number]) => {
      const geometry = new BoxGeometry(...size);
      geometry.translate(...at);
      return geometry;
    };
    const mergeSimpleParts = (pieces: BufferGeometry[], label: string) => {
      const normalized = pieces.map((piece) => {
        const geometry = piece.index ? piece.toNonIndexed() : piece.clone();
        for (const attribute of Object.keys(geometry.attributes)) {
          if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
        }
        return geometry;
      });
      const geometry = mergeGeometries(normalized, false);
      for (const piece of pieces) piece.dispose();
      for (const piece of normalized) piece.dispose();
      if (!geometry) throw new Error(`Paris ${label} merge failed`);
      return geometry;
    };
    const personGeometry = new ConeGeometry(0.26, 1.5, 4).translate(0, 0.75, 0);
    const headGeometry = new OctahedronGeometry(0.16, 0).translate(0, 1.68, 0);

    const wagonParts = [
      part([1.82, 0.78, 2.45], [0, 1.18, 0]),
      part([1.5, 0.12, 3.1], [0, 0.82, 1.55]),
      part([1.68, 0.55, 0.16], [0, 1.85, -1.05]),
    ];
    const wagonGeometry = mergeSimpleParts(wagonParts, 'far-wagon');

    const horseParts = [
      part([0.7, 0.82, 1.55], [0, 1.18, 0]),
      part([0.44, 0.82, 0.44], [0, 1.65, 0.58]),
      part([0.5, 0.42, 0.62], [0, 2.0, 0.82]),
      ...([-0.22, 0.22] as const).flatMap((x) => [-0.5, 0.5].map((z) => part([0.13, 1.02, 0.13], [x, 0.51, z]))),
    ];
    const horseGeometry = mergeSimpleParts(horseParts, 'far-horse');
    const wheelGeometry = new CylinderGeometry(0.63, 0.63, 0.12, 8);
    wheelGeometry.rotateZ(Math.PI / 2);

    const personMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
    const headMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
    const vehicleMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
    const horseMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.96 });
    const wheelMaterial = new MeshStandardMaterial({ color: '#44382d', roughness: 0.9 });
    this.materials.push(personMaterial, headMaterial, vehicleMaterial, horseMaterial, wheelMaterial);
    const batched = (name: string, geometry: BufferGeometry, count: number, material: MeshStandardMaterial) => {
      const mesh = new BatchedMesh(
        count,
        geometry.attributes.position!.count,
        geometry.index?.count ?? geometry.attributes.position!.count,
        material,
      );
      const geometryId = mesh.addGeometry(geometry);
      const ids = Array.from({ length: count }, () => mesh.addInstance(geometryId));
      mesh.name = name;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.perObjectFrustumCulled = true;
      mesh.frustumCulled = false;
      mesh.sortObjects = false;
      parent.add(mesh);
      geometry.dispose();
      return { mesh, ids };
    };
    const people = batched('eiffel-traffic-far-people', personGeometry, farPeople.length, personMaterial);
    const heads = batched('eiffel-traffic-far-heads', headGeometry, farPeople.length, headMaterial);
    const vehicles = batched('eiffel-traffic-far-vehicles', wagonGeometry, farVehicles.length, vehicleMaterial);
    const horses = batched('eiffel-traffic-far-horses', horseGeometry, farVehicles.length, horseMaterial);
    const wheelCount = farVehicles.length * 4;
    const wheels = batched('eiffel-traffic-far-wheels', wheelGeometry, wheelCount, wheelMaterial);
    const garmentPalette = ['#493947', '#3f5368', '#6c493b', '#4d6045', '#75664d', '#5d3c3a'];
    people.ids.forEach((id, index) => people.mesh.setColorAt(id, new Color(garmentPalette[index % garmentPalette.length]!)));
    const skinPalette = ['#a97355', '#c69069', '#8c5b43', '#d0a079'];
    heads.ids.forEach((id, index) => heads.mesh.setColorAt(id, new Color(skinPalette[index % skinPalette.length]!)));
    const vehiclePalette = ['#55402f', '#6a302b', '#3d4a52', '#75603d'];
    vehicles.ids.forEach((id, index) => vehicles.mesh.setColorAt(id, new Color(vehiclePalette[index % vehiclePalette.length]!)));
    horses.ids.forEach((id, index) => horses.mesh.setColorAt(id, new Color(index % 3 === 0 ? '#34251e' : '#60412e')));
    const wheelOffsets: ReadonlyArray<readonly [number, number, number]> = [
      [-0.98, 0.63, -1.12], [0.98, 0.63, -1.12], [-0.98, 0.63, 1.12], [0.98, 0.63, 1.12],
    ];
    this.farTraffic = {
      people: { ...people, headMesh: heads.mesh, headIds: heads.ids, specs: farPeople },
      vehicles: { ...vehicles, specs: farVehicles },
      horses: { ...horses, specs: farVehicles },
      wheels: {
        mesh: wheels.mesh,
        entries: farVehicles.flatMap((spec, vehicleIndex) => wheelOffsets.map((offset, wheelIndex) => ({
          spec,
          id: wheels.ids[vehicleIndex * 4 + wheelIndex]!,
          offset,
        }))),
      },
    };
  }

  private updateParisTraffic(t: number): void {
    this.selectCrowd(t);
    const rotation = new Matrix4();
    const local = new Matrix4();
    const actorWorld = new Matrix4();
    const contactOffset = new Matrix4();
    const vertex = new Vector3();
    const poseCache = new Map<string, ReturnType<typeof eiffelTrafficPoseAt>>();
    const correctionCache = new Map<string, number>();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    const localFor = (batch: typeof this.trafficBatches[number], pose: ReturnType<typeof eiffelTrafficPoseAt>) => {
      if (!batch.articulation || !batch.pivotLocal || !batch.meshFromPivot) return local.copy(batch.rigidLocal);
      const angle = batch.articulation === 'wheel'
        ? pose.wheelAngle
        : Math.sin(pose.gaitPhase) * batch.articulationSign
          * (batch.articulation === 'arm' ? -0.45
            : batch.kind.toString().startsWith('pedestrian') ? 0.55 : 0.42);
      rotation.makeRotationX(angle);
      return local.copy(batch.pivotLocal).multiply(rotation).multiply(batch.meshFromPivot);
    };
    for (const batch of this.trafficBatches) {
      for (let index = 0; index < batch.specs.length; index += 1) {
        const spec = batch.specs[index]!;
        const pose = poseCache.get(spec.id) ?? eiffelTrafficPoseAt(spec, t, this.rebuiltTower);
        poseCache.set(spec.id, pose);
        const visibleScale = pose.visibility > 0.02 ? 1 : 0;
        position.set(...pose.position);
        if (batch.kind === 'horse') {
          const horseX = pose.position[0] + Math.sin(pose.yaw) * 3.55;
          const horseZ = pose.position[2] + Math.cos(pose.yaw) * 3.55;
          const surfaceLift = pose.position[1] - eiffelTerrainHeightAt(pose.position[0], pose.position[2]);
          position.y = eiffelTerrainHeightAt(horseX, horseZ) + surfaceLift;
        }
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), pose.yaw);
        scale.setScalar(visibleScale);
        actorWorld.compose(position, quaternion, scale);
        let correction = 0;
        const contactKind = batch.kind === 'horse' ? 'leg'
          : batch.kind.toString().startsWith('pedestrian') ? 'leg'
            : (batch.kind === 'cart' || batch.kind === 'carriage') ? 'wheel' : null;
        if (contactKind) {
          const correctionKey = `${batch.kind}:${spec.id}`;
          const cached = correctionCache.get(correctionKey);
          if (cached !== undefined) {
            correction = cached;
          } else {
            let minY = Infinity;
            for (const part of this.trafficBatches) {
              if (part.kind !== batch.kind || part.articulation !== contactKind) continue;
              const partMatrix = localFor(part, pose).clone();
              const vertices = part.geometry.attributes.position!;
              for (let vertexIndex = 0; vertexIndex < vertices.count; vertexIndex += 1) {
                vertex.fromBufferAttribute(vertices, vertexIndex).applyMatrix4(partMatrix);
                minY = Math.min(minY, vertex.y);
              }
            }
            if (Number.isFinite(minY)) correction = -minY;
            correctionCache.set(correctionKey, correction);
          }
        }
        contactOffset.makeTranslation(0, correction, batch.kind === 'horse' ? 3.55 : 0);
        batch.mesh.setMatrixAt(
          batch.instanceIds[index]!,
          actorWorld.clone().multiply(contactOffset).multiply(localFor(batch, pose)),
        );
      }
    }
    this.updateFarParisTraffic(t);
  }

  private updateFarParisTraffic(t: number): void {
    if (!this.farTraffic) return;
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    const actorMatrix = new Matrix4();
    const localMatrix = new Matrix4();
    const poseCache = new Map<string, ReturnType<typeof eiffelTrafficPoseAt>>();
    const poseFor = (spec: EiffelTrafficActor) => {
      const cached = poseCache.get(spec.id);
      if (cached) return cached;
      const pose = eiffelTrafficPoseAt(spec, t, this.rebuiltTower);
      poseCache.set(spec.id, pose);
      return pose;
    };
    for (let index = 0; index < this.farTraffic.people.specs.length; index += 1) {
      const spec = this.farTraffic.people.specs[index]!;
      const pose = poseFor(spec);
      const colors = this.crowdColors.get(spec.id)!;
      this.farTraffic.people.mesh.setColorAt(this.farTraffic.people.ids[index]!, colors[0]!);
      this.farTraffic.people.headMesh.setColorAt(this.farTraffic.people.headIds[index]!, colors[1]!);
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), pose.yaw);
      actorMatrix.compose(position.set(...pose.position), quaternion, scale);
      this.farTraffic.people.mesh.setMatrixAt(this.farTraffic.people.ids[index]!, actorMatrix);
      this.farTraffic.people.headMesh.setMatrixAt(this.farTraffic.people.headIds[index]!, actorMatrix);
    }
    for (let index = 0; index < this.farTraffic.vehicles.specs.length; index += 1) {
      const spec = this.farTraffic.vehicles.specs[index]!;
      const pose = poseFor(spec);
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), pose.yaw);
      actorMatrix.compose(position.set(...pose.position), quaternion, scale);
      this.farTraffic.vehicles.mesh.setMatrixAt(this.farTraffic.vehicles.ids[index]!, actorMatrix);
      const horseX = pose.position[0] + Math.sin(pose.yaw) * 3.55;
      const horseZ = pose.position[2] + Math.cos(pose.yaw) * 3.55;
      const surfaceLift = pose.position[1] - eiffelTerrainHeightAt(pose.position[0], pose.position[2]);
      actorMatrix.compose(
        position.set(horseX, eiffelTerrainHeightAt(horseX, horseZ) + surfaceLift, horseZ),
        quaternion,
        scale,
      );
      this.farTraffic.horses.mesh.setMatrixAt(this.farTraffic.horses.ids[index]!, actorMatrix);
    }
    for (const wheel of this.farTraffic.wheels.entries) {
      const pose = poseFor(wheel.spec);
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), pose.yaw);
      actorMatrix.compose(position.set(...pose.position), quaternion, scale);
      let rimMin = Infinity;
      for (let spoke = 0; spoke < 8; spoke += 1) {
        rimMin = Math.min(rimMin, Math.cos(spoke / 8 * Math.PI * 2 + pose.wheelAngle) * 0.63);
      }
      localMatrix.makeTranslation(wheel.offset[0], -rimMin, wheel.offset[2])
        .multiply(new Matrix4().makeRotationX(pose.wheelAngle));
      this.farTraffic.wheels.mesh.setMatrixAt(wheel.id, actorMatrix.clone().multiply(localMatrix));
    }
  }

  private createTrocadero(
    masonry: MeshStandardMaterial,
    roof: MeshStandardMaterial,
    glass: MeshStandardMaterial,
  ): Group {
    const group = new Group();
    group.name = 'eiffel-palais-trocadero';
    const block = new BoxGeometry(1, 1, 1);
    const dome = new ConeGeometry(1, 1, 6);
    const archGeo = new CylinderGeometry(3.5, 3.5, 2.4, 14, 1, false, 0, Math.PI);
    archGeo.rotateX(Math.PI / 2);
    const voidGeo = new CylinderGeometry(3.15, 3.15, 1.2, 14, 1, false, 0, Math.PI);
    voidGeo.rotateX(Math.PI / 2);
    const wingArchGeo = new CylinderGeometry(2.4, 2.4, 1.6, 12, 1, false, 0, Math.PI);
    wingArchGeo.rotateX(Math.PI / 2);
    const wingVoidGeo = new CylinderGeometry(2.15, 2.15, 0.9, 12, 1, false, 0, Math.PI);
    wingVoidGeo.rotateX(Math.PI / 2);
    const pavilion = new ConeGeometry(1, 1, 4);
    const drum = new CylinderGeometry(1, 1, 1, 16);
    const cupola = new SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    this.geometries.push(block, dome, archGeo, voidGeo, wingArchGeo, wingVoidGeo, pavilion, drum, cupola);
    const arcadeStone = masonry.clone();
    arcadeStone.color.set('#7a6a58');
    const palaisStone = masonry.clone();
    palaisStone.color.set('#a89070');
    palaisStone.emissive.set('#3a2818');
    this.materials.push(arcadeStone, palaisStone);
    const yAt = (x: number, z: number, half: number) => eiffelTerrainHeightAt(x, z) + half;
    const yawXZ = (x: number, z: number, yaw: number): [number, number] => {
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      return [x * c - z * s, x * s + z * c];
    };
    const wingX = 76;
    const towerX = 66;
    const wingYaw = 0.28;
    const esplanade = new Mesh(block, palaisStone);
    esplanade.name = 'eiffel-trocadero-esplanade';
    esplanade.position.set(0, yAt(0, -256, 0.8), -256);
    esplanade.scale.set(96, 1.6, 12);
    const terrace = new Mesh(block, palaisStone);
    terrace.name = 'eiffel-trocadero-terrace';
    terrace.position.set(0, yAt(0, -228, 1.6), -228);
    terrace.scale.set(44, 3.2, 10);
    const gardenL = new Mesh(block, palaisStone);
    gardenL.position.set(-28, yAt(-28, -234, 1.2), -234);
    gardenL.scale.set(16, 2.4, 10);
    const gardenR = new Mesh(block, palaisStone);
    gardenR.position.set(28, yAt(28, -234, 1.2), -234);
    gardenR.scale.set(16, 2.4, 10);
    const placeWing = (side: -1 | 1) => {
      const yaw = side * wingYaw;
      const cx = side * wingX;
      const cz = -246;
      const plinth = new Mesh(block, arcadeStone);
      plinth.name = side < 0 ? 'eiffel-trocadero-plinth-l' : 'eiffel-trocadero-plinth-r';
      plinth.position.set(cx, yAt(cx, cz, 2.2), cz);
      plinth.scale.set(34, 4.4, 24);
      plinth.rotation.y = yaw;
      const body = new Mesh(block, palaisStone);
      body.name = side < 0 ? 'eiffel-trocadero-wing-l' : 'eiffel-trocadero-wing-r';
      body.position.set(cx, yAt(cx, cz, 10), cz);
      body.scale.set(32, 20, 22);
      body.rotation.y = yaw;
      body.castShadow = true;
      const belt = new Mesh(block, arcadeStone);
      belt.position.set(cx, yAt(cx, cz, 10), cz);
      belt.scale.set(33.2, 1.8, 23.2);
      belt.rotation.y = yaw;
      const cornice = new Mesh(block, arcadeStone);
      cornice.position.set(cx, yAt(cx, cz, 19.2), cz);
      cornice.scale.set(33.6, 1.4, 23.4);
      cornice.rotation.y = yaw;
      const pavilionRoof = new Mesh(pavilion, roof);
      pavilionRoof.name = side < 0 ? 'eiffel-trocadero-wing-roof-l' : 'eiffel-trocadero-wing-roof-r';
      pavilionRoof.position.set(cx, yAt(cx, cz, 24.2), cz);
      pavilionRoof.scale.set(22, 8.4, 16);
      pavilionRoof.rotation.y = yaw;
      pavilionRoof.castShadow = true;
      const [tx, tz] = yawXZ(side * 14.4, 0, yaw);
      const turret = new Mesh(drum, palaisStone);
      turret.name = side < 0 ? 'eiffel-trocadero-turret-l' : 'eiffel-trocadero-turret-r';
      turret.position.set(cx + tx, yAt(cx + tx, cz + tz, 12), cz + tz);
      turret.scale.set(3.6, 12.4, 3.6);
      turret.castShadow = true;
      const turretCap = new Mesh(dome, roof);
      turretCap.name = side < 0 ? 'eiffel-trocadero-turret-cap-l' : 'eiffel-trocadero-turret-cap-r';
      turretCap.position.set(cx + tx, eiffelTerrainHeightAt(cx + tx, cz + tz) + 20.2, cz + tz);
      turretCap.scale.set(5.2, 7.2, 5.2);
      turretCap.castShadow = true;
      return { plinth, body, belt, cornice, pavilionRoof, turret, turretCap, yaw, cx, cz };
    };
    const wingLeft = placeWing(-1);
    const wingRight = placeWing(1);
    const wingPlinthL = wingLeft.plinth;
    const wingPlinthR = wingRight.plinth;
    const wingL = wingLeft.body;
    const wingR = wingRight.body;
    const roofL = wingLeft.pavilionRoof;
    const roofR = wingRight.pavilionRoof;
    const towerL = new Mesh(drum, palaisStone);
    towerL.name = 'eiffel-trocadero-tower-l';
    towerL.position.set(-towerX, yAt(-towerX, -250, 9), -250);
    towerL.scale.set(7, 18, 7);
    towerL.castShadow = true;
    const capL = new Mesh(cupola, roof);
    capL.name = 'eiffel-trocadero-dome-l';
    capL.position.set(-towerX, eiffelTerrainHeightAt(-towerX, -250) + 18, -250);
    capL.scale.set(8.8, 8.8, 8.8);
    capL.castShadow = true;
    const towerR = new Mesh(drum, palaisStone);
    towerR.name = 'eiffel-trocadero-tower-r';
    towerR.position.set(towerX, yAt(towerX, -250, 9), -250);
    towerR.scale.set(7, 18, 7);
    towerR.castShadow = true;
    const capR = new Mesh(cupola, roof);
    capR.name = 'eiffel-trocadero-dome-r';
    capR.position.set(towerX, eiffelTerrainHeightAt(towerX, -250) + 18, -250);
    capR.scale.set(8.8, 8.8, 8.8);
    capR.castShadow = true;
    const parapet = new Mesh(block, palaisStone);
    parapet.name = 'eiffel-trocadero-parapet';
    parapet.position.set(0, yAt(0, -236, 1.2), -236);
    parapet.scale.set(72, 2.4, 1.4);
    const hall = new Mesh(block, palaisStone);
    hall.name = 'eiffel-trocadero-hall';
    hall.position.set(0, yAt(0, -266, 4), -266);
    hall.scale.set(16, 8, 12);
    hall.castShadow = true;
    const hallRoof = new Mesh(block, roof);
    hallRoof.position.set(0, yAt(0, -266, 9.2), -266);
    hallRoof.scale.set(20, 2.4, 14);
    const lintel = new Mesh(block, palaisStone);
    lintel.name = 'eiffel-trocadero-colonnade';
    lintel.position.set(0, yAt(0, -278, 18.8), -278);
    lintel.scale.set(58, 1.8, 3.2);
    const arcade = new Group();
    arcade.name = 'eiffel-trocadero-arcade';
    for (let i = -4; i <= 4; i += 1) {
      const post = new Mesh(block, arcadeStone);
      const x = i * 7.2;
      post.position.set(x, yAt(x, -278, 7.2), -278);
      post.scale.set(2.4, 14.4, 2.4);
      arcade.add(post);
    }
    for (let i = -4; i < 4; i += 1) {
      const span = new Mesh(archGeo, arcadeStone);
      if (i === 0) span.name = 'eiffel-trocadero-arch';
      const x = (i + 0.5) * 7.2;
      span.position.set(x, yAt(x, -278, 14.4), -278);
      arcade.add(span);
    }
    const windows = new Group();
    windows.name = 'eiffel-trocadero-windows';
    const band = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const mesh = new Mesh(block, glass);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      windows.add(mesh);
    };
    for (let i = -4; i < 4; i += 1) {
      const hole = new Mesh(voidGeo, glass);
      const x = (i + 0.5) * 7.2;
      hole.position.set(x, yAt(x, -278, 14.4), -279.2);
      if (i === 0) hole.name = 'eiffel-trocadero-arch-glass';
      windows.add(hole);
    }
    const wingFaceLocalZ = -11.2;
    const hallFaceZ = -266 - 6.2;
    const towerFaceZ = -250 - 7;
    for (const wing of [wingLeft, wingRight]) {
      const base = yAt(wing.cx, wing.cz, 10);
      for (let i = -1; i <= 1; i += 1) {
        const [ax, az] = yawXZ(i * 7.4, wingFaceLocalZ, wing.yaw);
        const span = new Mesh(wingArchGeo, arcadeStone);
        if (wing.cx < 0 && i === 0) span.name = 'eiffel-trocadero-wing-arch';
        span.position.set(wing.cx + ax, base + 1.2, wing.cz + az);
        span.rotation.y = wing.yaw;
        windows.add(span);
        const [hx, hz] = yawXZ(i * 7.4, wingFaceLocalZ - 0.45, wing.yaw);
        const hole = new Mesh(wingVoidGeo, glass);
        hole.position.set(wing.cx + hx, base + 1.2, wing.cz + hz);
        hole.rotation.y = wing.yaw;
        windows.add(hole);
      }
    }
    const hallY = yAt(0, -266, 4);
    for (let i = -1; i <= 1; i += 1) {
      band(i * 5.2, hallY + 0.4, hallFaceZ, 4.2, 2.2, 0.5);
    }
    for (const x of [-towerX, towerX]) {
      const base = yAt(x, -250, 9);
      band(x - 3.2, base - 2.8, towerFaceZ, 4.4, 2.6, 0.5);
      band(x + 3.2, base - 2.8, towerFaceZ, 4.4, 2.6, 0.5);
      band(x - 3.2, base + 3.6, towerFaceZ, 4.4, 2.6, 0.5);
      band(x + 3.2, base + 3.6, towerFaceZ, 4.4, 2.6, 0.5);
    }
    const statues = new Group();
    statues.name = 'eiffel-trocadero-statues';
    const statueRoll = mulberry32('eiffel-trocadero-statues');
    for (let i = -4; i <= 4; i += 1) {
      const x = i * 8.4;
      const z = -226;
      const h = 3.6 + statueRoll() * 1.6;
      const figure = new Mesh(block, arcadeStone);
      if (i === 0) figure.name = 'eiffel-trocadero-statue';
      figure.position.set(x, yAt(x, z, h / 2), z);
      figure.scale.set(1.05 + statueRoll() * 0.35, h, 1.15);
      figure.castShadow = true;
      const capital = new Mesh(block, arcadeStone);
      capital.position.set(x, yAt(x, z, h + 0.55), z);
      capital.scale.set(1.6, 1.1, 1.6);
      statues.add(figure, capital);
    }
    group.add(
      esplanade, terrace, gardenL, gardenR, wingPlinthL, wingPlinthR,
      wingL, roofL, wingR, roofR,
      wingLeft.belt, wingRight.belt,
      wingLeft.cornice, wingRight.cornice,
      wingLeft.turret, wingLeft.turretCap, wingRight.turret, wingRight.turretCap,
      towerL, capL, towerR, capR, hall, hallRoof, lintel, arcade, parapet,
      windows, statues,
    );
    return group;
  }

  private createEcole(masonry: MeshStandardMaterial, roof: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'eiffel-ecole-militaire';
    const block = new BoxGeometry(1, 1, 1);
    this.geometries.push(block);
    const facade = new Mesh(block, masonry);
    facade.position.set(0, eiffelTerrainHeightAt(0, 278) + 9, 278);
    facade.scale.set(120, 18, 22);
    facade.castShadow = true;
    const top = new Mesh(block, roof);
    top.position.set(0, eiffelTerrainHeightAt(0, 278) + 19.4, 278);
    top.scale.set(122, 3.2, 24);
    const wingL = new Mesh(block, masonry);
    wingL.position.set(-78, eiffelTerrainHeightAt(-78, 268) + 8, 268);
    wingL.scale.set(42, 16, 18);
    const wingR = new Mesh(block, masonry);
    wingR.position.set(78, eiffelTerrainHeightAt(78, 268) + 8, 268);
    wingR.scale.set(42, 16, 18);
    group.add(facade, top, wingL, wingR);
    return group;
  }

  private createChapel(roof: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'eiffel-chapel';
    const stone = new MeshStandardMaterial({ color: '#c4b49a', roughness: 0.96 });
    const patina = new MeshStandardMaterial({ color: '#6a7a68', roughness: 0.78, metalness: 0.18 });
    injectMaterialRecipe(stone, 'haussmann-stucco');
    this.materials.push(stone, patina);
    const block = new BoxGeometry(1, 1, 1);
    const cone = new ConeGeometry(1, 1, 6);
    this.geometries.push(block, cone);
    const x = 118;
    const z = 72;
    const y = (h: number) => eiffelTerrainHeightAt(x, z) + h;
    const nave = new Mesh(block, stone);
    nave.position.set(x, y(7), z);
    nave.scale.set(20, 14, 32);
    nave.castShadow = true;
    const naveRoof = new Mesh(block, roof);
    naveRoof.position.set(x, y(15.2), z);
    naveRoof.scale.set(22, 3.2, 34);
    const tower = new Mesh(block, stone);
    tower.position.set(x, y(14), z - 12);
    tower.scale.set(8, 28, 8);
    tower.castShadow = true;
    const spire = new Mesh(cone, patina);
    spire.name = 'eiffel-chapel-spire';
    spire.position.set(x, y(42), z - 12);
    spire.scale.set(5.4, 32, 5.4);
    spire.castShadow = true;
    group.add(nave, naveRoof, tower, spire);
    return group;
  }

  private createYardRoad(): Group {
    const group = new Group();
    group.name = 'eiffel-levallois-road';
    const material = new MeshStandardMaterial({ color: '#8a7a62', roughness: 0.97 });
    injectMaterialRecipe(material, 'compacted-earth');
    this.materials.push(material);
    const geometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(geometry);
    const batched = this.rebuiltTower ? new InstancedMesh(geometry, material, 16) : null;
    if (batched) batched.name = 'eiffel-levallois-road-batched';
    const matrix = new Matrix4();
    for (let i = 0; i < 16; i += 1) {
      const x = 72 + i * 5.2;
      const z = 18 + i * 1.1;
      if (batched) {
        matrix.compose(
          new Vector3(x, eiffelTerrainHeightAt(x, z) + 0.08, z),
          new Quaternion(),
          new Vector3(5.4, 0.16, 4.8),
        );
        batched.setMatrixAt(i, matrix);
        continue;
      }
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, eiffelTerrainHeightAt(x, z) + 0.08, z);
      mesh.scale.set(5.4, 0.16, 4.8);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    if (batched) {
      batched.instanceMatrix.needsUpdate = true;
      batched.receiveShadow = true;
      batched.frustumCulled = false;
      group.add(batched);
    }
    return group;
  }

  private createChampPaths(): Group {
    const group = new Group();
    group.name = 'eiffel-champ-allees';
    const gravel = new MeshStandardMaterial({ color: '#9a8a6e', roughness: 0.98 });
    injectMaterialRecipe(gravel, 'compacted-earth');
    this.materials.push(gravel);
    const geometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(geometry);
    const strips = [
      { x: -100, z: 48, sx: 8.2, sz: 292 },
      { x: 100, z: 48, sx: 8.2, sz: 292 },
      { x: -210, z: 40, sx: 10, sz: 280 },
      { x: 210, z: 40, sx: 10, sz: 280 },
      { x: 0, z: 124, sx: 216, sz: 9 },
      { x: 0, z: 48, sx: 216, sz: 8 },
      { x: 0, z: -48, sx: 216, sz: 8 },
      { x: 0, z: 86, sx: 216, sz: 7 },
      { x: 0, z: 200, sx: 420, sz: 12 },
    ] as const;
    const batched = this.rebuiltTower ? new InstancedMesh(geometry, gravel, strips.length) : null;
    if (batched) batched.name = 'eiffel-champ-allees-batched';
    const matrix = new Matrix4();
    let index = 0;
    for (const strip of strips) {
      if (batched) {
        matrix.compose(
          new Vector3(strip.x, eiffelTerrainHeightAt(strip.x, strip.z) + 0.07, strip.z),
          new Quaternion(),
          new Vector3(strip.sx, 0.12, strip.sz),
        );
        batched.setMatrixAt(index++, matrix);
        continue;
      }
      const mesh = new Mesh(geometry, gravel);
      mesh.position.set(strip.x, eiffelTerrainHeightAt(strip.x, strip.z) + 0.07, strip.z);
      mesh.scale.set(strip.sx, 0.12, strip.sz);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    if (batched) {
      batched.instanceMatrix.needsUpdate = true;
      batched.receiveShadow = true;
      batched.frustumCulled = false;
      group.add(batched);
    }
    return group;
  }

  private createFoam(materials: MaterialLibrary): InstancedMesh {
    const foamMat = materials.whitewash.clone();
    foamMat.transparent = true;
    foamMat.opacity = 0.24;
    foamMat.depthWrite = false;
    this.materials.push(foamMat);
    const segments = 56;
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const foam = new InstancedMesh(box, foamMat, segments * 2);
    foam.name = 'eiffel-seine-foam';
    foam.castShadow = false;
    foam.receiveShadow = false;
    foam.frustumCulled = false;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const yaw = 0.08;
    const waterY = EIFFEL_SEINE_WATER_Y + 0.07;
    let count = 0;
    for (const bank of [-1, 1] as const) {
      for (let i = 0; i < segments; i += 1) {
        const along = (i / Math.max(1, segments - 1) - 0.5) * 500;
        const x = Math.cos(yaw) * along;
        const z = -175 + bank * 44 - Math.sin(yaw) * along;
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
        matrix.compose(
          new Vector3(x, waterY, z),
          quaternion,
          new Vector3(10.8, 0.22, 2.3),
        );
        foam.setMatrixAt(count, matrix);
        count += 1;
      }
    }
    foam.count = count;
    foam.instanceMatrix.needsUpdate = true;
    return foam;
  }

  private createLanterns(material: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'eiffel-night-lanterns';
    const topGeometry = new SphereGeometry(this.rebuiltTower ? 0.6 : 5.2, 10, 8);
    const beaconGeometry = new SphereGeometry(2.3, 8, 6);
    this.geometries.push(topGeometry, beaconGeometry);
    const top = new Mesh(topGeometry, material);
    top.name = 'eiffel-night-lantern';
    top.position.set(0, this.rebuiltTower ? 296.7 : EIFFEL_HEIGHT + 2, 0);
    top.castShadow = false;
    group.add(top);
    if (this.rebuiltTower) return group;
    const corners: Array<readonly [1 | -1, 1 | -1]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [sx, sz] of corners) {
      const first = new Mesh(beaconGeometry, material);
      const o1 = eiffelOffsetAt(EIFFEL_PLATFORM_1);
      first.position.set(sx * o1 * 0.92, EIFFEL_PLATFORM_1 + 3.2, sz * o1 * 0.92);
      first.castShadow = false;
      group.add(first);
      const second = new Mesh(beaconGeometry, material);
      const o2 = eiffelOffsetAt(EIFFEL_PLATFORM_2);
      second.position.set(sx * o2 * 0.92, EIFFEL_PLATFORM_2 + 2.4, sz * o2 * 0.92);
      second.castShadow = false;
      group.add(second);
    }
    return group;
  }

  private placeScatter(): () => void {
    const rand = mulberry32('eiffel-environment-scatter');
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const keepOut = (x: number, z: number) =>
      (Math.abs(x) < 118 && Math.abs(z) < 120) ||
      (this.rebuiltTower && x > 100 && x < 180 && z > -120 && z < 110);
    const placeTree = (x: number, z: number, canopyScale: number) => {
      const y = eiffelTerrainHeightAt(x, z);
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI * 2);
      position.set(x, y + 12.4 + rand() * 1.4, z);
      scale.set(
        canopyScale * (1.12 + rand() * 0.32),
        canopyScale * (0.95 + rand() * 0.18),
        canopyScale * (1.08 + rand() * 0.28),
      );
      matrix.compose(position, quaternion, scale);
      this.trees.setMatrixAt(trees, matrix);
      this.trees.setColorAt(
        trees,
        this.rebuiltTower
          ? new Color().setHSL(0.235 + rand() * 0.045, 0.34 + rand() * 0.14, 0.56 + rand() * 0.12)
          : new Color(0.62 + rand() * 0.55, 0.88 + rand() * 0.4, 0.42 + rand() * 0.38),
      );
      position.set(x, y + 5.6, z);
      quaternion.identity();
      scale.set(1, 1 + rand() * 0.28, 1);
      matrix.compose(position, quaternion, scale);
      this.trunks.setMatrixAt(trees, matrix);
      trees += 1;
    };

    let trees = 0;
    if (!this.rebuiltTower) for (const band of [-1, 1] as const) {
      for (let row = 0; row < 5; row += 1) {
        const ax = band * (128 + row * 7.2);
        for (let z = -96; z <= 228 && trees < 400; z += 9) {
          if (keepOut(ax, z) || z < -118) continue;
          placeTree(ax + (rand() - 0.5) * 2.4, z + (rand() - 0.5) * 2.0, 0.92 + rand() * 0.28);
        }
      }
    }
    if (this.rebuiltTower) {
      // The water occupies z ~= -175 +/- 46. Keep the allées on the two
      // quays, following the river angle, with a generous canopy clearance.
      for (let x = -420; x <= 420 && trees < EIFFEL_ENVIRONMENT.ecology.trees; x += 26) {
        if (Math.abs(x) < 42) continue; // open the Pont d'Iena sightline
        const riverCenter = -175 - Math.tan(0.08) * x;
        placeTree(x + (rand() - 0.5) * 3, riverCenter + 64 + (rand() - 0.5) * 3, 0.78 + rand() * 0.18);
        if (trees < EIFFEL_ENVIRONMENT.ecology.trees) {
          placeTree(x + (rand() - 0.5) * 3, riverCenter - 64 + (rand() - 0.5) * 3, 0.76 + rand() * 0.18);
        }
      }
    } else {
      for (let x = -250; x <= 250 && trees < EIFFEL_ENVIRONMENT.ecology.trees; x += 12) {
        if (Math.abs(x) < 92) continue;
        placeTree(x + (rand() - 0.5) * 4, -136 + (rand() - 0.5) * 8, 0.95 + rand() * 0.22);
        if (trees < EIFFEL_ENVIRONMENT.ecology.trees) {
          placeTree(x + (rand() - 0.5) * 4, -150 + (rand() - 0.5) * 7, 0.88 + rand() * 0.2);
        }
      }
      for (let x = -250; x <= 250 && trees < EIFFEL_ENVIRONMENT.ecology.trees; x += 11) {
        if (Math.abs(x) < 92) continue;
        placeTree(x + (rand() - 0.5) * 4, -162 + (rand() - 0.5) * 6, 0.9 + rand() * 0.2);
      }
    }
    for (let x = -92; !this.rebuiltTower && x <= 92 && trees < EIFFEL_ENVIRONMENT.ecology.trees; x += 12) {
      if (!keepOut(x, 122)) {
        placeTree(x + (rand() - 0.5) * 2.2, 122 + (rand() - 0.5) * 3, 0.9 + rand() * 0.2);
      }
      if (trees < EIFFEL_ENVIRONMENT.ecology.trees && !keepOut(x, -52)) {
        placeTree(x + (rand() - 0.5) * 2.2, -52 + (rand() - 0.5) * 3, 0.86 + rand() * 0.18);
      }
    }

    this.trees.count = trees; this.trunks.count = trees;
    this.trees.instanceMatrix.needsUpdate = true; this.trunks.instanceMatrix.needsUpdate = true;
    if (this.trees.instanceColor) this.trees.instanceColor.needsUpdate = true;
    return () => {
      const placeHouse = (x: number, z: number, w: number, d: number, h: number, yaw: number) => {
        const y = eiffelTerrainHeightAt(x, z);
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
        position.set(x, y + h / 2, z);
        scale.set(w, h, d);
        matrix.compose(position, quaternion, scale);
        this.houses.setMatrixAt(roofs, matrix);
        const plinthH = Math.min(6.4, Math.max(3.6, h * 0.22));
        position.set(x, y + plinthH / 2, z);
        scale.set(w + 0.7, plinthH, d + 0.7);
        matrix.compose(position, quaternion, scale);
        this.plinths.setMatrixAt(roofs, matrix);
        position.set(x, y + h + 0.28, z);
        scale.set(w + 1.5, 0.55, d + 1.5);
        matrix.compose(position, quaternion, scale);
        this.cornices.setMatrixAt(roofs, matrix);
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
        const cosB = Math.cos(yaw);
        const sinB = Math.sin(yaw);
        const balW = Math.min(w * 0.72, 28);
        position.set(x - sinB * (d * 0.5 + 0.9), y + h * 0.52, z - cosB * (d * 0.5 + 0.9));
        scale.set(balW, 0.42, 1.9);
        matrix.compose(position, quaternion, scale);
        this.balconies.setMatrixAt(roofs, matrix);
        const mansardH = this.rebuiltTower ? Math.min(5.4, Math.max(3.2, h * .2)) : Math.min(11.2, Math.max(6.4, h * 0.34));
        position.set(x, y + h + 0.55, z);
        scale.set(w + 0.9, 1.1, d + 0.9);
        matrix.compose(position, quaternion, scale);
        this.roofs.setMatrixAt(roofs, matrix);
        position.set(x, y + h + 1.1 + mansardH / 2, z);
        scale.set(w * 0.9, mansardH, d * 0.9);
        matrix.compose(position, quaternion, scale);
        this.mansards.setMatrixAt(roofs, matrix);
        const dormersHere = Math.max(2, Math.min(4, Math.round(w / 22)));
        for (let i = 0; i < dormersHere && dormerSlot < this.dormers.count; i += 1) {
          const lx = ((i + 0.5) / dormersHere - 0.5) * w * 0.62;
          position.set(
            x + lx * Math.cos(yaw) - (-(d * 0.46)) * Math.sin(yaw),
            y + h + 1.1 + mansardH * 0.42,
            z + lx * Math.sin(yaw) + (-(d * 0.46)) * Math.cos(yaw),
          );
          quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
          scale.set(Math.min(4.4, w / dormersHere * 0.42), mansardH * 0.4, 1.7);
          matrix.compose(position, quaternion, scale);
          this.dormers.setMatrixAt(dormerSlot, matrix);
          dormerSlot += 1;
        }
        const chimneyYaw = yaw;
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), chimneyYaw);
        position.set(
          x + Math.cos(yaw) * w * 0.22,
          y + h + 1.1 + mansardH + (this.rebuiltTower ? .7 : 2.4),
          z + Math.sin(yaw) * d * 0.18,
        );
        scale.set(1.8, (this.rebuiltTower ? 1.4 : 6.2) + rand() * 2.8, 1.8);
        matrix.compose(position, quaternion, scale);
        this.chimneys.setMatrixAt(roofs, matrix);
        const cos = Math.cos(yaw);
        const sin = Math.sin(yaw);
        const placeWindow = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number) => {
          if (windowSlot >= this.windows.count) return;
          position.set(x + lx * cos - lz * sin, ly, z + lx * sin + lz * cos);
          if (this.rebuiltTower) {
            const sideFacing = sz > sx;
            scale.set(sideFacing ? sz : sx, sy, 1);
            quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw + (sideFacing ? Math.PI / 2 : 0));
          } else {
            scale.set(sx, sy, sz);
            quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
          }
          matrix.compose(position, quaternion, scale);
          this.windows.setMatrixAt(windowSlot, matrix);
          windowSlot += 1;
        };
        const towardPark = x >= 0 ? -1 : 1;
        const bays = Math.max(3, Math.min(5, Math.round(w / 16)));
        const pane = Math.min(5.4, (w / bays) * 0.52);
        for (const floor of [0.26, 0.52, 0.76]) {
          for (let i = 0; i < bays; i += 1) {
            const lx = ((i + 0.5) / bays - 0.5) * w * 0.78;
            placeWindow(lx, y + h * floor, -(d * 0.5 + 0.28), pane, 3.2, 0.55);
          }
        }
        const dbays = Math.max(2, Math.min(4, Math.round(d / 18)));
        const dpane = Math.min(5.2, (d / dbays) * 0.48);
        for (const floor of [0.26, 0.52]) {
          for (let i = 0; i < dbays; i += 1) {
            const lz = ((i + 0.5) / dbays - 0.5) * d * 0.7;
            placeWindow(towardPark * (w * 0.5 + 0.28), y + h * floor, lz, 0.55, 3.4, dpane);
          }
        }
        const shops = Math.max(2, Math.min(4, bays));
        const shopW = Math.min(6.8, (w / shops) * 0.62);
        for (let i = 0; i < shops; i += 1) {
          const lx = ((i + 0.5) / shops - 0.5) * w * 0.74;
          placeWindow(lx, y + plinthH * 0.52, -(d * 0.5 + 0.34), shopW, plinthH * 0.7, 0.7);
        }
        const wallTone = new Color().setHSL(0.07 + rand() * 0.05, 0.08 + rand() * 0.14, 0.86 + rand() * 0.12);
        const tileTone = new Color().setHSL(
          rand() < 0.4 ? 0.12 : 0.02,
          rand() < 0.4 ? 0.08 + rand() * 0.1 : 0.32 + rand() * 0.22,
          0.22 + rand() * 0.14,
        );
        const zincTone = new Color().setHSL(0.14 + rand() * 0.06, 0.08 + rand() * 0.08, 0.26 + rand() * 0.12);
        this.houses.setColorAt(roofs, wallTone);
        this.roofs.setColorAt(roofs, tileTone);
        this.mansards.setColorAt(roofs, zincTone);
        roofs += 1;
      };

      let roofs = 0;
      let windowSlot = 0;
      let dormerSlot = 0;
      const placeIlot = (cx: number, cz: number, boulevardYaw?: number) => {
        if (roofs + 4 > EIFFEL_ENVIRONMENT.ecology.roofs) return;
        const inChampLawn = Math.abs(cx) < 180 && cz > -40 && cz < 250;
        const inEastYard = cx > 120 && cx < 204 && cz > 8 && cz < 64;
        const riverLocalZ = Math.sin(0.08) * cx + Math.cos(0.08) * (cz + 175);
        const inSeine = this.rebuiltTower
          ? Math.abs(riverLocalZ) < 82
          : cz < -118 && cz > -240;
        if (keepOut(cx, cz) || inChampLawn || inEastYard || inSeine) return;
        const bw = 78 + rand() * 28;
        const bd = 52 + rand() * 22;
        const wall = 13 + rand() * 4;
        const hStreet = 18 + rand() * (this.rebuiltTower ? 10 : 24);
        const hCourt = 14 + rand() * (this.rebuiltTower ? 6 : 14);
        const yaw = boulevardYaw ?? (rand() - 0.5) * 0.04;
        placeHouse(cx, cz - bd / 2 + wall / 2, bw - 6, wall, hStreet, yaw);
        placeHouse(cx + bw / 2 - wall / 2, cz, wall, bd - wall * 2 - 4, hCourt, yaw);
        placeHouse(cx - bw / 2 + wall / 2, cz, wall, bd - wall * 2 - 4, hCourt + (rand() - 0.5) * 6, yaw);
        placeHouse(
          cx + (rand() < 0.5 ? 1 : -1) * (bw / 2 - 9),
          cz + bd / 2 - 9,
          15 + rand() * 5,
          12 + rand() * 4,
          hStreet + 4 + rand() * 10,
          yaw,
        );
        if (!this.rebuiltTower && trees < EIFFEL_ENVIRONMENT.ecology.trees) {
          placeTree(cx + (rand() - 0.5) * 10, cz + (rand() - 0.5) * 8, 0.62 + rand() * 0.22);
        }
        if (!this.rebuiltTower && trees < EIFFEL_ENVIRONMENT.ecology.trees && rand() < 0.55) {
          placeTree(cx + (rand() - 0.5) * 12, cz + (rand() - 0.5) * 10, 0.55 + rand() * 0.18);
        }
      };
      for (const side of [-1, 1] as const) {
        const inner = side === 1 ? 258 : 242;
        for (let row = 0; row < 3 && roofs + 4 <= EIFFEL_ENVIRONMENT.ecology.roofs; row += 1) {
          for (let col = 0; col < 5 && roofs + 4 <= EIFFEL_ENVIRONMENT.ecology.roofs; col += 1) {
            const z = 68 + row * 74 + (col % 2) * 12 + (rand() - 0.5) * 8;
            if (z > 218) continue;
            placeIlot(
              side * (inner + col * (86 + rand() * 18) + (row % 2) * 14 + (rand() - 0.5) * 10),
              z,
            );
          }
        }
      }
      for (const bankZ of [-252, -272] as const) {
        for (let col = 0; col < 10 && roofs + 4 <= EIFFEL_ENVIRONMENT.ecology.roofs; col += 1) {
          const x = -420 + col * 84 + (rand() - 0.5) * 8;
          if (Math.abs(x) < 170) continue;
          placeIlot(x, bankZ);
        }
      }
      if (this.rebuiltTower) {
        // Irregular outer boulevards keep architecture behind every camera arc.
        // Each placement is a courtyard îlot made from varied street, side and
        // pavilion masses, so the skyline does not collapse into repeated rows.
        const orbitIlots: Array<readonly [number, number, number]> = [
          [-610, -348, -0.06], [-490, -360, -0.03], [-370, -346, 0.02], [-246, -356, 0.05],
          [246, -352, -0.05], [370, -362, -0.02], [492, -346, 0.03], [612, -358, 0.06],
          [-535, -220, 0.10], [-550, -108, 0.08], [-542, 4, 0.06], [-556, 118, 0.04],
          [-538, 232, 0.02], [-552, 346, -0.02], [535, -216, -0.10], [550, -104, -0.08],
          [542, 8, -0.06], [556, 122, -0.04], [538, 236, -0.02], [552, 350, 0.02],
          [-430, 338, 0.05], [-302, 326, 0.02], [-178, 342, -0.03], [178, 334, 0.03],
          [302, 346, -0.02], [430, 330, -0.05], [-442, 432, 0.08], [-312, 446, 0.04],
          [-184, 430, -0.02], [184, 444, 0.02], [312, 428, -0.04], [442, 442, -0.08],
          [-448, -286, 0.08], [-300, -316, 0.04], [300, -310, -0.04], [448, -282, -0.08],
        ];
        for (const [x, z, yaw] of orbitIlots) {
          if (roofs + 4 > 236) break;
          placeIlot(x, z, yaw);
        }
      }

      for (let i = 0; i < EIFFEL_ENVIRONMENT.site.stocks; i += 1) {
        const north = i < 12;
        const side = i % 2 === 0 ? 1 : -1;
        const x = north
          ? side * (46 + (i % 6) * 7 + (rand() - 0.5) * 4)
          : EIFFEL_YARD[0] + (rand() - 0.5) * 28;
        const z = north
          ? -86 - (i % 4) * 7 + (rand() - 0.5) * 4
          : EIFFEL_YARD[2] + (rand() - 0.5) * 22;
        position.set(x, eiffelTerrainHeightAt(x, z) + (north ? 1.1 : 1.6), z);
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), north ? side * 0.08 : rand() * 0.6);
        scale.set(
          north ? 3.2 + rand() * 1.8 : 4.4 + rand() * 3.2,
          north ? 1.4 + rand() * 0.8 : 2.2 + rand() * 1.6,
          north ? 1.5 + rand() * 0.8 : 1.8 + rand() * 1.4,
        );
        matrix.compose(position, quaternion, scale);
        this.stocks.setMatrixAt(i, matrix);
      }
      for (let i = 0; i < EIFFEL_ENVIRONMENT.site.forges; i += 1) {
        const north = i < 4;
        const side = i % 2 === 0 ? 1 : -1;
        const x = north
          ? side * (52 + (i % 2) * 10)
          : EIFFEL_YARD[0] - 8 + (rand() - 0.5) * 22;
        const z = north
          ? -74 - i * 3
          : EIFFEL_YARD[2] + 8 + rand() * 12;
        position.set(x, eiffelTerrainHeightAt(x, z) + 1.8, z);
        quaternion.identity();
        scale.set(2.8, 3.4, 2.6);
        matrix.compose(position, quaternion, scale);
        this.forges.setMatrixAt(i, matrix);
      }
      const bargeY = EIFFEL_SEINE_WATER_Y + 0.8;
      for (let i = 0; i < 8; i += 1) {
        const x = -150 + i * 42 + (rand() - 0.5) * 8;
        const z = -168 - (i % 3) * 7 + (rand() - 0.5) * 5;
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), 0.08 + (rand() - 0.5) * 0.12);
        position.set(x, bargeY, z);
        scale.set(16 + rand() * 8, 2.4, 4.2 + rand() * 1.6);
        matrix.compose(position, quaternion, scale);
        this.barges.setMatrixAt(i, matrix);
      }
      const archFalsework = [
        { towardX: 0, towardZ: -1, yaw: 0 },
      ];
      let cribs = 0;
      for (const arch of archFalsework) {
        for (let segment = 0; segment < 8; segment += 1) {
          const u = (segment + 0.5) / 8;
          const point = eiffelArchPoint(arch.towardX, arch.towardZ, arch.yaw, u, 5.6);
          const height = Math.max(4, point.y - eiffelTerrainHeightAt(point.x, point.z));
          quaternion.setFromAxisAngle(new Vector3(0, 1, 0), arch.yaw);
          position.set(point.x, eiffelTerrainHeightAt(point.x, point.z) + height / 2, point.z);
          scale.set(1.15, height, 1.15);
          matrix.compose(position, quaternion, scale);
          this.falsework.setMatrixAt(cribs, matrix);
          cribs += 1;
          position.set(point.x, eiffelTerrainHeightAt(point.x, point.z) + height + 0.7, point.z);
          scale.set(2.4, 1.1, 1.2);
          matrix.compose(position, quaternion, scale);
          this.falsework.setMatrixAt(cribs, matrix);
          cribs += 1;
        }
      }
      this.trees.count = trees;
      this.trunks.count = trees;
      this.houses.count = roofs;
      this.plinths.count = roofs;
      this.cornices.count = roofs;
      this.balconies.count = roofs;
      this.roofs.count = roofs;
      this.mansards.count = roofs;
      this.dormers.count = dormerSlot;
      this.chimneys.count = roofs;
      this.windows.count = windowSlot;
      this.barges.count = 8;
      this.stocks.count = EIFFEL_ENVIRONMENT.site.stocks;
      this.forges.count = EIFFEL_ENVIRONMENT.site.forges;
      this.falsework.count = cribs;
      for (const mesh of [
        this.trees, this.trunks, this.houses, this.roofs, this.mansards,
        this.dormers, this.chimneys, this.barges, this.windows, this.plinths, this.cornices,
        this.balconies, this.stocks, this.forges, this.falsework,
      ]) {
        mesh.instanceMatrix.needsUpdate = true;
      }
      if (this.houses.instanceColor) this.houses.instanceColor.needsUpdate = true;
      if (this.roofs.instanceColor) this.roofs.instanceColor.needsUpdate = true;
      if (this.mansards.instanceColor) this.mansards.instanceColor.needsUpdate = true;
      if (this.trees.instanceColor) this.trees.instanceColor.needsUpdate = true;
    };
  }

  get lightingDiagnostics(): Record<string, unknown> { return { ...this.group.userData.atmosphere, ...this.streetLights?.group.userData, beaconIntensity:this.lanternMaterial.emissiveIntensity, windowIntensity:this.windowMaterial.emissiveIntensity }; }

  update(t: number, _light: LightState, _sky: EiffelSkySample, motionT = t): void {
    this.currentT = motionT;
    this.updateParisTraffic(motionT);
    const night = Math.max(0, Math.min(1, _light.emissive ?? Math.max(0, (t - .82) / .18)));
    this.group.userData.atmosphere = {sunElevation:_light.sun?.elevation,sunAzimuth:_light.sun?.azimuth,sunIntensity:_light.sun?.intensity,sunVisibility:_light.sun?.visibility ?? 1,sky:_sky.horizon,nightAmount:night};
    this.streetLights?.update(night);
    this.lanternMaterial.emissiveIntensity = night * 3.4;
    this.lanterns.visible = t > (this.rebuiltTower ? 0.92 : 0.86) && night > .001;
    this.masonry.emissiveIntensity = !this.rebuiltTower && t > 0.82 ? ((t - 0.82) / 0.18) * 0.28 : 0;
    this.forgeMaterial.emissiveIntensity = 0.28 + (t > 0.7 ? ((t - 0.7) / 0.3) * 0.5 : 0);
    this.windowMaterial.emissiveIntensity = night * .85;
    if (this.falsework) this.falsework.visible = !this.rebuiltTower && t >= 0.18 && t < 0.3;
    const foam = this.foam.material as MeshStandardMaterial;
    foam.opacity = (this.rebuiltTower ? 0.035 : 0.18) + 0.04 * (0.5 + 0.5 * Math.sin(motionT * Math.PI * 2 * 24));
  }

  dispose(): void {
    this.disposed = true;
    this.streetLights?.dispose();
    this.createFallbackScatter = null;
    this.terrainBatch?.dispose();this.terrainBatch=null;
    for(const batch of this.staticTreeBatches)batch.dispose();
    this.staticTreeBatches.length=0;
    for(const batch of this.staticArchitectureBatches)batch.dispose();
    this.staticArchitectureBatches.length=0;
    for (const root of this.parisAssetRoots) this.disposeParisAsset(root);
    this.parisAssetRoots.length = 0;
    this.trafficBatches.length = 0;
    for (const mesh of this.detailedTrafficMeshes) mesh.dispose();
    this.detailedTrafficMeshes.length = 0;
    for (const mesh of this.trafficMoorings) mesh.dispose();
    this.trafficMoorings.length = 0;
    this.farTraffic?.people.mesh.dispose();
    this.farTraffic?.people.headMesh.dispose();
    this.farTraffic?.vehicles.mesh.dispose();
    this.farTraffic?.horses.mesh.dispose();
    this.farTraffic?.wheels.mesh.dispose();
    this.farTraffic = null;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.trees.dispose();
    this.trunks.dispose();
    this.houses?.dispose();
    this.roofs?.dispose();
    this.mansards?.dispose();
    this.dormers?.dispose();
    this.chimneys?.dispose();
    this.barges?.dispose();
    this.windows?.dispose();
    this.plinths?.dispose();
    this.cornices?.dispose();
    this.balconies?.dispose();
    this.stocks?.dispose();
    this.forges?.dispose();
    this.falsework?.dispose();
    this.foam.dispose();
    this.expoPools?.dispose();
  }
}
