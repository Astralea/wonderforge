import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ConeGeometry,
  DoubleSide,
  IcosahedronGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Frustum,
  Sphere,
  type Camera,
  type Object3D,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';
import { COLOSSEUM_ENVIRONMENT } from '../../data/colosseumEnvironment';
import { COLOSSEUM_A, COLOSSEUM_ARENA_A, COLOSSEUM_ARENA_B, COLOSSEUM_B, ellipsePoint } from '../../data/colosseumConstruction';
import type { ColosseumSkySample } from '../../data/colosseumSky';
import type { LightState } from '../../engine/daynight';
import { colosseumRomeLotsOf, romeHousingFoundation } from '../../engine/colosseumRomeLots';
import { COLOSSEUM_HOUSING, type ColosseumHousingId } from '../../data/colosseumHousing';
import { mulberry32 } from '../../engine/random';
import { colosseumLakeScarWeight, colosseumTerrainHeightAt, colosseumWesternReliefAt, COLOSSEUM_HILLS } from '../../engine/colosseumTerrain';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';
import { ColosseumAqueduct } from './ColosseumAqueduct';
import { ColosseumUrbanContext } from './ColosseumUrbanContext';
import {
  createProceduralCypress,
  createProceduralHousing,
  compactHousingBody,
  createProceduralPalaceBrick,
  createProceduralPalaceRoof,
  createProceduralPineCrown,
  createProceduralPineTrunk,
  flattenRomeRole,
  flattenRomeRoles,
  loadColosseumRomeKit,
  loadColosseumHousingKit,
  lotMatrix,
  colorGeometry,
  ROME_ROLE_COLOR,
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
  private readonly housingBatches: Array<{ id: ColosseumHousingId; body: InstancedMesh; roof: InstancedMesh }> = [];
  private readonly housingFoundations: InstancedMesh;
  private readonly farBlocks: InstancedMesh;
  private readonly palaceRoofs: InstancedMesh;
  private readonly stocks: InstancedMesh;
  private readonly tubs: InstancedMesh;
  private readonly aqueduct: ColosseumAqueduct;
  private readonly urbanContext: ColosseumUrbanContext;
  private readonly arenaSand: Mesh;
  private readonly haulRing: Group;
  private readonly tivoliRoad: Group;
  private readonly cityDetail: Array<{mesh: InstancedMesh; full: BufferGeometry; compact: BufferGeometry}> = [];
  private compactCity = false;
  private readonly cityBatches: Array<{ mesh: InstancedMesh; matrices: Matrix4[]; colors: Color[] }> = [];
  private readonly cityFrustum = new Frustum();
  private readonly cityProjection = new Matrix4();
  private readonly cityLastProjection = new Matrix4().makeScale(0, 0, 0);
  private readonly citySphere = new Sphere();

  constructor(materials: MaterialLibrary) {
    this.group.name = 'colosseum-environment';
    const dust = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.98, vertexColors: true });
    const brick = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, vertexColors: true });
    const farBrick = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, vertexColors: true });
    const tile = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, vertexColors: true });
    const canopy = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, vertexColors: true });
    const cypressMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, vertexColors: true });
    const tuftMat = new MeshStandardMaterial({ color: '#62794d', roughness: 0.9, side: DoubleSide });
    const foundationMaterial = new MeshStandardMaterial({ color: '#a69d87', roughness: .98 });
    this.materials.push(foundationMaterial);
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

    // Three narrow grass blades, not costly distant faceted balls.
    const tuftGeometry = new BufferGeometry();
    const blades: number[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI / 3, dx = Math.cos(angle) * .52, dz = Math.sin(angle) * .52;
      blades.push(-dx, 0, -dz, dx, 0, dz, dx * .25, 1.1 - i * .12, dz * .25);
    }
    tuftGeometry.setAttribute('position', new Float32BufferAttribute(blades, 3));
    tuftGeometry.computeVertexNormals();
    const pineGeometry = createProceduralPineCrown();
    const trunkGeometry = createProceduralPineTrunk();
    const cypressGeometry = createProceduralCypress();
    const palaceGeometry = createProceduralPalaceBrick();
    const palaceRoofGeometry = createProceduralPalaceRoof();
    const stockGeometry = new BoxGeometry(1, 1, 1);
    const tubGeometry = new CylinderGeometry(0.85, 0.95, 0.7, 8);
    this.geometries.push(
      tuftGeometry,
      pineGeometry,
      trunkGeometry,
      cypressGeometry,
      palaceGeometry,
      palaceRoofGeometry,
      stockGeometry,
      tubGeometry,
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
    for (const [mesh, kind] of [[this.pines, 'pine'], [this.cypress, 'cypress'], [this.pineTrunks, 'trunk']] as const) {
      const compact = this.compactTreeGeometry(mesh.geometry, kind);
      this.geometries.push(compact);
      this.cityDetail.push({ mesh, full: mesh.geometry, compact });
    }
    for (const [index, profile] of COLOSSEUM_HOUSING.entries()) {
      const bodyGeometry = createProceduralHousing(profile.id, 'body');
      const roofGeometry = createProceduralHousing(profile.id, 'roof');
      this.geometries.push(bodyGeometry, roofGeometry);
      const count = insulae.filter(lot => (lot.housing ?? 'courtyard') === profile.id).length;
      const body = new InstancedMesh(bodyGeometry, brick, count);
      const roof = new InstancedMesh(roofGeometry, tile, count);
      body.name = index === 0 ? 'colosseum-insulae' : `colosseum-housing-${profile.id}`;
      roof.name = index === 0 ? 'colosseum-insulae-roofs' : `colosseum-housing-${profile.id}-roofs`;
      body.userData.housingVariant = profile.id;
      roof.userData.housingVariant = profile.id;
      this.housingBatches.push({ id: profile.id, body, roof });
      const compact = compactHousingBody(createProceduralHousing(profile.id, 'body', 'compact'));
      this.geometries.push(compact);
      this.cityDetail.push({ mesh: body, full: bodyGeometry, compact });
    }
    const foundationGeometry = new BoxGeometry(1, 1, 1);
    // Retaining bases are buried; their underside is never a visible surface.
    const foundationIndices: number[] = [];
    for (let i=0; i<foundationGeometry.index!.count; i+=3) {
      const a=foundationGeometry.index!.getX(i);
      if (foundationGeometry.getAttribute('normal').getY(a)<-.9) continue;
      for (let j=0;j<3;j++) foundationIndices.push(foundationGeometry.index!.getX(i+j));
    }
    foundationGeometry.setIndex(foundationIndices);
    this.geometries.push(foundationGeometry);
    this.housingFoundations = new InstancedMesh(foundationGeometry, foundationMaterial, insulae.length + palaces.length);
    this.housingFoundations.name = 'colosseum-housing-foundations';
    this.farBlocks = new InstancedMesh(
      palaceGeometry,
      farBrick,
      Math.max(palaces.length, COLOSSEUM_ENVIRONMENT.ecology.farBlocks),
    );
    this.farBlocks.name = 'colosseum-far-fabric';
    const compactPalace = compactHousingBody(palaceGeometry.clone());
    this.geometries.push(compactPalace);
    this.cityDetail.push({ mesh: this.farBlocks, full: palaceGeometry, compact: compactPalace });
    this.palaceRoofs = new InstancedMesh(
      palaceRoofGeometry,
      tile,
      Math.max(palaces.length, COLOSSEUM_ENVIRONMENT.ecology.farBlocks),
    );
    this.palaceRoofs.name = 'colosseum-palace-roofs';
    this.stocks = new InstancedMesh(stockGeometry, materials.wood.clone(), COLOSSEUM_ENVIRONMENT.site.timberStocks);
    this.tubs = new InstancedMesh(tubGeometry, siteBrick, COLOSSEUM_ENVIRONMENT.site.mixingTubs);
    this.aqueduct = new ColosseumAqueduct();
    this.group.add(this.aqueduct.group);
    this.urbanContext = new ColosseumUrbanContext();
    this.group.add(this.urbanContext.group);
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
      ...this.housingBatches.flatMap(batch => [batch.body, batch.roof]),
      this.housingFoundations,
      this.farBlocks,
      this.palaceRoofs,
      this.stocks,
      this.tubs,
    ]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    for (const mesh of [...this.housingBatches.flatMap(batch => [batch.body, batch.roof]), this.housingFoundations, this.farBlocks, this.palaceRoofs, this.pines, this.pineTrunks, this.cypress, this.tufts]) {
      // Remote streets and groves keep their lit shape and receive shadows;
      // they do not duplicate hundreds of thousands of vertices in the sun map.
      mesh.castShadow = false;
      const matrices: Matrix4[] = [], colors: Color[] = [];
      for (let i = 0; i < mesh.count; i++) {
        const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix); matrices.push(matrix);
        if (mesh.instanceColor) { const color = new Color(); mesh.getColorAt(i, color); colors.push(color); }
      }
      this.cityBatches.push({ mesh, matrices, colors });
    }
    this.stocks.castShadow = false;
    this.ready = Promise.all([this.upgradeRomeKit(), this.upgradeHousingKit(), this.aqueduct.ready]).then(() => {});
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
    const sand = new Color('#beb59c');
    const silt = new Color('#999181');
    const olive = new Color('#79866a');
    const scrub = new Color('#60775c');
    const clay = new Color('#a5977c');
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      // Spend terrain vertices near the valley and hills, not in the flat fog.
      const radius = COLOSSEUM_ENVIRONMENT.terrain.radius;
      const focus = (value: number) => Math.sign(value) * radius * (Math.abs(value) / radius) ** 1.65;
      const x = focus(positions.getX(i));
      const z = focus(positions.getZ(i));
      positions.setX(i, x); positions.setZ(i, z);
      const y = colosseumTerrainHeightAt(x, z);
      positions.setY(i, y);
      const scar = colosseumLakeScarWeight(x, z);
      const mottling = (Math.sin(x * 0.053) * Math.sin(z * 0.041) + 1) * 0.5;
      let hillness = colosseumWesternReliefAt(x, z) / 36;
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
      // Spend terrain vertices near the valley and hills, not in the flat fog.
      const radius = COLOSSEUM_ENVIRONMENT.terrain.radius;
      const focus = (value: number) => Math.sign(value) * radius * (Math.abs(value) / radius) ** 1.65;
      const x = focus(positions.getX(i));
      const z = focus(positions.getZ(i));
      positions.setX(i, x); positions.setZ(i, z);
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
    this.tufts.instanceMatrix.needsUpdate = true;
    this.pines.instanceMatrix.needsUpdate = true;
    this.pineTrunks.instanceMatrix.needsUpdate = true;
    this.cypress.instanceMatrix.needsUpdate = true;
    for (const batch of this.housingBatches) {
      batch.body.instanceMatrix.needsUpdate = true;
      batch.roof.instanceMatrix.needsUpdate = true;
    }
    this.housingFoundations.instanceMatrix.needsUpdate = true;
    this.farBlocks.instanceMatrix.needsUpdate = true;
    this.palaceRoofs.instanceMatrix.needsUpdate = true;
    this.stocks.instanceMatrix.needsUpdate = true;
    this.tubs.instanceMatrix.needsUpdate = true;
  }

  private placeRomeLots(): void {
    const brickTone = new Color();
    const tileTone = new Color();
    const counts = new Map<ColosseumHousingId, number>();
    const plasterTints = ['#eee7d9', '#d9d3c4', '#f3eddf', '#e5d9c5', '#d0cfc3'];
    const roofTints = ['#eee2d5', '#dac3b0', '#ecd1b9', '#e0d6cb'];
    let foundations = 0;
    const placeFoundation = (lot: ReturnType<typeof colosseumRomeLotsOf>[number]) => {
      const support = romeHousingFoundation(lot);
      if (lot.district !== 'caelian-watercourse') {
        const matrix = new Matrix4().compose(
          new Vector3(lot.x, (support.top + support.bottom) / 2, lot.z),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), lot.yaw),
          new Vector3(support.half[0] * 2, support.top - support.bottom, support.half[1] * 2),
        );
        this.housingFoundations.setMatrixAt(foundations++, matrix);
      }
      return support.top;
    };
    let streetIndex = 0;
    for (const lot of colosseumRomeLotsOf('insula')) {
      const id = lot.housing ?? 'courtyard';
      const batch = this.housingBatches.find(item => item.id === id)!;
      const index = counts.get(id) ?? 0;
      const matrix = lotMatrix(lot.x, placeFoundation(lot), lot.z, lot.yaw, lot.scale);
      batch.body.setMatrixAt(index, matrix);
      batch.roof.setMatrixAt(index, matrix);
      // Geometry already carries brick/plaster/tile albedo. These are small
      // weathering differences, not the former second dark material layer.
      brickTone.set(plasterTints[streetIndex % plasterTints.length]!);
      tileTone.set(roofTints[(streetIndex * 3) % roofTints.length]!);
      batch.body.setColorAt(index, brickTone);
      batch.roof.setColorAt(index, tileTone);
      counts.set(id, index + 1); streetIndex++;
    }
    for (const batch of this.housingBatches) {
      batch.body.count = counts.get(batch.id) ?? 0;
      batch.roof.count = batch.body.count;
      if (batch.body.instanceColor) batch.body.instanceColor.needsUpdate = true;
      if (batch.roof.instanceColor) batch.roof.instanceColor.needsUpdate = true;
    }
    let palaces = 0;
    for (const lot of colosseumRomeLotsOf('palace')) {
      const ground = placeFoundation(lot);
      const matrix = lotMatrix(lot.x, ground, lot.z, lot.yaw, lot.scale);
      this.farBlocks.setMatrixAt(palaces, matrix);
      this.palaceRoofs.setMatrixAt(palaces, matrix);
      palaces += 1;
    }
    this.farBlocks.count = palaces;
    this.palaceRoofs.count = palaces;
    this.housingFoundations.count = foundations;
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

  private compactTreeGeometry(source: BufferGeometry, kind: 'pine' | 'cypress' | 'trunk'): BufferGeometry {
    const compact = kind === 'pine' ? new IcosahedronGeometry(1, 0) : kind === 'trunk' ? new BoxGeometry(1, 1, 1) : new ConeGeometry(1, 2, 5);
    source.computeBoundingBox(); compact.computeBoundingBox();
    const from = compact.boundingBox!, to = source.boundingBox!;
    const fs = from.getSize(new Vector3()), ts = to.getSize(new Vector3());
    const center = to.getCenter(new Vector3());
    compact.translate(...from.getCenter(new Vector3()).negate().toArray() as [number,number,number]);
    compact.scale(ts.x/fs.x, ts.y/fs.y, ts.z/fs.z).translate(center.x,center.y,center.z);
    return colorGeometry(compact, kind === 'trunk' ? ROME_ROLE_COLOR.timber : ROME_ROLE_COLOR.foliage);
  }

  private adoptGeometry(mesh: InstancedMesh, next: BufferGeometry | null, compact?: BufferGeometry | null): void {
    if (!next || this.disposed) { next?.dispose(); compact?.dispose(); return; }
    const tier = this.cityDetail.find(item => item.mesh === mesh);
    const previous = tier?.full ?? mesh.geometry;
    if (tier) {
      tier.full = next;
      const replacement = compact ?? ((mesh === this.pines || mesh === this.cypress || mesh === this.pineTrunks)
        ? this.compactTreeGeometry(next, mesh === this.pines ? 'pine' : mesh === this.cypress ? 'cypress' : 'trunk') : null);
      if (replacement) {
        const index = this.geometries.indexOf(tier.compact);
        if (index >= 0) this.geometries.splice(index, 1);
        tier.compact.dispose(); tier.compact = replacement; this.geometries.push(replacement);
      }
    }
    mesh.geometry = tier && this.compactCity ? tier.compact : next;
    this.cityLastProjection.makeScale(0, 0, 0);
    const index = this.geometries.indexOf(previous);
    if (index >= 0) this.geometries.splice(index, 1);
    previous.dispose(); this.geometries.push(next);
  }

  private setCityCompact(compact: boolean): void {
    if (compact === this.compactCity) return;
    this.compactCity = compact;
    for (const tier of this.cityDetail) tier.mesh.geometry = compact ? tier.compact : tier.full;
    this.cityLastProjection.makeScale(0, 0, 0);
  }

  private async upgradeRomeKit(): Promise<void> {
    try {
      const kit = await loadColosseumRomeKit();
      if (this.disposed) { this.disposeKit({ ...kit }); return; }
      this.adoptGeometry(this.farBlocks, flattenRomeRoles(kit.palace, ['brick', 'void', 'stone']),
        compactHousingBody(flattenRomeRoles(kit.palace, ['brick', 'stone'])!));
      this.adoptGeometry(this.palaceRoofs, flattenRomeRole(kit.palace, 'tile'));
      this.adoptGeometry(this.pines, flattenRomeRole(kit.pine, 'foliage'));
      this.adoptGeometry(this.pineTrunks, flattenRomeRole(kit.pine, 'timber'));
      this.adoptGeometry(this.cypress, flattenRomeRoles(kit.cypress, ['foliage', 'timber']));
      this.disposeKit({ ...kit });
    } catch {
      /* Procedural hip-roof kit already instances the lots. */
    }
  }

  private async upgradeHousingKit(): Promise<void> {
    try {
      const kit = await loadColosseumHousingKit();
      if (this.disposed) { this.disposeKit({ ...kit }); return; }
      for (const batch of this.housingBatches) {
        this.adoptGeometry(batch.body, flattenRomeRoles(kit[batch.id], ['plaster', 'brick', 'void', 'stone']),
          compactHousingBody(flattenRomeRoles(kit[batch.id], ['plaster', 'brick', 'stone'])!));
        this.adoptGeometry(batch.roof, flattenRomeRole(kit[batch.id], 'tile'));
      }
      this.disposeKit({ ...kit });
    } catch {
      /* Shared authored profiles provide all four silhouettes offline too. */
    }
  }

  private disposeKit(kit: Record<string, Object3D>): void {
    const geometries = new Set<BufferGeometry>(), materials = new Set<MeshStandardMaterial>();
    for (const root of Object.values(kit)) root.traverse((object: Object3D) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material as MeshStandardMaterial);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  private cullCity(camera: Camera): void {
    camera.updateMatrixWorld();
    this.group.updateWorldMatrix(true, true);
    this.cityProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (this.cityProjection.equals(this.cityLastProjection)) return;
    this.cityLastProjection.copy(this.cityProjection);
    this.cityFrustum.setFromProjectionMatrix(this.cityProjection);
    for (const { mesh, matrices, colors } of this.cityBatches) {
      mesh.geometry.computeBoundingSphere();
      let count = 0;
      for (let i = 0; i < matrices.length; i++) {
        this.citySphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrices[i]!).applyMatrix4(mesh.matrixWorld);
        // Include a small margin so camera movement cannot reveal a culled roof edge.
        this.citySphere.radius += 2;
        if (!this.cityFrustum.intersectsSphere(this.citySphere)) continue;
        mesh.setMatrixAt(count, matrices[i]!);
        if (colors[i]) mesh.setColorAt(count, colors[i]!);
        count++;
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  update(t: number, _light: LightState, _sky: ColosseumSkySample, camera?: Camera): void {
    if (camera) {
      this.setCityCompact(camera instanceof PerspectiveCamera && camera.aspect < .72);
      this.cullCity(camera);
    }
    this.aqueduct.update(camera);
    this.tubs.castShadow = !(camera instanceof PerspectiveCamera && camera.aspect < .72);
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
    for (const batch of this.housingBatches) { batch.body.dispose(); batch.roof.dispose(); }
    this.housingFoundations.dispose();
    this.farBlocks.dispose();
    this.palaceRoofs.dispose();
    this.stocks.dispose();
    this.tubs.dispose();
    this.aqueduct.dispose();
    this.urbanContext.dispose();
  }
}
