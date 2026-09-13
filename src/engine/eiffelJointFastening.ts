import routes from '../../artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json';
import support from '../../artifacts/eiffel-joint-campaign-2026-09-07/joint-support.json';
import { sampleEiffelJointCampaign } from './eiffelJointCampaign';
import { composeRigidPoses, invertRigidPose, type RigidPose, type RigidVec3 as V } from './eiffelRigid';

const v=(a:readonly number[]):V=>[a[0]!,a[1]!,a[2]!];
const final:RigidPose={position:v(routes.loads[0]!.part.finalPose.position),quaternion:routes.loads[0]!.part.finalPose.quaternion as [number,number,number,number]};
const joint=v(support.joint), ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const mix=(a:V,b:V,t:number):V=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
export const EIFFEL_SPLICE_PLATE_SIZE:V=[.018,.11,.65];
export const EIFFEL_SPLICE_STOW_OFFSET=-.4;
function arm(shoulder:V,hand:V){
 const d:V=[hand[0]-shoulder[0],hand[1]-shoulder[1],hand[2]-shoulder[2]],length=Math.hypot(...d);
 if(length>.78+1e-9||length<.02-1e-9)throw Error(`Splice worker cannot reach ${length}m`);
 const dir=d.map(n=>n/length) as unknown as V,along=(.38**2-.4**2+length**2)/(2*length),height=Math.sqrt(Math.max(0,.38**2-along**2));
 // Elbows bend above the iron, never underneath the supported joint.
 const up:V=[-dir[0]*dir[1],1-dir[1]**2,-dir[2]*dir[1]],n=Math.hypot(...up);
 const elbow=shoulder.map((a,i)=>a+dir[i]!*along+up[i]!*height/n) as unknown as V;
 return{shoulder,elbow,hand};
}
/** Captive plates travel on the first iron from its loaded ground cart. They
 * slide along that iron only after the second section has seated. */
export function sampleEiffelJointFastening(seconds:number){
 const s=sampleEiffelJointCampaign(seconds),t=s.seconds;
 const delta=composeRigidPoses(s.loads[0].pose,invertRigidPose(final));
 const progress=[ease((t-115)/3),ease((t-119)/3)] as const;
 const plates=progress.map((amount,i)=>{
  const sign=i?1:-1;
  const prepared:RigidPose={position:[joint[0]+sign*.0670499991774559,19,joint[2]-.4+.4*amount],quaternion:[0,0,0,1]};
  return {id:`splice-plate-${i}`,pose:composeRigidPoses(delta,prepared),size:EIFFEL_SPLICE_PLATE_SIZE,progress:amount};
 });
 const w=support.workerPlatform.recommendedWorker;
 const rest:V=[50.91,19.13,joint[2]-.1];
 const grip=(i:number):V=>[i?51.416:51.22,19.0845,joint[2]-.28+.32*progress[i]!];
 let hand=rest;
 if(t>=114&&t<115)hand=mix(rest,grip(0),ease(t-114));
 else if(t>=115&&t<118)hand=grip(0);
 else if(t>=118&&t<118.25)hand=mix(grip(0),[grip(0)[0],19.19,grip(0)[2]],ease((t-118)*4));
 else if(t>=118.25&&t<118.75)hand=mix([grip(0)[0],19.19,grip(0)[2]],[grip(1)[0],19.19,grip(1)[2]],ease((t-118.25)*2));
 else if(t>=118.75&&t<119)hand=mix([grip(1)[0],19.19,grip(1)[2]],grip(1),ease((t-118.75)*4));
 else if(t>=119&&t<122)hand=grip(1);
 else if(t>=122&&t<122.3)hand=mix(grip(1),[grip(1)[0],19.19,grip(1)[2]],ease((t-122)/.3));
 else if(t>=122.3&&t<123)hand=mix([grip(1)[0],19.19,grip(1)[2]],rest,ease((t-122.3)/.7));
 const boltTarget:V=[51.234235,19.035,joint[2]+.12];
 const idle:V=[50.93,19.13,joint[2]+.20];
 const reach=.22,arc=1.85,stroke=2.2,power=1.05,hold=.15,seat=122.5,workEnd=seat+5*stroke;
 const cycleAt=(seconds:number)=>{
  if(seconds<=122)return {tighten:0,turn:0};
  if(seconds<seat)return {tighten:ease((seconds-122)/(seat-122)),turn:0};
  if(seconds>=workEnd)return {tighten:1-ease((seconds-workEnd)/.5),turn:0};
  const local=seconds-seat,cycle=local-stroke*Math.floor(local/stroke);
  if(cycle<power)return {tighten:1,turn:arc*ease(cycle/power)};
  if(cycle<power+hold)return {tighten:1,turn:arc};
  const liftU=cycle-(power+hold);
  if(liftU<.1)return {tighten:1-.25*ease(liftU/.1),turn:arc};
  const backU=liftU-.1;
  if(backU<.8)return {tighten:.75,turn:arc*(1-ease(backU/.8))};
  return {tighten:.75+.25*ease((backU-.8)/.1),turn:0};
 };
 const wrench=cycleAt(t),tighten=wrench.tighten,turn=wrench.turn;
 const lean=.05*Math.sin((turn/arc)*Math.PI);
 const shoulders:readonly[V,V]=[[50.80+lean,19.35,joint[2]-.1],[50.80+lean,19.35,joint[2]+.1]];
 const toolTarget:V=[boltTarget[0]-.029235,boltTarget[1]+reach*Math.cos(turn),boltTarget[2]+reach*Math.sin(turn)];
 const rightHand=mix(idle,toolTarget,tighten);
 const contactPoint:V=[rightHand[0]+.029235,rightHand[1]-reach*Math.cos(turn),rightHand[2]-reach*Math.sin(turn)];
 const jawStart:V=[rightHand[0],rightHand[1]-(reach-.01)*Math.cos(turn),rightHand[2]-(reach-.01)*Math.sin(turn)];
 const away=Math.hypot(rightHand[0]-boltTarget[0],rightHand[1]-boltTarget[1],rightHand[2]-boltTarget[2])||1;
 const handleTip:V=[rightHand[0]+(rightHand[0]-boltTarget[0])*.12/away,rightHand[1]+(rightHand[1]-boltTarget[1])*.12/away,rightHand[2]+(rightHand[2]-boltTarget[2])*.12/away];
 return {seconds:t,delta,plates,progress,connected:s.permanentConnected,
  worker:{...w,shoulderCenter:[50.80+lean,19.35,joint[2]] as V,torso:[v(w.torso[0]!),[50.80+lean,19.35,joint[2]] as V] as const,
   head:{center:[50.70+lean,19.54,joint[2]] as V,size:v(w.head.size)},
   arms:[arm(shoulders[0],hand),arm(shoulders[1],rightHand)] as const},
  tool:{center:rightHand,jawStart,contactPoint,boltTarget,handleTip,turn,engaged:tighten===1},
 };
}
