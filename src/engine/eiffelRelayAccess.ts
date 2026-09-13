import {sampleEiffelLongLoadOnward,type EiffelOnwardWorker} from './eiffelLongLoadOnward';
import {eiffelLongLoadWorkerRoles} from './eiffelLongLoadWorkerPose';
import type {RigidVec3 as V,RigidQuat as Q} from './eiffelRigid';
export const EIFFEL_RELAY_ACCESS={
 postXZ:[[-7.52,-4.40],[-7.52,-3.60],[-8.00,-4.40],[-8.00,-3.60]],
 soleWidth:.23,platformCenter:[-7.8,5.77,-4],platformSize:[.8,.10,1.44],
 ladderX:-7.35,ladderStileZ:[-4.31,-3.69],
 bridgeTieY:4.06,bridgeChordZ:[-5.05,-2.95],
 /** Actor must first reach the southern lane on its existing supported walk. */
 approachWaypoints:[[-9.2,-4.7],[-7.1,-4.7],[-7.1,-4]],
} as const;
export const mirrorEiffelRelayAccessPoint=(p:V):V=>[-30-p[0],p[1],p[2]];
export const mirrorEiffelRelayAccessQuaternion=(q:Q):Q=>[q[0],-q[1],-q[2],q[3]];
export type EiffelRelayAccessStep='ascent'|'reach-open-pin'|'close-connector'|'descent';
/** New mirrored scaffold is required. This does not move the old worker there. */
export function sampleEiffelRelayAccessStep(step:EiffelRelayAccessStep,progress:number){
 if(!Number.isFinite(progress))throw Error('Relay access progress must be finite');
 const u=Math.max(0,Math.min(1,progress));let worker:EiffelOnwardWorker;
 if(step==='reach-open-pin'){
  const a=sampleEiffelLongLoadOnward(168).onward.upperRigger,b=sampleEiffelLongLoadOnward(180).onward.upperRigger;
  worker={...a,hands:a.hands.map((p,i)=>p.map((v,k)=>v+(b.hands[i]![k]!-v)*u)as unknown as V)};
 }else{const t=step==='ascent'?154+14*u:step==='close-connector'?180-12*u:168-14*u;worker=sampleEiffelLongLoadOnward(t).onward.upperRigger;}
 return{step,progress:u,worker:{...worker,feet:worker.feet.map(mirrorEiffelRelayAccessPoint),hands:worker.hands.map(mirrorEiffelRelayAccessPoint),bodyX:worker.bodyX===undefined?undefined:-30-worker.bodyX,contacts:worker.contacts.map(c=>({...c,point:mirrorEiffelRelayAccessPoint(c.point)}))},
 roles:eiffelLongLoadWorkerRoles('relay-rigger',worker).map(r=>({role:r.role,position:mirrorEiffelRelayAccessPoint(r.position),quaternion:mirrorEiffelRelayAccessQuaternion(r.quaternion)})),
 geometryAdmitted:false as const,arrivalWalkAdmitted:false as const};
}
