import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import type { EiffelKitManifest, EiffelKitPart } from '../src/data/eiffelKitTypes';

const folder = 'artifacts/eiffel-summit-revision-2026-09-08';
const baseline = JSON.parse(
  readFileSync(`${folder}/kit-compatibility-baseline.json`, 'utf8'),
) as {
  partCount: number;
  partIdsSha256: string;
  partRecordHashes: Record<string, string>;
};
const manifestPath =
  process.argv[2] ?? 'public/models/eiffel-construction-kit/tower-kit.manifest.json';
const bytes = readFileSync(manifestPath);
const manifest = JSON.parse(bytes.toString()) as EiffelKitManifest;
const relevant = (part: EiffelKitPart) =>
  part.stage < 54 || part.id === 'summit-access-stair-m000-c000';
const parts = manifest.parts.filter(relevant);
// JSON.stringify's replacer is shallow and unsuitable for nested records.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
};
const actual = Object.fromEntries(
  parts.map((part) => [
    part.id,
    createHash('sha256').update(JSON.stringify(canonical(part))).digest('hex'),
  ]),
);
const expectedIds = Object.keys(baseline.partRecordHashes);
const actualIds = parts.map((part) => part.id);
const missing = expectedIds.filter((id) => !actual[id]);
const added = actualIds.filter((id) => !baseline.partRecordHashes[id]);
const changed = expectedIds.filter(
  (id) => actual[id] && actual[id] !== baseline.partRecordHashes[id],
);
const result = {
  schemaVersion: 1,
  compatible: missing.length === 0 && added.length === 0 && changed.length === 0,
  scope: 'manifest records for stage < 54 plus summit-access-stair-m000-c000',
  candidateManifestSha256: createHash('sha256').update(bytes).digest('hex'),
  expectedPartCount: baseline.partCount,
  actualPartCount: parts.length,
  missing,
  added,
  changed,
  limits:
    'Actual GLB mesh equality is independently checked by the summit revision test; this record alone is not a mesh proof.',
};
writeFileSync(`${folder}/kit-compatibility.json`, `${JSON.stringify(result, null, 2)}\n`);
if (!result.compatible) throw new Error(JSON.stringify({ missing, added, changed }));
console.log(`Verified ${parts.length} unchanged Eiffel manifest records`);
