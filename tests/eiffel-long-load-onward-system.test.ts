import { afterEach, expect, it, vi } from 'vitest';
import { BatchedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { EiffelLongLoadOnwardSystem } from '../src/render/three/EiffelLongLoadOnwardSystem';

const systems:EiffelLongLoadOnwardSystem[]=[];
afterEach(()=>{systems.forEach(s=>s.dispose());systems.length=0;vi.restoreAllMocks();});
const fixture=()=>{const model={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'root',translation:[10,2,3],children:[1]},{name:'rigger',translation:[1,2,3],rotation:[0,0,Math.sin(.2),Math.cos(.2)],extras:{wf_role:'rigger'},children:[2]},{name:'arm',translation:[0,1,0],rotation:[Math.sin(.3),0,0,Math.cos(.3)],mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.4,.3,.2,1]}}],buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}]};const json=Buffer.from(JSON.stringify(model)),jsonLength=Math.ceil(json.length/4)*4,bin=Buffer.from(new Float32Array([0,0,0,1,0,0,0,1,0]).buffer),out=Buffer.alloc(12+8+jsonLength+8+bin.length,32);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jsonLength,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);out.writeUInt32LE(bin.length,20+jsonLength);out.writeUInt32LE(0x004e4942,24+jsonLength);bin.copy(out,28+jsonLength);return out;};
const install=(deferred?:Promise<Response>)=>{const fetchOriginal=globalThis.fetch;vi.spyOn(globalThis,'fetch').mockImplementation((input,init)=>String(input)==='/onward-fixture.glb'?(deferred??Promise.resolve(new Response(fixture()))):fetchOriginal(input,init));};
const create=()=>{const s=new EiffelLongLoadOnwardSystem('/onward-fixture.glb',['rigger']);systems.push(s);return s;};

it('preserves exported child rotations, exact geometry and actual batch poses across forward/reverse updates',async()=>{
 install();const s=create();s.update({seconds:150,roles:[{role:'rigger',position:[4,5,6]}]});await s.ready;
 const source=s.group.getObjectByName('arm') as Mesh,role=s.group.getObjectByName('rigger')!,original=source.quaternion.clone();
 const internals=s as unknown as {batches:{mesh:BatchedMesh;sources:{mesh:Mesh;id:number}[]}[]};
 expect(s.group.userData.sourceTriangles).toBe(1);expect(s.group.userData.sourceMeshCount).toBe(1);expect(source.geometry.attributes.position!.count).toBe(3);
 for(const seconds of[150,220,150,0]){
  const pose=seconds===0?[]:[{role:'rigger',position:[4,5,6] as const,quaternion:[0,Math.sin(.4),0,Math.cos(.4)] as const}];s.update({seconds,roles:pose});
  expect(source.quaternion.toArray()).toEqual(original.toArray());expect(role.scale.toArray()).toEqual([1,1,1]);
  expect(role.position.toArray()).toEqual(seconds===0?[1,2,3]:[4,5,6]);
  expect(role.quaternion.angleTo(seconds===0?new Quaternion(0,0,Math.sin(.2),Math.cos(.2)):new Quaternion(0,Math.sin(.4),0,Math.cos(.4)))).toBeLessThan(1e-7);
  for(const b of internals.batches)for(const entry of b.sources){expect(b.mesh.frustumCulled).toBe(false);expect(b.mesh.perObjectFrustumCulled).toBe(true);const actual=b.mesh.getMatrixAt(entry.id,new Matrix4()).premultiply(b.mesh.matrixWorld);actual.elements.forEach((x,i)=>expect(x).toBeCloseTo(entry.mesh.matrixWorld.elements[i]!,5));}
 }
 expect(()=>s.update({seconds:0,roles:[{role:'missing',position:[0,0,0]}]})).toThrow('Unknown onward pose role');
});

it('does not attach assets after early disposal and releases completed GPU resources only once',async()=>{
 let resolve!:(r:Response)=>void;install(new Promise(r=>{resolve=r}));const early=create();early.dispose();resolve(new Response(fixture()));await early.ready;expect(early.group.children).toHaveLength(0);
 vi.restoreAllMocks();install();const s=create();await s.ready;const resources=new Set<{dispose():void}>();s.group.traverse(o=>{if(o instanceof BatchedMesh)resources.add(o);else if(o instanceof Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);}});const spies=[...resources].map(r=>vi.spyOn(r,'dispose'));s.dispose();s.dispose();s.update({seconds:222,roles:[]});spies.forEach(spy=>expect(spy).toHaveBeenCalledOnce());expect(s.group.children).toHaveLength(0);
});

it('loads the actual Blender addon and keeps the withdrawn pin local to its moving clevis',async()=>{
 const s=new EiffelLongLoadOnwardSystem('/models/eiffel-long-load-first-floor/onward.glb',['opening-clevis','clevis-pin','clevis-keeper']);systems.push(s);await s.ready;
 const find=(name:string)=>{let result:import('three').Object3D|undefined;s.group.traverse(o=>{if(o.userData.wf_role===name)result=o;});if(!result)throw Error(name);return result;};
 const clevis=find('opening-clevis'),pin=find('clevis-pin'),keeper=find('clevis-keeper');
 expect(pin.parent).toBe(clevis);expect(keeper.parent).toBe(clevis);
 for(const z of[0,.084,0]){
  s.update({seconds:z?180:128,roles:[{role:'opening-clevis',position:[-21.5,65.16250274658203,-4]},{role:'clevis-pin',position:[0,.104,z]},{role:'clevis-keeper',position:[.028,.104,.058],quaternion:[0,Math.sin(z?Math.PI/4:0),0,Math.cos(z?Math.PI/4:0)]}]});
  const actual=pin.getWorldPosition(new Vector3());expect(actual.x).toBeCloseTo(-21.5,8);expect(actual.y).toBeCloseTo(65.26650274658203,8);expect(actual.z).toBeCloseTo(-4+z,8);expect(pin.scale.toArray()).toEqual([1,1,1]);
 }
 expect(s.group.userData.sourceTriangles).toBeGreaterThan(1000);expect(s.group.userData.batchCount).toBeLessThanOrEqual(6);
});
