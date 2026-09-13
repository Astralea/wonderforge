import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,describe,expect,it} from 'vitest';
import {Box3,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {eiffelSupplyPusherAt} from '../src/engine/eiffelSupplyPusher';
import design from '../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
const F=design.floorY,roots:Object3D[]=[],surfaces:Mesh[]=[],ray=new Raycaster();
async function load(path:string){const b=readFileSync(path),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;roots.push(s);return s;}
function supported(x:number,z:number){ray.set(new Vector3(x,F+.03,z),new Vector3(0,-1,0));return ray.intersectObjects(surfaces,false).some(h=>Math.abs(h.point.y-F)<2e-5);}
describe('onward real deck and access support',()=>{
 beforeAll(async()=>{
  const [tower,bridge]=await Promise.all([load('public/models/eiffel-construction-kit/tower-kit.glb'),load('public/models/eiffel-long-load-first-floor/bridge.glb')]);
  tower.traverse(o=>{if(o instanceof Mesh&&String(o.userData.wf_part).startsWith('platform-1-'))surfaces.push(o);});
  bridge.traverse(o=>{if(o.userData.wf_role==='freight-hatch')o.rotation.x=0;if(o instanceof Mesh){let p:Object3D|null=o;while(p&&p.userData.wf_role!=='stock-cart')p=p.parent;if(!p)surfaces.push(o);}});
  roots.forEach(s=>s.updateMatrixWorld(true));
 },30000);
 afterAll(()=>{roots.forEach(r=>r.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}}));});
 it('supports every corner of the actual scaffold and ladder sole plates',async()=>{
  const addon=await load('public/models/eiffel-long-load-first-floor/onward.glb');addon.updateMatrixWorld(true);const soles:Mesh[]=[];
  addon.traverse(o=>{if(o instanceof Mesh&&(o.name.startsWith('scaffold-sole')||o.name.startsWith('ladder-sole')))soles.push(o);});expect(soles).toHaveLength(6);
  for(const m of soles){const b=new Box3().setFromObject(m);expect(b.min.y).toBeCloseTo(F,4);for(const x of[b.min.x,b.max.x])for(const z of[b.min.z,b.max.z])expect(supported(x,z),`${m.name}@${x},${z}`).toBe(true);}
 });
 it('supports all four wheel tracks, the pusher and the accompanying chock carrier for all13metres',()=>{
  const failures:string[]=[];
  for(let i=0;i<=260;i++){
   const distance=i/20,cart:[number,number,number]=[-21.5+distance,F,-4];
   for(const dx of[-.25,.25])for(const dz of[-.38,.38])if(!supported(cart[0]+dx,cart[2]+dz))failures.push(`wheel:${distance}:${dx}:${dz}`);
   const gait=eiffelSupplyPusherAt(cart,distance,20,66);
   for(const worker of['pusher','chock'])for(const foot of (worker==='pusher'?eiffelSupplyPusherAt(cart,distance,20,66,-.92):gait).feet){if(!foot.planted)continue;const x=foot.center[0]+(worker==='chock'?1.2:0),z=foot.center[2]-(worker==='chock'?.6:0);for(const dx of[-.13,.13])for(const dz of[-.07,.07])if(!supported(x+dx,z+dz))failures.push(`${worker}:${distance}:${dx}:${dz}`);}
  }
  expect(failures).toEqual([]);
 });
 it('supports the hatch operator throughout the full handle arc on the west deck',()=>{
  for(let i=0;i<=80;i++){const a=Math.PI/2*i/80,z=-3.05+.18*Math.sin(a)-1.65*Math.cos(a);for(const dz of[-.12,.12])for(const dx of[-.13,.13])for(const cornerZ of[-.07,.07])expect(supported(-20.65+dx,z+dz+cornerZ)).toBe(true);}
 });
});
