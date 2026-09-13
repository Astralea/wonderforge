/** Blender export contract. Coordinates and bounds are final-world, Y-up metres. */
export type EiffelAssemblyVec3 = readonly [number, number, number];
export type EiffelAssemblyLeg = 'ne' | 'se' | 'sw' | 'nw' | 'axis';
export type EiffelAssemblyGroup = 'foundation' | 'leg' | 'arch' | 'platform' | 'shaft' | 'lantern';
export interface EiffelAssemblyManifestPart {
  readonly id: string;
  readonly stage: number;
  readonly leg: EiffelAssemblyLeg;
  readonly group: EiffelAssemblyGroup;
  readonly center: EiffelAssemblyVec3;
  readonly boundsMin: EiffelAssemblyVec3;
  readonly boundsMax: EiffelAssemblyVec3;
}
export interface EiffelAssemblyManifest {
  readonly schemaVersion: 1;
  readonly height: number;
  readonly base: number;
  readonly parts: readonly EiffelAssemblyManifestPart[];
}
export type EiffelAssemblyPhase = 'queued' | 'yard' | 'haul' | 'staged' | 'hoist' | 'transfer' | 'lower' | 'seated';
/** Planned part retains the exact manifest geometry and adds an absolute-time event. */
export interface EiffelAssemblyPart extends EiffelAssemblyManifestPart {
  readonly start: number;
  readonly end: number;
  readonly source: EiffelAssemblyVec3;
  readonly staging: EiffelAssemblyVec3;
  readonly haulRoute: readonly EiffelAssemblyVec3[];
  readonly liftY: number;
  readonly craneBase: EiffelAssemblyVec3;
  readonly jibY: number;
  readonly phaseTimes: readonly [number, number, number, number, number, number, number];
}
export interface EiffelAssemblyPlan {
  readonly parts: readonly EiffelAssemblyPart[];
  readonly stages: readonly { stage: number; start: number; end: number }[];
  readonly start: number;
  readonly end: number;
}
export interface EiffelAssemblySample {
  readonly phase: EiffelAssemblyPhase;
  readonly visible: boolean;
  readonly position: EiffelAssemblyVec3;
  readonly scale: readonly [1, 1, 1];
  readonly progress: number;
  /** Hook includes a short sling clearance over the translated AABB top. */
  readonly hook: EiffelAssemblyVec3;
  /** Base remains fixed for the entire operation on previously completed work. */
  readonly craneBase: EiffelAssemblyVec3;
  readonly boomTip: EiffelAssemblyVec3;
  readonly ropeAttached: boolean;
  readonly wagon: { readonly visible: boolean; readonly position: EiffelAssemblyVec3; readonly bedY: number };
  readonly contact: { readonly bottomY: number; readonly supportY: number; readonly residual: number; readonly kind: 'wagon' | 'crib' | 'air' | 'seat' };
}
