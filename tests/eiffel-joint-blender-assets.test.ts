import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {Mesh,Vector3,Raycaster} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import support from '../artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json';
import manifest from '../public/models/eiffel-joint-campaign/manifest.json';
import {eiffelReceiverBeamBox} from '../src/engine/eiffelUpperClearance';
import {EiffelOccupancy,eiffelAxisBox,eiffelBoxPenetration,type EiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {EiffelKitManifest} from '../src/data/eiffelKitTypes';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';
async function load(name:string){const b=readFileSync(`public/models/eiffel-joint-campaign/${name}.glb`);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
describe('Blender joint-support contract',()=>{
 it('leaves permanent hardware clear of the rest of the final tower, including later construction',()=>{
  const kit=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
  const occupancy=new EiffelOccupancy(kit.parts.map(part=>({part,end:0})));
  for(const plate of manifest.plates){
   const boxes=[eiffelAxisBox(plate.center as unknown as V,[.04,.11,.65]),eiffelAxisBox([plate.center[0]!,19,plate.center[2]!-.3],[.04,.05,.05])];
   for(const box of boxes)for(const obstacle of occupancy.nearby(box,0)){
    if(support.partIds.includes(obstacle.part.id))continue;
    expect(eiffelBoxPenetration(box,obstacle.box),obstacle.part.id).toBeLessThanOrEqual(1e-5);
   }
  }
 });
 it('exports exactly the reviewed support solids, at their actual world-space bounds',async()=>{
  expect(manifest.supportSourceSHA256).toBe(createHash('sha256').update(readFileSync('artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json')).digest('hex'));
  const gltf=await load('support'),boxes=new Map<string,EiffelSolidBox>();
  support.beams.forEach(b=>boxes.set(b.id,eiffelReceiverBeamBox(b.a as unknown as V,b.b as unknown as V,b.halfWidth)));
  support.boxes.forEach(b=>boxes.set(b.id,eiffelAxisBox(b.center as unknown as V,b.size as unknown as V)));
  const seen=new Set<string>();gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(!(o instanceof Mesh))return;const id=o.userData.wf_member_id;expect(boxes.has(id)).toBe(true);seen.add(id);const box=boxes.get(id)!,p=o.geometry.getAttribute('position');
   for(let i=0;i<p.count;i++){const point=new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(new Vector3(...box.center));box.axes.forEach((axis,k)=>expect(Math.abs(point.dot(new Vector3(...axis)))).toBeLessThanOrEqual(box.half[k]!+1e-5));}
  });expect(seen.size).toBe(boxes.size);
 });
 it('cuts a real pocket under the captive plate while preserving the surrounding carrying surface',async()=>{
  const gltf=await load('cart');gltf.scene.updateMatrixWorld(true);const ray=new Raycaster();
  const top=(z:number)=>{ray.set(new Vector3(0,2,z),new Vector3(0,-1,0));return ray.intersectObject(gltf.scene,true)[0]!.point.y;};
  expect(top(2.35)).toBeCloseTo(manifest.bed.topY-.045,6);
  expect(top(1.8)).toBeCloseTo(manifest.bed.topY,6);
  expect(top(-2)).toBeCloseTo(manifest.bed.topY,6);
  for(const station of [-1.20,-1.13,1.205,1.28])expect(top(station)).toBeCloseTo(manifest.bed.topY-.05,6);
 });
});
