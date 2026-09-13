import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Object3D,Vector3} from 'three';

const folder='artifacts/eiffel-summit-rigging-2026-09-08/';
describe('Blender vertical paired crane mechanism study',()=>{
 it('exports two opposed articulated jibs facing away from the central guides',async()=>{
  const bytes=readFileSync(folder+'model/vertical-pair.glb');
  const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  scene.updateMatrixWorld(true);
  try{
   const roots:Object3D[]=[],jibs:Object3D[]=[];
   scene.traverse(o=>{if(o.userData.wf_crane_side)roots.push(o);if(o.userData.wf_role==='jib')jibs.push(o);});
   expect(roots).toHaveLength(2);expect(jibs).toHaveLength(2);
   const tips:Vector3[]=[];
   const length=JSON.parse(readFileSync(folder+'vertical-pair-spec.json','utf8')).model.boomLength as number;
   for(const jib of jibs){
    const heel=jib.getWorldPosition(new Vector3()),tip=new Vector3(0,length,0).applyMatrix4(jib.matrixWorld);tips.push(tip);
    expect(tip.y).toBeGreaterThan(heel.y);
    expect((tip.x-heel.x)*heel.x+(tip.z-heel.z)*heel.z).toBeGreaterThan(1);
    expect(Math.hypot(tip.x,tip.z)).toBeGreaterThan(Math.hypot(heel.x,heel.z)+5);
   }
   expect(tips[0]!.z*tips[1]!.z).toBeLessThan(0);
   expect(tips[0]!.x).toBeCloseTo(-tips[1]!.x,4);
   expect(tips[0]!.z).toBeCloseTo(-tips[1]!.z,4);
  }finally{scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 });
});
