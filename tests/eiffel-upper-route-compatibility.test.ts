import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import compatibility from '../src/data/eiffelUpperRouteCompatibility.json';
import routes from '../src/data/eiffelUpperRoutes.json';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import {
  eiffelUpperManifestHash,
  eiffelUpperRouteDomainHash,
} from '../src/engine/eiffelUpperRouteCache';

const load = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as EiffelKitManifest;

describe('immutable upper-route compatibility', () => {
  it('admits the revised summit only through an unchanged stage-23 domain', () => {
    const bakedManifest = load(
      'artifacts/eiffel-summit-revision-2026-09-08/model/tower-kit.manifest.json',
    );
    const currentManifest = load(
      'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    );

    expect(eiffelUpperManifestHash(bakedManifest)).toBe(routes.manifestHash);
    expect(eiffelUpperManifestHash(currentManifest)).not.toBe(routes.manifestHash);
    expect(eiffelUpperManifestHash(currentManifest)).toBe(
      compatibility.currentManifestHash,
    );
    expect(eiffelUpperRouteDomainHash(bakedManifest)).toBe(
      compatibility.protectedDomainHash,
    );
    expect(eiffelUpperRouteDomainHash(currentManifest)).toBe(
      compatibility.protectedDomainHash,
    );
    expect(
      currentManifest.parts.filter(
        (part) => part.stage <= compatibility.protectedStageMax,
      ),
    ).toHaveLength(compatibility.protectedPartCount);
  });
});
