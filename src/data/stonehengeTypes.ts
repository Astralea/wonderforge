import type { UnitScale, Vec3 } from './constructionTypes';

export type StonehengeStoneGroup =
  | 'trilithon'
  | 'outer-sarsen'
  | 'bluestone-circle'
  | 'bluestone-horseshoe'
  | 'heel-stone';

export type StonehengeStoneRole = 'upright' | 'lintel';
export type StonehengeMaterial = 'sarsen' | 'bluestone';
export type StonehengeRouteId = 'sarsen-north' | 'bluestone-west' | 'heel-northeast';

export interface StonehengeStone {
  id: string;
  group: StonehengeStoneGroup;
  role: StonehengeStoneRole;
  material: StonehengeMaterial;
  dimensions: Vec3;
  finalPosition: Vec3;
  /** Euler rotation [x, y, z], radians, Y-up. */
  finalRotation: Vec3;
  scale: UnitScale;
  /** Depth of an upright's final butt below the turf. Lintels use zero. */
  embedDepth: number;
  /** Uprights that must be seated before this lintel can start. */
  supportIds: string[];
  routeId: StonehengeRouteId;
  lane: number;
  start: number;
  duration: number;
  colorVariation: number;
}

export interface StonehengeRoute {
  id: StonehengeRouteId;
  source: Vec3;
  dressing: Vec3;
  queue: Vec3;
  laneWidth: number;
}

export type StonehengeLayerId =
  | 'weather-sky'
  | 'rolling-downs'
  | 'open-grassland'
  | 'henge-earthwork'
  | 'stone-settings'
  | 'work-systems'
  | 'foreground-chalk-cut';

export interface StonehengeLayer {
  id: StonehengeLayerId;
  depth: number;
  motion: 'static-world-space' | 'playback-time';
}

export interface StonehengeConstructionPlan {
  seed: string;
  stones: StonehengeStone[];
  routes: StonehengeRoute[];
  layers: StonehengeLayer[];
  axisRadians: number;
  outerRadius: number;
  groundY: number;
}
