import {readFileSync} from 'node:fs';
import {Box3,BufferAttribute,Mesh,Object3D,Raycaster,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,expect,it} from 'vitest';
import {eiffelConvexBox,eiffelConvexPenetration,eiffelConvexSolid,eiffelConvexTranslationSweep,type EiffelConvexSolid} from '../src/engine/eiffelConvex';
import {eiffelDiagonalRigAt,EIFFEL_DIAGONAL_LENGTH as L} from '../src/engine/eiffelDiagonalRig';
import {rotateRigidVector,type RigidVec3 as V} from '../src/engine/eiffelRigid';
import {sampleEiffelThreeFloorSupply} from '../src/engine/eiffelThreeFloorSupply';

type Prism={id:string;vertices:V[]};
const receiver=JSON.parse(readFileSync('artifacts/eiffel-diagonal-receiver-2026-09-08/design.json','utf8')) as {direction:[number,number];lateral:[number,number];shapes:Prism[]};
const winch=JSON.parse(readFileSync('artifacts/eiffel-diagonal-winch-2026-09-08/design.json','utf8')) as {shapes:Prism[]};
const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]] as const,[dx,dz]=receiver.direction,[nx,nz]=receiver.lateral;
const load=async(path:string)=>{const bytes=readFileSync(path);return(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;};
const dispose=(root:Object3D)=>root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});
const prism=(p:Prism)=>eiffelConvexSolid(p.vertices,faces);
const overlaps=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>!a.min.some((v,k)=>v>b.max[k]!||a.max[k]!<b.min[k]!);
const depth=(a:EiffelConvexSolid,b:EiffelConvexSolid)=>overlaps(a,b)?eiffelConvexPenetration(a,b):0;
const axisBox=(mesh:Mesh,offset:V=[0,0,0])=>{const b=new Box3().setFromObject(mesh),c=b.getCenter(new Vector3()),s=b.getSize(new Vector3());return eiffelConvexBox({center:[c.x+offset[0],c.y+offset[1],c.z+offset[2]],half:[s.x/2,s.y/2,s.z/2],axes:[[1,0,0],[0,1,0],[0,0,1]]});};
const routeBox=(mesh:Mesh)=>{const a=mesh.geometry.getAttribute('position') as BufferAttribute,values:{u:number;y:number;n:number}[]=[];for(let i=0;i<a.count;i++){const p=new Vector3(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(mesh.matrixWorld);values.push({u:p.x*dx+p.z*dz,y:p.y,n:p.x*nx+p.z*nz});}const range=(k:'u'|'y'|'n')=>[Math.min(...values.map(v=>v[k])),Math.max(...values.map(v=>v[k]))],u=range('u'),y=range('y'),n=range('n'),cu=(u[0]+u[1])/2,cn=(n[0]+n[1])/2;return eiffelConvexBox({center:[cu*dx+cn*nx,(y[0]+y[1])/2,cu*dz+cn*nz],half:[(u[1]-u[0])/2,(y[1]-y[0])/2,(n[1]-n[0])/2],axes:[[dx,0,dz],[0,1,0],[nx,0,nz]]});};
const workerBox=(part:ReturnType<typeof sampleEiffelThreeFloorSupply>['secondWorker']['parts'][number])=>eiffelConvexBox({center:part.center,half:[part.size[0]/2,part.size[1]/2,part.size[2]/2],axes:[rotateRigidVector(part.quaternion,[1,0,0]),rotateRigidVector(part.quaternion,[0,1,0]),rotateRigidVector(part.quaternion,[0,0,1])]});

describe('Eiffel three-floor second-cart clearance',()=>{
 it('keeps the regripping worker and forward cart clear of final receiver fixtures and parked rope',async()=>{const [cartAsset,receiverAsset,winchAsset,trolleyAsset]=await Promise.all([load('artifacts/eiffel-second-floor-supply-2026-09-08/model/second-floor-bridge.glb'),load('artifacts/eiffel-diagonal-receiver-2026-09-08/model/diagonal-receiver-frame.glb'),load('artifacts/eiffel-diagonal-winch-2026-09-08/model/diagonal-winch.glb'),load('artifacts/eiffel-diagonal-trolley-2026-09-08/model/diagonal-trolley.glb')]);try{
   cartAsset.updateMatrixWorld(true);receiverAsset.updateMatrixWorld(true);winchAsset.updateMatrixWorld(true);trolleyAsset.position.set(dx*(L+.25),0,dz*(L+.25));trolleyAsset.updateMatrixWorld(true);
   const carts:Mesh[]=[],actualReceiver:Mesh[]=[],actualWinch:Mesh[]=[],actualTrolley:Mesh[]=[];cartAsset.traverse(o=>{if(o instanceof Mesh&&!String(o.userData.wf_role).startsWith('bridge-'))carts.push(o);});receiverAsset.traverse(o=>{if(o instanceof Mesh)actualReceiver.push(o);});winchAsset.traverse(o=>{if(o instanceof Mesh)actualWinch.push(o);});trolleyAsset.traverse(o=>{if(o instanceof Mesh)actualTrolley.push(o);});
   expect(carts).toHaveLength(16);expect(actualReceiver).toHaveLength(17);expect(actualWinch).toHaveLength(18);expect(actualTrolley).toHaveLength(17);
   const fixtures=[...receiver.shapes.map(p=>({id:`receiver-source:${p.id}`,solid:prism(p)})),...winch.shapes.map(p=>({id:`winch-source:${p.id}`,solid:prism(p)})),...actualReceiver.map(m=>({id:`receiver-actual:${m.name}`,solid:routeBox(m)})),...actualWinch.filter(m=>!m.userData.wf_source_id).map(m=>({id:`winch-hardware:${m.name}`,solid:routeBox(m)})),...actualTrolley.map(m=>({id:`parked-trolley:${m.name}`,solid:routeBox(m)}))];
   const parked=eiffelDiagonalRigAt(L,117.98).rope,ropes=parked.slice(1).map((b,i)=>({id:`parked-rope:${i}`,solid:eiffelConvexTranslationSweep(eiffelConvexBox({center:parked[i]!,half:[.008,.008,.008],axes:[[1,0,0],[0,1,0],[0,0,1]]}),[b[0]-parked[i]![0],b[1]-parked[i]![1],b[2]-parked[i]![2]])}));
   const failures:string[]=[];let gripSamples=0,forwardSamples=0;
   for(let step=0;step<=540;step++){const seconds=302+step*.05,sample=sampleEiffelThreeFloorSupply(seconds),offset:V=[sample.secondCart[0]+15,0,0],moving=[...carts.map(m=>({id:`cart:${m.name}`,solid:axisBox(m,offset)})),{id:'cargo',solid:eiffelConvexBox({center:sample.worldCargo,half:[.3,.9,.3],axes:[[1,0,0],[0,1,0],[0,0,1]]})},...sample.secondWorker.parts.map(p=>({id:`worker:${p.id}`,solid:workerBox(p)}))];if(seconds<306)gripSamples++;else forwardSamples++;for(const item of moving){for(const fixed of fixtures){const overlap=depth(item.solid,fixed.solid);if(overlap>1e-6)failures.push(`${seconds.toFixed(2)}:${item.id}:${fixed.id}:${overlap}`);}for(const rope of ropes){const overlap=depth(item.solid,rope.solid);if(overlap>1e-6)failures.push(`${seconds.toFixed(2)}:${item.id}:${rope.id}:${overlap}`);}}}
   expect(gripSamples).toBe(80);expect(forwardSamples).toBe(461);expect(failures).toEqual([]);
  }finally{dispose(cartAsset);dispose(receiverAsset);dispose(winchAsset);dispose(trolleyAsset);}},30_000);

 it('seats the orientation-preserved original cargo on actual 197 m platform triangles',async()=>{const [rig,platform]=await Promise.all([load('artifacts/eiffel-first-floor-winch-2026-09-08/model/first-floor-winch.glb'),load('artifacts/eiffel-relay-platform-2026-09-08/model/platform.glb')]);try{
   let found:Object3D|undefined;rig.traverse(o=>{if(o.userData.wf_role==='cargo')found=o;});expect(found).toBeDefined();const original=found!;expect(original.parent).toBeDefined();rig.updateMatrixWorld(true);const before=original.quaternion.clone();original.position.copy(original.parent!.worldToLocal(new Vector3(0,197.9,-3.6)));expect(original.quaternion.equals(before)).toBe(true);rig.updateMatrixWorld(true);platform.updateMatrixWorld(true);
   const points:Vector3[]=[];original.traverse(o=>{if(!(o instanceof Mesh))return;const a=o.geometry.getAttribute('position') as BufferAttribute;for(let i=0;i<a.count;i++){const p=new Vector3(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(o.matrixWorld);if(!points.some(q=>q.distanceTo(p)<1e-6))points.push(p);}});const bottom=Math.min(...points.map(p=>p.y)),bottomBand=points.filter(p=>Math.abs(p.y-bottom)<2e-5);expect(bottom).toBeCloseTo(197,4);expect(bottomBand).toHaveLength(8);
   const decks:Mesh[]=[];platform.traverse(o=>{if(o instanceof Mesh)decks.push(o);});const ray=new Raycaster(),failures:string[]=[];for(const [i,p] of bottomBand.entries()){ray.set(new Vector3(p.x,p.y+.15,p.z),new Vector3(0,-1,0));const hit=ray.intersectObjects(decks,false).find(h=>h.point.y<=p.y+1e-5);if(!hit||Math.abs(hit.point.y-p.y)>2e-5)failures.push(`${i}:${p.toArray()}:${hit?.point.y??'miss'}`);}expect(failures).toEqual([]);
  }finally{dispose(rig);dispose(platform);}},30_000);
});
