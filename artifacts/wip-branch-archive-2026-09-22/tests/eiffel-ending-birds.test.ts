import { expect, it, vi } from 'vitest';
import { Box3, BufferAttribute, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { EIFFEL_ENDING_BIRD_PERIOD, eiffelEndingBirdOpacity, sampleEiffelEndingBirds } from '../src/engine/eiffelEndingBirds';
import { eiffelFilmEditShotAt } from '../src/engine/eiffelFilmEdit';
import { EiffelEndingBirds } from '../src/render/three/EiffelEndingBirds';

function cameraAt(seconds: number, aspect: number) {
  const s = eiffelFilmEditShotAt('cinematic', Math.min(1, seconds / 180), aspect), c = new PerspectiveCamera(s.fov, aspect, 5, 2400);
  c.position.set(s.target[0] + Math.cos(s.azimuth) * Math.cos(s.pitch) * s.radius,
    s.target[1] + Math.sin(s.pitch) * s.radius, s.target[2] + Math.sin(s.azimuth) * Math.cos(s.pitch) * s.radius);
  c.lookAt(new Vector3(...s.target)); c.updateMatrixWorld(); return c;
}

// Rasterize the union of projected solid triangles at 4x sampling. A long
// subpixel line must not pass merely because its bounding box is wide.
function projectedBirdArea(attr: BufferAttribute, bird: number, camera: PerspectiveCamera, width: number, height: number): number {
  const stride = attr.count / 5;
  const vertices = Array.from({ length: stride }, (_, i) => {
    const p = new Vector3().fromBufferAttribute(attr, bird * stride + i).project(camera);
    return [(p.x + 1) * width / 2, (1 - p.y) * height / 2];
  });
  const pixels = new Set<string>();
  for (let i = 0; i < stride; i += 3) {
    const [a, b, c] = vertices.slice(i, i + 3) as [number[], number[], number[]];
    const edge = (p: number[], q: number[], x: number, y: number) => (q[0]! - p[0]!) * (y - p[1]!) - (q[1]! - p[1]!) * (x - p[0]!);
    for (let y = Math.floor(Math.min(a[1]!, b[1]!, c[1]!) * 4); y <= Math.ceil(Math.max(a[1]!, b[1]!, c[1]!) * 4); y++) {
      for (let x = Math.floor(Math.min(a[0]!, b[0]!, c[0]!) * 4); x <= Math.ceil(Math.max(a[0]!, b[0]!, c[0]!) * 4); x++) {
        const px = (x + .5) / 4, py = (y + .5) / 4;
        const edges = [edge(a, b, px, py), edge(b, c, px, py), edge(c, a, px, py)];
        if (edges.every(e => e >= 0) || edges.every(e => e <= 0)) pixels.add(`${x},${y}`);
      }
    }
  }
  return pixels.size / 16;
}

it('shows a filled wing silhouette rather than an antialiased subpixel sliver', () => {
  const flock = new EiffelEndingBirds(), mesh = flock.group.children[0] as Mesh;
  const attr = mesh.geometry.getAttribute('position') as BufferAttribute;
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    for (const seconds of [178, 179, 180, 181, 182]) {
      flock.update(seconds, true);
      const camera = cameraAt(seconds, width! / height!);
      const areas = Array.from({ length: 5 }, (_, bird) => projectedBirdArea(attr, bird, camera, width!, height!));
      expect(areas.filter(a => a >= (width === 1280 ? 5 : 4)).length, `${width}px @${seconds}: ${areas}`).toBeGreaterThanOrEqual(3);
    }
  }
  flock.dispose();
});

it('fades into dawn and samples smooth, finite, closed routes with physical clearance', () => {
  expect(eiffelEndingBirdOpacity(174)).toBe(0);
  expect(eiffelEndingBirdOpacity(175.5)).toBe(.5);
  expect(eiffelEndingBirdOpacity(177)).toBe(1);
  for (const t of [NaN, Infinity, -100, 0, 174, 220, 100000]) {
    expect(sampleEiffelEndingBirds(t).every(b => [...b.position, b.heading, b.bank, b.wingAngle].every(Number.isFinite))).toBe(true);
  }
  for (let t = 174; t <= 222; t += .1) {
    const birds = sampleEiffelEndingBirds(t);
    birds.forEach((b, i) => {
      expect(b.wingspan).toBeGreaterThanOrEqual(1.1); expect(b.wingspan).toBeLessThanOrEqual(1.4);
      // Even wingtips stay hundreds of metres clear of the city/tower volume.
      expect(b.position[1] - b.wingspan).toBeGreaterThan(245);
      expect(b.position[2] + b.wingspan).toBeLessThan(-390);
      const next = sampleEiffelEndingBirds(t + 1 / 60)[i]!;
      expect(new Vector3(...b.position).distanceTo(new Vector3(...next.position))).toBeLessThan(.2);
      const loop = sampleEiffelEndingBirds(t + EIFFEL_ENDING_BIRD_PERIOD)[i]!;
      expect(new Vector3(...b.position).distanceTo(new Vector3(...loop.position))).toBeLessThan(1e-10);
      expect(b.wingAngle).toBeCloseTo(loop.wingAngle, 10);
      for (let j = i + 1; j < birds.length; j++) expect(new Vector3(...b.position).distanceTo(new Vector3(...birds[j]!.position))).toBeGreaterThan(3);
    });
  }
});

it('renders a bounded one-batch flock with deforming geometry and fresh bounds after seeking', () => {
  const flock = new EiffelEndingBirds(), mesh = flock.group.children[0] as Mesh;
  expect(mesh.castShadow).toBe(false); expect(mesh.receiveShadow).toBe(false);
  expect(flock.group.visible).toBe(false);
  flock.update(178, true);
  expect(flock.group.visible).toBe(true); expect(flock.group.children).toHaveLength(1);
  const attr = mesh.geometry.getAttribute('position') as BufferAttribute;
  const first = Array.from(attr.array), verticesPerBird = attr.count / 5;
  expect(attr.count / 3).toBeLessThan(500);
  const center = sampleEiffelEndingBirds(178)[0]!.position;
  const wingRelative = first.slice(0, verticesPerBird * 3).map((v, i) => v - center[i % 3]!);
  flock.update(178.14, true);
  const nextCenter = sampleEiffelEndingBirds(178.14)[0]!.position;
  const newRelative = Array.from(attr.array).slice(0, verticesPerBird * 3).map((v, i) => v - nextCenter[i % 3]!);
  expect(Math.max(...wingRelative.map((v, i) => Math.abs(v - newRelative[i]!)))).toBeGreaterThan(.02);
  for (const t of [177, 188, 209, 224, 178]) {
    flock.update(t, true);
    const all = new Box3().setFromBufferAttribute(attr);
    expect(mesh.geometry.boundingBox!.equals(all)).toBe(true);
    for (let i = 0; i < attr.count; i++) expect(mesh.geometry.boundingSphere!.center.distanceTo(new Vector3().fromBufferAttribute(attr, i))).toBeLessThanOrEqual(mesh.geometry.boundingSphere!.radius + 1e-10);
    for (let b = 0; b < 5; b++) {
      const box = new Box3();
      for (let i = b * verticesPerBird; i < (b + 1) * verticesPerBird; i++) box.expandByPoint(new Vector3().fromBufferAttribute(attr, i));
      const size = box.getSize(new Vector3());
      expect(size.length()).toBeLessThan(1.7); expect(size.length()).toBeGreaterThan(.8);
      expect(box.min.y).toBeGreaterThan(245);
    }
  }
  expect(Array.from(attr.array)).toEqual(first);
  const previousVersion = attr.version;
  const normals = vi.spyOn(mesh.geometry, 'computeVertexNormals');
  flock.update(178, false); flock.update(120, true);
  expect(flock.group.visible).toBe(false);
  expect(attr.version).toBe(previousVersion); expect(normals).not.toHaveBeenCalled();
  flock.update(178, true);
  expect(Array.from(attr.array)).toEqual(first); expect(normals).toHaveBeenCalledTimes(1);
  const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
  const materialDispose = vi.spyOn(mesh.material as import('three').Material, 'dispose');
  flock.dispose(); flock.dispose(); flock.update(200, true);
  expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1);
  expect(flock.group.children).toHaveLength(0); expect(flock.group.visible).toBe(false);
});

it('projects actual bird geometry into clear sky with a readable real-scale silhouette', () => {
  const flock = new EiffelEndingBirds(), mesh = flock.group.children[0] as Mesh;
  const attr = mesh.geometry.getAttribute('position') as BufferAttribute, stride = attr.count / 5;
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    let maxMotion = 0;
    for (let t = 175; t <= 228; t += .5) {
      const camera = cameraAt(t, width! / height!);
      flock.update(t, true);
      let visible = 0;
      const spans: number[] = [];
      for (let b = 0; b < 5; b++) {
        const projected = new Box3();
        for (let i = b * stride; i < (b + 1) * stride; i++) projected.expandByPoint(new Vector3().fromBufferAttribute(attr, i).project(camera));
        // Right of the tower's narrow upper-shaft silhouette, above the city.
        expect(projected.min.x).toBeGreaterThan(.055);
        if (projected.max.x < .95 && projected.min.y > .03 && projected.max.y < .82) visible++;
        const pixelWidth = (projected.max.x - projected.min.x) * width! / 2;
        const pixelHeight = (projected.max.y - projected.min.y) * height! / 2;
        spans.push(Math.max(pixelWidth, pixelHeight));
        expect(spans[b]).toBeLessThan(12);
        const p = new Vector3(...sampleEiffelEndingBirds(t)[b]!.position).project(camera);
        const next = new Vector3(...sampleEiffelEndingBirds(t + .5)[b]!.position).project(camera);
        maxMotion = Math.max(maxMotion, Math.hypot((next.x - p.x) * width! / 2, (next.y - p.y) * height! / 2));
      }
      expect(visible, `${width}x${height} @${t}, spans=${spans}`).toBeGreaterThanOrEqual(3);
      if (t >= 178 && t <= 182) expect(spans.filter(s => s >= (width === 1280 ? 5 : 4)).length,
        `${width}x${height} @${t}, spans=${spans}`).toBeGreaterThanOrEqual(3);
    }
    expect(maxMotion).toBeGreaterThan(2); expect(maxMotion).toBeLessThan(20);
  }
  flock.dispose();
});
