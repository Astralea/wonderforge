import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Mesh,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sampleEiffelSupplyPusher} from '../src/engine/eiffelSupplyPusher';
describe('Blender supply pusher body',()=>{
 it('exports fixed-size independent body parts used directly by the live pose sampler',async()=>{
  const b=readFileSync('artifacts/eiffel-supply-crew-2026-09-08/model/supply-pusher.glb');const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
  try{const expected=sampleEiffelSupplyPusher(0);expect(meshes).toHaveLength(expected.parts.length);
   for(const p of expected.parts){const m=meshes.find(m=>m.userData.wf_worker_part===p.id)!;expect(m).toBeDefined();m.geometry.computeBoundingBox();const size=m.geometry.boundingBox!.getSize(new Vector3());p.size.forEach((v,i)=>expect(size.getComponent(i)).toBeCloseTo(v,5));}
   for(const t of [0,4,12,20,23,182]){for(const p of sampleEiffelSupplyPusher(t).parts){const m=meshes.find(m=>m.userData.wf_worker_part===p.id)!;m.position.set(...p.center);m.quaternion.set(...p.quaternion);expect(m.scale.toArray()).toEqual([1,1,1]);}}
  }finally{for(const m of meshes){m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}}
 });
});
