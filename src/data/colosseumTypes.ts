import type { UnitScale, Vec3 } from './constructionTypes';

export type ColosseumPartGroup =
  | 'foundation'
  | 'arcade'
  | 'attic'
  | 'inner-arcade'
  | 'podium'
  | 'radial'
  | 'vault'
  | 'cavea'
  | 'arena';

export type ColosseumPartKind = 'block' | 'arch' | 'wedge' | 'seat' | 'plank';

export type ColosseumMaterial = 'travertine' | 'tuff' | 'pozzolana' | 'timber';

export type ColosseumRouteId = 'tivoli-east';

export type ColosseumLayerId =
  | 'roman-valley-sky'
  | 'palatine-caelian'
  | 'drained-valley'
  | 'amphitheatre'
  | 'work-systems'
  | 'foreground-road';

export type ColosseumPhase = 'quarry' | 'hauled' | 'staged' | 'hoisted' | 'seated';

export interface ColosseumPart {
  id: string;
  group: ColosseumPartGroup;
  kind: ColosseumPartKind;
  bay: number;
  storey: number;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalRotation: Vec3;
  scale: UnitScale;
  material: ColosseumMaterial;
  routeId: ColosseumRouteId;
  lane: number;
  start: number;
  duration: number;
  colorVariation: number;
}

export interface ColosseumRoute {
  id: ColosseumRouteId;
  quarry: Vec3;
  road: Vec3;
  staging: Vec3;
  laneWidth: number;
}

export interface ColosseumLayer {
  id: ColosseumLayerId;
  depth: number;
  motion: 'static-world-space' | 'playback-time';
}

export interface ColosseumKeepOut {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ColosseumConstructionPlan {
  seed: string;
  major: number;
  minor: number;
  height: number;
  bays: number;
  wagonBedHeight: number;
  maxActive: number;
  parts: ColosseumPart[];
  routes: ColosseumRoute[];
  layers: ColosseumLayer[];
  keepOuts: ColosseumKeepOut[];
}
