import { BufferGeometry, Float32BufferAttribute } from 'three';
import {
  sydneyPatchVertices,
  type SydneySailDef,
} from '../../data/sydneyShells';
/** Full paired vault for inspection. Production builds the same surface as
 * individual rigid rib segments and tile panels, sharing these exact samples. */
export function createSailGeometry(sail: SydneySailDef): BufferGeometry {
  const vertices: number[] = [];
  for (const side of [-1, 1] as const)
    vertices.push(
      ...sydneyPatchVertices(
        sail,
        { u0: 0, u1: 1, v0: 0, v1: 1, side, depth: 0.18 },
        20,
      ),
    );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
