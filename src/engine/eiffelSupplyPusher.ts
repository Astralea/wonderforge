import {sampleEiffelSecondFloorSupply} from './eiffelSecondFloorSupply';
import type {RigidVec3 as V,RigidQuat as Q} from './eiffelRigid';
export interface SupplyWorkerPart {id:string;center:V;quaternion:Q;size:V;material:'cloth'|'pants'|'skin'|'boot';a?:V;b?:V}
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
function elbow(a:V,b:V,l1:number,l2:number,bend:V):V{
 const delta=b.map((v,k)=>v-a[k]!),d=Math.hypot(...delta);if(d>l1+l2+1e-8||d<Math.abs(l1-l2)+1e-8)throw Error(`Pusher reach ${d}`);
 const u=delta.map(v=>v/d),along=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-along*along));
 const dot=bend.reduce((s,v,k)=>s+v*u[k]!,0),normal=bend.map((v,k)=>v-dot*u[k]!),n=Math.hypot(...normal);
 return a.map((v,k)=>v+u[k]!*along+normal[k]!*h/n) as unknown as V;
}
function directionQuaternion(a:V,b:V):Q{const d=b.map((v,k)=>v-a[k]!),n=Math.hypot(...d),x=d[0]!/n,y=d[1]!/n,z=d[2]!/n;const q=[z,0,-x,1+y],length=Math.hypot(...q);return length<1e-10?[1,0,0,0]:q.map(v=>v/length) as unknown as Q;}
/** Distance-driven planted feet; one worker stays behind the real stock cart. */
export function sampleEiffelSupplyPusher(rawSeconds:number){
 const load=sampleEiffelSecondFloorSupply(rawSeconds);
 return eiffelSupplyPusherAt(load.cart,load.cart[0]+15,load.seconds,20);
}
/** Same fixed-size worker on another level; travel drives planted footsteps. */
export function eiffelSupplyPusherAt(cart:V,distance:number,seconds:number,stopAt:number,workerOffsetX=-1.25){
 const load={cart,seconds},x=cart[0]+workerOffsetX,z=cart[2],floor=cart[1],initialWorkerX=cart[0]-distance+workerOffsetX;
 const parts:SupplyWorkerPart[]=[],hands:{center:V;surface:V;active:boolean}[]=[],feet:{center:V;planted:boolean}[]=[];
 const box=(id:string,center:V,size:V,material:SupplyWorkerPart['material'],quaternion:Q=[0,0,0,1])=>parts.push({id,center,size,material,quaternion});
 const limb=(id:string,a:V,b:V,length:number,width:number,material:SupplyWorkerPart['material'])=>{parts.push({id,a,b,center:a.map((v,k)=>(v+b[k]!)/2) as unknown as V,size:[width,length,width],material,quaternion:directionQuaternion(a,b)});};
 box('pelvis',[x,floor+.93,z],[.24,.18,.30],'pants');box('torso',[x+.06,floor+1.13,z],[.25,.46,.34],'cloth',[0,0,Math.sin(-.09),Math.cos(-.09)]);
 box('neck',[x+.12,floor+1.43,z],[.12,.10,.12],'skin');box('head',[x+.12,floor+1.59,z],[.23,.27,.23],'skin');box('cap',[x+.13,floor+1.745,z],[.28,.055,.28],'boot');
 box('cap-brim',[x+.25,floor+1.72,z],[.12,.025,.28],'boot');
 for(const [i,side]of[-1,1].entries()){
  const offset=i*.325,cycle=Math.floor((distance+offset)/.65),phase=(distance+offset)/.65-cycle;
  const swing=smooth((phase-.6)/.4),footX=initialWorkerX+cycle*.65-offset+.195+.65*swing,lift=phase<=.6?0:.10*Math.sin(Math.PI*(phase-.6)/.4);
  const foot:V=[footX,floor+.06+lift,z+side*.12],ankle:V=[footX,floor+.12+lift,foot[2]],hip:V=[x,floor+.87,z+side*.1],knee=elbow(ankle,hip,.43,.44,[1,0,0]);
  box('foot-'+i,foot,[.26,.12,.14],'boot');limb('shin-'+i,ankle,knee,.43,.09,'pants');limb('thigh-'+i,knee,hip,.44,.11,'pants');feet.push({center:foot,planted:phase<=.6});
  const shoulder:V=[x+.12,floor+1.38,z+side*.16],surface:V=[load.cart[0]-.815,floor+.95,z+side*.26],grip:V=[surface[0]-.035,surface[1],surface[2]],idle:V=[x+.02,floor+1,z+side*.22];
  const release=smooth((load.seconds-stopAt)/3),hand=grip.map((v,k)=>v+(idle[k]!-v)*release) as unknown as V,joint=elbow(shoulder,hand,.31,.31,[0,0,side]);
  limb('upper-arm-'+i,shoulder,joint,.31,.065,'cloth');limb('forearm-'+i,joint,hand,.31,.065,'cloth');box('hand-'+i,hand,[.07,.08,.08],'skin');hands.push({center:hand,surface,active:load.seconds<=stopAt});
 }
 return{seconds:load.seconds,parts,hands,feet,floor,phase:load.seconds<stopAt?'pushing':load.seconds<stopAt+3?'releasing':'watching'};
}
