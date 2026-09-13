import {
  BoxGeometry,
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
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { SYDNEY_ENVIRONMENT } from '../../data/sydneyEnvironment';
import { SYDNEY_YARD } from '../../data/sydneyConstruction';
import type { SydneySkySample } from '../../data/sydneySky';
import type { LightState } from '../../engine/daynight';
import { mulberry32 } from '../../engine/random';
import { sydneyPeninsulaShoreAt, sydneyTerrainHeightAt } from '../../engine/sydneyTerrain';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

export class SydneyEnvironment {
  readonly group = new Group();
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly water: Mesh;
  private readonly foam: InstancedMesh;
  private readonly figs: InstancedMesh;
  private readonly figTrunks: InstancedMesh;
  private readonly sheds: InstancedMesh;
  private readonly shedRoofs: InstancedMesh;
  private readonly beds: InstancedMesh;
  private readonly stacks: InstancedMesh;
  private boats!: InstancedMesh;
  private boatCabins!: InstancedMesh;
  private readonly glass: InstancedMesh;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'sydney-environment';
    const land = new MeshStandardMaterial({ color: '#b3a58c', roughness: 0.98, vertexColors: true });
    const foliage = new MeshStandardMaterial({ color: '#3d5a38', roughness: 0.94 });
    const timber = new MeshStandardMaterial({ color: '#8a6a48', roughness: 0.92 });
    const roof = new MeshStandardMaterial({ color: '#6a5040', roughness: 0.9 });
    const granite = new MeshStandardMaterial({ color: '#8a7a6a', roughness: 0.95 });
    const shore = new MeshStandardMaterial({ color: '#9a8a74', roughness: 0.97 });
    const tile = new MeshStandardMaterial({ color: '#efe6d6', roughness: 0.88 });
    const steel = new MeshStandardMaterial({ color: '#5a6570', roughness: 0.55, metalness: 0.35 });
    const foam = materials.whitewash.clone();
    foam.transparent = true;
    foam.opacity = 0.24;
    foam.depthWrite = false;
    materials.water.color.set('#3a7a9c');
    injectMaterialRecipe(land, 'compacted-earth');
    injectMaterialRecipe(foliage, 'foliage');
    injectMaterialRecipe(timber, 'wood');
    injectMaterialRecipe(granite, 'granite');
    injectMaterialRecipe(shore, 'compacted-earth');
    const glass = new MeshStandardMaterial({
      color: '#1a3a52',
      roughness: 0.12,
      metalness: 0.18,
      transparent: true,
      opacity: 0.55,
    });
    this.materials.push(land, foliage, timber, roof, granite, tile, steel, shore, foam, glass);

    this.group.add(this.createTerrain(land));
    this.group.add(this.createWater(materials.water));
    this.foam = this.createHarbourFoam(foam);
    this.group.add(this.foam);
    this.group.add(this.createBridge(steel));
    this.group.add(this.createWorkboats(timber, steel));
    this.glass = this.createGlass(glass);
    this.group.add(this.glass);

    const figGeom = new SphereGeometry(4.8, 8, 6);
    const trunkGeom = new CylinderGeometry(0.45, 0.7, 6.2, 6);
    const shedGeom = new BoxGeometry(1, 1, 1);
    const bedGeom = new BoxGeometry(1, 1, 1);
    this.geometries.push(figGeom, trunkGeom, shedGeom, bedGeom);
    this.figs = new InstancedMesh(figGeom, foliage, SYDNEY_ENVIRONMENT.ecology.figs);
    this.figTrunks = new InstancedMesh(trunkGeom, timber, SYDNEY_ENVIRONMENT.ecology.figs);
    this.sheds = new InstancedMesh(shedGeom, timber, SYDNEY_ENVIRONMENT.ecology.quaySheds);
    this.shedRoofs = new InstancedMesh(shedGeom, roof, SYDNEY_ENVIRONMENT.ecology.quaySheds);
    this.beds = new InstancedMesh(bedGeom, granite, SYDNEY_ENVIRONMENT.ecology.castingBeds);
    this.stacks = new InstancedMesh(bedGeom, tile, SYDNEY_ENVIRONMENT.ecology.tileStacks);
    this.placeScatter();
    for (const mesh of [this.figs, this.figTrunks, this.sheds, this.shedRoofs, this.beds, this.stacks]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.water = this.group.getObjectByName('sydney-harbour-water') as Mesh;
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
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = sydneyTerrainHeightAt(x, z);
      positions.setY(i, y);
      scratch.copy(sand).lerp(rock, Math.min(1, y / 3));
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
    const geometry = new CircleGeometry(640, 48);
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
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), seaward.yaw);
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

  private createBridge(steel: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'sydney-harbour-bridge';
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const deck = new Mesh(box, steel);
    deck.position.set(-268, 48, 18);
    deck.scale.set(38, 3.2, 164);
    deck.castShadow = true;
    group.add(deck);
    for (const z of [-52, 88] as const) {
      const pylon = new Mesh(box, steel);
      pylon.position.set(-268, 48, z);
      pylon.scale.set(16, 96, 14);
      pylon.castShadow = true;
      group.add(pylon);
    }
    const points: Vector3[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const u = i / 48;
      points.push(new Vector3(-268, 48 + Math.sin(u * Math.PI) * 54, -52 + u * 140));
    }
    const arch = new TubeGeometry(new CatmullRomCurve3(points), 64, 2.8, 8, false);
    this.geometries.push(arch);
    const archMesh = new Mesh(arch, steel);
    archMesh.name = 'sydney-harbour-bridge-arch';
    archMesh.castShadow = true;
    group.add(archMesh);
    const hangerGeom = new CylinderGeometry(0.45, 0.45, 1, 6);
    this.geometries.push(hangerGeom);
    for (let i = 4; i <= 44; i += 4) {
      const u = i / 48;
      const y = 48 + Math.sin(u * Math.PI) * 54;
      const z = -52 + u * 140;
      const hanger = new Mesh(hangerGeom, steel);
      hanger.position.set(-268, (y + 48) / 2, z);
      hanger.scale.set(1, Math.max(0.8, y - 48), 1);
      hanger.castShadow = true;
      group.add(hanger);
    }
    return group;
  }

  private createWorkboats(hull: MeshStandardMaterial, cabin: MeshStandardMaterial): Group {
    const group = new Group();
    group.name = 'sydney-harbour-workboats';
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    this.boats = new InstancedMesh(box, hull, 8);
    this.boatCabins = new InstancedMesh(box, cabin, 8);
    this.boats.name = 'sydney-harbour-hulls';
    this.boatCabins.name = 'sydney-harbour-cabins';
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const berths: Array<readonly [number, number, number]> = [
      [86, 0.7, -40],
      [102, 0.7, 12],
      [70, 0.7, 48],
      [-90, 0.7, 96],
      [48, 0.7, -72],
      [-120, 0.7, -88],
      [130, 0.7, -18],
      [-60, 0.7, 140],
    ];
    berths.forEach(([x, y, z], index) => {
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), index * 0.41);
      matrix.compose(new Vector3(x, y, z), quaternion, new Vector3(14, 1.4, 4.6));
      this.boats.setMatrixAt(index, matrix);
      matrix.compose(new Vector3(x, y + 1.6, z), quaternion, new Vector3(5.2, 2.2, 3.4));
      this.boatCabins.setMatrixAt(index, matrix);
    });
    this.boats.instanceMatrix.needsUpdate = true;
    this.boatCabins.instanceMatrix.needsUpdate = true;
    this.boats.castShadow = true;
    this.boatCabins.castShadow = true;
    group.add(this.boats, this.boatCabins);
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
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      matrix.compose(new Vector3(x, y, z), quaternion, new Vector3(w, h, d));
      glass.setMatrixAt(index, matrix);
    });
    glass.instanceMatrix.needsUpdate = true;
    glass.visible = false;
    return glass;
  }

  private placeScatter(): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const rand = mulberry32('sydney-environment-scatter');
    let figs = 0;
    let attempts = 0;
    while (figs < SYDNEY_ENVIRONMENT.ecology.figs && attempts < 400) {
      attempts += 1;
      const north = figs < 8;
      const x = north ? -80 + rand() * 160 : -70 + rand() * 150;
      const z = north ? -280 + rand() * 70 : 36 + rand() * 70;
      const ground = sydneyTerrainHeightAt(x, z);
      if (ground < 1.1) continue;
      const scale = 0.85 + rand() * 0.55;
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI * 2);
      matrix.compose(new Vector3(x, ground + 6.4 * scale, z), quaternion, new Vector3(scale, scale, scale));
      this.figs.setMatrixAt(figs, matrix);
      matrix.compose(new Vector3(x, ground + 3.1 * scale, z), quaternion, new Vector3(scale, scale, scale));
      this.figTrunks.setMatrixAt(figs, matrix);
      figs += 1;
    }
    this.figs.count = figs;
    this.figTrunks.count = figs;
    this.figs.instanceMatrix.needsUpdate = true;
    this.figTrunks.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SYDNEY_ENVIRONMENT.ecology.quaySheds; i += 1) {
      const x = -70 + i * 22 + (i % 2) * 4;
      const z = 118 + (i % 3) * 8;
      const ground = sydneyTerrainHeightAt(x, z);
      quaternion.identity();
      matrix.compose(new Vector3(x, ground + 4.2, z), quaternion, new Vector3(16, 8.4, 10));
      this.sheds.setMatrixAt(i, matrix);
      matrix.compose(new Vector3(x, ground + 8.7, z), quaternion, new Vector3(17.2, 1.1, 11.2));
      this.shedRoofs.setMatrixAt(i, matrix);
    }
    this.sheds.instanceMatrix.needsUpdate = true;
    this.shedRoofs.instanceMatrix.needsUpdate = true;

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
    const glass = this.glass.material as MeshStandardMaterial;
    glass.emissive.setRGB(0.16 * light.emissive, 0.12 * light.emissive, 0.06 * light.emissive);
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.foam.dispose();
    this.figs.dispose();
    this.figTrunks.dispose();
    this.sheds.dispose();
    this.shedRoofs.dispose();
    this.beds.dispose();
    this.stacks.dispose();
    this.boats.dispose();
    this.boatCabins.dispose();
    this.glass.dispose();
  }
}
