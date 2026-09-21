import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  TubeGeometry,
  Vector3,
} from 'three';
import { SYDNEY_ENVIRONMENT } from '../../data/sydneyEnvironment';
import { SYDNEY_YARD } from '../../data/sydneyConstruction';
import type { SydneySkySample } from '../../data/sydneySky';
import type { LightState } from '../../engine/daynight';
import { sydneyHarbourLotsOf } from '../../engine/sydneyHarbourLots';
import {
  SYDNEY_BRIDGE,
  sydneyGroundKindAt,
  sydneyPeninsulaShoreAt,
  sydneyTerrainHeightAt,
} from '../../engine/sydneyTerrain';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';
import {
  flattenSydneyRoles,
  loadSydneyHarbourKit,
} from './sydneyKit';
import {
  createSydneyFigCrown,
  createSydneyFigTrunk,
  createSydneyOfficeCrown,
  createSydneyOfficeTower,
  createSydneyShedHall,
  createSydneyShedRoof,
  createSydneyTerraceHouse,
  createSydneyTerraceRoof,
  createSydneyWorkboatHull,
} from './sydneyHarbour';

const WATER_RADIUS = 1680;
const UP = new Vector3(0, 1, 0);

export class SydneyEnvironment {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private disposed = false;
  private kitLoaded = false;
  private podiumKit: Mesh | null = null;
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly water: Mesh;
  private readonly foam: InstancedMesh;
  private readonly figs: InstancedMesh;
  private readonly figTrunks: InstancedMesh;
  private readonly sheds: InstancedMesh;
  private readonly shedRoofs: InstancedMesh;
  private readonly offices: InstancedMesh;
  private readonly officeCrowns: InstancedMesh;
  private readonly terraces: InstancedMesh;
  private readonly terraceRoofs: InstancedMesh;
  private readonly beds: InstancedMesh;
  private readonly stacks: InstancedMesh;
  private boats!: InstancedMesh;
  private boatCabins!: InstancedMesh;
  private boatMasts!: InstancedMesh;
  private readonly glass: InstancedMesh;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'sydney-environment';
    const land = new MeshStandardMaterial({ color: '#b7a48a', roughness: 0.98, vertexColors: true });
    const foliage = new MeshStandardMaterial({ color: '#3f5c38', roughness: 0.94 });
    const timber = new MeshStandardMaterial({ color: '#8a6a48', roughness: 0.92 });
    const roof = new MeshStandardMaterial({ color: '#6e4636', roughness: 0.88 });
    const granite = new MeshStandardMaterial({ color: '#8a7a6a', roughness: 0.95 });
    const sandstone = new MeshStandardMaterial({ color: '#c4b49a', roughness: 0.9 });
    const tile = new MeshStandardMaterial({ color: '#efe6d6', roughness: 0.88 });
    const steel = new MeshStandardMaterial({ color: '#4e5964', roughness: 0.42, metalness: 0.46 });
    const pylonStone = new MeshStandardMaterial({ color: '#a89880', roughness: 0.86 });
    const foam = materials.whitewash.clone();
    foam.transparent = true;
    foam.opacity = 0.24;
    foam.depthWrite = false;
    injectMaterialRecipe(land, 'compacted-earth');
    injectMaterialRecipe(foliage, 'foliage');
    injectMaterialRecipe(timber, 'wood');
    injectMaterialRecipe(granite, 'granite');
    injectMaterialRecipe(sandstone, 'granite');
    injectMaterialRecipe(pylonStone, 'granite');
    injectMaterialRecipe(steel, 'puddled-iron');
    const glass = new MeshStandardMaterial({
      color: '#1a3a52',
      roughness: 0.12,
      metalness: 0.18,
      transparent: true,
      opacity: 0.55,
    });
    this.materials.push(
      land, foliage, timber, roof, granite, sandstone, tile, steel, pylonStone, foam, glass,
    );

    this.group.add(this.createTerrain(land));
    this.group.add(this.createWater(materials.water));
    this.foam = this.createHarbourFoam(foam);
    this.group.add(this.foam);
    this.group.add(this.createBridge(steel, pylonStone));
    this.group.add(this.createWorkboats(timber, steel));
    this.glass = this.createGlass(glass);
    this.group.add(this.glass);

    const figCrown = createSydneyFigCrown();
    const figTrunk = createSydneyFigTrunk();
    const shedHall = createSydneyShedHall();
    const shedRoof = createSydneyShedRoof();
    const office = createSydneyOfficeTower();
    const officeCrown = createSydneyOfficeCrown();
    const terrace = createSydneyTerraceHouse();
    const terraceRoof = createSydneyTerraceRoof();
    const bedGeom = new BoxGeometry(1, 1, 1);
    this.geometries.push(
      figCrown, figTrunk, shedHall, shedRoof, office, officeCrown, terrace, terraceRoof, bedGeom,
    );

    const figLots = sydneyHarbourLotsOf('fig');
    const shedLots = sydneyHarbourLotsOf('shed');
    const officeLots = sydneyHarbourLotsOf('office');
    const terraceLots = sydneyHarbourLotsOf('terrace');

    this.figs = new InstancedMesh(figCrown, foliage, Math.max(1, figLots.length));
    this.figTrunks = new InstancedMesh(figTrunk, timber, Math.max(1, figLots.length));
    this.sheds = new InstancedMesh(shedHall, timber, Math.max(1, shedLots.length));
    this.shedRoofs = new InstancedMesh(shedRoof, roof, Math.max(1, shedLots.length));
    this.offices = new InstancedMesh(office, sandstone, Math.max(1, officeLots.length));
    this.officeCrowns = new InstancedMesh(officeCrown, granite, Math.max(1, officeLots.length));
    this.terraces = new InstancedMesh(terrace, sandstone, Math.max(1, terraceLots.length));
    this.terraceRoofs = new InstancedMesh(terraceRoof, roof, Math.max(1, terraceLots.length));
    this.beds = new InstancedMesh(bedGeom, granite, SYDNEY_ENVIRONMENT.ecology.castingBeds);
    this.stacks = new InstancedMesh(bedGeom, tile, SYDNEY_ENVIRONMENT.ecology.tileStacks);
    this.placeHarbour();
    for (const mesh of [
      this.figs, this.figTrunks, this.sheds, this.shedRoofs,
      this.offices, this.officeCrowns, this.terraces, this.terraceRoofs,
      this.beds, this.stacks,
    ]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.water = this.group.getObjectByName('sydney-harbour-water') as Mesh;
    this.ready = this.upgradeHarbourKit();
  }

  private createTerrain(material: MeshStandardMaterial): Mesh {
    const geometry = new PlaneGeometry(
      SYDNEY_ENVIRONMENT.terrain.radius * 2,
      SYDNEY_ENVIRONMENT.terrain.radius * 2,
      SYDNEY_ENVIRONMENT.terrain.segments,
      SYDNEY_ENVIRONMENT.terrain.segments,
    );
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position!;
    const colors = new Float32Array(positions.count * 3);
    const sand = new Color('#c4b49a');
    const rock = new Color('#8a7a6a');
    const grass = new Color('#4a7a42');
    const city = new Color('#b8a890');
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = sydneyTerrainHeightAt(x, z);
      const kind = sydneyGroundKindAt(x, z);
      positions.setY(i, y > 0.15 ? y : -8);
      if (kind === 'garden' || kind === 'north') scratch.copy(grass).lerp(sand, 0.18);
      else if (kind === 'city') scratch.copy(city);
      else if (kind === 'abutment') scratch.copy(rock);
      else scratch.copy(sand).lerp(rock, Math.min(1, y / 3));
      colors[i * 3] = scratch.r;
      colors[i * 3 + 1] = scratch.g;
      colors[i * 3 + 2] = scratch.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'sydney-peninsula-floor';
    mesh.receiveShadow = true;
    return mesh;
  }

  private createWater(material: MeshStandardMaterial): Mesh {
    const geometry = new CircleGeometry(WATER_RADIUS, 72);
    geometry.rotateX(-Math.PI / 2);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'sydney-harbour-water';
    mesh.position.y = 0.08;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createHarbourFoam(material: MeshStandardMaterial): InstancedMesh {
    const segments = 80;
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const foam = new InstancedMesh(box, material, segments);
    foam.name = 'sydney-harbour-foam';
    foam.castShadow = false;
    foam.receiveShadow = false;
    foam.frustumCulled = false;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    let count = 0;
    for (let i = 0; i < segments; i += 1) {
      const theta = ((i + 0.5) / segments) * Math.PI * 2;
      const inland = sydneyPeninsulaShoreAt(theta, 0.98);
      const seaward = sydneyPeninsulaShoreAt(theta, 1.035);
      if (sydneyTerrainHeightAt(inland.x, inland.z) < 0.25) continue;
      if (sydneyTerrainHeightAt(seaward.x, seaward.z) > 0.05) continue;
      quaternion.setFromAxisAngle(UP, seaward.yaw);
      matrix.compose(
        new Vector3(seaward.x, 0.16, seaward.z),
        quaternion,
        new Vector3(10.5, 0.28, 2.4),
      );
      foam.setMatrixAt(count, matrix);
      count += 1;
    }
    foam.count = count;
    foam.instanceMatrix.needsUpdate = true;
    return foam;
  }

  private createBridge(steel: MeshStandardMaterial, stone: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'sydney-harbour-bridge';
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const { x, southZ, northZ, deckY, archRise } = SYDNEY_BRIDGE;
    const span = southZ - northZ;
    const deck = new Mesh(box, steel);
    deck.position.set(x, deckY, (southZ + northZ) / 2);
    deck.scale.set(22, 3.2, span + 18);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
    for (const z of [northZ, southZ] as const) {
      const pylon = new Group();
      pylon.name = z === southZ ? 'sydney-harbour-bridge-pylon-south' : 'sydney-harbour-bridge-pylon-north';
      const shaft = new Mesh(box, stone);
      shaft.position.set(x, deckY + 8, z);
      shaft.scale.set(18, 72, 16);
      shaft.castShadow = true;
      const crown = new Mesh(box, stone);
      crown.position.set(x, deckY + 46, z);
      crown.scale.set(22, 14, 20);
      crown.castShadow = true;
      const base = new Mesh(box, stone);
      base.position.set(x, 6, z);
      base.scale.set(26, 12, 22);
      base.castShadow = true;
      pylon.add(shaft, crown, base);
      group.add(pylon);
    }
    const hangerGeom = new CylinderGeometry(0.32, 0.32, 1, 6);
    this.geometries.push(hangerGeom);
    for (const offset of [-8.5, 8.5]) {
      const points: Vector3[] = [];
      for (let i = 0; i <= 56; i += 1) {
        const u = i / 56;
        points.push(new Vector3(x + offset, deckY + Math.sin(u * Math.PI) * archRise, northZ + u * span));
      }
      const arch = new TubeGeometry(new CatmullRomCurve3(points), 72, 2.6, 8, false);
      this.geometries.push(arch);
      const archMesh = new Mesh(arch, steel);
      archMesh.name = offset < 0 ? 'sydney-harbour-bridge-arch' : 'sydney-harbour-bridge-arch-east';
      archMesh.castShadow = true;
      group.add(archMesh);
      for (let i = 3; i <= 53; i += 2) {
        const u = i / 56;
        const y = deckY + Math.sin(u * Math.PI) * archRise;
        const z = northZ + u * span;
        const hanger = new Mesh(hangerGeom, steel);
        hanger.position.set(x + offset, (y + deckY) / 2, z);
        hanger.scale.set(1, Math.max(0.8, y - deckY), 1);
        hanger.castShadow = true;
        group.add(hanger);
      }
    }
    return group;
  }

  private createWorkboats(hull: MeshStandardMaterial, cabin: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'sydney-harbour-workboats';
    const hullGeom = createSydneyWorkboatHull();
    const cabinGeom = new BoxGeometry(1, 1, 1);
    const mastGeom = new CylinderGeometry(0.08, 0.11, 1, 6);
    this.geometries.push(hullGeom, cabinGeom, mastGeom);
    this.boats = new InstancedMesh(hullGeom, hull, 8);
    this.boatCabins = new InstancedMesh(cabinGeom, cabin, 8);
    this.boatMasts = new InstancedMesh(mastGeom, cabin, 8);
    this.boats.name = 'sydney-harbour-hulls';
    this.boatCabins.name = 'sydney-harbour-cabins';
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const berths: Array<readonly [number, number, number, number]> = [
      [96, 0.55, -36, 0.4],
      [112, 0.55, 18, -0.2],
      [78, 0.55, 56, 0.7],
      [-96, 0.55, 108, 1.2],
      [52, 0.55, -78, -0.5],
      [-128, 0.55, -96, 2.4],
      [138, 0.55, -12, 0.15],
      [-70, 0.55, 152, 1.7],
    ];
    berths.forEach(([x, y, z, yaw], index) => {
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(new Vector3(x, y, z), quaternion, new Vector3(16, 1, 12));
      this.boats.setMatrixAt(index, matrix);
      matrix.compose(new Vector3(x, y + 1.7, z), quaternion, new Vector3(4.6, 2.1, 3.2));
      this.boatCabins.setMatrixAt(index, matrix);
      matrix.compose(new Vector3(x - 1.4, y + 4.2, z), quaternion, new Vector3(1, 7.2, 1));
      this.boatMasts.setMatrixAt(index, matrix);
    });
    this.boats.instanceMatrix.needsUpdate = true;
    this.boatCabins.instanceMatrix.needsUpdate = true;
    this.boatMasts.instanceMatrix.needsUpdate = true;
    this.boats.castShadow = true;
    this.boatCabins.castShadow = true;
    this.boatMasts.castShadow = true;
    group.add(this.boats, this.boatCabins, this.boatMasts);
    return group;
  }

  private createGlass(material: MeshStandardMaterial): InstancedMesh {
    const geometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(geometry);
    const glass = new InstancedMesh(geometry, material, 3);
    glass.name = 'sydney-curtain-glass';
    glass.castShadow = false;
    glass.receiveShadow = true;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const walls: Array<readonly [number, number, number, number, number, number, number]> = [
      [10, 22, -14, 0.22, 28, 18, 4],
      [-18, 20, 4, -0.7, 24, 16, 3.6],
      [6, 18, 16, 0.18, 16, 12, 3.2],
    ];
    walls.forEach(([x, y, z, yaw, w, h, d], index) => {
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(new Vector3(x, y, z), quaternion, new Vector3(w, h, d));
      glass.setMatrixAt(index, matrix);
    });
    glass.instanceMatrix.needsUpdate = true;
    glass.visible = false;
    return glass;
  }

  private adoptGeometry(mesh: InstancedMesh, next: BufferGeometry | null): void {
    if (!next) return;
    const previous = mesh.geometry;
    mesh.geometry = next;
    const index = this.geometries.indexOf(previous);
    if (index >= 0) this.geometries.splice(index, 1);
    previous.dispose();
    this.geometries.push(next);
    const material = mesh.material;
    if (material instanceof MeshStandardMaterial) material.vertexColors = true;
  }

  private async upgradeHarbourKit(): Promise<void> {
    try {
      const kit = await loadSydneyHarbourKit();
      if (this.disposed) return;
      this.adoptGeometry(this.offices, flattenSydneyRoles(kit.office, ['stone', 'granite', 'void']));
      this.officeCrowns.visible = false;
      this.adoptGeometry(this.sheds, flattenSydneyRoles(kit.shed, ['timber', 'roof']));
      this.shedRoofs.visible = false;
      this.adoptGeometry(this.figs, flattenSydneyRoles(kit.fig, ['foliage', 'timber']));
      this.figTrunks.visible = false;
      const podiumGeom = flattenSydneyRoles(kit.podium, ['granite', 'stone']);
      if (podiumGeom) {
        const podiumMat = new MeshStandardMaterial({ color: '#b08978', roughness: 0.86, vertexColors: true });
        this.materials.push(podiumMat);
        const podium = new Mesh(podiumGeom, podiumMat);
        podium.name = 'sydney-podium-kit';
        podium.castShadow = true;
        podium.receiveShadow = true;
        podium.visible = false;
        this.geometries.push(podiumGeom);
        this.group.add(podium);
        this.podiumKit = podium;
      }
      this.kitLoaded = true;
      this.placeHarbour();
    } catch {
      /* Procedural harbour kit already instances the lots. */
    }
  }

  private placeHarbour(): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const figLots = sydneyHarbourLotsOf('fig');
    figLots.forEach((lot, index) => {
      const ground = sydneyTerrainHeightAt(lot.x, lot.z);
      quaternion.setFromAxisAngle(UP, lot.yaw);
      if (this.kitLoaded) {
        matrix.compose(
          new Vector3(lot.x, ground, lot.z),
          quaternion,
          new Vector3(lot.scale, lot.scale, lot.scale),
        );
        this.figs.setMatrixAt(index, matrix);
        return;
      }
      const trunkH = 7.4 * lot.scale;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, ground + trunkH * 0.5, lot.z),
        quaternion,
        new Vector3(lot.scale, trunkH, lot.scale),
      );
      this.figTrunks.setMatrixAt(index, matrix);
      matrix.compose(
        new Vector3(lot.x, ground + trunkH + 3.4 * lot.scale, lot.z),
        quaternion,
        new Vector3(5.6 * lot.scale, 4.8 * lot.scale, 5.6 * lot.scale),
      );
      this.figs.setMatrixAt(index, matrix);
    });
    this.figs.count = figLots.length;
    this.figTrunks.count = figLots.length;
    this.figs.instanceMatrix.needsUpdate = true;
    this.figTrunks.instanceMatrix.needsUpdate = true;

    sydneyHarbourLotsOf('shed').forEach((lot, index) => {
      const ground = sydneyTerrainHeightAt(lot.x, lot.z);
      quaternion.setFromAxisAngle(UP, lot.yaw);
      if (this.kitLoaded) {
        matrix.compose(
          new Vector3(lot.x, ground, lot.z),
          quaternion,
          new Vector3(lot.scale, lot.scale, lot.scale),
        );
        this.sheds.setMatrixAt(index, matrix);
        return;
      }
      const h = 7.6 * lot.scale;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, ground + h * 0.5, lot.z),
        quaternion,
        new Vector3(18 * lot.scale, h, 9.4 * lot.scale),
      );
      this.sheds.setMatrixAt(index, matrix);
      matrix.compose(
        new Vector3(lot.x, ground + h, lot.z),
        quaternion,
        new Vector3(18 * lot.scale, h, 9.4 * lot.scale),
      );
      this.shedRoofs.setMatrixAt(index, matrix);
    });
    this.sheds.count = sydneyHarbourLotsOf('shed').length;
    this.shedRoofs.count = sydneyHarbourLotsOf('shed').length;
    this.sheds.instanceMatrix.needsUpdate = true;
    this.shedRoofs.instanceMatrix.needsUpdate = true;

    sydneyHarbourLotsOf('office').forEach((lot, index) => {
      const ground = sydneyTerrainHeightAt(lot.x, lot.z);
      quaternion.setFromAxisAngle(UP, lot.yaw);
      if (this.kitLoaded) {
        const h = (lot.storeys * 3.4 * lot.scale) / 28;
        matrix.compose(
          new Vector3(lot.x, ground, lot.z),
          quaternion,
          new Vector3(lot.scale, Math.max(0.45, h), lot.scale),
        );
        this.offices.setMatrixAt(index, matrix);
        return;
      }
      const h = lot.storeys * 3.4 * lot.scale;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, ground + h * 0.5, lot.z),
        quaternion,
        new Vector3(14 * lot.scale, h, 11 * lot.scale),
      );
      this.offices.setMatrixAt(index, matrix);
      matrix.compose(
        new Vector3(lot.x, ground + h, lot.z),
        quaternion,
        new Vector3(14 * lot.scale, h, 11 * lot.scale),
      );
      this.officeCrowns.setMatrixAt(index, matrix);
    });
    this.offices.count = sydneyHarbourLotsOf('office').length;
    this.officeCrowns.count = sydneyHarbourLotsOf('office').length;
    this.offices.instanceMatrix.needsUpdate = true;
    this.officeCrowns.instanceMatrix.needsUpdate = true;

    sydneyHarbourLotsOf('terrace').forEach((lot, index) => {
      const ground = sydneyTerrainHeightAt(lot.x, lot.z);
      const h = 5.6 * lot.scale;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, ground + h * 0.5, lot.z),
        quaternion,
        new Vector3(8.4 * lot.scale, h, 10.2 * lot.scale),
      );
      this.terraces.setMatrixAt(index, matrix);
      matrix.compose(
        new Vector3(lot.x, ground + h, lot.z),
        quaternion,
        new Vector3(8.4 * lot.scale, h, 10.2 * lot.scale),
      );
      this.terraceRoofs.setMatrixAt(index, matrix);
    });
    this.terraces.count = sydneyHarbourLotsOf('terrace').length;
    this.terraceRoofs.count = sydneyHarbourLotsOf('terrace').length;
    this.terraces.instanceMatrix.needsUpdate = true;
    this.terraceRoofs.instanceMatrix.needsUpdate = true;

    quaternion.identity();
    for (let i = 0; i < SYDNEY_ENVIRONMENT.ecology.castingBeds; i += 1) {
      const x = SYDNEY_YARD[0] + (i % 5) * 5.4 - 10;
      const z = SYDNEY_YARD[2] + Math.floor(i / 5) * 6.2 - 4;
      const ground = sydneyTerrainHeightAt(x, z);
      matrix.compose(new Vector3(x, ground + 0.28, z), quaternion, new Vector3(8.4, 0.55, 3.2));
      this.beds.setMatrixAt(i, matrix);
    }
    this.beds.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SYDNEY_ENVIRONMENT.ecology.tileStacks; i += 1) {
      const x = 22 + (i % 6) * 2.8;
      const z = 62 + Math.floor(i / 6) * 3.4;
      const ground = sydneyTerrainHeightAt(x, z);
      const h = 1.4 + (i % 4) * 0.55;
      matrix.compose(new Vector3(x, ground + h / 2, z), quaternion, new Vector3(2.2, h, 1.6));
      this.stacks.setMatrixAt(i, matrix);
    }
    this.stacks.instanceMatrix.needsUpdate = true;
  }

  update(t: number, light: LightState, _sky: SydneySkySample): void {
    const water = this.water.material as MeshStandardMaterial;
    water.emissive.setRGB(0.02 * light.emissive, 0.04 * light.emissive, 0.08 * light.emissive);
    const foam = this.foam.material as MeshStandardMaterial;
    foam.opacity = 0.26 + 0.12 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 24));
    this.glass.visible = t > 0.72;
    if (this.podiumKit) this.podiumKit.visible = t > 0.16;
    const glass = this.glass.material as MeshStandardMaterial;
    glass.emissive.setRGB(0.16 * light.emissive, 0.12 * light.emissive, 0.06 * light.emissive);
  }

  dispose(): void {
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.foam.dispose();
    this.figs.dispose();
    this.figTrunks.dispose();
    this.sheds.dispose();
    this.shedRoofs.dispose();
    this.offices.dispose();
    this.officeCrowns.dispose();
    this.terraces.dispose();
    this.terraceRoofs.dispose();
    this.beds.dispose();
    this.stacks.dispose();
    this.boats.dispose();
    this.boatCabins.dispose();
    this.boatMasts.dispose();
    this.glass.dispose();
  }
}
