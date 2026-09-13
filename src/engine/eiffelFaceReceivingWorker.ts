import {sampleEiffelFacePackageTransfer} from './eiffelFacePackageTransfer';
import type {RigidVec3 as V} from './eiffelRigid';
export type ReceivingPrimitive={id:string;material:'cloth'|'skin'|'boot';kind:'box';center:V;size:V}|{id:string;material:'cloth'|'skin'|'boot';kind:'beam';a:V;b:V;halfWidth:number};
const mix=(a:V,b:V,t:number):V=>a.map((v,k)=>v+(b[k]!-v)*t) as unknown as V;
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
function joint(a:V,b:V,l1:number,l2:number,bend:V):V{
 const d=b.map((v,k)=>v-a[k]!) as unknown as V,length=Math.hypot(...d);
 if(length>l1+l2+1e-8||length<Math.abs(l1-l2)+1e-8)throw Error(`Receiving worker reach ${length}`);
 const u=d.map(v=>v/length),along=(l1*l1-l2*l2+length*length)/(2*length),h=Math.sqrt(Math.max(0,l1*l1-along*along));
 const dot=bend.reduce((s,v,k)=>s+v*u[k]!,0),n=bend.map((v,k)=>v-dot*u[k]!),nl=Math.hypot(...n);
 return a.map((v,k)=>v+u[k]!*along+n[k]!*h/nl) as unknown as V;
}
/** Receiving only: the crane carries the weight until the deck takes it. */
export function sampleEiffelFaceReceivingWorker(rawSeconds:number){
 const load=sampleEiffelFacePackageTransfer(rawSeconds),t=load.seconds,reach=smooth(t-72.5),lean=.12*reach;
 const primitives:ReceivingPrimitive[]=[],contacts:{center:V;surface:V;active:boolean}[]=[];
 const box=(id:string,center:V,size:V,material:ReceivingPrimitive['material'])=>primitives.push({id,center,size,material,kind:'box'});
 const beam=(id:string,a:V,b:V,halfWidth:number,material:ReceivingPrimitive['material'])=>primitives.push({id,a,b,halfWidth,material,kind:'beam'});
 const hip:V=[52.8,18.58,-43.1],shoulder:V=[52.72-lean,19.1,-43.1];
 box('pelvis',[hip[0],hip[1]+.07,hip[2]],[.23,.23,.27],'cloth');beam('torso',[52.8,18.78,-43.1],shoulder,.14,'cloth');
 box('head',[shoulder[0]-.035,19.3,-43.1],[.23,.27,.23],'skin');box('cap',[shoulder[0]-.05,19.45,-43.1],[.28,.06,.28],'boot');
 for(const [i,side] of [-1,1].entries()){
  const foot:V=[52.8,17.76,-43.1+side*.17],ankle:V=[52.82,17.82,foot[2]],top:V=[hip[0],hip[1],hip[2]+side*.1],knee=joint(ankle,top,.43,.44,[-1,0,0]);
  box('foot-'+i,foot,[.29,.12,.14],'boot');beam('shin-'+i,ankle,knee,.055,'cloth');beam('thigh-'+i,knee,top,.065,'cloth');
  const a:V=[shoulder[0],shoulder[1],shoulder[2]+side*.14],idle:V=[52.63,18.74,-43.1+side*.23];
  // Outer wooden rail face x=52+.24; hand's inner face touches it.
  const surface:V=[52.24,load.pose.position[1]+.19,-43.1+side*.18],target:V=[surface[0]+.03,surface[1],surface[2]];
  const hand=mix(idle,target,reach),elbow=joint(a,hand,.38,.4,[0,0,side]);
  beam('upper-arm-'+i,a,elbow,.0325,'cloth');beam('forearm-'+i,elbow,hand,.0325,'cloth');box('hand-'+i,hand,[.06,.06,.06],'skin');contacts.push({center:hand,surface,active:t>=73.5});
 }
 return{seconds:t,primitives,contacts,phase:t<72.5?'waiting' as const:t<73.5?'reaching' as const:'guiding-tray' as const};
}
