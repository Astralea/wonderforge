import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Raycaster,Vector3,Box3} from 'three';
import {sampleEiffelFacePackageTransfer as sample} from '../src/engine/eiffelFacePackageTransfer';
const folder='artifacts/eiffel-face-transfer-2026-09-08/';
describe('independent package receiver transfer',()=>{
 it('continues the same load through alignment, transfer and a continuous supported descent',()=>{
  for(const t of [42,48,64,76,78]){const a=sample(t-1e-6),b=sample(t+1e-6);expect(Math.hypot(...a.pose.position.map((x,k)=>x-b.pose.position[k]!))).toBeLessThan(1e-5);}
  const positions=Array.from({length:821},(_,i)=>sample(i/10));
  for(let i=820;i>=0;i--){const s=sample(i/10);expect(s).toEqual(positions[i]);expect(s.crane.reach).toBeGreaterThanOrEqual(5.5);expect(s.crane.reach).toBeLessThan(12);expect(s.crane.hoistRopeLength).toBeGreaterThan(0);}
  expect(sample(76).pose.position).toEqual([52,18.488,-43.1]);expect(sample(82).phase).toBe('seated-on-receiver');expect(sample(82).deckReaction).toBeGreaterThan(800);
  expect(sample(75).deckReaction).toBe(0);expect(sample(82).support).toBe('receiver-and-bridle');expect(()=>sample(Infinity)).toThrow();
 });
 it('preserves a complete actual Blender receiving deck after joint unions and supports all four payload feet',async()=>{
  const bytes=readFileSync(folder+'model/receiver.glb'),meta=JSON.parse(readFileSync(folder+'model/manifest.json','utf8'));
  expect(meta.sourceOccupancySHA256).toBe(createHash('sha256').update(readFileSync(folder+'receiver-occupancy.json')).digest('hex'));
  const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;scene.updateMatrixWorld(true);
  try{const ray=new Raycaster();
   for(let i=0;i<=10;i++)for(let j=0;j<=20;j++){ray.set(new Vector3(51.59+i*.082,19,-43.78+j*.068),new Vector3(0,-1,0));expect(ray.intersectObject(scene,true)[0]!.point.y).toBeCloseTo(18.2,4);}
   for(const x of [-.211,.211])for(const z of [-.5,.5]){ray.set(new Vector3(52+x,19,-43.1+z),new Vector3(0,-1,0));expect(ray.intersectObject(scene,true)[0]!.point.y+.288).toBeCloseTo(sample(82).pose.position[1],4);}
   // The three distinct timber feet meet the existing frame's 15.72 m top.
   for(const [x,z] of [[51,-45],[50.4,-44.5],[48.4,-44.5]]){ray.set(new Vector3(x,15.5,z),new Vector3(0,1,0));expect(ray.intersectObject(scene,true)[0]!.point.y).toBeCloseTo(15.72,4);}
   expect(new Box3().setFromObject(scene).min.y).toBeCloseTo(15.72,4);
  }finally{scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 });
});
