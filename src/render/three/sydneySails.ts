import {
  BufferAttribute,
  BufferGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SYDNEY_SPHERE_RADIUS, type SydneySailDef } from '../../data/sydneyConstruction';

const THICKNESS = 0.85;

function keepVaultVertex(
  x: number,
  y: number,
  z: number,
  radius: number,
  half: number,
  foot: number,
  yaw: number,
): boolean {
  const c = Math.cos(-yaw);
  const s = Math.sin(-yaw);
  const lx = x * c - z * s;
  const lz = x * s + z * c;
  const phi = Math.acos(Math.min(1, Math.max(-1, y / radius)));
  if (phi > foot) return false;
  const fromRidge = Math.atan2(Math.abs(lx), Math.hypot(y, lz));
  return fromRidge <= half + 1e-4;
}

function filterVault(source: SphereGeometry, half: number, foot: number, yaw: number): BufferGeometry {
  const mesh = source.toNonIndexed();
  source.dispose();
  const pos = mesh.getAttribute('position') as BufferAttribute;
  const kept: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    let ok = true;
    for (let k = 0; k < 3; k += 1) {
      const idx = i + k;
      if (!keepVaultVertex(pos.getX(idx), pos.getY(idx), pos.getZ(idx), SYDNEY_SPHERE_RADIUS, half, foot, yaw)) {
        ok = false;
        break;
      }
    }
    if (ok) kept.push(i, i + 1, i + 2);
  }
  const next = new Float32Array(kept.length * 3);
  kept.forEach((index, write) => {
    next[write * 3] = pos.getX(index);
    next[write * 3 + 1] = pos.getY(index);
    next[write * 3 + 2] = pos.getZ(index);
  });
  if (kept.length === 0) {
    mesh.dispose();
    throw new Error(`Sydney vault produced no faces (half=${half}, foot=${foot})`);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(next, 3));
  geometry.computeVertexNormals();
  mesh.dispose();
  return geometry;
}

function solidify(geometry: BufferGeometry): BufferGeometry {
  const outer = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (geometry !== outer) geometry.dispose();
  const inner = outer.clone();
  const pos = inner.getAttribute('position') as BufferAttribute;
  const nrm = inner.getAttribute('normal') as BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setXYZ(
      i,
      pos.getX(i) - nrm.getX(i) * THICKNESS,
      pos.getY(i) - nrm.getY(i) * THICKNESS,
      pos.getZ(i) - nrm.getZ(i) * THICKNESS,
    );
  }
  const innerPos = inner.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < innerPos.count; i += 3) {
    const ax = innerPos.getX(i);
    const ay = innerPos.getY(i);
    const az = innerPos.getZ(i);
    innerPos.setXYZ(i, innerPos.getX(i + 1), innerPos.getY(i + 1), innerPos.getZ(i + 1));
    innerPos.setXYZ(i + 1, ax, ay, az);
  }
  inner.computeVertexNormals();
  const merged = mergeGeometries([outer, inner], false);
  outer.dispose();
  inner.dispose();
  merged!.computeVertexNormals();
  return merged!;
}

/**
 * Pointed Utzon vault cut from the 75 m sphere. Geometry is centred on the
 * sail centroid so the renderer places it at scale [1,1,1].
 */
export function createSailGeometry(sail: SydneySailDef): BufferGeometry {
  const source = new SphereGeometry(SYDNEY_SPHERE_RADIUS, 64, 40);
  const shell = solidify(filterVault(source, sail.vault.half, sail.vault.foot, sail.rotation[1]));
  shell.computeBoundingBox();
  const center = new Vector3();
  shell.boundingBox!.getCenter(center);
  shell.translate(-center.x, -center.y, -center.z);
  shell.computeVertexNormals();
  return shell;
}
