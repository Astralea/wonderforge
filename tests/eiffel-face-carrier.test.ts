import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {Mesh,Raycaster,Vector3,Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const folder='artifacts/eiffel-face-carrier-2026-09-07/';
const design=JSON.parse(readFileSync('artifacts/eiffel-face-joint-2026-09-07/carrier-design.json','utf8'));
const meta=JSON.parse(readFileSync(folder+'model/manifest.json','utf8'));
async function load(file:string){const bytes=readFileSync(folder+'model/'+file);const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;scene.updateMatrixWorld(true);return scene;}
function dispose(scene:Group){scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
describe('Blender face-joint transport carrier',()=>{
 it('retains all seven cart planks and cuts only the intended shallow channels',async()=>{
  const cart=await load('carrier-cart.glb'),ray=new Raycaster(),top=1.141950000822544;
  const slots=meta.cartSlots as {centerZ:number;width:number;depth:number}[];
  for(let plank=0;plank<7;plank++)for(let k=0;k<111;k++){
   const x=-.9+(plank+.5)*1.8/7,z=-2.72+k*5.44/110;
   let depth=Math.max(...slots.map(s=>Math.abs(z-s.centerZ)<s.width/2?s.depth:0));
   if((z>-1.28&&z< -1.06)||(z>1.13&&z<1.35))depth=Math.max(depth,.05);
   if(plank===3&&z>2&&z<2.71)depth=Math.max(depth,.045);
   ray.set(new Vector3(x,3,z),new Vector3(0,-1,0));const hit=ray.intersectObject(cart,true)[0];
   expect(hit,`Missing plank ${plank} at z=${z}`).toBeTruthy();expect(hit!.point.y).toBeCloseTo(top-depth,5);
  }
  dispose(cart);
 });
 it('exports actual angle sections, with empty inside corners and bounds matching the checked carrier',async()=>{
  expect(meta.sourceCarrierSHA256).toBe(createHash('sha256').update(readFileSync('artifacts/eiffel-face-joint-2026-09-07/carrier-design.json')).digest('hex'));
  const frame=await load('face-carrier.glb'),meshes:Mesh[]=[];frame.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
  expect(meshes).toHaveLength(20);expect(meshes.filter(o=>o.userData.wf_profile==='angle-leg')).toHaveLength(12);
  for(const mesh of meshes){
   const box=design.candidate.boxes.find((b:{id:string})=>b.id===mesh.userData.wf_member).box;
   const position=mesh.geometry.attributes.position!;
   for(let i=0;i<position.count;i++){
    const p=new Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).sub(new Vector3(...box.center));
    for(let axis=0;axis<3;axis++)expect(Math.abs(p.dot(new Vector3(...box.axes[axis])))).toBeLessThan(box.half[axis]+1e-5);
   }
  }
  const rail=design.candidate.boxes.find((b:{id:string})=>b.id==='bottom-seat').box;
  const origin=new Vector3(...rail.center).addScaledVector(new Vector3(...rail.axes[0]),-rail.half[0]/2).addScaledVector(new Vector3(...rail.axes[1]),-rail.half[1]/2).addScaledVector(new Vector3(...rail.axes[2]),-rail.half[2]-.1);
  const ray=new Raycaster(origin,new Vector3(...rail.axes[2]));
  expect(ray.intersectObjects(meshes.filter(m=>m.userData.wf_member==='bottom-seat'))).toHaveLength(0);
  dispose(frame);
 });
});
