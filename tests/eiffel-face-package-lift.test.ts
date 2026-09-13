import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {Box3,Mesh,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sampleEiffelFacePackageLift as sample,EIFFEL_FACE_PACKAGE_LIFT_CONTEXT as context} from '../src/engine/eiffelFacePackageLift';
import audit from '../artifacts/eiffel-face-package-2026-09-08/crane-column-audit.json';
import bridleMeta from '../artifacts/eiffel-face-package-2026-09-08/model/bridle.manifest.json';
const folder='artifacts/eiffel-face-package-2026-09-08/';
async function load(name:string){const bytes=readFileSync(folder+'model/'+name);const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;scene.updateMatrixWorld(true);return scene;}
describe('independent package vertical lift study',()=>{
 it('keeps the same rigid load and fixed-length bridle throughout a reversible ground lift',()=>{
  const initial=sample(0),poses=Array.from({length:461},(_,i)=>sample(i/10));
  for(const s of poses){expect(s.pose.quaternion).toEqual(initial.pose.quaternion);expect(s.pose.position[0]).toBe(initial.pose.position[0]);expect(s.pose.position[2]).toBe(initial.pose.position[2]);
   expect(s.hook[0]).toBeCloseTo(s.centerOfMass[0],10);expect(s.hook[2]).toBeCloseTo(s.centerOfMass[2],10);
   expect(s.crane.hoistRopeLength).toBeGreaterThan(0);expect(Math.hypot(...s.forceResidual)).toBeLessThan(1e-8);
   s.slings.forEach((leg,i)=>{expect(leg.length).toBeCloseTo(bridleMeta.legLengths[i]!,7);expect(leg.length).toBeCloseTo(initial.slings[i]!.length,10);expect(leg.tension).toBeGreaterThan(0);});
  }
  for(let i=460;i>=0;i--)expect(sample(i/10)).toEqual(poses[i]);
  expect(sample(2).pose).toEqual(initial.pose);expect(sample(42).pose).toEqual(sample(46).pose);
  expect(initial.cartReaction).toBeGreaterThan(0);expect(sample(2).cartReaction).toBe(0);
  expect(sample(46).phase).toBe('held-for-transfer');expect(context.productionAdmitted).toBe(false);
  expect(sample(-1)).toEqual(initial);expect(sample(999)).toEqual(sample(46));expect(()=>sample(NaN)).toThrow();
 });
 it('binds the swept column and mass/bridle to the actual exported payload',()=>{
  const sha=createHash('sha256').update(readFileSync(folder+'model/face-package.glb')).digest('hex');
  expect(context.sourceGLBSHA256).toBe(sha);expect(bridleMeta.payloadSHA256).toBe(sha);
  const column=audit.reports[0]!;for(const key of ['payloadHits','bridleHits','hoistRopeHits','craneHits','guideSelfHits'] as const)expect(column[key]).toEqual([]);
 });
 it('places actual tray bearing feet on solid cart planks at the start, then separates upward',async()=>{
  const [payload,cart]=await Promise.all([load('face-package.glb'),load('package-cart.glb')]);
  try{const bounds=new Box3().setFromObject(payload);expect(bounds.min.y+.858).toBeCloseTo(.57,6);
   const ray=new Raycaster();for(const x of [-.211,.211])for(const z of [-.5,.5]){ray.set(new Vector3(x,1,z),new Vector3(0,-1,0));expect(ray.intersectObject(cart,true)[0]!.point.y).toBeCloseTo(.57,6);}
   expect(bounds.min.y+sample(3).pose.position[1]).toBeGreaterThan(.57);
  }finally{for(const model of [payload,cart])model.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 });
});
