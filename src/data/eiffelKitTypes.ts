import type { RigidPose, RigidVec3 } from '../engine/eiffelRigid';
import type { EiffelAssemblyGroup, EiffelAssemblyLeg } from './eiffelAssemblyTypes';

/** Staged migration asset. Support/station/route gates must pass before promotion. */
export interface EiffelKitPart {
  readonly id: string;
  readonly stage: number;
  readonly leg: EiffelAssemblyLeg;
  readonly group: EiffelAssemblyGroup;
  readonly sourceMember: string;
  readonly sourceGroup: string;
  readonly material: string;
  readonly shape: 'box' | 'cupola-gore';
  readonly handling: 'protective-cradle' | 'two-leg-sling';
  readonly center: RigidVec3;
  readonly boundsMin: RigidVec3;
  readonly boundsMax: RigidVec3;
  readonly finalPose: RigidPose;
  readonly localBounds: { readonly min: RigidVec3; readonly max: RigidVec3 };
  /** Canonical X width, Y height, Z length, in metres. */
  readonly transportSize: RigidVec3;
  /** Authored surface clamp locations; not a certificate of structural capacity. */
  readonly pickupLugs: readonly RigidVec3[];
  readonly connectionAnchors: readonly RigidVec3[];
  readonly connectionKind: 'bearing' | 'bolted-joint';
  readonly requiresAuthoredSupportAndRoute: true;
}
export interface EiffelKitManifest {
  readonly schemaVersion: 2;
  readonly height: number;
  readonly base: number;
  readonly parts: readonly EiffelKitPart[];
  readonly metadata: {
    readonly constructionReady: false;
    readonly foundationBearings: 16;
    readonly maxTransportSize: RigidVec3;
    readonly remainingGates: readonly string[];
    readonly triangles: number;
    readonly meshNodes: number;
    readonly seatedAsset: 'tower-kit-seated.glb';
    readonly seatedTriangles: number;
  };
}
