// Run: bun scripts/export-sydney-overhaul.ts
// Geometry export is the exact production data, not an independently fitted mesh.
import { mkdirSync, writeFileSync } from 'node:fs';
import { SYDNEY_CONSTRUCTION } from '../src/data/sydneyConstruction';
import { SYDNEY_SAILS } from '../src/data/sydneyShells';
import { sydneyPartVertices } from '../src/render/three/SydneyStoneSystem';
const root = 'artifacts/sydney-overhaul-2026-09-23/model';
mkdirSync(root, { recursive: true });
const groups = new Map<
  string,
  { name: string; material: string; vertices: number[] }
>();
for (const part of SYDNEY_CONSTRUCTION.parts) {
  const name = part.kind === 'block' ? 'podium' : `${part.kind}-${part.sail}`;
  if (!groups.has(name))
    groups.set(name, { name, material: part.material, vertices: [] });
  groups.get(name)!.vertices.push(...sydneyPartVertices(part));
}
writeFileSync(`${root}/geometry.json`, JSON.stringify([...groups.values()]));
writeFileSync(
  `${root}/manifest.json`,
  JSON.stringify(
    {
      provider:
        'Original project-authored spherical geometry; Blender inspection export',
      units: 'metres',
      axes: 'Three.js Y up, +X east, +Z south; Blender X east, Y north, Z up',
      sphereRadius: 75,
      shells: SYDNEY_SAILS,
      parts: SYDNEY_CONSTRUCTION.parts.length,
      meshes: [...groups.values()].map((g) => ({
        name: g.name,
        material: g.material,
        triangles: g.vertices.length / 9,
      })),
      source: 'src/data/sydneyShells.ts, src/data/sydneyConstruction.ts',
      interpretation:
        'Seven paired vaults and representative assembly units; not a measured digital twin. Existing original harbour kit reused.',
    },
    null,
    2,
  ),
);
console.log(root);
