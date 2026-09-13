import audit from '../../artifacts/eiffel-face-package-2026-09-08/crane-column-audit.json';
import measurement from '../../artifacts/eiffel-face-package-2026-09-08/package-measurements.json';
import routes from '../../artifacts/eiffel-joint-campaign-2026-09-07/campaign-routes.json';
import {transformRigidPoint,type RigidPose,type RigidVec3 as V} from './eiffelRigid';

const column=audit.reports[0]!;
const v=(a:readonly number[]):V=>[a[0]!,a[1]!,a[2]!];
const rotation=[column.pickup.quaternion[0]!,column.pickup.quaternion[1]!,column.pickup.quaternion[2]!,column.pickup.quaternion[3]!] as const;
export const EIFFEL_FACE_PACKAGE_LIFT_DURATION=46;
export const EIFFEL_FACE_PACKAGE_HOIST_INTERVAL=[2,42] as const;
export const EIFFEL_FACE_PACKAGE_HOOK_LOCAL=v(column.hookLocal);
/** Geometry study only: transfer, unloading, fastening and main kit promotion
 * are separate gates. The cart starts parked and the bridle starts attached. */
export const EIFFEL_FACE_PACKAGE_LIFT_CONTEXT={
  productionAdmitted:false,sourceGLBSHA256:audit.sourceGLBSHA256,
  massKg:measurement.massKg,centerOfMass:v(measurement.centerOfMass),
  duration:EIFFEL_FACE_PACKAGE_LIFT_DURATION,
  setup:'Starts with the tray supported on the parked ground cart and the bridle attached. Stock loading and rigging are not reconstructed.',
} as const;
export function sampleEiffelFacePackageLift(rawSeconds:number){
  if(!Number.isFinite(rawSeconds))throw Error('Package lift time must be finite');
  const seconds=Math.max(0,Math.min(EIFFEL_FACE_PACKAGE_LIFT_DURATION,rawSeconds));
  const t=Math.max(0,Math.min(1,(seconds-2)/40));
  const progress=t*t*t*(10+t*(-15+6*t));
  const travel=column.high.position[1]!-column.pickup.position[1]!;
  const y=column.pickup.position[1]!+travel*progress;
  const pose:RigidPose={position:[column.pickup.position[0]!,y,column.pickup.position[2]!],quaternion:rotation};
  const hook=transformRigidPoint(pose,EIFFEL_FACE_PACKAGE_HOOK_LOCAL);
  const com=transformRigidPoint(pose,EIFFEL_FACE_PACKAGE_LIFT_CONTEXT.centerOfMass);
  const acceleration=seconds>2&&seconds<42?travel*(60*t-180*t*t+120*t*t*t)/(40*40):0;
  // The initially taut bridle takes over the cart reaction before lift-off.
  const takeup=Math.min(1,seconds/2),loadShare=.2+.8*takeup*takeup*(3-2*takeup);
  const cartReaction=measurement.massKg*9.81*(1-loadShare);
  const endpoints:V[]=[[-.244,.304,-.5],[-.244,.304,.5],[.244,.304,-.5],[.244,.304,.5]];
  const slings=endpoints.map((local,i)=>{
    const end=transformRigidPoint(pose,local),length=Math.hypot(...hook.map((x,k)=>x-end[k]!));
    const verticalForce=measurement.massKg*(9.81+acceleration)*loadShare*measurement.bridle.verticalLoadFractions[i]!;
    const tension=verticalForce/((hook[1]-end[1])/length);
    return {start:hook,end,length,tension,force:hook.map((x,k)=>(x-end[k]!)/length*tension) as unknown as V};
  });
  const total=slings.reduce((sum,s)=>sum.map((x,k)=>x+s.force[k]!) as unknown as V,[0,0,0] as V);
  return {seconds,progress,pose,hook,centerOfMass:com,acceleration,slings,cartReaction,
    forceResidual:[total[0],total[1]+cartReaction-measurement.massKg*(9.81+acceleration),total[2]] as V,
    support:seconds<=2?'cart' as const:'four-leg-bridle' as const,
    phase:seconds<=2?'parked-and-rigged' as const:seconds<42?'hoisting' as const:'held-for-transfer' as const,
    cart:{position:[column.pickup.position[0]!,0,column.pickup.position[2]!] as V,quaternion:rotation},
    crane:{root:v(routes.station.root),rootYaw:-Math.PI/4,reach:column.reach,yaw:column.yawDegrees*Math.PI/180,tip:v(column.tip),hoistRopeLength:column.tip[1]!-hook[1]},
  };
}
