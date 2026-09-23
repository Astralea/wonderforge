import type { SydneySurfacePatch } from './sydneyShells';
import type { UnitScale, Vec3 } from './constructionTypes';

export type SydneyPartGroup = 'podium' | 'concert' | 'opera' | 'restaurant';

export type SydneyPartKind = 'block' | 'rib' | 'sail';

/**
 * Sphere-section parameters for a Utzon sail tile skin.
 * All sails are cut from ONE sphere of radius SYDNEY_SPHERE_RADIUS (~75 m).
 * The renderer uses these to build the geometry in world space at full size
 * and places it with scale [1,1,1] — never a stretched unit sphere.
 */
export interface SydneySailSphere {
  /** Sphere centre in world space (metres). */
  centre: Vec3;
  /** Azimuth of the sail fan in radians (rotation about world Y). */
  fanYaw: number;
  /** Latitude of the lower shell edge on the sphere (radians from north pole). */
  phiStart: number;
  /** Angular height of the shell cap (radians). */
  phiLength: number;
  /** Azimuthal half-width of the cap (radians, symmetric around fanYaw). */
  thetaHalf: number;
}

export type SydneyMaterial = 'granite' | 'concrete' | 'tile';

export type SydneyGraph = 'podium' | 'shell';

export type SydneyRouteId = 'point-yard';

export type SydneyLayerId =
  | 'harbour-sky'
  | 'harbour-water'
  | 'bennelong-point'
  | 'shells'
  | 'work-systems'
  | 'foreground-yard';

export type SydneyPhase = 'cast' | 'hauled' | 'staged' | 'hoisted' | 'seated';

export interface SydneyPart {
  id: string;
  group: SydneyPartGroup;
  kind: SydneyPartKind;
  graph: SydneyGraph;
  sail: number;
  bay: number;
  crane: 0 | 1;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalRotation: Vec3;
  scale: UnitScale;
  material: SydneyMaterial;
  routeId: SydneyRouteId;
  lane: number;
  start: number;
  duration: number;
  colorVariation: number;
  surface?: SydneySurfacePatch;
  /** Authored nonindexed world-space triangles for rigid podium pours. */
  authoredVertices?: number[];
  /** World translation to the clear lowering point before lateral seating. */
  seatApproach?: Vec3;
  dependsOn?: string[];
}

export interface SydneyRoute {
  id: SydneyRouteId;
  yard: Vec3;
  road: Vec3;
  staging: Vec3;
  laneWidth: number;
}

export interface SydneyLayer {
  id: SydneyLayerId;
  depth: number;
  motion: 'static-world-space' | 'playback-time';
}

export interface SydneyKeepOut {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SydneyConstructionPlan {
  seed: string;
  length: number;
  width: number;
  height: number;
  podiumHeight: number;
  trolleyBedHeight: number;
  maxActive: number;
  parts: SydneyPart[];
  routes: SydneyRoute[];
  layers: SydneyLayer[];
  keepOuts: SydneyKeepOut[];
}
