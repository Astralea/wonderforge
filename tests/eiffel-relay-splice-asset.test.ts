import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Raycaster,Vector3,DoubleSide} from 'three';
type Bolt={center:number[];axis:number;grip:number};
type Joint={id:string;axis:number;unitIds:string[];plates:{id:string}[];bolts:Bolt[]};
const folder='artifacts/eiffel-relay-platform-2026-09-08/';
const joints=JSON.parse(readFileSync(folder+'platform-splices.json','utf8')).joints as Joint[];
describe('actual drilled Blender relay connections',()=>{
 it('has open bores through both fishplates and owning webs, with solid shoulders beside every hole',async()=>{
  const b=readFileSync(folder+'model/platform-spliced.glb');const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;scene.updateMatrixWorld(true);
  const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh){meshes.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});
  try{
   expect(meshes.filter(m=>m.userData.wf_role==='fishplate')).toHaveLength(28);
   expect(meshes.filter(m=>m.userData.wf_role==='bolt-shaft')).toHaveLength(56);
   expect(meshes.filter(m=>m.userData.wf_role==='bolt-head')).toHaveLength(112);
   for(const j of joints){
    const targets=meshes.filter(m=>j.unitIds.includes(m.userData.wf_unit_id)||(m.userData.wf_splice_id===j.id&&m.userData.wf_role==='fishplate'));
    expect(targets).toHaveLength(4);
    for(const bolt of j.bolts){
     const direction=new Vector3().setComponent(bolt.axis,1);
     const origin=new Vector3(...bolt.center as [number,number,number]).addScaledVector(direction,-.1);
     const ray=new Raycaster(origin,direction,0,.2);
     expect(ray.intersectObjects(targets,false),`${j.id}: bolt bore blocked`).toHaveLength(0);
     const shoulder=origin.clone().setComponent(j.axis,origin.getComponent(j.axis)+.025);
     ray.set(shoulder,direction);
     const hits=ray.intersectObjects(targets,false);
     expect(new Set(hits.map(h=>h.object)).size,`${j.id}: missing solid hole shoulders`).toBe(3);
    }
   }
  }finally{for(const m of meshes){m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}}
 });
});
