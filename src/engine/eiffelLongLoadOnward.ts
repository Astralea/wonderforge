import closedSling from '../../artifacts/eiffel-closed-sling-2026-09-08/design.json';
import design from '../../artifacts/eiffel-long-load-onward-2026-09-08/design.json';
import {EIFFEL_FIRST_FLOOR_Y} from './eiffelFirstFloorSupply';
import {sampleEiffelMasterLinkHoist} from './eiffelMasterLinkHoist';
import {eiffelSupplyPusherAt} from './eiffelSupplyPusher';
import {eiffelLongLoadWorkerRoles} from './eiffelLongLoadWorkerPose';
import {sampleEiffelOnwardHatchWorker as hatchWorker} from './eiffelOnwardHatchWorker';
import type {RigidQuat,RigidVec3 as V} from './eiffelRigid';

export const EIFFEL_LONG_LOAD_ONWARD_START=128;
export const EIFFEL_LONG_LOAD_ONWARD_DURATION=280;
export const EIFFEL_LONG_LOAD_ONWARD_DISTANCE=13;
export const EIFFEL_LONG_LOAD_CART_WHEEL_RADIUS=.12;

export type EiffelLongLoadOnwardPhase='hoisting'|'fastening'|'climbing'|'unloading-clevis'|'releasing-clevis'|'retracting-clevis'|'descending'|'closing-hatch'|'regripping'|'crossing'|'chocking';
export interface EiffelOnwardRolePose {readonly role:string;readonly position?:V;readonly quaternion?:RigidQuat}
export interface EiffelOnwardContact {readonly kind:'deck'|'rung'|'bolt'|'keeper'|'pin'|'hatch-handle'|'cart-handle'|'chock';readonly point:V;readonly active:boolean}
export interface EiffelOnwardWorker {readonly id:string;readonly job:string;readonly feet:readonly V[];readonly hands:readonly V[];readonly contacts:readonly EiffelOnwardContact[];readonly bodyX?:number}

const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
const add=(a:readonly number[],b:readonly number[]):V=>a.map((v,i)=>v+b[i]!) as unknown as V;
const translate=(points:readonly (readonly number[])[],delta:V)=>points.map(p=>add(p,delta));
const F=EIFFEL_FIRST_FLOOR_Y;
const LANDED=sampleEiffelMasterLinkHoist(128,{...closedSling,hoistEnd:design.hoistEnd});
const IDENTITY:RigidQuat=[0,0,0,1];

function phaseAt(seconds:number):EiffelLongLoadOnwardPhase{
 if(seconds<128)return'hoisting';if(seconds<154)return'fastening';if(seconds<168)return'climbing';if(seconds<172)return'unloading-clevis';if(seconds<180)return'releasing-clevis';if(seconds<184)return'retracting-clevis';if(seconds<198)return'descending';if(seconds<206)return'closing-hatch';if(seconds<212)return'regripping';if(seconds<272)return'crossing';return'chocking';
}
function deckWorker(seconds:number):EiffelOnwardWorker{
 const initialChock:V=[-21.146,F+.20,-4.38],lastIdle:V=[-21.55,F+.72,-3.64];
 if(seconds>=198&&seconds<206){const hand=seconds<202?lastIdle:mix3(lastIdle,initialChock,smooth((seconds-202)/4)),start0:V=[-21.66,F,-3.34],start1:V=[-21.44,F,-3.34],mid0:V=[-21.51,F,-4.03],mid1:V=[-21.56,F,-3.91],end0:V=[-21.355,F,-4.72],end1:V=[-21.68,F,-4.48],segment=Math.min(3,Math.floor((seconds-198)/2)),p=smooth(((seconds-198)-segment*2)/2);let feet:readonly V[];if(segment===0)feet=[mix3(start0,mid0,p),start1];else if(segment===1)feet=[mid0,mix3(start1,mid1,p)];else if(segment===2)feet=[mix3(mid0,end0,p),mid1];else feet=[end0,mix3(mid1,end1,p)];return{id:'long-load-deck-rigger',job:'reaching-chock',feet,hands:[hand,hand],contacts:[{kind:'chock',point:initialChock,active:seconds>=205.9}]};}
 if(seconds>=206){const distance=EIFFEL_LONG_LOAD_ONWARD_DISTANCE*smooth((seconds-212)/60),cart:V=[-21.5+distance,F,-4],place=smooth((seconds-272)/8),lift=smooth((seconds-206)/6),carried:V=[cart[0]+.05,F+.78,-4.62],final:V=[cart[0]+.354,F+.20,-4.38],hand=seconds<212?mix3(initialChock,carried,lift):mix3(carried,final,place),gait=eiffelSupplyPusherAt(cart,distance,Math.max(0,seconds-212),66).feet.map(foot=>[foot.center[0]+1.2,foot.center[1]-.06,foot.center[2]-.6]as V);return{id:'long-load-deck-rigger',job:seconds<272?'carrying-chock':'placing-chock',feet:gait,hands:[hand,hand],contacts:[{kind:'chock',point:hand,active:true}]};}
 const slot=clamp((seconds-128)/6.5,0,4),bolt=Math.min(3,Math.floor(slot)),within=slot-bolt,pose=boltPose(bolt,seconds,[-21.5,F,-4]),target:V=[pose.position[0],pose.position[1]+design.bolts.headOffsetY,pose.position[2]],working=seconds<154&&within<5/6.5;
 const next=bolt<3?indexSafe(bolt+1):lastIdle,station=within<=5/6.5?target:mix3(target,next,smooth((within-5/6.5)/(1.5/6.5)));
 const south=station[2]<=-4,feet:readonly V[]=[[station[0]-.11,F,station[2]+(south?-.30:.30)],[station[0]+.11,F,station[2]+(south?-.30:.30)]];
 const hand=working?target:station;
 return{id:'long-load-deck-rigger',job:working?'fastening':'clear',feet,hands:[hand,hand],contacts:[{kind:'bolt',point:target,active:working}]};
}
function indexSafe(index:number):V{const stored=design.bolts.storedCenters[Math.min(3,index)]!;return[stored[0],stored[1]+design.bolts.headOffsetY,stored[2]];}
function mix3(a:V,b:V,t:number):V{return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function boltPose(index:number,seconds:number,cart:V){const local=clamp(seconds-(128+index*6.5),0,5),stored=design.bolts.storedCenters[index] as unknown as V,xz=design.bolts.pointsXZ[index]!,final:V=[cart[0]+xz[0]!,F+design.bolts.centerY,cart[2]+xz[1]!],aboveStored:V=[stored[0],F+.75,stored[2]],aboveFinal:V=[final[0],F+.75,final[2]],position=local<2?mix3(stored,aboveStored,smooth(local/2)):local<3?mix3(aboveStored,aboveFinal,smooth(local-2)):mix3(aboveFinal,final,smooth((local-3)/2)),angle=8*Math.PI*smooth((local-3)/2);return{position,quaternion:[0,Math.sin(angle/2),0,Math.cos(angle/2)]as RigidQuat};}
function wrenchPose(seconds:number,deck:EiffelOnwardWorker):EiffelOnwardRolePose{const stowed:V=[-22,F+.48,-4.55],position=seconds<154?deck.hands[0]!:seconds<160?mix3(deckWorker(154).hands[0]!,stowed,smooth((seconds-154)/6)):stowed,index=Math.min(3,Math.floor(clamp((seconds-128)/6.5,0,3)));return{role:'fastening-wrench',position,quaternion:seconds<154?boltPose(index,seconds,[-21.5,F,-4]).quaternion:IDENTITY};}
function upperWorker(seconds:number):EiffelOnwardWorker{
 const ladderFeet=(progress:number)=>{const heights=[0,...design.scaffold.rungHeights.map(height=>height+.018)],steps=(heights.length-1)*2,q=clamp(progress)*steps,k=Math.min(steps-1,Math.floor(q)),f=smooth(q-k),level=Math.floor(k/2),moving=k%2;const a=heights[Math.min(heights.length-1,level+(moving===0?1:0))]!,b=heights[Math.min(heights.length-1,level+(moving===1?1:0))]!;return moving===0?[heights[level]!+(a-heights[level]!)*f,heights[level]!]as const:[heights[Math.min(heights.length-1,level+1)]!,heights[level]!+(b-heights[level]!)*f]as const;};
 let x=-22.73,bodyX=-22.90,heights:readonly[number,number]=[0,0];
 if(seconds>=154&&seconds<166)heights=ladderFeet((seconds-154)/12);
 else if(seconds>=166&&seconds<168){const p=smooth((seconds-166)/2);x=-22.73+.68*p;bodyX=-22.90+.85*p;heights=[5.838-.018*p,5.838-.018*p];}
 else if(seconds>=168&&seconds<184){x=-22.05;bodyX=-22.05;heights=[5.82,5.82];}
 else if(seconds>=184&&seconds<186){const p=smooth((seconds-184)/2);x=-22.05-.68*p;bodyX=-22.05-.85*p;heights=[5.82+.018*p,5.82+.018*p];}
 else if(seconds>=186&&seconds<198)heights=ladderFeet(1-(seconds-186)/12);
 const onLadder=(seconds>=154&&seconds<166)||(seconds>=186&&seconds<198),z=-4,feet:readonly V[]=[[x,F+heights[0],z-.12],[x,F+heights[1],z+.12]];
 const topHands:readonly[V,V]=[[-22.65,F+6.7,z-.2],[-22.65,F+6.7,z+.2]],brace:V=[-22.1,F+6.74,-4.67],keeper:V=add(LANDED.masterOrigin,design.clevis.keeperPivot),pin=(withdraw:number):V=>add(LANDED.masterOrigin,[design.clevis.pinCenter[0],.102,design.clevis.pinHeadZ+withdraw]);
 const waitingHands:readonly[V,V]=[[-22.65,F+1.2,z-.2],[-22.65,F+1.2,z+.2]];
 let kind:EiffelOnwardContact['kind']='rung',active=seconds>=154&&seconds<198,hands:readonly V[]=waitingHands;
 if(onLadder){const [h0,h1]=ladderFeet(seconds<166?(seconds-154)/12:1-(seconds-186)/12),leftY=F+Math.min(6.7,h0+1.2),rightY=F+Math.min(6.7,h1+1.2);hands=[[-22.65,leftY,z-.2],[-22.65,rightY,z+.2]];}
 else if(seconds>=166&&seconds<168){const p=smooth((seconds-166)/2);hands=[mix3(topHands[0],brace,p),mix3(topHands[1],keeper,p)];}
 else if(seconds>=168&&seconds<175){kind='keeper';const p=smooth((seconds-172)/3);hands=[brace,mix3(keeper,pin(0),p)];}
 else if(seconds>=175&&seconds<180){kind='pin';hands=[brace,pin(design.clevis.pinWithdrawal*smooth((seconds-175)/5))];}
 else if(seconds>=180&&seconds<184){const p=smooth((seconds-180)/4);hands=[brace,mix3(pin(design.clevis.pinWithdrawal),topHands[1],p)];}
 else if(seconds>=184&&seconds<186){const p=smooth((seconds-184)/2);hands=[mix3(brace,topHands[0],p),topHands[1]];}
 return{id:'long-load-upper-rigger',job:phaseAt(seconds),feet,hands,contacts:hands.map(point=>({kind,point,active})),bodyX};
}
/** Addon roots exist before the onward phase: the connector and saddle follow
 * the moving hoist while deck hardware waits on its authored holders. */
export function eiffelLongLoadPreparedRoles(carrierOrigin:V,masterOrigin:V):readonly EiffelOnwardRolePose[]{
 const waitingDeck=deckWorker(128),waitingUpper=upperWorker(128),waitingHatch=hatchWorker(128),waitingPusher=eiffelSupplyPusherAt(design.cartOrigin as unknown as V,0,0,66,-.92);
 return[
  {role:design.clevis.role,position:masterOrigin},
  {role:design.clevis.pinRole,position:design.clevis.pinCenter as unknown as V},
  {role:design.clevis.keeperRole,position:design.clevis.keeperPivot as unknown as V,quaternion:IDENTITY},
  {role:design.saddle.role,position:carrierOrigin,quaternion:IDENTITY},
  {role:design.hatch.handleRole,position:design.hatch.pivot as unknown as V,quaternion:[Math.SQRT1_2,0,0,Math.SQRT1_2]},
  {role:'cart-chock',position:[design.cartOrigin[0]+.354,F,design.cartOrigin[2]-.38]},
  ...design.bolts.roles.map((role,index)=>({role,position:design.bolts.storedCenters[index] as unknown as V})),
  wrenchPose(128,waitingDeck),
  ...eiffelLongLoadWorkerRoles('deck-rigger',waitingDeck),...eiffelLongLoadWorkerRoles('rigger',waitingUpper),...eiffelLongLoadWorkerRoles('hatch-worker',waitingHatch),
  ...waitingPusher.parts.map(part=>({role:`pusher-${part.id}`,position:part.center,quaternion:part.quaternion})),
 ];
}

/** Pure continuation after the reviewed hoist. All rigid hardware remains
 * present; role poses move it between authored holders instead of toggling it. */
export function sampleEiffelLongLoadOnward(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Eiffel long-load onward time must be finite');
 const seconds=clamp(rawSeconds,EIFFEL_LONG_LOAD_ONWARD_START,EIFFEL_LONG_LOAD_ONWARD_DURATION);
 const progress=smooth((seconds-212)/60),distance=EIFFEL_LONG_LOAD_ONWARD_DISTANCE*progress,delta:V=[distance,0,0];
 const cart:V=[-21.5+distance,F,-4],carrierOrigin=add(LANDED.carrierOrigin,delta),masterOrigin=add(LANDED.masterOrigin,delta);
 const unloading=smooth((seconds-168)/4),keeperAngle=Math.PI/2*smooth((seconds-172)/3),pinOffset=design.clevis.pinWithdrawal*smooth((seconds-175)/5),ropeRetraction=design.clevis.retraction*smooth((seconds-180)/4);
 const hookReleased=seconds>=180,slingSupport=seconds<172?'hoist' as const:'carrier-saddle' as const;
 const clevisY=-design.clevis.unloadDrop*unloading+ropeRetraction,hoistTerminationPoint=add(LANDED.hoistTermination,[0,clevisY,0]);
 const worldRope=LANDED.worldRope.map((p,i)=>i===LANDED.worldRope.length-1?hoistTerminationPoint:[...p] as unknown as V);
 const worldSlings=LANDED.worldSlings.map(strand=>translate(strand,delta));
 const hatchAngle=Math.PI/2*(1-smooth((seconds-198)/8));
 const completedBolts=Math.min(4,Math.floor(Math.max(0,seconds-128)/6.5+1e-9));
 const deck=deckWorker(seconds),chockInitial:V=[cart[0]+.354,F,cart[2]-.38],chockPosition=seconds<206?chockInitial:add(deck.hands[0]!,[0,-.20,0]);
 const roles:EiffelOnwardRolePose[]=[
  {role:design.clevis.role,position:add(LANDED.masterOrigin,[0,clevisY,0])},
  {role:design.clevis.pinRole,position:[design.clevis.pinCenter[0],design.clevis.pinCenter[1],design.clevis.pinCenter[2]+pinOffset]},
  {role:design.clevis.keeperRole,position:design.clevis.keeperPivot as unknown as V,quaternion:[0,Math.sin(keeperAngle/2),0,Math.cos(keeperAngle/2)]},
  {role:design.saddle.role,position:carrierOrigin,quaternion:IDENTITY},
  {role:design.hatch.handleRole,position:design.hatch.pivot as unknown as V,quaternion:[Math.sin(hatchAngle/2),0,0,Math.cos(hatchAngle/2)]},
  {role:'cart-chock',position:chockPosition},
  ...design.bolts.roles.map((role,index)=>({role,...boltPose(index,seconds,cart)})),
  wrenchPose(seconds,deck),
 ];
 const pusherSeconds=Math.max(0,seconds-206),pusher=eiffelSupplyPusherAt(cart,distance,pusherSeconds,66,-.92);
 roles.push(...eiffelLongLoadWorkerRoles('deck-rigger',deck),...eiffelLongLoadWorkerRoles('rigger',upperWorker(seconds)),...eiffelLongLoadWorkerRoles('hatch-worker',hatchWorker(seconds)),...pusher.parts.map(part=>({role:`pusher-${part.id}`,position:part.center,quaternion:part.quaternion})));
 return{seconds,phase:phaseAt(seconds),partId:LANDED.partId,ownsPayload:true as const,carrierOrigin,masterOrigin,
  trolleyZ:LANDED.trolleyZ,drumAngle:LANDED.drumAngle-clevisY/.30,sheaveAngle:LANDED.sheaveAngle-clevisY/.25,wheelAngle:LANDED.wheelAngle,
  worldRope,worldSlings,worldHook:hoistTerminationPoint,hoistTermination:hoistTerminationPoint,
  onward:{phase:phaseAt(seconds),cart:{position:cart,distance,wheelAngle:-distance/EIFFEL_LONG_LOAD_CART_WHEEL_RADIUS,moving:seconds>=212&&seconds<272,chocked:seconds<206||seconds>=276},hatchAngle,hookReleased,slingSupport,
   connector:{unloading,pinOffset,keeperAngle,ropeRetraction},fastening:{completedBolts,activeBolt:seconds<154?Math.min(3,Math.floor((seconds-128)/6.5)):null},roles,
   deckRigger:deckWorker(seconds),upperRigger:upperWorker(seconds),hatchWorker:hatchWorker(seconds),pusher},
  released:hookReleased,productionReady:false as const};
}
