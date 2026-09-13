/** Offline geometry search. Run through local esbuild; does not need Blender or a browser. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { createEiffelProductionPlan } from '../src/engine/eiffelProductionConstruction';
import { auditEiffelStationMap } from '../src/engine/eiffelStationMap';
import { EiffelOccupancy } from '../src/engine/eiffelOccupancy';
import {
  planEiffelUpperClearance,
  type EiffelUpperCorrection,
} from '../src/engine/eiffelUpperClearance';
import {
  eiffelUpperInputHash,
  eiffelUpperManifestHash,
} from '../src/engine/eiffelUpperRouteCache';
const manifest = JSON.parse(
  readFileSync(
    'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    'utf8',
  ),
) as EiffelKitManifest;
const plan = createEiffelProductionPlan(manifest, { upperClearance: 'skip' });
const stations = auditEiffelStationMap(manifest);
const occupancy = new EiffelOccupancy(
  plan.operations.map((o) => ({ part: o.part, end: o.end })),
);
const routes: Record<
  string,
  { inputHash: string; correction: EiffelUpperCorrection }
> = {};
const unresolved: string[] = [];
const begin = performance.now();
for (const op of plan.operations.filter((o) => o.part.stage === 23)) {
  const input = {
    part: op.part,
    start: op.start,
    end: op.end,
    station: op.station!,
    pickup: op.pickup,
    receiver: op.receiver!,
    supportPartId: stations.candidates.get(op.part.id)!.supportPartId,
  };
  const correction = planEiffelUpperClearance(input, occupancy);
  if (correction)
    routes[op.part.id] = { inputHash: eiffelUpperInputHash(input), correction };
  else unresolved.push(op.part.id);
}
const provenance = Object.fromEntries(
  [
    'src/engine/eiffelStationMap.ts',
    'src/engine/eiffelProductionConstruction.ts',
    'src/engine/eiffelUpperClearance.ts',
    'src/engine/eiffelOccupancy.ts',
    'src/engine/eiffelUpperRouteCache.ts',
    'src/engine/eiffelConstructionTiming.ts',
    'public/models/eiffel-construction-kit/tower-kit.manifest.json',
    'public/models/eiffel-construction-kit/tower-kit.glb',
  ].map((path) => [
    path,
    createHash('sha256').update(readFileSync(path)).digest('hex'),
  ]),
);
const result = {
  schemaVersion: 1,
  manifestHash: eiffelUpperManifestHash(manifest),
  routes,
};
writeFileSync('src/data/eiffelUpperRoutes.json', JSON.stringify(result));
writeFileSync(
  'artifacts/eiffel-resume-2026-09-07/upper-route-bake.json',
  JSON.stringify(
    {
      provenance,
      corrected: Object.keys(routes).length,
      unresolved,
      searchMilliseconds: performance.now() - begin,
      manifestHash: result.manifestHash,
      bytes: JSON.stringify(result).length,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    corrected: Object.keys(routes).length,
    unresolved: unresolved.length,
    searchMilliseconds: performance.now() - begin,
    bytes: JSON.stringify(result).length,
  }),
);
