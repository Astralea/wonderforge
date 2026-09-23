import { describe, expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3, FrontSide } from 'three';
import raw from '../src/data/generated/sydneyBlenderModel.json';
import {
  SYDNEY_BLENDER_MODEL,
  SYDNEY_SAILS,
  SYDNEY_PODIUM_MESHES,
  SYDNEY_DETAILS,
  SYDNEY_FINISH_DETAILS,
  SYDNEY_STRUCTURAL_DETAILS,
  SYDNEY_PODIUM_DECK,
  SYDNEY_SPHERE_RADIUS,
  sydneyShellPoint,
  sydneyShellNormal,
  sydneyBounds,
  sydneyPodiumHeightAt,
} from '../src/data/sydneyShells';
import { SYDNEY_CONSTRUCTION as plan } from '../src/data/sydneyConstruction';
import {
  SydneyStoneSystem,
  sydneyPartVertices,
} from '../src/render/three/SydneyStoneSystem';
import type { MaterialLibrary } from '../src/render/three/MaterialLibrary';

const distance = (a: number[], b: number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]!));

describe('Sydney Blender authoring to production parity', () => {
  it('consumes the real versioned export and exactly reproduces every authored grid sample', () => {
    expect(SYDNEY_BLENDER_MODEL).toBe(raw);
    expect(raw.version).toBe(3);
    expect(raw.authoring).toMatch(/blender/i);
    expect(SYDNEY_SAILS.length).toBeGreaterThanOrEqual(7);
    for (const sail of SYDNEY_SAILS)
      for (const side of [-1, 1] as const)
        for (let row = 0; row < sail.rows; row++)
          for (let col = 0; col < sail.cols; col++) {
            const index =
              (((side === -1 ? 0 : 1) * sail.rows + row) * sail.cols + col) * 3;
            expect(
              sydneyShellPoint(
                sail,
                row / (sail.rows - 1),
                col / (sail.cols - 1),
                side,
              ),
            ).toEqual(sail.points.slice(index, index + 3));
          }
  });
  it('bilinearly samples cells and offsets along normalized authored normals', () => {
    for (const sail of SYDNEY_SAILS)
      for (const side of [-1, 1] as const) {
        const row = 23,
          col = 11;
        const corners = [
          [row, col],
          [row + 1, col],
          [row, col + 1],
          [row + 1, col + 1],
        ].map(([r, c]) => {
          const index =
            (((side === -1 ? 0 : 1) * sail.rows + r!) * sail.cols + c!) * 3;
          return sail.points.slice(index, index + 3);
        });
        const u = (row + 0.5) / (sail.rows - 1),
          v = (col + 0.5) / (sail.cols - 1);
        const expected = [0, 1, 2].map((axis) =>
          corners.reduce((sum, p) => sum + p[axis]! / 4, 0),
        );
        const p = sydneyShellPoint(sail, u, v, side);
        expect(distance(p, expected)).toBeLessThan(1e-10);
        const normal = sydneyShellNormal(sail, u, v, side);
        expect(Math.hypot(...normal)).toBeCloseTo(1, 10);
        const offset = sydneyShellPoint(sail, u, v, side, 0.22);
        expect(distance(offset, p)).toBeCloseTo(0.22, 10);
        offset.forEach((n, i) =>
          expect(n - p[i]!).toBeCloseTo(normal[i]! * 0.22, 10),
        );
      }
  });
  it('has one supported pedestal per half and spherical authored points/normals', () => {
    for (const sail of SYDNEY_SAILS)
      for (const side of [-1, 1] as const) {
        const foot = sydneyShellPoint(sail, 0, 0, side);
        expect(foot[1]).toBeCloseTo(SYDNEY_PODIUM_DECK, 3);
        expect(
          sydneyPodiumHeightAt(foot[0], foot[2]),
          `${sail.name} pedestal`,
        ).toBeCloseTo(foot[1], 3);
        const centre = sail.sphereCenters[side === -1 ? 0 : 1];
        for (let col = 0; col < sail.cols; col++) {
          expect(
            distance(
              sydneyShellPoint(sail, 0, col / (sail.cols - 1), side),
              foot,
            ),
          ).toBeLessThan(1e-5);
          for (let row = 1; row < sail.rows; row += 7) {
            const u = row / (sail.rows - 1),
              v = col / (sail.cols - 1),
              p = sydneyShellPoint(sail, u, v, side);
            expect(distance(p, centre)).toBeCloseTo(SYDNEY_SPHERE_RADIUS, 3);
            const normal = sydneyShellNormal(sail, u, v, side);
            normal.forEach((n, i) =>
              expect(n).toBeCloseTo(
                (p[i]! - centre[i]!) / SYDNEY_SPHERE_RADIUS,
                4,
              ),
            );
            expect(p[1]).toBeGreaterThan(foot[1] + 0.001);
          }
        }
      }
  });
  it('renders exact additive authored podium meshes with truthful deterministic bounds', () => {
    expect(SYDNEY_PODIUM_MESHES.length).toBeGreaterThan(24);
    expect(SYDNEY_PODIUM_MESHES.length).toBeLessThan(500);
    const parts = plan.parts.filter((p) => p.graph === 'podium');
    expect(parts).toHaveLength(SYDNEY_PODIUM_MESHES.length);
    for (const authored of SYDNEY_PODIUM_MESHES) {
      const part = parts.find((p) => p.id === `podium-${authored.id}`)!;
      expect(sydneyPartVertices(part)).toBe(authored.vertices);
      const bounds = sydneyBounds(authored.vertices);
      bounds.position.forEach((p, i) =>
        expect(p).toBeCloseTo(authored.position[i]!, 3),
      );
      bounds.dimensions.forEach((p, i) =>
        expect(p).toBeCloseTo(authored.dimensions[i]!, 3),
      );
    }
    // Curved/angled terraces are authored polygon meshes, beyond the old bays.
    expect(
      SYDNEY_PODIUM_MESHES.some(
        (p) =>
          new Set(
            p.vertices.filter((_, i) => i % 3 === 0).map((x) => x.toFixed(3)),
          ).size > 4,
      ),
    ).toBe(true);
    expect(sydneyPodiumHeightAt(1000, 1000)).toBeUndefined();
  });
  it('renders roof normals about the authored world sphere centres after hall and site rotations', () => {
    const system = new SydneyStoneSystem(plan, {} as MaterialLibrary);
    for (const kind of ['rib', 'sail'] as const) {
      const mesh = system.group.getObjectByName(`sydney-parts-${kind}`) as Mesh;
      const points = mesh.geometry.getAttribute('position');
      const normals = mesh.geometry.getAttribute('normal');
      let cursor = 0;
      for (const part of plan.parts
        .filter((p) => p.kind === kind)
        .sort(
          (a, b) => a.start + 0.9 * a.duration - (b.start + 0.9 * b.duration),
        )) {
        if (!part.surface) {
          cursor += sydneyPartVertices(part).length / 3;
          continue;
        }
        const centre =
          raw.shells[part.sail]!.sphereCenters[
            part.surface!.side === -1 ? 0 : 1
          ]!;
        for (const i of [0, 12, 23]) {
          const radial = [
            points.getX(cursor + i) - centre[0]!,
            points.getY(cursor + i) - centre[1]!,
            points.getZ(cursor + i) - centre[2]!,
          ];
          const length = Math.hypot(...radial);
          const normal = [
            normals.getX(cursor + i),
            normals.getY(cursor + i),
            normals.getZ(cursor + i),
          ];
          normal.forEach((n, axis) =>
            expect(n).toBeCloseTo(radial[axis]! / length, 5),
          );
        }
        cursor += sydneyPartVertices(part).length / 3;
      }
      expect(cursor).toBe(points.count);
    }
    system.dispose();
  });
  it('constructs every full-height infill as bounded rigid authored loads, with exact triangle parity', () => {
    expect(SYDNEY_STRUCTURAL_DETAILS).toHaveLength(8);
    const canonical = (vertices: number[]) => {
      const triangles: string[] = [];
      for (let i = 0; i < vertices.length; i += 9)
        triangles.push(vertices.slice(i, i + 9).join(','));
      return triangles.sort();
    };
    for (const detail of SYDNEY_STRUCTURAL_DETAILS) {
      const panels = plan.parts.filter((p) =>
        p.id.startsWith(`infill-${detail.name}-`),
      );
      expect(panels.length).toBeGreaterThan(1);
      expect(canonical(panels.flatMap((p) => p.authoredVertices!))).toEqual(
        canonical(detail.vertices),
      );
      expect(SYDNEY_FINISH_DETAILS).not.toContain(detail);
      for (const panel of panels) {
        expect(Math.max(...panel.dimensions)).toBeLessThanOrEqual(10);
        expect(panel.graph).toBe('shell');
        expect(panel.kind).toBe('sail');
        expect(panel.start + panel.duration).toBeLessThan(0.82);
        expect(panel.scale).toEqual([1, 1, 1]);
      }
    }
  });
  it('keeps continuous authored flank colors identical across crane-load partitions', () => {
    const system = new SydneyStoneSystem(plan, {} as MaterialLibrary);
    const mesh = system.group.getObjectByName('sydney-parts-sail') as Mesh;
    const colors = mesh.geometry.getAttribute('color');
    let cursor = 0;
    for (const part of plan.parts.filter((p) => p.kind === 'sail').sort(
      (a, b) => a.start + a.duration * 0.9 - (b.start + b.duration * 0.9),
    )) {
      const count = sydneyPartVertices(part).length / 3;
      if (part.authoredVertices)
        for (let i = cursor; i < cursor + count; i++) {
          expect(colors.getX(i)).toBe(1);
          expect(colors.getY(i)).toBe(1);
          expect(colors.getZ(i)).toBe(1);
        }
      cursor += count;
    }
    system.dispose();
  });
  it('renders outward solid foyer walls down to the plaza with FrontSide granite', () => {
    const system = new SydneyStoneSystem(plan, {} as MaterialLibrary);
    system.update(1);
    system.group.updateMatrixWorld(true);
    const mesh = system.group.getObjectByName('sydney-parts-block') as Mesh;
    if (Array.isArray(mesh.material))
      throw new Error('Unexpected podium material array');
    expect(mesh.material.side).toBe(FrontSide);
    expect(mesh.geometry.drawRange.count).toBe(
      mesh.geometry.getAttribute('position').count,
    );
    const ray = new Raycaster();
    const wings = SYDNEY_PODIUM_MESHES.filter((p) =>
      p.id.includes('foyer-wing'),
    );
    expect(wings).toHaveLength(35);
    for (const wing of wings) {
      expect(
        Math.min(...wing.vertices.filter((_, i) => i % 3 === 1)),
      ).toBeCloseTo(2.2, 4);
      // The export's first prism is hub/a/b. Its outward curved face is
      // triangles6/7; the following prisms are the projecting facade bands.
      const a = new Vector3().fromArray(wing.vertices, 54),
        b = new Vector3().fromArray(wing.vertices, 57),
        c = new Vector3().fromArray(wing.vertices, 60);
      const outward = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const centre = a.clone().add(b).add(c).divideScalar(3);
      for (const y of [3.2, 5, 8, 12]) {
        const origin = centre.clone().setY(y).addScaledVector(outward, 3);
        ray.set(origin, outward.clone().negate());
        ray.far = 3.01;
        expect(
          ray.intersectObject(mesh, false).length,
          `${wing.id} outside wall y${y}`,
        ).toBeGreaterThan(0);
      }
    }
    system.dispose();
  });
  it('batches authored detail triangles at their own reveal times and reverses exactly', () => {
    expect(SYDNEY_DETAILS.some((d) => d.material === 'glass')).toBe(true);
    expect(SYDNEY_DETAILS.some((d) => d.material === 'bronze')).toBe(true);
    const system = new SydneyStoneSystem(plan, {} as MaterialLibrary);
    expect(
      system.group.getObjectByName('sydney-glazed-arch-ends'),
    ).toBeUndefined();
    for (const material of [
      'glass',
      'bronze',
      'concrete',
      'granite',
      'tile',
    ] as const) {
      const records = SYDNEY_FINISH_DETAILS.filter(
        (d) => d.material === material,
      ).sort((a, b) => a.reveal - b.reveal);
      if (!records.length) continue;
      const mesh = system.group.getObjectByName(
        `sydney-authored-${material}`,
      ) as Mesh;
      const expected = records.flatMap((d) => d.vertices);
      expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(
        Array.from(new Float32Array(expected)),
      );
      for (const t of [
        1,
        0.8,
        ...records.flatMap((d) => [d.reveal - 1e-7, d.reveal, d.reveal + 1e-7]),
        0,
        1,
      ]) {
        system.update(t);
        expect(mesh.geometry.drawRange.count).toBe(
          records
            .filter((d) => d.reveal <= t)
            .reduce((sum, d) => sum + d.vertices.length / 3, 0),
        );
      }
    }
    system.dispose();
  });
});
