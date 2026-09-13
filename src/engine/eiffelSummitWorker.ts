import type {RigidVec3 as V,RigidQuat as Q} from './eiffelRigid';
export const EIFFEL_SUMMIT_RUNG_SOLE0=300.87+.018*Math.cos(Math.PI/10);
export interface SummitWorkerTargets {pelvis:V; yaw:number; lean?:number; footYaw?:number; wristOffsets?:readonly[V,V]; elbowBends?:readonly[V|undefined,V|undefined]; kneeBends?:readonly[V|undefined,V|undefined]; feet:readonly[V,V]; hands:readonly[V,V]}
const add=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const length=(v:V)=>Math.hypot(...v);
const scale=(v:V,s:number):V=>[v[0]*s,v[1]*s,v[2]*s];
const middle=(a:V,b:V)=>scale(add(a,b),.5);
function joint(a:V,b:V,l1:number,l2:number,bend:V):V{
 const d=length(sub(b,a));if(d>l1+l2+1e-8||d<Math.abs(l1-l2)-1e-8)throw Error(`Unreachable summit limb: ${d}`);
 const u=scale(sub(b,a),1/d),t=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-t*t));
 let n=sub(bend,scale(u,bend.reduce((s,v,i)=>s+v*u[i]!,0)));
 if(length(n)<1e-8){const fallback:V=Math.abs(u[0])<.9?[1,0,0]:[0,0,1];n=sub(fallback,scale(u,fallback.reduce((s,v,i)=>s+v*u[i]!,0)));}
 return add(a,add(scale(u,t),scale(n,h/length(n))));
}
function along(a:V,b:V):Q{const v=scale(sub(b,a),1/length(sub(b,a))),q=[v[2],0,-v[0],1+v[1]],n=Math.hypot(...q);return n<1e-9?[1,0,0,0]:q.map(x=>x/n) as unknown as Q;}
export function eiffelSummitWorkerRig(s:SummitWorkerTargets){
 const rotate=(input:V):V=>{const a=s.lean??0,p:V=[Math.cos(a)*input[0]+Math.sin(a)*input[1],-Math.sin(a)*input[0]+Math.cos(a)*input[1],input[2]];return[Math.cos(s.yaw)*p[0]+Math.sin(s.yaw)*p[2],p[1],-Math.sin(s.yaw)*p[0]+Math.cos(s.yaw)*p[2]];};
 const attachment=(p:V)=>add(s.pelvis,rotate(p));
 const shoulders=([-1,1] as const).map(side=>attachment([.12,.41,side*.16]));
 const hips=([-1,1] as const).map(side=>attachment([0,-.06,side*.1]));
 const ankles=s.feet.map(p=>add(p,[0,.12,0]));
 const wrists=s.hands.map((p,i)=>add(p,s.wristOffsets?.[i]??[0,0,0]));
 const elbows=wrists.map((p,i)=>joint(shoulders[i]!,p,.31,.31,s.elbowBends?.[i]??rotate([0,0,i===0?-1:1])));
 const knees=ankles.map((p,i)=>joint(p,hips[i]!, .43,.44,s.kneeBends?.[i]??rotate([1,0,0])));
 return{...s,shoulders,hips,ankles,wrists,elbows,knees,attachment};
}
export function sampleEiffelSummitCrankWorker(angle:number):SummitWorkerTargets{
 return{pelvis:[.34,306.17,-.76],yaw:-Math.PI/2,lean:.35,feet:[[.07,EIFFEL_SUMMIT_RUNG_SOLE0+16*.28,-.4],[-.07,EIFFEL_SUMMIT_RUNG_SOLE0+16*.28,-.4]],hands:[[.48,306.70+.18*Math.cos(angle),-.12+.18*Math.sin(angle)],[-.17320508075688773,306.71,-.355]]};
}
export function eiffelSummitWorkerRoles(s:SummitWorkerTargets){
 const r=eiffelSummitWorkerRig(s),roles:{role:string;position:V;quaternion:Q}[]=[],bodyQ:Q=[-Math.sin(s.yaw/2)*Math.sin((s.lean??0)/2),Math.sin(s.yaw/2)*Math.cos((s.lean??0)/2),-Math.cos(s.yaw/2)*Math.sin((s.lean??0)/2),Math.cos(s.yaw/2)*Math.cos((s.lean??0)/2)];
 const box=(role:string,position:V,quaternion:Q=bodyQ)=>roles.push({role,position,quaternion});
 const limb=(role:string,a:V,b:V)=>box(role,middle(a,b),along(a,b));
 box('pelvis',s.pelvis);
 for(const[id,p]of[['torso',[.06,.20,0]],['neck',[.12,.46,0]],['head',[.12,.625,0]],['cap',[.13,.77,0]],['cap-brim',[.25,.745,0]]] as const)box(id,r.attachment(p));
 for(let i=0;i<2;i++){limb('shin-'+i,r.ankles[i]!,r.knees[i]!);limb('thigh-'+i,r.knees[i]!,r.hips[i]!);limb('upper-arm-'+i,r.shoulders[i]!,r.elbows[i]!);limb('forearm-'+i,r.elbows[i]!,r.wrists[i]!);box('foot-'+i,add(s.feet[i]!,[0,.06,0]),[0,Math.sin((s.footYaw??s.yaw)/2),0,Math.cos((s.footYaw??s.yaw)/2)]);box('hand-'+i,s.hands[i]!);}
 return roles;
}
