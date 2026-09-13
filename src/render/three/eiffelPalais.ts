import { Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const EIFFEL_PALAIS_GLB = '/models/eiffel/palais-trocadero.glb';

async function readPalaisBuffer(): Promise<ArrayBuffer> {
  try {
    const response = await fetch(EIFFEL_PALAIS_GLB);
    if (response.ok) return await response.arrayBuffer();
  } catch {
    /* vitest jsdom has fetch but no preview server */
  }
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('eiffel palais glb missing');
  }
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const file = resolve(process.cwd(), 'public/models/eiffel/palais-trocadero.glb');
  const buf = readFileSync(file);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function paintPalais(
  root: Group,
  ochre: MeshStandardMaterial,
  arcade: MeshStandardMaterial,
  roof: MeshStandardMaterial,
  glass: MeshStandardMaterial,
): void {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const n = obj.name;
    if (n.includes('glass') || n.includes('window')) {
      obj.material = glass;
      return;
    }
    if (n.includes('dome') || n.includes('roof') || n.includes('cap')) {
      obj.material = roof;
      return;
    }
    if (
      n.includes('arcade') ||
      n.includes('arch') ||
      n.includes('plinth') ||
      n.includes('statue') ||
      n.includes('capital') ||
      n.includes('post')
    ) {
      obj.material = arcade;
      return;
    }
    obj.material = ochre;
  });
}

function ensureGroup(root: Group, name: string): Group {
  const existing = root.getObjectByName(name);
  if (existing instanceof Group) return existing;
  const group = new Group();
  group.name = name;
  if (existing) {
    existing.name = `${name}-mesh`;
    existing.parent?.add(group);
    group.add(existing);
  } else {
    root.add(group);
  }
  return group;
}

function reparentByPrefix(root: Group, group: Group, match: (name: string) => boolean): void {
  const moving: Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof Mesh && match(obj.name) && obj.parent !== group) moving.push(obj);
  });
  for (const mesh of moving) group.add(mesh);
}

export async function loadEiffelPalaisGlb(
  ochre: MeshStandardMaterial,
  arcade: MeshStandardMaterial,
  roof: MeshStandardMaterial,
  glass: MeshStandardMaterial,
): Promise<Group> {
  const buffer = await readPalaisBuffer();
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  const root = gltf.scene;
  root.name = 'eiffel-palais-trocadero';
  root.userData.palaisSource = 'blender';
  paintPalais(root, ochre, arcade, roof, glass);
  const arcadeGroup = ensureGroup(root, 'eiffel-trocadero-arcade');
  const windows = ensureGroup(root, 'eiffel-trocadero-windows');
  const statues = ensureGroup(root, 'eiffel-trocadero-statues');
  reparentByPrefix(
    root,
    arcadeGroup,
    (n) => n.includes('arcade') || n.startsWith('eiffel-trocadero-post') || n === 'eiffel-trocadero-arch-post',
  );
  reparentByPrefix(
    root,
    windows,
    (n) => n.includes('window') || n.includes('glass') || n.includes('wing-arch') || n === 'eiffel-trocadero-arch',
  );
  reparentByPrefix(
    root,
    statues,
    (n) => n.includes('statue') || n.includes('capital'),
  );
  return root;
}
