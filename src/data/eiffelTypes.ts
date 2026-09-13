import type { UnitScale, Vec3 } from './constructionTypes';

export type EiffelPartGroup =
  | 'foundation'
  | 'leg'
  | 'arch'
  | 'platform'
  | 'shaft'
  | 'lantern';

export type EiffelPartKind = 'pier' | 'chord' | 'brace' | 'girder' | 'arch' | 'lattice';

export type EiffelMaterial = 'masonry' | 'iron' | 'dark-iron';

export type EiffelRouteId = 'levallois-east';

export type EiffelLayerId =
  | 'paris-champ-sky'
  | 'seine-trocadero'
  | 'champ-de-mars'
  | 'tower'
  | 'work-systems'
  | 'foreground-yard';

export type EiffelPhase = 'yard' | 'hauled' | 'staged' | 'hoisted' | 'seated';

export type EiffelLegId = 'ne' | 'se' | 'sw' | 'nw';

export interface EiffelPart {
  id: string;
  group: EiffelPartGroup;
  kind: EiffelPartKind;
  leg: EiffelLegId | 'axis';
  storey: number;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalRotation: Vec3;
  scale: UnitScale;
  material: EiffelMaterial;
  routeId: EiffelRouteId;
  lane: number;
  start: number;
  duration: number;
  colorVariation: number;
}

export interface EiffelRoute {
  id: EiffelRouteId;
  yard: Vec3;
  road: Vec3;
  staging: Vec3;
  laneWidth: number;
}

export interface EiffelLayer {
  id: EiffelLayerId;
  depth: number;
  motion: 'static-world-space' | 'playback-time';
}

export interface EiffelKeepOut {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface EiffelConstructionPlan {
  seed: string;
  height: number;
  base: number;
  platform1: number;
  platform2: number;
  platform3: number;
  wagonBedHeight: number;
  maxActive: number;
  parts: EiffelPart[];
  routes: EiffelRoute[];
  layers: EiffelLayer[];
  keepOuts: EiffelKeepOut[];
}
