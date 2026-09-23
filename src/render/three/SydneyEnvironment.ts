import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  IcosahedronGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  CanvasTexture,
  AdditiveBlending,
  Vector3,
} from 'three';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import { SYDNEY_HARBOUR_CONTEXT } from '../../data/sydneyHarbourContext';
import { SYDNEY_ENVIRONMENT } from '../../data/sydneyEnvironment';
import type { SydneySkySample } from '../../data/sydneySky';
import type { LightState } from '../../engine/daynight';
import { sydneyBoatsAt, SYDNEY_BOAT_ROUTES } from '../../engine/sydneyBoats';
import {
  SYDNEY_HARBOUR_LOTS,
  sydneyHarbourLotsOf,
} from '../../engine/sydneyHarbourLots';
import {
  SYDNEY_BRIDGE,
  sydneyBridgeToWorld,
  sydneyBuildingToWorld,
  SYDNEY_BUILDING_YAW,
  sydneyGroundKindAt,
  SYDNEY_POINT_SHORE,
  sydneyTerrainHeightAt,
} from '../../engine/sydneyTerrain';
import type { MaterialLibrary } from './MaterialLibrary';
import { injectMaterialRecipe } from './proceduralDetail';
import { flattenSydneyRoles, loadSydneyHarbourKit } from './sydneyKit';
import {
  sydneyContextPrimitives,
  sydneyLampPositions,
} from '../../engine/sydneyLandmarks';
import {
  applySydneyFacade,
  applySydneyPaneGlow,
  markSydneyFacade,
  SYDNEY_CITY_NIGHT,
} from './sydneyFacade';
import { createSydneyLandmarkGeometry } from './sydneyLandmarks';
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

const WATER_RADIUS = 24000;
const UP = new Vector3(0, 1, 0);

export class SydneyEnvironment {
  readonly group = new Group();
  readonly ready: Promise<void>;
  private disposed = false;
  private kitLoaded = false;
  private readonly geometries: Array<{ dispose(): void }> = [];
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly contextInstances: InstancedMesh[] = [];
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
  private readonly terraceGables: InstancedMesh;
  private readonly terraceFlats: InstancedMesh;
  private readonly terraceWindows: InstancedMesh;
  private readonly blocks: InstancedMesh;
  private readonly groves: InstancedMesh;
  private readonly landmarks: Mesh;
  private readonly lamps: Points;
  private readonly beds: InstancedMesh;
  private readonly stacks: InstancedMesh;
  private boats!: InstancedMesh;
  private boatCabins!: InstancedMesh;
  private boatMasts!: InstancedMesh;

  constructor(materials: MaterialLibrary) {
    this.group.name = 'sydney-environment';
    const land = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.98,
      vertexColors: true,
    });
    const foliage = new MeshStandardMaterial({
      color: '#3f5c38',
      roughness: 0.94,
    });
    const timber = new MeshStandardMaterial({
      color: '#8a6a48',
      roughness: 0.92,
    });
    const roof = new MeshStandardMaterial({
      color: '#6e4636',
      roughness: 0.88,
    });
    const granite = new MeshStandardMaterial({
      color: '#8a7a6a',
      roughness: 0.95,
    });
    const sandstone = new MeshStandardMaterial({
      color: '#c4b49a',
      roughness: 0.9,
    });
    const plaster = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.9,
    });
    const residentialRoof = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.87,
    });
    this.materials.push(plaster, residentialRoof);
    const tile = new MeshStandardMaterial({
      color: '#efe6d6',
      roughness: 0.88,
    });
    const steel = new MeshStandardMaterial({
      color: '#4e5964',
      roughness: 0.42,
      metalness: 0.46,
    });
    const pylonStone = new MeshStandardMaterial({
      color: '#a89880',
      roughness: 0.86,
    });
    const foam = materials.whitewash.clone();
    foam.transparent = true;
    foam.opacity = 0.1;
    foam.depthWrite = false;
    injectMaterialRecipe(land, 'compacted-earth');
    injectMaterialRecipe(foliage, 'foliage');
    injectMaterialRecipe(timber, 'wood');
    injectMaterialRecipe(granite, 'granite');
    injectMaterialRecipe(sandstone, 'granite');
    applySydneyFacade(sandstone);
    injectMaterialRecipe(pylonStone, 'granite');
    injectMaterialRecipe(steel, 'puddled-iron');
    this.materials.push(
      land,
      foliage,
      timber,
      roof,
      granite,
      sandstone,
      tile,
      steel,
      pylonStone,
      foam,
    );

    this.group.add(this.createTerrain(land));
    this.group.add(this.createWater(materials.water));
    this.foam = this.createHarbourFoam(foam);
    this.group.add(this.foam);
    this.group.add(this.createBridge(steel, pylonStone));
    this.group.add(this.createWorkboats(timber, steel));
    this.group.add(this.createInfrastructure(granite, timber));
    this.landmarks = this.createLandmarks();
    this.group.add(this.landmarks);
    this.lamps = this.createLamps();
    this.group.add(this.lamps);

    const figCrown = createSydneyFigCrown();
    const figTrunk = createSydneyFigTrunk();
    const shedHall = createSydneyShedHall();
    const shedRoof = createSydneyShedRoof();
    const office = createSydneyOfficeTower();
    const officeCrown = createSydneyOfficeCrown();
    const terrace = createSydneyTerraceHouse();
    const terraceRoof = createSydneyTerraceRoof();
    // The retained hip-roof helper has downward triangle winding and an extra
    // half-body translation. Correct both before instancing at wall eaves.
    terraceRoof.translate(0, -0.5, 0);
    terraceRoof.scale(-1, 1, 1);
    terraceRoof.computeVertexNormals();
    shedRoof.translate(0, -0.5, 0);
    shedRoof.scale(-1, 1, 1);
    shedRoof.computeVertexNormals();
    const bedGeom = new BoxGeometry(1, 1, 1);
    markSydneyFacade(office);
    this.geometries.push(
      figCrown,
      figTrunk,
      shedHall,
      shedRoof,
      office,
      officeCrown,
      terrace,
      terraceRoof,
      bedGeom,
    );

    const figLots = sydneyHarbourLotsOf('fig');
    const shedLots = sydneyHarbourLotsOf('shed');
    const officeLots = sydneyHarbourLotsOf('office');
    const terraceLots = sydneyHarbourLotsOf('terrace');

    this.figs = new InstancedMesh(
      figCrown,
      foliage,
      Math.max(1, figLots.length),
    );
    this.figTrunks = new InstancedMesh(
      figTrunk,
      timber,
      Math.max(1, figLots.length),
    );
    this.sheds = new InstancedMesh(
      shedHall,
      timber,
      Math.max(1, shedLots.length),
    );
    this.shedRoofs = new InstancedMesh(
      shedRoof,
      roof,
      Math.max(1, shedLots.length),
    );
    this.offices = new InstancedMesh(
      office,
      sandstone,
      Math.max(1, officeLots.length),
    );
    this.officeCrowns = new InstancedMesh(
      officeCrown,
      granite,
      Math.max(1, officeLots.length),
    );
    this.terraces = new InstancedMesh(
      terrace,
      plaster,
      Math.max(1, terraceLots.length),
    );
    this.terraceRoofs = new InstancedMesh(
      terraceRoof,
      residentialRoof,
      Math.max(1, terraceLots.length),
    );
    const gable = new BufferGeometry();
    gable.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          -0.52, 0, -0.54, 0.52, 0, -0.54, 0.52, 1, 0, -0.52, 0, -0.54, 0.52, 1,
          0, -0.52, 1, 0, -0.52, 1, 0, 0.52, 1, 0, 0.52, 0, 0.54, -0.52, 1, 0,
          0.52, 0, 0.54, -0.52, 0, 0.54, -0.52, 0, -0.54, -0.52, 1, 0, -0.52, 0,
          0.54, 0.52, 0, -0.54, 0.52, 0, 0.54, 0.52, 1, 0,
        ],
        3,
      ),
    );
    gable.scale(-1, 1, 1);
    gable.computeVertexNormals();
    const flat = new BoxGeometry(1.04, 0.35, 1.04);
    flat.translate(0, 0.175, 0);
    this.geometries.push(gable, flat);
    this.terraceGables = new InstancedMesh(
      gable,
      residentialRoof,
      Math.max(1, terraceLots.length),
    );
    this.terraceFlats = new InstancedMesh(
      flat,
      residentialRoof,
      Math.max(1, terraceLots.length),
    );
    this.terraceGables.name = 'sydney-context-terrace-gables';
    this.terraceFlats.name = 'sydney-context-terrace-flats';
    const windowGeometry = new PlaneGeometry(1, 1);
    const windowMaterial = new MeshStandardMaterial({
      color: '#475457',
      roughness: 0.6,
      side: DoubleSide,
    });
    applySydneyPaneGlow(windowMaterial);
    this.geometries.push(windowGeometry);
    this.materials.push(windowMaterial);
    this.terraceWindows = new InstancedMesh(
      windowGeometry,
      windowMaterial,
      Math.max(1, terraceLots.length * 40),
    );
    this.terraceWindows.name = 'sydney-context-residential-windows';
    // Outer suburbs: plain masses whose windows come from the facade shader.
    const blockLots = sydneyHarbourLotsOf('block');
    const blockGeometry = new BoxGeometry(1, 1, 1);
    blockGeometry.translate(0, 0.5, 0);
    markSydneyFacade(blockGeometry);
    const blockMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.92,
    });
    injectMaterialRecipe(blockMaterial, 'granite');
    applySydneyFacade(blockMaterial);
    this.geometries.push(blockGeometry);
    this.materials.push(blockMaterial);
    this.blocks = new InstancedMesh(
      blockGeometry,
      blockMaterial,
      Math.max(1, blockLots.length),
    );
    this.blocks.name = 'sydney-context-outer-blocks';
    // Distant parkland and north-shore canopy: two lobes on a short trunk,
    // vertex coloured, at a fraction of the foreground fig's triangles.
    const groveLots = sydneyHarbourLotsOf('grove');
    const groveGeometry = this.createGroveGeometry();
    const groveMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      vertexColors: true,
      flatShading: true,
    });
    injectMaterialRecipe(groveMaterial, 'foliage');
    this.geometries.push(groveGeometry);
    this.materials.push(groveMaterial);
    this.groves = new InstancedMesh(
      groveGeometry,
      groveMaterial,
      Math.max(1, groveLots.length),
    );
    this.groves.name = 'sydney-context-groves';
    this.beds = new InstancedMesh(
      bedGeom,
      granite,
      SYDNEY_ENVIRONMENT.ecology.castingBeds,
    );
    this.stacks = new InstancedMesh(
      bedGeom,
      tile,
      SYDNEY_ENVIRONMENT.ecology.tileStacks,
    );
    this.figs.name = 'sydney-context-figs';
    this.terraces.name = 'sydney-context-terraces';
    this.terraceRoofs.name = 'sydney-context-terrace-roofs';
    this.offices.name = 'sydney-context-offices';
    this.placeHarbour();
    for (const mesh of [
      this.figs,
      this.figTrunks,
      this.sheds,
      this.shedRoofs,
      this.offices,
      this.officeCrowns,
      this.terraces,
      this.terraceRoofs,
      this.terraceGables,
      this.terraceFlats,
      this.terraceWindows,
      this.blocks,
      this.groves,
      this.beds,
      this.stacks,
    ]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    // Distant district foliage and roofs receive light but do not pay for a
    // second full harbour population in the tight monument shadow frustum.
    for (const mesh of [
      this.figs,
      this.figTrunks,
      this.offices,
      this.officeCrowns,
      this.terraces,
      this.terraceRoofs,
      this.terraceGables,
      this.terraceFlats,
      this.terraceWindows,
      this.blocks,
      this.groves,
    ])
      mesh.castShadow = false;
    this.water = this.group.getObjectByName('sydney-harbour-water') as Mesh;
    this.ready = this.upgradeHarbourKit();
  }

  private createTerrain(material: MeshStandardMaterial): Mesh {
    // Nonuniform tessellation keeps metre-scale waterfront support and extends the
    // mainland beyond the fog distance without a visible island/tablet boundary.
    const axis: number[] = [];
    for (let v = -156; v <= 156; v += 12) axis.push(v);
    for (let v = 204; v <= 1500; v += 48) axis.push(v, -v);
    for (let v = 1564; v <= 2652; v += 64) axis.push(v, -v);
    for (const v of [3300, 4200, 5600, 8500]) {
      axis.push(v, -v);
    }
    axis.sort((a, b) => a - b);
    const geometry = new PlaneGeometry(1, 1, axis.length - 1, axis.length - 1);
    const raw = geometry.attributes.position!;
    for (let row = 0; row < axis.length; row++)
      for (let col = 0; col < axis.length; col++) {
        raw.setXYZ(
          row * axis.length + col,
          axis[col]!,
          axis[axis.length - 1 - row]!,
          0,
        );
      }
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position!;
    const colors = new Float32Array(positions.count * 3);
    const sand = new Color('#c4b49a');
    const rock = new Color('#8a7a6a');
    const grass = new Color('#759063');
    const bush = new Color('#5b7650');
    const city = new Color('#a39a8c');
    const sandstone = new Color('#b89a72');
    const scratch = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = sydneyTerrainHeightAt(x, z);
      const kind = sydneyGroundKindAt(x, z);
      positions.setY(i, y > 0.15 ? y : -8);
      const far = Math.hypot(x, z) > 380;
      // Low-frequency variation keeps large grounds from reading as flat paint.
      const vary = 0.5 + 0.5 * Math.sin(x * 0.011 + Math.sin(z * 0.007) * 2.1) * Math.cos(z * 0.009 - x * 0.004);
      if (kind === 'garden') scratch.copy(grass).lerp(sand, 0.18).lerp(bush, far ? vary * 0.35 : 0);
      else if (kind === 'north')
        scratch.copy(grass).lerp(bush, 0.25 + vary * 0.35).lerp(city, 0.22);
      else if (kind === 'city') scratch.copy(city).lerp(sand, vary * 0.25);
      else if (kind === 'abutment') scratch.copy(rock);
      else scratch.copy(sand).lerp(rock, Math.min(1, y / 3));
      // Sydney's harbour edge is sandstone: foreshore rock beyond the worksite.
      if (far && kind !== 'point' && kind !== 'quay' && kind !== 'abutment') {
        const shore = [[18, 0], [-18, 0], [0, 18], [0, -18]].some(
          ([dx, dz]) => sydneyTerrainHeightAt(x + dx!, z + dz!) <= 0.15,
        );
        if (shore) scratch.lerp(sandstone, 0.7);
      }
      colors[i * 3] = scratch.r;
      colors[i * 3 + 1] = scratch.g;
      colors[i * 3 + 2] = scratch.b;
    }
    const clipped = new BufferGeometry();
    const verts: number[] = [],
      shades: number[] = [];
    type CoastVertex = { x: number; y: number; z: number; color: Color };
    const vertex = (i: number): CoastVertex => ({
      x: positions.getX(i),
      y: positions.getY(i),
      z: positions.getZ(i),
      color: new Color(colors[i * 3]!, colors[i * 3 + 1]!, colors[i * 3 + 2]!),
    });
    const boundary = (a: CoastVertex, b: CoastVertex): CoastVertex => {
      let lo = 0,
        hi = 1;
      const landA = a.y > 0;
      for (let n = 0; n < 15; n++) {
        const u = (lo + hi) / 2;
        if (
          sydneyTerrainHeightAt(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u) >
            0.15 ===
          landA
        )
          lo = u;
        else hi = u;
      }
      const u = landA ? lo : hi,
        x = a.x + (b.x - a.x) * u,
        z = a.z + (b.z - a.z) * u;
      return {
        x,
        z,
        y: Math.max(0.16, sydneyTerrainHeightAt(x, z)),
        color: landA ? a.color : b.color,
      };
    };
    const indices = geometry.index!;
    for (let i = 0; i < indices.count; i += 3) {
      const triangle = [
          vertex(indices.getX(i)),
          vertex(indices.getX(i + 1)),
          vertex(indices.getX(i + 2)),
        ],
        poly: CoastVertex[] = [];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j]!,
          b = triangle[(j + 1) % 3]!;
        if (a.y > 0) poly.push(a);
        if (a.y > 0 !== b.y > 0) poly.push(boundary(a, b));
      }
      for (let j = 1; j + 1 < poly.length; j++)
        for (const v of [poly[0]!, poly[j]!, poly[j + 1]!]) {
          verts.push(v.x, v.y, v.z);
          shades.push(v.color.r, v.color.g, v.color.b);
        }
    }
    clipped.setAttribute('position', new Float32BufferAttribute(verts, 3));
    clipped.setAttribute('color', new Float32BufferAttribute(shades, 3));
    clipped.computeVertexNormals();
    geometry.dispose();
    this.geometries.push(clipped);
    const mesh = new Mesh(clipped, material);
    mesh.name = 'sydney-peninsula-floor';
    mesh.receiveShadow = true;
    return mesh;
  }

  /** Unit canopy: trunk from the ground to y≈0.55, crown lobes above; the
   * instance scales it to ≈14 m across. Lowest vertex is exactly y=0. */
  private createGroveGeometry(): BufferGeometry {
    const parts: { geometry: BufferGeometry; color: Color }[] = [];
    const trunk = new BoxGeometry(0.12, 0.62, 0.12).toNonIndexed();
    trunk.translate(0, 0.31, 0);
    parts.push({ geometry: trunk, color: new Color('#5a4631') });
    for (const [x, y, z, r, tone] of [
      [0, 1.05, 0, 0.62, '#3f5f37'],
      [0.42, 0.92, 0.28, 0.46, '#4b6a3e'],
    ] as const) {
      const lobe = new IcosahedronGeometry(1, 0);
      lobe.scale(r * 1.15, r * 0.78, r);
      lobe.translate(x, y, z);
      parts.push({ geometry: lobe, color: new Color(tone) });
    }
    const position: number[] = [],
      color: number[] = [];
    for (const part of parts) {
      const p = part.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        position.push(p.getX(i), p.getY(i), p.getZ(i));
        color.push(part.color.r, part.color.g, part.color.b);
      }
      part.geometry.dispose();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private createLandmarks(): Mesh {
    const geometry = createSydneyLandmarkGeometry(sydneyContextPrimitives());
    const material = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.86,
      vertexColors: true,
    });
    injectMaterialRecipe(material, 'granite');
    applySydneyFacade(material);
    this.geometries.push(geometry);
    this.materials.push(material);
    const mesh = new Mesh(geometry, material);
    mesh.name = 'sydney-context-landmarks';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createLamps(): Points {
    const lamps = sydneyLampPositions();
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(lamps.flat(), 3),
    );
    // A soft round sprite at a fixed pixel size: sub-pixel lamp geometry would
    // twinkle as the camera orbits.
    const size = 32;
    const data =
      typeof document === 'undefined' ? null : document.createElement('canvas');
    const ctx = data?.getContext('2d');
    if (data && ctx) {
      data.width = data.height = size;
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(255,236,196,1)');
      g.addColorStop(0.35, 'rgba(255,196,120,0.75)');
      g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const material = new PointsMaterial({
      color: '#ffd9a0',
      size: 5,
      sizeAttenuation: false,
      map: data ? new CanvasTexture(data) : null,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      opacity: 0,
    });
    const points = new Points(geometry, material);
    points.name = 'sydney-night-lamps';
    points.visible = false;
    points.frustumCulled = false;
    return points;
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
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const transforms: Matrix4[] = [];
    for (let i = 0; i < SYDNEY_POINT_SHORE.length; i++) {
      const a = SYDNEY_POINT_SHORE[i]!,
        b = SYDNEY_POINT_SHORE[(i + 1) % SYDNEY_POINT_SHORE.length]!;
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.ceil(length / 3),
        dx = (b[0] - a[0]) / length,
        dz = (b[1] - a[1]) / length;
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5) / n,
          x = a[0] + u * (b[0] - a[0]) + dz * 0.6,
          z = a[1] + u * (b[1] - a[1]) - dx * 0.6;
        if (
          sydneyTerrainHeightAt(x, z) > 0 ||
          sydneyTerrainHeightAt(x - dz * 1.4, z + dx * 1.4) < 0.2
        )
          continue;
        transforms.push(
          new Matrix4().compose(
            new Vector3(x, 0.115, z),
            new Quaternion().setFromAxisAngle(UP, Math.atan2(dx, dz)),
            new Vector3(0.32, 0.03, length / n + 0.035),
          ),
        );
      }
    }
    const foam = new InstancedMesh(box, material, transforms.length);
    foam.name = 'sydney-harbour-foam';
    foam.castShadow = false;
    foam.receiveShadow = false;
    foam.frustumCulled = false;
    transforms.forEach((m, i) => foam.setMatrixAt(i, m));
    foam.instanceMatrix.needsUpdate = true;
    return foam;
  }

  private createBridge(
    steel: MeshStandardMaterial,
    stone: MeshStandardMaterial,
  ): Group {
    const group = new Group();
    group.name = 'sydney-harbour-bridge';
    group.position.set(SYDNEY_BRIDGE.x, 0, SYDNEY_BRIDGE.z);
    group.rotation.y = SYDNEY_BRIDGE.yaw;
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const iron: Matrix4[] = [],
      masonry: Matrix4[] = [];
    const put = (
      target: Matrix4[],
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
    ) => {
      target.push(
        new Matrix4().compose(
          new Vector3(x, y, z),
          new Quaternion(),
          new Vector3(w, h, d),
        ),
      );
    };
    const beam = (a: Vector3, b: Vector3, width: number) => {
      const delta = b.clone().sub(a);
      iron.push(
        new Matrix4().compose(
          a.clone().add(b).multiplyScalar(0.5),
          new Quaternion().setFromUnitVectors(UP, delta.clone().normalize()),
          new Vector3(width, delta.length(), width),
        ),
      );
    };
    const { southZ, northZ, deckY, archRise, pylonZ } = SYDNEY_BRIDGE;
    const x = 0;
    const span = southZ - northZ;
    put(iron, x, deckY, (southZ + northZ) / 2, 49, 2.4, pylonZ * 2);
    // Four tapering masonry pylons flank, rather than block, the road.
    for (const z of [-pylonZ, pylonZ]) {
      const label = new Group();
      label.name = `sydney-harbour-bridge-pylon-${z > 0 ? 'south' : 'north'}`;
      group.add(label);
      for (const side of [-1, 1]) {
        const px = x + side * 31;
        const ground = Math.min(
          ...[-7.5, 7.5].flatMap((dx) =>
            [-10, 10].map((dz) =>
              (() => {
                const p = sydneyBridgeToWorld(px + dx, z + dz);
                return sydneyTerrainHeightAt(p.x, p.z);
              })(),
            ),
          ),
        );
        put(masonry, px, (ground + 14) / 2, z, 15, 14 - ground, 20);
        put(masonry, px, 47, z, 15, 66, 20);
        put(masonry, px, 82.5, z, 17, 5, 22);
        put(masonry, px, 87, z, 15.5, 4, 20);
      }
    }
    const label = new Group();
    label.name = 'sydney-harbour-bridge-arch';
    group.add(label);
    const point = (u: number, offset: number, upper: boolean) =>
      new Vector3(
        x + offset,
        10 + Math.sin(u * Math.PI) * (deckY + archRise - 10 + (upper ? 9 : 0)),
        northZ + u * span,
      );
    const n = 24;
    for (let i = 0; i < n; i++) {
      const u = i / n,
        v = (i + 1) / n;
      for (const offset of [-22, 22]) {
        beam(point(u, offset, false), point(v, offset, false), 1.6);
        beam(point(u, offset, true), point(v, offset, true), 1.4);
        beam(point(u, offset, false), point(v, offset, true), 0.7);
        beam(point(u, offset, true), point(v, offset, false), 0.7);
        const p = point(v, offset, false);
        if (p.y > deckY) beam(new Vector3(p.x, deckY + 1, p.z), p, 0.4);
        else beam(p, new Vector3(p.x, deckY - 1, p.z), 0.85);
      }
      if (i > 2 && i < n - 2) {
        beam(point(u, -22, true), point(v, 22, true), 0.65);
        beam(point(u, 22, true), point(v, -22, true), 0.65);
      }
    }
    // Real continuous viaduct approaches descend onto supported streets.
    for (const route of SYDNEY_HARBOUR_CONTEXT.routes.filter(
      (r) => r.mode === 'bridge-approach',
    )) {
      const toLocal = (
        p: readonly [number, number],
      ): readonly [number, number] => {
        const dx = p[0] - SYDNEY_BRIDGE.x,
          dz = p[1] - SYDNEY_BRIDGE.z,
          c = Math.cos(SYDNEY_BRIDGE.yaw),
          s = Math.sin(SYDNEY_BRIDGE.yaw);
        return [c * dx - s * dz, s * dx + c * dz];
      };
      const start = toLocal(route.points[0]!),
        end = toLocal(route.points[1]!);
      const groundEnd =
        sydneyTerrainHeightAt(route.points[1]![0], route.points[1]![1]) + 0.3;
      for (let i = 0; i < 12; i++) {
        const u = i / 12,
          v = (i + 1) / 12;
        const a = new Vector3(
          start[0] + (end[0] - start[0]) * u,
          deckY + (groundEnd - deckY) * u,
          start[1] + (end[1] - start[1]) * u,
        );
        const b = new Vector3(
          start[0] + (end[0] - start[0]) * v,
          deckY + (groundEnd - deckY) * v,
          start[1] + (end[1] - start[1]) * v,
        );
        const delta = b.clone().sub(a);
        iron.push(
          new Matrix4().compose(
            a.clone().add(b).multiplyScalar(0.5),
            new Quaternion().setFromUnitVectors(
              new Vector3(0, 0, 1),
              delta.clone().normalize(),
            ),
            new Vector3(24, 2, delta.length() + 0.1),
          ),
        );
        const world = sydneyBridgeToWorld(a.x, a.z);
        const floor = sydneyTerrainHeightAt(world.x, world.z),
          h = a.y - floor - 1;
        if (i > 0 && h > 0)
          for (const side of [-1, 1])
            put(masonry, a.x + side * 8, floor + h / 2, a.z, 3.4, h, 4.2);
      }
    }
    for (const [transforms, material, name] of [
      [iron, steel, 'sydney-bridge-trusses'],
      [masonry, stone, 'sydney-bridge-pylons-and-piers'],
    ] as const) {
      const mesh = new InstancedMesh(box, material, transforms.length);
      transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.contextInstances.push(mesh);
      group.add(mesh);
    }
    return group;
  }

  private createInfrastructure(
    stone: MeshStandardMaterial,
    timber: MeshStandardMaterial,
  ): Group {
    const group = new Group();
    group.name = 'sydney-connected-quays-and-streets';
    const box = new BoxGeometry(1, 1, 1);
    this.geometries.push(box);
    const solid: Matrix4[] = [],
      piles: Matrix4[] = [];
    const put = (
      target: Matrix4[],
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
    ) =>
      target.push(
        new Matrix4().compose(
          new Vector3(x, y, z),
          new Quaternion(),
          new Vector3(w, h, d),
        ),
      );
    // Only sloping lots need a visible footing under the ground floor.
    for (const lot of SYDNEY_HARBOUR_LOTS.filter(
      (l) =>
        l.kind !== 'fig' &&
        l.kind !== 'block' &&
        l.supportY - l.foundationBottom > 0.25,
    )) {
      const h = Math.max(0.18, lot.supportY - lot.foundationBottom + 0.2);
      solid.push(
        new Matrix4().compose(
          new Vector3(lot.x, lot.supportY - h / 2, lot.z),
          new Quaternion().setFromAxisAngle(UP, lot.yaw),
          new Vector3(lot.width, h, lot.depth),
        ),
      );
    }
    for (const pier of SYDNEY_HARBOUR_CONTEXT.wharves) {
      put(solid, pier.x, 1.9, pier.z, pier.width, 0.6, pier.length);
      for (
        let z = pier.z - pier.length / 2 + 3;
        z < pier.z + pier.length / 2;
        z += 9
      )
        for (const side of [-1, 1])
          put(
            piles,
            pier.x + side * (pier.width / 2 - 1),
            -0.4,
            z,
            0.8,
            4.4,
            0.8,
          );
    }
    // Clip road footprints against the rendered terrain triangles themselves.
    // Flat centre-height boxes previously cut into every sloping triangle,
    // producing the sawtooth/depth-fighting ribbon visible in the yard shot.
    const terrain = this.group.getObjectByName(
      'sydney-peninsula-floor',
    ) as Mesh;
    const groundPositions = terrain.geometry.getAttribute('position');
    const roadVertices: number[] = [];
    // Bucket terrain triangles on a 64 m grid so each street segment only
    // clips the triangles under it.
    const CELL = 64;
    const buckets = new Map<string, number[]>();
    for (let t = 0; t < groundPositions.count; t += 3) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let k = 0; k < 3; k++) {
        const x = groundPositions.getX(t + k), z = groundPositions.getZ(t + k);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
      }
      if (x1 - x0 > CELL * 8 || z1 - z0 > CELL * 8) continue; // far coarse ring: no streets
      for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
        for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
          const key = `${cx},${cz}`;
          const list = buckets.get(key);
          if (list) list.push(t);
          else buckets.set(key, [t]);
        }
    }
    for (const route of SYDNEY_HARBOUR_CONTEXT.routes.filter(
      (r) => r.mode === 'ground',
    )) {
      for (let segment = 1; segment < route.points.length; segment++) {
        const a = route.points[segment - 1]!,
          b = route.points[segment]!,
          length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const dx = (b[0] - a[0]) / length,
          dz = (b[1] - a[1]) / length,
          half = route.width / 2;
        const minX = Math.min(a[0], b[0]) - half,
          maxX = Math.max(a[0], b[0]) + half,
          minZ = Math.min(a[1], b[1]) - half,
          maxZ = Math.max(a[1], b[1]) + half;
        const planes = [
          (p: Vector3) => (p.x - a[0]) * dx + (p.z - a[1]) * dz,
          (p: Vector3) => length - ((p.x - a[0]) * dx + (p.z - a[1]) * dz),
          (p: Vector3) => half - (p.x - a[0]) * dz + (p.z - a[1]) * dx,
          (p: Vector3) => half + (p.x - a[0]) * dz - (p.z - a[1]) * dx,
        ];
        const candidates = new Set<number>();
        for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
          for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++)
            for (const t of buckets.get(`${cx},${cz}`) ?? []) candidates.add(t);
        for (const triangle of [...candidates].sort((a, b) => a - b)) {
          let polygon = [0, 1, 2].map((i) =>
            new Vector3().fromBufferAttribute(groundPositions, triangle + i),
          );
          if (
            Math.max(...polygon.map((p) => p.x)) < minX ||
            Math.min(...polygon.map((p) => p.x)) > maxX ||
            Math.max(...polygon.map((p) => p.z)) < minZ ||
            Math.min(...polygon.map((p) => p.z)) > maxZ
          )
            continue;
          for (const signedDistance of planes) {
            const clipped: Vector3[] = [];
            for (let i = 0; i < polygon.length; i++) {
              const p = polygon[i]!,
                q = polygon[(i + 1) % polygon.length]!,
                dp = signedDistance(p),
                dq = signedDistance(q);
              if (dp >= 0) clipped.push(p);
              if (dp >= 0 !== dq >= 0)
                clipped.push(p.clone().lerp(q, dp / (dp - dq)));
            }
            polygon = clipped;
          }
          for (let i = 1; i + 1 < polygon.length; i++)
            for (const p of [polygon[0]!, polygon[i]!, polygon[i + 1]!])
              roadVertices.push(p.x, p.y + 0.06, p.z);
        }
      }
    }
    const roadGeometry = new BufferGeometry();
    roadGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(roadVertices, 3),
    );
    roadGeometry.computeVertexNormals();
    this.geometries.push(roadGeometry);
    const roads = new Mesh(roadGeometry, stone);
    roads.name = 'sydney-terrain-conforming-roads';
    roads.receiveShadow = true;
    group.add(roads);
    // A joined quay face/coping, from submerged toe to the actual dry walk.
    // Shared endpoint coordinates meet at corners; no spaced cubes or land slope.
    const quayVertices: number[] = [];
    const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3) => {
      for (const v of [a, b, c, a, c, d]) quayVertices.push(v.x, v.y, v.z);
    };
    const normals = SYDNEY_POINT_SHORE.map((p, i) => {
      const a =
          SYDNEY_POINT_SHORE[
            (i + SYDNEY_POINT_SHORE.length - 1) % SYDNEY_POINT_SHORE.length
          ]!,
        b = SYDNEY_POINT_SHORE[(i + 1) % SYDNEY_POINT_SHORE.length]!;
      const l0 = Math.hypot(p[0] - a[0], p[1] - a[1]),
        l1 = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const nx = (p[1] - a[1]) / l0 + (b[1] - p[1]) / l1,
        nz = -(p[0] - a[0]) / l0 - (b[0] - p[0]) / l1,
        l = Math.hypot(nx, nz);
      return [nx / l, nz / l] as const;
    });
    for (let i = 0; i < SYDNEY_POINT_SHORE.length; i++) {
      const k = (i + 1) % SYDNEY_POINT_SHORE.length,
        a = SYDNEY_POINT_SHORE[i]!,
        b = SYDNEY_POINT_SHORE[k]!,
        na = normals[i]!,
        nb = normals[k]!;
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.ceil(length / 3),
        dx = (b[0] - a[0]) / length,
        dz = (b[1] - a[1]) / length;
      const section = (u: number) => {
        const x = a[0] + u * (b[0] - a[0]),
          z = a[1] + u * (b[1] - a[1]),
          nx = na[0] + u * (nb[0] - na[0]),
          nz = na[1] + u * (nb[1] - na[1]);
        const innerX = x - nx * 1.8,
          innerZ = z - nz * 1.8,
          top = sydneyTerrainHeightAt(innerX, innerZ) + 0.035;
        return {
          outer: new Vector3(x, top, z),
          inner: new Vector3(innerX, top, innerZ),
          toe: new Vector3(x, -1.2, z),
        };
      };
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5) / n,
          x = a[0] + u * (b[0] - a[0]),
          z = a[1] + u * (b[1] - a[1]);
        if (
          sydneyTerrainHeightAt(x + dz * 0.5, z - dx * 0.5) > 0 ||
          sydneyTerrainHeightAt(x - dz * 0.5, z + dx * 0.5) < 0.2
        )
          continue;
        const p = section(j / n),
          q = section((j + 1) / n);
        quad(p.toe, p.outer, q.outer, q.toe);
        quad(p.outer, p.inner, q.inner, q.outer);
      }
    }
    const quayGeometry = new BufferGeometry();
    quayGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(quayVertices, 3),
    );
    quayGeometry.computeVertexNormals();
    this.geometries.push(quayGeometry);
    const quay = new Mesh(quayGeometry, stone);
    quay.name = 'sydney-continuous-quay-wall';
    quay.receiveShadow = true;
    group.add(quay);
    for (const [transforms, material] of [
      [solid, stone],
      [piles, timber],
    ] as const) {
      const mesh = new InstancedMesh(box, material, transforms.length);
      transforms.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.contextInstances.push(mesh);
      group.add(mesh);
    }
    return group;
  }

  private createWorkboats(
    hull: MeshStandardMaterial,
    cabin: MeshStandardMaterial,
  ): Group {
    const group = new Group();
    group.name = 'sydney-harbour-workboats';
    const hullGeom = createSydneyWorkboatHull();
    const cabinGeom = new BoxGeometry(1, 1, 1);
    const mastGeom = new CylinderGeometry(0.08, 0.11, 1, 6);
    this.geometries.push(hullGeom, cabinGeom, mastGeom);
    this.boats = new InstancedMesh(hullGeom, hull, SYDNEY_BOAT_ROUTES.length);
    this.boatCabins = new InstancedMesh(
      cabinGeom,
      cabin,
      SYDNEY_BOAT_ROUTES.length,
    );
    this.boatMasts = new InstancedMesh(
      mastGeom,
      cabin,
      SYDNEY_BOAT_ROUTES.length,
    );
    this.boats.name = 'sydney-harbour-hulls';
    this.boatCabins.name = 'sydney-harbour-cabins';
    this.boatMasts.name = 'sydney-harbour-masts';
    for (const mesh of [this.boats, this.boatCabins, this.boatMasts]) {
      mesh.castShadow = true;
      // Routes cross the initial instance bounds throughout playback.
      mesh.frustumCulled = false;
    }
    this.updateWorkboats(0);
    group.add(this.boats, this.boatCabins, this.boatMasts);
    return group;
  }

  private updateWorkboats(t: number): void {
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    sydneyBoatsAt(t).forEach(({ position: [x, y, z], yaw }, index) => {
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(new Vector3(x, y, z), quaternion, new Vector3(16, 1, 12));
      this.boats.setMatrixAt(index, matrix);
      matrix.compose(
        new Vector3(x, y + 1.24, z),
        quaternion,
        new Vector3(4.6, 2.1, 3.2),
      );
      this.boatCabins.setMatrixAt(index, matrix);
      // Mast offset is local to the hull; it turns with the cabin and bow.
      matrix.compose(
        new Vector3(x - 1.4 * Math.cos(yaw), y + 3.79, z + 1.4 * Math.sin(yaw)),
        quaternion,
        new Vector3(1, 7.2, 1),
      );
      this.boatMasts.setMatrixAt(index, matrix);
    });
    this.boats.instanceMatrix.needsUpdate = true;
    this.boatCabins.instanceMatrix.needsUpdate = true;
    this.boatMasts.instanceMatrix.needsUpdate = true;
  }

  private adoptGeometry(
    mesh: InstancedMesh,
    next: BufferGeometry | null,
  ): void {
    if (!next) return;
    const previous = mesh.geometry;
    mesh.geometry = next;
    const index = this.geometries.indexOf(previous);
    if (index >= 0) this.geometries.splice(index, 1);
    previous.dispose();
    this.geometries.push(next);
    const material = mesh.material;
    if (material instanceof MeshStandardMaterial) {
      // A kit mesh owns its vertex-color material. The fallback materials also
      // shade uncolored boats, piles and trunks: mutating them after an async
      // load made first-frame/cached loads compile different (often black) paths.
      // Vertex colors already carry the authored palette, so do not tint twice.
      const kitMaterial = new MeshStandardMaterial({
        color: '#ffffff',
        roughness: material.roughness,
        metalness: material.metalness,
        vertexColors: next.hasAttribute('color'),
      });
      injectMaterialRecipe(
        kitMaterial,
        mesh === this.figs
          ? 'foliage'
          : mesh === this.sheds
            ? 'wood'
            : 'granite',
      );
      if (mesh === this.offices) {
        markSydneyFacade(next);
        applySydneyFacade(kitMaterial);
      }
      mesh.material = kitMaterial;
      this.materials.push(kitMaterial);
    }
  }

  private async upgradeHarbourKit(): Promise<void> {
    try {
      const kit = await loadSydneyHarbourKit();
      if (this.disposed) return;
      // The original office kit only fenestrated its two Z faces; our actual
      // east-to-south camera sees the blank X end walls. Retain its masonry
      // and supply all four period window facades at each lot's true storey count.
      this.adoptGeometry(
        this.offices,
        flattenSydneyRoles(kit.office, ['stone', 'granite']),
      );
      this.officeCrowns.visible = false;
      this.adoptGeometry(
        this.sheds,
        flattenSydneyRoles(kit.shed, ['timber', 'roof']),
      );
      this.shedRoofs.visible = false;
      const fullFig = flattenSydneyRoles(kit.fig, ['foliage', 'timber']);
      if (fullFig) {
        // Same authored five-lobe fig, reduced for the harbour-wide camera.
        fullFig.deleteAttribute('normal');
        fullFig.deleteAttribute('uv');
        const distantFig = new SimplifyModifier().modify(fullFig, 110);
        distantFig.computeVertexNormals();
        fullFig.dispose();
        this.adoptGeometry(this.figs, distantFig);
      }
      this.figTrunks.visible = false;
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
      const ground = lot.supportY;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      if (this.kitLoaded) {
        matrix.compose(
          new Vector3(lot.x, ground, lot.z),
          quaternion,
          new Vector3(lot.scale * 1.7, lot.scale * 0.68, lot.scale * 1.7),
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
      const ground = lot.supportY;
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

    const officeTones = ['#f0e4cf', '#d9d4ca', '#e8d2b0', '#c9c3b8', '#e2cdb0', '#bfb4a4'];
    sydneyHarbourLotsOf('office').forEach((lot, index) => {
      const ground = lot.supportY;
      this.offices.setColorAt(
        index,
        new Color(officeTones[(index * 7 + lot.storeys) % officeTones.length]!),
      );
      quaternion.setFromAxisAngle(UP, lot.yaw);
      if (this.kitLoaded) {
        const h = (lot.storeys * 3.4 * lot.scale) / 28;
        matrix.compose(
          new Vector3(lot.x, ground, lot.z),
          quaternion,
          new Vector3(lot.width / 12.8, h, lot.depth / 10.4),
        );
        this.offices.setMatrixAt(index, matrix);
        return;
      }
      const h = lot.storeys * 3.4 * lot.scale;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, ground + h * 0.5, lot.z),
        quaternion,
        new Vector3(lot.width, h, lot.depth),
      );
      this.offices.setMatrixAt(index, matrix);
      matrix.compose(
        new Vector3(lot.x, ground + h, lot.z),
        quaternion,
        new Vector3(lot.width, h, lot.depth),
      );
      this.officeCrowns.setMatrixAt(index, matrix);
    });
    if (this.offices.instanceColor) this.offices.instanceColor.needsUpdate = true;

    const blockTones = ['#d8c9ae', '#c7b8a0', '#b9a58c', '#d9d1c2', '#a99c8a', '#c8b395', '#9f9484'];
    sydneyHarbourLotsOf('block').forEach((lot, index) => {
      // Masses reach below the lowest corner so coarse distant terrain
      // triangles never reveal a floating footing.
      const base = lot.foundationBottom - 3;
      const height = lot.supportY - base + lot.storeys * 3.3;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, base, lot.z),
        quaternion,
        new Vector3(lot.width, height, lot.depth),
      );
      this.blocks.setMatrixAt(index, matrix);
      this.blocks.setColorAt(
        index,
        new Color(blockTones[(index * 5 + lot.storeys * 3) % blockTones.length]!),
      );
    });
    this.blocks.count = sydneyHarbourLotsOf('block').length;
    const groveTones = ['#dfe8d4', '#c9d8bd', '#e8efd9', '#bfcdb3', '#d4dcc0'];
    sydneyHarbourLotsOf('grove').forEach((lot, index) => {
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, lot.supportY, lot.z),
        quaternion,
        new Vector3(7 * lot.scale, 5.2 * lot.scale, 7 * lot.scale),
      );
      this.groves.setMatrixAt(index, matrix);
      this.groves.setColorAt(index, new Color(groveTones[index % groveTones.length]!));
    });
    this.groves.count = sydneyHarbourLotsOf('grove').length;
    this.groves.instanceMatrix.needsUpdate = true;
    if (this.groves.instanceColor) this.groves.instanceColor.needsUpdate = true;
    this.blocks.instanceMatrix.needsUpdate = true;
    if (this.blocks.instanceColor) this.blocks.instanceColor.needsUpdate = true;
    this.offices.count = sydneyHarbourLotsOf('office').length;
    this.officeCrowns.count = sydneyHarbourLotsOf('office').length;
    this.offices.instanceMatrix.needsUpdate = true;
    this.officeCrowns.instanceMatrix.needsUpdate = true;

    const roofCounts = { villa: 0, row: 0, flats: 0 };
    let windowCount = 0;
    sydneyHarbourLotsOf('terrace').forEach((lot, index) => {
      const h = lot.storeys * 3.2 * lot.scale,
        ground = lot.supportY;
      quaternion.setFromAxisAngle(UP, lot.yaw);
      matrix.compose(
        new Vector3(lot.x, ground + h / 2, lot.z),
        quaternion,
        new Vector3(lot.width, h, lot.depth),
      );
      this.terraces.setMatrixAt(index, matrix);
      this.terraces.setColorAt(
        index,
        new Color(
          ['#e2d4bc', '#d7c8aa', '#eadfca', '#ccb594', '#dac5aa'][index % 5]!,
        ),
      );
      const bays = lot.form === 'row' ? 5 : lot.form === 'flats' ? 3 : 2;
      for (let floor = 0; floor < lot.storeys; floor++)
        for (let bay = 0; bay < bays; bay++)
          for (const side of [-1, 1]) {
            const local = new Vector3(
              ((bay + 0.5) / bays - 0.5) * lot.width * 0.82,
              ((floor + 0.55) * h) / lot.storeys,
              side * (lot.depth / 2 + 0.025),
            );
            local
              .applyQuaternion(quaternion)
              .add(new Vector3(lot.x, ground, lot.z));
            matrix.compose(
              local,
              quaternion,
              new Vector3(lot.form === 'villa' ? 1.5 : 1.3, 1.4, 1),
            );
            this.terraceWindows.setMatrixAt(windowCount++, matrix);
          }
      const roof =
        lot.form === 'row'
          ? this.terraceGables
          : lot.form === 'flats'
            ? this.terraceFlats
            : this.terraceRoofs;
      const roofHeight = lot.form === 'row' ? 3 : lot.form === 'flats' ? 1 : 5;
      matrix.compose(
        new Vector3(lot.x, ground + h, lot.z),
        quaternion,
        new Vector3(lot.width, roofHeight, lot.depth),
      );
      const ri = roofCounts[lot.form]++;
      roof.setMatrixAt(ri, matrix);
      roof.setColorAt(
        ri,
        new Color(
          ['#936f5b', '#77858b', '#ad8166', '#8c8d81', '#a69787'][index % 5]!,
        ),
      );
    });
    this.terraceWindows.count = windowCount;
    this.terraceWindows.instanceMatrix.needsUpdate = true;
    this.terraces.count = sydneyHarbourLotsOf('terrace').length;
    this.terraces.instanceMatrix.needsUpdate = true;
    for (const [mesh, count] of [
      [this.terraceRoofs, roofCounts.villa],
      [this.terraceGables, roofCounts.row],
      [this.terraceFlats, roofCounts.flats],
    ] as const) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }

    quaternion.setFromAxisAngle(UP, SYDNEY_BUILDING_YAW);
    for (let i = 0; i < SYDNEY_ENVIRONMENT.ecology.castingBeds; i += 1) {
      const { x, z } = sydneyBuildingToWorld(
        -45 + (i % 5) * 10,
        190 + Math.floor(i / 5) * 7.5,
      );
      const ground = sydneyTerrainHeightAt(x, z);
      matrix.compose(
        new Vector3(x, ground + 0.28, z),
        quaternion,
        new Vector3(8.4, 0.55, 3.2),
      );
      this.beds.setMatrixAt(i, matrix);
    }
    this.beds.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SYDNEY_ENVIRONMENT.ecology.tileStacks; i += 1) {
      const { x, z } = sydneyBuildingToWorld(
        16 + (i % 3) * 3.2,
        185 + Math.floor(i / 3) * 4,
      );
      const ground = sydneyTerrainHeightAt(x, z);
      const h = 1.4 + (i % 4) * 0.55;
      matrix.compose(
        new Vector3(x, ground + h / 2, z),
        quaternion,
        new Vector3(2.2, h, 1.6),
      );
      this.stacks.setMatrixAt(i, matrix);
    }
    this.stacks.instanceMatrix.needsUpdate = true;
  }

  update(
    t: number,
    light: LightState,
    _sky: SydneySkySample,
    sunHeight = 1,
  ): void {
    this.updateWorkboats(t);
    // City lights come on through dusk, before the full night grade.
    const night = Math.max(
      light.emissive,
      Math.min(1, Math.max(0, (0.1 - sunHeight) / 0.2)),
    );
    SYDNEY_CITY_NIGHT.value = night;
    this.lamps.visible = night > 0.02;
    (this.lamps.material as PointsMaterial).opacity = Math.min(1, night * 1.4);
    const water = this.water.material as MeshStandardMaterial;
    water.emissive.setRGB(
      0.02 * light.emissive,
      0.04 * light.emissive,
      0.08 * light.emissive,
    );
    const foam = this.foam.material as MeshStandardMaterial;
    foam.opacity = 0.08 + 0.025 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 24));
    this.beds.visible = t < 0.92;
    this.stacks.visible = t < 0.92;
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
    this.terraceGables.dispose();
    this.terraceFlats.dispose();
    this.terraceWindows.dispose();
    this.blocks.dispose();
    this.groves.dispose();
    (this.lamps.material as PointsMaterial).map?.dispose();
    (this.lamps.material as PointsMaterial).dispose();
    this.lamps.geometry.dispose();
    this.beds.dispose();
    this.stacks.dispose();
    this.boats.dispose();
    this.boatCabins.dispose();
    this.boatMasts.dispose();
    for (const mesh of this.contextInstances) mesh.dispose();
  }
}
