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
  channelTangentYawAt,
  fieldParcelAt,
  GIZA_ENVIRONMENT,
  greenbeltInnerEdgeAt,
  riverBraidAt,
  riverCenterZAt,
  riverCraftStateAt,
  riverWidthAt,
  type RiverCraftDescription,
} from '../../data/gizaEnvironment';
import { GIZA_SKY, type CloudLayerDescription, type SkyKeyframe } from '../../data/gizaSky';
import type { LightState } from '../../engine/daynight';
import { smoothstep } from '../../engine/easing';
import { mulberry32 } from '../../engine/random';
import type { MaterialLibrary } from './MaterialLibrary';
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
  group: Group;
  steps: InstancedMesh;
  brickwork: InstancedMesh;
  retaining: InstancedMesh;
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
    const quarryFloor = mesh(box, materials.quarryCut, [-52, -0.2, 31], [24, 0.45, 22]);
    quarryFloor.name = 'foreground-quarry-floor';
    this.group.add(quarryFloor);

    for (let step = 0; step < 4; step += 1) {
      const cut = mesh(
        box,
        materials.quarryCut,
        [-62 + step * 2.4, 0.55 + step * 0.34, 31],
        [2.4, 1.1 + step * 0.68, 24 - step * 2.2],
      );
      cut.name = `quarry-cut-${step}`;
      this.group.add(cut);
    }

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
    const fieldColors = [new Color('#70623c'), new Color('#637447'), new Color('#8a7d45')];
    for (let i = 0; i < fieldCount; i += 1) {
      const parcel = fieldParcelAt(i);
      matrix.compose(
        new Vector3(parcel.x, 0.09, parcel.z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), parcel.yaw),
        new Vector3(13.6, 0.12, 5.3),
      );
      fields.setMatrixAt(i, matrix);
      fields.setColorAt(i, fieldColors[(parcel.row + parcel.column * 2) % fieldColors.length]!);
    }
    fields.receiveShadow = true;
    this.group.add(fields);

    // Basin-irrigation feeders run in from the river, perpendicular to the
    // local bank (Spec 08: the strip follows the river).
    const irrigation = new InstancedMesh(box, materials.water, GIZA_ENVIRONMENT.irrigationChannels);
    irrigation.name = 'field-irrigation-channel-network';
    for (let i = 0; i < GIZA_ENVIRONMENT.irrigationChannels; i += 1) {
      const x = -96 + i * 32;
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
    this.geometries.push(reedGeometry, trunkGeometry, crownGeometry, skirtGeometry);
    const reeds = new InstancedMesh(reedGeometry, materials.foliage, GIZA_ENVIRONMENT.reedClusters);
    const trunks = new InstancedMesh(trunkGeometry, materials.wood, GIZA_ENVIRONMENT.palms);
    const crowns = new InstancedMesh(crownGeometry, materials.foliage, GIZA_ENVIRONMENT.palms);
    const skirts = new InstancedMesh(skirtGeometry, materials.wood, GIZA_ENVIRONMENT.palms);
    const frondsPerPalm = 10;
    const fronds = new InstancedMesh(frondGeometry, materials.foliage, GIZA_ENVIRONMENT.palms * frondsPerPalm);
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
    for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
      const x = -108 + (i / (GIZA_ENVIRONMENT.palms - 1)) * 216 + (random() - 0.5) * 4.5;
      // Palm rows follow the meandering near bank (Spec 08).
      const z = greenbeltInnerEdgeAt(x) + 2.0 + random() * 14;
      const height = 0.8 + random() * 0.42;
      // Date palms lean a little; the crown shifts with the trunk's tilt.
      const lean = 0.04 + random() * 0.06;
      const leanAzimuth = random() * Math.PI * 2;
      const tilt = new Quaternion().setFromEuler(
        new Euler(lean * Math.cos(leanAzimuth), random() * Math.PI, lean * Math.sin(leanAzimuth), 'YXZ'),
      );
      matrix.compose(new Vector3(x, 2.2 * height, z), tilt, new Vector3(1, height, 1));
      trunks.setMatrixAt(i, matrix);
      const crownX = x + 4.4 * height * Math.sin(lean) * Math.cos(leanAzimuth);
      const crownZ = z + 4.4 * height * Math.sin(lean) * Math.sin(leanAzimuth);
      const crownY = 4.42 * height;
      matrix.compose(new Vector3(crownX, crownY, crownZ), new Quaternion(), new Vector3(1.25, 0.75, 1.25));
      crowns.setMatrixAt(i, matrix);
      matrix.compose(new Vector3(crownX, crownY - 0.62 * height, crownZ), new Quaternion(), new Vector3(1, height, 1));
      skirts.setMatrixAt(i, matrix);
      // Two frond tiers: an upright young crown and a drooping older skirt
      // row, each with its own color range (drier below).
      const frondSpecs: (typeof this.palmSway)[number]['fronds'] = [];
      for (let frond = 0; frond < frondsPerPalm; frond += 1) {
        const upper = frond < 5;
        const yaw = ((frond % 5) / 5) * Math.PI * 2 + (upper ? 0 : 0.63) + random() * 0.22;
        const droop = upper ? -(0.3 + random() * 0.16) : -(0.72 + random() * 0.2);
        const length = upper ? 3.6 + random() * 0.9 : 2.6 + random() * 0.7;
        const width = 0.3 + random() * 0.14;
        frondSpecs.push({ yaw, droop, length, width, phase: random() * Math.PI * 2 });
        fronds.setColorAt(
          frondCursor,
          (upper ? upperFrondColors : lowerFrondColors)[Math.floor(random() * 3)]!,
        );
        frondCursor += 1;
      }
      this.palmSway.push({ crownX, crownY, crownZ, fronds: frondSpecs });
    }
    this.palmFronds = fronds;
    // Frond matrices sway every frame; opt out of the stale-bounds cull.
    fronds.frustumCulled = false;
    this.updatePalms(0);
    reeds.name = 'nile-bank-reed-clusters';
    trunks.name = 'greenbelt-palm-trunks';
    crowns.name = 'greenbelt-palm-hearts';
    skirts.name = 'greenbelt-palm-dead-frond-skirts';
    fronds.name = 'greenbelt-individual-palm-fronds';
    trunks.castShadow = true;
    crowns.castShadow = true;
    fronds.castShadow = true;
    this.group.add(reeds, trunks, crowns, skirts, fronds);
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
    // between the upper yard and the lower boom.
    const sailGeometry = new BoxGeometry(0.06, 2.55, 1.55);
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
    const sails = new InstancedMesh(sailGeometry, materials.linen, sailCount);
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
    const walls = new InstancedMesh(cityGeometry, materials.whitewash, 42);
    for (let i = 0; i < 42; i += 1) {
      matrix.compose(
        new Vector3(anchorX - 66 + i * 4.0, 1.1 + (i % 7 === 0 ? 0.7 : 0), anchorZ + 10.5),
        new Quaternion(),
        new Vector3(3.7, 2.2 + (i % 7 === 0 ? 1.4 : 0), 1.1),
      );
      walls.setMatrixAt(i, matrix);
    }
    const pylons = new InstancedMesh(cityGeometry, materials.cityAccent, 3);
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
    const tentGeometry = new ConeGeometry(1, 1, 4);
    const crateGeometry = new BoxGeometry(1, 1, 1);
    const poleGeometry = new CylinderGeometry(0.05, 0.07, 2.5, 5);
    this.geometries.push(tentGeometry, crateGeometry, poleGeometry);
    const tents = new InstancedMesh(tentGeometry, materials.linen, 27);
    const supplies = new InstancedMesh(crateGeometry, materials.wood, 72);
    const shadeCloths = new InstancedMesh(crateGeometry, materials.linen, 12);
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
      matrix.compose(new Vector3(x, 2.35, z), new Quaternion(), new Vector3(5.4, 0.12, 3.4));
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
    const tombs = new InstancedMesh(box, materials.city, GIZA_ENVIRONMENT.mastabas);
    const roofCaps = new InstancedMesh(box, materials.cityRoof, GIZA_ENVIRONMENT.mastabas);
    const falseDoors = new InstancedMesh(box, materials.cityAccent, GIZA_ENVIRONMENT.mastabas);
    const foundations = new InstancedMesh(box, materials.compactedEarth, GIZA_ENVIRONMENT.mastabas);
    const random = mulberry32('giza:outer-necropolis:v1');
    const matrix = new Matrix4();
    let cursor = 0;
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
      tombs.setMatrixAt(cursor, matrix);
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
    }
    // Draw only what was placed; skipped sectors must not render as unset
    // identity instances sitting at the origin.
    for (const mesh of [tombs, roofCaps, falseDoors, foundations]) mesh.count = cursor;
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
    const sphinx = new Group();
    sphinx.name = 'sphinx-bedrock-carving';
    sphinx.add(
      mesh(box, materials.block['core-limestone'], [0, 1.15, 0], [7.2, 2.1, 2.4]),
      mesh(sphere, materials.block['core-limestone'], [3.1, 2.55, 0], [2.2, 2.4, 2.1]),
      mesh(box, materials.block['core-limestone'], [-3.1, 0.65, 0.86], [2.6, 1, 0.55]),
      mesh(box, materials.block['core-limestone'], [-3.1, 0.65, -0.86], [2.6, 1, 0.55]),
    );
    sphinx.position.set(17, 0, -47);
    sphinx.rotation.y = -0.45;
    this.group.add(sphinx);

    const temple = new InstancedMesh(box, materials.block['core-limestone'], 132);
    const matrix = new Matrix4();
    let cursor = 0;
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
    for (const ramp of this.plan.ramps) {
      const monument = ramp.monument;
      const position: Vec3 = [ramp.center[0], ramp.baseY, ramp.center[1]];
      const scale: Vec3 = [ramp.footprint[0], 1, ramp.footprint[1]];
      const yaw = ramp.yaw;
      const rampGroup = new Group();
      rampGroup.position.set(...position);
      rampGroup.rotation.y = yaw;
      rampGroup.name = `${monument}-terraced-working-ramp`;
      const stepCount = 12;
      const stepDepth = scale[2] / stepCount;
      const steps = new InstancedMesh(earthwork, materials.compactedEarth, stepCount);
      const bricksAcross = Math.max(4, Math.floor(scale[0] / 1.05));
      const brickwork = new InstancedMesh(earthwork, materials.compactedEarth, stepCount * bricksAcross);
      const retainingCourses = Math.ceil(this.plan.monuments[monument].height / 0.36);
      // Mud-brick revetment, never cityRoof: with the terracotta roof
      // material these walls read as a giant tiled building, not an earthwork.
      const retaining = new InstancedMesh(
        earthwork,
        materials.revetment,
        stepCount * retainingCourses * 2 + bricksAcross * retainingCourses,
      );
      steps.name = `${monument}-ramp-earthwork-steps`;
      brickwork.name = `${monument}-ramp-small-mud-brick-courses`;
      retaining.name = `${monument}-ramp-side-and-front-retaining-masonry`;
      steps.castShadow = true;
      steps.receiveShadow = true;
      brickwork.castShadow = true;
      brickwork.receiveShadow = true;
      retaining.castShadow = true;
      retaining.receiveShadow = true;
      // Per-frame matrices/counts: three's first-render bounding-sphere cache
      // goes stale and camera-culls the earthwork while its shadow persists
      // (see BlockSystem). Never cull these.
      for (const item of [steps, brickwork, retaining]) item.frustumCulled = false;
      for (let index = 0; index < stepCount; index += 1) {
        const stepMatrix = new Matrix4().compose(
          new Vector3(0, 0.1, scale[2] * 0.5 - stepDepth * (index + 0.5)),
          new Quaternion(),
          new Vector3(scale[0], 0.2, stepDepth * 0.96),
        );
        steps.setMatrixAt(index, stepMatrix);
      }
      steps.instanceMatrix.needsUpdate = true;
      rampGroup.add(steps, brickwork, retaining);
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
        group: rampGroup,
        steps,
        brickwork,
        retaining,
        stepCount,
        bricksAcross,
        maxHeight: this.plan.monuments[monument].height,
        width: scale[0],
        length: scale[2],
        baseY: position[1],
        start,
        end,
        courseStarts,
        courseHeight: monumentPlan.height / monumentPlan.courses,
        groundY: monumentPlan.groundY,
      });
      this.group.add(rampGroup);
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
      if (extent <= 0.001) {
        ramp.group.visible = false;
        continue;
      }
      ramp.group.visible = true;

      // Terraces keep their final size and place; only the frontier advances,
      // with a partial terrace at the tip so the earthwork extends smoothly
      // instead of in twelve visible jumps. Earth already piled never slides.
      const fullStepDepth = ramp.length / ramp.stepCount;
      const activeLength = ramp.length * extent;
      const activeSteps = Math.min(
        ramp.stepCount,
        Math.max(1, Math.ceil(activeLength / fullStepDepth)),
      );
      const matrix = new Matrix4();
      let brickCursor = 0;
      let retainingCursor = 0;
      let stepCursor = 0;
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
        ramp.steps.setMatrixAt(stepCursor, matrix);
        stepCursor += 1;
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
          ramp.brickwork.setMatrixAt(brickCursor, matrix);
          brickCursor += 1;
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
            ramp.retaining.setMatrixAt(retainingCursor, matrix);
            retainingCursor += 1;
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
          ramp.retaining.setMatrixAt(retainingCursor, matrix);
          retainingCursor += 1;
        }
      }
      ramp.steps.count = stepCursor;
      ramp.steps.instanceMatrix.needsUpdate = true;
      ramp.brickwork.count = brickCursor;
      ramp.brickwork.instanceMatrix.needsUpdate = true;
      ramp.retaining.count = retainingCursor;
      ramp.retaining.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.sky.dispose();
    for (const geometry of new Set(this.geometries)) geometry.dispose();
    for (const layer of this.cloudLayers) layer.material.dispose();
  }
}
