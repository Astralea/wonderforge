import type {RigidVec3 as V} from './eiffelRigid';
import {EIFFEL_SUMMIT_RUNG_SOLE0,sampleEiffelSummitCrankWorker,type SummitWorkerTargets} from './eiffelSummitWorker';
export const EIFFEL_SUMMIT_WORKER_ACCESS_DURATION=72;
const smooth=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
const mix=(a:V,b:V,t:number):V=>a.map((v,i)=>v+(b[i]!-v)*t) as unknown as V;

export function sampleEiffelSummitWorkerAccess(rawSeconds:number){
 const seconds=Math.max(0,Math.min(EIFFEL_SUMMIT_WORKER_ACCESS_DURATION,rawSeconds));
 const step=Math.min(15,Math.floor(seconds/4)),local=seconds-step*4,phase=Math.min(3,Math.floor(local)),u=smooth(local-phase);
 const footY=EIFFEL_SUMMIT_RUNG_SOLE0+step*.28,handY=300.87+(step+4)*.28;
 const feet: [V,V]=[[.07,footY,-.4],[-.07,footY,-.4]],hands:[V,V]=[[.10,handY,-.355],[-.10,handY,-.355]];
 let pelvisY=footY+.72;let moving:string|null=null;
 for(let i=0;i<2;i++){const t=phase>i?1:phase===i?u:0;hands[i]=[hands[i][0],handY+.28*t,-.355-.05*Math.sin(Math.PI*t)];}
 if(phase>=2){const t=phase===2?u:1;feet[0]=[.07,footY+.28*t,-.4-.10*Math.sin(Math.PI*t)];pelvisY+=.14*t;}
 if(phase===3){feet[1]=[-.07,footY+.28*u,-.4-.10*Math.sin(Math.PI*u)];pelvisY+=.14*u;}
 if(u>0&&u<1)moving=['hand-0','hand-1','foot-0','foot-1'][phase]!;
 let targets:SummitWorkerTargets={pelvis:[0,pelvisY,-.9],yaw:-Math.PI/2,lean:.35,feet,hands};
 if(seconds>=64){const target=sampleEiffelSummitCrankWorker(0),t=smooth((seconds-64)/4);const finalFeet=target.feet;
 const finalHands:[V,V]=[[.10,306.47,-.355],[-.10,306.47,-.355]];
 targets={pelvis:mix([0,EIFFEL_SUMMIT_RUNG_SOLE0+16*.28+.72,-.9],target.pelvis,t),yaw:target.yaw,lean:.35,feet:finalFeet,hands:finalHands};moving=null;
 // Left rail regrip first, then right hand takes the stopped crank. Three contacts remain.
 if(seconds>=68){const t=smooth((seconds-68)/2);targets={...targets,hands:[finalHands[0],mix(finalHands[1],target.hands[1],t)]};if(t>0&&t<1)moving='hand-1';}
 if(seconds>=70){const t=smooth((seconds-70)/2);targets={...targets,hands:[mix(finalHands[0],target.hands[0],t),target.hands[1]]};if(t>0&&t<1)moving='hand-0';}
 }
 return{seconds,targets,moving,contacts:['hand-0','hand-1','foot-0','foot-1'].filter(id=>id!==moving),phase:seconds<64?'ladder-climb':seconds<68?'supported-stance':seconds<70?'rail-regrip':'take-crank'};
}
