import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { createEiffelProductionPlan } from '../src/engine/eiffelProductionConstruction';

const manifestPath = 'public/models/eiffel-construction-kit/tower-kit.manifest.json';
const outputPath = 'artifacts/eiffel-long-load-main-2026-09-08/operation-start.json';
const partId = 'summit-access-stair-m000-c000';
const bytes = readFileSync(manifestPath);
const manifest = JSON.parse(bytes.toString()) as EiffelKitManifest;
const operation = createEiffelProductionPlan(manifest, {
  upperClearance: 'skip',
}).byPart.get(partId);
if (!operation) throw new Error(`Missing Eiffel operation ${partId}`);
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      partId,
      productionT: operation.start,
      manifestSha256: createHash('sha256').update(bytes).digest('hex'),
      source:
        "createEiffelProductionPlan(manifest, { upperClearance: 'skip' }).byPart.get(partId).start",
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${outputPath} at productionT=${operation.start}`);
