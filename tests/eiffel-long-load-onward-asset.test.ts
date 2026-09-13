import { readFileSync } from 'node:fs';
import { Box3, DoubleSide, Mesh, Raycaster, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import design from '../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
const folder='artifacts/eiffel-long-load-onward-2026-09-08/model/';
async function load(path:string){const b=readFileSync(path);const root=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;root.updateMatrixWorld(true);return root;}
function role(root:Object3D,id:string){let result:Object3D|undefined;root.traverse(o=>{if(o.userData.wf_role===id)result=o;});if(!result)throw Error(`Missing ${id}`);return result;}
function vertices(root:Object3D){const a:number[]=[];root.traverse(o=>{if(o instanceof Mesh){const p=o.geometry.attributes.position!;for(let i=0;i<p.count;i++)a.push(...new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).toArray());}});return a;}
function dispose(root:Object3D){root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
describe('actual onward Blender geometry',()=>{
 it('preserves all thirteen retained sling meshes exactly and replaces only the upper eye',async()=>{
  const [before,after]=await Promise.all([load('artifacts/eiffel-closed-sling-2026-09-08/model/closed-sling.glb'),load(folder+'closed-sling.glb')]);
  try{const ids=['master-link',...Array.from({length:4},(_,i)=>[`lower-rope-eye-${i}`,`sling-leg-${i}`,`carrier-rope-eye-${i}`]).flat()];for(const id of ids)expect(vertices(role(after,id))).toEqual(vertices(role(before,id)));expect(()=>role(after,'upper-rope-eye')).toThrow();}finally{dispose(before);dispose(after);}
 });
 it('exports fixed-size worker parts, a supported sling saddle and a captive withdrawn pin',async()=>{
  const root=await load(folder+'onward.glb');
  try{
   for(const prefix of design.workers.prefixes)for(const p of design.workers.parts){const size=new Box3().setFromObject(role(root,prefix+'-'+p.id)).getSize(new Vector3());for(let i=0;i<3;i++)expect(size.getComponent(i)).toBeCloseTo(p.size[i]!,5);}
   const saddle=role(root,'sling-parking-saddle'),sb=new Box3().setFromObject(saddle);expect(sb.min.y).toBeCloseTo(design.floorY+.34+design.saddle.bottomY,4);
   const head=role(root,'opening-clevis'),pin=role(root,'clevis-pin');expect(pin.parent).toBe(head);pin.position.toArray().forEach((v,i)=>expect(v).toBeCloseTo(design.clevis.pinCenter[i]!,5));
   pin.position.z+=design.clevis.pinWithdrawal;root.updateMatrixWorld(true);const b=new Box3().setFromObject(pin);expect(b.min.z).toBeCloseTo(-4+.042,5);expect(b.max.z).toBeLessThan(-4+.141);
   const keeper=role(root,'clevis-keeper');expect(keeper.parent).toBe(head);keeper.position.toArray().forEach((v,i)=>expect(v).toBeCloseTo(design.clevis.keeperPivot[i]!,5));
  }finally{dispose(root);}
 });
 it('has actual four clear bores through the stock cart bed and underside spreader',async()=>{
  const root=await load(folder+'bridge.glb');
  try{const cart=role(root,'stock-cart'),targets:Mesh[]=[];cart.traverse(o=>{if(o instanceof Mesh&&(o.name.startsWith('cart-bed')||o.name.startsWith('underside-spreader'))){targets.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});expect(targets.length).toBe(2);
   for(const[x,z]of design.bolts.pointsXZ){const ray=new Raycaster(new Vector3(-21.5+x!,design.floorY+.5,-4+z!),new Vector3(0,-1,0),0,.35);expect(ray.intersectObjects(targets,false)).toEqual([]);}
   const solid=new Raycaster(new Vector3(-21.5+.28,design.floorY+.5,-4+.28),new Vector3(0,-1,0),0,.35);expect(solid.intersectObjects(targets,false).length).toBeGreaterThan(0);
  }finally{dispose(root);}
 });
 it('touches the actual ring with the loaded pin and saddle, then clears the ring before cart motion',async()=>{
  const [addon,sling]=await Promise.all([load(folder+'onward.glb'),load(folder+'closed-sling.glb')]);
  try{
   const masterY=design.floorY+.34+design.masterOffset[1]!;sling.position.set(-21.5,masterY,-4);sling.updateMatrixWorld(true);
   const ring=role(sling,'master-link') as Mesh;for(const m of Array.isArray(ring.material)?ring.material:[ring.material])m.side=DoubleSide;
   const innerTop=new Raycaster(new Vector3(-21.5,masterY,-4),new Vector3(0,1,0)).intersectObject(ring,false)[0]!.point.y;
   const outerBottom=new Raycaster(new Vector3(-21.5,masterY-.25,-4),new Vector3(0,1,0)).intersectObject(ring,false)[0]!.point.y;
   const meshes:Mesh[]=[];addon.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
   const shaft=meshes.find(o=>o.name.startsWith('clevis-pin-shaft'))!,pad=meshes.find(o=>o.name.startsWith('saddle-pad'))!;
   expect(new Box3().setFromObject(shaft).max.y).toBeCloseTo(innerTop,4);
   expect(new Box3().setFromObject(pad).max.y).toBeCloseTo(outerBottom,4);
   const head=role(addon,'opening-clevis');head.position.y-=design.clevis.unloadDrop;addon.updateMatrixWorld(true);
   expect(innerTop-new Box3().setFromObject(shaft).max.y).toBeGreaterThan(.00198);
   role(addon,'clevis-pin').position.z+=design.clevis.pinWithdrawal;
   head.position.y+=design.clevis.retraction;addon.updateMatrixWorld(true);
   expect(new Box3().setFromObject(head).min.y-new Box3().setFromObject(ring).max.y).toBeGreaterThan(.0699);
  }finally{dispose(addon);dispose(sling);}
 });
 it('keeps mobile crew dimensions, upper hardware and actual master-ring contact extrema',async()=>{
  const [full,low,ringFull,ringLow]=await Promise.all([load(folder+'onward.glb'),load(folder+'onward-mobile.glb'),load(folder+'closed-sling.glb'),load(folder+'closed-sling-mobile.glb')]);
  try{
   for(const prefix of design.workers.prefixes)for(const part of design.workers.parts){const box=new Box3().setFromObject(role(low,`${prefix}-${part.id}`));box.getSize(new Vector3()).toArray().forEach((v,i)=>expect(v).toBeCloseTo(part.size[i]!,5));}
   for(const id of['opening-clevis','sling-parking-saddle','cart-chock','hatch-handle'])expect(vertices(role(low,id))).toEqual(vertices(role(full,id)));
   const a=new Box3().setFromObject(role(ringFull,'master-link')),b=new Box3().setFromObject(role(ringLow,'master-link'));expect(b.min.toArray()).toEqual(a.min.toArray());expect(b.max.toArray()).toEqual(a.max.toArray());
   for(const mesh of[role(ringFull,'master-link'),role(ringLow,'master-link')]as Mesh[]){for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.side=DoubleSide;const hit=new Raycaster(new Vector3(),new Vector3(0,1,0)).intersectObject(mesh,false)[0]!;expect(hit.point.y).toBeCloseTo(.112,6);}
  }finally{[full,low,ringFull,ringLow].forEach(dispose);}
 });
 it('partitions mobile fixed iron without changing triangles and coalesces only the coplanar fixed floor',async()=>{
  const [full,low]=await Promise.all([load(folder+'bridge.glb'),load(folder+'bridge-mobile.glb')]);
  const triangleCorners=(root:Object3D)=>{const corners:string[]=[];root.traverse(o=>{if(o instanceof Mesh){const p=o.geometry.attributes.position!,idx=o.geometry.index;for(let i=0;i<(idx?.count??p.count);i++)corners.push(new Vector3().fromBufferAttribute(p,idx?.getX(i)??i).applyMatrix4(o.matrixWorld).toArray().map(v=>v.toFixed(5)).join(','));}});return corners.sort();};
  try{
   expect(triangleCorners(role(low,'bridge-iron'))).toEqual(triangleCorners(role(full,'bridge-iron')));
   expect(triangleCorners(role(low,'stock-cart'))).toEqual(triangleCorners(role(full,'stock-cart')));
   expect(triangleCorners(role(low,'freight-hatch'))).toEqual(triangleCorners(role(full,'freight-hatch')));
   const a=role(full,'bridge-timber'),b=role(low,'bridge-timber');const floorBox=new Box3().setFromObject(a),coalesced=new Box3().setFromObject(b);
   expect(coalesced.min.toArray()).toEqual(floorBox.min.toArray());expect(coalesced.max.toArray()).toEqual(floorBox.max.toArray());
   const surfaces=[a,b].map(root=>{const ms:Mesh[]=[];root.traverse(o=>{if(o instanceof Mesh)ms.push(o);});return ms;});
   for(let x=-19.25;x<20.25;x+=.10)for(const z of[-4.89,-4,-3.11]){
    const ray=new Raycaster(new Vector3(x,design.floorY+.05,z),new Vector3(0,-1,0));
    for(const ms of surfaces){const hit=ray.intersectObjects(ms,false)[0];expect(hit).toBeDefined();expect(hit!.point.y).toBeCloseTo(design.floorY,4);}
   }
  }finally{dispose(full);dispose(low);}
 });
});
