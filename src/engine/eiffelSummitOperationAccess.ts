import type {RigidVec3 as V} from './eiffelRigid';
import type {SummitWorkerTargets} from './eiffelSummitWorker';
import {sampleEiffelSummitWorkerAccess} from './eiffelSummitWorkerAccess';
import {sampleEiffelSummitOutboardEndpoint} from './eiffelSummitOutboardWorker';
const smooth=(v:number)=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
const mix=(a:V,b:V,u:number):V=>a.map((v,i)=>v+(b[i]!-v)*u)as unknown as V;
/** Unadmitted operation-access candidate until actual new-asset contact/sweep tests pass. */
export function sampleEiffelSummitOperationAccess(raw:number){
 const seconds=Math.max(0,Math.min(80,raw)),old=sampleEiffelSummitWorkerAccess(Math.min(seconds,64));
 const start=sampleEiffelSummitWorkerAccess(64).targets,end=sampleEiffelSummitOutboardEndpoint(0);
 let targets:SummitWorkerTargets=old.targets,moving=old.moving,phase='ladder-ascent';
 const tuck=mix([1,0,0],[0,0,-1],smooth((seconds-54)/6));
 if(seconds<=64)targets={...old.targets,elbowBends:[tuck,undefined]};
 else if(seconds<68){const u=smooth((seconds-64)/4);targets={...start,footYaw:-Math.PI/2,hands:[mix(start.hands[0],end.hands[0],u).map((v,i)=>v+(i===2?-.20*Math.sin(Math.PI*u):i===0?.20*Math.sin(Math.PI*u):0)) as unknown as V,start.hands[1]],wristOffsets:[mix([0,0,0],end.wristOffsets![0],u),[0,0,0]],elbowBends:[[0,0,-1],undefined]};moving=u>0&&u<1?'hand-0':null;phase='take-grabrail';}
 else {const u=smooth((seconds-68)/12),yaw=start.yaw*(1-u);targets={...end,pelvis:mix(start.pelvis,end.pelvis,u).map((v,i)=>v+[.15,-.08,-.14][i]!*Math.sin(Math.PI*u)) as unknown as V,yaw,lean:.35*(1-u)**3,hands:[end.hands[0],mix(start.hands[1],end.hands[1],u).map((v,i)=>v+(i===2?-.25*Math.sin(Math.PI*u):0)) as unknown as V],wristOffsets:[end.wristOffsets![0],mix([0,0,0],end.wristOffsets![1],u)],elbowBends:[mix([0,0,-1],[-Math.sin(yaw),0,-Math.cos(yaw)],u),mix([Math.sin(yaw),0,Math.cos(yaw)],[0,0,-1],Math.sin(Math.PI*u))],kneeBends:[[Math.cos(yaw*(1-u)**2)*Math.cos(.35*(1-u)**3),-Math.sin(.35*(1-u)**3),-Math.sin(yaw*(1-u)**2)*Math.cos(.35*(1-u)**3)],[Math.cos(yaw*(1-u)**2)*Math.cos(.35*(1-u)**3),-Math.sin(.35*(1-u)**3),-Math.sin(yaw*(1-u)**2)*Math.cos(.35*(1-u)**3)]]};moving=u>0&&u<1?'hand-1':null;phase='turn-to-crank';}
 return{seconds,targets,moving,phase,contacts:['hand-0','hand-1','foot-0','foot-1'].filter(x=>x!==moving)};
}
