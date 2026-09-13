import {BatchedMesh,BufferAttribute,BufferGeometry,InterleavedBufferAttribute,Matrix4,type Material} from 'three';

/** Partition only: no vertex interpolation, decimation, or winding changes. */
export function batchEiffelTerrain(source:BufferGeometry,material:Material,partitionUV?:(vertex:number)=>readonly[number,number]):BatchedMesh{
 const uv=source.getAttribute('uv'),position=source.getAttribute('position'),index=source.index;
 if(!position||(!uv&&!partitionUV))throw Error('Terrain partition requires source position and grid coordinates');
 const coordinate=partitionUV??((v:number)=>[uv!.getX(v),uv!.getY(v)]as const);
 const cells=new Map<number,number[]>(),count=index?.count??position.count;
 for(let i=0;i<count;i+=3){
  const vertices=[0,1,2].map(k=>index?index.getX(i+k):i+k);
  const x=Math.max(0,Math.min(7,Math.floor(vertices.reduce((n,v)=>n+coordinate(v)[0],0)/3*8)));
  const y=Math.max(0,Math.min(7,Math.floor(vertices.reduce((n,v)=>n+coordinate(v)[1],0)/3*8)));
  const key=x+y*8,cell=cells.get(key)??[];cell.push(...vertices);cells.set(key,cell);
 }
 const batch=new BatchedMesh(cells.size,count,0,material),identity=new Matrix4();
 const metadata: {key:number;geometryId:number;triangles:number}[]=[];
 for(const[key,vertices]of cells){
  const geometry=new BufferGeometry();
  for(const[name,attribute]of Object.entries(source.attributes)){
   if(attribute instanceof InterleavedBufferAttribute)throw Error('Unexpected interleaved prepared terrain');
   const ArrayType=attribute.array.constructor as {new(length:number):typeof attribute.array};
   const array=new ArrayType(vertices.length*attribute.itemSize);
   for(let i=0;i<vertices.length;i++)for(let k=0;k<attribute.itemSize;k++)array[i*attribute.itemSize+k]=attribute.array[vertices[i]!*attribute.itemSize+k]!;
   geometry.setAttribute(name,new BufferAttribute(array,attribute.itemSize,attribute.normalized));
  }
  const geometryId=batch.addGeometry(geometry),id=batch.addInstance(geometryId);batch.setMatrixAt(id,identity);
  metadata.push({key,geometryId,triangles:vertices.length/3});geometry.dispose();
 }
 batch.name='eiffel-champ-floor';batch.receiveShadow=true;batch.frustumCulled=false;batch.perObjectFrustumCulled=true;batch.sortObjects=false;
 batch.userData.terrainCells=metadata;
 return batch;
}
