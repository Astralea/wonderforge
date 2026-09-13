import {readFileSync} from 'node:fs';
import {Box3,Group,Mesh,Vector3,Raycaster} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid} from '../src/engine/eiffelConvex';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

type Prism={id:string;vertices:V[]};
type Design={frame:Prism[];trolley:{startZ:number;endZ:number;railTop:number;wheelRadius:number;wheelAxisY:number}};
const folder='artifacts/eiffel-relay-winch-2026-09-08/';
const design=JSON.parse(readFileSync(folder+'design.json','utf8')) as Design;
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const;
const frame=design.frame.map(prism=>({id:prism.id,solid:eiffelConvexSolid(prism.vertices,faces)}));
async function load(){const bytes=readFileSync(folder+'model/relay-winch.glb');const scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;scene.updateMatrixWorld(true);return scene;}
function dispose(scene:Group){scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});}
const sweptBox=(bounds:Box3,dz:number)=>{const min=bounds.min.clone(),max=bounds.max.clone();if(dz<0)min.z+=dz;else max.z+=dz;const center=min.clone().add(max).multiplyScalar(.5),half=max.clone().sub(min).multiplyScalar(.5);return eiffelConvexBox({center:center.toArray() as V,half:half.toArray() as V,axes:[[1,0,0],[0,1,0],[0,0,1]]});};

describe('actual Eiffel relay winch asset',()=>{
 it('puts all four actual trolley wheel bottoms on the authored rail tops',async()=>{const scene=await load();try{const rails:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_source_id?.startsWith('trolley-rail'))rails.push(o);});expect(rails).toHaveLength(2);const wheels:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh&&o.name.startsWith('trolley-wheel'))wheels.push(o);});expect(wheels).toHaveLength(4);for(const wheel of wheels){const bounds=new Box3().setFromObject(wheel);const center=bounds.getCenter(new Vector3());const hits=new Raycaster(new Vector3(center.x,201.05,center.z),new Vector3(0,-1,0),0,.2).intersectObjects(rails,false);expect(hits.length).toBeGreaterThan(0);expect(bounds.min.y,wheel.name).toBeCloseTo(hits[0]!.point.y,4);expect(bounds.min.y,wheel.name).toBeCloseTo(design.trolley.railTop,4);expect((bounds.min.y+bounds.max.y)/2,wheel.name).toBeCloseTo(design.trolley.wheelAxisY,4);expect((bounds.max.y-bounds.min.y)/2,wheel.name).toBeCloseTo(design.trolley.wheelRadius,4);}}finally{dispose(scene);}},30_000);

 it('sweeps every actual trolley mesh across full travel without entering any frame prism',async()=>{const scene=await load();try{const trolley:Mesh[]=[];scene.traverse(o=>{if(o.userData.wf_role==='trolley')o.traverse(child=>{if(child instanceof Mesh)trolley.push(child);});});expect(trolley).toHaveLength(13);const dz=design.trolley.endZ-design.trolley.startZ,failures:string[]=[];for(const mesh of trolley){const moving=sweptBox(new Box3().setFromObject(mesh),dz);for(const obstacle of frame){const depth=eiffelConvexPenetration(moving,obstacle.solid);if(depth>1e-6)failures.push(`${mesh.name}:${obstacle.id}:${depth}`);}}expect(failures).toEqual([]);}finally{dispose(scene);}},30_000);

 it('contains the exported cargo in the authored 0.6 by 1.8 by 0.6 metre envelope',async()=>{const scene=await load();try{const cargo:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh&&o.name.startsWith('crate-'))cargo.push(o);});expect(cargo.length).toBeGreaterThan(0);const bounds=new Box3();cargo.forEach(mesh=>bounds.union(new Box3().setFromObject(mesh)));const size=bounds.getSize(new Vector3());expect(size.x).toBeLessThanOrEqual(.60001);expect(size.y).toBeCloseTo(1.8,4);expect(size.z).toBeCloseTo(.6,4);const center=bounds.getCenter(new Vector3());expect(center.x).toBeCloseTo(0,4);expect(center.y).toBeCloseTo(190.9,4);expect(center.z).toBeCloseTo(-1.8,4);}finally{dispose(scene);}},30_000);
});
