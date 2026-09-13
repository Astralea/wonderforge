import { transformRigidPoint, rotateRigidVector, type RigidPose, type RigidVec3 as V } from './eiffelRigid';
import type { EiffelSolidBox } from './eiffelOccupancy';

/** An occupied convex solid. Faces must describe its convex boundary. */
export interface EiffelConvexSolid {
  readonly vertices: readonly V[];
  readonly normals: readonly V[];
  readonly edges: readonly V[];
  readonly min: V;
  readonly max: V;
}
const sub = (a: V, b: V): V => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot = (a: V, b: V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V, b: V): V => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = (a: V): V => {
  const length = Math.hypot(...a);
  if (length < 1e-12) throw new Error('Degenerate convex face or edge');
  return [a[0]/length,a[1]/length,a[2]/length];
};
function solid(vertices: readonly V[], normals: readonly V[], edges: readonly V[]): EiffelConvexSolid {
  return {vertices,normals,edges,
    min: [0,1,2].map(k=>Math.min(...vertices.map(v=>v[k]!))) as unknown as V,
    max: [0,1,2].map(k=>Math.max(...vertices.map(v=>v[k]!))) as unknown as V};
}
export function eiffelConvexSolid(vertices: readonly V[], faces: readonly (readonly number[])[]): EiffelConvexSolid {
  if (vertices.length < 4 || vertices.some(v=>v.some(x=>!Number.isFinite(x)))) throw new Error('Invalid convex vertices');
  const normals: V[] = [], edges: V[] = [];
  for (const face of faces) {
    if (face.length < 3 || face.some(i=>!Number.isInteger(i)||!vertices[i])) throw new Error('Invalid convex face');
    const origin = vertices[face[0]!]!;
    normals.push(unit(cross(sub(vertices[face[1]!]!,origin),sub(vertices[face[2]!]!,origin))));
    for (let k=0;k<face.length;k++) edges.push(unit(sub(vertices[face[(k+1)%face.length]!]!,vertices[face[k]!]!)));
  }
  return solid(vertices,normals,edges);
}
export function eiffelConvexBox(box: EiffelSolidBox): EiffelConvexSolid {
  const vertices: V[] = [];
  for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) {
    const s=[x,y,z];
    vertices.push([0,1,2].map(k=>box.center[k]!+box.axes.reduce((sum,a,i)=>sum+a[k]!*box.half[i]!*s[i]!,0)) as unknown as V);
  }
  return solid(vertices,box.axes,box.axes);
}
/** Exact separating-axis test for two convex polyhedra, including containment. */
export function eiffelConvexPenetration(a: EiffelConvexSolid, b: EiffelConvexSolid): number {
  if (a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!)) return 0;
  let depth=Infinity;
  // Rebase projections to avoid losing thin geometry precision far from origin.
  const origin=a.vertices[0]!;
  for (const raw of [...a.normals,...b.normals,...a.edges.flatMap(x=>b.edges.map(y=>cross(x,y)))]) {
    if (Math.hypot(...raw)<1e-10) continue;
    const axis=unit(raw),pa=a.vertices.map(v=>dot(sub(v,origin),axis)),pb=b.vertices.map(v=>dot(sub(v,origin),axis));
    const overlap=Math.min(Math.max(...pa)-Math.min(...pb),Math.max(...pb)-Math.min(...pa));
    if (overlap<=0) return 0;
    depth=Math.min(depth,overlap);
  }
  return depth;
}
/** Exact swept convex volume for a fixed-orientation straight translation. */
export function eiffelConvexTranslationSweep(shape: EiffelConvexSolid, delta: V): EiffelConvexSolid {
  if (Math.hypot(...delta)<1e-12) return shape;
  const direction=unit(delta);
  return solid([...shape.vertices,...shape.vertices.map((v): V=>[v[0]+delta[0],v[1]+delta[1],v[2]+delta[2]])],
    [...shape.normals,...shape.edges.map(e=>cross(e,direction)).filter(n=>Math.hypot(...n)>1e-10).map(unit)],
    [...shape.edges,direction]);
}

/** Rigidly move occupied geometry without changing its shape or filling gaps. */
export function transformEiffelConvexSolid(shape: EiffelConvexSolid, pose: RigidPose): EiffelConvexSolid {
  return solid(shape.vertices.map(v=>transformRigidPoint(pose,v)),
    shape.normals.map(n=>rotateRigidVector(pose.quaternion,n)),
    shape.edges.map(e=>rotateRigidVector(pose.quaternion,e)));
}
