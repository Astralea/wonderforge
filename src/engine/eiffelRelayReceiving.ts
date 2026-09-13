import type {RigidVec3} from './eiffelRigid';
export const EIFFEL_RELAY_RECEIVING_DURATION=32;
const initialDistance=Math.hypot(3.45,2.66),initialRatio=.05/initialDistance,initialSide=Math.sqrt(1-initialRatio**2);
const initialAngle=Math.atan2(initialRatio*2.66/initialDistance+initialSide*3.45/initialDistance,initialRatio*3.45/initialDistance-initialSide*2.66/initialDistance);
const initialLength=Math.sqrt(initialDistance**2-.05**2)+.25*initialAngle+8.11;
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** A receiving-station excerpt, not the omitted lower-floor supply chain. */
export function sampleEiffelRelayReceiving(rawSeconds:number){
 if(!Number.isFinite(rawSeconds))throw Error('Relay time must be finite');
 const seconds=Math.max(0,Math.min(32,rawSeconds));
 const trolleyZ=-2.05-1.8*ease((seconds-16)/8);
 const y=190.9+7.2*ease(seconds/12)-.2*ease((seconds-24)/4);
 const cargo:RigidVec3=[0,y,trolleyZ+.25];
 return {seconds,phase:seconds<12?'hoist':seconds<16?'hold':seconds<24?'transfer':seconds<28?'lower':'received',...eiffelRelayRigAt(cargo,trolleyZ)};
}
/** Shared rigid rig geometry for both the receiving excerpt and its lower supply. */
export function eiffelRelayRigAt(cargo:RigidVec3,trolleyZ:number, profile?:{sheaveY:number;referenceCargoY:number}){
 const y=cargo[1];
 const hook:RigidVec3=[0,y+1.45,cargo[2]];
 const drum:RigidVec3=[0,197.8,-5.5],sheave:RigidVec3=[0,profile?.sheaveY??200.46,trolleyZ];
 // Common external tangent in the Z/Y plane, followed by the upper sheave arc.
 const dz=sheave[2]-drum[2],dy=sheave[1]-drum[1],distance=Math.hypot(dz,dy);
 const ratio=(.30-.25)/distance,side=Math.sqrt(1-ratio*ratio);
 const nz=ratio*dz/distance-side*dy/distance,ny=ratio*dy/distance+side*dz/distance;
 const angle=Math.atan2(ny,nz);
 const rope:RigidVec3[]=[[0,drum[1]+ny*.30,drum[2]+nz*.30]];
 for(let i=0;i<=32;i++){const a=angle*(1-i/32);rope.push([0,sheave[1]+.25*Math.sin(a),sheave[2]+.25*Math.cos(a)]);}
 rope.push(hook);
 const deployedLength=Math.sqrt(distance*distance-.05*.05)+.25*angle+(sheave[1]-hook[1]);
 const referenceLength=profile ? eiffelRelayRigReferenceLength(profile.sheaveY,profile.referenceCargoY) : initialLength;
 return {cargo,hook,trolleyZ,rope,deployedLength,wheelAngle:(trolleyZ+2.05)/.115,drumAngle:(deployedLength-referenceLength)/.30,sheaveAngle:-(y-(profile?.referenceCargoY??190.9))/.25,
  slings:[[[0,hook[1],hook[2]],[-.22,y+.9,cargo[2]]] as RigidVec3[],[[0,hook[1],hook[2]],[.22,y+.9,cargo[2]]] as RigidVec3[]],
  productionReady:false as const};
}

function eiffelRelayRigReferenceLength(sheaveY:number,cargoY:number){
 const dz=3.45,dy=sheaveY-197.8,distance=Math.hypot(dz,dy),ratio=.05/distance,side=Math.sqrt(1-ratio*ratio);
 const angle=Math.atan2(ratio*dy/distance+side*dz/distance,ratio*dz/distance-side*dy/distance);
 return Math.sqrt(distance*distance-.05*.05)+.25*angle+sheaveY-(cargoY+1.45);
}
