import { BatchedMesh, Color, InstancedMesh, Matrix4 } from 'three';

/** Same static instances, with individual bounds for renderer frustum rejection.
 * The caller retains ownership of the source geometry/material and disposes
 * the returned batch's packed resources separately. */
export function batchEiffelStaticScatter(source: InstancedMesh): BatchedMesh {
  if (Array.isArray(source.material)) throw Error('Static scatter requires one material');
  const geometry=source.geometry;
  const batch=new BatchedMesh(source.count,geometry.attributes.position!.count,geometry.index?.count??0,source.material);
  const geometryId=batch.addGeometry(geometry),matrix=new Matrix4(),color=new Color();
  for(let i=0;i<source.count;i++){
    const id=batch.addInstance(geometryId);
    source.getMatrixAt(i,matrix);batch.setMatrixAt(id,matrix);
    if(source.instanceColor){source.getColorAt(i,color);batch.setColorAt(id,color);}
  }
  batch.name=`${source.name||'eiffel-tree-trunks'}-culled`;
  batch.position.copy(source.position);batch.quaternion.copy(source.quaternion);batch.scale.copy(source.scale);
  batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;
  batch.frustumCulled=false;batch.perObjectFrustumCulled=true;batch.sortObjects=false;
  return batch;
}
