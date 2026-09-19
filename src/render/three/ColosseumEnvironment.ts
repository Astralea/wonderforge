import {
  BoxGeometry,
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
  Vector3,
  type BufferGeometry,
} from 'three';
import { COLOSSEUM_ENVIRONMENT } from '../../data/colosseumEnvironment';
import { COLOSSEUM_A, COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, COLOSSEUM_B, ellipsePoint } from '../../data/colosseumConstruction';
import type { ColosseumSkySample } from '../../data/colosseumSky';
import type { LightState } from '../../engine/daynight';
import { colosseumRomeLotsOf } from '../../engine/colosseumRomeLots';
import { mulberry32 } from '../../engine/random';
import { colosseumLakeScarWeight, colosseumTerrainHeightAt, COLOSSEUM_HILLS } from '../../engine/colosseumTerrain';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';
import { createColosseumPartGeometry } from './ColosseumStoneSystem';
import {
  createProceduralCypress,
  createProceduralInsulaBrick,
  createProceduralInsulaRoof,
  createProceduralPalaceBrick,
  createProceduralPalaceRoof,
  createProceduralPineCrown,
  createProceduralPineTrunk,
  flattenRomeRole,
  flattenRomeRoles,
  loadColosseumRomeKit,
  lotMatrix,
} from './colosseumRome';

export class ColosseumEnvironment {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private disposed = false;
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly tufts: InstancedMesh;
  private readonly pines: InstancedMesh;
  private readonly pineTrunks: InstancedMesh;
  private readonly cypress: InstancedMesh;
  private readonly insulae: InstancedMesh;
  private readonly insulaeRoofs: InstancedMesh;
  private readonly farBlocks: InstancedMesh;
  private readonly palaceRoofs: InstancedMesh;
  private readonly stocks: InstancedMesh;
  private readonly tubs: InstancedMesh;
  private readonly aqueductPiers: InstancedMesh;
  private readonly aqueductArches: InstancedMesh;
  private readonly arenaSand: Mesh;
  private readonly haulRing: Group;
  private readonly tivoliRoad: Group;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'colosseum-environment';
    const dust = new MeshStandardMaterial({ color: '#c4a882', roughness: 0.98, vertexColors: true });
    const brick = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, vertexColors: true });
    const farBrick = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, vertexColors: true });
    const tile = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, vertexColors: true });
    const canopy = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, vertexColors: true });
    const cypressMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, vertexColors: true });
    const tuftMat = new MeshStandardMaterial({ color: '#3d5c36', roughness: 0.9 });
    const siteBrick = new MeshStandardMaterial({ color: '#8a5e4a', roughness: 0.92 });
    injectMaterialRecipe(dust, 'compacted-earth');
    injectMaterialRecipe(brick, 'mud-brick');
    injectMaterialRecipe(farBrick, 'mud-brick');
    injectMaterialRecipe(tile, 'mud-brick');
    injectMaterialRecipe(canopy, 'foliage');
    injectMaterialRecipe(cypressMat, 'foliage');
    injectMaterialRecipe(tuftMat, 'foliage');
    injectMaterialRecipe(siteBrick, 'mud-brick');
    this.materials.push(dust, brick, farBrick, tile, canopy, cypressMat, tuftMat, siteBrick);

    this.group.add(this.createTerrain(dust));
    this.tivoliRoad = this.createRoad();
    this.tivoliRoad.visible = false;
    this.group.add(this.tivoliRoad);
    this.haulRing = this.createHaulRing();
    this.haulRing.visible = false;
    this.group.add(this.haulRing);
    this.arenaSand = this.createArena();
    this.arenaSand.visible = false;
    this.group.add(this.arenaSand);
    this.group.add(this.createLakeScar());

    const tuftGeometry = new SphereGeometry(0.7, 5, 4);
    const pineGeometry = createProceduralPineCrown();
    const trunkGeometry = createProceduralPineTrunk();
    const cypressGeometry = createProceduralCypress();
    const houseGeometry = createProceduralInsulaBrick();
    const roofGeometry = createProceduralInsulaRoof();
    const palaceGeometry = createProceduralPalaceBrick();
    const palaceRoofGeometry = createProceduralPalaceRoof();
    const stockGeometry = new BoxGeometry(1, 1, 1);
    const tubGeometry = new CylinderGeometry(0.85, 0.95, 0.7, 8);
    const pierGeometry = new BoxGeometry(1, 1, 1);
    const archGeometry = createColosseumPartGeometry('arch');
    this.geometries.push(
      tuftGeometry,
      pineGeometry,
      trunkGeometry,
      cypressGeometry,
      houseGeometry,
      roofGeometry,
      palaceGeometry,
      palaceRoofGeometry,
      stockGeometry,
      tubGeometry,
      pierGeometry,
      archGeometry,
    );
    const insulae = colosseumRomeLotsOf('insula');
    const palaces = colosseumRomeLotsOf('palace');
    const pines = colosseumRomeLotsOf('pine');
    const cypress = colosseumRomeLotsOf('cypress');
    this.tufts = new InstancedMesh(tuftGeometry, tuftMat, COLOSSEUM_ENVIRONMENT.ecology.tufts);
    this.pines = new InstancedMesh(pineGeometry, canopy, Math.max(pines.length, COLOSSEUM_ENVIRONMENT.ecology.pines));
    this.pines.name = 'colosseum-umbrella-pines';
    this.pineTrunks = new InstancedMesh(
      trunkGeometry,
      materials.wood.clone(),
      Math.max(pines.length, COLOSSEUM_ENVIRONMENT.ecology.pines),
    );
    this.cypress = new InstancedMesh(
      cypressGeometry,
      cypressMat,
      Math.max(cypress.length, COLOSSEUM_ENVIRONMENT.ecology.cypress),
    );
    this.cypress.name = 'colosseum-cypress';
    this.insulae = new InstancedMesh(houseGeometry, brick, Math.max(insulae.length, COLOSSEUM_ENVIRONMENT.ecology.insulae));
    this.insulae.name = 'colosseum-insulae';
    this.insulaeRoofs = new InstancedMesh(
      roofGeometry,
      tile,
      Math.max(insulae.length, COLOSSEUM_ENVIRONMENT.ecology.insulae),
    );
    this.insulaeRoofs.name = 'colosseum-insulae-roofs';
    this.farBlocks = new InstancedMesh(
      palaceGeometry,
      farBrick,
      Math.max(palaces.length, COLOSSEUM_ENVIRONMENT.ecology.farBlocks),
    );
    this.farBlocks.name = 'colosseum-far-fabric';
    this.palaceRoofs = new InstancedMesh(
      palaceRoofGeometry,
      tile,
      Math.max(palaces.length, COLOSSEUM_ENVIRONMENT.ecology.farBlocks),
    );
    this.palaceRoofs.name = 'colosseum-palace-roofs';
    this.stocks = new InstancedMesh(stockGeometry, materials.wood.clone(), COLOSSEUM_ENVIRONMENT.site.timberStocks);
    this.tubs = new InstancedMesh(tubGeometry, siteBrick, COLOSSEUM_ENVIRONMENT.site.mixingTubs);
    this.aqueductPiers = new InstancedMesh(pierGeometry, siteBrick, COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers);
    this.aqueductPiers.name = 'colosseum-aqueduct-piers';
    this.aqueductArches = new InstancedMesh(
      archGeometry,
      siteBrick,
      Math.max(0, COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers - 1),
    );
    this.aqueductArches.name = 'colosseum-aqueduct-arches';
    this.materials.push(
      this.stocks.material as MeshStandardMaterial,
      this.pineTrunks.material as MeshStandardMaterial,
    );
    this.placeScatter();
    this.stocks.visible = false;
    this.tubs.visible = false;
    for (const mesh of [
      this.tufts,
      this.pines,
      this.pineTrunks,
      this.cypress,
      this.insulae,
      this.insulaeRoofs,
      this.farBlocks,
      this.palaceRoofs,
      this.stocks,
      this.tubs,
      this.aqueductPiers,
      this.aqueductArches,
    ]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.ready = this.upgradeRomeKit();
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
    const silt = new Color('#8a6a4c');
    const olive = new Color('#4f6a3c');
    const scrub = new Color('#3f5a32');
    const clay = new Color('#7d6248');
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = colosseumTerrainHeightAt(x, z);
      positions.setY(i, y);
      const scar = colosseumLakeScarWeight(x, z);
      const mottling = (Math.sin(x * 0.053) * Math.sin(z * 0.041) + 1) * 0.5;
      let hillness = 0;
      for (const hill of COLOSSEUM_HILLS) {
        const dx = x - hill.x;
        const dz = z - hill.z;
        hillness += Math.exp(-(dx * dx + dz * dz) / (2 * hill.sigma * hill.sigma));
      }
      hillness = Math.min(1, hillness);
      scratch.copy(sand).lerp(silt, scar);
      scratch.lerp(olive, hillness * (1 - scar) * 0.98);
      scratch.lerp(scrub, hillness * (0.35 + mottling * 0.4) * (1 - scar));
      scratch.lerp(clay, mottling * 0.12 * (1 - scar) * (1 - hillness));
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
    const material = new MeshStandardMaterial({ color: '#8a6d4e', roughness: 0.98 });
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
      mesh.scale.set(Math.hypot(dx, dz) * 1.12, 0.1, 3.4);
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  private createLakeScar(): Mesh {
    const geometry = new CircleGeometry(1, 48);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(COLOSSEUM_A + 8, 1, COLOSSEUM_B + 8);
    const positions = geometry.attributes.position!;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(i, colosseumTerrainHeightAt(x, z) + 0.05);
    }
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const material = new MeshStandardMaterial({ color: '#7d5f42', roughness: 0.99 });
    this.materials.push(material);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'colosseum-lake-scar';
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
    const axis = new Vector3(0, 1, 0);
    let tufts = 0;
    let tuftAttempts = 0;
    while (tufts < COLOSSEUM_ENVIRONMENT.ecology.tufts && tuftAttempts < COLOSSEUM_ENVIRONMENT.ecology.tufts * 24) {
      tuftAttempts += 1;
      const hill = COLOSSEUM_HILLS[tufts % COLOSSEUM_HILLS.length]!;
      const angle = rand() * Math.PI * 2;
      const radius = hill.sigma * (0.2 + rand() * 0.95);
      const x = hill.x + Math.cos(angle) * radius;
      const z = hill.z + Math.sin(angle) * radius * 0.84;
      if (Math.hypot(x / COLOSSEUM_A, z / COLOSSEUM_B) < 1.18) continue;
      const ground = colosseumTerrainHeightAt(x, z);
      if (ground < 2.4) continue;
      position.set(x, ground + 0.18, z);
      quaternion.identity();
      scale.set(1.1 + rand() * 1.4, 0.4 + rand() * 0.5, 1.1 + rand() * 1.4);
      matrix.compose(position, quaternion, scale);
      this.tufts.setMatrixAt(tufts, matrix);
      tufts += 1;
    }
    this.tufts.count = tufts;
    this.placeRomeLots();
    quaternion.setFromAxisAngle(axis, 0.2);
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
    const piers = COLOSSEUM_ENVIRONMENT.ecology.aqueductPiers;
    for (let i = 0; i < piers; i += 1) {
      // South-east of the oval, along the Caelian — not in the north
      // opening shot's foreground (camera sits near +Z at ~330 m).
      const x = 140 + i * 14;
      const z = -260 - i * 6;
      const h = 18 + (i % 3) * 2.2;
      const ground = colosseumTerrainHeightAt(x, z);
      position.set(x, ground + h / 2, z);
      scale.set(4.6, h, 3.2);
      matrix.compose(position, quaternion, scale);
      this.aqueductPiers.setMatrixAt(i, matrix);
      if (i + 1 < piers) {
        const nx = 140 + (i + 1) * 14;
        const nz = -260 - (i + 1) * 6;
        const span = Math.hypot(nx - x, nz - z);
        quaternion.setFromAxisAngle(axis, Math.atan2(nx - x, nz - z));
        position.set((x + nx) / 2, ground + h * 0.62, (z + nz) / 2);
        scale.set(span * 0.92, h * 0.52, 2.6);
        matrix.compose(position, quaternion, scale);
        this.aqueductArches.setMatrixAt(i, matrix);
        quaternion.identity();
      }
    }
    this.aqueductPiers.count = piers;
    this.aqueductArches.count = Math.max(0, piers - 1);
    this.tufts.instanceMatrix.needsUpdate = true;
    this.pines.instanceMatrix.needsUpdate = true;
    this.pineTrunks.instanceMatrix.needsUpdate = true;
    this.cypress.instanceMatrix.needsUpdate = true;
    this.insulae.instanceMatrix.needsUpdate = true;
    this.insulaeRoofs.instanceMatrix.needsUpdate = true;
    this.farBlocks.instanceMatrix.needsUpdate = true;
    this.palaceRoofs.instanceMatrix.needsUpdate = true;
    this.stocks.instanceMatrix.needsUpdate = true;
    this.tubs.instanceMatrix.needsUpdate = true;
    this.aqueductPiers.instanceMatrix.needsUpdate = true;
    this.aqueductArches.instanceMatrix.needsUpdate = true;
  }

  private placeRomeLots(): void {
    const brickTone = new Color('#d8c4b4');
    const tileTone = new Color('#7a3a28');
    let houses = 0;
    for (const lot of colosseumRomeLotsOf('insula')) {
      const ground = colosseumTerrainHeightAt(lot.x, lot.z);
      const matrix = lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale);
      this.insulae.setMatrixAt(houses, matrix);
      this.insulaeRoofs.setMatrixAt(houses, matrix);
      brickTone.setHSL(
        0.05 + (houses % 7) * 0.012,
        0.22 + (houses % 4) * 0.08,
        0.3 + (houses % 5) * 0.07 + (lot.scale % 0.5) * 0.08,
      );
      tileTone.setHSL(0.02 + (houses % 5) * 0.012, 0.55, 0.22 + (houses % 4) * 0.08);
      this.insulae.setColorAt(houses, brickTone);
      this.insulaeRoofs.setColorAt(houses, tileTone);
      houses += 1;
    }
    this.insulae.count = houses;
    this.insulaeRoofs.count = houses;
    if (this.insulae.instanceColor) this.insulae.instanceColor.needsUpdate = true;
    if (this.insulaeRoofs.instanceColor) this.insulaeRoofs.instanceColor.needsUpdate = true;
    let palaces = 0;
    for (const lot of colosseumRomeLotsOf('palace')) {
      const ground = colosseumTerrainHeightAt(lot.x, lot.z);
      const matrix = lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale);
      this.farBlocks.setMatrixAt(palaces, matrix);
      this.palaceRoofs.setMatrixAt(palaces, matrix);
      palaces += 1;
    }
    this.farBlocks.count = palaces;
    this.palaceRoofs.count = palaces;
    let pines = 0;
    for (const lot of colosseumRomeLotsOf('pine')) {
      const ground = colosseumTerrainHeightAt(lot.x, lot.z);
      const matrix = lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale);
      this.pines.setMatrixAt(pines, matrix);
      this.pineTrunks.setMatrixAt(pines, matrix);
      pines += 1;
    }
    this.pines.count = pines;
    this.pineTrunks.count = pines;
    let cypress = 0;
    for (const lot of colosseumRomeLotsOf('cypress')) {
      const ground = colosseumTerrainHeightAt(lot.x, lot.z);
      this.cypress.setMatrixAt(cypress, lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale));
      cypress += 1;
    }
    this.cypress.count = cypress;
  }

  private adoptGeometry(mesh: InstancedMesh, next: BufferGeometry | null): void {
    if (!next || this.disposed) {
      next?.dispose();
      return;
    }
    const previous = mesh.geometry;
    mesh.geometry = next;
    const index = this.geometries.indexOf(previous);
    if (index >= 0) this.geometries.splice(index, 1);
    previous.dispose();
    this.geometries.push(next);
  }

  private async upgradeRomeKit(): Promise<void> {
    try {
      const kit = await loadColosseumRomeKit();
      if (this.disposed) return;
      this.adoptGeometry(this.insulae, flattenRomeRoles(kit.insula, ['brick', 'void', 'stone']));
      this.adoptGeometry(this.insulaeRoofs, flattenRomeRole(kit.insula, 'tile'));
      this.adoptGeometry(this.farBlocks, flattenRomeRoles(kit.palace, ['brick', 'void', 'stone']));
      this.adoptGeometry(this.palaceRoofs, flattenRomeRole(kit.palace, 'tile'));
      this.adoptGeometry(this.pines, flattenRomeRole(kit.pine, 'foliage'));
      this.adoptGeometry(this.pineTrunks, flattenRomeRole(kit.pine, 'timber'));
      this.adoptGeometry(this.cypress, flattenRomeRoles(kit.cypress, ['foliage', 'timber']));
    } catch {
      /* Procedural hip-roof kit already instances the lots. */
    }
  }

  update(t: number, _light: LightState, _sky: ColosseumSkySample): void {
    const siteOpen = t >= 0.11;
    this.tivoliRoad.visible = siteOpen;
    this.haulRing.visible = false;
    this.stocks.visible = siteOpen;
    this.tubs.visible = siteOpen;
    this.arenaSand.visible = t >= 0.76;
  }

  dispose(): void {
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.tufts.dispose();
    this.pines.dispose();
    this.pineTrunks.dispose();
    this.cypress.dispose();
    this.insulae.dispose();
    this.insulaeRoofs.dispose();
    this.farBlocks.dispose();
    this.palaceRoofs.dispose();
    this.stocks.dispose();
    this.tubs.dispose();
    this.aqueductPiers.dispose();
    this.aqueductArches.dispose();
  }
}
