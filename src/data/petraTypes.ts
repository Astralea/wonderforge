import type { UnitScale, Vec3 } from './constructionTypes';

export type PetraMemberGroup =
  | 'podium'
  | 'portico'
  | 'entablature'
  | 'doorway'
  | 'pediment'
  | 'tholos'
  | 'urn'
  | 'aedicule';

export type PetraMemberKind =
  | 'block'
  | 'column'
  | 'capital'
  | 'cone';

export type PetraRouteId = 'siq-south';

export type PetraLayerId =
  | 'dry-rift-sky'
  | 'sandstone-massif'
  | 'siq-gorge'
  | 'treasury-facade'
  | 'work-systems'
  | 'foreground-siq-floor';

export interface PetraRockMember {
  id: string;
  group: PetraMemberGroup;
  kind: PetraMemberKind;
  dimensions: Vec3;
  finalPosition: Vec3;
  finalRotation: Vec3;
  scale: UnitScale;
  coveringCellIds: string[];
  colorVariation: number;
}

export interface PetraSpoilCell {
  id: string;
  column: number;
  row: number;
  dimensions: Vec3;
  sourcePosition: Vec3;
  dumpPosition: Vec3;
  scale: UnitScale;
  routeId: PetraRouteId;
  lane: number;
  start: number;
  duration: number;
  colorVariation: number;
}

export interface PetraRoute {
  id: PetraRouteId;
  ledge: Vec3;
  plaza: Vec3;
  siq: Vec3;
  dump: Vec3;
  laneWidth: number;
}

export interface PetraLayer {
  id: PetraLayerId;
  depth: number;
  motion: 'static-world-space' | 'playback-time';
}

export interface PetraKeepOut {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PetraConstructionPlan {
  seed: string;
  members: PetraRockMember[];
  cells: PetraSpoilCell[];
  routes: PetraRoute[];
  layers: PetraLayer[];
  keepOuts: PetraKeepOut[];
  facadeWidth: number;
  facadeHeight: number;
  groundY: number;
}
