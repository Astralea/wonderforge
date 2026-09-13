import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Vector3} from 'three';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import {eiffelSolidBox} from '../src/engine/eiffelOccupancy';
import {eiffelConvexSolid,eiffelConvexBox,eiffelConvexPenetration,eiffelConvexTranslationSweep} from '../src/engine/eiffelConvex';

const folder='artifacts/eiffel-face-joint-2026-09-07/';
const design=JSON.parse(readFileSync(folder+'design.json','utf8'));
// This dated, unadmitted study remains bound to the exact pre-revision kit it audited.
const manifestBytes=readFileSync('artifacts/eiffel-summit-revision-2026-09-08/before-kit/tower-kit.manifest.json');
const manifest=JSON.parse(manifestBytes.toString()) as EiffelKitManifest;
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

describe('Actual Blender face-joint export',()=>{
 it('exports five closed solids matching the designed occupied geometry and mass',async()=>{
  expect(design.sourceManifestSHA256).toBe(sha(manifestBytes));
  const bytes=readFileSync(folder+'model/face-joint.glb');
  const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  scene.updateMatrixWorld(true);
  const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
  expect(meshes).toHaveLength(5);
  const tower=manifest.parts.filter(p=>p.id!==design.replaces).map(p=>eiffelConvexBox(eiffelSolidBox(p,p.finalPose)));
  let triangles=0,mass=0,maxDepth=0;
  const solids=[];
  for(const mesh of meshes){
   const expected=design.components.find((c:{id:string})=>c.id===mesh.userData.wf_part);
   expect(expected).toBeTruthy();expect(mesh.userData.wf_source).toBe(design.sourceMember);
   expect(mesh.userData.wf_shape).toBe('convex-polyhedron');
   const position=mesh.geometry.attributes.position!,index=mesh.geometry.index!;
   const vertices:V[]=Array.from({length:position.count},(_,i)=>new Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).toArray() as unknown as V);
   for(const v of vertices)expect(Math.min(...expected.vertices.map((p:number[])=>Math.hypot(...p.map((x,k)=>x-v[k]!))))).toBeLessThan(1e-6);
   for(const v of expected.vertices)expect(Math.min(...vertices.map(p=>Math.hypot(...p.map((x,k)=>x-v[k]!))))).toBeLessThan(1e-6);
   const faces:number[][]=[],edgeCounts=new Map<string,number>();
   const reference=new Vector3(...vertices[0]!);let volume=0;
   for(let i=0;i<index.count;i+=3){
    const f=[index.getX(i),index.getX(i+1),index.getX(i+2)];faces.push(f);triangles++;
    const a=new Vector3(...vertices[f[0]!]!).sub(reference),b=new Vector3(...vertices[f[1]!]!).sub(reference),c=new Vector3(...vertices[f[2]!]!).sub(reference);
    volume+=a.dot(b.cross(c))/6;
    for(let k=0;k<3;k++){const key=[vertices[f[k]!]!.join(','),vertices[f[(k+1)%3]!]!.join(',')].sort().join('|');edgeCounts.set(key,(edgeCounts.get(key)??0)+1);}
   }
   expect([...edgeCounts.values()].every(n=>n===2)).toBe(true);
   expect(volume).toBeGreaterThan(0);expect(volume*7800).toBeCloseTo(expected.massKg,3);mass+=volume*7800;
   const shape=eiffelConvexSolid(vertices,faces),sweep=eiffelConvexTranslationSweep(shape,design.normal.map((x:number)=>x*.4) as V);
   solids.push(shape);
   for(const fixed of tower)maxDepth=Math.max(maxDepth,eiffelConvexPenetration(shape,fixed),eiffelConvexPenetration(sweep,fixed));
   mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();
  }
  for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)maxDepth=Math.max(maxDepth,eiffelConvexPenetration(solids[i]!,solids[j]!));
  expect(triangles).toBe(60);expect(mass).toBeCloseTo(design.totalMassKg,3);
  // Export precision only: 1 micrometre, not a modelling overlap allowance.
  expect(maxDepth).toBeLessThan(1e-6);
 },30000);

 it('keeps the failed incoming-beam order explicit and does not admit the candidate to production',()=>{
  const report=JSON.parse(readFileSync(folder+'placement-audit.json','utf8'));
  expect(report.sourceManifestSHA256).toBe(sha(manifestBytes));
  expect(report.candidateSHA256).toBe(sha(readFileSync(folder+'design.json')));
  expect(report.geometryAccepted).toBe(true);expect(report.productionAdmitted).toBe(false);
  expect(report.preinstalledPlate.clashes.some((c:{depth:number})=>c.depth>.1)).toBe(true);
 });
});
