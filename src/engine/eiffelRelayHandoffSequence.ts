import {sampleEiffelLongLoadOnward} from './eiffelLongLoadOnward';
import {eiffelLongLoadWorkerRoles,type LongLoadWorkerTargets} from './eiffelLongLoadWorkerPose';
import {sampleEiffelRelayAccessStep} from './eiffelRelayAccess';
import {initialEiffelRelayHandoff,toEiffelSecondFloorHandoffSample,EIFFEL_RELAY_HANDOFF_START,type EiffelRelayBoltState} from './eiffelRelayHandoff';
import type {RigidVec3 as V,RigidQuat as Q} from './eiffelRigid';
const F=EIFFEL_RELAY_HANDOFF_START.cartOrigin[1],I:Q=[0,0,0,1];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a:V,b:V,t:number):V=>a.map((v,i)=>v+(b[i]!-v)*t)as unknown as V;
const add=(a:V,b:V):V=>a.map((v,i)=>v+b[i]!)as unknown as V;
const rot=(p:V,a:number):V=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
const qmul=(a:Q,b:Q):Q=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
interface Pose extends LongLoadWorkerTargets {yaw:number}
const start:Pose={...sampleEiffelLongLoadOnward(280).onward.deckRigger,yaw:0};
function accessWorker(step:Parameters<typeof sampleEiffelRelayAccessStep>[0],u:number){
 const w=sampleEiffelRelayAccessStep(step,u).worker;
 const outside=step==='ascent'?1-smooth((u-12/14)/(2/14)):step==='descent'?smooth(u/(2/14)):0;
 return {...w,bodyX:w.bodyX===undefined?undefined:w.bodyX+.28*outside,feet:w.feet.map(p=>add(p,[.035*outside,0,0])),hands:w.hands.map(p=>{const ladder=Math.max(0,Math.min(1,(-7.9-p[0])/-0.55));return add(p,[.06*ladder,0,p[2]<-4.5?.06:0]);})};
}
const baseAccess=accessWorker('ascent',0);
function idle(x:number,z:number,yaw=0):Pose{const foot=(side:number)=>add([x,F,z],rot([0,0,side*.12],yaw)),hand=(side:number)=>add([x,F+.94,z],rot([.36,0,side*.16],yaw));return{feet:[foot(-1),foot(1)],hands:[hand(-1),hand(1)],yaw};}
function interpolate(a:Pose,b:Pose,t:number,stepFeet=true):Pose{
 const u=smooth(t),feet=a.feet.map((p,i)=>{const v=stepFeet?smooth(t*2-i):u;const q=mix(p,b.feet[i]!,v);return add(q,[0,stepFeet?.045*Math.sin(Math.PI*v):0,0]);});
 return{feet,hands:a.hands.map((p,i)=>mix(p,b.hands[i]!,u)),yaw:a.yaw+(b.yaw-a.yaw)*u,
 bodyX:a.bodyX!==undefined||b.bodyX!==undefined?(a.bodyX??(a.feet[0]![0]+a.feet[1]![0])/2)+((b.bodyX??(b.feet[0]![0]+b.feet[1]![0])/2)-(a.bodyX??(a.feet[0]![0]+a.feet[1]![0])/2))*u:undefined};
}
function roles(p:Pose){
 // Solve in the actor's facing frame; the source limb lengths stay unchanged.
 const centre:V=[(p.feet[0]![0]+p.feet[1]![0])/2,0,(p.feet[0]![2]+p.feet[1]![2])/2];
 const local=(v:V)=>rot(add(v,[-centre[0],0,-centre[2]]),-p.yaw);
 const bodyX=p.bodyX===undefined?undefined:local([p.bodyX,0,centre[2]])[0];
 const turn:Q=[0,Math.sin(p.yaw/2),0,Math.cos(p.yaw/2)];
 return eiffelLongLoadWorkerRoles('deck-rigger',{feet:p.feet.map(local),hands:p.hands.map(local),bodyX,kneeOutward:p.kneeOutward,elbowForward:p.elbowForward,kneeSameSide:p.kneeSameSide}).map(r=>({...r,position:add(rot(r.position,p.yaw),centre),quaternion:qmul(turn,r.quaternion)}));
}
const standing:Pose={...start,hands:idle((start.feet[0]![0]+start.feet[1]![0])/2,-4.6).hands};
const ladder:Pose={...baseAccess,feet:[...baseAccess.feet].reverse(),hands:[...baseAccess.hands].reverse(),yaw:Math.PI};
const approach=[standing,idle(-8.55,-4.7),idle(-8.05,-4.7),idle(-7.55,-4.7),idle(-7.1,-4.7),idle(-6.82,-4.35,Math.PI/2),idle(-6.82,-4,Math.PI),ladder];
const work:Pose=idle(-9.65,-3.445);
const boltStation:Pose=idle(-8.5,-4.67,-Math.PI/2);
const returning=[ladder,idle(-6.82,-4,Math.PI),idle(-6.82,-4.35,Math.PI/2),idle(-7.1,-4.7),idle(-7.55,-4.7),idle(-8.05,-4.7),idle(-8.55,-4.7),idle(-9.10,-4.7),idle(-9.65,-4.7),idle(-9.65,-4.1,-Math.PI/2),work];
function path(points:readonly Pose[],seconds:number,step=4){const n=Math.min(points.length-2,Math.floor(Math.max(0,seconds)/step));return interpolate(points[n]!,points[n+1]!,clamp((seconds-n*step)/step));}
export const EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION=222;
export const EIFFEL_RELAY_HANDOFF_SEQUENCE_BOUNDARIES=[0,4,32,46,50,62,66,80,112,116,122,146,170,194,218,222] as const;
const tray=(i:number):V=>[-9.25,F+.43,-3.53+i*.055];
const toolStow:V=[-9.25,F+.32,-3.36];
const transferPoints=[boltStation,idle(-9.05,-4.67),idle(-9.65,-4.67),idle(-9.65,-4.05,-Math.PI/2),work];
const transfer=(u:number)=>path(transferPoints,clamp(u)*8,2);
/** Candidate only. The caller supplies the real second-hoist route ending at
 * the retained master apex; its arrival before this local operation is omitted. */
export function sampleEiffelRelayHandoffSequence(inputSeconds:number,worldRope:readonly V[]){
 if(!Number.isFinite(inputSeconds))throw Error('Handoff time must be finite');
 const seconds=Math.max(0,Math.min(EIFFEL_RELAY_HANDOFF_SEQUENCE_DURATION,inputSeconds));
 let pose:Pose=standing,workerRoles:ReturnType<typeof roles>|undefined,phase='standing-clear';
 if(seconds<4)pose=interpolate(start,standing,seconds/4,false);
 else if(seconds<32){phase='walking-to-ladder';pose=path(approach,seconds-4);}
 else if(seconds<80){
  const step=seconds<46?'ascent':seconds<50?'reach-open-pin':seconds<62?'close-connector':seconds<66?'close-connector':'descent';
  const u=seconds<46?(seconds-32)/14:seconds<50?(seconds-46)/4:seconds<62?(seconds-50)/12:seconds<66?1:(seconds-66)/14;
  const w=accessWorker(step,u);phase=step;pose={...w,feet:[...w.feet].reverse(),hands:[...w.hands].reverse(),yaw:Math.PI};
 }else if(seconds<112){phase='returning-to-fasteners';pose=path(returning,seconds-80,32/(returning.length-1));}
 else pose=work;
 let wrenchPosition=toolStow,wrenchQuaternion:Q=I;
 const initial=initialEiffelRelayHandoff();
 let activeBolt=-1;
 const cycle=24,startBolts=122;
 const boltMotion=(i:number,t:number)=>{
  const original=initial.bolts[i]!.position,high=add(original,[0,.44,0]);
  const carryStart=add(high,[0,.128,0]),carryEnd:V=[-9.30,F+.88,-3.445];
  const travel=transfer((t-8)/6);
  const u=clamp((t-8)/6);const carry=add(travel.hands[1]!,add(mix(add(carryStart,boltStation.hands[1]!.map(v=>-v)as unknown as V),[0,0,0],smooth(u*4)),mix([0,0,0],add(carryEnd,work.hands[1]!.map(v=>-v)as unknown as V),smooth((u-.75)*4))));
  const position=t<6?add(original,[0,.44*smooth((t-4)/2),0]):t<8?high:t<14?add(carry,[0,-.128,0]):mix(add(carryEnd,[0,-.128,0]),tray(i),smooth((t-14)/3));
  return{position,travel};
 };
 const bolts: EiffelRelayBoltState[]=initial.bolts.map((b,i)=>{
  const t=seconds-(startBolts+i*cycle);if(t<=0)return b;
  const {position}=boltMotion(i,t),stored=t>=17;
  return{...b,turnsReleased:4*smooth(t/4),verticalWithdrawal:.44*smooth((t-4)/2),position,holder:stored?'storage':t>4?'worker':'cart-nut',holderContact:stored?add(position,[0,-.12,0]):t>4?add(position,[0,.128,0]):null};
 });
 if(seconds>=112){
  const toolGrip=add(toolStow,[.12,0,0]);
  const firstHead=add(initial.bolts[0]!.position,[0,.128,0]);
  if(seconds<116){phase='taking-wrench';pose={...work,hands:[mix(work.hands[0]!,toolGrip,smooth((seconds-112)/4)),work.hands[1]!]};}
  else if(seconds<122){phase='carrying-wrench';const u=seconds-116;pose=u<1?work:u<5?transfer(1-(u-1)/4):boltStation;const grip=u<1?mix(add(toolStow,[.12,0,0]),work.hands[0]!,smooth(u)):u<5?pose.hands[0]!:mix(boltStation.hands[0]!,add(firstHead,[.12,0,0]),smooth(u-5));wrenchPosition=add(grip,[-.12,0,0]);pose={...pose,hands:[grip,pose.hands[1]!]};}
  else if(seconds<218){
   phase='removing-fasteners';activeBolt=Math.min(3,Math.floor((seconds-startBolts)/cycle));const t=seconds-startBolts-activeBolt*cycle,b=bolts[activeBolt]!;
   const angle=-b.turnsReleased*2*Math.PI,head=add(b.position,[0,.128,0]);
   if(t<8){pose=boltStation;wrenchPosition=head;wrenchQuaternion=[0,Math.sin(angle/2),0,Math.cos(angle/2)];
    wrenchPosition=mix(head,add(pose.hands[0]!,[-.12,0,0]),smooth((t-6)/2));
    const wrenchHand=add(wrenchPosition,rot([.12,0,0],angle));pose={...pose,hands:[wrenchHand,t<4?mix(pose.hands[1]!,head,smooth(t/4)):head]};
   }else if(t<17){pose=t<14?boltMotion(activeBolt,t).travel:work;wrenchPosition=add(pose.hands[0]!,[-.12,0,0]);pose={...pose,hands:[pose.hands[0]!,head]};}
   else{
    const next=Math.min(3,activeBolt+1),destination=activeBolt<3?boltStation:work;
    pose=activeBolt<3?(t<18?work:t<23?transfer(1-(t-18)/5):boltStation):destination;const target=activeBolt<3?add(initial.bolts[next]!.position,[0,.128,0]):toolStow;
    wrenchPosition=activeBolt<3?(t<23?add(pose.hands[0]!,[-.12,0,0]):mix(add(boltStation.hands[0]!,[-.12,0,0]),target,smooth(t-23))):mix(add(work.hands[0]!,[-.12,0,0]),target,smooth((t-17)/7));
    pose={...pose,hands:[add(wrenchPosition,[.12,0,0]),mix(head,pose.hands[1]!,smooth(t-17))]};
   }
  }else{phase='tool-stowed';pose={...work,hands:[mix(add(toolStow,[.12,0,0]),work.hands[0]!,smooth((seconds-218)/4)),work.hands[1]!]};}
 }
 const carrying=seconds>=116&&seconds<122?Math.min(smooth(seconds-116),1-smooth(seconds-121)):seconds>=122&&seconds<218?(()=>{const t=(seconds-122)%24;return Math.min(smooth((t-6)/2),1-smooth(t-23));})():0;
 if(carrying>0){const oldAngle=2*Math.atan2(wrenchQuaternion[1],wrenchQuaternion[3]),angle=oldAngle+(pose.yaw+Math.PI-oldAngle)*carrying;const grip=pose.hands[0]!;wrenchQuaternion=[0,Math.sin(angle/2),0,Math.cos(angle/2)];wrenchPosition=add(grip,rot([-.12,0,0],angle));}
 const closure=smooth((seconds-50)/5),keeper=smooth((seconds-58)/4),pinOffset=.084*(1-closure),keeperAngle=Math.PI/2*(1-keeper);
 const frame={...initial,phase:seconds<62?'connecting' as const:seconds<122?'tensioning' as const:seconds<218?'unfastening' as const:'ready-to-lift' as const,
  upperWorkerClear:seconds>=80,bolts,secondHoist:{connectorId:'relay-clevis',pinCenter:add(initial.masterOrigin,[0,.104,pinOffset]),pinClosed:pinOffset===0,keeperClosed:keeperAngle===0,ropeSlack:seconds<66?.002*(1-smooth((seconds-62)/4)):0,worldRope}};
 const sample=toEiffelSecondFloorHandoffSample(frame,seconds);pose={...pose,kneeOutward:seconds>=112?(1-smooth((Math.min(...pose.hands.map(p=>p[1]))-F-.6)/.3)):0,kneeSameSide:pose.feet[0]![2]>-4,elbowForward:seconds<32?smooth((seconds-2)/2)*(1-smooth((seconds-28)/4)):seconds<80?smooth((seconds-44)/2)*(1-smooth((seconds-66)/2)):seconds<112?smooth((seconds-80)/2):1};workerRoles??=roles(pose);
 const hardwareRoles=sample.hardwareRoles.filter(r=>!r.role.startsWith('deck-rigger-')).concat(workerRoles);
 return{...sample,hardwareRoles,worker:{id:'long-load-deck-rigger',phase,feet:pose.feet,hands:pose.hands,roles:workerRoles},connector:{pinOffset,keeperAngle},wrench:{role:'relay-wrench',position:wrenchPosition,quaternion:wrenchQuaternion},activeBolt,geometryAdmitted:false as const};
}
