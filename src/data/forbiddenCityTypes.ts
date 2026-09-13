/** Original palace assets and an authored construction story. Metres, Y up. */
export type PalaceVec3 = readonly [number, number, number];
export type PalaceQuaternion = readonly [number, number, number, number];
export type PalaceBounds = readonly [PalaceVec3, PalaceVec3];
export type PalacePartKind = 'foundation' | 'column' | 'beam' | 'bracket' | 'rafter' | 'roof' | 'infill' | 'finish';
export type PalaceFeatureKind = 'foundation' | 'column' | 'roof';
export interface PalacePart {
  readonly id: string;
  readonly buildingId: string;
  readonly kind: PalacePartKind;
  readonly material: string;
  readonly finalPosition: PalaceVec3;
  readonly finalRotation: PalaceQuaternion;
  readonly localBounds: PalaceBounds;
  readonly finalBounds: PalaceBounds;
  readonly bottomContact: PalaceVec3;
  readonly supportIds: readonly string[];
  readonly seatWindow: readonly [number, number];
  readonly lane: number;
  readonly feature?: PalaceFeatureKind;
  readonly prepared?: boolean;
  readonly delivery?: {
    readonly stock: PalaceVec3;
    readonly approach: readonly PalaceVec3[];
    readonly supportIds: readonly string[];
    readonly liftHead?: PalaceVec3;
  };
}
export interface PalaceSupport {
  readonly id: string;
  readonly kind: 'ground' | 'terrace' | 'ramp' | 'deck';
  readonly bounds: readonly [number, number, number, number];
  readonly topY: number;
  readonly lowY?: number;
  readonly downhillZ?: number;
  readonly uphillZ?: number;
}
export interface PalaceFeature {
  readonly id: PalaceFeatureKind;
  readonly partId: string;
  readonly window: readonly [number, number];
  /** World PART-ORIGIN route anchors; pivot is the world bottomContact point. */
  readonly stock: PalaceVec3;
  readonly approach: readonly PalaceVec3[];
  readonly seat: PalaceVec3;
  readonly pivot?: PalaceVec3;
  readonly transportRotation?: PalaceQuaternion;
  readonly transportContact?: PalaceVec3;
  readonly liftingContact?: PalaceVec3;
  readonly liftHead: PalaceVec3;
  readonly carrier: 'stone-sled' | 'timber-cart' | 'tile-basket';
  readonly carrierTop: number;
  readonly supportIds: readonly string[];
  readonly crewStations: readonly PalaceVec3[];
}
export interface PalaceBuilding {
  readonly id: string;
  readonly center: PalaceVec3;
  readonly bounds: PalaceBounds;
  readonly roof: 'double-hip' | 'pyramidal' | 'hip-gable' | 'gable';
  readonly interpretation: string;
}
export interface ForbiddenCityManifest {
  readonly version: 1;
  readonly units: 'metres';
  readonly coordinates: 'Y up';
  readonly durationSeconds: 180;
  readonly interpretation: string;
  readonly sourceUrls: readonly string[];
  readonly parts: readonly PalacePart[];
  readonly buildings: readonly PalaceBuilding[];
  readonly supports: readonly PalaceSupport[];
  readonly features: readonly PalaceFeature[];
  readonly cameraAnchors: Record<PalaceFeatureKind | 'overview', PalaceVec3>;
  readonly bounds: PalaceBounds;
  readonly triangles: Record<'kit' | 'site' | 'construction', number>;
  readonly prototypeRoles?: readonly string[];
  readonly nodeTransformConvention?: 'final pose with local geometry';
  readonly admission?: { readonly constructionComplete: boolean; readonly missing: readonly string[] };

}
