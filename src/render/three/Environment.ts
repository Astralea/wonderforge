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
  TorusGeometry,
  Vector3,
} from 'three';
import type { GizaConstructionPlan, GizaRampSurface, Vec3 } from '../../data/constructionTypes';
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
  fieldAbsorptionAt,
  fieldParcelAt,
  GIZA_ENVIRONMENT,
  greenbeltInnerEdgeAt,
  grovePalmAt,
  palmArchetypeAt,
  palmStandAt,
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
import { gizaRampKnots, gizaRampHeightAt, gizaRampProfileAt } from '../../engine/gizaRampSupport';
import { smoothstep } from '../../engine/easing';
import { mulberry32 } from '../../engine/random';
import { gizaWaveHeightAt } from '../../engine/waveField';
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

/** Road embankment closes elevated approach ribbons down to the plateau. */
function groundedRoadGeometry(points: Vec3[], width: number): BufferGeometry {
  const top = roadGeometry(points, width);
  const position = top.getAttribute('position');
  const vertices = Array.from(position.array);
  const indices = Array.from(top.getIndex()!.array);
  const count = position.count;
  for (let i = 0; i < count; i += 1) vertices.push(position.getX(i), -0.08, position.getZ(i));
  for (let i = 0; i < count - 2; i += 2) {
    indices.push(i, i + count, i + 2, i + 2, i + count, i + count + 2);
    indices.push(i + 1, i + 3, i + count + 1, i + 3, i + count + 3, i + count + 1);
  }
  indices.push(0, 1, count, 1, count + 1, count);
  const end = count - 2;
  indices.push(end, end + count, end + 1, end + 1, end + count, end + count + 1);
  top.dispose();
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

/** Merge flat ribbon geometries (positions + indices) into one draw call. */
function mergeRibbons(ribbons: BufferGeometry[]): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const ribbon of ribbons) {
    const offset = positions.length / 3;
    const pos = ribbon.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const idx = ribbon.getIndex()!;
    for (let i = 0; i < idx.count; i += 1) {
      indices.push(idx.getX(i) + offset);
    }
    ribbon.dispose();
  }
  const merged = new BufferGeometry();
  merged.setAttribute('position', new Float32BufferAttribute(positions, 3));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
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

/** Trail segments per moving hull (plus one bow pulse). */
const WAKE_SEGMENTS = 9;
/** Per-segment lookback in movie time — the wake replays the boat's own path. */
const WAKE_DT = 0.012;

interface RampVisual {
  surface: GizaRampSurface;
  mesh: InstancedMesh;
  transform: Matrix4;
  width: number;
  length: number;
}

/** Normalized earthen prism. Its top knots are the engine's support profile. */
function rampSurfaceGeometry(surface: GizaRampSurface): BufferGeometry {
  const knots = gizaRampKnots(surface);
  const positions: number[] = [];
  const indices: number[] = [];
  for (const u of knots) {
    const y = gizaRampProfileAt(surface, u);
    positions.push(-0.5, y, u, 0.5, y, u, -0.5, -0.002, u, 0.5, -0.002, u);
  }
  for (let i = 0; i < knots.length - 1; i += 1) {
    const a = i * 4; const b = a + 4;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
    indices.push(a, a + 2, b, a + 2, b + 2, b);
    indices.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3);
    indices.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2);
  }
  const end = (knots.length - 1) * 4;
  indices.push(0, 1, 2, 1, 3, 2, end, end + 2, end + 1, end + 1, end + 2, end + 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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
    steps: Group;
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
    wakes: InstancedMesh;
    crewBodies: InstancedMesh;
    crewHeads: InstancedMesh;
    jars: InstancedMesh;
    coils: InstancedMesh;
    mooringStake: Mesh;
    mooringRope: InstancedMesh;
  } | null = null;
  private readonly palmSway: Array<{
    crownX: number;
    crownY: number;
    crownZ: number;
    /** Frond ring radius around the crown heart (archetype crownRadius). */
    ring: number;
    fronds: Array<{
      yaw: number;
      droop: number;
      length: number;
      width: number;
      phase: number;
      /** Doum fan fronds draw into the stiff fan batch, not the feather one. */
      fan?: boolean;
    }>;
  }> = [];
  private palmFronds: InstancedMesh | null = null;
  private palmFanFronds: InstancedMesh | null = null;
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
  /** Tent positions, recorded so the staging pass can find the camp. */
  private readonly tentSpots: Array<{ x: number; z: number }> = [];
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
    this.addStagingEquipment(materials);
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

    // Extraction evidence (Spec 08 §Site zones): the stepped benches east
    // faces are the worked faces. One detail batch carries wedge-slot notch
    // lines along the bench tops, half-extracted blocks still attached at
    // one edge, and a chip apron at the bench toes — per-instance tints over
    // the shared quarry material.
    const detail = new InstancedMesh(box, materials.quarryCut, 66);
    detail.name = 'quarry-extraction-detail';
    const detailRandom = mulberry32('giza:quarry-extraction:v1');
    const darkNotch = new Color('#4f3d28');
    const paleFresh = new Color('#e4d3a4');
    const chipTint = new Color('#c69a63');
    const matrix = new Matrix4();
    let detailCursor = 0;
    const benches = quarrySpecs.slice(1);
    for (const [position, scale] of benches) {
      const [bx, by, bz] = position;
      const [sx, sy, sz] = scale;
      const faceX = bx + sx / 2;
      const topY = by + sy / 2;
      // Wedge-notch line along the top of the face: the row of dark slots a
      // wedging crew leaves. 8 notches per bench.
      for (let n = 0; n < 8; n += 1) {
        matrix.compose(
          new Vector3(faceX - 0.22, topY + 0.035, bz - sz * 0.4 + n * (sz * 0.8 / 7)),
          new Quaternion(),
          new Vector3(0.34, 0.07, 0.14),
        );
        detail.setMatrixAt(detailCursor, matrix);
        detail.setColorAt(detailCursor, darkNotch);
        detailCursor += 1;
      }
      // Chip apron at the bench toe: small fresh flakes where the face sheds.
      for (let c = 0; c < 6; c += 1) {
        const size = 0.12 + detailRandom() * 0.22;
        matrix.compose(
          new Vector3(
            faceX + 0.4 + detailRandom() * 1.6,
            topY - sy + size * 0.3 + 0.02,
            bz - sz * 0.42 + detailRandom() * sz * 0.84,
          ),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), detailRandom() * Math.PI),
          new Vector3(size * 1.5, size * 0.4, size),
        );
        detail.setMatrixAt(detailCursor, matrix);
        detail.setColorAt(detailCursor, chipTint);
        detailCursor += 1;
      }
    }
    // Half-extracted blocks on the two middle benches: detached on three
    // sides, still attached at the back edge, pale fresh-split faces.
    for (let b = 0; b < 6; b += 1) {
      const [position, scale] = benches[1 + (b % 3)]!;
      const [bx, by, bz] = position;
      const [sx, sy, sz] = scale;
      matrix.compose(
        new Vector3(
          bx + sx / 2 + 0.42,
          by + sy / 2 + 0.31,
          bz - sz * 0.36 + b * (sz * 0.72 / 5) + (detailRandom() - 0.5) * 0.4,
        ),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (detailRandom() - 0.5) * 0.1),
        new Vector3(1.35, 0.6, 1.0),
      );
      detail.setMatrixAt(detailCursor, matrix);
      detail.setColorAt(detailCursor, paleFresh);
      detailCursor += 1;
    }
    detail.count = detailCursor;
    detail.castShadow = true;
    detail.receiveShadow = true;
    this.group.add(detail);

    // Dressing yard, anchored on the haul route's dressing waypoint so the
    // sled path visibly passes through it (Spec 08 §Site zones): blocks
    // cluster by state — rough queue near the quarry lip, in-dressing with
    // chip piles and measuring cords, and a squared dressed stack.
    const dressing = this.plan.routes[0]!.waypoints.dressing;
    const yardX = dressing[0];
    const yardZ = dressing[2] - 4;
    const random = mulberry32('giza:dressing-yard:v2');

    const roughQueue = new InstancedMesh(box, materials.quarryCut, 18);
    roughQueue.name = 'dressing-yard-rough-queue';
    let roughCursor = 0;
    for (let i = 0; i < 18; i += 1) {
      const spot = this.placeIfClear(
        yardX - 7 + (i % 6) * 1.5 + (random() - 0.5) * 0.5,
        yardZ + 2.5 + Math.floor(i / 6) * 1.8 + (random() - 0.5) * 0.5,
        0.9,
        1.2,
      );
      if (!spot) continue;
      matrix.compose(
        new Vector3(spot[0], 0.36, spot[1]),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (random() - 0.5) * 0.5),
        new Vector3(1.14 + random() * 0.28, 0.62, 0.9 + random() * 0.3),
      );
      roughQueue.setMatrixAt(roughCursor, matrix);
      roughCursor += 1;
    }
    roughQueue.count = roughCursor;

    // In-dressing: blocks squared on the mason's spot, one tilted mid-pass.
    const inDressing = new InstancedMesh(box, materials.block['core-limestone'], 14);
    inDressing.name = 'dressing-yard-in-dressing-blocks';
    let dressingCursor = 0;
    for (let i = 0; i < 14; i += 1) {
      const spot = this.placeIfClear(
        yardX - 1 + (i % 5) * 1.55 + (random() - 0.5) * 0.3,
        yardZ - 3.2 + Math.floor(i / 5) * 1.9 + (random() - 0.5) * 0.3,
        0.9,
        1.2,
      );
      if (!spot) continue;
      const tilt = i % 5 === 2 ? 0.16 : 0;
      matrix.compose(
        new Vector3(spot[0], 0.35, spot[1]),
        new Quaternion().setFromEuler(new Euler(tilt, (random() - 0.5) * 0.14, 0, 'YXZ')),
        new Vector3(1.08 + random() * 0.14, 0.56, 0.92 + random() * 0.12),
      );
      inDressing.setMatrixAt(dressingCursor, matrix);
      dressingCursor += 1;
    }
    inDressing.count = dressingCursor;

    const dressedStack = new InstancedMesh(box, materials.block['casing-limestone'], 20);
    dressedStack.name = 'dressing-yard-dressed-stack';
    let stackCursor = 0;
    for (let i = 0; i < 20; i += 1) {
      const spot = this.placeIfClear(
        yardX + 6.5 + (i % 5) * 1.32,
        yardZ - 2.6 + Math.floor(i / 5) * 1.55,
        0.9,
        1.2,
      );
      if (!spot) continue;
      matrix.compose(
        new Vector3(spot[0], 0.33, spot[1]),
        new Quaternion(),
        new Vector3(1.18, 0.52, 0.98),
      );
      dressedStack.setMatrixAt(stackCursor, matrix);
      stackCursor += 1;
    }
    dressedStack.count = stackCursor;

    // Measuring cords stretched between stake pairs across the in-dressing
    // row — the "stretching the cord" layout step made visible.
    const cords = new InstancedMesh(box, materials.rope, 4);
    cords.name = 'dressing-yard-measuring-cords';
    for (let c = 0; c < 2; c += 1) {
      const end0 = this.placeIfClear(yardX - 1.5, yardZ - 3.4 + c * 2.1, 0.4, 1.2);
      const end1 = this.placeIfClear(yardX + 6.2, yardZ - 3.1 + c * 2.0, 0.4, 1.2);
      if (!end0 || !end1) continue;
      const [x0, z0] = end0;
      const [x1, z1] = end1;
      const length = Math.hypot(x1 - x0, z1 - z0);
      matrix.compose(
        new Vector3((x0 + x1) / 2, 0.62, (z0 + z1) / 2),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.atan2(z1 - z0, x1 - x0)),
        new Vector3(length, 0.035, 0.035),
      );
      cords.setMatrixAt(c * 2, matrix);
      for (const [sx, sz] of [[x0, z0], [x1, z1]] as const) {
        matrix.compose(new Vector3(sx, 0.42, sz), new Quaternion(), new Vector3(0.07, 0.84, 0.07));
        cords.setMatrixAt(c * 2 + 1, matrix);
      }
    }

    for (const batch of [roughQueue, inDressing, dressedStack]) {
      batch.castShadow = true;
      batch.receiveShadow = true;
    }
    this.group.add(roughQueue, inDressing, dressedStack, cords);
  }

  private addRoads(materials: MaterialLibrary): void {
    // Every visible road follows the same typed dressing/queue/foot chords
    // as its load. The extended western/eastern approaches are real roads,
    // not a sled flying over unmarked desert to a distant ramp.
    for (const route of this.plan.routes.filter((item) => item.rampSurface)) {
      const { quarry, dressing, roadQueue, rampFoot } = route.waypoints;
      const groundPoint = (point: Vec3): Vec3 => [point[0], Math.max(0.02, point[1] - 0.28), point[2]];
      const points = [groundPoint(quarry), groundPoint(dressing), groundPoint(roadQueue), groundPoint(rampFoot)];
      points[3]![1] = route.rampSurface!.foot[1] + 0.015;
      const road = groundedRoadGeometry(points, route.id === 'khufu-south' ? 6.4 : 3.2);
      this.geometries.push(road);
      const roadMesh = new Mesh(road, materials.compactedEarth);
      roadMesh.receiveShadow = true;
      roadMesh.name = route.id === 'khufu-south'
        ? 'wetted-two-lane-haul-road'
        : route.id === 'khufu-east' ? 'eastern-haul-road' : `${route.id}-haul-road`;
      this.group.add(roadMesh);
    }

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
    const bareEarthTint = new Color('#6f5b3a');

    // Precompute per-cell render specs: merged cells vanish into their left
    // twin (which widens and shifts center); bare cells draw an earth slab
    // with no crop and no furrows, plus scrub tufts.
    const cellSpecs = Array.from({ length: fieldCount }, (_, i) => {
      const parcel = fieldParcelAt(i);
      const absorption = fieldAbsorptionAt(i);
      const rng = mulberry32(`giza:field-render:${i}`);
      return {
        parcel,
        width: absorption.width,
        x: parcel.x + absorption.xOffset,
        furrowRows: parcel.bare ? 0 : Math.max(3, Math.round(parcel.depth / 0.72)),
        stooks: !parcel.merged && !parcel.bare && parcel.crop === 'stubble' ? 5 + Math.floor(rng() * 3) : 0,
        scrub: !parcel.merged && parcel.bare ? 5 + Math.floor(rng() * 3) : 0,
      };
    });
    const visible = cellSpecs.filter((spec) => !spec.parcel.merged);
    const furrowTotal = cellSpecs.reduce((total, spec) => total + spec.furrowRows, 0);
    const stookTotal = cellSpecs.reduce((total, spec) => total + spec.stooks, 0) + 4;
    const scrubTotal = cellSpecs.reduce((total, spec) => total + spec.scrub, 0);

    const fields = new InstancedMesh(box, materials.farmland, visible.length);
    fields.name = 'cultivated-field-parcels-and-planting-rows';
    const furrows = new InstancedMesh(box, materials.farmland, furrowTotal);
    furrows.name = 'cultivated-field-furrow-ridges';
    const bunds = new InstancedMesh(box, materials.compactedEarth, visible.length * 4);
    bunds.name = 'cultivated-field-boundary-bunds';
    // Bound sheaves standing in the stubble, plus the threshing-floor grain
    // mound — one straw batch for the whole harvest story.
    const stooks = new InstancedMesh(new ConeGeometry(0.5, 1, 6), materials.cityAccent, stookTotal);
    stooks.name = 'field-stooks-and-grain-mound';
    this.geometries.push(stooks.geometry);
    const scrubTufts = new InstancedMesh(new ConeGeometry(0.5, 1, 5), materials.foliage, scrubTotal);
    scrubTufts.name = 'field-scrub-gap-tufts';
    this.geometries.push(scrubTufts.geometry);
    const furrowTint = new Color();
    const scrubTint = new Color('#55603a');

    let fieldCursor = 0;
    let furrowCursor = 0;
    let bundCursor = 0;
    let stookCursor = 0;
    let scrubCursor = 0;
    for (const spec of cellSpecs) {
      if (spec.parcel.merged) continue;
      const { parcel } = spec;
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), parcel.yaw);
      const cos = Math.cos(parcel.yaw);
      const sin = Math.sin(parcel.yaw);
      // Parcel-local offset rotated into world (local x = long axis).
      const place = (lx: number, lz: number) =>
        new Vector3(spec.x + lx * cos + lz * sin, 0, parcel.z - lx * sin + lz * cos);
      matrix.compose(
        new Vector3(spec.x, 0.09, parcel.z),
        rotation,
        new Vector3(spec.width, 0.12, parcel.depth),
      );
      fields.setMatrixAt(fieldCursor, matrix);
      fields.setColorAt(fieldCursor, parcel.bare ? bareEarthTint : cropColors[parcel.crop]);
      fieldCursor += 1;

      furrowTint.copy(cropColors[parcel.crop]).multiplyScalar(0.68);
      for (let row = 0; row < spec.furrowRows; row += 1) {
        const lz = -parcel.depth / 2 + 0.55 + row * 0.72;
        if (lz > parcel.depth / 2 - 0.4) break;
        const offset = place(0, lz);
        matrix.compose(
          new Vector3(offset.x, 0.16, offset.z),
          rotation,
          new Vector3(spec.width - 0.7, 0.1, 0.24),
        );
        furrows.setMatrixAt(furrowCursor, matrix);
        furrows.setColorAt(furrowCursor, furrowTint);
        furrowCursor += 1;
      }

      const hw = spec.width / 2 + 0.2;
      const hd = parcel.depth / 2 + 0.2;
      const bundEdges: Array<[number, number, number, number]> = [
        [0, -hd, spec.width + 0.4, 0.3],
        [0, hd, spec.width + 0.4, 0.3],
        [-hw, 0, 0.3, parcel.depth + 0.4],
        [hw, 0, 0.3, parcel.depth + 0.4],
      ];
      for (const [lx, lz, sx, sz] of bundEdges) {
        const offset = place(lx, lz);
        matrix.compose(new Vector3(offset.x, 0.16, offset.z), rotation, new Vector3(sx, 0.22, sz));
        bunds.setMatrixAt(bundCursor, matrix);
        bundCursor += 1;
      }

      const rng = mulberry32(`giza:field-render:${parcel.row}:${parcel.column}`);
      for (let s = 0; s < spec.stooks; s += 1) {
        const offset = place(
          (rng() - 0.5) * (spec.width - 1.6),
          (rng() - 0.5) * (parcel.depth - 1.4),
        );
        const size = 0.38 + rng() * 0.2;
        matrix.compose(
          new Vector3(offset.x, 0.27, offset.z),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rng() * Math.PI),
          new Vector3(size, 0.55, size),
        );
        stooks.setMatrixAt(stookCursor, matrix);
        stookCursor += 1;
      }
      for (let s = 0; s < spec.scrub; s += 1) {
        const offset = place(
          (rng() - 0.5) * (spec.width - 1),
          (rng() - 0.5) * (parcel.depth - 0.8),
        );
        const size = 0.3 + rng() * 0.35;
        matrix.compose(
          new Vector3(offset.x, 0.2, offset.z),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rng() * Math.PI),
          new Vector3(size * 1.6, size * 0.5, size * 1.4),
        );
        scrubTufts.setMatrixAt(scrubCursor, matrix);
        scrubTufts.setColorAt(scrubCursor, scrubTint);
        scrubCursor += 1;
      }
    }
    fields.count = fieldCursor;
    furrows.count = furrowCursor;
    bunds.count = bundCursor;
    stooks.count = stookCursor;
    scrubTufts.count = scrubCursor;
    fields.receiveShadow = true;
    furrows.receiveShadow = true;
    bunds.receiveShadow = true;
    this.group.add(fields, furrows, bunds, stooks, scrubTufts);

    // Threshing floor at the strip's west end: hard-packed pad, a grain
    // mound (into the straw batch), and the working pair beside it.
    const threshingX = -102;
    const threshingZ = greenbeltInnerEdgeAt(threshingX) + 8;
    const padGeometry = new CylinderGeometry(3.2, 3.2, 0.06, 14);
    this.geometries.push(padGeometry);
    const pad = new Mesh(padGeometry, materials.compactedEarth);
    pad.position.set(threshingX, 0.05, threshingZ);
    pad.receiveShadow = true;
    pad.name = 'field-threshing-floor';
    this.group.add(pad);
    matrix.compose(
      new Vector3(threshingX + 0.9, 0.26, threshingZ + 0.4),
      new Quaternion(),
      new Vector3(1.7, 0.5, 1.7),
    );
    stooks.setMatrixAt(stookCursor, matrix);
    stookCursor += 1;
    stooks.count = stookCursor;

    // Field paths: trodden dirt spines along the strip between the rows,
    // following the meander, merged into one ribbon geometry.
    const pathAt = (rowEdge: number, x0: number, x1: number) => {
      const points: Vec3[] = [];
      for (let x = x0; x <= x1; x += 8) {
        points.push([x, 0.05, greenbeltInnerEdgeAt(x) + rowEdge]);
      }
      return roadGeometry(points, 1.4);
    };
    const fieldPaths = mergeRibbons([pathAt(7.1, -104, 96), pathAt(13.9, -100, 90)]);
    this.geometries.push(fieldPaths);
    const pathsMesh = new Mesh(fieldPaths, materials.compactedEarth);
    pathsMesh.receiveShadow = true;
    pathsMesh.name = 'field-trodden-paths';
    this.group.add(pathsMesh);

    // Field labor: a hoe pair in the plowed fallow, a gathering pair with an
    // ox team in the stubble — the strip is worked, not wallpaper. Static
    // deterministic figures; the living workers belong to the site crews.
    const laborBodyGeometry = new CylinderGeometry(0.16, 0.2, 0.62, 6);
    const laborHeadGeometry = new SphereGeometry(0.11, 6, 5);
    this.geometries.push(laborBodyGeometry, laborHeadGeometry);
    const laborBodies = new InstancedMesh(laborBodyGeometry, materials.linen, 4);
    const laborHeads = new InstancedMesh(laborHeadGeometry, materials.skin, 4);
    const oxen = new InstancedMesh(box, materials.cityRoof, 4);
    laborBodies.name = 'field-labor-worker-bodies';
    laborHeads.name = 'field-labor-worker-heads';
    oxen.name = 'field-labor-oxen';
    const plowed = cellSpecs.find((spec) => !spec.parcel.merged && spec.parcel.crop === 'fallow-plowed');
    const stubble = cellSpecs.find((spec) => !spec.parcel.merged && spec.parcel.crop === 'stubble');
    let laborCursor = 0;
    const worker = (x: number, z: number, yaw: number) => {
      // Bent forward at the hips, working the row.
      matrix.compose(
        new Vector3(x, 0.32, z),
        new Quaternion().setFromEuler(new Euler(0.42, yaw, 0, 'YXZ')),
        new Vector3(1, 1, 1),
      );
      laborBodies.setMatrixAt(laborCursor, matrix);
      matrix.compose(
        new Vector3(x + Math.sin(yaw) * 0.26, 0.62, z + Math.cos(yaw) * 0.26),
        new Quaternion(),
        new Vector3(1, 1, 1),
      );
      laborHeads.setMatrixAt(laborCursor, matrix);
      laborCursor += 1;
    };
    if (plowed) {
      const rng = mulberry32('giza:field-labor:plowed');
      worker(plowed.x - plowed.width * 0.28, plowed.parcel.z, rng() * Math.PI);
      worker(plowed.x + plowed.width * 0.22, plowed.parcel.z + 1.4, rng() * Math.PI);
    }
    if (stubble) {
      const rng = mulberry32('giza:field-labor:stubble');
      worker(stubble.x - stubble.width * 0.3, stubble.parcel.z + 0.8, rng() * Math.PI);
      worker(stubble.x + stubble.width * 0.34, stubble.parcel.z - 0.6, rng() * Math.PI);
      // An ox pair waiting at the parcel corner.
      for (let o = 0; o < 2; o += 1) {
        const ox = stubble.x + stubble.width * 0.42;
        const oz = stubble.parcel.z + stubble.parcel.depth * 0.28 + o * 1.05;
        const yaw = stubble.parcel.yaw + Math.PI / 2;
        matrix.compose(new Vector3(ox, 0.62, oz), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), new Vector3(1.5, 0.9, 0.62));
        oxen.setMatrixAt(o * 2, matrix);
        matrix.compose(
          new Vector3(ox + Math.sin(yaw) * 0.95, 0.68, oz + Math.cos(yaw) * 0.95),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
          new Vector3(0.46, 0.42, 0.42),
        );
        oxen.setMatrixAt(o * 2 + 1, matrix);
      }
    }
    laborBodies.count = laborCursor;
    laborHeads.count = laborCursor;
    laborBodies.castShadow = true;
    oxen.castShadow = true;
    this.group.add(laborBodies, laborHeads, oxen);

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
    // Doum fan fronds: short, wide, flat, and stiff — the forked palm reads
    // as a candelabra of paddles, not a feather crown.
    const fanFrondGeometry = new BoxGeometry(1.4, 0.06, 0.85);
    this.geometries.push(
      reedGeometry,
      trunkGeometry,
      crownGeometry,
      skirtGeometry,
      fruitGeometry,
      fanFrondGeometry,
    );

    // The palm stand: five typed archetypes (Spec 08 §Ecology) clustered
    // into groves with real gaps along the near bank (palmStandAt), plus a
    // grove stand on the Memphis riverfront. Per-palm seeded streams keep
    // every palm self-contained; rejected slots (off the stand extent, or
    // on the braid for the Memphis groves) are skipped outright, never
    // shuffled. Fork counts are drawn here so batch capacities are exact.
    const palmSpots: Array<{
      x: number;
      z: number;
      archetype: ReturnType<typeof palmArchetypeAt>;
      forks: number;
      rng: () => number;
    }> = [];
    for (let i = 0; i < GIZA_ENVIRONMENT.palms; i += 1) {
      const spot = palmStandAt(i);
      if (!spot) continue;
      const archetype = palmArchetypeAt(i);
      const rng = mulberry32(`giza:palm-stand:${i}`);
      const forks =
        archetype.forks[0] + Math.round(rng() * (archetype.forks[1] - archetype.forks[0]));
      palmSpots.push({ x: spot.x, z: spot.z, archetype, forks, rng });
    }
    for (let g = 0; g < GIZA_ENVIRONMENT.memphisGrovePalms; g += 1) {
      const spot = grovePalmAt(g);
      if (!spot) continue;
      const archetype = palmArchetypeAt(10_000 + g);
      const rng = mulberry32(`giza:palm-grove:${g}`);
      const forks =
        archetype.forks[0] + Math.round(rng() * (archetype.forks[1] - archetype.forks[0]));
      palmSpots.push({ x: spot.x, z: spot.z, archetype, forks, rng });
    }
    // One trunk and one crown heart per arm: a forked doum counts its arms.
    const trunkTotal = palmSpots.reduce((total, spot) => total + spot.forks, 0);
    const frondTotal = palmSpots.reduce(
      (total, spot) =>
        total +
        (spot.archetype.fanFronds
          ? 0
          : spot.archetype.uprightFronds + spot.archetype.droopingFronds),
      0,
    );
    const fanFrondTotal = palmSpots.reduce(
      (total, spot) =>
        total +
        (spot.archetype.fanFronds
          ? spot.forks * (spot.archetype.uprightFronds + spot.archetype.droopingFronds)
          : 0),
      0,
    );
    const skirtTotal = palmSpots.filter((spot) => spot.archetype.skirt > 0).length;
    const fruitTotal = palmSpots.filter((spot) => spot.archetype.fruit).length * 2;

    const reeds = new InstancedMesh(reedGeometry, materials.foliage, GIZA_ENVIRONMENT.reedClusters);
    const trunks = new InstancedMesh(trunkGeometry, materials.wood, Math.max(1, trunkTotal));
    const crowns = new InstancedMesh(crownGeometry, materials.foliage, Math.max(1, trunkTotal));
    const skirts = new InstancedMesh(skirtGeometry, materials.wood, Math.max(1, skirtTotal));
    // Sun-cured amber: date bunches read as warm fruit against the crown.
    const fruitMaterial = new MeshStandardMaterial({ color: '#bd7a2c', roughness: 0.75 });
    this.extraMaterials.push(fruitMaterial);
    const fruits = new InstancedMesh(fruitGeometry, fruitMaterial, Math.max(1, fruitTotal));
    const fronds = new InstancedMesh(frondGeometry, materials.foliage, Math.max(1, frondTotal));
    const fanFronds = new InstancedMesh(
      fanFrondGeometry,
      materials.foliage,
      Math.max(1, fanFrondTotal),
    );
    const random = mulberry32('giza:river-ecology:v3');
    const matrix = new Matrix4();
    const upperFrondColors = [new Color('#527a3a'), new Color('#5f8442'), new Color('#6d8f4b')];
    const lowerFrondColors = [new Color('#7d8f4b'), new Color('#93914f'), new Color('#a08a52')];
    // Doum fronds carry the species' grey-green (glaucous) cast.
    const fanFrondColors = [new Color('#5d7f52'), new Color('#698a58'), new Color('#54744a')];

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

    let trunkCursor = 0;
    let crownCursor = 0;
    let frondCursor = 0;
    let fanFrondCursor = 0;
    let skirtCursor = 0;
    let fruitCursor = 0;
    for (let i = 0; i < palmSpots.length; i += 1) {
      const spot = palmSpots[i]!;
      const { archetype, rng } = spot;
      const height = archetype.height[0] + rng() * (archetype.height[1] - archetype.height[0]);
      if (archetype.fanFronds) {
        // Doum (Hyphaene thebaica): the trunk forks into 2–3 arms angled
        // from the base — dichotomous branching — each arm tip carrying a
        // small crown heart with one ring of stiff fan fronds.
        const baseAzimuth = rng() * Math.PI * 2;
        for (let arm = 0; arm < spot.forks; arm += 1) {
          const azimuth = baseAzimuth + (arm / spot.forks) * Math.PI * 2 + (rng() - 0.5) * 0.5;
          const spread = 0.24 + rng() * 0.14;
          const armHeight = height * (0.92 + rng() * 0.16);
          // Tilt the shared trunk geometry about the horizontal axis
          // perpendicular to the arm's azimuth, so the arm's base sits
          // exactly on the fork point and its tip math stays exact.
          const armTilt = new Quaternion().setFromAxisAngle(
            new Vector3(Math.sin(azimuth), 0, -Math.cos(azimuth)),
            spread,
          );
          const axisX = Math.sin(spread) * Math.cos(azimuth);
          const axisY = Math.cos(spread);
          const axisZ = Math.sin(spread) * Math.sin(azimuth);
          matrix.compose(
            new Vector3(
              spot.x + 2.2 * armHeight * axisX,
              2.2 * armHeight * axisY,
              spot.z + 2.2 * armHeight * axisZ,
            ),
            armTilt,
            new Vector3(0.82, armHeight, 0.82),
          );
          trunks.setMatrixAt(trunkCursor, matrix);
          trunkCursor += 1;
          const crownX = spot.x + 4.4 * armHeight * axisX;
          const crownY = 4.4 * armHeight * axisY;
          const crownZ = spot.z + 4.4 * armHeight * axisZ;
          // A small heart per arm: the doum crown is a tuft, not a heart.
          matrix.compose(
            new Vector3(crownX, crownY, crownZ),
            new Quaternion(),
            new Vector3(0.58 + rng() * 0.18, 0.48 + rng() * 0.16, 0.58 + rng() * 0.18),
          );
          crowns.setMatrixAt(crownCursor, matrix);
          crownCursor += 1;
          const frondSpecs: (typeof this.palmSway)[number]['fronds'] = [];
          for (let frond = 0; frond < archetype.uprightFronds; frond += 1) {
            const yaw = (frond / archetype.uprightFronds) * Math.PI * 2 + rng() * 0.3;
            // Stiff and shallow-angled; length/width scale the baked fan
            // geometry rather than the unit feather box.
            frondSpecs.push({
              yaw,
              droop: -(0.16 + rng() * 0.14),
              length: 0.85 + rng() * 0.3,
              width: 0.9 + rng() * 0.2,
              phase: rng() * Math.PI * 2,
              fan: true,
            });
            fanFronds.setColorAt(fanFrondCursor, fanFrondColors[Math.floor(rng() * 3)]!);
            fanFrondCursor += 1;
          }
          this.palmSway.push({
            crownX,
            crownY,
            crownZ,
            ring: archetype.crownRadius,
            fronds: frondSpecs,
          });
        }
        continue;
      }
      // The crown shifts with the trunk's tilt.
      const lean = archetype.lean[0] + rng() * (archetype.lean[1] - archetype.lean[0]);
      const leanAzimuth = rng() * Math.PI * 2;
      const tilt = new Quaternion().setFromEuler(
        new Euler(lean * Math.cos(leanAzimuth), rng() * Math.PI, lean * Math.sin(leanAzimuth), 'YXZ'),
      );
      matrix.compose(new Vector3(spot.x, 2.2 * height, spot.z), tilt, new Vector3(1, height, 1));
      trunks.setMatrixAt(trunkCursor, matrix);
      trunkCursor += 1;
      const crownX = spot.x + 4.4 * height * Math.sin(lean) * Math.cos(leanAzimuth);
      const crownZ = spot.z + 4.4 * height * Math.sin(lean) * Math.sin(leanAzimuth);
      const crownY = 4.42 * height;
      // Crown girth varies per palm: no two hearts match.
      matrix.compose(
        new Vector3(crownX, crownY, crownZ),
        new Quaternion(),
        new Vector3(1.05 + rng() * 0.45, 0.62 + rng() * 0.28, 1.05 + rng() * 0.45),
      );
      crowns.setMatrixAt(crownCursor, matrix);
      crownCursor += 1;
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
      // each with its own color range (drier below). Counts, ring radius,
      // length, and extra droop come from the archetype — a young palm
      // carries almost no drooping tier, a weeping palm's long fronds fall
      // in a wide fountain.
      const frondSpecs: (typeof this.palmSway)[number]['fronds'] = [];
      const tiers: Array<{ count: number; upper: boolean }> = [
        { count: archetype.uprightFronds, upper: true },
        { count: archetype.droopingFronds, upper: false },
      ];
      for (const tier of tiers) {
        for (let frond = 0; frond < tier.count; frond += 1) {
          const yaw = (frond / Math.max(1, tier.count)) * Math.PI * 2 + (tier.upper ? 0 : 0.63) + rng() * 0.22;
          const droop =
            (tier.upper ? -(0.3 + rng() * 0.16) : -(0.72 + rng() * 0.2)) - archetype.droopExtra;
          const length =
            (tier.upper ? 3.6 + rng() * 0.9 : 2.6 + rng() * 0.7) *
            Math.min(1, height) *
            archetype.frondLength;
          const width = 0.3 + rng() * 0.14;
          frondSpecs.push({ yaw, droop, length, width, phase: rng() * Math.PI * 2 });
          fronds.setColorAt(
            frondCursor,
            (tier.upper ? upperFrondColors : lowerFrondColors)[Math.floor(rng() * 3)]!,
          );
          frondCursor += 1;
        }
      }
      this.palmSway.push({ crownX, crownY, crownZ, ring: archetype.crownRadius, fronds: frondSpecs });
    }
    // Draw only placed instances: archetypes vary the counts per palm.
    trunks.count = trunkCursor;
    crowns.count = crownCursor;
    skirts.count = skirtCursor;
    fruits.count = fruitCursor;
    fanFronds.count = fanFrondCursor;
    this.palmFronds = fronds;
    this.palmFanFronds = fanFronds;
    // Understory litter (Spec 08 §Ecology): fallen dry fronds and dropped
    // dates under every crown, so the ground beneath a palm tells on it.
    const litterGeometry = new BoxGeometry(1, 0.04, 0.3);
    this.geometries.push(litterGeometry);
    const litter = new InstancedMesh(litterGeometry, materials.foliage, this.palmSway.length * 2);
    const litterTint = new Color('#7a6a3f');
    let litterCursor = 0;
    for (const palm of this.palmSway) {
      const rng = mulberry32(`giza:palm-litter:${litterCursor}`);
      for (let piece = 0; piece < 2; piece += 1) {
        const angle = rng() * Math.PI * 2;
        const radius = 0.7 + rng() * 1.1;
        matrix.compose(
          new Vector3(palm.crownX + Math.cos(angle) * radius, 0.05, palm.crownZ + Math.sin(angle) * radius),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rng() * Math.PI),
          new Vector3(1.3 + rng() * 0.9, 1, 1),
        );
        litter.setMatrixAt(litterCursor, matrix);
        litter.setColorAt(litterCursor, litterTint);
        litterCursor += 1;
      }
    }
    litter.count = litterCursor;
    litter.receiveShadow = true;
    litter.name = 'palm-understory-fallen-fronds';
    this.group.add(litter);
    // Frond matrices sway every frame; opt out of the stale-bounds cull.
    fronds.frustumCulled = false;
    fanFronds.frustumCulled = false;
    this.updatePalms(0);
    reeds.name = 'nile-bank-reed-clusters';
    trunks.name = 'greenbelt-palm-trunks';
    crowns.name = 'greenbelt-palm-hearts';
    skirts.name = 'greenbelt-palm-dead-frond-skirts';
    fruits.name = 'greenbelt-date-fruit-clusters';
    fronds.name = 'greenbelt-individual-palm-fronds';
    fanFronds.name = 'palm-fan-fronds';
    trunks.castShadow = true;
    crowns.castShadow = true;
    fronds.castShadow = true;
    fanFronds.castShadow = true;
    fruits.castShadow = false;
    this.group.add(reeds, trunks, crowns, skirts, fruits, fronds, fanFronds);
  }

  /** Gentle frond sway in the northerly breeze; a pure function of t. */
  private updatePalms(t: number): void {
    if (!this.palmFronds) return;
    const matrix = new Matrix4();
    let cursor = 0;
    let fanCursor = 0;
    for (const palm of this.palmSway) {
      for (const frond of palm.fronds) {
        // Doum fan fronds are stiff: they rock rather than sway.
        const amplitude = frond.fan ? 0.022 : 0.055;
        const sway = amplitude * Math.sin(Math.PI * 2 * t * 10 + frond.phase);
        const rotation = new Quaternion().setFromEuler(
          new Euler(0, frond.yaw, frond.droop + sway, 'YXZ'),
        );
        matrix.compose(
          new Vector3(
            palm.crownX + Math.cos(frond.yaw) * palm.ring,
            palm.crownY + 0.15,
            palm.crownZ + Math.sin(frond.yaw) * palm.ring,
          ),
          rotation,
          frond.fan
            ? new Vector3(frond.length, 1, frond.width)
            : new Vector3(frond.length, 0.08, frond.width),
        );
        if (frond.fan) {
          this.palmFanFronds?.setMatrixAt(fanCursor, matrix);
          fanCursor += 1;
        } else {
          this.palmFronds.setMatrixAt(cursor, matrix);
          cursor += 1;
        }
      }
    }
    this.palmFronds.instanceMatrix.needsUpdate = true;
    if (this.palmFanFronds) this.palmFanFronds.instanceMatrix.needsUpdate = true;
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
    // library linen on worker clothing stays still (Spec 06). Aged flax
    // deeper than the whitewashed city wall behind — the square sail must
    // not camo against Memphis at the dusk beats (review-board evidence).
    const sailCloth = materials.linen.clone();
    sailCloth.color.set('#c4a877');
    applyClothSway(sailCloth, 'sail');
    this.clothMaterials.push(sailCloth);
    const sails = new InstancedMesh(sailGeometry, sailCloth, sailCount);
    const oars = new InstancedMesh(oarGeometry, materials.wood, oarCount);
    const cargo = new InstancedMesh(cargoGeometry, materials.block['casing-limestone'], cargoCount);
    const bundles = new InstancedMesh(bundleGeometry, materials.cityAccent, bundleCount);

    // Living-water fittings (Spec 08 §Living environment): a fading foam
    // wake trailing every moving hull, a two-figure deck crew, a water jar
    // and a rope coil per deck; the moored skiff instead gets a bank stake
    // and a rope that rides its bow. (This block runs before `this.boats`
    // is populated below — counts come straight from the fleet plan.)
    const movingCount = fleet
      .filter((craft) => craft.kind !== 'reed-skiff')
      .reduce((total, craft) => total + craft.count, 0);
    const wakeGeometry = new BoxGeometry(1, 0.04, 1);
    const crewBodyGeometry = new CylinderGeometry(0.16, 0.2, 0.62, 6);
    const crewHeadGeometry = new SphereGeometry(0.11, 6, 5);
    const jarGeometry = new CylinderGeometry(0.09, 0.13, 0.3, 7);
    const coilGeometry = new TorusGeometry(0.16, 0.05, 5, 10);
    coilGeometry.rotateX(Math.PI / 2);
    const stakeGeometry = new CylinderGeometry(0.05, 0.07, 0.55, 5);
    const ropeGeometry = new CylinderGeometry(0.025, 0.025, 1, 4);
    ropeGeometry.translate(0, 0.5, 0);
    this.geometries.push(
      wakeGeometry,
      crewBodyGeometry,
      crewHeadGeometry,
      jarGeometry,
      coilGeometry,
      stakeGeometry,
      ropeGeometry,
    );
    const wakeMaterial = materials.whitewash.clone();
    wakeMaterial.transparent = true;
    // Review-board evidence: below ~0.45 the trail is sub-threshold at 1x.
    wakeMaterial.opacity = 0.5;
    wakeMaterial.depthWrite = false;
    this.extraMaterials.push(wakeMaterial);
    const wakes = new InstancedMesh(wakeGeometry, wakeMaterial, movingCount * (WAKE_SEGMENTS + 1));
    const crewBodies = new InstancedMesh(crewBodyGeometry, materials.linen, movingCount * 2);
    const crewHeads = new InstancedMesh(crewHeadGeometry, materials.skin, movingCount * 2);
    const jars = new InstancedMesh(jarGeometry, materials.cityRoof, movingCount);
    const coils = new InstancedMesh(coilGeometry, materials.rope, movingCount);
    const mooringStake = new Mesh(stakeGeometry, materials.wood);
    const mooringRope = new InstancedMesh(ropeGeometry, materials.rope, 1);
    wakes.castShadow = false;
    crewBodies.castShadow = true;
    crewHeads.castShadow = true;
    wakes.name = 'nile-boat-wake-ribbons';
    crewBodies.name = 'nile-boat-crew-bodies';
    crewHeads.name = 'nile-boat-crew-heads';
    jars.name = 'nile-boat-water-jars';
    coils.name = 'nile-boat-rope-coils';
    mooringStake.name = 'nile-skiff-mooring-stake';
    mooringRope.name = 'nile-skiff-mooring-rope';
    // The stake is static; compute it from the skiff's moored state (the
    // skiff is the fleet's last craft, so its global index is the last one).
    {
      const skiffCraft = fleet.find((craft) => craft.kind === 'reed-skiff')!;
      const skiff = riverCraftStateAt(skiffCraft, totalBoats - 1, 0);
      mooringStake.position.set(skiff.x + 1.9, 0.28, skiff.z + 1.5);
      mooringStake.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), -0.12);
    }
    this.group.add(wakes, crewBodies, crewHeads, jars, coils, mooringStake, mooringRope);

    this.boatFleet = {
      hulls,
      reedHulls,
      masts,
      yards,
      booms,
      sails,
      oars,
      cargo,
      bundles,
      wakes,
      crewBodies,
      crewHeads,
      jars,
      coils,
      mooringStake,
      mooringRope,
    };
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

  /** Boat motion, wakes, and deck life — all pure functions of t (Spec 08). */
  private updateBoats(t: number): void {
    if (!this.boatFleet) return;
    const {
      hulls,
      reedHulls,
      masts,
      yards,
      booms,
      sails,
      oars,
      cargo,
      bundles,
      wakes,
      crewBodies,
      crewHeads,
      jars,
      coils,
      mooringStake,
      mooringRope,
    } = this.boatFleet;
    const matrix = new Matrix4();
    const up = new Vector3(0, 1, 0);
    const down = new Vector3(0, -1, 0);
    let hullIndex = 0;
    let skiffIndex = 0;
    let sailIndex = 0;
    let oarIndex = 0;
    let cargoIndex = 0;
    let bundleIndex = 0;
    let wakeIndex = 0;
    let crewIndex = 0;
    let detailIndex = 0;
    for (const boat of this.boats) {
      const state = riverCraftStateAt(boat.craft, boat.globalIndex, t);
      const rotation = new Quaternion().setFromEuler(
        // Bow/stern pitch about the beam axis, heel roll, then heading.
        new Euler(state.roll, state.yaw, state.pitch, 'YXZ'),
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

        // Wake: the boat's own recent path, fading and spreading astern.
        // A lookback across the wrap point would streak across the world —
        // collapse those segments to zero scale instead (deterministic).
        for (let k = 1; k <= WAKE_SEGMENTS; k += 1) {
          const past = riverCraftStateAt(boat.craft, boat.globalIndex, t - k * WAKE_DT);
          const jumped = Math.abs(past.x - state.x) > 24;
          const fade = 1 - k / (WAKE_SEGMENTS + 1);
          // Hulls are long along local x (bow +x): astern is −(cos, −sin)
          // of the past heading — never the bird flock's +z convention.
          matrix.compose(
            new Vector3(
              past.x - Math.cos(past.yaw) * 0.9,
              0.1 + gizaWaveHeightAt(past.x, past.z, t) * 0.4,
              past.z + Math.sin(past.yaw) * 0.9,
            ),
            new Quaternion().setFromAxisAngle(up, past.yaw),
            jumped
              ? new Vector3(0, 0, 0)
              : new Vector3((0.55 + k * 0.24) * fade, 1, 1.05 * fade),
          );
          wakes.setMatrixAt(wakeIndex, matrix);
          wakeIndex += 1;
        }
        // Bow pulse: a small bright ellipse breathing with the bow wave.
        const bowPulse = 0.55 + 0.2 * Math.sin(state.pitch * 14 + t * Math.PI * 2 * 2.2 + boat.globalIndex * 1.7);
        matrix.compose(
          place(new Vector3(1.95, -state.bobY + 0.11, 0)),
          rotation,
          new Vector3(1.2 * bowPulse, 1, 0.75 * bowPulse),
        );
        wakes.setMatrixAt(wakeIndex, matrix);
        wakeIndex += 1;

        // Deck crew: helmsman aft between the quarter oars, a hand forward;
        // figures stand upright while their footing rides the hull.
        const upright = new Quaternion().setFromAxisAngle(up, state.yaw);
        for (const local of [
          new Vector3(-1.5, 0.62, 0),
          new Vector3(0.7, 0.6, 0.18),
        ]) {
          matrix.compose(place(local), upright, new Vector3(1, 1, 1));
          crewBodies.setMatrixAt(crewIndex, matrix);
          matrix.compose(place(local.clone().add(new Vector3(0, 0.42, 0))), upright, new Vector3(1, 1, 1));
          crewHeads.setMatrixAt(crewIndex, matrix);
          crewIndex += 1;
        }
        // Deck detail: one water jar and one rope coil per moving hull.
        matrix.compose(place(new Vector3(-0.4, 0.52, -0.3)), rotation, new Vector3(1, 1, 1));
        jars.setMatrixAt(detailIndex, matrix);
        matrix.compose(place(new Vector3(0.2, 0.52, 0.34)), rotation, new Vector3(1, 1, 1));
        coils.setMatrixAt(detailIndex, matrix);
        detailIndex += 1;
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
      // dipping into the water; the steersman sweeps them, biased into turns.
      const oarSides = isSkiff ? [1] : [-1, 1];
      const oarPivotX = isSkiff ? -1.35 : -1.85;
      const oarPivotY = isSkiff ? 0.62 : 0.5;
      const oarPivotZ = isSkiff ? 0.28 : 0.5;
      for (const side of oarSides) {
        const direction = new Vector3(-0.78, -0.72, 0.28 * side)
          .applyAxisAngle(up, state.oarSweep)
          .normalize();
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
      if (isSkiff) {
        // Mooring rope: stake on the bank to the bow cleat, riding the bow.
        const bow = place(new Vector3(1.55, -state.bobY + 0.42, 0));
        const stakeTop = mooringStake.position.clone().add(new Vector3(0, 0.26, 0));
        const span = bow.clone().sub(stakeTop);
        const ropeLength = span.length();
        matrix.compose(
          stakeTop,
          new Quaternion().setFromUnitVectors(up, span.normalize()),
          new Vector3(1, ropeLength, 1),
        );
        mooringRope.setMatrixAt(0, matrix);
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
    wakes.instanceMatrix.needsUpdate = true;
    crewBodies.instanceMatrix.needsUpdate = true;
    crewHeads.instanceMatrix.needsUpdate = true;
    jars.instanceMatrix.needsUpdate = true;
    coils.instanceMatrix.needsUpdate = true;
    mooringRope.instanceMatrix.needsUpdate = true;
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

  /**
   * Nudge, then verify at the same margins: the nudge's last pass resolves
   * footprints and can push a prop back into a lane (corridors resolve
   * first). A spot that still fails is rejected — null — rather than left
   * straddling a corridor.
   */
  private placeIfClear(
    x: number,
    z: number,
    margin: number,
    lane = 0,
  ): [number, number] | null {
    const [px, pz] = this.clear(x, z, margin, lane);
    // Verify slightly STRICTER than claimed: a point nudged to exactly the
    // corridor clearance sits one float-epsilon from failing its own audit.
    return isClearOfSiteWorks(px, pz, this.keepOuts, this.corridors, {
      margin: margin + 0.05,
      corridorClearance: lane + 0.05,
    })
      ? [px, pz]
      : null;
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
    // Ridge tents: two sloped cloth panels per ridge — the second archetype
    // that breaks the cone grid's stamp (Spec 08 §Site zones 7).
    const ridgeTents = new InstancedMesh(crateGeometry, tentCloth, 16);
    const random = mulberry32('giza:worker-settlement');
    const matrix = new Matrix4();
    const up = new Vector3(0, 1, 0);
    const ridgeAxis = new Vector3(1, 0, 0);
    for (let i = 0; i < 27; i += 1) {
      const [x, z] = this.clear(
        -36 + (i % 9) * 10 + (random() - 0.5) * 1.6,
        39 + Math.floor(i / 9) * 8 + (random() - 0.5) * 1.5,
        2.2,
        4.2,
      );
      // Lived-in variance: free yaw and 0.85–1.25× scale, never one stamp.
      const scale = 0.85 + random() * 0.4;
      matrix.compose(
        new Vector3(x, 1.35 * scale, z),
        new Quaternion().setFromAxisAngle(up, random() * Math.PI * 2),
        new Vector3(3 * scale, 2.7 * scale, 3 * scale),
      );
      tents.setMatrixAt(i, matrix);
      this.tentSpots.push({ x, z });
    }
    for (let i = 0; i < 8; i += 1) {
      const [x, z] = this.clear(
        -34 + (i % 4) * 16 + (random() - 0.5) * 3,
        58 + Math.floor(i / 4) * 6 + (random() - 0.5) * 2,
        2.6,
        4.2,
      );
      const yaw = random() * Math.PI * 2;
      const ridgeYaw = new Quaternion().setFromAxisAngle(up, yaw);
      for (const side of [-1, 1] as const) {
        const tilt = new Quaternion()
          .setFromAxisAngle(ridgeAxis, side * 0.56)
          .premultiply(ridgeYaw);
        matrix.compose(
          new Vector3(x - Math.sin(yaw) * side * 0.5, 0.82, z - Math.cos(yaw) * side * 0.5),
          tilt,
          new Vector3(2.6, 0.06, 1.65),
        );
        ridgeTents.setMatrixAt(i * 2 + (side + 1) / 2, matrix);
      }
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
    for (const item of [tents, supplies, shadeCloths, shadePoles, ridgeTents]) {
      item.castShadow = true;
    }
    tents.name = 'worker-settlement-tents';
    supplies.name = 'worker-settlement-supplies';
    shadeCloths.name = 'worker-settlement-shade-cloths';
    shadePoles.name = 'worker-settlement-shade-poles';
    ridgeTents.name = 'worker-settlement-ridge-tents';
    this.group.add(tents, supplies, shadeCloths, shadePoles, ridgeTents);
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
   * Site staging and camp ground story (Spec 08 §Site zones 2–4, 7): the
   * equipment and domestic scatter a state project actually leaves lying —
   * idle sleds parked at road ends, lever piles cached at ramp feet, rope
   * coils at the queue waypoints and in camp, marker stones and water
   * troughs where the haul roads are wetted, and the camp's baskets, jars,
   * and cook pots, joined by trampled paths to the road and quarry.
   * Everything clears footprints and haul lanes through the shared rules.
   */
  private addStagingEquipment(materials: MaterialLibrary): void {
    const box = new BoxGeometry(1, 1, 1);
    const coilGeometry = new TorusGeometry(0.16, 0.05, 5, 10);
    coilGeometry.rotateX(Math.PI / 2);
    const potteryGeometry = new CylinderGeometry(0.5, 0.5, 1, 8);
    const markerGeometry = new ConeGeometry(0.22, 0.7, 6);
    this.geometries.push(box, coilGeometry, potteryGeometry, markerGeometry);
    const random = mulberry32('giza:site-staging:v1');
    const matrix = new Matrix4();
    const up = new Vector3(0, 1, 0);

    // Idle wood equipment: parked sleds (bed + two runners each) near the
    // road ends, lever poles cached in crossed piles at the ramp feet.
    const equipment = new InstancedMesh(box, materials.wood, 24);
    equipment.name = 'site-idle-sleds-and-lever-piles';
    let woodCursor = 0;
    for (let s = 0; s < 4; s += 1) {
      // The bed center verifying is not enough: the runners extend 0.48 to
      // either side, and a runner poking over a footprint edge reads as
      // clipping. Verify all three contact lines before parking.
      const yaw = random() * Math.PI;
      const cx = -64 + s * 18 + (random() - 0.5) * 3;
      const cz = 46.5 + (random() - 0.5) * 2.5;
      const runnerAt = (side: number): [number, number] => [
        cx - Math.sin(yaw) * side * 0.48,
        cz - Math.cos(yaw) * side * 0.48,
      ];
      const bed = this.placeIfClear(cx, cz, 2.0, 1.8);
      const runners = [runnerAt(-1), runnerAt(1)].map(([rx, rz]) =>
        this.placeIfClear(rx, rz, 1.25, 1.6),
      );
      // Parked on the camp fringe: never overlapping a tent either.
      const nearTent = this.tentSpots.some(
        (spot) => bed && Math.hypot(spot.x - bed[0], spot.z - bed[1]) < 2.8,
      );
      if (!bed || runners.some((spot) => !spot) || nearTent) continue;
      const [x, z] = bed;
      const yawQ = new Quaternion().setFromAxisAngle(up, yaw);
      matrix.compose(new Vector3(x, 0.24, z), yawQ, new Vector3(2.1, 0.22, 1.1));
      equipment.setMatrixAt(woodCursor, matrix);
      woodCursor += 1;
      for (const side of [-1, 1] as const) {
        const [rx, rz] = runners[(side + 1) / 2]!;
        matrix.compose(
          new Vector3(rx, 0.09, rz),
          yawQ,
          new Vector3(2.3, 0.18, 0.16),
        );
        equipment.setMatrixAt(woodCursor, matrix);
        woodCursor += 1;
      }
    }
    for (const route of this.plan.routes.slice(0, 3)) {
      const [fx, , fz] = route.waypoints.rampFoot;
      // Margin covers the per-pole jitter so no pole escapes verification.
      const spot = this.placeIfClear(fx + 2.4, fz + 1.6, 1.9, 2.6);
      if (!spot) continue;
      const [x, z] = spot;
      for (let pole = 0; pole < 4; pole += 1) {
        matrix.compose(
          new Vector3(x + (random() - 0.5) * 0.5, 0.1 + pole * 0.09, z + (random() - 0.5) * 0.5),
          new Quaternion().setFromAxisAngle(up, pole * 0.42 + random() * 0.2),
          new Vector3(2.6, 0.09, 0.09),
        );
        equipment.setMatrixAt(woodCursor, matrix);
        woodCursor += 1;
      }
    }
    equipment.count = woodCursor;
    equipment.castShadow = true;
    this.group.add(equipment);

    // Queue furniture per route: two marker stones and a water trough.
    const markers = new InstancedMesh(markerGeometry, materials.cityAccent, this.plan.routes.length * 2);
    const troughs = new InstancedMesh(box, materials.compactedEarth, this.plan.routes.length);
    markers.name = 'haul-queue-marker-stones';
    troughs.name = 'haul-queue-water-troughs';
    let markerCursor = 0;
    let troughCursor = 0;
    for (let r = 0; r < this.plan.routes.length; r += 1) {
      const [qx, , qz] = this.plan.routes[r]!.waypoints.roadQueue;
      for (const off of [-1.7, 1.7]) {
        const spot = this.placeIfClear(qx + off, qz + 1.9, 0.4, 2.0);
        if (!spot) continue;
        matrix.compose(new Vector3(spot[0], 0.35, spot[1]), new Quaternion(), new Vector3(1, 1, 1));
        markers.setMatrixAt(markerCursor, matrix);
        markerCursor += 1;
      }
      const trough = this.placeIfClear(qx - 2.6, qz - 2.2, 0.8, 2.2);
      if (trough) {
        matrix.compose(new Vector3(trough[0], 0.22, trough[1]), new Quaternion().setFromAxisAngle(up, random() * Math.PI), new Vector3(1.7, 0.44, 0.9));
        troughs.setMatrixAt(troughCursor, matrix);
        troughCursor += 1;
      }
    }
    markers.count = markerCursor;
    troughs.count = troughCursor;
    markers.castShadow = true;
    troughs.castShadow = true;
    troughs.receiveShadow = true;
    this.group.add(markers, troughs);

    // Rope coils: at the queue waypoints and beside camp shade frames.
    const coils = new InstancedMesh(coilGeometry, materials.rope, 14);
    coils.name = 'site-rope-coils';
    let coilCursor = 0;
    for (const route of this.plan.routes) {
      const [qx, , qz] = route.waypoints.roadQueue;
      const spot = this.placeIfClear(qx + 2.2, qz + 0.9, 0.4, 1.8);
      if (!spot) continue;
      matrix.compose(new Vector3(spot[0], 0.06, spot[1]), new Quaternion(), new Vector3(1, 1, 1));
      coils.setMatrixAt(coilCursor, matrix);
      coilCursor += 1;
    }
    let coilAttempts = 0;
    while (coilCursor < 14 && coilAttempts < 26 && this.tentSpots.length > 0) {
      const spot = this.tentSpots[coilAttempts % this.tentSpots.length]!;
      coilAttempts += 1;
      const placed = this.placeIfClear(spot.x + 2.6, spot.z + 1.8, 0.4, 1.2);
      if (!placed) continue; // reject: no identity instance inside the count
      matrix.compose(new Vector3(placed[0], 0.06, placed[1]), new Quaternion(), new Vector3(1, 1, 1));
      coils.setMatrixAt(coilCursor, matrix);
      coilCursor += 1;
    }
    coils.count = coilCursor;
    this.group.add(coils);

    // Camp domestic kit: baskets and jars clustered by the tents, cook pots
    // at the fire pits. Per-instance tints over the pottery material.
    const pottery = new InstancedMesh(potteryGeometry, materials.cityRoof, 30);
    pottery.name = 'camp-domestic-pottery';
    const firedRed = new Color('#8a4f30');
    const paleClay = new Color('#b98a5e');
    let potCursor = 0;
    const pot = (x: number, z: number, radius: number, height: number) => {
      if (potCursor >= 30) return;
      const placed = this.placeIfClear(x, z, 0.4, 0.8);
      if (!placed) return;
      matrix.compose(new Vector3(placed[0], height / 2, placed[1]), new Quaternion().setFromAxisAngle(up, random() * Math.PI), new Vector3(radius * 2, height, radius * 2));
      pottery.setMatrixAt(potCursor, matrix);
      pottery.setColorAt(potCursor, random() < 0.5 ? firedRed : paleClay);
      potCursor += 1;
    };
    for (let i = 0; i < 12 && this.tentSpots.length > 0; i += 1) {
      const spot = this.tentSpots[(i * 2) % this.tentSpots.length]!;
      pot(spot.x + 2.1 + random() * 0.8, spot.z - 1.6 + random() * 0.8, 0.14, 0.52);
      if (i % 2 === 0) pot(spot.x - 2.2 - random() * 0.6, spot.z + 1.9, 0.26, 0.3);
    }
    for (const base of this.campfires?.bases ?? []) {
      pot(base.x + 0.85, base.z + 0.55, 0.2, 0.26);
    }
    pottery.count = potCursor;
    pottery.castShadow = true;
    this.group.add(pottery);

    // Trampled paths: camp center to the haul road and west to the quarry
    // lip, merged into one ribbon geometry (one draw call).
    const pathsGeometry = mergeRibbons([
      roadGeometry(
        [
          [-8, 0.045, 44],
          [-14, 0.05, 40],
          [-22, 0.05, 36],
          [-28, 0.055, 32.5],
        ],
        2.2,
      ),
      roadGeometry(
        [
          [-24, 0.045, 46],
          [-34, 0.05, 42],
          [-43, 0.05, 36],
          [-49, 0.055, 32],
        ],
        1.8,
      ),
    ]);
    this.geometries.push(pathsGeometry);
    const paths = new Mesh(pathsGeometry, materials.compactedEarth);
    paths.receiveShadow = true;
    paths.name = 'camp-trampled-paths';
    this.group.add(paths);
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
    const paleRock = new Color('#c8ab7d');
    const darkRock = new Color('#8a6a48');
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
      const size = 0.16 + random() * 0.7;
      matrix.compose(
        new Vector3(x, size * 0.28, z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI),
        new Vector3(size * (1.1 + random() * 0.7), size * 0.65, size * (0.8 + random() * 0.5)),
      );
      rocks.setMatrixAt(rockCursor, matrix);
      // Weathered limestone comes in two readings: fresh-split pale and
      // long-surface dark.
      rocks.setColorAt(rockCursor, random() < 0.55 ? paleRock : darkRock);
      rockCursor += 1;
    }
    // Foreground interest (visual director): the reveal's lower third was
    // dead sand. Spoil heaps and abandoned rough-cut stones — the debris a
    // decades-long quarry actually leaves — scattered through the southern
    // and western foreground, clear of every footprint and haul lane. Three
    // heap silhouettes (conical dump, skirted mound, windrow ridge) in two
    // earth tints, clustered the way dumping actually accumulates.
    const dumpGeometry = new ConeGeometry(0.5, 1, 8);
    const moundGeometry = new DodecahedronGeometry(0.5, 0);
    const ridgeGeometry = new BoxGeometry(1, 1, 1);
    const roughBlockGeometry = new BoxGeometry(1, 1, 1);
    this.geometries.push(dumpGeometry, moundGeometry, ridgeGeometry, roughBlockGeometry);
    const dumps = new InstancedMesh(dumpGeometry, materials.compactedEarth, 18);
    const mounds = new InstancedMesh(moundGeometry, materials.compactedEarth, 18);
    const ridges = new InstancedMesh(ridgeGeometry, materials.compactedEarth, 16);
    const roughBlocks = new InstancedMesh(roughBlockGeometry, materials.quarryCut, 22);
    const debrisRandom = mulberry32('giza:foreground-debris:v2');
    const freshEarth = new Color('#a4734a');
    const oldEarth = new Color('#8a613c');
    // Cluster centers: dumping concentrates near the quarry rim and along
    // the southern foreground the reveal camera looks across.
    const spoilClusters: Array<[number, number]> = [
      [-72, 12],
      [-58, 52],
      [-88, 34],
      [-38, 66],
      [-14, 74],
      [8, 62],
    ];
    let dumpCursor = 0;
    let moundCursor = 0;
    let ridgeCursor = 0;
    for (const [cx, cz] of spoilClusters) {
      const members = 7 + Math.floor(debrisRandom() * 3);
      for (let m = 0; m < members; m += 1) {
        const x = cx + (debrisRandom() - 0.5) * 14;
        const z = cz + (debrisRandom() - 0.5) * 12;
        if (z < 26 && x > -48) continue; // keep the central working plateau open
        if (!isClearOfSiteWorks(x, z, this.keepOuts, this.corridors, {
          margin: 2.4,
          corridorClearance: 3,
        })) {
          continue;
        }
        const width = 2.2 + debrisRandom() * 3.6;
        const tint = debrisRandom() < 0.5 ? freshEarth : oldEarth;
        const pick = debrisRandom();
        if (pick < 0.36 && dumpCursor < 18) {
          // Conical dump: the single-tip pile.
          matrix.compose(
            new Vector3(x, width * 0.34, z),
            new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), debrisRandom() * Math.PI),
            new Vector3(width * 1.5, width * 0.68, width * 1.5),
          );
          dumps.setMatrixAt(dumpCursor, matrix);
          dumps.setColorAt(dumpCursor, tint);
          dumpCursor += 1;
        } else if (pick < 0.72 && moundCursor < 18) {
          // Skirted mound: slumped and spread.
          matrix.compose(
            new Vector3(x, width * 0.09, z),
            new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), debrisRandom() * Math.PI),
            new Vector3(width, width * 0.28, width * 0.85),
          );
          mounds.setMatrixAt(moundCursor, matrix);
          mounds.setColorAt(moundCursor, tint);
          moundCursor += 1;
        } else if (ridgeCursor < 16) {
          // Windrow ridge: the long push of a clearing crew.
          matrix.compose(
            new Vector3(x, width * 0.16, z),
            new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), debrisRandom() * Math.PI),
            new Vector3(width * 2.4, width * 0.42, width * 0.62),
          );
          ridges.setMatrixAt(ridgeCursor, matrix);
          ridges.setColorAt(ridgeCursor, tint);
          ridgeCursor += 1;
        }
      }
    }
    dumps.count = dumpCursor;
    mounds.count = moundCursor;
    ridges.count = ridgeCursor;
    let roughCursor = 0;
    let debrisAttempts = 0;
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
    for (const heapBatch of [dumps, mounds, ridges]) {
      heapBatch.castShadow = true;
      heapBatch.receiveShadow = true;
    }
    roughBlocks.castShadow = true;
    roughBlocks.receiveShadow = true;
    dumps.name = 'quarry-spoil-conical-dumps';
    mounds.name = 'quarry-spoil-skirted-mounds';
    ridges.name = 'quarry-spoil-windrow-ridges';
    roughBlocks.name = 'abandoned-rough-cut-stones';
    this.group.add(dumps, mounds, ridges, roughBlocks);

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
    const brick = new BoxGeometry(1, 1, 1);
    this.geometries.push(brick);
    const steps = new Group();
    const brickwork = new InstancedMesh(brick, materials.compactedEarth, this.plan.ramps.length);
    const retaining = new InstancedMesh(brick, materials.revetment, 12_000);
    steps.name = 'ramp-earthwork-terraces';
    brickwork.name = 'ramp-grounded-foundations';
    retaining.name = 'ramp-revetment-masonry';
    for (const item of [brickwork, retaining]) {
      item.castShadow = true;
      item.receiveShadow = true;
      item.frustumCulled = false;
      item.count = 0;
    }
    this.rampMeshes = { steps, brickwork, retaining };
    this.group.add(steps, brickwork, retaining);
    let foundationCount = 0;
    for (const ramp of this.plan.ramps) {
      const surface = this.plan.routes.find((route) => route.id === ramp.id)!.rampSurface!;
      const dx = surface.crest[0] - surface.foot[0];
      const dz = surface.crest[2] - surface.foot[2];
      const geometry = rampSurfaceGeometry(surface);
      this.geometries.push(geometry);
      const rampMesh = new InstancedMesh(geometry, materials.compactedEarth, 1);
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      rampMesh.frustumCulled = false;
      rampMesh.count = 0;
      rampMesh.name = `${ramp.id}-continuous-haul-surface`;
      steps.add(rampMesh);
      if (surface.foot[1] > 0) {
        // Khafre/Menkaure stand on raised ground. Their haul embankment is
        // a grounded, permanent extension of that plateau, not a floating
        // sloping skin whose underside stops at the monument datum.
        const foundation = new Matrix4().compose(
          new Vector3(ramp.center[0], (surface.foot[1] - 0.08) / 2, ramp.center[1]),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), ramp.yaw),
          new Vector3(ramp.footprint[0], surface.foot[1] + 0.08, ramp.footprint[1]),
        );
        brickwork.setMatrixAt(foundationCount++, foundation);
      }
      this.ramps.push({
        surface,
        mesh: rampMesh,
        width: surface.width,
        length: Math.hypot(dx, dz),
        transform: new Matrix4().compose(
          new Vector3(...surface.foot),
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(dx, dz)),
          new Vector3(1, 1, 1),
        ),
      });
    }
    brickwork.count = foundationCount;
    brickwork.instanceMatrix.needsUpdate = true;
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
      // Dusk presence (Tier 4 P4): let the clouds catch the low sun. The
      // typed cloudTint warms toward the keyframe's sunTint by a factor that
      // follows the sun's height — the same low-sun curve the dome's wide
      // halo uses (full at the horizon, gone by ~31°) — so the high cirrus
      // over the sunset reads as ember-lit streaks instead of flat cutouts,
      // while the high noon sun leaves the authored tint untouched. Pure per
      // frame; driven by the typed keyframe, no new geometry or draw calls.
      const lowSun = Math.min(1, Math.max(0, 1 - sunDirection.y / 0.55));
      layer.material.color
        .set(sky.cloudTint)
        .lerp(new Color(sky.sunTint), lowSun * 0.55);
      layer.material.opacity = Math.min(baseOpacity, sky.cloudOpacity);
    }
    this.clouds.visible = light.emissive < 0.8;
    this.updateCampfires(t, light, sky);
    this.updateRamps(t);
  }

  private lastRampKey = '';

  private updateRamps(t: number): void {
    const heights = this.ramps.map(({ surface }) => {
      const start = surface.courses[0]!.start;
      const strikeSpan = Math.min(0.035, (surface.end - start) * 0.09);
      const struck = smoothstep((t - surface.end) / strikeSpan);
      return Math.max(0, gizaRampHeightAt(surface, t) * (1 - struck));
    });
    const key = heights.join(':');
    if (key === this.lastRampKey) return;
    this.lastRampKey = key;
    const meshes = this.rampMeshes!;
    const matrix = new Matrix4();
    let brickCursor = 0;
    for (let index = 0; index < this.ramps.length; index += 1) {
      const ramp = this.ramps[index]!;
      const height = heights[index]!;
      ramp.mesh.count = height > 0.0001 ? 1 : 0;
      if (height <= 0.0001) continue;
      matrix.makeScale(ramp.width, height, ramp.length).premultiply(ramp.transform);
      ramp.mesh.setMatrixAt(0, matrix);
      ramp.mesh.instanceMatrix.needsUpdate = true;
      // Fixed-size revetment blocks stay below the sloping top. They retain
      // the compacted earth, never act as tall stairs under a horizontal sled.
      const segments = 16;
      const depth = ramp.length / segments;
      const courseHeight = 0.36;
      for (let segment = 0; segment < segments; segment += 1) {
        const lowTop = height * gizaRampProfileAt(ramp.surface, segment / segments);
        const courses = Math.floor(lowTop / courseHeight);
        for (let course = 0; course < courses; course += 1) {
          for (const side of [-1, 1]) {
            matrix.makeScale(0.32, courseHeight * 0.96, depth * 0.96);
            matrix.setPosition(side * (ramp.width / 2 + 0.12), (course + 0.5) * courseHeight, (segment + 0.5) * depth);
            matrix.premultiply(ramp.transform);
            meshes.retaining.setMatrixAt(brickCursor++, matrix);
          }
        }
      }
    }
    meshes.retaining.count = brickCursor;
    meshes.retaining.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof InstancedMesh) object.dispose();
    });
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
