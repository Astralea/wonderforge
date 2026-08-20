import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { GizaConstructionPlan, MonumentId, Vec3 } from '../../data/constructionTypes';
import {
  haulCorridors,
  isClearOfSiteWorks,
  pushOutOfSiteWorks,
  siteKeepOuts,
  type Corridor,
  type KeepOut,
} from '../../engine/siteClearance';
import {
  BIRD_FLOCK,
  birdStateAt,
  channelTangentYawAt,
  fieldParcelAt,
  GIZA_ENVIRONMENT,
  greenbeltInnerEdgeAt,
  grovePalmAt,
  palmArchetypeAt,
  riverBraidAt,
  riverCenterZAt,
  riverCraftStateAt,
  riverWidthAt,
  WIND_DUST,
  windDustPuffAt,
  type FieldCrop,
  type RiverCraftDescription,
} from '../../data/gizaEnvironment';
import { GIZA_SKY, type CloudLayerDescription, type SkyKeyframe } from '../../data/gizaSky';
import type { LightState } from '../../engine/daynight';
import { smoothstep } from '../../engine/easing';
import { mulberry32 } from '../../engine/random';
import type { MaterialLibrary } from './MaterialLibrary';
import { applyClothSway, updateClothSwayTime } from './proceduralDetail';
import { SkyDome } from './SkyDome';

function mesh(
  geometry: BufferGeometry,
  material: MeshStandardMaterial | MeshBasicMaterial,
  position: Vec3,
  scale: Vec3,
  shadows = true,
): Mesh {
  const item = new Mesh(geometry, material);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = shadows;
  item.receiveShadow = shadows;
  return item;
}

function roadGeometry(points: Vec3[], width: number): BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(points.length - 1, i + 1)]!;
    const dx = next[0] - previous[0];
    const dz = next[2] - previous[2];
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const px = (-dz / length) * width * 0.5;
    const pz = (dx / length) * width * 0.5;
    vertices.push(points[i]![0] + px, points[i]![1], points[i]![2] + pz);
    vertices.push(points[i]![0] - px, points[i]![1], points[i]![2] - pz);
    if (i > 0) {
      const base = i * 2;
      indices.push(base - 2, base - 1, base, base, base - 1, base + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Main channel ribbon following the typed centerline/width (Spec 08). */
function riverRibbonGeometry(
  xStart: number,
  xEnd: number,
  segments: number,
  y: number,
): BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const x = xStart + (i / segments) * (xEnd - xStart);
    const centerZ = riverCenterZAt(x);
    const half = riverWidthAt(x) / 2;
    vertices.push(x, y, centerZ - half, x, y, centerZ + half);
    if (i > 0) {
      const base = i * 2;
      indices.push(base - 2, base - 1, base, base, base - 1, base + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Cultivated strip ribbon following the near bank (Spec 08). */
function greenbeltRibbonGeometry(
  xStart: number,
  xEnd: number,
  segments: number,
  y: number,
): BufferGeometry {
  const { depth } = GIZA_ENVIRONMENT.greenbelt;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const x = xStart + (i / segments) * (xEnd - xStart);
    const inner = greenbeltInnerEdgeAt(x);
    vertices.push(x, y, inner, x, y, inner + depth);
    if (i > 0) {
      const base = i * 2;
      indices.push(base - 2, base - 1, base, base, base - 1, base + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Lens-tapered braided side channel; null when the braid degenerates. */
function braidRibbonGeometry(y: number): BufferGeometry | null {
  const { braid } = GIZA_ENVIRONMENT.riverChannel;
  const segments = 48;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const x = braid.startX + (i / segments) * (braid.endX - braid.startX);
    const sample = riverBraidAt(x);
    if (!sample) return null;
    const half = Math.max(0.05, sample.width / 2);
    vertices.push(x, y, sample.centerZ - half, x, y, sample.centerZ + half);
    if (i > 0) {
      const base = i * 2;
      indices.push(base - 2, base - 1, base, base, base - 1, base + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

interface RampVisual {
  monument: Exclude<MonumentId, 'temple'>;
  /** World placement (center + yaw), premultiplied onto every local matrix. */
  transform: Matrix4;
  stepCount: number;
  bricksAcross: number;
  maxHeight: number;
  width: number;
  length: number;
  baseY: number;
  start: number;
  end: number;
  /** First block start of each course, ascending — precomputed so the crest
   *  can be raised continuously instead of rescanning every block per frame. */
  courseStarts: number[];
  courseHeight: number;
  groundY: number;
}

export class GizaEnvironment {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly sky: SkyDome;
  private readonly clouds = new Group();
  private readonly cloudLayers: Array<{
    description: CloudLayerDescription;
    group: Group;
    material: MeshBasicMaterial;
  }> = [];
  private readonly ramps: RampVisual[] = [];
  private rampMeshes: {
    steps: InstancedMesh;
    brickwork: InstancedMesh;
    retaining: InstancedMesh;
  } | null = null;
  private readonly boats: Array<{
    craft: RiverCraftDescription;
    globalIndex: number;
    scale: number;
  }> = [];
  private boatFleet: {
    hulls: InstancedMesh;
    reedHulls: InstancedMesh;
    masts: InstancedMesh;
    yards: InstancedMesh;
    booms: InstancedMesh;
    sails: InstancedMesh;
    oars: InstancedMesh;
    cargo: InstancedMesh;
    bundles: InstancedMesh;
  } | null = null;
  private readonly palmSway: Array<{
    crownX: number;
    crownY: number;
    crownZ: number;
    fronds: Array<{
      yaw: number;
      droop: number;
      length: number;
      width: number;
      phase: number;
    }>;
  }> = [];
  private palmFronds: InstancedMesh | null = null;
  private campfires: {
    flames: InstancedMesh;
    flameMaterial: MeshStandardMaterial;
    lights: PointLight[];
    /** Per flame instance: the base transform the per-frame flicker scales. */
    bases: Array<{ x: number; z: number; scale: number; yaw: number }>;
  } | null = null;
  /** Swaying linen clones (sails, tents, awnings); the shared library linen
   *  on worker clothing stays still (Spec 06). Owned and disposed here. */
  private readonly clothMaterials: MeshStandardMaterial[] = [];
  private windDust: { puffs: InstancedMesh; material: MeshStandardMaterial } | null = null;
  /** Waterline foam ribbons; opacity pulses gently with playback t. */
  private foam: { mesh: InstancedMesh; material: MeshStandardMaterial } | null = null;
  /** One-off materials outside the shared library (date fruit, etc.). */
  private readonly extraMaterials: MeshStandardMaterial[] = [];
  private birds: {
    bodies: InstancedMesh;
    wings: InstancedMesh;
    material: MeshStandardMaterial;
  } | null = null;

  /** Ground the construction occupies; props must stay off it (Spec 08). */
  private readonly keepOuts: KeepOut[];
  private readonly corridors: Corridor[];

  constructor(
    private readonly plan: GizaConstructionPlan,
    materials: MaterialLibrary,
  ) {
    this.group.name = 'giza-environment';
    this.keepOuts = siteKeepOuts(plan);
    this.corridors = haulCorridors(plan);
    const plane = new PlaneGeometry(4000, 4000, 48, 48);
    plane.rotateX(-Math.PI / 2);
    this.geometries.push(plane);
    const ground = mesh(plane, materials.sand, [-10, -0.08, -20], [1, 1, 1]);
    ground.name = 'plateau-terrain';
    this.group.add(ground);

    this.addQuarry(materials);
    this.addRoads(materials);
    this.addHorizon(materials);
    this.addSettlement(materials);
    this.addCampfires(materials);
    this.addWindDust(materials);
    this.addBirds();
    this.addSiteScatter(materials);
    this.addOuterNecropolis(materials);
    this.addSphinxAndTemples(materials);
    this.addRamps(materials);

    this.sky = new SkyDome();
    this.group.add(this.sky.mesh);
    this.addClouds();
  }

  private addQuarry(materials: MaterialLibrary): void {
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    // One instanced batch for the whole static quarry (floor + benched cuts):
    // five separate meshes here were five draw calls for zero visual gain.
    const quarryParts = new InstancedMesh(box, materials.quarryCut, 5);
    const quarryMatrix = new Matrix4();
    const quarrySpecs: Array<[Vec3, Vec3]> = [
      [[-52, -0.2, 31], [24, 0.45, 22]],
      [[-62, 0.55, 31], [2.4, 1.1, 24]],
      [[-59.6, 0.89, 31], [2.4, 1.78, 21.8]],
      [[-57.2, 1.23, 31], [2.4, 2.46, 19.6]],
      [[-54.8, 1.57, 31], [2.4, 3.14, 17.4]],
    ];
    quarrySpecs.forEach(([position, scale], index) => {
      quarryMatrix.compose(new Vector3(...position), new Quaternion(), new Vector3(...scale));
      quarryParts.setMatrixAt(index, quarryMatrix);
    });
    quarryParts.castShadow = true;
    quarryParts.receiveShadow = true;
    quarryParts.name = 'foreground-quarry-floor-and-cuts';
    this.group.add(quarryParts);

    const dressingStones = new InstancedMesh(box, materials.block['core-limestone'], 52);
    const random = mulberry32('giza:dressing-yard');
    const matrix = new Matrix4();
    for (let i = 0; i < 52; i += 1) {
      const x = -45 + (i % 13) * 1.35 + (random() - 0.5) * 0.12;
      const z = 17 + Math.floor(i / 13) * 1.7 + (random() - 0.5) * 0.12;
      matrix.compose(
        new Vector3(x, 0.34, z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (random() - 0.5) * 0.12),
        new Vector3(1.12 + random() * 0.18, 0.58, 0.94 + random() * 0.16),
      );
      dressingStones.setMatrixAt(i, matrix);
    }
    dressingStones.castShadow = true;
    dressingStones.receiveShadow = true;
    dressingStones.name = 'dressing-yard-blocks';
    this.group.add(dressingStones);
  }

  private addRoads(materials: MaterialLibrary): void {
    // Both haul roads shadow the actual sled chords (gizaConstruction routes):
    // the southern road swings south of the khufu-south earthwork to its foot,
    // the eastern road rounds the south-east corner wide to the east ramp foot.
    const mainRoad = roadGeometry([
      [-52, 0.05, 30],
      [-45, 0.06, 30],
      [-29, 0.08, 41],
      [7, 0.08, 37],
    ], 6.4);
    this.geometries.push(mainRoad);
    const roadMesh = new Mesh(mainRoad, materials.compactedEarth);
    roadMesh.receiveShadow = true;
    roadMesh.name = 'wetted-two-lane-haul-road';
    this.group.add(roadMesh);

    const eastRoad = roadGeometry([
      [-41, 0.05, 31],
      [-5, 0.06, 39.4],
      [28, 0.07, 47],
      [43, 0.05, -1],
    ], 4.8);
    this.geometries.push(eastRoad);
    const eastRoadMesh = new Mesh(eastRoad, materials.compactedEarth);
    eastRoadMesh.receiveShadow = true;
    eastRoadMesh.name = 'eastern-haul-road';
    this.group.add(eastRoadMesh);

    const causeway = roadGeometry([
      [-55, 0.12, -42],
      [-42, 0.12, -33],
      [-25, 0.1, -24],
      [-10, 0.1, -15],
    ], 3.3);
    this.geometries.push(causeway);
    const causewayMesh = new Mesh(causeway, materials.quarryCut);
    causewayMesh.receiveShadow = true;
    causewayMesh.name = 'stone-causeway';
    this.group.add(causewayMesh);
  }

  private addHorizon(materials: MaterialLibrary): void {
    const box = new BoxGeometry(1, 1, 1);
    // The Nile follows the typed channel description (Spec 08): a broad
    // S-meander across the floodplain plus one lens-tapered braided side
    // channel — never a straight ribbon.
    const riverGeometry = riverRibbonGeometry(-125, 105, 128, 0.08);
    const braidGeometry = braidRibbonGeometry(0.08);
    this.geometries.push(box, riverGeometry);
    const river = new Mesh(riverGeometry, materials.water);
    river.name = 'nile-ribbon';
    this.group.add(river);
    if (braidGeometry) {
      this.geometries.push(braidGeometry);
      const braid = new Mesh(braidGeometry, materials.water);
      braid.name = 'nile-braided-side-channel';
      this.group.add(braid);
    }

    // The cultivated strip follows the meandering near bank (Spec 08).
    const greenGeometry = greenbeltRibbonGeometry(-125, 105, 128, 0.02);
    this.geometries.push(greenGeometry);
    const greenbelt = mesh(greenGeometry, materials.foliage, [0, 0, 0], [1, 1, 1], false);
    greenbelt.name = 'nile-greenbelt';
    this.group.add(greenbelt);

    const fieldCount = GIZA_ENVIRONMENT.fields;
    const fields = new InstancedMesh(box, materials.farmland, fieldCount);
    fields.name = 'cultivated-field-parcels-and-planting-rows';
    const matrix = new Matrix4();
    // Typed peret-season crop mosaic (Spec 08 §Ecology): growing emmer,
    // ripening gold, pale flax, plowed fallow, and straw stubble.
    const cropColors: Record<FieldCrop, Color> = {
      'emmer-green': new Color('#5f7a3d'),
      'emmer-ripe': new Color('#a8873c'),
      flax: new Color('#7f9078'),
      'fallow-plowed': new Color('#6b4f33'),
      stubble: new Color('#97865a'),
    };
    for (let i = 0; i < fieldCount; i += 1) {
      const parcel = fieldParcelAt(i);
      matrix.compose(
        new Vector3(parcel.x, 0.09, parcel.z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), parcel.yaw),
        new Vector3(13.6, 0.12, 5.3),
      );
      fields.setMatrixAt(i, matrix);
      fields.setColorAt(i, cropColors[parcel.crop]);
    }
    fields.receiveShadow = true;
    this.group.add(fields);

    // Planted furrow ridges run the length of every parcel, tinted a shade
    // darker than its crop state; low mud bunds wall each parcel for basin
    // irrigation. Two instanced batches for the whole strip.
    const furrowsPerParcel = 7;
    const furrows = new InstancedMesh(box, materials.farmland, fieldCount * furrowsPerParcel);
    furrows.name = 'cultivated-field-furrow-ridges';
    const bunds = new InstancedMesh(box, materials.compactedEarth, fieldCount * 4);
    bunds.name = 'cultivated-field-boundary-bunds';
    const furrowTint = new Color();
    for (let i = 0; i < fieldCount; i += 1) {
      const parcel = fieldParcelAt(i);
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), parcel.yaw);
      const cos = Math.cos(parcel.yaw);
      const sin = Math.sin(parcel.yaw);
      // Parcel-local offset rotated into world (local x = long axis).
      const place = (lx: number, lz: number) =>
        new Vector3(parcel.x + lx * cos + lz * sin, 0, parcel.z - lx * sin + lz * cos);
      furrowTint.copy(cropColors[parcel.crop]).multiplyScalar(0.68);
      for (let row = 0; row < furrowsPerParcel; row += 1) {
        const lz = -2.1 + row * 0.7;
        const offset = place(0, lz);
        matrix.compose(
          new Vector3(offset.x, 0.16, offset.z),
          rotation,
          new Vector3(12.9, 0.1, 0.24),
        );
        furrows.setMatrixAt(i * furrowsPerParcel + row, matrix);
        furrows.setColorAt(i * furrowsPerParcel + row, furrowTint);
      }
      const bundEdges: Array<[number, number, number, number]> = [
        [0, -2.75, 13.9, 0.3],
        [0, 2.75, 13.9, 0.3],
        [-6.9, 0, 0.3, 5.6],
        [6.9, 0, 0.3, 5.6],
      ];
      for (let edge = 0; edge < bundEdges.length; edge += 1) {
        const [lx, lz, sx, sz] = bundEdges[edge]!;
        const offset = place(lx, lz);
        matrix.compose(new Vector3(offset.x, 0.16, offset.z), rotation, new Vector3(sx, 0.22, sz));
        bunds.setMatrixAt(i * 4 + edge, matrix);
      }
    }
    furrows.receiveShadow = true;
    bunds.receiveShadow = true;
    this.group.add(furrows, bunds);

    // Basin-irrigation feeders run in from the river, perpendicular to the
    // local bank (Spec 08: the strip follows the river).
    const irrigation = new InstancedMesh(box, materials.water, GIZA_ENVIRONMENT.irrigationChannels);
    irrigation.name = 'field-irrigation-channel-network';
    for (let i = 0; i < GIZA_ENVIRONMENT.irrigationChannels; i += 1) {
      const x = -100 + i * 21;
      matrix.compose(
        new Vector3(x, 0.16, greenbeltInnerEdgeAt(x) + 8),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), channelTangentYawAt(x)),
        new Vector3(0.5, 0.07, 15),
      );
      irrigation.setMatrixAt(i, matrix);
    }
    this.group.add(irrigation);

    // Raised levees follow the curved centerline as short segments, yawed to
    // the local channel tangent (braid side tracks the braid's outer edge).
    const bankSegments = 40;
    const banks = new InstancedMesh(box, materials.compactedEarth, bankSegments * 2);
    banks.name = 'raised-nile-banks';
    for (let i = 0; i < bankSegments; i += 1) {
      const x = -125 + ((i + 0.5) / bankSegments) * 230;
      const tangent = channelTangentYawAt(x);
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), tangent);
      const half = riverWidthAt(x) / 2;
      const braid = riverBraidAt(x);
      const nearZ = riverCenterZAt(x) + half + 0.7;
      const farZ = braid
        ? braid.centerZ - braid.width / 2 - 0.7
        : riverCenterZAt(x) - half - 0.7;
      matrix.compose(new Vector3(x, 0.27, nearZ), rotation, new Vector3(6.6, 0.42, 1.25));
      banks.setMatrixAt(i * 2, matrix);
      matrix.compose(new Vector3(x, 0.27, farZ), rotation, new Vector3(6.6, 0.42, 1.25));
      banks.setMatrixAt(i * 2 + 1, matrix);
    }
    this.group.add(banks);

    // Waterline foam: thin pale ribbons riding both water edges (and the
    // braid's outer edge), with a gentle t-phased wash pulse (Spec 06).
    const foamMaterial = materials.whitewash.clone();
    foamMaterial.transparent = true;
    foamMaterial.opacity = 0.24;
    foamMaterial.depthWrite = false;
    const foam = new InstancedMesh(box, foamMaterial, bankSegments * 2);
    foam.name = 'nile-waterline-foam';
    foam.castShadow = false;
    foam.receiveShadow = false;
    for (let i = 0; i < bankSegments; i += 1) {
      const x = -125 + ((i + 0.5) / bankSegments) * 230;
      const tangent = channelTangentYawAt(x);
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), tangent);
      const half = riverWidthAt(x) / 2;
      const braid = riverBraidAt(x);
      const nearZ = riverCenterZAt(x) + half - 0.15;
      const farZ = braid
        ? braid.centerZ - braid.width / 2 + 0.15
        : riverCenterZAt(x) - half + 0.15;
      matrix.compose(new Vector3(x, 0.1, nearZ), rotation, new Vector3(6.4, 0.05, 0.55));
      foam.setMatrixAt(i * 2, matrix);
      matrix.compose(new Vector3(x, 0.1, farZ), rotation, new Vector3(6.4, 0.05, 0.55));
      foam.setMatrixAt(i * 2 + 1, matrix);
    }
    this.foam = { mesh: foam, material: foamMaterial };
    this.group.add(foam);

    this.addRiverVegetation(materials, box);
    this.addRiverBoats(materials);
    this.addDistantCity(materials, box);
    this.addFixedHorizonTerrain(materials);
  }

  private addRiverVegetation(materials: MaterialLibrary, frondGeometry: BoxGeometry): void {
    const reedGeometry = new CylinderGeometry(0.025, 0.045, 1.15, 4);
    const trunkGeometry = new CylinderGeometry(0.12, 0.3, 4.4, 6);
    const crownGeometry = new DodecahedronGeometry(0.45, 0);
    // Dead-frond skirt: wide end tucked under the crown, apex hanging down.
    const skirtGeometry = new ConeGeometry(0.52, 1.2, 7);
    skirtGeometry.rotateX(Math.PI);
    // Amber date bunches tucked under the crowns of fruiting bearers.
    const fruitGeometry = new DodecahedronGeometry(0.17, 0);
    this.geometries.push(reedGeometry, trunkGeometry, crownGeometry, skirtGeometry, fruitGeometry);

    // The palm stand: three typed archetypes mixed through the rows plus a
    // grove stand on the Memphis riverfront (Spec 08 §Ecology). Per-palm
    // seeded streams keep every palm self-contained; grove slots that land
    // on the braid are rejected outright, never shuffled.
    const palmSpots: Array<{
      x: number;
      z: number;
      archetype: ReturnType<typeof palmArchetypeAt>;
      rng: () => number;
    }> = [];
    for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
      const rng = mulberry32(`giza:palm-stand:${i}`);
      const x = -108 + (i / (GIZA_ENVIRONMENT.palms - 1)) * 216 + (rng() - 0.5) * 4.5;
      // Palm rows follow the meandering near bank (Spec 08).
      const z = greenbeltInnerEdgeAt(x) + 2.0 + rng() * 14;
      palmSpots.push({ x, z, archetype: palmArchetypeAt(i), rng });
    }
    for (let g = 0; g < GIZA_ENVIRONMENT.memphisGrovePalms; g += 1) {
      const spot = grovePalmAt(g);
      if (!spot) continue;
      palmSpots.push({
        x: spot.x,
        z: spot.z,
        archetype: palmArchetypeAt(10_000 + g),
        rng: mulberry32(`giza:palm-grove:${g}`),
      });
    }
    const frondTotal = palmSpots.reduce(
      (total, spot) => total + spot.archetype.uprightFronds + spot.archetype.droopingFronds,
      0,
    );
    const skirtTotal = palmSpots.filter((spot) => spot.archetype.skirt > 0).length;
    const fruitTotal = palmSpots.filter((spot) => spot.archetype.fruit).length * 2;

    const reeds = new InstancedMesh(reedGeometry, materials.foliage, GIZA_ENVIRONMENT.reedClusters);
    const trunks = new InstancedMesh(trunkGeometry, materials.wood, palmSpots.length);
    const crowns = new InstancedMesh(crownGeometry, materials.foliage, palmSpots.length);
    const skirts = new InstancedMesh(skirtGeometry, materials.wood, Math.max(1, skirtTotal));
    // Sun-cured amber: date bunches read as warm fruit against the crown.
    const fruitMaterial = new MeshStandardMaterial({ color: '#bd7a2c', roughness: 0.75 });
    this.extraMaterials.push(fruitMaterial);
    const fruits = new InstancedMesh(fruitGeometry, fruitMaterial, Math.max(1, fruitTotal));
    const fronds = new InstancedMesh(frondGeometry, materials.foliage, frondTotal);
    const random = mulberry32('giza:river-ecology:v3');
    const matrix = new Matrix4();
    const upperFrondColors = [new Color('#527a3a'), new Color('#5f8442'), new Color('#6d8f4b')];
    const lowerFrondColors = [new Color('#7d8f4b'), new Color('#93914f'), new Color('#a08a52')];

    for (let i = 0; i < GIZA_ENVIRONMENT.reedClusters; i += 1) {
      const nearBank = i % 2 === 0;
      const x = -111 + (i / (GIZA_ENVIRONMENT.reedClusters - 1)) * 222 + (random() - 0.5) * 4;
      const half = riverWidthAt(x) / 2;
      const braid = riverBraidAt(x);
      const z = (nearBank
        ? riverCenterZAt(x) + half + 0.6
        : braid
          ? braid.centerZ - braid.width / 2 - 0.5
          : riverCenterZAt(x) - half - 0.6) + (random() - 0.5) * 1.2;
      const height = 0.65 + random() * 0.7;
      matrix.compose(
        new Vector3(x, height * 0.52, z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI),
        new Vector3(1, height, 1),
      );
      reeds.setMatrixAt(i, matrix);
    }

    let frondCursor = 0;
    let skirtCursor = 0;
    let fruitCursor = 0;
    for (let i = 0; i < palmSpots.length; i += 1) {
      const spot = palmSpots[i]!;
      const { archetype, rng } = spot;
      const height = archetype.height[0] + rng() * (archetype.height[1] - archetype.height[0]);
      // The crown shifts with the trunk's tilt.
      const lean = archetype.lean[0] + rng() * (archetype.lean[1] - archetype.lean[0]);
      const leanAzimuth = rng() * Math.PI * 2;
      const tilt = new Quaternion().setFromEuler(
        new Euler(lean * Math.cos(leanAzimuth), rng() * Math.PI, lean * Math.sin(leanAzimuth), 'YXZ'),
      );
      matrix.compose(new Vector3(spot.x, 2.2 * height, spot.z), tilt, new Vector3(1, height, 1));
      trunks.setMatrixAt(i, matrix);
      const crownX = spot.x + 4.4 * height * Math.sin(lean) * Math.cos(leanAzimuth);
      const crownZ = spot.z + 4.4 * height * Math.sin(lean) * Math.sin(leanAzimuth);
      const crownY = 4.42 * height;
      // Crown girth varies per palm: no two hearts match.
      matrix.compose(
        new Vector3(crownX, crownY, crownZ),
        new Quaternion(),
        new Vector3(1.05 + rng() * 0.45, 0.62 + rng() * 0.28, 1.05 + rng() * 0.45),
      );
      crowns.setMatrixAt(i, matrix);
      if (archetype.skirt > 0) {
        matrix.compose(
          new Vector3(crownX, crownY - 0.62 * height * archetype.skirt, crownZ),
          new Quaternion(),
          new Vector3(archetype.skirt, height * (0.8 + archetype.skirt * 0.3), archetype.skirt),
        );
        skirts.setMatrixAt(skirtCursor, matrix);
        skirtCursor += 1;
      }
      if (archetype.fruit) {
        const around = rng() * Math.PI * 2;
        for (const cluster of [0, 2.3] as const) {
          matrix.compose(
            new Vector3(
              crownX + Math.cos(around + cluster) * 0.38,
              crownY - 0.34 * height,
              crownZ + Math.sin(around + cluster) * 0.38,
            ),
            new Quaternion(),
            new Vector3(1, 1.3, 1),
          );
          fruits.setMatrixAt(fruitCursor, matrix);
          fruitCursor += 1;
        }
      }
      // Two frond tiers: an upright young crown and a drooping older row,
      // each with its own color range (drier below). Counts come from the
      // archetype — a young palm carries almost no drooping tier.
      const frondSpecs: (typeof this.palmSway)[number]['fronds'] = [];
      const tiers: Array<{ count: number; upper: boolean }> = [
        { count: archetype.uprightFronds, upper: true },
        { count: archetype.droopingFronds, upper: false },
      ];
      for (const tier of tiers) {
        for (let frond = 0; frond < tier.count; frond += 1) {
          const yaw = (frond / Math.max(1, tier.count)) * Math.PI * 2 + (tier.upper ? 0 : 0.63) + rng() * 0.22;
          const droop = tier.upper ? -(0.3 + rng() * 0.16) : -(0.72 + rng() * 0.2);
          const length = (tier.upper ? 3.6 + rng() * 0.9 : 2.6 + rng() * 0.7) * Math.min(1, height);
          const width = 0.3 + rng() * 0.14;
          frondSpecs.push({ yaw, droop, length, width, phase: rng() * Math.PI * 2 });
          fronds.setColorAt(
            frondCursor,
            (tier.upper ? upperFrondColors : lowerFrondColors)[Math.floor(rng() * 3)]!,
          );
          frondCursor += 1;
        }
      }
      this.palmSway.push({ crownX, crownY, crownZ, fronds: frondSpecs });
    }
    // Draw only placed instances: archetypes vary the counts per palm.
    skirts.count = skirtCursor;
    fruits.count = fruitCursor;
    this.palmFronds = fronds;
    // Frond matrices sway every frame; opt out of the stale-bounds cull.
    fronds.frustumCulled = false;
    this.updatePalms(0);
    reeds.name = 'nile-bank-reed-clusters';
    trunks.name = 'greenbelt-palm-trunks';
    crowns.name = 'greenbelt-palm-hearts';
    skirts.name = 'greenbelt-palm-dead-frond-skirts';
    fruits.name = 'greenbelt-date-fruit-clusters';
    fronds.name = 'greenbelt-individual-palm-fronds';
    trunks.castShadow = true;
    crowns.castShadow = true;
    fronds.castShadow = true;
    fruits.castShadow = false;
    this.group.add(reeds, trunks, crowns, skirts, fruits, fronds);
  }

  /** Gentle frond sway in the northerly breeze; a pure function of t. */
  private updatePalms(t: number): void {
    if (!this.palmFronds) return;
    const matrix = new Matrix4();
    let cursor = 0;
    for (const palm of this.palmSway) {
      for (const frond of palm.fronds) {
        const sway = 0.055 * Math.sin(Math.PI * 2 * t * 10 + frond.phase);
        const rotation = new Quaternion().setFromEuler(
          new Euler(0, frond.yaw, frond.droop + sway, 'YXZ'),
        );
        matrix.compose(
          new Vector3(
            palm.crownX + Math.cos(frond.yaw) * 1.35,
            palm.crownY + 0.15,
            palm.crownZ + Math.sin(frond.yaw) * 1.35,
          ),
          rotation,
          new Vector3(frond.length, 0.08, frond.width),
        );
        this.palmFronds.setMatrixAt(cursor, matrix);
        cursor += 1;
      }
    }
    this.palmFronds.instanceMatrix.needsUpdate = true;
  }

  /**
   * Crescent/papyriform hull: bow and stern rise above midships, as on Old
   * Kingdom wooden and bundled-reed craft. Built from gunwale/keel stations
   * with a flat deck strip; the ends taper to near-points.
   */
  private crescentHullGeometry(options: {
    halfLength: number;
    halfBeam: number;
    /** Gunwale height amidships (hull-local y). */
    midSheer: number;
    /** Gunwale height at bow/stern — the crescent rise. */
    endRise: number;
    /** Bottom depth amidships (negative, below the local origin). */
    keelDepth: number;
    stations?: number;
  }): BufferGeometry {
    const stations = options.stations ?? 10;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= stations; i += 1) {
      const v = (i / stations) * 2 - 1; // -1 stern .. +1 bow
      const x = v * options.halfLength;
      const lift = v * v;
      const beam = Math.max(0.04, options.halfBeam * Math.pow(1 - lift, 0.7));
      const sheerY = options.midSheer + (options.endRise - options.midSheer) * lift;
      const bottomY = options.keelDepth + (options.endRise * 0.88 - options.keelDepth) * lift;
      positions.push(x, sheerY, beam, x, bottomY, 0, x, sheerY, -beam);
      if (i > 0) {
        const a = (i - 1) * 3; // previous station: port, keel, starboard
        const b = i * 3;
        indices.push(
          a, a + 1, b, a + 1, b + 1, b, // port side (+z)
          a + 2, b + 2, a + 1, b + 2, b + 1, a + 1, // starboard side (-z)
          a, b, a + 2, b, b + 2, a + 2, // deck (up)
        );
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  /** Quarter steering oar: shaft with a flattened blade, pivot at origin. */
  private steeringOarGeometry(): BufferGeometry {
    const shaft = new CylinderGeometry(0.04, 0.055, 2.3, 5);
    shaft.translate(0, -0.05, 0); // handle above the pivot, loom below
    const blade = new BoxGeometry(0.05, 0.8, 0.3);
    blade.translate(0, -1.55, 0);
    const parts = [shaft, blade];
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    let offset = 0;
    for (const part of parts) {
      const position = part.getAttribute('position');
      const normal = part.getAttribute('normal');
      for (let i = 0; i < position.count; i += 1) {
        positions.push(position.getX(i), position.getY(i), position.getZ(i));
        normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      }
      const index = part.getIndex()!;
      for (let i = 0; i < index.count; i += 1) indices.push(index.getX(i) + offset);
      offset += position.count;
      part.dispose();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    return geometry;
  }

  private addRiverBoats(materials: MaterialLibrary): void {
    // Era-correct river traffic from the typed hydrology description (Spec 08):
    // crescent/papyriform hulls with bow and stern raised above midships,
    // bipod (A-frame) masts with the tall square sail laced between an upper
    // yard and a lower boom, and large quarter steering oars at the stern —
    // the most recognizable Old Kingdom silhouette features.
    const fleet = GIZA_ENVIRONMENT.riverCraft;
    const totalBoats = fleet.reduce((total, craft) => total + craft.count, 0);
    const sailCount = fleet
      .filter((craft) => craft.squareSail)
      .reduce((total, craft) => total + craft.count, 0);
    const skiffCount = fleet
      .filter((craft) => craft.kind === 'reed-skiff')
      .reduce((total, craft) => total + craft.count, 0);
    const woodenCount = totalBoats - skiffCount;
    const cargoBarges = fleet.filter((craft) => craft.cargo === 'tura-casing-stones');
    const cargoCount = cargoBarges.reduce((total, craft) => total + craft.count, 0) * 4;
    const bundleCount = fleet
      .filter((craft) => craft.cargo === 'reed-bundles')
      .reduce((total, craft) => total + craft.count, 0) * 3;
    const oarCount = woodenCount * 2 + skiffCount;

    // Wooden hulls: a gentle crescent sheer (ends rise ~0.4 over midships).
    const hullGeometry = this.crescentHullGeometry({
      halfLength: 2.3,
      halfBeam: 0.72,
      midSheer: 0.16,
      endRise: 0.58,
      keelDepth: -0.5,
    });
    // Papyrus skiff: narrow beam with dramatically raised, tied-up ends.
    const reedHullGeometry = this.crescentHullGeometry({
      halfLength: 1.7,
      halfBeam: 0.42,
      midSheer: 0.1,
      endRise: 0.92,
      keelDepth: -0.26,
    });
    // Old Kingdom square sails were taller than wide; the sail is laced
    // between the upper yard and the lower boom. Segmented so the cloth-sway
    // vertex displacement has a grid to belly (Spec 06 §Materials).
    const sailGeometry = new BoxGeometry(0.06, 2.55, 1.55, 1, 8, 6);
    const yardGeometry = new CylinderGeometry(0.04, 0.04, 1.9, 5);
    yardGeometry.rotateX(Math.PI / 2);
    const boomGeometry = new CylinderGeometry(0.035, 0.035, 1.6, 5);
    boomGeometry.rotateX(Math.PI / 2);
    // Bipod mast leg, unit height with its foot at the origin (scaled per
    // instance to reach the apex).
    const mastLegGeometry = new CylinderGeometry(0.05, 0.065, 1, 5);
    mastLegGeometry.translate(0, 0.5, 0);
    const oarGeometry = this.steeringOarGeometry();
    const cargoGeometry = new BoxGeometry(1, 1, 1);
    // Tied reed bundles, lying along the hull axis.
    const bundleGeometry = new CylinderGeometry(0.13, 0.13, 1.5, 6);
    bundleGeometry.rotateZ(Math.PI / 2);
    this.geometries.push(
      hullGeometry,
      reedHullGeometry,
      sailGeometry,
      yardGeometry,
      boomGeometry,
      mastLegGeometry,
      oarGeometry,
      cargoGeometry,
      bundleGeometry,
    );

    const hulls = new InstancedMesh(hullGeometry, materials.wood, woodenCount);
    // Straw-toned bound papyrus: the tan accent reads as dried reed.
    const reedHulls = new InstancedMesh(reedHullGeometry, materials.cityAccent, skiffCount);
    const masts = new InstancedMesh(mastLegGeometry, materials.wood, sailCount * 2);
    const yards = new InstancedMesh(yardGeometry, materials.wood, sailCount);
    const booms = new InstancedMesh(boomGeometry, materials.wood, sailCount);
    // Sails belly in the breeze on a dedicated linen clone; the shared
    // library linen on worker clothing stays still (Spec 06).
    const sailCloth = materials.linen.clone();
    applyClothSway(sailCloth, 'sail');
    this.clothMaterials.push(sailCloth);
    const sails = new InstancedMesh(sailGeometry, sailCloth, sailCount);
    const oars = new InstancedMesh(oarGeometry, materials.wood, oarCount);
    const cargo = new InstancedMesh(cargoGeometry, materials.block['casing-limestone'], cargoCount);
    const bundles = new InstancedMesh(bundleGeometry, materials.cityAccent, bundleCount);

    this.boatFleet = { hulls, reedHulls, masts, yards, booms, sails, oars, cargo, bundles };
    // Fleet matrices are rewritten every frame; the first-render bounds cache
    // would camera-cull the boats while their shadows persist (see BlockSystem).
    for (const item of Object.values(this.boatFleet)) item.frustumCulled = false;
    let globalIndex = 0;
    for (const craft of fleet) {
      for (let unit = 0; unit < craft.count; unit += 1) {
        this.boats.push({ craft, globalIndex, scale: 1 });
        globalIndex += 1;
      }
    }
    this.updateBoats(0);
    hulls.name = 'nile-wooden-hulls';
    reedHulls.name = 'nile-papyrus-skiff-hulls';
    masts.name = 'nile-bipod-mast-legs';
    yards.name = 'nile-square-sail-yards';
    booms.name = 'nile-square-sail-booms';
    sails.name = 'nile-square-linen-sails';
    oars.name = 'nile-quarter-steering-oars';
    cargo.name = 'nile-barge-tura-casing-cargo';
    bundles.name = 'nile-skiff-reed-bundle-cargo';
    this.group.add(hulls, reedHulls, masts, yards, booms, sails, oars, cargo, bundles);
  }

  /** Boat drift, bob, and roll — all pure functions of playback t (Spec 08). */
  private updateBoats(t: number): void {
    if (!this.boatFleet) return;
    const { hulls, reedHulls, masts, yards, booms, sails, oars, cargo, bundles } = this.boatFleet;
    const matrix = new Matrix4();
    const up = new Vector3(0, 1, 0);
    const down = new Vector3(0, -1, 0);
    let hullIndex = 0;
    let skiffIndex = 0;
    let sailIndex = 0;
    let oarIndex = 0;
    let cargoIndex = 0;
    let bundleIndex = 0;
    for (const boat of this.boats) {
      const state = riverCraftStateAt(boat.craft, boat.globalIndex, t);
      const rotation = new Quaternion().setFromEuler(
        new Euler(state.roll, state.yaw, 0, 'YXZ'),
      );
      const origin = new Vector3(state.x, state.bobY, state.z);
      const isSkiff = boat.craft.kind === 'reed-skiff';
      // Boat-local point -> world (rotation about the hull origin).
      const place = (local: Vector3) => local.clone().applyQuaternion(rotation).add(origin);
      if (isSkiff) {
        matrix.compose(origin, rotation, new Vector3(boat.scale, boat.scale, boat.scale));
        reedHulls.setMatrixAt(skiffIndex, matrix);
        skiffIndex += 1;
      } else {
        matrix.compose(
          origin,
          rotation,
          new Vector3(1.4 * boat.scale, boat.scale, 1.15 * boat.scale),
        );
        hulls.setMatrixAt(hullIndex, matrix);
        hullIndex += 1;
      }
      if (boat.craft.squareSail) {
        // Bipod (A-frame) mast: two legs from the deck to a centerline apex.
        const apex = new Vector3(0.15, 3.5, 0);
        for (const side of [-1, 1]) {
          const foot = new Vector3(0.15, 0.12, 0.52 * side);
          const direction = apex.clone().sub(foot).normalize();
          const legRotation = rotation
            .clone()
            .multiply(new Quaternion().setFromUnitVectors(up, direction));
          matrix.compose(place(foot), legRotation, new Vector3(1, 3.44, 1));
          masts.setMatrixAt(sailIndex * 2 + (side + 1) / 2, matrix);
        }
        // Square sail laced between the upper yard and the lower boom.
        matrix.compose(place(new Vector3(0.15, 3.42, 0)), rotation, new Vector3(1, 1, 1));
        yards.setMatrixAt(sailIndex, matrix);
        matrix.compose(place(new Vector3(0.15, 0.72, 0)), rotation, new Vector3(1, 1, 1));
        booms.setMatrixAt(sailIndex, matrix);
        matrix.compose(place(new Vector3(0.15, 2.07, 0)), rotation, new Vector3(1, 1, 1));
        sails.setMatrixAt(sailIndex, matrix);
        sailIndex += 1;
      }
      // Quarter steering oars mounted on the raised stern quarters, blades
      // dipping into the water, handles leaning inboard over the deck.
      const oarSides = isSkiff ? [1] : [-1, 1];
      const oarPivotX = isSkiff ? -1.35 : -1.85;
      const oarPivotY = isSkiff ? 0.62 : 0.5;
      const oarPivotZ = isSkiff ? 0.28 : 0.5;
      for (const side of oarSides) {
        const direction = new Vector3(-0.78, -0.72, 0.28 * side).normalize();
        const oarRotation = rotation
          .clone()
          .multiply(new Quaternion().setFromUnitVectors(down, direction));
        matrix.compose(
          place(new Vector3(oarPivotX, oarPivotY, oarPivotZ * side)),
          oarRotation,
          new Vector3(1, 1, 1),
        );
        oars.setMatrixAt(oarIndex, matrix);
        oarIndex += 1;
      }
      if (boat.craft.cargo === 'tura-casing-stones') {
        for (let block = 0; block < 4; block += 1) {
          matrix.compose(
            place(new Vector3(-1.25 + block * 0.85, 0.37, block % 2 === 0 ? 0.14 : -0.14)),
            rotation,
            new Vector3(0.78, 0.42, 0.6),
          );
          cargo.setMatrixAt(cargoIndex, matrix);
          cargoIndex += 1;
        }
      }
      if (boat.craft.cargo === 'reed-bundles') {
        for (const local of [
          new Vector3(-0.1, 0.24, -0.15),
          new Vector3(0.1, 0.24, 0.15),
          new Vector3(0, 0.46, 0),
        ]) {
          matrix.compose(place(local), rotation, new Vector3(1, 1, 1));
          bundles.setMatrixAt(bundleIndex, matrix);
          bundleIndex += 1;
        }
      }
    }
    hulls.instanceMatrix.needsUpdate = true;
    reedHulls.instanceMatrix.needsUpdate = true;
    masts.instanceMatrix.needsUpdate = true;
    yards.instanceMatrix.needsUpdate = true;
    booms.instanceMatrix.needsUpdate = true;
    sails.instanceMatrix.needsUpdate = true;
    oars.instanceMatrix.needsUpdate = true;
    cargo.instanceMatrix.needsUpdate = true;
    bundles.instanceMatrix.needsUpdate = true;
  }

  private addDistantCity(materials: MaterialLibrary, cityGeometry: BoxGeometry): void {
    // Memphis (Ineb-Hedj, "White Walls"), the Old Kingdom capital, across the
    // river toward the south-east. Mud-brick homes, flat reed roofs, domed
    // granaries, whitewashed walls, pylons, and obelisks; the settlement
    // description's anachronism exclusions are enforced by contract tests.
    const { settlement } = GIZA_ENVIRONMENT;
    const [anchorX, , anchorZ] = settlement.anchor;
    const city = new InstancedMesh(cityGeometry, materials.city, GIZA_ENVIRONMENT.cityBuildings);
    const roofs = new InstancedMesh(cityGeometry, materials.cityRoof, GIZA_ENVIRONMENT.cityRoofs);
    const siloGeometry = new CylinderGeometry(0.5, 0.62, 1, 8);
    const domeGeometry = new SphereGeometry(0.62, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const obeliskGeometry = new CylinderGeometry(0.14, 0.34, 6.2, 4);
    const pyramidionGeometry = new ConeGeometry(0.28, 0.42, 4);
    this.geometries.push(siloGeometry, domeGeometry, obeliskGeometry, pyramidionGeometry);
    const silos = new InstancedMesh(siloGeometry, materials.cityAccent, 24);
    const domes = new InstancedMesh(domeGeometry, materials.cityRoof, 24);
    const cityRandom = mulberry32('giza:distant-city:v2');
    const matrix = new Matrix4();
    const roofSpecs: Array<{ x: number; y: number; z: number; width: number; depth: number }> = [];
    for (let i = 0; i < GIZA_ENVIRONMENT.cityBuildings; i += 1) {
      const row = Math.floor(i / 28);
      const x = anchorX - 62 + (i % 28) * 5.6 + (cityRandom() - 0.5) * 1.7;
      const z = anchorZ + 8 - row * 6.4 - cityRandom() * 2.3;
      // Mud-brick Memphis stayed low; pylons and obelisks carry the skyline.
      const height = 1.8 + cityRandom() * (row < 2 ? 2.4 : 3.2);
      const width = 3.1 + cityRandom() * 2.6;
      const depth = 3 + cityRandom() * 2.2;
      matrix.compose(new Vector3(x, height / 2, z), new Quaternion(), new Vector3(width, height, depth));
      city.setMatrixAt(i, matrix);
      if (roofSpecs.length < GIZA_ENVIRONMENT.cityRoofs) roofSpecs.push({ x, y: height, z, width, depth });
    }
    for (let i = 0; i < roofSpecs.length; i += 1) {
      const spec = roofSpecs[i]!;
      matrix.compose(
        new Vector3(spec.x, spec.y + 0.13, spec.z),
        new Quaternion(),
        new Vector3(spec.width * 1.08, 0.25, spec.depth * 1.08),
      );
      roofs.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < 24; i += 1) {
      const x = anchorX - 58 + i * 6.8;
      const z = anchorZ + 6.5 - (i % 3) * 4.4;
      const height = 3.3 + (i % 4) * 0.7;
      matrix.compose(new Vector3(x, height / 2, z), new Quaternion(), new Vector3(2.2, height, 2.2));
      silos.setMatrixAt(i, matrix);
      matrix.compose(new Vector3(x, height + 0.02, z), new Quaternion(), new Vector3(1.75, 1, 1.75));
      domes.setMatrixAt(i, matrix);
    }
    // Whitewashed riverfront wall with corner bastions and a long quay
    // platform: the waterfront reads as a working harbor edge, not a fence.
    const walls = new InstancedMesh(cityGeometry, materials.whitewash, 48);
    for (let i = 0; i < 42; i += 1) {
      matrix.compose(
        new Vector3(anchorX - 66 + i * 4.0, 1.1 + (i % 7 === 0 ? 0.7 : 0), anchorZ + 10.5),
        new Quaternion(),
        new Vector3(3.7, 2.2 + (i % 7 === 0 ? 1.4 : 0), 1.1),
      );
      walls.setMatrixAt(i, matrix);
    }
    for (let bastion = 0; bastion < 5; bastion += 1) {
      matrix.compose(
        new Vector3(anchorX - 66 + bastion * 41, 2.1, anchorZ + 10.5),
        new Quaternion(),
        new Vector3(2.6, 4.2, 1.7),
      );
      walls.setMatrixAt(42 + bastion, matrix);
    }
    matrix.compose(
      new Vector3(anchorX - 2, 0.26, anchorZ + 12.6),
      new Quaternion(),
      new Vector3(118, 0.52, 2.4),
    );
    walls.setMatrixAt(47, matrix);
    // Two temple gate pairs carry the skyline: the Ptah enclosure and a
    // smaller sanctuary gate to the west (Spec 08).
    const pylons = new InstancedMesh(cityGeometry, materials.cityAccent, 6);
    const pylonCenter = { x: anchorX + 14, z: anchorZ + 2 };
    matrix.compose(
      new Vector3(pylonCenter.x, 2.7, pylonCenter.z - 3.1),
      new Quaternion(),
      new Vector3(3.2, 5.4, 1.8),
    );
    pylons.setMatrixAt(0, matrix);
    matrix.compose(
      new Vector3(pylonCenter.x, 2.7, pylonCenter.z + 3.1),
      new Quaternion(),
      new Vector3(3.2, 5.4, 1.8),
    );
    pylons.setMatrixAt(1, matrix);
    matrix.compose(
      new Vector3(pylonCenter.x, 4.9, pylonCenter.z),
      new Quaternion(),
      new Vector3(2.4, 1, 4.6),
    );
    pylons.setMatrixAt(2, matrix);
    const westGate = { x: anchorX - 38, z: anchorZ - 6 };
    matrix.compose(
      new Vector3(westGate.x, 2.1, westGate.z - 2.4),
      new Quaternion(),
      new Vector3(2.6, 4.2, 1.5),
    );
    pylons.setMatrixAt(3, matrix);
    matrix.compose(
      new Vector3(westGate.x, 2.1, westGate.z + 2.4),
      new Quaternion(),
      new Vector3(2.6, 4.2, 1.5),
    );
    pylons.setMatrixAt(4, matrix);
    matrix.compose(
      new Vector3(westGate.x, 3.8, westGate.z),
      new Quaternion(),
      new Vector3(1.9, 0.8, 3.7),
    );
    pylons.setMatrixAt(5, matrix);
    const obelisks = new InstancedMesh(obeliskGeometry, materials.cityAccent, 5);
    const pyramidions = new InstancedMesh(pyramidionGeometry, materials.whitewash, 5);
    const obeliskYaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
    for (let i = 0; i < 5; i += 1) {
      const x = anchorX + 4 + i * 3.4;
      const z = anchorZ - 2 - (i % 2) * 3;
      matrix.compose(new Vector3(x, 3.1, z), obeliskYaw, new Vector3(1, 1, 1));
      obelisks.setMatrixAt(i, matrix);
      matrix.compose(new Vector3(x, 6.41, z), obeliskYaw, new Vector3(1, 1, 1));
      pyramidions.setMatrixAt(i, matrix);
    }
    city.name = 'memphis-mud-brick-homes';
    roofs.name = 'memphis-flat-reed-roofs';
    silos.name = 'memphis-granary-bodies';
    domes.name = 'memphis-domed-granaries';
    walls.name = 'memphis-whitewashed-riverfront-walls';
    pylons.name = 'memphis-temple-pylons';
    obelisks.name = 'memphis-obelisks';
    pyramidions.name = 'memphis-obelisk-pyramidions';
    this.group.add(city, roofs, silos, domes, walls, pylons, obelisks, pyramidions);
  }

  private addFixedHorizonTerrain(materials: MaterialLibrary): void {
    const { horizon } = GIZA_ENVIRONMENT;
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    for (let ringIndex = 0; ringIndex < horizon.rings.length; ringIndex += 1) {
      const ring = horizon.rings[ringIndex]!;
      const ringColor = new Color(ring.color);
      for (const sample of horizon.samples) {
        vertices.push(
          horizon.center[0] + Math.cos(sample.angle) * ring.radius,
          ring.baseY + sample.ridgeHeight * ring.heightScale,
          horizon.center[1] + Math.sin(sample.angle) * ring.radius,
        );
        // Blend the ring's base color toward the sector tint so the eastern
        // hills read rockier and the western dunes softer (Spec 08).
        const color = ringColor.clone().lerp(new Color(sample.tint), 0.45);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let ringIndex = 0; ringIndex < horizon.rings.length - 1; ringIndex += 1) {
      const current = ringIndex * horizon.radialSegments;
      const next = (ringIndex + 1) * horizon.radialSegments;
      for (let segment = 0; segment < horizon.radialSegments; segment += 1) {
        const following = (segment + 1) % horizon.radialSegments;
        indices.push(
          current + segment,
          next + segment,
          current + following,
          current + following,
          next + segment,
          next + following,
        );
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.geometries.push(geometry);
    const terrain = new Mesh(geometry, materials.horizon);
    terrain.name = 'fixed-continuous-desert-ridge-horizon';
    terrain.receiveShadow = false;
    terrain.castShadow = false;
    this.group.add(terrain);
  }

  /**
   * Nearest ground clear of masonry, earthworks, and haul lanes. Props that
   * would otherwise grow through a ramp or block a sled lane are nudged out
   * (Spec 08 §Physical plausibility). Deterministic — pure geometry applied to
   * already-seeded positions.
   */
  private clear(x: number, z: number, margin: number, lane = 0): [number, number] {
    return pushOutOfSiteWorks(x, z, this.keepOuts, this.corridors, {
      margin,
      corridorClearance: lane,
    });
  }

  private addSettlement(materials: MaterialLibrary): void {
    // Height-segmented cone: the tent-canvas breathing needs mid rings to
    // displace (Spec 06 §Materials).
    const tentGeometry = new ConeGeometry(1, 1, 4, 4);
    const crateGeometry = new BoxGeometry(1, 1, 1);
    // Real-size shade cloth with a flutter grid, drawn at unit scale (the
    // sway displacement is authored in world units).
    const awningGeometry = new BoxGeometry(5.4, 0.12, 3.4, 8, 1, 8);
    const poleGeometry = new CylinderGeometry(0.05, 0.07, 2.5, 5);
    this.geometries.push(tentGeometry, crateGeometry, awningGeometry, poleGeometry);
    const tentCloth = materials.linen.clone();
    applyClothSway(tentCloth, 'tent');
    const awningCloth = materials.linen.clone();
    applyClothSway(awningCloth, 'awning');
    this.clothMaterials.push(tentCloth, awningCloth);
    const tents = new InstancedMesh(tentGeometry, tentCloth, 27);
    const supplies = new InstancedMesh(crateGeometry, materials.wood, 72);
    const shadeCloths = new InstancedMesh(awningGeometry, awningCloth, 12);
    const shadePoles = new InstancedMesh(poleGeometry, materials.wood, 48);
    const random = mulberry32('giza:worker-settlement');
    const matrix = new Matrix4();
    for (let i = 0; i < 27; i += 1) {
      const [x, z] = this.clear(
        -36 + (i % 9) * 10 + (random() - 0.5) * 1.6,
        39 + Math.floor(i / 9) * 8 + (random() - 0.5) * 1.5,
        2.2,
        4.2,
      );
      matrix.compose(new Vector3(x, 1.35, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4), new Vector3(3, 2.7, 3));
      tents.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < 72; i += 1) {
      const [x, z] = this.clear(
        -42 + random() * 88,
        31 + random() * 36,
        0.9,
        2.8,
      );
      matrix.compose(new Vector3(x, 0.38, z), new Quaternion(), new Vector3(0.8, 0.75, 0.8));
      supplies.setMatrixAt(i, matrix);
    }
    let poleCursor = 0;
    for (let i = 0; i < 12; i += 1) {
      const [x, z] = this.clear(
        -34 + (i % 6) * 15,
        30 + Math.floor(i / 6) * 11,
        3.2,
        5,
      );
      matrix.compose(new Vector3(x, 2.35, z), new Quaternion(), new Vector3(1, 1, 1));
      shadeCloths.setMatrixAt(i, matrix);
      for (const [dx, dz] of [[-2.35, -1.35], [2.35, -1.35], [-2.35, 1.35], [2.35, 1.35]] as const) {
        matrix.compose(new Vector3(x + dx, 1.25, z + dz), new Quaternion(), new Vector3(1, 1, 1));
        shadePoles.setMatrixAt(poleCursor, matrix);
        poleCursor += 1;
      }
    }
    for (const item of [tents, supplies, shadeCloths, shadePoles]) item.castShadow = true;
    tents.name = 'worker-settlement-tents';
    supplies.name = 'worker-settlement-supplies';
    shadeCloths.name = 'worker-settlement-shade-cloths';
    shadePoles.name = 'worker-settlement-shade-poles';
    this.group.add(tents, supplies, shadeCloths, shadePoles);
  }

  /**
   * Dusk campfires for the worker settlement: stone-ringed pits with charred
   * logs and an emissive flame, dark through the workday and lit as the light
   * fails. Three instanced batches (stones, logs, flames) plus two point
   * lights shared between pit clusters — one light per fire would recompile
   * every lit material and tax every fragment.
   */
  private addCampfires(materials: MaterialLibrary): void {
    const stoneGeometry = new DodecahedronGeometry(0.5, 0);
    const logGeometry = new CylinderGeometry(0.055, 0.07, 0.9, 5);
    const flameGeometry = new ConeGeometry(0.24, 0.62, 6);
    this.geometries.push(stoneGeometry, logGeometry, flameGeometry);

    // Pits tuck between the tent rows (x∈[-36,44], z∈[39,55]); the site
    // clearance nudge keeps them off haul corridors and footprints (Spec 08).
    const random = mulberry32('giza:campfires:v1');
    const matrix = new Matrix4();
    const pits: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 5; i += 1) {
      const [x, z] = this.clear(
        -32 + i * 16 + (random() - 0.5) * 4,
        42.5 + (i % 2) * 7 + (random() - 0.5) * 3,
        1.4,
        3.2,
      );
      pits.push({ x, z });
    }

    const stonesPerPit = 8;
    const stones = new InstancedMesh(stoneGeometry, materials.quarryCut, pits.length * stonesPerPit);
    const logs = new InstancedMesh(logGeometry, materials.wood, pits.length * 2);
    const char = new Color('#241408');
    let stoneCursor = 0;
    let logCursor = 0;
    for (const pit of pits) {
      for (let s = 0; s < stonesPerPit; s += 1) {
        const angle = (s / stonesPerPit) * Math.PI * 2 + random() * 0.3;
        const radius = 0.48 + random() * 0.09;
        const size = 0.19 + random() * 0.1;
        matrix.compose(
          new Vector3(pit.x + Math.cos(angle) * radius, size * 0.3, pit.z + Math.sin(angle) * radius),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI),
          new Vector3(size * 1.3, size * 0.7, size),
        );
        stones.setMatrixAt(stoneCursor, matrix);
        stoneCursor += 1;
      }
      for (let l = 0; l < 2; l += 1) {
        matrix.compose(
          new Vector3(pit.x + (random() - 0.5) * 0.16, 0.07, pit.z + (random() - 0.5) * 0.16),
          new Quaternion().setFromEuler(new Euler(Math.PI / 2 - 0.12, random() * Math.PI, 0, 'YXZ')),
          new Vector3(1, 1, 1),
        );
        logs.setMatrixAt(logCursor, matrix);
        logs.setColorAt(logCursor, char);
        logCursor += 1;
      }
    }
    stones.castShadow = true;
    stones.receiveShadow = true;
    logs.castShadow = true;
    stones.name = 'campfire-ring-stones';
    logs.name = 'campfire-charred-logs';

    // The flame material is local to this class (the MaterialLibrary owns
    // only shared materials), so dispose() below owns it too.
    const flameMaterial = new MeshStandardMaterial({
      color: '#3a1d08',
      emissive: '#ff7a2a',
      emissiveIntensity: 0,
      roughness: 1,
    });
    const flamesPerPit = 2; // an outer tongue and a smaller, brighter core
    const flames = new InstancedMesh(flameGeometry, flameMaterial, pits.length * flamesPerPit);
    const bases: Array<{ x: number; z: number; scale: number; yaw: number }> = [];
    for (const pit of pits) {
      for (let layer = 0; layer < flamesPerPit; layer += 1) {
        bases.push({
          x: pit.x + (layer === 0 ? 0 : (random() - 0.5) * 0.08),
          z: pit.z + (layer === 0 ? 0 : (random() - 0.5) * 0.08),
          scale: layer === 0 ? 1 : 0.55,
          yaw: random() * Math.PI,
        });
      }
    }
    // Flame matrices are rewritten every frame for the flicker; opt out of
    // the stale-bounds cull (first-render bounds would be near-zero scale).
    flames.frustumCulled = false;
    flames.name = 'campfire-flames';

    const sorted = [...pits].sort((a, b) => a.x - b.x);
    const half = Math.ceil(sorted.length / 2);
    const lights = [sorted.slice(0, half), sorted.slice(half)].map((cluster, index) => {
      const cx = cluster.reduce((sum, pit) => sum + pit.x, 0) / cluster.length;
      const cz = cluster.reduce((sum, pit) => sum + pit.z, 0) / cluster.length;
      const light = new PointLight('#ff8c3f', 0, 16, 2);
      light.position.set(cx, 1.1, cz);
      light.name = `campfire-light-${index}`;
      return light;
    });

    // Unwritten instances keep the identity matrix and render at the world
    // origin (inside Khufu), so park every flame at zero height until the
    // first update writes the real flicker matrices.
    for (let i = 0; i < bases.length; i += 1) {
      matrix.compose(
        new Vector3(bases[i]!.x, 0.08, bases[i]!.z),
        new Quaternion(),
        new Vector3(0.02, 0.02, 0.02),
      );
      flames.setMatrixAt(i, matrix);
    }

    this.group.add(stones, logs, flames, ...lights);
    this.campfires = { flames, flameMaterial, lights, bases };
  }

  /** Dusk ramp plus deterministic flicker; a pure function of playback t. */
  private updateCampfires(t: number, light: LightState, sky: SkyKeyframe): void {
    const fires = this.campfires;
    if (!fires) return;
    // light.emissive is the engine's night ramp, but it only advances for
    // endsAtNight wonders — Giza clamps its day at the t=0.9 dusk keyframe
    // and holds emissive at 0, so the camp reads dusk off the sky axis.
    const dusk = smoothstep((Math.max(light.emissive, sky.t) - 0.74) / 0.13);
    // Bright enough to clear the bloom threshold: the glow halo is what
    // carries a half-meter flame at reveal distance.
    fires.flameMaterial.emissiveIntensity =
      dusk * (6.5 + 1.4 * Math.sin(t * 811.3) + 0.8 * Math.sin(t * 1427.9));
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    for (let i = 0; i < fires.bases.length; i += 1) {
      const base = fires.bases[i]!;
      // Incommensurate frequencies keep the flame from metronoming.
      const flicker =
        1 +
        0.16 * Math.sin(t * 900 + i * 7.3) +
        0.09 * Math.sin(t * 1537 + i * 3.1) +
        0.05 * Math.sin(t * 2311 + i * 11.7);
      const height = base.scale * Math.max(0.02, dusk) * flicker;
      matrix.compose(
        new Vector3(base.x, 0.08 + 0.31 * height, base.z),
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), base.yaw),
        new Vector3(base.scale * (0.4 + 0.6 * dusk), height, base.scale * (0.4 + 0.6 * dusk)),
      );
      fires.flames.setMatrixAt(i, matrix);
    }
    fires.flames.instanceMatrix.needsUpdate = true;
    fires.lights.forEach((pointLight, index) => {
      pointLight.intensity = dusk * (16 + 4 * Math.sin(t * 1031 + index * 9.4));
    });
  }

  /**
   * Shallow wind-blown dust riding the typed lanes (WIND_DUST): sparse
   * translucent puffs drifting south with the northerly breeze. Per-instance
   * opacity is not available on one material, so the lane-end fade pinches
   * the puff scale to zero instead — the wrap is invisible at baseOpacity.
   */
  private addWindDust(materials: MaterialLibrary): void {
    const puffCount = WIND_DUST.lanes.length * WIND_DUST.puffsPerLane;
    const geometry = new SphereGeometry(0.5, 8, 5);
    this.geometries.push(geometry);
    const material = materials.sand.clone();
    material.transparent = true;
    material.opacity = WIND_DUST.baseOpacity;
    material.depthWrite = false;
    const puffs = new InstancedMesh(geometry, material, puffCount);
    puffs.castShadow = false;
    puffs.receiveShadow = false;
    // Matrices are rewritten every frame; opt out of the stale-bounds cull.
    puffs.frustumCulled = false;
    puffs.name = 'giza-wind-dust-puffs';
    this.windDust = { puffs, material };
    this.updateWindDust(0);
    this.group.add(puffs);
  }

  /** Dust drift, wander, and lane-end fades — pure functions of t (Spec 08). */
  private updateWindDust(t: number): void {
    if (!this.windDust) return;
    const puffCount = WIND_DUST.lanes.length * WIND_DUST.puffsPerLane;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    for (let i = 0; i < puffCount; i += 1) {
      const state = windDustPuffAt(i, t);
      matrix.compose(
        new Vector3(state.x, state.y, state.z),
        quaternion,
        new Vector3(
          state.scaleX * state.fade,
          state.scaleY * state.fade,
          state.scaleZ * state.fade,
        ),
      );
      this.windDust.puffs.setMatrixAt(i, matrix);
    }
    this.windDust.puffs.instanceMatrix.needsUpdate = true;
  }

  /**
   * The egret flock working the Nile bend (BIRD_FLOCK): one instanced batch
   * of bodies, one of wings. Each wing's geometry is rooted at the shoulder
   * so the flap is a rotation about the body-forward axis; the left wing
   * mirrors the right across the body plane (a rotation, determinant +1 —
   * never a negative scale, which would flip winding).
   */
  private addBirds(): void {
    const bodyGeometry = new SphereGeometry(0.5, 7, 5);
    const wingGeometry = new BoxGeometry(0.52, 0.02, 0.24);
    wingGeometry.translate(0.26, 0, 0);
    this.geometries.push(bodyGeometry, wingGeometry);
    // Cattle egret: white plumage with a faint straw cast in the low sun.
    const material = new MeshStandardMaterial({ color: '#f2ecdc', roughness: 0.9 });
    const bodies = new InstancedMesh(bodyGeometry, material, BIRD_FLOCK.count);
    const wings = new InstancedMesh(wingGeometry, material, BIRD_FLOCK.count * 2);
    // Fast movers: per-frame matrices, no shadow casting, no stale bounds.
    bodies.castShadow = false;
    wings.castShadow = false;
    bodies.frustumCulled = false;
    wings.frustumCulled = false;
    bodies.name = 'nile-egret-bodies';
    wings.name = 'nile-egret-wings';
    this.birds = { bodies, wings, material };
    this.updateBirds(0);
    this.group.add(bodies, wings);
  }

  /** Circling flight, banking, and wing flap — pure functions of t (Spec 08). */
  private updateBirds(t: number): void {
    if (!this.birds) return;
    const { bodies, wings } = this.birds;
    const body = new Matrix4();
    const root = new Matrix4();
    const flap = new Matrix4();
    const mirror = new Matrix4().makeRotationY(Math.PI);
    const wing = new Matrix4();
    for (let i = 0; i < BIRD_FLOCK.count; i += 1) {
      const state = birdStateAt(i, t);
      // Forward is local +z, wings span local ±x: yaw outermost, then pitch
      // about the span axis, then roll (bank) about the body-forward axis.
      const orientation = new Quaternion().setFromEuler(
        new Euler(state.pitch, state.yaw, state.roll, 'YXZ'),
      );
      body.compose(
        new Vector3(state.x, state.y, state.z),
        orientation,
        new Vector3(0.3, 0.22, 0.55),
      );
      bodies.setMatrixAt(i, body);
      for (const side of [-1, 1] as const) {
        root.makeTranslation(side * 0.12, 0.03, 0.02);
        flap.makeRotationZ(side * state.wingAngle);
        wing.copy(body).multiply(root).multiply(flap);
        if (side === -1) wing.multiply(mirror);
        wings.setMatrixAt(i * 2 + (side + 1) / 2, wing);
      }
    }
    bodies.instanceMatrix.needsUpdate = true;
    wings.instanceMatrix.needsUpdate = true;
  }

  private addSiteScatter(materials: MaterialLibrary): void {
    const rockGeometry = new DodecahedronGeometry(0.5, 0);
    const stakeGeometry = new CylinderGeometry(0.04, 0.06, 1.1, 5);
    this.geometries.push(rockGeometry, stakeGeometry);
    const rocks = new InstancedMesh(rockGeometry, materials.quarryCut, 260);
    const stakes = new InstancedMesh(stakeGeometry, materials.wood, 84);
    const random = mulberry32('giza:site-scatter');
    const matrix = new Matrix4();
    let rockCursor = 0;
    let attempts = 0;
    while (rockCursor < 260 && attempts < 4000) {
      attempts += 1;
      const x = -76 + random() * 145;
      const z = -72 + random() * 144;
      // Rubble is rejected rather than nudged: chips pushed to a footprint
      // edge would line up along the ramps instead of scattering.
      if (!isClearOfSiteWorks(x, z, this.keepOuts, this.corridors, {
        margin: 0.6,
        corridorClearance: 2.2,
      })) {
        continue;
      }
      const size = 0.18 + random() * 0.58;
      matrix.compose(
        new Vector3(x, size * 0.28, z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI),
        new Vector3(size * 1.4, size * 0.65, size),
      );
      rocks.setMatrixAt(rockCursor, matrix);
      rockCursor += 1;
    }
    // Foreground interest (visual director): the reveal's lower third was
    // dead sand. Spoil heaps and abandoned rough-cut stones — the debris a
    // decades-long quarry actually leaves — scattered through the southern
    // and western foreground, clear of every footprint and haul lane.
    const spoilGeometry = new DodecahedronGeometry(0.5, 0);
    const roughBlockGeometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(spoilGeometry, roughBlockGeometry);
    const spoil = new InstancedMesh(spoilGeometry, materials.compactedEarth, 52);
    const roughBlocks = new InstancedMesh(roughBlockGeometry, materials.quarryCut, 22);
    const debrisRandom = mulberry32('giza:foreground-debris:v1');
    let spoilCursor = 0;
    let debrisAttempts = 0;
    while (spoilCursor < 52 && debrisAttempts < 1200) {
      debrisAttempts += 1;
      // Southern and south-western foreground — the band the reveal camera
      // looks across (it orbits to roughly (-118, 105) at t = 1) and the
      // quarry's own surroundings. Clearance rejects anything on a footprint
      // or haul lane.
      const x = -96 + debrisRandom() * 128;
      const z = -6 + debrisRandom() * 86;
      if (z < 26 && x > -48) continue; // keep the central working plateau open
      if (!isClearOfSiteWorks(x, z, this.keepOuts, this.corridors, {
        margin: 2.4,
        corridorClearance: 3,
      })) {
        continue;
      }
      const width = 2.4 + debrisRandom() * 4;
      matrix.compose(
        new Vector3(x, width * 0.1, z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), debrisRandom() * Math.PI),
        new Vector3(width, width * 0.3, width * 0.8),
      );
      spoil.setMatrixAt(spoilCursor, matrix);
      spoilCursor += 1;
    }
    spoil.count = spoilCursor;
    let roughCursor = 0;
    debrisAttempts = 0;
    while (roughCursor < 22 && debrisAttempts < 700) {
      debrisAttempts += 1;
      const x = -92 + debrisRandom() * 126;
      const z = -4 + debrisRandom() * 80;
      if (z < 26 && x > -48) continue;
      if (!isClearOfSiteWorks(x, z, this.keepOuts, this.corridors, {
        margin: 1,
        corridorClearance: 2.6,
      })) {
        continue;
      }
      const length = 0.9 + debrisRandom() * 0.7;
      const height = 0.42 + debrisRandom() * 0.28;
      matrix.compose(
        new Vector3(x, height * 0.42, z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), debrisRandom() * Math.PI),
        new Vector3(length, height, 0.7 + debrisRandom() * 0.4),
      );
      roughBlocks.setMatrixAt(roughCursor, matrix);
      roughCursor += 1;
    }
    roughBlocks.count = roughCursor;
    spoil.castShadow = true;
    spoil.receiveShadow = true;
    roughBlocks.castShadow = true;
    roughBlocks.receiveShadow = true;
    spoil.name = 'quarry-spoil-heaps';
    roughBlocks.name = 'abandoned-rough-cut-stones';
    this.group.add(spoil, roughBlocks);

    // Survey stakes sit on a rigid grid, so a stake with no clear ground —
    // the gap where a ramp meets the face it serves is zero-width — is simply
    // not driven, rather than nudged into the masonry.
    let stakeCursor = 0;
    for (let i = 0; i < 84; i += 1) {
      const x = -60 + (i % 21) * 5.2;
      const z = 25 + Math.floor(i / 21) * 8.6 + (i % 2) * 0.7;
      if (!isClearOfSiteWorks(x, z, this.keepOuts, this.corridors, {
        margin: 0.8,
        corridorClearance: 1.8,
      })) {
        continue;
      }
      matrix.compose(new Vector3(x, 0.55, z), new Quaternion(), new Vector3(1, 1, 1));
      stakes.setMatrixAt(stakeCursor, matrix);
      stakeCursor += 1;
    }
    stakes.count = stakeCursor;
    rocks.count = rockCursor;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    stakes.castShadow = true;
    rocks.name = 'foreground-cut-stone-chips';
    stakes.name = 'survey-and-rope-stakes';
    this.group.add(rocks, stakes);
  }

  private addOuterNecropolis(materials: MaterialLibrary): void {
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    // Bodies share one batch with their stepped upper tiers and chapel
    // annexes (worst case: every tomb carries both).
    const tombs = new InstancedMesh(box, materials.city, GIZA_ENVIRONMENT.mastabas * 3);
    const roofCaps = new InstancedMesh(box, materials.cityRoof, GIZA_ENVIRONMENT.mastabas);
    const falseDoors = new InstancedMesh(box, materials.cityAccent, GIZA_ENVIRONMENT.mastabas);
    const foundations = new InstancedMesh(box, materials.compactedEarth, GIZA_ENVIRONMENT.mastabas);
    const random = mulberry32('giza:outer-necropolis:v1');
    const matrix = new Matrix4();
    let cursor = 0;
    // Bodies share their batch with tiers/annexes, so they count separately.
    let tombCursor = 0;
    // One sweep of evenly spaced sectors, skipping any that fall on the
    // floodplain or on the working site. Sectors were previously retried in
    // place, so a blocked arc could exhaust the attempt budget and leave
    // unplaced instances stacked at the world origin — inside Khufu.
    for (let slot = 0; slot < GIZA_ENVIRONMENT.mastabas; slot += 1) {
      const theta = (slot / GIZA_ENVIRONMENT.mastabas) * Math.PI * 2 + (random() - 0.5) * 0.12;
      const radius = 88 + random() * 52;
      const x = -10 + Math.cos(theta) * radius;
      const z = -20 + Math.sin(theta) * radius;
      // Keep tombs on the plateau: the exclusion follows the meandering
      // cultivated strip (river + levee + fields), not a fixed z line.
      if (
        Math.abs(x + 10) < 130 &&
        z < greenbeltInnerEdgeAt(x) + GIZA_ENVIRONMENT.greenbelt.depth + 2
      ) continue;
      // Tombs are masonry too: never let one stand inside a working earthwork.
      if (!isClearOfSiteWorks(x, z, this.keepOuts, this.corridors, {
        margin: 3,
        corridorClearance: 3,
      })) {
        continue;
      }
      const width = 3.1 + random() * 3.8;
      const depth = 3.2 + random() * 3.4;
      const height = 1.25 + random() * 1.45;
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -theta);
      matrix.compose(new Vector3(x, height * 0.5, z), rotation, new Vector3(width, height, depth));
      tombs.setMatrixAt(tombCursor, matrix);
      tombCursor += 1;
      matrix.compose(
        new Vector3(x, 0.06, z),
        rotation,
        new Vector3(width * 1.32, 0.12, depth * 1.32),
      );
      foundations.setMatrixAt(cursor, matrix);
      matrix.compose(
        new Vector3(x, height + 0.12, z),
        rotation,
        new Vector3(width * 1.06, 0.24, depth * 1.06),
      );
      roofCaps.setMatrixAt(cursor, matrix);
      matrix.compose(
        new Vector3(x - Math.cos(theta) * (depth * 0.5 + 0.08), height * 0.45, z - Math.sin(theta) * (depth * 0.5 + 0.08)),
        rotation,
        new Vector3(width * 0.26, height * 0.58, 0.16),
      );
      falseDoors.setMatrixAt(cursor, matrix);
      cursor += 1;
      // Stepped upper tier on some mastabas, chapel annex on others: the
      // cemetery is a century of building styles, not one stamp.
      if (slot % 3 === 0) {
        const tierHeight = height * 0.55;
        matrix.compose(
          new Vector3(x, height + 0.24 + tierHeight * 0.5, z),
          rotation,
          new Vector3(width * 0.68, tierHeight, depth * 0.68),
        );
        tombs.setMatrixAt(tombCursor, matrix);
        tombCursor += 1;
      }
      if (slot % 4 === 1) {
        matrix.compose(
          new Vector3(
            x - Math.cos(theta) * (depth * 0.5 + 0.9),
            0.42,
            z - Math.sin(theta) * (depth * 0.5 + 0.9),
          ),
          rotation,
          new Vector3(width * 0.42, 0.84, 1.3),
        );
        tombs.setMatrixAt(tombCursor, matrix);
        tombCursor += 1;
      }
    }
    // Draw only what was placed; skipped sectors must not render as unset
    // identity instances sitting at the origin.
    tombs.count = tombCursor;
    for (const mesh of [roofCaps, falseDoors, foundations]) mesh.count = cursor;
    tombs.name = 'outer-necropolis-mastaba-bodies';
    roofCaps.name = 'outer-necropolis-mastaba-roof-caps';
    falseDoors.name = 'outer-necropolis-false-door-markers';
    foundations.name = 'outer-necropolis-grounded-foundation-aprons';
    tombs.receiveShadow = true;
    roofCaps.receiveShadow = true;
    this.group.add(foundations, tombs, roofCaps, falseDoors);
  }

  private addSphinxAndTemples(materials: MaterialLibrary): void {
    const box = new BoxGeometry(1, 1, 1);
    const sphere = new SphereGeometry(0.5, 10, 7);
    this.geometries.push(box, sphere);
    // The sphinx head keeps its sphere; its three box parts are baked (with
    // the sphinx's world transform) into the temple's instanced batch below —
    // four meshes plus a group used to cost four draw calls.
    const sphinxWorld = new Matrix4().compose(
      new Vector3(17, 0, -47),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -0.45),
      new Vector3(1, 1, 1),
    );
    const head = mesh(sphere, materials.block['core-limestone'], [0, 0, 0], [2.2, 2.4, 2.1]);
    head.position.set(3.1, 2.55, 0).applyMatrix4(sphinxWorld);
    head.rotation.y = -0.45;
    head.name = 'sphinx-head';
    this.group.add(head);
    const sphinxBoxes: Array<[Vec3, Vec3]> = [
      [[0, 1.15, 0], [7.2, 2.1, 2.4]],
      [[-3.1, 0.65, 0.86], [2.6, 1, 0.55]],
      [[-3.1, 0.65, -0.86], [2.6, 1, 0.55]],
    ];

    const temple = new InstancedMesh(box, materials.block['core-limestone'], 132 + sphinxBoxes.length);
    const matrix = new Matrix4();
    let cursor = 0;
    for (const [position, scale] of sphinxBoxes) {
      matrix
        .compose(new Vector3(...position), new Quaternion(), new Vector3(...scale))
        .premultiply(sphinxWorld);
      temple.setMatrixAt(cursor, matrix);
      cursor += 1;
    }
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 11; col += 1) {
        for (const side of [-1, 1] as const) {
          matrix.compose(
            new Vector3(12 + col * 1.1, 0.34, -34 + side * (3.5 + row * 0.02)),
            new Quaternion(),
            new Vector3(1.02, 0.66, 0.86),
          );
          temple.setMatrixAt(cursor, matrix);
          cursor += 1;
        }
      }
    }
    temple.castShadow = true;
    temple.receiveShadow = true;
    temple.name = 'valley-temple-individual-stones';
    this.group.add(temple);
  }

  private addRamps(materials: MaterialLibrary): void {
    const earthwork = new BoxGeometry(1, 1, 1);
    this.geometries.push(earthwork);
    // Footprints come from the plan so the same rectangle drives the geometry
    // and the site-clearance rules that keep camp props out of the earthwork.
    //
    // All five earthworks share THREE instanced meshes (terraces, tread
    // paving, revetment) with world-space matrices — the per-ramp trio used
    // to cost 15 draw calls where 3 suffice. Per-ramp transforms are baked
    // into a Matrix4 each ramp premultiplies during the per-frame rebuild.
    let stepCapacity = 0;
    let brickCapacity = 0;
    let retainingCapacity = 0;
    for (const ramp of this.plan.ramps) {
      const stepCount = 12;
      const bricksAcross = Math.max(4, Math.floor(ramp.footprint[0] / 1.05));
      const retainingCourses = Math.ceil(this.plan.monuments[ramp.monument].height / 0.36);
      stepCapacity += stepCount;
      brickCapacity += stepCount * bricksAcross;
      retainingCapacity += stepCount * retainingCourses * 2 + bricksAcross * retainingCourses;
    }
    const steps = new InstancedMesh(earthwork, materials.compactedEarth, stepCapacity);
    const brickwork = new InstancedMesh(earthwork, materials.compactedEarth, brickCapacity);
    // Mud-brick revetment, never cityRoof: with the terracotta roof material
    // these walls read as a giant tiled building, not an earthwork.
    const retaining = new InstancedMesh(earthwork, materials.revetment, retainingCapacity);
    steps.name = 'ramp-earthwork-terraces';
    brickwork.name = 'ramp-tread-paving';
    retaining.name = 'ramp-revetment-masonry';
    for (const item of [steps, brickwork, retaining]) {
      item.castShadow = true;
      item.receiveShadow = true;
      // Per-frame matrices/counts: three's first-render bounding-sphere cache
      // goes stale and camera-culls the earthwork while its shadow persists
      // (see BlockSystem). Never cull these.
      item.frustumCulled = false;
      item.count = 0;
    }
    this.rampMeshes = { steps, brickwork, retaining };
    this.group.add(steps, brickwork, retaining);

    for (const ramp of this.plan.ramps) {
      const monument = ramp.monument;
      const transform = new Matrix4().compose(
        new Vector3(ramp.center[0], ramp.baseY, ramp.center[1]),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), ramp.yaw),
        new Vector3(1, 1, 1),
      );
      const monumentBlocks = this.plan.blocks.filter((block) => block.monument === monument);
      const start = Math.min(...monumentBlocks.map((block) => block.start));
      const end = Math.max(...monumentBlocks.map((block) => block.start + block.duration));
      const monumentPlan = this.plan.monuments[monument];
      const courseStarts: number[] = [];
      for (const block of monumentBlocks) {
        const current = courseStarts[block.course];
        courseStarts[block.course] =
          current === undefined ? block.start : Math.min(current, block.start);
      }
      this.ramps.push({
        monument,
        transform,
        stepCount: 12,
        bricksAcross: Math.max(4, Math.floor(ramp.footprint[0] / 1.05)),
        maxHeight: monumentPlan.height,
        width: ramp.footprint[0],
        length: ramp.footprint[1],
        baseY: ramp.baseY,
        start,
        end,
        courseStarts,
        courseHeight: monumentPlan.height / monumentPlan.courses,
        groundY: monumentPlan.groundY,
      });
    }
  }

  private addClouds(): void {
    // Desert cloud layers from the typed sky description: high cirrus streaks
    // plus small fair-weather cumulus, always outside the widest camera
    // orbit, drifting south on the prevailing northerly wind (Spec 08).
    const cloudGeometry = new SphereGeometry(1, 10, 6);
    this.geometries.push(cloudGeometry);
    const random = mulberry32('giza:clouds-3d:v3');
    const matrix = new Matrix4();
    for (const layer of GIZA_SKY.cloudLayers) {
      const material = new MeshBasicMaterial({
        color: '#fff4df',
        transparent: true,
        opacity: layer.baseOpacity,
        depthWrite: false,
      });
      const count = layer.groups * layer.membersPerGroup;
      const instances = new InstancedMesh(cloudGeometry, material, count);
      const group = new Group();
      group.name = `cloud-layer-${layer.id}`;
      for (let i = 0; i < count; i += 1) {
        const cluster = Math.floor(i / layer.membersPerGroup);
        const member = i % layer.membersPerGroup;
        const theta = cluster * ((Math.PI * 2) / layer.groups) + 0.35 + random() * 0.22;
        const radius = layer.radius.min + cluster * layer.radius.step;
        const width = layer.scale.width[0] + random() * (layer.scale.width[1] - layer.scale.width[0]);
        const height = layer.scale.height[0] + random() * (layer.scale.height[1] - layer.scale.height[0]);
        const depth = layer.scale.depth[0] + random() * (layer.scale.depth[1] - layer.scale.depth[0]);
        matrix.compose(
          new Vector3(
            Math.cos(theta) * radius + (member - (layer.membersPerGroup - 1) * 0.5) * 8,
            layer.altitude.min + random() * layer.altitude.range + member * 0.55,
            Math.sin(theta) * radius + (random() - 0.5) * 12,
          ),
          new Quaternion(),
          new Vector3(width, height, depth),
        );
        instances.setMatrixAt(i, matrix);
      }
      instances.name = `${layer.id}-cloud-instances`;
      group.add(instances);
      this.cloudLayers.push({ description: layer, group, material });
      this.clouds.add(group);
    }
    this.clouds.name = 'layered-cloud-banks';
    this.group.add(this.clouds);
  }

  update(t: number, light: LightState, sunDirection: Vector3, sky: SkyKeyframe): void {
    this.sky.update(sky, sunDirection);
    // Living elements animate as pure functions of playback t (Spec 08).
    this.updateBoats(t);
    this.updatePalms(t);
    this.updateWindDust(t);
    this.updateBirds(t);
    updateClothSwayTime(this.clothMaterials, t);
    if (this.foam) {
      // Lazy wave wash on the waterline; a pure function of playback t.
      this.foam.material.opacity = 0.18 + 0.1 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 24));
    }
    for (const layer of this.cloudLayers) {
      const { drift, baseOpacity } = layer.description;
      const [dx, , dz] = drift.worldDirection;
      layer.group.position.set(
        dx * drift.unitsPerMovie * t,
        0,
        dz * drift.unitsPerMovie * t,
      );
      layer.material.color.set(sky.cloudTint);
      layer.material.opacity = Math.min(baseOpacity, sky.cloudOpacity);
    }
    this.clouds.visible = light.emissive < 0.8;
    this.updateCampfires(t, light, sky);
    const rampMeshes = this.rampMeshes!;
    const rampMatrix = new Matrix4();
    let rampStepCursor = 0;
    let rampBrickCursor = 0;
    let rampRetainingCursor = 0;
    for (const ramp of this.ramps) {
      // The crest is raised continuously through each course. Taking the max
      // over already-started blocks made it jump a whole course height the
      // instant a course's first stone left the quarry — the whole earthwork
      // visibly stepped up 42 times per pyramid.
      let course = -1;
      for (let index = 0; index < ramp.courseStarts.length; index += 1) {
        if (ramp.courseStarts[index]! <= t) course = index;
        else break;
      }
      let workingHeight = ramp.groundY + 0.45;
      if (course >= 0) {
        const from = ramp.courseStarts[course]!;
        // The topmost course has no successor to interpolate toward; run it
        // out to the monument's own end so the crest does not snap to full
        // height the instant the last course begins.
        const next = ramp.courseStarts[course + 1] ?? ramp.end;
        const through = next <= from ? 1 : Math.min(1, (t - from) / (next - from));
        workingHeight = ramp.groundY + (course + through) * ramp.courseHeight;
      }
      const height = Math.min(ramp.maxHeight, Math.max(0.35, workingHeight - ramp.baseY));

      // An earthwork is itself built, and dismantled (Spec 08 §Physical
      // plausibility: nothing large pops into existence). Its bed extends from
      // the high end — the part any ascent actually needs — outward toward the
      // foot while the first course, which is laid at ground level and needs
      // no ramp, goes down. After that it only grows in height.
      const raiseSpan = Math.min(0.05, (ramp.end - ramp.start) * 0.12);
      const dismantleSpan = Math.min(0.035, (ramp.end - ramp.start) * 0.09);
      const raised = smoothstep((t - ramp.start) / raiseSpan);
      const struck = smoothstep((t - ramp.end) / dismantleSpan);
      const extent = Math.max(0, raised - struck);
      if (extent <= 0.001) continue;

      // Terraces keep their final size and place; only the frontier advances,
      // with a partial terrace at the tip so the earthwork extends smoothly
      // instead of in twelve visible jumps. Earth already piled never slides.
      const fullStepDepth = ramp.length / ramp.stepCount;
      const activeLength = ramp.length * extent;
      const activeSteps = Math.min(
        ramp.stepCount,
        Math.max(1, Math.ceil(activeLength / fullStepDepth)),
      );
      const matrix = rampMatrix;
      const retainingHeight = 0.36;
      for (let index = 0; index < activeSteps; index += 1) {
        // Spec 08: the ramp rises TOWARD the monument. Step 0 sits at local
        // +z, which every ramp yaw maps to the pyramid side — so the highest
        // terrace must be at index 0 and the gradient descends outward.
        const near = fullStepDepth * index;
        const stepDepth = Math.min(fullStepDepth, activeLength - near);
        if (stepDepth <= 0.01) break;
        const centerZ = ramp.length * 0.5 - near - stepDepth * 0.5;
        // Height profile is fixed against the finished ramp, so extending the
        // bed adds lower terraces rather than re-cutting the whole gradient.
        const stepHeight = height * ((ramp.stepCount - index) / ramp.stepCount);
        matrix.compose(
          new Vector3(0, stepHeight * 0.5, centerZ),
          new Quaternion(),
          new Vector3(ramp.width, stepHeight, stepDepth * 0.96),
        );
        matrix.premultiply(ramp.transform);
        rampMeshes.steps.setMatrixAt(rampStepCursor, matrix);
        rampStepCursor += 1;
        const brickWidth = ramp.width / ramp.bricksAcross;
        for (let across = 0; across < ramp.bricksAcross; across += 1) {
          const offset = index % 2 === 0 ? 0 : brickWidth * 0.16;
          const x = -ramp.width * 0.5 + brickWidth * (across + 0.5) + offset;
          matrix.compose(
            new Vector3(
              Math.min(ramp.width * 0.5 - brickWidth * 0.5, x),
              stepHeight + 0.07,
              centerZ,
            ),
            new Quaternion(),
            // Near-flush paving: the old 0.9 × 0.82 footprint left a regular
            // shadow grid that read as terracotta roof tiles from above.
            new Vector3(brickWidth * 0.97, 0.08, stepDepth * 0.94),
          );
          matrix.premultiply(ramp.transform);
          rampMeshes.brickwork.setMatrixAt(rampBrickCursor, matrix);
          rampBrickCursor += 1;
        }
        const verticalCourses = Math.ceil(stepHeight / retainingHeight);
        for (let course = 0; course < verticalCourses; course += 1) {
          for (const side of [-1, 1] as const) {
            matrix.compose(
              new Vector3(
                side * (ramp.width * 0.5 + 0.18),
                retainingHeight * (course + 0.5),
                centerZ,
              ),
              new Quaternion(),
              new Vector3(0.42, retainingHeight * 0.96, stepDepth * 0.92),
            );
            matrix.premultiply(ramp.transform);
            rampMeshes.retaining.setMatrixAt(rampRetainingCursor, matrix);
            rampRetainingCursor += 1;
          }
        }
      }
      const frontCourses = Math.ceil(height / retainingHeight);
      const frontBrickWidth = ramp.width / ramp.bricksAcross;
      for (let course = 0; course < frontCourses; course += 1) {
        for (let across = 0; across < ramp.bricksAcross; across += 1) {
          const stagger = course % 2 === 0 ? 0 : frontBrickWidth * 0.18;
          const x = Math.min(
            ramp.width * 0.5 - frontBrickWidth * 0.5,
            -ramp.width * 0.5 + frontBrickWidth * (across + 0.5) + stagger,
          );
          matrix.compose(
            // The high-end face (local +z, against the pyramid) is retained.
            new Vector3(x, retainingHeight * (course + 0.5), ramp.length * 0.5 + 0.18),
            new Quaternion(),
            new Vector3(frontBrickWidth * 0.96, retainingHeight * 0.96, 0.42),
          );
          matrix.premultiply(ramp.transform);
          rampMeshes.retaining.setMatrixAt(rampRetainingCursor, matrix);
          rampRetainingCursor += 1;
        }
      }
    }
    rampMeshes.steps.count = rampStepCursor;
    rampMeshes.steps.instanceMatrix.needsUpdate = true;
    rampMeshes.brickwork.count = rampBrickCursor;
    rampMeshes.brickwork.instanceMatrix.needsUpdate = true;
    rampMeshes.retaining.count = rampRetainingCursor;
    rampMeshes.retaining.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.sky.dispose();
    for (const geometry of new Set(this.geometries)) geometry.dispose();
    for (const layer of this.cloudLayers) layer.material.dispose();
    this.campfires?.flameMaterial.dispose();
    for (const material of this.clothMaterials) material.dispose();
    for (const material of this.extraMaterials) material.dispose();
    this.windDust?.material.dispose();
    this.foam?.material.dispose();
    this.birds?.material.dispose();
  }
}
