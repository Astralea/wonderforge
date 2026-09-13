import type { RigidVec3 as V, RigidQuat as Q } from './eiffelRigid';

export interface LongLoadWorkerTargets {
 readonly feet: readonly V[];
 readonly hands: readonly V[];
 readonly bodyX?: number;
 /** Optional lateral crouch for a constrained cart-side stance; default unchanged. */
 readonly kneeOutward?: number;
 readonly elbowForward?: number;
 readonly kneeSameSide?: boolean;
}
export interface LongLoadWorkerRole {readonly role:string;readonly position:V;readonly quaternion:Q}
const identity:Q=[0,0,0,1];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const midpoint=(a:V,b:V):V=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
const distance=(a:V,b:V)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const side=(i:number)=>i===0?-1:1;
function along(a:V,b:V):Q{
 const n=distance(a,b),x=(b[0]-a[0])/n,y=(b[1]-a[1])/n,z=(b[2]-a[2])/n,q=[z,0,-x,1+y],m=Math.hypot(...q);
 return m<1e-10?[1,0,0,0]:q.map(v=>v/m) as unknown as Q;
}
/** Exact two-link joint. No endpoint or length is clamped to hide bad targets. */
function joint(a:V,b:V,l1:number,l2:number,bend:V):V{
 const d=distance(a,b);
 if(d>l1+l2+1e-7||d<Math.abs(l1-l2)-1e-7)throw Error(`Unreachable onward limb: ${d}`);
 const n=Math.max(d,1e-9),u:V=[(b[0]-a[0])/n,(b[1]-a[1])/n,(b[2]-a[2])/n];
 const t=(l1*l1-l2*l2+n*n)/(2*n),h=Math.sqrt(Math.max(0,l1*l1-t*t));
 let dot=bend.reduce((sum,v,i)=>sum+v*u[i]!,0),normal=bend.map((v,i)=>v-dot*u[i]!) as unknown as V;
 if(Math.hypot(...normal)<1e-6){const fallback:V=Math.abs(u[0])<.9?[1,0,0]:[0,0,1];dot=fallback.reduce((sum,v,i)=>sum+v*u[i]!,0);normal=fallback.map((v,i)=>v-dot*u[i]!) as unknown as V;}
 const len=Math.hypot(...normal);
 return a.map((v,i)=>v+u[i]!*t+normal[i]!*h/len) as unknown as V;
}
function rotated(v:V,angle:number):V{const c=Math.cos(angle),s=Math.sin(angle);return[v[0]*c+v[1]*s,-v[0]*s+v[1]*c,v[2]];}
const plus=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];

/** Solve a single connected torso pose. Both shoulders are fixed anatomical
 * offsets on this torso; legal pelvis-height intervals come from both feet
 * and both hands. This moves the body, never an isolated shoulder. */
export function eiffelLongLoadWorkerRig(worker:LongLoadWorkerTargets){
 if(worker.feet.length!==2||worker.hands.length!==2)throw Error('A worker needs two foot and two hand targets');
 const feet=worker.feet as readonly[V,V],hands=worker.hands as readonly[V,V];
 const mean=midpoint(feet[0],feet[1]),x=worker.bodyX??mean[0],floor=Math.min(feet[0][1],feet[1][1]);
 const nominalY=floor+.91,ankles=feet.map(p=>plus(p,[0,.12,0]));
 let legLow=floor+.30,legHigh=floor+.92;
 for(let i=0;i<2;i++){
  const a=ankles[i]!,horizontal=(x-a[0])**2+(mean[2]+side(i)*.1-a[2])**2;
  if(horizontal>.87**2)throw Error('Worker stance exceeds leg reach');
  const dy=Math.sqrt(.87**2-horizontal);
  legLow=Math.max(legLow,a[1]-dy+.06);legHigh=Math.min(legHigh,a[1]+dy+.06);
 }
 const candidate=(angle:number)=>{
  let low=legLow,high=legHigh;
  for(let i=0;i<2;i++){
   const s=rotated([.12,.41,side(i)*.16],angle),hand=hands[i]!;
   const horizontal=(x+s[0]-hand[0])**2+(mean[2]+s[2]-hand[2])**2;
   if(horizontal>.615**2)return null;
   const dy=Math.sqrt(.615**2-horizontal);
   low=Math.max(low,hand[1]-s[1]-dy);high=Math.min(high,hand[1]-s[1]+dy);
  }
  if(low>high)return null;
  const y=clamp(nominalY,low,high),score=(y-nominalY)**2+.11*angle*angle;
  return{angle,y,score};
 };
 let best:ReturnType<typeof candidate>=null;
 for(let i=0;i<=48;i++){const p=candidate(-.35+i*1.65/48);if(p&&(!best||p.score<best.score))best=p;}
 if(!best)throw Error(`No connected onward body pose: ${JSON.stringify({feet,hands,x})}`);
 // Refine the best interval so a coarse search grid cannot visibly snap a torso.
 let step=1.65/48;
 for(let i=0;i<16;i++){step/=2;for(const a of[best.angle-step,best.angle+step]){const p=candidate(a);if(p&&p.score<best.score)best=p;}}
 const pelvis:V=[x,best.y,mean[2]],angle=best.angle,bodyQuaternion:Q=[0,0,-Math.sin(angle/2),Math.cos(angle/2)];
 const attachment=(v:V)=>plus(pelvis,rotated(v,angle));
 const shoulders=[attachment([.12,.41,-.16]),attachment([.12,.41,.16])];
 const hips=[plus(pelvis,[0,-.06,-.1]),plus(pelvis,[0,-.06,.1])];
 const forward=clamp(worker.elbowForward??0,0,1);
 const elbows=hands.map((h,i)=>joint(shoulders[i]!,h,.31,.31,[forward,0,side(i)*(1-forward)]));
 const outward=clamp(worker.kneeOutward??0,0,1);
 const knees=ankles.map((a,i)=>joint(a,hips[i]!, .43,.44,[1-outward,0,(worker.kneeSameSide?-1:side(i))*outward]));
 return{pelvis,bodyQuaternion,attachment,shoulders,hips,elbows,knees,ankles,hands,feet};
}
export function eiffelLongLoadWorkerRoles(prefix:string,worker:LongLoadWorkerTargets):LongLoadWorkerRole[]{
 const r=eiffelLongLoadWorkerRig(worker),roles:LongLoadWorkerRole[]=[];
 const box=(id:string,position:V,quaternion:Q=identity)=>roles.push({role:`${prefix}-${id}`,position,quaternion});
 const limb=(id:string,a:V,b:V)=>box(id,midpoint(a,b),along(a,b));
 box('pelvis',r.pelvis);
 for(const[id,offset]of[['torso',[.06,.20,0]],['neck',[.12,.46,0]],['head',[.12,.625,0]],['cap',[.13,.77,0]],['cap-brim',[.25,.745,0]]] as const)box(id,r.attachment(offset),r.bodyQuaternion);
 for(let i=0;i<2;i++){
  limb('shin-'+i,r.ankles[i]!,r.knees[i]!);limb('thigh-'+i,r.knees[i]!,r.hips[i]!);
  limb('upper-arm-'+i,r.shoulders[i]!,r.elbows[i]!);limb('forearm-'+i,r.elbows[i]!,r.hands[i]!);
  box('foot-'+i,plus(r.feet[i]!,[0,.06,0]));box('hand-'+i,r.hands[i]!);
 }
 return roles;
}
