import {describe,it,expect} from 'vitest';
import {InstancedMesh,Matrix4,Vector3} from 'three';
import {sampleEiffelCrane} from '../src/engine/eiffelCrane';
import {EiffelCraneRig} from '../src/render/three/EiffelCraneRig';

describe('authored compact terrace crane bearing',()=>{
 it('renders the compact pad and all four guy feet on its actual upper surface',()=>{
  const base=[-3,280.5899963378906,-6.4] as const;
  const sample=sampleEiffelCrane({base,mastHeight:22,boomLength:8.4,supportPadSize:[3.4,.3,2.2]},
   {position:[-6.47,282,0],quaternion:[0,0,0,1]},[[0,.09,-1],[0,.09,1]]);
  const rig=new EiffelCraneRig();rig.update(sample);
  try{
   const wood=rig.group.getObjectByName('eiffel-crane-wood') as InstancedMesh;
   const m=new Matrix4();wood.getMatrixAt(0,m);
   for(const x of[-.5,.5])for(const z of[-.5,.5]){
    const bottom=new Vector3(x,-.5,z).applyMatrix4(m);
    expect(bottom.y).toBeCloseTo(base[1],4);
    expect(Math.abs(bottom.x-base[0])).toBeCloseTo(1.7,5);
    expect(Math.abs(bottom.z-base[2])).toBeCloseTo(1.1,5);
   }
   const iron=rig.group.getObjectByName('eiffel-crane-iron') as InstancedMesh;
   for(let i=iron.count-4;i<iron.count;i++){
    iron.getMatrixAt(i,m);const foot=new Vector3(0,-.5,0).applyMatrix4(m);
    expect(foot.y).toBeCloseTo(base[1]+.3,4);
    expect(Math.abs(foot.x-base[0])).toBeCloseTo(1.45,5);
    expect(Math.abs(foot.z-base[2])).toBeCloseTo(.95,5);
   }
  }finally{rig.dispose();}
 });
});
