import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import type { SydneyPrimitive } from '../../engine/sydneyLandmarks';

/** One merged, non-indexed, vertex-coloured batch for every landmark solid.
 * Bottom faces are omitted: every primitive stands on ground, deck or water. */
export function createSydneyLandmarkGeometry(
  primitives: readonly SydneyPrimitive[],
): BufferGeometry {
  const position: number[] = [];
  const color: number[] = [];
  const facade: number[] = [];
  const scratch = new Color();
  let tint = [1, 1, 1],
    wall = 0;
  const tri = (a: number[], b: number[], c: number[]) => {
    position.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) {
      color.push(tint[0]!, tint[1]!, tint[2]!);
      facade.push(wall);
    }
  };
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  for (const p of primitives) {
    scratch.set(p.color);
    tint = [scratch.r, scratch.g, scratch.b];
    wall = 'facade' in p && p.facade ? 1 : 0;
    if (p.kind === 'ribbon') {
      wall = 0;
      for (let i = 1; i < p.points.length; i++) {
        const a = p.points[i - 1]!,
          b = p.points[i]!,
          len = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1,
          nx = (-(b[2] - a[2]) / len) * (p.w / 2),
          nz = ((b[0] - a[0]) / len) * (p.w / 2);
        const la = [a[0] + nx, a[1], a[2] + nz],
          ra = [a[0] - nx, a[1], a[2] - nz],
          lb = [b[0] + nx, b[1], b[2] + nz],
          rb = [b[0] - nx, b[1], b[2] - nz];
        const down = (v: number[]) => [v[0]!, v[1]! - p.thickness, v[2]!];
        quad(la, lb, rb, ra);
        quad(down(lb), lb, la, down(la));
        quad(down(ra), ra, rb, down(rb));
      }
      continue;
    }
    if (p.kind === 'cylinder' || p.kind === 'dome') {
      const n = p.segments;
      if (p.kind === 'cylinder') {
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2,
            a1 = ((i + 1) / n) * Math.PI * 2;
          const x0 = p.x + Math.cos(a0) * p.r,
            z0 = p.z + Math.sin(a0) * p.r,
            x1 = p.x + Math.cos(a1) * p.r,
            z1 = p.z + Math.sin(a1) * p.r;
          quad([x0, p.y, z0], [x0, p.y + p.h, z0], [x1, p.y + p.h, z1], [x1, p.y, z1]);
          const w0 = wall;
          wall = 0;
          tri([p.x, p.y + p.h, p.z], [x1, p.y + p.h, z1], [x0, p.y + p.h, z0]);
          wall = w0;
        }
      } else {
        const rings = 4;
        for (let j = 0; j < rings; j++) {
          const t0 = (j / rings) * (Math.PI / 2),
            t1 = ((j + 1) / rings) * (Math.PI / 2);
          for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2,
              a1 = ((i + 1) / n) * Math.PI * 2;
            const v = (t: number, a: number) => [
              p.x + Math.cos(a) * Math.cos(t) * p.r,
              p.y + Math.sin(t) * p.h,
              p.z + Math.sin(a) * Math.cos(t) * p.r,
            ];
            quad(v(t0, a0), v(t1, a0), v(t1, a1), v(t0, a1));
          }
        }
      }
      continue;
    }
    const b = p as Extract<SydneyPrimitive, { kind: 'box' | 'prism' | 'hull' }>;
    const c = Math.cos(b.yaw),
      s = Math.sin(b.yaw);
    const at = (lx: number, y: number, lz: number) => [
      b.x + c * lx + s * lz,
      y,
      b.z - s * lx + c * lz,
    ];
    const hw = b.w / 2,
      hd = b.d / 2,
      y0 = b.y,
      y1 = b.y + b.h;
    if (b.kind === 'prism') {
      // Gable roof: ridge along local X at the top, eaves along ±Z.
      quad(at(-hw, y0, hd), at(hw, y0, hd), at(hw, y1, 0), at(-hw, y1, 0));
      quad(at(hw, y0, -hd), at(-hw, y0, -hd), at(-hw, y1, 0), at(hw, y1, 0));
      tri(at(hw, y0, hd), at(hw, y0, -hd), at(hw, y1, 0));
      tri(at(-hw, y0, -hd), at(-hw, y0, hd), at(-hw, y1, 0));
      continue;
    }
    // Box, or a hull whose bow comes to a point at local +X.
    const bow = b.kind === 'hull' ? Math.min(b.d * 1.8, b.w * 0.22) : 0;
    const outline: [number, number][] =
      b.kind === 'hull'
        ? [
            [-hw, -hd * 0.8],
            [-hw + b.d * 0.3, -hd],
            [hw - bow, -hd],
            [hw, 0],
            [hw - bow, hd],
            [-hw + b.d * 0.3, hd],
            [-hw, hd * 0.8],
          ]
        : [
            [-hw, -hd],
            [hw, -hd],
            [hw, hd],
            [-hw, hd],
          ];
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i]!,
        [bx, bz] = outline[(i + 1) % outline.length]!;
      quad(at(ax, y0, az), at(ax, y1, az), at(bx, y1, bz), at(bx, y0, bz));
    }
    const w0 = wall;
    wall = 0;
    for (let i = 1; i + 1 < outline.length; i++)
      tri(
        at(outline[0]![0], y1, outline[0]![1]),
        at(outline[i + 1]![0], y1, outline[i + 1]![1]),
        at(outline[i]![0], y1, outline[i]![1]),
      );
    wall = w0;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
  geometry.setAttribute('sydFacade', new Float32BufferAttribute(facade, 1));
  geometry.computeVertexNormals();
  return geometry;
}
