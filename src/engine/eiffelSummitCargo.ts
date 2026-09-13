import {EIFFEL_SUMMIT_CARGO_SIDE,solveEiffelSummitCargoRope} from './eiffelSummitCargoRope';
import {solveEiffelSummitLuff} from './eiffelSummitLuff';
import manifest from '../../public/models/eiffel-construction-kit/tower-kit.manifest.json';
import { composeRigidPoses, interpolateRigidPose, invertRigidPose, rotateRigidVector, type RigidPose, type RigidQuat, type RigidVec3 } from './eiffelRigid';

export const EIFFEL_SUMMIT_CARGO_DURATION = 112;
export type EiffelSummitCargoAssemblyIndex = 1 | 2;
export type EiffelSummitCargoPhase = 'rig-flat'|'upend'|'tackle-hold'|'release-tail'|'axial-yaw'|'exterior-hoist'|'inboard-transfer'|'high-transfer'|'seat'|'landed';
export interface EiffelSummitCargoMember { readonly partId:string; readonly pose:RigidPose; readonly assemblyParentId?:string; }
export interface EiffelSummitCargoSample {
 readonly seconds:number; readonly assembly:EiffelSummitCargoAssemblyIndex; readonly phase:EiffelSummitCargoPhase;
 readonly parentPose:RigidPose; readonly members:readonly EiffelSummitCargoMember[];
 readonly cartPose:RigidPose; readonly tailPivotWorld:RigidVec3; readonly tailEngagement:number;
 readonly upperCollarWorld:RigidVec3; readonly tailCollarWorld:RigidVec3; readonly bridle:{readonly lowerBlockCenter:RigidVec3;readonly lowerEye:RigidVec3;readonly slingEars:readonly[RigidVec3,RigidVec3];readonly fixedLegLength:number;readonly lugBoreRadius:.019};
 readonly jib:{readonly base:RigidVec3;readonly head:RigidVec3;readonly boomLength:5.7;readonly heelOffset:.3;readonly blockSideOffset:number;readonly yaw:number;readonly pitch:number;readonly hookPoint:RigidVec3};
 readonly cable:{readonly pending:true;readonly reason:'actual-mesh-clearance-and-drive-reaction-not-admitted';readonly rope:ReturnType<typeof solveEiffelSummitCargoRope>};
 readonly luff:ReturnType<typeof solveEiffelSummitLuff>;
}
const I:RigidQuat=[0,0,0,1], Q_UP:RigidQuat=[-Math.SQRT1_2,0,0,Math.SQRT1_2];
const START:RigidPose={position:[-6.4701368053,281.0400000036,0],quaternion:I};
const TAIL_LOCAL:RigidVec3=[0,0,-2.0333333333], UPPER_LOCAL:RigidVec3=[0,0,2.0333333333];
const TAIL_WORLD:RigidVec3=[-6.4701368053,281.0400000036,-2.0333333333];
const parts=new Map(manifest.parts.map(part=>[part.id,part]));
const config={
 1:{parent:'summit-crown-m072-c001',children:['summit-crown-m074-c000','summit-crown-m075-c000'],baseY:300.9,clearY:303.1,highY:305.6,finalY:305},
 2:{parent:'summit-crown-m072-c002',children:['summit-crown-m076-c000'],baseY:305.566667,clearY:307.7666564941,highY:310.2666564941,finalY:309.6666564941},
} as const;
const clamp=(x:number)=>Math.max(0,Math.min(1,x)), smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
const ramp=(s:number,a:number,b:number)=>smooth((s-a)/(b-a));
const worldPoint=(pose:RigidPose,local:RigidVec3):RigidVec3=>{const p=rotateRigidVector(pose.quaternion,local);return[pose.position[0]+p[0],pose.position[1]+p[1],pose.position[2]+p[2]]};
const pivotPose=(t:number):RigidPose=>{const q=interpolateRigidPose({position:[0,0,0],quaternion:I},{position:[0,0,0],quaternion:Q_UP},t).quaternion,r=rotateRigidVector(q,TAIL_LOCAL);return{position:[TAIL_WORLD[0]-r[0],TAIL_WORLD[1]-r[1],TAIL_WORLD[2]-r[2]],quaternion:q}};
const lerp=(a:RigidPose,b:RigidPose,t:number)=>interpolateRigidPose(a,b,smooth(t));
function phase(seconds:number):EiffelSummitCargoPhase {if(seconds<8)return'rig-flat';if(seconds<36)return'upend';if(seconds<40)return'tackle-hold';if(seconds<44)return'release-tail';if(seconds<50)return'axial-yaw';if(seconds<76)return'exterior-hoist';if(seconds<88)return'inboard-transfer';if(seconds<103)return'high-transfer';if(seconds<111)return'seat';return'landed'}
export function sampleEiffelSummitCargo(rawSeconds:number,assembly:EiffelSummitCargoAssemblyIndex):EiffelSummitCargoSample{
 const seconds=Math.max(0,Math.min(EIFFEL_SUMMIT_CARGO_DURATION,Number.isFinite(rawSeconds)?rawSeconds:0)),c=config[assembly],parent=parts.get(c.parent)!;
 const upright=pivotPose(1),yawed:RigidPose={position:upright.position,quaternion:(parent.finalPose as unknown as RigidPose).quaternion};
 const exterior:RigidPose={position:[upright.position[0],c.clearY,upright.position[2]],quaternion:yawed.quaternion};
 const near:RigidPose={position:[-2.2,c.clearY,-1.2],quaternion:yawed.quaternion},raised:RigidPose={position:[-2.2,c.highY,-1.2],quaternion:yawed.quaternion},sideHigh:RigidPose={position:[0,c.highY,-1.2],quaternion:yawed.quaternion},axisHigh:RigidPose={position:[0,c.highY,0],quaternion:yawed.quaternion},final:RigidPose={position:[0,c.finalY,0],quaternion:yawed.quaternion};
 let parentPose:RigidPose=START;
 if(seconds<8)parentPose=START; else if(seconds<36)parentPose=pivotPose(ramp(seconds,8,36)); else if(seconds>=36&&seconds<44)parentPose=upright; else if(seconds<50)parentPose=lerp(upright,yawed,(seconds-44)/6); else if(seconds<76)parentPose=lerp(yawed,exterior,(seconds-50)/26); else if(seconds<88)parentPose=lerp(exterior,near,(seconds-76)/12); else if(seconds<94)parentPose=lerp(near,raised,(seconds-88)/6); else if(seconds<98)parentPose=lerp(raised,sideHigh,(seconds-94)/4); else if(seconds<103)parentPose=lerp(sideHigh,axisHigh,(seconds-98)/5); else if(seconds<111)parentPose=lerp(axisHigh,final,(seconds-103)/8); else parentPose=final;
 const tailCollarWorld=worldPoint(parentPose,TAIL_LOCAL),upperCollarWorld=worldPoint(parentPose,UPPER_LOCAL),tailEngagement=seconds<40?1:1-ramp(seconds,40,44);
 const head:RigidVec3=[-.9,c.baseY+6.15,0],hookPoint:RigidVec3=[upperCollarWorld[0],upperCollarWorld[1]+1.8,upperCollarWorld[2]],dx=hookPoint[0]-head[0],dz=hookPoint[2]-head[2],horizontal=Math.hypot(dx,dz),blockSideOffset=EIFFEL_SUMMIT_CARGO_SIDE,projected=Math.sqrt(Math.max(0,horizontal*horizontal-blockSideOffset*blockSideOffset)),boomCosine=(projected-.3)/5.7,boomYaw=Math.atan2(dz,dx)-Math.atan2(blockSideOffset,projected);
 const members:EiffelSummitCargoMember[]=[{partId:c.parent,pose:parentPose},...c.children.map(id=>{const child=parts.get(id)!;const relative=composeRigidPoses(invertRigidPose(parent.finalPose as unknown as RigidPose),child.finalPose as unknown as RigidPose);return{partId:id,assemblyParentId:c.parent,pose:composeRigidPoses(parentPose,relative)}})];
 const lowerEye:RigidVec3=[upperCollarWorld[0],upperCollarWorld[1]+1.61,upperCollarWorld[2]],slingEars:readonly[RigidVec3,RigidVec3]=[worldPoint(parentPose,[-.14,0,2.0333333333]),worldPoint(parentPose,[.14,0,2.0333333333])],fixedLegLength=Math.hypot(.14,1.61);
 const rope=solveEiffelSummitCargoRope({assembly,heel:head,boomYaw,boomPitch:Math.acos(Math.max(-1,Math.min(1,boomCosine))),lowerBlockCenter:hookPoint,tipSideOffset:blockSideOffset,bridleAnchors:slingEars});
 const pitch=Math.acos(Math.max(-1,Math.min(1,boomCosine)));return{seconds,assembly,phase:phase(seconds),parentPose,members,cartPose:{position:[-6.4701368053,280.5899952,0],quaternion:I},tailPivotWorld:TAIL_WORLD,tailEngagement,upperCollarWorld,tailCollarWorld,bridle:{lowerBlockCenter:hookPoint,lowerEye,slingEars,fixedLegLength,lugBoreRadius:.019},jib:{base:[-.9,c.baseY,0],head,boomLength:5.7,heelOffset:.3,blockSideOffset,yaw:boomYaw,pitch,hookPoint},cable:{pending:true,reason:'actual-mesh-clearance-and-drive-reaction-not-admitted',rope},luff:solveEiffelSummitLuff(pitch)};
}
export interface EiffelSummitCargoRoleTransform {readonly role:string;readonly position?:RigidVec3;readonly quaternion?:RigidQuat}
export function eiffelSummitCargoRoleTransforms(sample:EiffelSummitCargoSample):readonly EiffelSummitCargoRoleTransform[]{return[
 {role:'moving-pole',position:[-.9,config[sample.assembly].baseY,0]},
 {role:'cargo-jib-yaw',quaternion:[0,Math.sin(-sample.jib.yaw/2),0,Math.cos(-sample.jib.yaw/2)]},
 {role:'cargo-jib-pitch',position:[.3,0,0],quaternion:[0,0,Math.sin(sample.jib.pitch/2),Math.cos(sample.jib.pitch/2)]},
 {role:'terrace-cargo-cart',position:sample.cartPose.position,quaternion:sample.cartPose.quaternion},
 {role:'cargo-tail-shoe',position:sample.tailPivotWorld},
 {role:'cargo-payload',position:sample.parentPose.position,quaternion:sample.parentPose.quaternion},
 {role:'cargo-upper-collar',position:sample.parentPose.position,quaternion:sample.parentPose.quaternion},
 {role:'cargo-tail-collar',position:sample.parentPose.position,quaternion:sample.parentPose.quaternion},
 {role:'cargo-tail-pin',position:[.6*(1-sample.tailEngagement),.4500048036,-2.0333333333]},
 {role:'cargo-tail-pin-negative',position:[-.6*(1-sample.tailEngagement),.4500048036,-2.0333333333]},
 {role:'cargo-travelling-block',position:sample.jib.hookPoint,quaternion:[0,Math.sin(-sample.jib.yaw/2),0,Math.cos(-sample.jib.yaw/2)]},
 {role:'cargo-drum-carriage',position:sample.cable.rope.winding.drumCenter},
 {role:'cargo-winch-drum',position:sample.cable.rope.winding.drumCenter,quaternion:[Math.sin(sample.cable.rope.winding.drumRotation/2),0,0,Math.cos(sample.cable.rope.winding.drumRotation/2)]},
 {role:'cargo-output-shaft',quaternion:[Math.sin(sample.cable.rope.winding.drumRotation/2),0,0,Math.cos(sample.cable.rope.winding.drumRotation/2)]},
 {role:'cargo-output-gear',quaternion:[Math.sin(sample.cable.rope.winding.drumRotation/2),0,0,Math.cos(sample.cable.rope.winding.drumRotation/2)]},
 {role:'cargo-input-crank',quaternion:[Math.sin(-sample.cable.rope.winding.drumRotation),0,0,Math.cos(-sample.cable.rope.winding.drumRotation)]},
 {role:'cargo-ratchet-wheel',quaternion:[Math.sin(sample.cable.rope.winding.drumRotation/2),0,0,Math.cos(sample.cable.rope.winding.drumRotation/2)]},
 {role:'cargo-traverse-cam',quaternion:[Math.sin(sample.cable.rope.winding.camRotation/2),0,0,Math.cos(sample.cable.rope.winding.camRotation/2)]},
 {role:'cargo-traverse-follower',quaternion:[0,Math.sin(Math.atan2(sample.cable.rope.winding.followerTangent[0],sample.cable.rope.winding.followerTangent[2])/2),0,Math.cos(Math.atan2(sample.cable.rope.winding.followerTangent[0],sample.cable.rope.winding.followerTangent[2])/2)]},
 {role:'cargo-luff-drum',quaternion:[0,0,Math.sin(sample.luff.drive.drumAngle/2),Math.cos(sample.luff.drive.drumAngle/2)]},
 {role:'cargo-luff-input',quaternion:[0,0,Math.sin(-sample.luff.drive.drumAngle),Math.cos(-sample.luff.drive.drumAngle)]},
]}
