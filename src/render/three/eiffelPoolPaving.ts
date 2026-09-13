import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, Vector3, type Group } from 'three';
import { EIFFEL_EXPO_POOL_PLANS } from '../../engine/eiffelExpoPools';

type Vertex = { p: Vector3; weight: number[] };
export interface EiffelPoolPavingAudit {
 sourceMesh: string; sourceTriangles: number; removedTriangles: number;
 splitTriangles: number; replacementTriangles: number; untouchedTriangles: number;
 removedArea: number; affectedTriangleOffsets: number[];
}

/** Excise only paving lying inside the existing outer coping rectangles.
 * Other Paris geometry, including the architectural filter's inputs, is untouched.
 */
export function clipEiffelPoolPaving(source: Group): EiffelPoolPavingAudit[] {
 const audits: EiffelPoolPavingAudit[] = []; source.updateMatrixWorld(true);
 source.traverse(object => {
  if (!(object instanceof Mesh) || object.userData.wf_paris !== true || object.userData.wf_material !== 'paving') return;
  const geometry: BufferGeometry = object.geometry;
  const index = geometry.index, position = geometry.getAttribute('position');
  const attributes = Object.entries(geometry.attributes), output = Object.fromEntries(attributes.map(([name]) => [name, [] as number[]]));
  const inverse = new Matrix4().copy(object.matrixWorld).invert();
  const audit: EiffelPoolPavingAudit = {sourceMesh: object.name, sourceTriangles: (index?.count ?? position.count) / 3,
   removedTriangles: 0, splitTriangles: 0, replacementTriangles: 0, untouchedTriangles: 0, removedArea: 0, affectedTriangleOffsets: []};
  const split = (polygon: Vertex[], axis: 'x' | 'z', bound: number, sign: number) => {
   const inside: Vertex[] = [], outside: Vertex[] = [];
   for (let i=0;i<polygon.length;i++) {
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=(a.p[axis]-bound)*sign,db=(b.p[axis]-bound)*sign;
    if (da>=0) inside.push(a); if (da<=0) outside.push(a);
    if (da*db<0) {const t=da/(da-db),v={p:a.p.clone().lerp(b.p,t),weight:a.weight.map((v,k)=>v+(b.weight[k]!-v)*t)};v.p[axis]=bound;inside.push(v);outside.push(v);}
   }
   return {inside,outside};
  };
  const area = (polygon:Vertex[]) => {let value=0;for(let i=0;i<polygon.length;i++){const a=polygon[i]!.p,b=polygon[(i+1)%polygon.length]!.p;value+=a.x*b.z-b.x*a.z;}return Math.abs(value)/2;};
  for (let offset=0;offset<(index?.count??position.count);offset+=3) {
   const ids=[0,1,2].map(k=>index?index.getX(offset+k):offset+k);
   const original: Vertex[]=ids.map((id,k)=>({p:new Vector3().fromBufferAttribute(position,id).applyMatrix4(object.matrixWorld),weight:[0,1,2].map(i=>i===k?1:0)}));
   const pool=EIFFEL_EXPO_POOL_PLANS.find(pool=>Math.max(...original.map(v=>v.p.x))>pool.x-pool.width/2-.7&&Math.min(...original.map(v=>v.p.x))<pool.x+pool.width/2+.7&&Math.max(...original.map(v=>v.p.z))>pool.z-pool.length/2-.7&&Math.min(...original.map(v=>v.p.z))<pool.z+pool.length/2+.7);
   let inside=original;const pieces:Vertex[][]=[];
   if(pool)for(const[axis,bound,sign]of[['x',pool.x-pool.width/2-.7,1],['x',pool.x+pool.width/2+.7,-1],['z',pool.z-pool.length/2-.7,1],['z',pool.z+pool.length/2+.7,-1]]as const){const part=split(inside,axis,bound,sign);if(area(part.outside)>1e-9)pieces.push(part.outside);inside=part.inside;}
   const removed=pool?area(inside):0;
   if(removed<1e-9){
    audit.untouchedTriangles++;
    for(const[name,attribute]of attributes)for(const id of ids)for(let k=0;k<attribute.itemSize;k++)output[name]!.push(attribute.getComponent(id,k));
    continue;
   }
   audit.removedArea+=removed;audit.affectedTriangleOffsets.push(offset);
   if(!pieces.length)audit.removedTriangles++;else audit.splitTriangles++;
   for(const polygon of pieces)for(let i=1;i+1<polygon.length;i++){
    const tri=[polygon[0]!,polygon[i]!,polygon[i+1]!];if(area(tri)<1e-9)continue;
    audit.replacementTriangles++;
    for(const vertex of tri)for(const[name,attribute]of attributes){
     if(name==='position'){output[name]!.push(...vertex.p.clone().applyMatrix4(inverse).toArray());continue;}
     for(let k=0;k<attribute.itemSize;k++)output[name]!.push(ids.reduce((sum,id,j)=>sum+attribute.getComponent(id,k)*vertex.weight[j]!,0));
    }
   }
  }
  if(audit.affectedTriangleOffsets.length){
   const clipped=new BufferGeometry();for(const[name,attribute]of attributes)clipped.setAttribute(name,new Float32BufferAttribute(output[name]!,attribute.itemSize));
   object.geometry=clipped;geometry.dispose();audits.push(audit);
  }
 });
 return audits;
}
