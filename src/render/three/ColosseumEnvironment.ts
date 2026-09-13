import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { COLOSSEUM_ENVIRONMENT } from '../../data/colosseumEnvironment';
import { COLOSSEUM_A, COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, COLOSSEUM_B, ellipsePoint } from '../../data/colosseumConstruction';
import type { ColosseumSkySample } from '../../data/colosseumSky';
import type { LightState } from '../../engine/daynight';
import { mulberry32 } from '../../engine/random';
import { colosseumLakeLevelAt, colosseumTerrainHeightAt } from '../../engine/colosseumTerrain';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

export class ColosseumEnvironment {
  readonly group = new Group();
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly lake: Mesh;
  private readonly tufts: InstancedMesh;
  private readonly pines: InstancedMesh;
  private readonly pineTrunks: InstancedMesh;
  private readonly insulae: InstancedMesh;
  private readonly insulaeRoofs: InstancedMesh;
  private readonly stocks: InstancedMesh;
  private readonly tubs: InstancedMesh;
  private readonly aqueduct: InstancedMesh;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'colosseum-environment';
    const dust = new MeshStandardMaterial({ color: '#c4a882', roughness: 0.98, vertexColors: true });
    const brick = new MeshStandardMaterial({ color: '#8a5e4a', roughness: 0.96 });
    const tile = new MeshStandardMaterial({ color: '#6e3f32', roughness: 0.92 });
    const pine = new MeshStandardMaterial({ color: '#3f5a38', roughness: 0.94 });
    materials.water.color.set('#5f8a8c');
    injectMaterialRecipe(dust, 'compacted-earth');
    injectMaterialRecipe(brick, 'mud-brick');
    injectMaterialRecipe(tile, 'mud-brick');
    injectMaterialRecipe(pine, 'foliage');
    this.materials.push(dust, brick, tile, pine);

    this.group.add(this.createTerrain(dust));
    this.group.add(this.createRoad());
    this.group.add(this.createHaulRing());
    this.group.add(this.createArena());
    this.group.add(this.createLakeScar());
    this.group.add(this.createTiber(materials.water));

    const lakeGeometry = new CircleGeometry(1, 40);
    lakeGeometry.rotateX(-Math.PI / 2);
    lakeGeometry.scale(COLOSSEUM_ARENA_A + 18, 1, COLOSSEUM_ARENA_B + 12);
    this.geometries.push(lakeGeometry);
    this.lake = new Mesh(lakeGeometry, materials.water);
    this.lake.name = 'colosseum-nero-lake';
    this.group.add(this.lake);

    const tuftGeometry = new ConeGeometry(0.85, 1.4, 5);
    const pineGeometry = new ConeGeometry(7.4, 5.2, 8);
    const trunkGeometry = new CylinderGeometry(0.42, 0.58, 8.4, 6);
    const houseGeometry = new BoxGeometry(1, 1, 1);
    const tubGeometry = new CylinderGeometry(0.85, 0.95, 0.7, 8);
    const pierGeometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(tuftGeometry, pineGeometry, trunkGeometry, houseGeometry, tubGeometry, pierGeometry);
    this.tufts = new InstancedMesh(tuftGeometry, pine, COLOSSEUM_ENVIRONMENT.ecology.tufts);
    this.pines = new InstancedMesh(pineGeometry, pine, COLOSSEUM_ENVIRONMENT.ecology.pines);
    this.pineTrunks = new InstancedMesh(trunkGeometry, materials.wood.clone(), COLOSSEUM_ENVIRONMENT.ecology.pines);
    this.insulae = new InstancedMesh(houseGeometry, brick, COLOSSEUM_ENVIRONMENT.ecology.insulae);
    this.insulaeRoofs = new InstancedMesh(houseGeometry, tile, COLOSSEUM_ENVIRONMENT.ecology.insulae);
    this.stocks = new InstancedMesh(houseGeometry, materials.wood.clone(), COLOSSEUM_ENVIRONMENT.site.timberStocks);
    this.tubs = new InstancedMesh(tubGeometry, brick, COLOSSEUM_ENVIRONMENT.site.mixingTubs);
    this.aqueduct = new InstancedMesh(pierGeometry, brick, COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers * 2);
    this.materials.push(
      this.stocks.material as MeshStandardMaterial,
      this.pineTrunks.material as MeshStandardMaterial,
    );
    this.placeScatter();
    for (const mesh of [this.tufts, this.pines, this.pineTrunks, this.insulae, this.insulaeRoofs, this.stocks, this.tubs, this.aqueduct]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  private createTerrain(material: MeshStandardMaterial): Mesh {
    const geometry = new PlaneGeometry(
      COLOSSEUM_ENVIRONMENT.terrain.radius * 2,
      COLOSSEUM_ENVIRONMENT.terrain.radius * 2,
      COLOSSEUM_ENVIRONMENT.terrain.segments,
      COLOSSEUM_ENVIRONMENT.terrain.segments,
    );
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position!;
    const colors = new Float32Array(positions.count * 3);
    const sand = new Color('#c4a882');
    const hill = new Color('#a88868');
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = colosseumTerrainHeightAt(x, z);
      positions.setY(i, y);
      scratch.copy(sand).lerp(hill, Math.min(1, y / 36));
      colors[i * 3] = scratch.r;
      colors[i * 3 + 1] = scratch.g;
      colors[i * 3 + 2] = scratch.b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'colosseum-valley-floor';
    mesh.receiveShadow = true;
    return mesh;
  }

  private createRoad(): Group {
    const group = new Group();
    group.name = 'colosseum-tivoli-road';
    const material = new MeshStandardMaterial({ color: '#b39470', roughness: 0.97 });
    injectMaterialRecipe(material, 'compacted-earth');
    this.materials.push(material);
    const geometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(geometry);
    for (let i = 0; i < 14; i += 1) {
      const x = 108 + i * 7.4;
      const z = 6.2;
      const y = colosseumTerrainHeightAt(x, z);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y + 0.08, z);
      mesh.scale.set(7.6, 0.16, 5.8);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (let i = 0; i < 8; i += 1) {
      const x = 172 - i * 4.2;
      const z = 10 - i * 0.5;
      const y = colosseumTerrainHeightAt(x, z);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y + 0.08, z);
      mesh.scale.set(4.6, 0.14, 4.2);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  private createHaulRing(): Group {
    const group = new Group();
    group.name = 'colosseum-outer-haul-ring';
    const material = new MeshStandardMaterial({ color: '#b39470', roughness: 0.97 });
    injectMaterialRecipe(material, 'compacted-earth');
    this.materials.push(material);
    const geometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(geometry);
    const segments = 36;
    for (let i = 0; i < segments; i += 1) {
      const theta = (i / segments) * Math.PI * 2;
      const [x, z] = ellipsePoint(COLOSSEUM_A + 22, COLOSSEUM_B + 18, theta);
      const next = ellipsePoint(COLOSSEUM_A + 22, COLOSSEUM_B + 18, theta + (Math.PI * 2) / segments);
      const dx = next[0] - x;
      const dz = next[1] - z;
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, colosseumTerrainHeightAt(x, z) + 0.07, z);
      mesh.scale.set(Math.hypot(dx, dz) * 1.15, 0.14, 6.4);
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  private createLakeScar(): Mesh {
    const geometry = new CircleGeometry(1, 36);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(COLOSSEUM_A + 6, 1, COLOSSEUM_B + 6);
    this.geometries.push(geometry);
    const material = new MeshStandardMaterial({ color: '#9a7a58', roughness: 0.99 });
    this.materials.push(material);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'colosseum-lake-scar';
    mesh.position.y = 0.03;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createTiber(water: MeshStandardMaterial): Mesh {
    const geometry = new PlaneGeometry(72, 360, 1, 16);
    geometry.rotateX(-Math.PI / 2);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, water);
    mesh.name = 'colosseum-tiber-glint';
    mesh.position.set(-268, colosseumTerrainHeightAt(-268, -24) + 0.5, -24);
    mesh.rotation.y = 0.42;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createArena(): Mesh {
    const geometry = new CircleGeometry(1, 32);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(COLOSSEUM_ARENA_A, 1, COLOSSEUM_ARENA_B);
    this.geometries.push(geometry);
    const material = new MeshStandardMaterial({ color: '#c9b289', roughness: 0.98 });
    this.materials.push(material);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'colosseum-arena-sand';
    mesh.position.y = 0.1;
    mesh.receiveShadow = true;
    return mesh;
  }

  private placeScatter(): void {
    const rand = mulberry32('colosseum-environment-scatter');
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    let tufts = 0;
    while (tufts < COLOSSEUM_ENVIRONMENT.ecology.tufts) {
      const x = (rand() - 0.5) * 560;
      const z = (rand() - 0.5) * 560;
      if (Math.hypot(x / COLOSSEUM_A, z / COLOSSEUM_B) < 1.18) continue;
      position.set(x, colosseumTerrainHeightAt(x, z) + 0.12, z);
      quaternion.identity();
      scale.set(1.6 + rand() * 1.8, 1.4 + rand() * 2.2, 1.6 + rand() * 1.8);
      matrix.compose(position, quaternion, scale);
      this.tufts.setMatrixAt(tufts, matrix);
      tufts += 1;
    }
    this.tufts.count = tufts;
    quaternion.identity();
    const pineGroves = [
      { cx: -260, cz: -90, spread: 48 },
      { cx: 40, cz: -280, spread: 44 },
      { cx: -40, cz: 250, spread: 40 },
    ] as const;
    let pines = 0;
    let pineAttempts = 0;
    while (pines < COLOSSEUM_ENVIRONMENT.ecology.pines && pineAttempts < 1400) {
      pineAttempts += 1;
      let x: number;
      let z: number;
      if (pines % 5 === 0) {
        const theta = rand() * Math.PI * 2;
        const ring = 158 + rand() * 42;
        x = Math.cos(theta) * ring;
        z = Math.sin(theta) * ring * 0.84;
      } else {
        const grove = pineGroves[pines % pineGroves.length]!;
        const angle = rand() * Math.PI * 2;
        const radius = 8 + rand() * grove.spread;
        x = grove.cx + Math.cos(angle) * radius;
        z = grove.cz + Math.sin(angle) * radius * 0.82;
      }
      if (Math.hypot(x / COLOSSEUM_A, z / COLOSSEUM_B) < 1.42) continue;
      const ground = colosseumTerrainHeightAt(x, z);
      const canopy = 2.4 + rand() * 1.4;
      scale.set(canopy, 1.15 + rand() * 0.55, canopy);
      position.set(x, ground + 8.4 + scale.y * 1.6, z);
      matrix.compose(position, quaternion, scale);
      this.pines.setMatrixAt(pines, matrix);
      position.set(x, ground + 4.2, z);
      scale.set(1.1 + rand() * 0.4, 1.05 + rand() * 0.25, 1.1 + rand() * 0.4);
      matrix.compose(position, quaternion, scale);
      this.pineTrunks.setMatrixAt(pines, matrix);
      pines += 1;
    }
    this.pines.count = pines;
    this.pineTrunks.count = pines;
    const hillBands = [
      { cx: -260, cz: -90 },
      { cx: 40, cz: -280 },
      { cx: -40, cz: 250 },
    ] as const;
    const insulaeCount = COLOSSEUM_ENVIRONMENT.ecology.insulae;
    let houses = 0;
    let houseAttempts = 0;
    while (houses < insulaeCount && houseAttempts < 1600) {
      houseAttempts += 1;
      const band = hillBands[houses % hillBands.length]!;
      const col = houses % 10;
      const row = Math.floor(houses / 10);
      const x = band.cx + (col - 4.5) * 7.8 + (rand() - 0.5) * 3.2;
      const z = band.cz + (row % 5 - 2) * 8.4 + (rand() - 0.5) * 3.4;
      if (Math.hypot(x / COLOSSEUM_A, z / COLOSSEUM_B) < 1.55) continue;
      const h = 7.4 + rand() * 6.2;
      const w = 4.4 + rand() * 2.2;
      const d = 3.8 + rand() * 1.8;
      const ground = colosseumTerrainHeightAt(x, z);
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), (rand() - 0.5) * 0.22);
      position.set(x, ground + h / 2, z);
      scale.set(w, h, d);
      matrix.compose(position, quaternion, scale);
      this.insulae.setMatrixAt(houses, matrix);
      position.set(x, ground + h + 0.55, z);
      scale.set(w * 1.12, 0.85, d * 1.12);
      matrix.compose(position, quaternion, scale);
      this.insulaeRoofs.setMatrixAt(houses, matrix);
      houses += 1;
    }
    this.insulae.count = houses;
    this.insulaeRoofs.count = houses;
    quaternion.setFromAxisAngle(new Vector3(0, 1, 0), 0.2);
    for (let i = 0; i < COLOSSEUM_ENVIRONMENT.site.timberStocks; i += 1) {
      const x = 102 + (i % 7) * 2.4;
      const z = -12 + Math.floor(i / 7) * 2.8;
      position.set(x, colosseumTerrainHeightAt(x, z) + 0.35, z);
      scale.set(2.2, 0.7, 0.35);
      matrix.compose(position, quaternion, scale);
      this.stocks.setMatrixAt(i, matrix);
    }
    this.stocks.count = COLOSSEUM_ENVIRONMENT.site.timberStocks;
    quaternion.identity();
    for (let i = 0; i < COLOSSEUM_ENVIRONMENT.site.mixingTubs; i += 1) {
      const x = 114 + (i % 4) * 2.8;
      const z = -6 + Math.floor(i / 4) * 3.1;
      position.set(x, colosseumTerrainHeightAt(x, z) + 0.36, z);
      scale.set(1, 1, 1);
      matrix.compose(position, quaternion, scale);
      this.tubs.setMatrixAt(i, matrix);
    }
    this.tubs.count = COLOSSEUM_ENVIRONMENT.site.mixingTubs;
    quaternion.identity();
    let aqueduct = 0;
    const piers = COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers;
    for (let i = 0; i < piers; i += 1) {
      const x = 248 + i * 11.4;
      const z = -62 + i * 7.6;
      const h = 22 + (i % 3) * 2.4;
      const ground = colosseumTerrainHeightAt(x, z);
      position.set(x, ground + h / 2, z);
      scale.set(5.2, h, 3.4);
      matrix.compose(position, quaternion, scale);
      this.aqueduct.setMatrixAt(aqueduct, matrix);
      aqueduct += 1;
      if (i + 1 < piers) {
        const nx = 248 + (i + 1) * 11.4;
        const nz = -62 + (i + 1) * 7.6;
        position.set((x + nx) / 2, ground + h * 0.84, (z + nz) / 2);
        scale.set(11.6, 3.4, 2.8);
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(nx - x, nz - z));
        matrix.compose(position, quaternion, scale);
        this.aqueduct.setMatrixAt(aqueduct, matrix);
        aqueduct += 1;
        quaternion.identity();
      }
    }
    this.aqueduct.count = aqueduct;
    this.tufts.instanceMatrix.needsUpdate = true;
    this.pines.instanceMatrix.needsUpdate = true;
    this.pineTrunks.instanceMatrix.needsUpdate = true;
    this.insulae.instanceMatrix.needsUpdate = true;
    this.insulaeRoofs.instanceMatrix.needsUpdate = true;
    this.stocks.instanceMatrix.needsUpdate = true;
    this.tubs.instanceMatrix.needsUpdate = true;
    this.aqueduct.instanceMatrix.needsUpdate = true;
  }

  update(t: number, _light: LightState, _sky: ColosseumSkySample): void {
    const lake = colosseumLakeLevelAt(t);
    this.lake.visible = lake > 0.02;
    this.lake.position.y = Math.max(0.05, lake * 0.42);
    this.lake.scale.setScalar(0.62 + lake * 0.38);
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.tufts.dispose();
    this.pines.dispose();
    this.pineTrunks.dispose();
    this.insulae.dispose();
    this.insulaeRoofs.dispose();
    this.stocks.dispose();
    this.tubs.dispose();
    this.aqueduct.dispose();
  }
}
