import receiver from '../../artifacts/eiffel-face-transfer-2026-09-08/receiver-design.json';
import {sampleEiffelFacePackageLift,EIFFEL_FACE_PACKAGE_HOOK_LOCAL,EIFFEL_FACE_PACKAGE_LIFT_CONTEXT} from './eiffelFacePackageLift';
import {interpolateRigidPose,transformRigidPoint,type RigidPose,type RigidVec3 as V} from './eiffelRigid';
const high=sampleEiffelFacePackageLift(42),seat:RigidPose={position:[...receiver.seat.position] as unknown as V,quaternion:[0,0,0,1]};
const turned:RigidPose={position:high.pose.position,quaternion:seat.quaternion};
const above:RigidPose={position:[seat.position[0],high.pose.position[1],seat.position[2]],quaternion:seat.quaternion};
const smooth=(v:number)=>{const t=Math.min(1,Math.max(0,v));return t*t*t*(10+t*(-15+6*t));};
export const EIFFEL_FACE_PACKAGE_TRANSFER_DURATION=82;
/** Geometry-only, quasi-static lateral transfer. No claim of pendulum dynamics,
 * stock extraction, joint installation or rated receiver strength. */
export function sampleEiffelFacePackageTransfer(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Transfer time must be finite');
 const seconds=Math.max(0,Math.min(82,rawSeconds)),base=sampleEiffelFacePackageLift(Math.min(seconds,42));
 let pose:RigidPose=base.pose;
 if(seconds>42&&seconds<=48)pose=interpolateRigidPose(high.pose,turned,smooth((seconds-42)/6));
 else if(seconds>48&&seconds<=64)pose=interpolateRigidPose(turned,above,smooth((seconds-48)/16));
 else if(seconds>64)pose=interpolateRigidPose(above,seat,smooth((seconds-64)/12));
 const hook=transformRigidPoint(pose,EIFFEL_FACE_PACKAGE_HOOK_LOCAL),heel=[46.64454364826301,16.3,-46.64454364826301];
 const dx=hook[0]-heel[0]!,dz=hook[2]-heel[2]!,reach=Math.hypot(dx,dz),yaw=Math.atan2((dx+dz)*Math.SQRT1_2,(-dx+dz)*Math.SQRT1_2);
 const tip:V=[hook[0],heel[1]!+Math.sqrt(180-reach*reach),hook[2]];
 const phase=seconds<=42?base.phase:seconds<48?'aligning-tray' as const:seconds<64?'transferring' as const:seconds<76?'lowering-to-deck' as const:'seated-on-receiver' as const;
 const deckReaction=seconds<76?0:EIFFEL_FACE_PACKAGE_LIFT_CONTEXT.massKg*9.81*.8*smooth((seconds-76)/2);
 return {...base,seconds,pose,hook,centerOfMass:transformRigidPoint(pose,EIFFEL_FACE_PACKAGE_LIFT_CONTEXT.centerOfMass),phase,
  support:seconds<=2?'cart' as const:seconds<76?'four-leg-bridle' as const:'receiver-and-bridle' as const,
  deckReaction,crane:{...base.crane,reach,yaw,tip,hoistRopeLength:tip[1]-hook[1]},
  // Base force values are deliberately not exported during lateral motion.
  slings:undefined,forceResidual:undefined,acceleration:undefined,
 };
}
