import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh,Vector3} from 'three';
type Prism={id:string;vertices:number[][]};
type Unit={id:string;kind:string;prisms:Prism[];productionReady:boolean};
const folder='artifacts/eiffel-relay-platform-2026-09-08/';
const source=JSON.parse(readFileSync(folder+'platform-occupancy.json','utf8')) as Prism[];
const units=JSON.parse(readFileSync(folder+'platform-units.json','utf8')).units as Unit[];
const volume=(p:Prism)=>{const v=p.vertices.map(x=>new Vector3(...x as [number,number,number]));return Math.abs(v[4]!.clone().sub(v[0]!).dot(v[2]!.clone().sub(v[0]!).cross(v[1]!.clone().sub(v[0]!))));};
describe('relay rigid transport partitions',()=>{
 it('preserves each source prism volume and never admits unsupported construction',()=>{
  expect(units).toHaveLength(296);expect(new Set(units.map(u=>u.id)).size).toBe(296);
  expect(units.filter(u=>u.kind==='board')).toHaveLength(150);
  expect(units.filter(u=>u.kind==='girder')).toHaveLength(22);
  for(const s of source){const pieces=units.flatMap(u=>u.prisms).filter(p=>p.id===s.id);expect(pieces.length).toBeGreaterThan(0);expect(pieces.reduce((n,p)=>n+volume(p),0)).toBeCloseTo(volume(s),8);}
  for(const u of units){expect(u.productionReady).toBe(false);if(u.kind==='girder'){expect(u.prisms).toHaveLength(3);const axis=u.id.startsWith('x-')?0:2;const coords=u.prisms.flatMap(p=>p.vertices.map(v=>v[axis]!));expect(Math.max(...coords)-Math.min(...coords)).toBeLessThanOrEqual(4.5);}}
 });
 it('places every internal board end joint on an existing joist',()=>{
  for(const u of units.filter(u=>u.kind==='board')){
   const axis=u.id.startsWith('deck-z')?0:2;
   const coords=u.prisms[0]!.vertices.map(v=>v[axis]!);
   for(const seam of [Math.min(...coords),Math.max(...coords)]){
    if(Math.abs(Math.abs(seam)-(axis===0?6.4:3.1))<1e-8)continue;
    const joists=source.filter(p=>p.id.startsWith(axis===0?'joist-z':'joist-x'));
    expect(joists.some(p=>Math.min(...p.vertices.map(v=>v[axis]!))<seam&&Math.max(...p.vertices.map(v=>v[axis]!))>seam)).toBe(true);
   }
  }
 });
 it('exports every unit as an independent mesh with its exact final world-space corners',async()=>{
  const b=readFileSync(folder+'model/platform-units.glb');const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;scene.updateMatrixWorld(true);
  const meshes:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
  try{expect(meshes).toHaveLength(296);
   for(const u of units){const m=meshes.find(m=>m.userData.wf_unit_id===u.id);expect(m).toBeDefined();expect(m!.userData.wf_production_ready).toBe(false);
    const a=m!.geometry.getAttribute('position');const actual=Array.from({length:a.count},(_,i)=>new Vector3().fromBufferAttribute(a,i).applyMatrix4(m!.matrixWorld));
    const expected=u.prisms.flatMap(p=>p.vertices).map(v=>new Vector3(...v as [number,number,number]));
    for(const p of expected)expect(Math.min(...actual.map(v=>v.distanceTo(p)))).toBeLessThan(.00005);
    for(const p of actual)expect(Math.min(...expected.map(v=>v.distanceTo(p)))).toBeLessThan(.00005);
   }
  }finally{for(const m of meshes){m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}}
 });
});
