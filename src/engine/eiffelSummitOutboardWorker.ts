import{sampleEiffelSummitWorkerAccess}from'./eiffelSummitWorkerAccess';
import{EIFFEL_SUMMIT_RUNG_SOLE0,type SummitWorkerTargets}from'./eiffelSummitWorker';
import type{RigidVec3 as V}from'./eiffelRigid';
export const EIFFEL_SUMMIT_OUTBOARD_ACCESS_DURATION=80;
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const mix=(a:V,b:V,t:number):V=>a.map((v,i)=>v+(b[i]!-v)*t)as unknown as V;
/** Candidate for a .16m crank and authored outboard grabrail; never use on V9. */
export function sampleEiffelSummitOutboardCrankWorker(angle:number):SummitWorkerTargets{return{pelvis:[.60,305.96,-.58],yaw:-Math.PI/2,lean:.35,feet:[[.07,EIFFEL_SUMMIT_RUNG_SOLE0+16*.28,-.4],[.04,EIFFEL_SUMMIT_RUNG_SOLE0+15*.28,-.4]],hands:[[.73,306.70+.16*Math.cos(angle),-.12+.16*Math.sin(angle)],[.30,306.55,-.43]]};}
export function sampleEiffelSummitOutboardAccess(rawSeconds:number){
 const seconds=Math.max(0,Math.min(80,rawSeconds));if(seconds<=64)return sampleEiffelSummitWorkerAccess(seconds);
 const start=sampleEiffelSummitWorkerAccess(64).targets,end=sampleEiffelSummitOutboardCrankWorker(0),lowPelvis:V=[0,start.pelvis[1]-.20,-.9];
 let targets:SummitWorkerTargets,moving:string|null;
 if(seconds<68){const t=smooth((seconds-64)/4),foot=mix(start.feet[1],end.feet[1],t);targets={...start,pelvis:mix(start.pelvis,lowPelvis,t),feet:[start.feet[0],[foot[0],foot[1],foot[2]-.10*Math.sin(Math.PI*t)]]};moving=t>0&&t<1?'foot-1':null;}
 else if(seconds<72){const t=smooth((seconds-68)/4);targets={...start,pelvis:lowPelvis,feet:end.feet,hands:[start.hands[0],mix(start.hands[1],end.hands[1],t)]};moving=t>0&&t<1?'hand-1':null;}
 else{const t=smooth((seconds-72)/8);targets={...end,pelvis:mix(lowPelvis,end.pelvis,t),hands:[mix(start.hands[0],end.hands[0],t),end.hands[1]]};moving=t>0&&t<1?'hand-0':null;}
 return{seconds,targets,moving,contacts:['hand-0','hand-1','foot-0','foot-1'].filter(id=>id!==moving),phase:seconds<68?'stagger-feet':seconds<72?'take-outboard-grabrail':'take-outboard-crank'};
}
/** Verified upper endpoint profile; its access transfer is a separate pending gate. */
export function sampleEiffelSummitOutboardEndpoint(angle:number):SummitWorkerTargets{return{pelvis:[.60,305.95,-.58],yaw:0,lean:0,footYaw:-Math.PI/2,wristOffsets:[[.035,0,0],[.035,0,-.04]],feet:[[.07,EIFFEL_SUMMIT_RUNG_SOLE0+16*.28,-.4],[-.07,EIFFEL_SUMMIT_RUNG_SOLE0+16*.28,-.4]],hands:[[.344,306.55,-.43],[.73,306.70+.16*Math.cos(angle),-.18+.16*Math.sin(angle)]]};}
