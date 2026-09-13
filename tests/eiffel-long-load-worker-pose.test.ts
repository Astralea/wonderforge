import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { eiffelLongLoadWorkerRig, eiffelLongLoadWorkerRoles, type LongLoadWorkerTargets } from '../src/engine/eiffelLongLoadWorkerPose';
import type { RigidVec3 as V } from '../src/engine/eiffelRigid';
const dist=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
const hatch=(angle:number):LongLoadWorkerTargets=>{
 const c=Math.cos(angle),s=Math.sin(angle),y=.18*c+1.65*s,z=-3.05+.18*s-1.65*c;
 return{feet:[[-20.65,0,z-.12],[-20.65,0,z+.12]],hands:[[-20.23,y+s*.10,z-c*.10],[-20.23,y-s*.10,z+c*.10]]};
};
describe('connected fixed-size onward worker rig',()=>{
 it('keeps both arms attached to one rigid torso and every actual limb endpoint connected',()=>{
  const targets:LongLoadWorkerTargets[]=[hatch(0),hatch(Math.PI/4),hatch(Math.PI/2),
   {feet:[[-22.73,2.118,-4.12],[-22.73,2.418,-3.88]],bodyX:-22.9,hands:[[-22.65,3.3,-4.2],[-22.65,3.3,-3.8]]},
   {feet:[[-22.05,5.82,-4.12],[-22.05,5.82,-3.88]],hands:[[-22.1,6.74,-4.67],[-21.5,7.3265,-3.868]]}];
  for(const target of targets){const rig=eiffelLongLoadWorkerRig(target),roles=eiffelLongLoadWorkerRoles('test',target);expect(roles).toHaveLength(18);
   for(let i=0;i<2;i++){
    const shoulderExpected=new Vector3(.12,.41,i===0?-.16:.16).applyQuaternion(new Quaternion(...rig.bodyQuaternion)).add(new Vector3(...rig.pelvis));
    expect(dist(shoulderExpected.toArray(),rig.shoulders[i]!)).toBeLessThan(1e-10);
    for(const[id,length,a,b]of[[`shin-${i}`,.43,rig.ankles[i]!,rig.knees[i]!],[`thigh-${i}`,.44,rig.knees[i]!,rig.hips[i]!],[`upper-arm-${i}`,.31,rig.shoulders[i]!,rig.elbows[i]!],[`forearm-${i}`,.31,rig.elbows[i]!,rig.hands[i]!]]as const){
     const p=roles.find(p=>p.role===`test-${id}`)!;
     const ends=[-1,1].map(sign=>new Vector3(0,sign*length/2,0).applyQuaternion(new Quaternion(...p.quaternion)).add(new Vector3(...p.position)));
     expect(dist(ends[0]!.toArray(),a),id).toBeLessThan(1e-7);expect(dist(ends[1]!.toArray(),b),id).toBeLessThan(1e-7);
    }
   }
  }
 });
 it('lowers the whole connected torso continuously through the complete hatch handle arc',()=>{
  let previous=eiffelLongLoadWorkerRoles('hatch',hatch(Math.PI/2));
  for(let i=1;i<=800;i++){
   const next=eiffelLongLoadWorkerRoles('hatch',hatch(Math.PI/2*(1-i/800)));
   next.forEach((part,j)=>expect(dist(part.position,previous[j]!.position),`${i}:${part.role}`).toBeLessThan(.025));previous=next;
  }
 });
 it('rejects unreachable work rather than moving a shoulder off the body',()=>{
  expect(()=>eiffelLongLoadWorkerRoles('bad',{feet:[[0,0,-.12],[0,0,.12]],hands:[[4,2,0],[4,2,0]] as V[]})).toThrow(/No connected/);
 });
});
