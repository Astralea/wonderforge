import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Raycaster,Vector3} from 'three';
import {sampleEiffelFaceReceivingWorker as sample} from '../src/engine/eiffelFaceReceivingWorker';
import {sampleEiffelFacePackageTransfer} from '../src/engine/eiffelFacePackageTransfer';
const path='artifacts/eiffel-face-installation-2026-09-08/';
async function load(file:string){const bytes=readFileSync(file),g=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;g.updateMatrixWorld(true);return g;}
describe('prepositioned receiving worker',()=>{
 it('keeps grounded feet and fixed human arm lengths through reversible reach and contact',()=>{
  for(let i=0;i<=820;i++){
   const s=sample(i/10);expect(sample(i/10)).toEqual(s);
   for(const p of s.primitives){if(p.kind==='beam'&&p.id.startsWith('upper-arm'))expect(Math.hypot(...p.a.map((v,k)=>v-p.b[k]!))).toBeCloseTo(.38,10);if(p.kind==='beam'&&p.id.startsWith('forearm'))expect(Math.hypot(...p.a.map((v,k)=>v-p.b[k]!))).toBeCloseTo(.4,10);if(p.kind==='box'&&p.id.startsWith('foot-'))expect(p.center[1]-p.size[1]/2).toBeCloseTo(17.7,10);}
   for(const c of s.contacts)if(c.active){expect(c.center[0]-.03).toBeCloseTo(c.surface[0],10);expect(c.center[1]).toBe(c.surface[1]);expect(c.center[2]).toBe(c.surface[2]);}
  }
  expect(sample(72).phase).toBe('waiting');expect(sample(74).phase).toBe('guiding-tray');
 });
 it('meets actual Blender platform and moving tray rail surfaces',async()=>{
  const [platform,payload]=await Promise.all([load(path+'model/worker-platform.glb'),load('artifacts/eiffel-face-package-2026-09-08/model/face-package.glb')]);
  try{const ray=new Raycaster();
   for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){ray.set(new Vector3(52.55+i*.05,18,-43.5+j*.08),new Vector3(0,-1,0));expect(ray.intersectObject(platform,true)[0]!.point.y).toBeCloseTo(17.7,4);}
   for(const p of sample(82).primitives)if(p.kind==='box'&&p.id.startsWith('foot-')){ray.set(new Vector3(p.center[0],18,p.center[2]),new Vector3(0,-1,0));expect(ray.intersectObject(platform,true)[0]!.point.y).toBeCloseTo(p.center[1]-p.size[1]/2,4);}
   for(const t of [73.5,74,75,76,78,82]){const state=sampleEiffelFacePackageTransfer(t);payload.position.set(...state.pose.position);payload.quaternion.set(...state.pose.quaternion);payload.updateMatrixWorld(true);
    for(const c of sample(t).contacts){ray.set(new Vector3(...c.center),new Vector3(-1,0,0));expect(ray.intersectObject(payload,true)[0]!.distance).toBeCloseTo(.03,5);}
   }
  }finally{for(const g of [platform,payload])g.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 });
});
