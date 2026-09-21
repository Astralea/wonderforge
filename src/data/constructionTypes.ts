/** Pure serializable construction types. No rendering-library imports. */

export type Vec3 = [number, number, number];
export type UnitScale = [1, 1, 1];

export type MonumentId = 'khufu' | 'khafre' | 'menkaure' | 'temple';
export type BlockMaterial =
  | 'core-limestone'
  | 'casing-limestone'
  | 'granite';

export interface MonumentPlan {
  id: Exclude<MonumentId, 'temple'>;
  center: [number, number];
  baseWidth: number;
  height: number;
  groundY: number;
  courses: number;
}

export interface ConstructionBlock {
  id: string;
  monument: MonumentId;
  course: number;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalYaw: number;
  scale: UnitScale;
  material: BlockMaterial;
  routeId: string;
  lane: number;
  start: number;
  duration: number;
  colorVariation: number;
}

export interface CoreFillCell {
  id: string;
  monument: Exclude<MonumentId, 'temple'>;
  course: number;
  dimensions: Vec3;
  finalPosition: Vec3;
  readyAt: number;
  colorVariation: number;
}

export interface RouteWaypoints {
  quarry: Vec3;
  dressing: Vec3;
  roadQueue: Vec3;
  rampFoot: Vec3;
  rampCrest: Vec3;
  alignment: Vec3;
}

export interface GizaRampSurface {
  foot: Vec3;
  crest: Vec3;
  width: number;
  /** Course transitions finish before the first ascent begins. */
  courses: Array<{ start: number; readyAt: number; height: number }>;
  end: number;
}

export interface ConstructionRoute {
  rampSurface?: GizaRampSurface;
  id: string;
  waypoints: RouteWaypoints;
  rampCrestFor(block: ConstructionBlock): Vec3;
}

export interface SceneLayer {
  id:
    | 'foreground-quarry'
    | 'construction-site'
    | 'greenbelt-nile'
    | 'worker-settlement'
    | 'distant-city'
    | 'desert-cliffs'
    | 'atmosphere-sky';
  depth: number;
  quality: 'essential' | 'high' | 'ultra';
}

/**
 * A compacted working earthwork. Typed here rather than in the renderer so the
 * same footprint drives both the geometry and the site-clearance rules that
 * keep camp props and scatter from growing through it (Spec 08).
 */
export interface RampPlan {
  id: string;
  /** Only the pyramids carry working earthworks; the temple is placed whole. */
  monument: Exclude<MonumentId, 'temple'>;
  /** Footprint center in world XZ. */
  center: [number, number];
  /** Extents before yaw: [width across the ramp, length along the climb]. */
  footprint: [number, number];
  baseY: number;
  /** Rotation about Y; local +z is the high end, which meets the face. */
  yaw: number;
}

export interface GizaConstructionPlan {
  seed: string;
  blocks: ConstructionBlock[];
  coreCells: CoreFillCell[];
  routes: ConstructionRoute[];
  ramps: RampPlan[];
  layers: SceneLayer[];
  monuments: {
    khufu: MonumentPlan;
    khafre: MonumentPlan;
    menkaure: MonumentPlan;
  };
}
