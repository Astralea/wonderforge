import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { STONEHENGE_CONSTRUCTION } from '../../data/stonehengeConstruction';
import { STONEHENGE_ENVIRONMENT } from '../../data/stonehengeEnvironment';
import { mulberry32 } from '../../engine/random';
import { stonehengeTerrainHeightAt } from '../../engine/stonehengeTerrain';
import type { LightState } from '../../engine/daynight';
import type { StonehengeSkySample } from '../../data/stonehengeSky';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';

const TAU = Math.PI * 2;

function angleDistance(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function createTerrain(): PlaneGeometry {
  const { radius, segments } = STONEHENGE_ENVIRONMENT.terrain;
  const geometry = new PlaneGeometry(radius * 2, radius * 2, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const turf = new Color(STONEHENGE_ENVIRONMENT.palette.turf);
    const pale = new Color('#6d7f52');
    const deep = new Color('#3f5534');
  const color = new Color();
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const y = stonehengeTerrainHeightAt(x, z);
    position.setY(index, y);
    const broad = 0.5 + 0.5 * Math.sin(x * 0.047 + z * 0.031 + Math.sin(z * 0.017) * 2.4);
    const broken = 0.5 + 0.5 * Math.sin(x * 0.173 - z * 0.119 + Math.sin(x * 0.061) * 1.9);
    const grazed = Math.pow(0.5 + 0.5 * Math.sin(x * 0.31 + z * 0.27), 5);
    color.copy(turf)
      .lerp(deep, 0.14 + broken * 0.22)
      .lerp(pale, 0.12 + broad * 0.18 + grazed * 0.1 + Math.max(0, y) * 0.004);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  position.needsUpdate = true;
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createOpenAnnulus(inner: number, outer: number, segments: number): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let cursor = 0;
  for (let index = 0; index < segments; index += 1) {
    const a0 = (index / segments) * TAU;
    const a1 = ((index + 1) / segments) * TAU;
    const middle = (a0 + a1) * 0.5;
    // Original NE entrance plus the narrower southern causeway.
    if (angleDistance(middle, Math.PI / 4) < 0.095 || angleDistance(middle, -Math.PI / 2) < 0.045) continue;
    positions.push(
      Math.cos(a0) * inner, 0, Math.sin(a0) * inner,
      Math.cos(a0) * outer, 0, Math.sin(a0) * outer,
      Math.cos(a1) * outer, 0, Math.sin(a1) * outer,
      Math.cos(a1) * inner, 0, Math.sin(a1) * inner,
    );
    indices.push(cursor, cursor + 1, cursor + 2, cursor, cursor + 2, cursor + 3);
    cursor += 4;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Low trapezoidal turf/chalk berm segment; instances join into the henge bank. */
function createBermSegmentGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5,
    -0.46, 0.92, -0.25, 0.48, 1, -0.22, 0.45, 0.88, 0.25, -0.48, 0.96, 0.22,
  ], 3));
  geometry.setIndex([
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function ribbonGeometry(points: Array<[number, number]>, width: number): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let cursor = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const nx = (-dz / length) * width * 0.5;
    const nz = (dx / length) * width * 0.5;
    const subdivisions = Math.max(1, Math.ceil(length / 7));
    for (let subdivision = 0; subdivision < subdivisions; subdivision += 1) {
      const u0 = subdivision / subdivisions;
      const u1 = (subdivision + 1) / subdivisions;
      const ax = a[0] + dx * u0;
      const az = a[1] + dz * u0;
      const bx = a[0] + dx * u1;
      const bz = a[1] + dz * u1;
      const corners: Array<[number, number]> = [
        [ax + nx, az + nz], [ax - nx, az - nz],
        [bx - nx, bz - nz], [bx + nx, bz + nz],
      ];
      for (const [x, z] of corners) {
        positions.push(x, stonehengeTerrainHeightAt(x, z) + 0.055, z);
      }
      indices.push(cursor, cursor + 1, cursor + 2, cursor, cursor + 2, cursor + 3);
      cursor += 4;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function matrixAt(
  mesh: InstancedMesh,
  index: number,
  position: Vector3,
  scale: Vector3,
  yaw: number,
  matrix: Matrix4,
  quaternion: Quaternion,
): void {
  quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(index, matrix);
}

interface CloudSeed {
  angle: number;
  radius: number;
  height: number;
  scale: [number, number, number];
  speed: number;
}

export class StonehengeEnvironment {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<MeshStandardMaterial | MeshBasicMaterial> = [];
  private readonly instanced: InstancedMesh[] = [];
  private readonly clouds: InstancedMesh;
  private readonly cloudSeeds: CloudSeed[] = [];

  constructor(materials: MaterialLibrary) {
    this.group.name = 'stonehenge-salisbury-plain-environment';
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const random = mulberry32('stonehenge:environment:v1');

    const groundMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    injectMaterialRecipe(groundMaterial, 'chalk-grass');
    const terrainGeometry = createTerrain();
    const terrain = new Mesh(terrainGeometry, groundMaterial);
    terrain.name = 'stonehenge-fixed-rolling-chalk-downs';
    terrain.receiveShadow = true;
    this.geometries.push(terrainGeometry);
    this.materials.push(groundMaterial);
    this.group.add(terrain);

    const ditchMaterial = new MeshStandardMaterial({ color: '#c5bfaa', roughness: 1 });
    const ditchGeometry = createOpenAnnulus(52, 58, 144);
    const ditch = new Mesh(ditchGeometry, ditchMaterial);
    ditch.name = 'stonehenge-open-circular-ditch';
    ditch.position.y = 0.018;
    ditch.receiveShadow = true;
    this.geometries.push(ditchGeometry);
    this.materials.push(ditchMaterial);
    this.group.add(ditch);

    const bankGeometry = createBermSegmentGeometry();
    const bankMaterial = new MeshStandardMaterial({ color: STONEHENGE_ENVIRONMENT.palette.bank, roughness: 1 });
    const bank = new InstancedMesh(bankGeometry, bankMaterial, 132);
    bank.name = 'stonehenge-chalk-bank-segments';
    let bankCursor = 0;
    for (let index = 0; index < 144; index += 1) {
      const angle = (index / 144) * TAU;
      if (angleDistance(angle, Math.PI / 4) < 0.095 || angleDistance(angle, -Math.PI / 2) < 0.045) continue;
      matrixAt(
        bank,
        bankCursor,
        new Vector3(Math.cos(angle) * 48, 0.015, Math.sin(angle) * 48),
        new Vector3(2.14, 0.72, 1.6),
        angle + Math.PI / 2,
        matrix,
        quaternion,
      );
      bankCursor += 1;
    }
    bank.count = bankCursor;
    bank.instanceMatrix.needsUpdate = true;
    bank.castShadow = true;
    bank.receiveShadow = true;
    this.geometries.push(bankGeometry);
    this.materials.push(bankMaterial);
    this.instanced.push(bank);
    this.group.add(bank);

    const holeGeometry = new CylinderGeometry(1, 0.78, 0.38, 16);
    const holeMaterial = new MeshStandardMaterial({ color: '#5a564c', roughness: 1 });
    const holes = new InstancedMesh(holeGeometry, holeMaterial, STONEHENGE_ENVIRONMENT.henge.aubreyHoles);
    holes.name = 'stonehenge-aubrey-hole-ring';
    for (let index = 0; index < holes.count; index += 1) {
      const angle = STONEHENGE_CONSTRUCTION.axisRadians + (index / holes.count) * TAU;
      matrixAt(
        holes,
        index,
        new Vector3(Math.cos(angle) * 44, -0.14, Math.sin(angle) * 44),
        new Vector3(0.7, 1, 0.7),
        angle,
        matrix,
        quaternion,
      );
    }
    holes.instanceMatrix.needsUpdate = true;
    holes.receiveShadow = true;
    this.geometries.push(holeGeometry);
    this.materials.push(holeMaterial);
    this.instanced.push(holes);
    this.group.add(holes);

    const holeRimGeometry = new RingGeometry(0.72, 1.08, 16);
    holeRimGeometry.rotateX(-Math.PI / 2);
    const holeRimMaterial = new MeshStandardMaterial({ color: '#b7b19c', roughness: 1 });
    const holeRims = new InstancedMesh(holeRimGeometry, holeRimMaterial, STONEHENGE_ENVIRONMENT.henge.aubreyHoles);
    holeRims.name = 'stonehenge-aubrey-hole-chalk-rims';
    for (let index = 0; index < holeRims.count; index += 1) {
      const angle = STONEHENGE_CONSTRUCTION.axisRadians + (index / holeRims.count) * TAU;
      matrixAt(holeRims, index, new Vector3(Math.cos(angle) * 44, 0.02, Math.sin(angle) * 44), new Vector3(0.78, 1, 0.78), angle, matrix, quaternion);
    }
    holeRims.instanceMatrix.needsUpdate = true;
    holeRims.receiveShadow = true;
    this.geometries.push(holeRimGeometry);
    this.materials.push(holeRimMaterial);
    this.instanced.push(holeRims);
    this.group.add(holeRims);

    const trackMaterial = new MeshStandardMaterial({ color: STONEHENGE_ENVIRONMENT.palette.track, roughness: 1 });
    this.materials.push(trackMaterial);
    const routeEnds: Record<string, [number, number]> = {
      'sarsen-north': [0, 25],
      'bluestone-west': [-20, 8],
      'heel-northeast': [19, 19],
    };
    for (const route of STONEHENGE_CONSTRUCTION.routes) {
      const geometry = ribbonGeometry([
        [route.source[0], route.source[2]],
        [route.dressing[0], route.dressing[2]],
        [route.queue[0], route.queue[2]],
        routeEnds[route.id],
      ], route.laneWidth * 1.35);
      const road = new Mesh(geometry, trackMaterial);
      road.name = `stonehenge-haul-track-${route.id}`;
      road.receiveShadow = true;
      this.geometries.push(geometry);
      this.group.add(road);
    }

    const yardGeometry = new CircleGeometry(1, 36);
    yardGeometry.rotateX(-Math.PI / 2);
    const yard = new Mesh(yardGeometry, trackMaterial);
    yard.name = 'stonehenge-sarsen-dressing-yard';
    yard.position.set(23, 0.065, 68);
    yard.scale.set(11, 1, 7);
    yard.receiveShadow = true;
    this.geometries.push(yardGeometry);
    this.group.add(yard);

    const grassGeometry = new CircleGeometry(0.28, 5);
    grassGeometry.rotateX(-Math.PI / 2);
    const grassMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    const grass = new InstancedMesh(grassGeometry, grassMaterial, STONEHENGE_ENVIRONMENT.ecology.grassTufts);
    grass.name = 'stonehenge-instanced-chalk-grass';
    let grassCursor = 0;
    let grassAttempts = 0;
    while (grassCursor < grass.count && grassAttempts < grass.count * 12) {
      grassAttempts += 1;
      const radius = 22 + Math.sqrt(random()) * 148;
      if (radius > 43 && radius < 61) continue;
      const angle = random() * TAU;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      matrixAt(grass, grassCursor, new Vector3(x, stonehengeTerrainHeightAt(x, z) + 0.012, z), new Vector3(0.9 + random() * 0.8, 1, 0.9 + random() * 0.8), random() * TAU, matrix, quaternion);
      grass.setColorAt(
        grassCursor,
        new Color('#4a5e34').lerp(new Color('#6a7c44'), random() * 0.5),
      );
      grassCursor += 1;
    }
    grass.count = grassCursor;
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    // At this scale grass shadows cost a full repeated shadow pass without a
    // readable silhouette; the terrain receives the hero/mechanism shadows.
    grass.castShadow = false;
    grass.receiveShadow = true;
    this.geometries.push(grassGeometry);
    this.materials.push(grassMaterial);
    this.instanced.push(grass);
    this.group.add(grass);

    const nearHerbGeometry = new CircleGeometry(0.32, 5);
    nearHerbGeometry.rotateX(-Math.PI / 2);
    const nearHerbMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    const nearHerbs = new InstancedMesh(
      nearHerbGeometry,
      nearHerbMaterial,
      STONEHENGE_ENVIRONMENT.ecology.nearHerbTufts,
    );
    nearHerbs.name = 'stonehenge-near-grazed-herbs';
    let nearCursor = 0;
    let nearAttempts = 0;
    while (nearCursor < nearHerbs.count && nearAttempts < nearHerbs.count * 16) {
      nearAttempts += 1;
      const belt = random();
      const radius = belt < 0.28
        ? 16 + random() * 12
        : belt < 0.52
          ? 36 + random() * 8
          : 52 + random() * 26;
      const angle = random() * TAU;
      // Bias onto the camera-facing SW–W and dawn SE arcs so late BUILD and
      // the haul hold have readable turf instead of a dead skip band.
      if (
        angleDistance(angle, 5.28) > 0.95
        && angleDistance(angle, 6.53) > 0.95
        && angleDistance(angle, 1.62) > 0.7
        && random() > 0.22
      ) {
        continue;
      }
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      matrixAt(
        nearHerbs,
        nearCursor,
        new Vector3(x, stonehengeTerrainHeightAt(x, z) + 0.014, z),
        new Vector3(0.85 + random() * 0.7, 1, 0.85 + random() * 0.7),
        random() * TAU,
        matrix,
        quaternion,
      );
      nearHerbs.setColorAt(
        nearCursor,
        new Color('#4a5e34').lerp(new Color('#6d7e4a'), random() * 0.4),
      );
      nearCursor += 1;
    }
    nearHerbs.count = nearCursor;
    nearHerbs.instanceMatrix.needsUpdate = true;
    if (nearHerbs.instanceColor) nearHerbs.instanceColor.needsUpdate = true;
    nearHerbs.castShadow = false;
    nearHerbs.receiveShadow = true;
    this.geometries.push(nearHerbGeometry);
    this.materials.push(nearHerbMaterial);
    this.instanced.push(nearHerbs);
    this.group.add(nearHerbs);

    const trampledGeometry = new IcosahedronGeometry(0.42, 0);
    const trampledMaterial = new MeshStandardMaterial({
      color: '#d8d1b5',
      roughness: 1,
      flatShading: true,
    });
    const trampled = new InstancedMesh(
      trampledGeometry,
      trampledMaterial,
      STONEHENGE_ENVIRONMENT.site.trampledChips,
    );
    trampled.name = 'stonehenge-trampled-chalk-chips';
    for (let index = 0; index < trampled.count; index += 1) {
      const angle = 5.28 + (random() - 0.5) * 1.8;
      const radius = 14 + random() * 28;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      matrixAt(
        trampled,
        index,
        new Vector3(x, stonehengeTerrainHeightAt(x, z) + 0.05, z),
        new Vector3(0.28 + random() * 0.55, 0.1 + random() * 0.18, 0.28 + random() * 0.55),
        random() * TAU,
        matrix,
        quaternion,
      );
    }
    trampled.instanceMatrix.needsUpdate = true;
    trampled.castShadow = false;
    trampled.receiveShadow = true;
    this.geometries.push(trampledGeometry);
    this.materials.push(trampledMaterial);
    this.instanced.push(trampled);
    this.group.add(trampled);

    const shrubGeometry = new IcosahedronGeometry(0.65, 0);
    const shrubMaterial = new MeshStandardMaterial({ color: '#596b43', roughness: 1, flatShading: true });
    const shrubs = new InstancedMesh(shrubGeometry, shrubMaterial, STONEHENGE_ENVIRONMENT.ecology.shrubs);
    shrubs.name = 'stonehenge-sparse-downland-shrubs';
    for (let index = 0; index < shrubs.count; index += 1) {
      const radius = 72 + random() * 125;
      const angle = random() * TAU;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      matrixAt(shrubs, index, new Vector3(x, stonehengeTerrainHeightAt(x, z) + 0.18, z), new Vector3(0.9 + random() * 0.7, 0.2 + random() * 0.16, 0.9 + random() * 0.7), random() * TAU, matrix, quaternion);
    }
    shrubs.instanceMatrix.needsUpdate = true;
    shrubs.castShadow = false;
    this.geometries.push(shrubGeometry);
    this.materials.push(shrubMaterial);
    this.instanced.push(shrubs);
    this.group.add(shrubs);

    const trunkGeometry = new CylinderGeometry(0.18, 0.28, 3.8, 6);
    const crownGeometry = new IcosahedronGeometry(1, 0);
    const crownMaterial = new MeshStandardMaterial({ color: '#41533c', roughness: 1, flatShading: true });
    const treeCount = STONEHENGE_ENVIRONMENT.ecology.treeClusters * 7;
    const trunks = new InstancedMesh(trunkGeometry, materials.wood, treeCount);
    const crowns = new InstancedMesh(crownGeometry, crownMaterial, treeCount);
    trunks.name = 'stonehenge-distant-tree-trunks';
    crowns.name = 'stonehenge-distant-tree-mosaic';
    let treeCursor = 0;
    for (let cluster = 0; cluster < STONEHENGE_ENVIRONMENT.ecology.treeClusters; cluster += 1) {
      const lobe = cluster % 3;
      const clusterAngle = lobe === 0 ? 3.7 + (random() - 0.5) * 0.7
        : lobe === 1 ? 0.65 + (random() - 0.5) * 0.7
          : 4.9 + (random() - 0.5) * 0.6;
      const clusterRadius = 310 + random() * 140;
      for (let member = 0; member < 7; member += 1) {
        const x = Math.cos(clusterAngle) * clusterRadius + (random() - 0.5) * 16;
        const z = Math.sin(clusterAngle) * clusterRadius + (random() - 0.5) * 16;
        const ground = stonehengeTerrainHeightAt(x, z);
        const height = 4.4 + random() * 3.2;
        matrixAt(trunks, treeCursor, new Vector3(x, ground + height * 0.5, z), new Vector3(0.9, height / 3.8, 0.9), random() * TAU, matrix, quaternion);
        matrixAt(crowns, treeCursor, new Vector3(x, ground + height + 1.6, z), new Vector3(1.7 + random() * 0.9, 1.4 + random() * 0.9, 1.7 + random() * 0.9), random() * TAU, matrix, quaternion);
        treeCursor += 1;
      }
    }
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    // Hundreds of metres away: silhouette/value carry these crowns. Their
    // small shadow silhouettes cannot be read from the construction camera.
    trunks.castShadow = false;
    crowns.castShadow = false;
    this.geometries.push(trunkGeometry, crownGeometry);
    this.materials.push(crownMaterial);
    this.instanced.push(trunks, crowns);
    this.group.add(trunks, crowns);

    // Small, distant cattle make the grazed open plain legible at human scale
    // without turning the monument into a pastoral diorama. All parts are
    // instanced and remain outside the construction clearance.
    const cattleBodyGeometry = new IcosahedronGeometry(0.72, 1);
    const cattleHeadGeometry = new IcosahedronGeometry(0.34, 1);
    const cattleLegGeometry = new CylinderGeometry(0.055, 0.075, 0.62, 5);
    const cattleMaterial = new MeshStandardMaterial({ color: '#594838', roughness: 1, flatShading: true });
    const cattleCount = STONEHENGE_ENVIRONMENT.ecology.cattle;
    const cattleBodies = new InstancedMesh(cattleBodyGeometry, cattleMaterial, cattleCount);
    const cattleHeads = new InstancedMesh(cattleHeadGeometry, cattleMaterial, cattleCount);
    const cattleLegs = new InstancedMesh(cattleLegGeometry, cattleMaterial, cattleCount * 4);
    cattleBodies.name = 'stonehenge-distant-cattle-bodies';
    cattleHeads.name = 'stonehenge-distant-cattle-heads';
    cattleLegs.name = 'stonehenge-distant-cattle-legs';
    let cattleLegCursor = 0;
    for (let index = 0; index < cattleCount; index += 1) {
      const angle = 0.15 + index * 0.11;
      const radius = 103 + (index % 3) * 8.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = stonehengeTerrainHeightAt(x, z);
      const yaw = 1.1 + (index % 4) * 0.34;
      const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const lateral = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      matrixAt(cattleBodies, index, new Vector3(x, y + 0.88, z), new Vector3(1.18, 0.62, 0.55), yaw, matrix, quaternion);
      matrixAt(cattleHeads, index, new Vector3(x, y + 1.02, z).addScaledVector(forward, 1.02), new Vector3(0.62, 0.72, 0.64), yaw, matrix, quaternion);
      for (const fore of [-0.42, 0.42] as const) {
        for (const side of [-0.34, 0.34] as const) {
          const leg = new Vector3(x, y + 0.31, z)
            .addScaledVector(forward, fore)
            .addScaledVector(lateral, side);
          matrixAt(cattleLegs, cattleLegCursor, leg, new Vector3(1, 1, 1), yaw, matrix, quaternion);
          cattleLegCursor += 1;
        }
      }
    }
    for (const cattle of [cattleBodies, cattleHeads, cattleLegs]) {
      cattle.instanceMatrix.needsUpdate = true;
      cattle.castShadow = true;
      this.instanced.push(cattle);
      this.group.add(cattle);
    }
    this.geometries.push(cattleBodyGeometry, cattleHeadGeometry, cattleLegGeometry);
    this.materials.push(cattleMaterial);

    const chipGeometry = new IcosahedronGeometry(0.5, 0);
    const chipMaterial = new MeshStandardMaterial({ color: '#cfcabc', roughness: 1, flatShading: true });
    const chips = new InstancedMesh(chipGeometry, chipMaterial, STONEHENGE_ENVIRONMENT.site.dressingChips);
    chips.name = 'stonehenge-sarsen-dressing-chips';
    for (let index = 0; index < chips.count; index += 1) {
      const angle = random() * TAU;
      const radius = Math.sqrt(random()) * 10;
      matrixAt(chips, index, new Vector3(23 + Math.cos(angle) * radius, 0.09, 68 + Math.sin(angle) * radius * 0.65), new Vector3(0.12 + random() * 0.3, 0.08 + random() * 0.18, 0.12 + random() * 0.3), random() * TAU, matrix, quaternion);
    }
    chips.instanceMatrix.needsUpdate = true;
    this.geometries.push(chipGeometry);
    this.materials.push(chipMaterial);
    this.instanced.push(chips);
    this.group.add(chips);

    const hammerMaterial = new MeshStandardMaterial({ color: '#736f65', roughness: 1, flatShading: true });
    const hammers = new InstancedMesh(chipGeometry, hammerMaterial, STONEHENGE_ENVIRONMENT.site.hammerstones);
    hammers.name = 'stonehenge-hammerstones';
    for (let index = 0; index < hammers.count; index += 1) {
      const angle = random() * TAU;
      const radius = 2 + Math.sqrt(random()) * 8;
      matrixAt(hammers, index, new Vector3(23 + Math.cos(angle) * radius, 0.18, 68 + Math.sin(angle) * radius * 0.65), new Vector3(0.3 + random() * 0.35, 0.22 + random() * 0.26, 0.3 + random() * 0.35), random() * TAU, matrix, quaternion);
    }
    hammers.instanceMatrix.needsUpdate = true;
    this.materials.push(hammerMaterial);
    this.instanced.push(hammers);
    this.group.add(hammers);

    const stockGeometry = new CylinderGeometry(0.12, 0.15, 2.8, 6);
    const timberMaterial = materials.wood.clone();
    timberMaterial.color.set('#916b43');
    timberMaterial.roughness = 0.98;
    const stock = new InstancedMesh(stockGeometry, timberMaterial, STONEHENGE_ENVIRONMENT.site.timberStock);
    stock.name = 'stonehenge-timber-crib-and-frame-stock';
    for (let index = 0; index < stock.count; index += 1) {
      const row = Math.floor(index / 16);
      const column = index % 16;
      const position = new Vector3(-29 + column * 0.42, 0.28 + row * 0.24, 31 + (row % 2) * 0.3);
      quaternion.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
      matrix.compose(position, quaternion, new Vector3(1, 1, 1));
      stock.setMatrixAt(index, matrix);
    }
    stock.instanceMatrix.needsUpdate = true;
    stock.castShadow = true;
    this.geometries.push(stockGeometry);
    this.materials.push(timberMaterial);
    this.instanced.push(stock);
    this.group.add(stock);

    const shelterGeometry = new ConeGeometry(2.4, 2.1, 5, 1, true);
    const shelters = new InstancedMesh(shelterGeometry, materials.linen, STONEHENGE_ENVIRONMENT.site.hideShelters);
    shelters.name = 'stonehenge-builder-hide-shelters';
    for (let index = 0; index < shelters.count; index += 1) {
      const angle = -0.4 + index * 0.18;
      matrixAt(shelters, index, new Vector3(-38 + index * 3.8, 1.05, 54 + Math.sin(index) * 2.2), new Vector3(1, 0.85 + random() * 0.25, 1.15), angle, matrix, quaternion);
    }
    shelters.instanceMatrix.needsUpdate = true;
    shelters.castShadow = true;
    this.geometries.push(shelterGeometry);
    this.instanced.push(shelters);
    this.group.add(shelters);

    // Pre-existing distant earthworks: low enough to read as landscape, not
    // as later Bronze-Age barrows (explicitly excluded in typed data).
    const cursusGeometry = new BoxGeometry(1, 1, 1);
    const cursusMaterial = new MeshStandardMaterial({ color: '#8e956c', roughness: 1 });
    const cursus = new InstancedMesh(cursusGeometry, cursusMaterial, 2);
    cursus.name = 'stonehenge-distant-cursus-banks';
    matrixAt(cursus, 0, new Vector3(-42, stonehengeTerrainHeightAt(-42, -126) + 0.16, -126), new Vector3(145, 0.3, 1.2), 0.08, matrix, quaternion);
    matrixAt(cursus, 1, new Vector3(-42, stonehengeTerrainHeightAt(-42, -138) + 0.16, -138), new Vector3(145, 0.3, 1.2), 0.08, matrix, quaternion);
    cursus.instanceMatrix.needsUpdate = true;
    this.geometries.push(cursusGeometry);
    this.materials.push(cursusMaterial);
    this.instanced.push(cursus);
    this.group.add(cursus);

    const cloudGeometry = new SphereGeometry(1, 8, 5);
    const cloudMaterial = new MeshBasicMaterial({
      color: '#e7e4dc',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      fog: false,
    });
    this.clouds = new InstancedMesh(cloudGeometry, cloudMaterial, 18);
    this.clouds.name = 'stonehenge-playback-cloud-bands';
    this.clouds.frustumCulled = false;
    // The previous ellipsoid layer read as floating grey rocks and could
    // blanket the narrow desktop sky strip. The dome shader now owns the
    // broken cumulus field; keep this retired batch only until the next data
    // migration so old diagnostics/resource disposal remain stable.
    this.clouds.visible = false;
    for (let index = 0; index < this.clouds.count; index += 1) {
      this.cloudSeeds.push({
        angle: 0.25 + (index / this.clouds.count) * TAU,
        radius: 150 + (index % 3) * 18,
        height: 48 + (index % 4) * 4.5,
        scale: [9 + random() * 8, 1.5 + random() * 2.2, 4 + random() * 5],
        speed: 0.035 + random() * 0.025,
      });
    }
    this.geometries.push(cloudGeometry);
    this.materials.push(cloudMaterial);
    this.instanced.push(this.clouds);
    this.group.add(this.clouds);
    this.update(0, undefined);
  }

  update(t: number, light?: LightState, sky?: StonehengeSkySample): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const color = new Color(sky?.cloudTint ?? light?.sky ?? STONEHENGE_ENVIRONMENT.palette.sky);
    const cloudMaterial = this.clouds.material as MeshBasicMaterial;
    cloudMaterial.color.copy(color);
    cloudMaterial.opacity = (sky?.cloudOpacity ?? 0.34) * 0.42;
    this.cloudSeeds.forEach((seed, index) => {
      const angle = seed.angle + t * seed.speed * TAU;
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), -angle);
      matrix.compose(
        new Vector3(Math.cos(angle) * seed.radius, seed.height + Math.sin(t * TAU + index) * 0.7, Math.sin(angle) * seed.radius),
        quaternion,
        new Vector3(...seed.scale),
      );
      this.clouds.setMatrixAt(index, matrix);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const mesh of this.instanced) mesh.dispose();
    for (const geometry of new Set(this.geometries)) geometry.dispose();
    for (const material of new Set(this.materials)) material.dispose();
  }
}
