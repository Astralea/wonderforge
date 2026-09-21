import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { COLOSSEUM_AQUEDUCT as A } from '../../data/colosseumAqueduct';
import { AQUEDUCT_LENGTH, AQUEDUCT_PITCH, aqueductPierAt, aqueductPointAt } from '../../engine/colosseumAqueduct';

type Point = [number, number, number];

/** Coarse, truly perforated upstream silhouette beyond the authored Blender kit.
 * It shares the same hydraulic grade and terrain support, then runs past the
 * film's fog envelope. This is authored route compression, not a surveyed map.
 */
export class ColosseumAqueductContinuation {
  readonly group = new Group();
  private readonly geometry = new BufferGeometry();
  private readonly material = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .94, side: DoubleSide });
  private disposed = false;

  constructor() {
    this.group.name = 'colosseum-aqueduct-upstream-continuation';
    const positions: number[] = [], colors: number[] = [];
    const brick = new Color('#a67156'), cap = new Color('#b79b7d');
    const face = (points: Point[], color = brick) => {
      for (let i = 1; i < points.length - 1; i++) for (const p of [points[0]!, points[i]!, points[i + 1]!]) {
        positions.push(...p);
        colors.push(color.r, color.g, color.b);
      }
    };
    const point = (distance: number, height: number): Point => {
      const p = aqueductPointAt(distance);
      return [p.x, p.springing + height, p.z];
    };
    const strip = (start: number, end: number, bottom: number, top: number, color = brick) => {
      face([point(start,bottom), point(end,bottom), point(end,top), point(start,top)], color);
    };

    for (let bay = 0; bay < A.continuationBays; bay++) {
      const start = AQUEDUCT_LENGTH + bay * AQUEDUCT_PITCH;
      const profile: Array<[number, number]> = [[0,0]];
      for (let i = 0; i <= A.continuationSegments; i++) {
        const angle = Math.PI * (1 - i / A.continuationSegments);
        profile.push([AQUEDUCT_PITCH / 2 + Math.cos(angle) * A.archRise, Math.sin(angle) * A.archRise]);
      }
      profile.push([AQUEDUCT_PITCH,0]);
      for (let i = 1; i < profile.length; i++) {
        const [x0,y0] = profile[i - 1]!, [x1,y1] = profile[i]!;
        face([point(start + x0,y0), point(start + x1,y1), point(start + x1,A.spandrelTop), point(start + x0,A.spandrelTop)]);
      }

      // The near kit already owns the shared last pier. Add only each new
      // upstream support, using its actual four-corner terrain minimum.
      const pier = aqueductPierAt(A.pierCount + bay);
      const left = point(pier.distance - A.pierWidth / 2, 0);
      const right = point(pier.distance + A.pierWidth / 2, 0);
      face([[left[0],pier.ground,left[2]], [right[0],pier.ground,right[2]], right, left]);
    }

    const end = AQUEDUCT_LENGTH + A.continuationBays * AQUEDUCT_PITCH + A.pierWidth / 2;
    strip(AQUEDUCT_LENGTH, end, A.spandrelTop, A.spandrelTop + A.channelHeight);
    strip(AQUEDUCT_LENGTH, end, A.spandrelTop + A.channelHeight, A.spandrelTop + A.channelHeight + A.capHeight, cap);
    // Close the final half-pier under the specus, after the fully fogged end.
    strip(end - A.pierWidth / 2, end, 0, A.spandrelTop);
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    const mesh = new Mesh(this.geometry, this.material);
    mesh.name = 'colosseum-aqueduct-distant-arcade';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.geometry.dispose();
    this.material.dispose();
  }
}
