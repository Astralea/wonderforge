import source from '../../artifacts/eiffel-second-floor-relay-2026-09-08/handoff/source-state.json';
import type {RigidVec3 as V} from './eiffelRigid';
import type {EiffelSecondFloorRelaySample} from './eiffelSecondFloorRelay';
import {sampleEiffelLongLoadOnward} from './eiffelLongLoadOnward';

export const EIFFEL_RELAY_HANDOFF_PART_ID='summit-access-stair-m000-c000' as const;
export const EIFFEL_RELAY_BOLT_WITHDRAWAL=.24;
export const EIFFEL_RELAY_BOLT_RELEASE_TURNS=4;
const TOLERANCE=5e-5;
const add=(a:readonly number[],b:readonly number[]):V=>a.map((v,i)=>v+b[i]!)as unknown as V;
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
export const EIFFEL_RELAY_HANDOFF_START={
 partId:EIFFEL_RELAY_HANDOFF_PART_ID,
 cartOrigin:source.cartOrigin as unknown as V,
 carrierOrigin:source.carrierOrigin as unknown as V,
 masterOrigin:source.masterOrigin as unknown as V,
 payloadLocalPosition:source.payloads[0]!.position as unknown as V,
 oldClevisOrigin:source.oldClevis!.position as unknown as V,
 boltPositions:source.bolts.map(b=>b.position as unknown as V),
} as const;
export type EiffelRelayHandoffPhase='parked'|'connecting'|'tensioning'|'unfastening'|'ready-to-lift'|'lifting-clear';
export interface EiffelRelayBoltState {
 readonly role:string; readonly turnsReleased:number;
 /** Vertical extraction before lateral transfer; retained after stow as history. */
 readonly verticalWithdrawal:number;
 readonly position:V;
 readonly holder:'cart-nut'|'worker'|'storage';
 /** Explicit rigid fastener support datum, supplied by the worker/holder sampler. */
 readonly holderContact:V|null;
}
export interface EiffelRelayHoistConnection {
 readonly connectorId:string;
 readonly pinCenter:V; readonly pinClosed:boolean; readonly keeperClosed:boolean;
 /** Rope solver owns the path and provides its geometric tautness residual. */
 readonly ropeSlack:number;
 readonly worldRope:readonly V[];
}
export interface EiffelRelayHandoffFrame {
 readonly phase:EiffelRelayHandoffPhase;
 readonly partId:typeof EIFFEL_RELAY_HANDOFF_PART_ID;
 readonly carrierOrigin:V; readonly masterOrigin:V;
 readonly cartOrigin:V; readonly cartChocked:boolean;
 readonly bolts:readonly EiffelRelayBoltState[];
 readonly secondHoist:EiffelRelayHoistConnection|null;
 readonly upperWorkerClear:boolean;
}
export function initialEiffelRelayHandoff():EiffelRelayHandoffFrame {
 return {phase:'parked',partId:EIFFEL_RELAY_HANDOFF_PART_ID,
  carrierOrigin:EIFFEL_RELAY_HANDOFF_START.carrierOrigin,masterOrigin:EIFFEL_RELAY_HANDOFF_START.masterOrigin,
  cartOrigin:EIFFEL_RELAY_HANDOFF_START.cartOrigin,cartChocked:true,secondHoist:null,upperWorkerClear:true,
  bolts:source.bolts.map(b=>({role:b.role,position:b.position as unknown as V,turnsReleased:0,verticalWithdrawal:0,holder:'cart-nut',holderContact:null})),
 };
}
/** Pure requirements gate. Passing never admits a new mesh or a production stage. */
export function inspectEiffelRelayHandoff(frame:EiffelRelayHandoffFrame) {
 if(frame.partId!==EIFFEL_RELAY_HANDOFF_PART_ID)throw Error('Relay must keep the same unseated stair part');
 if(![...frame.carrierOrigin,...frame.masterOrigin,...frame.cartOrigin].every(Number.isFinite))throw Error('Relay coordinates must be finite');
 if(distance(frame.cartOrigin,EIFFEL_RELAY_HANDOFF_START.cartOrigin)>TOLERANCE||!frame.cartChocked)throw Error('Handoff cart must remain chocked at the actual terminal station');
 const offset=source.masterOrigin.map((v,i)=>v-source.carrierOrigin[i]!);
 if(distance(frame.masterOrigin,add(frame.carrierOrigin,offset))>TOLERANCE)throw Error('Retained sling/master rigid offset changed');
 const lift=frame.carrierOrigin[1]-source.carrierOrigin[1]!;
 if(lift< -TOLERANCE||Math.hypot(frame.carrierOrigin[0]-source.carrierOrigin[0]!,frame.carrierOrigin[2]-source.carrierOrigin[2]!)>TOLERANCE)throw Error('This handoff gate covers only vertical separation at the cart station');
 const connected=frame.secondHoist;
 if(frame.phase==='parked'&&connected)throw Error('Parked initial state cannot invent a second connector');
 if(connected){
  if(connected.connectorId==='opening-clevis')throw Error('The old first-hoist clevis cannot teleport to the relay');
  if(!connected.connectorId||!connected.pinCenter.every(Number.isFinite)||!Number.isFinite(connected.ropeSlack)||connected.ropeSlack<0||connected.worldRope.length<2||!connected.worldRope.flat().every(Number.isFinite))throw Error('Second-hoist rope witness is invalid');
  if(connected.worldRope.every(p=>distance(p,connected.worldRope[0]!)<TOLERANCE))throw Error('Second-hoist rope cannot collapse to a point');
  if(connected.pinClosed&&distance(connected.worldRope[connected.worldRope.length-1]!,add(frame.masterOrigin,[0,.325,0]))>TOLERANCE)throw Error('Second-hoist rope must end at the actual clevis apex');
  if(connected.pinClosed&&distance(connected.pinCenter,add(frame.masterOrigin,[0,.104,0]))>TOLERANCE)throw Error('Second-hoist pin does not meet the retained master bearing');
 }
 const loadPathConnected=!!connected&&connected.pinClosed&&connected.keeperClosed&&connected.ropeSlack<=TOLERANCE;
 const roles=new Set(frame.bolts.map(b=>b.role));
 if(frame.bolts.length!==4||source.bolts.some(b=>!roles.has(b.role)))throw Error('All four original cart fasteners must remain represented');
 let clearBolts=0;
 for(const bolt of frame.bolts){
  if(![bolt.turnsReleased,bolt.verticalWithdrawal,...bolt.position].every(Number.isFinite)||bolt.turnsReleased<0||bolt.verticalWithdrawal<0)throw Error('Bolt state is invalid');
  const moved=bolt.turnsReleased>0||bolt.verticalWithdrawal>0||bolt.holder!=='cart-nut';
  if(moved&&(!['unfastening','ready-to-lift','lifting-clear'].includes(frame.phase)||!frame.upperWorkerClear))throw Error('Upper connector worker must descend before cart unfastening');
  const original=source.bolts.find(b=>b.role===bolt.role)!.position;
  if(bolt.verticalWithdrawal<EIFFEL_RELAY_BOLT_WITHDRAWAL&&Math.hypot(bolt.position[0]-original[0]!,bolt.position[2]-original[2]!)>TOLERANCE)throw Error('Extract bolt vertically clear of the shoe before lateral transfer');
  if(bolt.verticalWithdrawal<EIFFEL_RELAY_BOLT_WITHDRAWAL&&bolt.holder!=='storage'&&Math.abs(bolt.position[1]-original[1]!-bolt.verticalWithdrawal)>TOLERANCE)throw Error('Bolt position must follow its actual vertical withdrawal');
  if(moved&&!loadPathConnected)throw Error('Connect and tension the new hoist before releasing cart fasteners');
  if(bolt.verticalWithdrawal>0&&bolt.turnsReleased<EIFFEL_RELAY_BOLT_RELEASE_TURNS)throw Error('Bolt extraction requires releasing the authored tightening turns');
  if(bolt.holder!=='cart-nut'&&(!bolt.holderContact||!bolt.holderContact.every(Number.isFinite)||distance(bolt.holderContact,add(bolt.position,[0,bolt.holder==='worker'?.128:-.12,0]))>TOLERANCE))throw Error('Removed fastener needs a nearby explicit holder contact');
  const outsideShoe=Math.max(Math.abs(bolt.position[0]-frame.cartOrigin[0]),Math.abs(bolt.position[2]-frame.cartOrigin[2]))>.22+.024;
  if(bolt.holder==='storage'&&bolt.verticalWithdrawal>=EIFFEL_RELAY_BOLT_WITHDRAWAL&&outsideShoe)clearBolts++;
 }
 if(lift>TOLERANCE&&(frame.phase!=='lifting-clear'||clearBolts!==4||!loadPathConnected))throw Error('Carrier separation requires the locked hoist and all four stowed bolts');
 if((frame.phase==='ready-to-lift'||frame.phase==='lifting-clear')&&(clearBolts!==4||!loadPathConnected||!frame.upperWorkerClear))throw Error('Handoff is not ready to lift');
 if(frame.phase!=='lifting-clear'&&lift>TOLERANCE)throw Error('Cart support must remain until the lift phase');
 return {partId:frame.partId,ownsPayload:true as const,seated:false as const,
  carrierSupport:lift>TOLERANCE?'tackle' as const:'cart' as const,
  slingSupport:loadPathConnected?'tackle' as const:'carrier-saddle' as const,
  fastening:{installed:frame.bolts.filter(b=>b.verticalWithdrawal<EIFFEL_RELAY_BOLT_WITHDRAWAL).length,required:4,released:clearBolts===4},
  cartAttached:frame.bolts.some(b=>b.verticalWithdrawal<EIFFEL_RELAY_BOLT_WITHDRAWAL),cartSupport:'first-floor' as const,
  payloadOrigin:add(frame.carrierOrigin,EIFFEL_RELAY_HANDOFF_START.payloadLocalPosition),
  oldHoistMustRemain:true as const,geometryAdmitted:false as const,
 };
}

/** Bounded adapter to the existing renderer ownership type; no clock or route is selected. */
export function toEiffelSecondFloorHandoffSample(frame:EiffelRelayHandoffFrame,seconds:number):EiffelSecondFloorRelaySample {
 const evidence=inspectEiffelRelayHandoff(frame);
 if(!Number.isFinite(seconds)||!frame.secondHoist)throw Error('Rendering a handoff requires explicit time and a real second-hoist rope path');
 const terminal=sampleEiffelLongLoadOnward(280),identity=[0,0,0,1] as const;
 const hardwareRoles=terminal.onward.roles.map(role=>{
  const bolt=frame.bolts.find(b=>b.role===role.role);
  if(bolt){const a=-bolt.turnsReleased*Math.PI;return{role:role.role,position:bolt.position,quaternion:[0,Math.sin(a),0,Math.cos(a)]as const};}
  return role.role==='sling-parking-saddle'?{...role,position:frame.carrierOrigin}:role;
 });
 return{seconds,phase:frame.phase,partId:frame.partId,ownsPayload:true,seated:false,
  carrierPose:{position:frame.carrierOrigin,quaternion:identity},payloadPose:{position:evidence.payloadOrigin,quaternion:identity},
  masterLinkPose:{position:frame.masterOrigin,quaternion:identity},cartPose:{position:frame.cartOrigin,quaternion:identity},
  retainedFirstHoistRope:terminal.worldRope,secondHoist:{worldRope:frame.secondHoist.worldRope,attached:frame.secondHoist.pinClosed&&frame.secondHoist.keeperClosed,driveAdmitted:false},
  hardwareRoles,carrierSupport:evidence.carrierSupport,slingSupport:evidence.slingSupport,cartSupport:evidence.cartSupport,cartAttached:evidence.cartAttached,fastening:evidence.fastening,
 };
}
