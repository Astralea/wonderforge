import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Matrix4, Mesh, type Group} from 'three';
import type {EiffelPoolPavingAudit} from '../../src/render/three/eiffelPoolPaving';

/** The preserved, reviewed thirty basin-intersection faces. Current offsets
 * are located by their actual Float32 triangle geometry, never by a new fixed
 * offset or by trusting the clipping implementation's own reported offsets. */
const bytes=readFileSync('artifacts/paris-street-variety-2026-09-08/before/paris-city.glb');
if(createHash('sha256').update(bytes).digest('hex')!=='0655c59d789822aead5703399199b9cc96afd22ca581d29ffb016d209da263ae')
 throw Error('Preserved Paris basin witness source changed');
type Accessor={bufferView:number;byteOffset?:number;componentType:number;type:string};
type Gltf={nodes:{extras?:{wf_material?:string};mesh?:number;matrix?:number[];translation?:number[];rotation?:number[];scale?:number[]}[];
 meshes:{primitives:{attributes:Record<string,number>;indices:number}[]}[];accessors:Accessor[];bufferViews:{byteOffset?:number;byteStride?:number}[]};
const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength)) as Gltf;
const binaryOffset=20+jsonLength+8,node=gltf.nodes.find(n=>n.extras?.wf_material==='paving')!;
if(node.mesh===undefined||node.matrix||node.translation||node.rotation||node.scale)throw Error('Basin witness requires the saved world-coordinate source');
const primitive=gltf.meshes[node.mesh]!.primitives[0]!;
function read(accessorId:number,index:number,component=0){
 const a=gltf.accessors[accessorId]!,view=gltf.bufferViews[a.bufferView]!;
 const size=a.componentType===5123?2:4,count=a.type==='VEC3'?3:a.type==='VEC2'?2:1;
 const offset=binaryOffset+(view.byteOffset??0)+(a.byteOffset??0)+index*(view.byteStride??size*count)+component*size;
 return a.componentType===5126?bytes.readFloatLE(offset):a.componentType===5123?bytes.readUInt16LE(offset):bytes.readUInt32LE(offset);
}
const key=(corners:number[][])=>[0,1,2].map(k=>corners.slice(k).concat(corners.slice(0,k)).map(p=>p.map(Math.fround).join(',')).join('|')).sort()[0]!;
const witness=new Set(Array.from({length:30},(_,i)=>key([0,1,2].map(k=>{
 const index=read(primitive.indices,35760+i*3+k);
 return [0,1,2].map(c=>read(primitive.attributes.POSITION!,index,c));
}))));
if(witness.size!==30)throw Error('Basin witness faces are not unique');

export function parisBasinWitness(source:Group):EiffelPoolPavingAudit {
 const meshes:Mesh[]=[];source.traverse(o=>{if(o instanceof Mesh&&o.userData.wf_material==='paving')meshes.push(o);});
 if(meshes.length!==1)throw Error('Expected one tagged source paving mesh');
 const mesh=meshes[0]!;if(!mesh.matrixWorld.equals(new Matrix4()))throw Error('Source paving is no longer in saved world coordinates');
 const position=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,count=index?.count??position.count;
 const affected:number[]=[],matched=new Set<string>();
 for(let offset=0;offset<count;offset+=3){
  const k=key([0,1,2].map(c=>{const i=index?index.getX(offset+c):offset+c;return[position.getX(i),position.getY(i),position.getZ(i)];}));
  if(witness.has(k)){affected.push(offset);matched.add(k);}
 }
 if(affected.length!==30||matched.size!==30)throw Error(`Actual basin input geometry changed: ${affected.length} faces, ${matched.size} distinct witnesses`);
 return {sourceMesh:mesh.name,sourceTriangles:count/3,removedTriangles:18,splitTriangles:12,replacementTriangles:18,
  untouchedTriangles:count/3-30,removedArea:194,affectedTriangleOffsets:affected};
}
