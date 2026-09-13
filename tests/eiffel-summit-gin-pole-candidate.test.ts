import { readFileSync } from 'node:fs';
import { Box3, DoubleSide, Mesh, Raycaster, Vector3, type Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EiffelKitManifest } from '../src/data/eiffelKitTypes';
import { eiffelConvexBox, eiffelConvexPenetration, eiffelConvexSolid } from '../src/engine/eiffelConvex';
import { eiffelSolidBox } from '../src/engine/eiffelOccupancy';
import type { RigidVec3 } from '../src/engine/eiffelRigid';

const file='artifacts/eiffel-summit-assembly-2026-09-08/model/summit-gin-pole-candidate.glb';
const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
let root:Group;
function role(id:string):Object3D {let found:Object3D|undefined;root.traverse(o=>{if(o.userData.wf_role===id)found=o;});if(!found)throw Error(`missing ${id}`);return found;}
function meshes(o:Object3D):Mesh[]{const result:Mesh[]=[];o.traverse(child=>{if(child instanceof Mesh)result.push(child);});return result;}
beforeAll(async()=>{const b=readFileSync(file);root=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;root.updateMatrixWorld(true);for(const mesh of meshes(root))for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])mat.side=DoubleSide;});
afterAll(()=>{for(const mesh of meshes(root)){mesh.geometry.dispose();for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])mat.dispose();}});

describe('actual Blender compact gin-pole candidate (not admitted production)',()=>{
 it('has fixed six-metre source pole and three-metre articulated jib, without duplicate bolts',()=>{
  const all=meshes(root);expect(all).toHaveLength(53);
  const pole=all.find(o=>o.name.startsWith('fixed-six-metre-pole'))!;
  const bounds=new Box3().setFromObject(pole);expect(bounds.getSize(new Vector3()).toArray()).toEqual(expect.arrayContaining([expect.closeTo(6,6)]));
  expect(bounds.min.x).toBeCloseTo(-.965,6);expect(bounds.max.x).toBeCloseTo(-.835,6);expect(bounds.min.y).toBeCloseTo(0,6);expect(bounds.max.y).toBeCloseTo(6,6);
  expect(role('gin-pole-jib').position.toArray()).toEqual(expect.arrayContaining([expect.closeTo(-.9,6),expect.closeTo(6,6),expect.closeTo(0,6)]));
  const chords=all.filter(o=>o.name.startsWith('fixed-jib-chord'));expect(chords).toHaveLength(2);
  for(const chord of chords)expect(new Box3().setFromObject(chord).getSize(new Vector3()).x).toBeCloseTo(3,5);
  const bolts=all.filter(o=>o.name.startsWith('clamp-bolt'));expect(bolts).toHaveLength(4);
  const centers=bolts.map(o=>new Box3().setFromObject(o).getCenter(new Vector3()).toArray().map(v=>v.toFixed(6)).join(','));expect(new Set(centers).size).toBe(4);
 });
 it('has genuinely open mast and pole bores whose actual interior faces meet their supported members',()=>{
  const ray=new Raycaster();
  for(const y of [.2,1.4]){
   const collar=role(`mast-collar-${y}`),targets=meshes(collar);
   // Rays start in the empty bore: first triangle is the actual inside wall.
   for(const direction of [new Vector3(1,0,0),new Vector3(-1,0,0),new Vector3(0,0,1),new Vector3(0,0,-1)]){
    ray.set(new Vector3(0,y,0),direction);const hit=ray.intersectObjects(targets,false)[0];expect(hit).toBeDefined();expect(hit!.distance).toBeCloseTo(.09,6);
    ray.set(new Vector3(-.9,y,0),direction);const poleHit=ray.intersectObjects(targets,false)[0];expect(poleHit).toBeDefined();expect(poleHit!.distance).toBeCloseTo(.065,6);
   }
   ray.set(new Vector3(0,y-.3,0),new Vector3(0,1,0));ray.far=.6;expect(ray.intersectObjects(targets,false)).toEqual([]);ray.far=Infinity;
  }
 });
 it('keeps actual exported pole, clamp and fork solids clear of already seated kit at both stations',()=>{
  const violations:{station:number;mesh:string;part:string;depth:number}[]=[];
  for(const [index,baseY] of [300.9,305.56666666666666].entries()){
   const excluded=new Set(index===0?['m072-c001','m072-c002','m074-c000','m075-c000','m076-c000']:['m072-c002','m076-c000']);
   const obstacles=manifest.parts.filter(p=>p.boundsMax[1]>=300.7&&!excluded.has(p.id.replace('summit-crown-',''))).map(p=>({id:p.id,shape:eiffelConvexBox(eiffelSolidBox(p,p.finalPose))}));
   for(const mesh of meshes(root).filter(o=>!o.name.startsWith('fixed-jib-')&&!o.name.startsWith('jib-'))){
    const p=mesh.geometry.attributes.position!,vertices:RigidVec3[]=[];
    for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);vertices.push([v.x,v.y+baseY,v.z]);}
    const indices=mesh.geometry.index,faces:number[][]=[];for(let i=0;i<(indices?.count??p.count);i+=3)faces.push([0,1,2].map(j=>indices?indices.getX(i+j):i+j));
    const shape=eiffelConvexSolid(vertices,faces);
    for(const obstacle of obstacles){const depth=eiffelConvexPenetration(shape,obstacle.shape);if(depth>1e-5)violations.push({station:index,mesh:mesh.name,part:obstacle.id,depth});}
   }
  }
  expect(violations).toEqual([]);
 });
});
