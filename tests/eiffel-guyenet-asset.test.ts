import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EiffelGuyenetRig} from '../src/render/three/EiffelGuyenetRig';
import {EIFFEL_GUYENET as D,eiffelGuyenetGuidePoint} from '../src/engine/eiffelGuyenet';
async function rig(){const b=readFileSync('public/models/eiffel-guyenet/crane.glb');return new EiffelGuyenetRig((await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);}
function point(o:THREE.Object3D,p:number[]){return o.localToWorld(new THREE.Vector3(...p));}
function batchMatrices(r:EiffelGuyenetRig){const values:number[]=[];r.group.traverse(o=>{if(o instanceof THREE.BatchedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.instanceCount;i++)values.push(...o.getMatrixAt(i,m).toArray());}});return values;}
describe('actual Blender Guyenet export and web articulation',()=>{
 it('joins both fixed-length ties to the real jib tip throughout working reach and slew',async()=>{
  const r=await rig();r.group.position.set(10,8,-3);r.group.rotation.y=.6;
  for(let i=0;i<=65;i++)for(const slew of [Math.PI/3,1.2,1.5,1.8,2,Math.PI*2/3]){
   r.update(0,5.5+i*.1,slew);
   for(const [role,x] of [['tie-left',-.26],['tie-right',.26]] as const){
    const end=point(r.node(role),[0,D.model.tieLength,0]);
    const pin=point(r.node('jib'),[x,D.model.boomLength,0]);
    expect(end.distanceTo(pin)).toBeLessThan(1e-6);
    expect(point(r.node(role),[0,0,0]).distanceTo(point(r.node('slider'),[x,0,0]))).toBeLessThan(1e-6);
   }
  }
  r.dispose();
 });
 it('retains real safety head contacts and every rigid mesh scale during the climb',async()=>{
  const r=await rig(),scales=new Map<THREE.Object3D,THREE.Vector3>();
  r.group.position.set(2,9,-4);r.group.rotation.y=.4;r.group.traverse(o=>scales.set(o,o.scale.clone()));
  for(let i=0;i<=500;i++){
   const s=r.update(i/500,5.5,0);
   for(const x of [-D.model.railGauge/2,D.model.railGauge/2]){
    const contact=point(r.node('carriage'),[x,...eiffelGuyenetGuidePoint(D.model.safetyHead).slice(1)]);
    expect(contact.distanceTo(point(r.node('safety-heads'),[x,0,0]))).toBeLessThan(1e-6);
   }
   const separation=r.node('head-anchor').getWorldPosition(new THREE.Vector3()).distanceTo(r.node('carriage').getWorldPosition(new THREE.Vector3()));
   expect(separation).toBeCloseTo(s.head-s.carriage,6);
   for(const [o,scale] of scales)expect(o.scale.distanceTo(scale)).toBe(0);
  }
  r.dispose();
 });
 it('keeps the actual bronze skate vertices on the outside flange throughout climbing',async()=>{
  const r=await rig(),normal=new THREE.Vector3(0,-Math.sin(D.model.railTiltDegrees*Math.PI/180),Math.cos(D.model.railTiltDegrees*Math.PI/180));
  const flangeFront=-.65*normal.z-.09;
  for(let i=0;i<=100;i++){
   r.update(i/100,5.5,0);let max=-Infinity;
   r.node('rail-skates').traverse(o=>{if(o instanceof THREE.Mesh){const a=o.geometry.attributes.position;for(let j=0;j<a.count;j++)max=Math.max(max,point(o,[a.getX(j),a.getY(j),a.getZ(j)]).dot(normal));}});
   const gap=flangeFront-max;
   expect(gap).toBeGreaterThan(-1e-6);expect(gap).toBeLessThan(.0001);
  }
  r.dispose();
 });
 it('rejects unsupported work sectors and an unparked climb',async()=>{
  const r=await rig();expect(()=>r.update(0,12,.488)).toThrow('working sector');
  expect(()=>r.update(.4,8.5,Math.PI/2)).toThrow('parked');r.dispose();
 });
 it('matches the manifest dimensions and keeps the component within a bounded triangle budget',async()=>{
  const manifest=JSON.parse(readFileSync('public/models/eiffel-guyenet/crane.manifest.json','utf8'));
  expect(manifest.description).toEqual(D);
  const r=await rig();let count=0;
  r.group.traverse(o=>{if(o instanceof THREE.Mesh&&!(o instanceof THREE.BatchedMesh)){count+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const n of o.geometry.attributes.position.array)expect(Number.isFinite(n)).toBe(true);expect(o.visible).toBe(false);}});
  expect(count).toBe(manifest.triangles);expect(count).toBeLessThan(15000);
  expect(r.group.userData.sourceMeshes).toBe(40);expect(r.group.userData.materialBatches).toBe(7);
  const before=batchMatrices(r);r.setHoistLength(7.25);const forward=batchMatrices(r);expect(forward).not.toEqual(before);
  r.setHoistLength(2.5);r.setHoistLength(7.25);expect(batchMatrices(r)).toEqual(forward);
  r.dispose();
 });
});
