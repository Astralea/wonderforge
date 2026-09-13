import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchedMesh, Box3, Matrix4, Mesh, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { EiffelLongLoadDriveSystem } from '../src/render/three/EiffelLongLoadDriveSystem';
import { sampleEiffelLongLoadDrive } from '../src/engine/eiffelLongLoadDrive';
import { sampleEiffelLongLoadFilm } from '../src/engine/eiffelLongLoadFilm';

const systems:EiffelLongLoadDriveSystem[]=[];
const create=()=>{const s=new EiffelLongLoadDriveSystem();systems.push(s);return s;};
afterEach(()=>{systems.splice(0).forEach(s=>s.dispose());vi.restoreAllMocks();});
function role(system:EiffelLongLoadDriveSystem,name:string):Object3D{
 let result:Object3D|undefined;system.group.traverse(o=>{if(o.userData.wf_role===name)result=o;});
 if(!result)throw Error(`Missing actual drive role ${name}`);return result;
}
function center(object:Object3D){const mesh=object as Mesh;mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox!.getCenter(new Vector3()).applyMatrix4(mesh.matrixWorld);}

describe('Actual Blender long-load steam drive',()=>{
 it('restores small-assembly shadows on close or detailed views without changing source geometry or poses',async()=>{
  const system=create();await system.ready;system.update(60);
  const bounds=new Box3().setFromObject(system.group),center=bounds.getCenter(new Vector3());
  const camera=new PerspectiveCamera(50,1,.1,2000);
  const batches=system.group.children.filter((o):o is BatchedMesh=>o instanceof BatchedMesh);
  const before=batches.map(b=>({geometry:b.geometry,visible:b.visible,receive:b.receiveShadow,matrices:Array.from({length:b.instanceCount},(_,i)=>b.getMatrixAt(i,new Matrix4()).toArray())}));
  for(const [distance,shortFilm,expected] of [[600,true,false],[8,true,true],[600,true,false],[600,false,true],[8,true,true]] as const){
   camera.position.copy(center).add(new Vector3(0,0,distance));
   system.setShadowCamera(camera,844,shortFilm);
   for(const [i,b] of batches.entries()){
    expect(b.castShadow).toBe(expected);expect(b.geometry).toBe(before[i]!.geometry);
    expect(b.visible).toBe(before[i]!.visible);expect(b.receiveShadow).toBe(before[i]!.receive);
    expect(Array.from({length:b.instanceCount},(_,id)=>b.getMatrixAt(id,new Matrix4()).toArray())).toEqual(before[i]!.matrices);
   }
  }
 });
 it('keeps actual .5m rod eye spacing and pin contacts through forward/reverse crank motion',async()=>{
  const system=create();system.update(60);await system.ready;expect(system.group.userData.seconds).toBe(60);
  const originalChildren=new Map<Object3D,number[]>();
  system.group.traverse(o=>{if(o instanceof Mesh&&!(o instanceof BatchedMesh))originalChildren.set(o,o.quaternion.toArray());});
  for(const seconds of[0,6,17,40,60,100,112,120,124,128,60,0]){
   system.update(seconds);const sample=sampleEiffelLongLoadDrive(seconds),load=sampleEiffelLongLoadFilm(seconds);
   const big=center(role(system,'connecting-rod-big-end')),small=center(role(system,'connecting-rod-small-end'));
   const crank=center(role(system,'crank-pin')),crosshead=center(role(system,'crosshead-pin'));
   expect(big.distanceTo(small)).toBeCloseTo(.5,5);
   expect(Math.hypot(big.x-crank.x,big.y-crank.y)).toBeLessThan(2e-5);
   const pinBounds=new Box3().setFromObject(role(system,'crank-pin'));
   const eyeBounds=new Box3().setFromObject(role(system,'connecting-rod-big-end'));
   expect(eyeBounds.min.z).toBeGreaterThanOrEqual(pinBounds.min.z-2e-5);
   expect(eyeBounds.max.z).toBeLessThanOrEqual(pinBounds.max.z+2e-5);
   expect(small.distanceTo(crosshead)).toBeLessThan(2e-5);
   expect(big.distanceTo(new Vector3(...sample.crankPin))).toBeLessThan(2e-5);
   expect(crosshead.distanceTo(new Vector3(...sample.sliderOrigin))).toBeLessThan(2e-5);
   const crankRoot=role(system,'drive-crank');
   expect(crankRoot.getWorldPosition(new Vector3()).distanceTo(new Vector3(...sample.crankOrigin))).toBeLessThan(2e-5);
   // Receiver local +X is world -Z; its mating pinion rotates +Z at twice angle.
   const axisX=new Vector3(1,0,0).transformDirection(crankRoot.matrixWorld);
   expect(axisX.distanceTo(new Vector3(Math.cos(2*load.drumAngle),Math.sin(2*load.drumAngle),0))).toBeLessThan(2e-5);
   for(const[child,q]of originalChildren)expect(child.quaternion.toArray()).toEqual(q);
   expect(role(system,'drive-connecting-rod').scale.toArray()).toEqual([1,1,1]);
  }
 });
 it('submits the source world transforms to actual render batches and retains all source triangles',async()=>{
  const system=create();await system.ready;
  const internals=system as unknown as {batches:{mesh:BatchedMesh;sources:{mesh:Mesh;id:number}[]}[]};
  for(const b of internals.batches){expect(b.mesh.frustumCulled).toBe(false);expect(b.mesh.perObjectFrustumCulled).toBe(true);}
  expect(internals.batches.length).toBeGreaterThan(0);expect(internals.batches.length).toBeLessThanOrEqual(10);
  let sourceCount=0,triangles=0;
  for(const b of internals.batches)for(const source of b.sources){sourceCount++;triangles+=(source.mesh.geometry.index?.count??source.mesh.geometry.attributes.position!.count)/3;expect(source.mesh.visible).toBe(false);}
  expect(sourceCount).toBeGreaterThan(20);expect(triangles).toBeGreaterThan(1000);
  for(const t of[0,60,112,128,0]){
   system.update(t);
   for(const b of internals.batches)for(const source of b.sources){
    const render=b.mesh.getMatrixAt(source.id,new Matrix4()).premultiply(b.mesh.matrixWorld);
    expect(Math.max(...render.elements.map((x,i)=>Math.abs(x-source.mesh.matrixWorld.elements[i]!)))).toBeLessThan(2e-5);
   }
  }
  // Presence/contact geometry, not a claim that this static operator performs every control action.
  expect(new Box3().setFromObject(system.group).isEmpty()).toBe(false);
 });
 it('releases batch/geometry/material resources once and ignores updates after early or completed disposal',async()=>{
  const early=create();early.dispose();await early.ready;early.update(80);expect(early.group.children).toHaveLength(0);
  const system=create();await system.ready;
  const resources=new Set<{dispose():void}>();system.group.traverse(o=>{if(o instanceof BatchedMesh)resources.add(o);else if(o instanceof Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);}});
  const spies=[...resources].map(r=>vi.spyOn(r,'dispose'));
  system.dispose();system.dispose();system.update(40);for(const spy of spies)expect(spy).toHaveBeenCalledTimes(1);expect(system.group.children).toHaveLength(0);
 });
});
