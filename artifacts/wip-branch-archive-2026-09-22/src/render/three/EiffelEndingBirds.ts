import { BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { EIFFEL_ENDING_BIRD_COUNT, eiffelEndingBirdOpacity, sampleEiffelEndingBirds } from '../../engine/eiffelEndingBirds';

type Vertex = { x: number; y: number; z: number; wing: number; color: Color };
const WHITE = new Color('#929b9f'), BODY = new Color('#b8bab7'), TIP = new Color('#343c42'), BEAK = new Color('#b29c6c');
/** Small solid body, swept tapered wings, tail and head; not a billboard V. */
function makeBird(): Vertex[] {
  const out: Vertex[] = [];
  const tri = (a: number[], b: number[], c: number[], wing = 0, color = WHITE) => {
    for (const p of [a, b, c]) out.push({ x: p[0]!, y: p[1]!, z: p[2]!, wing, color });
  };
  function ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
    const point = (i: number, j: number) => {
      const a = i / 4 * Math.PI, b = j / 6 * Math.PI * 2;
      return [cx + Math.sin(a) * Math.cos(b) * rx, cy + Math.cos(a) * ry, cz + Math.sin(a) * Math.sin(b) * rz];
    };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
      if (i > 0) tri(point(i, j), point(i, j + 1), point(i + 1, j), 0, BODY);
      if (i < 3) tri(point(i, j + 1), point(i + 1, j + 1), point(i + 1, j), 0, BODY);
    }
  }
  ellipsoid(0, 0, 0, .072, .078, .23);
  ellipsoid(0, .044, .23, .06, .065, .065);
  tri([-.034, .038, .27], [.034, .038, .27], [0, .028, .375], 0, BEAK);
  tri([0, .068, .27], [-.034, .038, .27], [0, .028, .375], 0, BEAK);
  tri([.034, .038, .27], [0, .068, .27], [0, .028, .375], 0, BEAK);
  tri([-.045, 0, -.17], [-.115, .014, -.35], [.115, .014, -.35]);
  tri([-.045, 0, -.17], [.115, .014, -.35], [.045, 0, -.17]);
  for (const side of [-1, 1]) {
    const p = (x: number, y: number, z: number) => [x * side, y, z * 1.4];
    // Broad shoulder joins the body; narrow black-tipped primaries sweep aft.
    const rootF = p(.045, .02, .12), rootB = p(.045, .02, -.12);
    const wristF = p(.31, .025, .14), wristB = p(.35, .025, -.055);
    const tipF = p(.66, -.02, -.135), tipB = p(.62, -.02, -.205);
    tri(rootF, rootB, wristF, side); tri(rootB, wristB, wristF, side);
    tri(wristF, wristB, tipF, side); tri(wristB, tipB, tipF, side);
    tri(p(.55, -.008, -.098), p(.54, -.008, -.165), tipF, side, TIP);
    tri(p(.54, -.008, -.165), tipB, tipF, side, TIP);
  }
  return out;
}

/** One dynamic batch; real geometry deformation and fresh bounds, no lights or
 * shadows. Absolute-time sampling also works when scrubbing backward. */
export class EiffelEndingBirds {
  readonly group = new Group();
  private readonly template = makeBird();
  private readonly geometry = new BufferGeometry();
  private readonly material = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true,
    roughness: .92, metalness: 0, side: DoubleSide, transparent: true, opacity: 0, depthWrite: false });
  private readonly mesh: Mesh;
  private disposed = false;
  constructor() {
    this.group.name = 'eiffel-ending-birds';
    const count = this.template.length * EIFFEL_ENDING_BIRD_COUNT;
    this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage));
    const colors = new Float32Array(count * 3);
    for (let bird = 0; bird < EIFFEL_ENDING_BIRD_COUNT; bird++) this.template.forEach((v, i) => v.color.toArray(colors, (bird * this.template.length + i) * 3));
    this.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'eiffel-ending-gull-flock';
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    this.group.add(this.mesh);
    this.update(0, false);
  }
  update(seconds: number, visible: boolean): void {
    if (this.disposed) return;
    const opacity = eiffelEndingBirdOpacity(seconds);
    this.group.visible = visible && opacity > 0;
    this.material.opacity = opacity;
    if (!this.group.visible) {
      Object.assign(this.group.userData, { count: EIFFEL_ENDING_BIRD_COUNT,
        opacity, seconds, positions: [], wingAngles: [], wingspans: [],
        batches: 1, triangles: this.template.length * EIFFEL_ENDING_BIRD_COUNT / 3 });
      return;
    }
    const birds = sampleEiffelEndingBirds(seconds);
    const positions = this.geometry.getAttribute('position');
    birds.forEach((bird, index) => {
      const scale = bird.wingspan / 1.32;
      const cb = Math.cos(bird.bank), sb = Math.sin(bird.bank), ch = Math.cos(bird.heading), sh = Math.sin(bird.heading);
      this.template.forEach((v, i) => {
        let x = v.x * scale, y = v.y * scale;
        const z = v.z * scale;
        if (v.wing) {
          const angle = bird.wingAngle * v.wing;
          const hinge = .045 * v.wing * scale;
          const span = x - hinge;
          x = hinge + span * Math.cos(angle);
          y += span * Math.sin(angle);
        }
        const bx = x * cb - y * sb, by = x * sb + y * cb;
        positions.setXYZ(index * this.template.length + i,
          bird.position[0] + bx * ch + z * sh,
          bird.position[1] + by,
          bird.position[2] - bx * sh + z * ch);
      });
    });
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox(); this.geometry.computeBoundingSphere();
    Object.assign(this.group.userData, { count: birds.length, opacity, seconds,
      positions: birds.map(b => b.position), wingAngles: birds.map(b => b.wingAngle),
      wingspans: birds.map(b => b.wingspan), batches: 1, triangles: positions.count / 3 });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.geometry.dispose(); this.material.dispose();
    this.group.clear(); this.group.visible = false;
  }
}
