import routes from '../data/eiffelUpperRoutes.json';
import compatibility from '../data/eiffelUpperRouteCompatibility.json';
import type { EiffelKitManifest } from '../data/eiffelKitTypes';
import type {
  EiffelUpperCorrection,
  EiffelUpperPlanningInput,
} from './eiffelUpperClearance';
/** Non-security content fingerprint: stale precomputed geometry is never applied. */
export function eiffelRouteFingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
const manifestHashes = new WeakMap<EiffelKitManifest, string>();
export function eiffelUpperManifestHash(manifest: EiffelKitManifest): string {
  let hash = manifestHashes.get(manifest);
  if (!hash) {
    hash = eiffelRouteFingerprint(manifest);
    manifestHashes.set(manifest, hash);
  }
  return hash;
}
const routeDomainHashes = new WeakMap<EiffelKitManifest, string>();
/**
 * The baked routes only serve stage-23 work.  Later summit revisions may reuse
 * them when every manifest record which can affect those jobs is byte-for-byte
 * identical.  The per-operation input hash below remains a second, stricter
 * check on the derived station, pickup, receiver, dependency and timing.
 */
export function eiffelUpperRouteDomainHash(manifest: EiffelKitManifest): string {
  let hash = routeDomainHashes.get(manifest);
  if (!hash) {
    hash = eiffelRouteFingerprint({
      parts: manifest.parts.filter((part) => part.stage <= 23),
    });
    routeDomainHashes.set(manifest, hash);
  }
  return hash;
}
export function eiffelUpperInputHash(input: EiffelUpperPlanningInput): string {
  return eiffelRouteFingerprint(input);
}
interface BakedRoutes {
  readonly schemaVersion: 1;
  readonly manifestHash: string;
  readonly routes: Readonly<
    Record<
      string,
      { readonly inputHash: string; readonly correction: EiffelUpperCorrection }
    >
  >;
}
const baked = routes as unknown as BakedRoutes;
const accepted = compatibility as {
  readonly schemaVersion: 1;
  readonly bakedManifestHash: string;
  readonly currentManifestHash: string;
  readonly protectedStageMax: 23;
  readonly protectedPartCount: number;
  readonly protectedDomainHash: string;
};
/** Runtime does only fingerprint checks and a lookup; occupancy search is offline. */
export function getBakedEiffelUpperRoute(
  input: EiffelUpperPlanningInput,
  manifestHash: string,
  routeDomainHash?: string,
): EiffelUpperCorrection | null {
  const entry = baked.routes[input.part.id];
  const compatibleRevision =
    accepted.schemaVersion === 1 &&
    accepted.bakedManifestHash === baked.manifestHash &&
    accepted.currentManifestHash === manifestHash &&
    accepted.protectedStageMax === 23 &&
    accepted.protectedDomainHash === routeDomainHash;
  return baked.schemaVersion === 1 &&
    (baked.manifestHash === manifestHash || compatibleRevision) &&
    entry?.inputHash === eiffelUpperInputHash(input)
    ? entry.correction
    : null;
}
