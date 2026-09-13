import { eiffelTerrainHeightAt } from './eiffelTerrain';
import { sampleEiffelGroundLiftPilot } from './eiffelGroundLiftPilot';
import type { RigidQuat, RigidVec3 as V } from './eiffelRigid';

export type EiffelGroundRiggerPhase = 'waiting' | 'reach' | 'clip' | 'release' | 'clear';
export interface EiffelGroundRiggerLimb { readonly start: V; readonly joint: V; readonly end: V }
export type EiffelGroundRiggerId = 'ground-slinger-north' | 'ground-slinger-south';
export interface EiffelGroundRiggerWorker {
  readonly id: EiffelGroundRiggerId;
  readonly job: 'ground-slinger';
  readonly phase: EiffelGroundRiggerPhase;
  readonly leftFoot: EiffelGroundRiggerFoot;
  readonly rightFoot: EiffelGroundRiggerFoot;
  readonly leftLeg: EiffelGroundRiggerLimb;
  readonly rightLeg: EiffelGroundRiggerLimb;
  readonly hip: V;
  readonly shoulderCenter: V;
  readonly torso: readonly [V, V];
  readonly head: { readonly center: V; readonly radius: number };
  readonly arms: { readonly left: EiffelGroundRiggerArm; readonly right: EiffelGroundRiggerArm };
  readonly contact: EiffelGroundRiggerContact;
}
export interface EiffelGroundRiggerSample {
  readonly seconds: number;
  readonly phase: EiffelGroundRiggerPhase;
  readonly workers: readonly [EiffelGroundRiggerWorker, EiffelGroundRiggerWorker];
}
export interface EiffelGroundRiggerFoot {readonly center:V;readonly size:V;readonly quaternion:RigidQuat}
export interface EiffelGroundRiggerArm {readonly shoulder:V;readonly elbow:V;readonly hand:V;readonly upperLength:.38;readonly forearmLength:.4}
export interface EiffelGroundRiggerContact {readonly kind:'none'|'loose-sling-end'|'pickup-lug';readonly target:V|null;readonly residual:number|null}
const add=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a:V,s:number):V=>[a[0]*s,a[1]*s,a[2]*s];
const mix=(a:V,b:V,t:number):V=>add(a,mul(sub(b,a),t)); const clamp=(x:number)=>Math.max(0,Math.min(1,x)); const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
function arm(shoulder:V,hand:V,bend:number):EiffelGroundRiggerArm{
  const upperLength=.38 as const,forearmLength=.4 as const;
  const delta=sub(hand,shoulder),distance=Math.hypot(...delta);if(distance>upperLength+forearmLength+1e-9||distance<forearmLength-upperLength-1e-9)throw new Error(`Ground rigger hand target is unreachable (${distance.toFixed(3)} m)`);
  const direction=mul(delta,1/distance),along=(upperLength**2-forearmLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,upperLength**2-along**2));
  let perpendicular:V=[-direction[1],direction[0],0];const n=Math.hypot(...perpendicular);if(n<1e-6)perpendicular=[0,0,bend];else perpendicular=mul(perpendicular,bend/n);
  const elbow=add(add(shoulder,mul(direction,along)),mul(perpendicular,height));return{shoulder,elbow,hand,upperLength,forearmLength};
}
function worker(index: 0 | 1, seconds: number, phase: EiffelGroundRiggerPhase): EiffelGroundRiggerWorker {
  const lift=sampleEiffelGroundLiftPilot(seconds),lug=lift.rigging.lugs[index]!,loose=lift.rigging.slings[index]!.points[2];
  // Crew stations are authored from the pickup pose, never from the moving load.
  const z=sampleEiffelGroundLiftPilot(14).rigging.lugs[index]![2],x=54.2,ground=eiffelTerrainHeightAt(x,z),hip:V=[54.2,ground+.98,z];
  const lean=smooth((seconds-12)/1)*(1-smooth((seconds-14)/.8)),shoulder:V=[54.05+(53.57-54.05)*lean,ground+1.55,z];
  const waist:V=[54.2,ground+1.19,z],clearHand:V=[54.08,ground+1.22,z+(index?-.18:.18)];let target=clearHand;let kind:EiffelGroundRiggerContact['kind']='none';
  if (seconds >= 12 && seconds < 13) target = mix(clearHand, loose, smooth(seconds - 12));
  else if(seconds>=13&&seconds<14){target=loose;kind='loose-sling-end';}
  else if(seconds===14){target=lug;kind='pickup-lug';}
  else if(seconds>14&&seconds<14.6){target=mix(lug,clearHand,smooth((seconds-14)/.6));}
  const working=arm(shoulder,target,-1),idleShoulder:V=[shoulder[0],shoulder[1],shoulder[2]+(index?-.12:.12)],idleHand:V=[54.1,ground+1.3,z+(index?-.26:.26)],idle=arm(idleShoulder,idleHand,1);
  const foot=(dz:number):EiffelGroundRiggerFoot=>({center:[54.22,eiffelTerrainHeightAt(54.22,z+dz)+.06,z+dz],size:[.28,.12,.14],quaternion:[0,0,0,1]});
  const leftFoot=foot(-.18),rightFoot=foot(.18),knee=(f:EiffelGroundRiggerFoot,side:number):V=>[(f.center[0]+hip[0])/2,ground+.48,(f.center[2]+hip[2])/2+side*.04];
  const leftLeg={start:leftFoot.center,joint:knee(leftFoot,-1),end:[hip[0],hip[1],hip[2]-.1] as V},rightLeg={start:rightFoot.center,joint:knee(rightFoot,1),end:[hip[0],hip[1],hip[2]+.1] as V};
  return{id:index?'ground-slinger-south':'ground-slinger-north',job:'ground-slinger',phase,leftFoot,rightFoot,leftLeg,rightLeg,hip,shoulderCenter:shoulder,torso:[waist,shoulder],head:{center:[shoulder[0]-.08,ground+1.77,z],radius:.17},arms:index?{left:idle,right:working}:{left:working,right:idle},contact:{kind,target:kind==='none'?null:target,residual:kind==='none'?null:0}};
}
export function sampleEiffelGroundRiggers(rawSeconds:number):EiffelGroundRiggerSample{
  if(!Number.isFinite(rawSeconds))throw new Error('Ground rigger time must be finite');const seconds=Math.max(0,Math.min(55,rawSeconds));
  const phase:EiffelGroundRiggerPhase=seconds<12?'waiting':seconds<13?'reach':seconds<=14?'clip':seconds<14.6?'release':'clear';
  return{seconds,phase,workers:[worker(0,seconds,phase),worker(1,seconds,phase)]};
}
