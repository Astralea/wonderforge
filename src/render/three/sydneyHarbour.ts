import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function hipRoof(width: number, depth: number, height: number): BufferGeometry {
  const hw = width * 0.52;
  const hd = depth * 0.52;
  const ridge = Math.min(width, depth) * 0.18;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        -hw, 0, -hd, hw, 0, -hd, ridge, height, 0,
        -hw, 0, -hd, ridge, height, 0, -ridge, height, 0,
        hw, 0, -hd, hw, 0, hd, ridge, height, 0,
        hw, 0, hd, -hw, 0, hd, -ridge, height, 0,
        hw, 0, hd, -ridge, height, 0, ridge, height, 0,
        -hw, 0, hd, -hw, 0, -hd, -ridge, height, 0,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function createSydneyShedHall(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

export function createSydneyShedRoof(): BufferGeometry {
  const roof = hipRoof(1.16, 1.12, 0.55);
  roof.translate(0, 0.5, 0);
  return roof;
}

export function createSydneyOfficeTower(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

export function createSydneyOfficeCrown(): BufferGeometry {
  const slab = new BoxGeometry(1.08, 0.08, 1.08);
  slab.translate(0, 0.54, 0);
  return slab;
}

export function createSydneyTerraceHouse(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

export function createSydneyTerraceRoof(): BufferGeometry {
  const roof = hipRoof(1.12, 1.18, 0.48);
  roof.translate(0, 0.5, 0);
  return roof;
}

export function createSydneyFigTrunk(): BufferGeometry {
  return new CylinderGeometry(0.42, 0.78, 1, 8);
}

export function createSydneyFigCrown(): BufferGeometry {
  const lobes = [
    new SphereGeometry(0.72, 10, 8),
    new SphereGeometry(0.58, 9, 7).translate(-0.42, -0.08, 0.18),
    new SphereGeometry(0.52, 9, 7).translate(0.38, -0.12, -0.16),
    new SphereGeometry(0.46, 8, 6).translate(0.08, 0.22, 0.32),
  ];
  const merged = mergeGeometries(lobes, false)!;
  for (const lobe of lobes) lobe.dispose();
  merged.computeVertexNormals();
  return merged;
}

export function createSydneyWorkboatHull(): BufferGeometry {
  const keel = new BoxGeometry(1, 0.22, 0.38);
  keel.translate(0, 0.08, 0);
  const bow = new ConeGeometry(0.2, 0.34, 8);
  bow.rotateZ(-Math.PI / 2);
  bow.translate(0.58, 0.1, 0);
  const merged = mergeGeometries([keel, bow], false)!;
  keel.dispose();
  bow.dispose();
  merged.computeVertexNormals();
  return merged;
}
