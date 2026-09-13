import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Group, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EiffelKitManifest, EiffelKitPart } from '../src/data/eiffelKitTypes';

const folder = 'artifacts/eiffel-summit-revision-2026-09-08/';
const beforeManifest = JSON.parse(
  readFileSync(`${folder}before-kit/tower-kit.manifest.json`, 'utf8'),
) as EiffelKitManifest;
const candidateManifest = JSON.parse(
  readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json', 'utf8'),
) as EiffelKitManifest;
const compatibility = JSON.parse(
  readFileSync(`${folder}kit-compatibility-baseline.json`, 'utf8'),
) as { partCount: number; partRecordHashes: Record<string, string> };
const relevant = (part: EiffelKitPart) =>
  part.stage < 54 || part.id === 'summit-access-stair-m000-c000';

async function load(path: string): Promise<Group> {
  const bytes = readFileSync(path);
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}
function dispose(scene: Group) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      material.dispose();
  });
}
function actualPartHashes(scene: Group, ids: ReadonlySet<string>) {
  const hashes = new Map<string, string>();
  const point = new Vector3();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const id = String(object.userData.wf_part ?? '');
    if (!ids.has(id)) return;
    expect(hashes.has(id), `duplicate actual mesh ${id}`).toBe(false);
    const hash = createHash('sha256');
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      const bytes = Buffer.allocUnsafe(24);
      bytes.writeDoubleLE(point.x, 0);
      bytes.writeDoubleLE(point.y, 8);
      bytes.writeDoubleLE(point.z, 16);
      hash.update(bytes);
    }
    const index = object.geometry.index;
    hash.update(
      JSON.stringify(
        index
          ? Array.from({ length: index.count }, (_, i) => index.getX(i))
          : Array.from({ length: positions.count }, (_, i) => i),
      ),
    );
    hash.update(String(object.userData.wf_source));
    hash.update(String(object.userData.wf_material));
    hashes.set(id, hash.digest('hex'));
  });
  return hashes;
}

let beforeKit: Group;
let candidateKit: Group;
beforeAll(async () => {
  [beforeKit, candidateKit] = await Promise.all([
    load(`${folder}before-kit/tower-kit.glb`),
    load('public/models/eiffel-construction-kit/tower-kit.glb'),
  ]);
}, 30_000);

describe('Eiffel summit kit adoption boundary', () => {
  it('preserves every stage-under-54 manifest record and the carried stair identity', () => {
    const before = new Map(beforeManifest.parts.filter(relevant).map((p) => [p.id, p]));
    const candidate = new Map(
      candidateManifest.parts.filter(relevant).map((p) => [p.id, p]),
    );
    expect(candidate.size).toBe(compatibility.partCount);
    expect([...candidate.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [id, part] of before) expect(candidate.get(id), id).toEqual(part);
  });

  it('preserves actual transformed mesh vertices and topology for that domain', () => {
    const ids = new Set(beforeManifest.parts.filter(relevant).map((p) => p.id));
    const before = actualPartHashes(beforeKit, ids);
    const candidate = actualPartHashes(candidateKit, ids);
    expect(before.size).toBe(compatibility.partCount);
    expect(candidate.size).toBe(compatibility.partCount);
    expect([...candidate.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [id, hash] of before) expect(candidate.get(id), id).toBe(hash);
  }, 30_000);

  afterAll(() => {
    dispose(beforeKit);
    dispose(candidateKit);
  });
});
