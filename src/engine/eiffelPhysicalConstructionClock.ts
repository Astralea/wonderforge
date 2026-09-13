import type {RigidPose,RigidQuat} from './eiffelRigid';

export type EiffelPhysicalClockPhase='staged'|'hoist'|'transfer'|'lower';
export interface EiffelPhysicalClockOperation {
 readonly id?:string;readonly assemblyParentId?:string;readonly stage:number;readonly wave:number;readonly start:number;readonly end:number;
 readonly pickup:RigidPose;readonly clear:RigidPose;readonly waypoint:RigidPose;readonly approach:RigidPose;readonly assemblyDeckClear?:RigidPose;readonly assemblyOutboardLow?:RigidPose;
 readonly finalPose:RigidPose;readonly station?:{readonly base:readonly[number,number,number]};
}
export interface EiffelPhysicalClockOptions {
 readonly stages?:readonly number[];readonly fps?:number;readonly riggingSeconds?:number;
 readonly hoistMetresPerSecond?:number;readonly radiansPerSecond?:number;
 readonly transferMetresPerSecond?:number;readonly lowerMetresPerSecond?:number;
 readonly seatingSeconds?:number;readonly representativePartIds?:readonly string[];
 readonly backgroundMetresPerFrame?:number;readonly backgroundRadiansPerFrame?:number;readonly backgroundRiggingFrames?:number;
}
export interface EiffelPhysicalClockSegment {
 readonly productionStart:number;readonly productionEnd:number;readonly secondsStart:number;readonly secondsEnd:number;
 readonly kind:'hold'|'wave-phase';readonly wave:number|null;readonly phase:EiffelPhysicalClockPhase|null;
}
export interface EiffelPhysicalConstructionClock {
 readonly originalDuration:number;readonly duration:number;readonly selectedStages:readonly number[];
 readonly selectedOperationCount:number;readonly selectedWaveCount:number;readonly segments:readonly EiffelPhysicalClockSegment[];
 productionToSeconds(t:number):number;secondsToProductionT(seconds:number):number;
}

const PHASES=[['staged',0,.12],['hoist',.12,.30],['transfer',.30,.78],['lower',.78,1]]as const;
const finitePositive=(value:number,label:string)=>{if(!Number.isFinite(value)||value<=0)throw Error(`${label} must be finite and positive`);return value;};
const distance=(a:RigidPose,b:RigidPose)=>Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1],a.position[2]-b.position[2]);
const SMOOTHSTEP_PEAK=1.5;
const transferDistance=(op:EiffelPhysicalClockOperation)=>{if(!op.station)return distance(op.clear,op.waypoint)+distance(op.waypoint,op.approach);const base=op.station.base,ax=op.clear.position[0]-base[0],az=op.clear.position[2]-base[2],bx=op.approach.position[0]-base[0],bz=op.approach.position[2]-base[2];let a=Math.atan2(az,ax),b=Math.atan2(bz,bx);while(b-a>Math.PI)b-=2*Math.PI;while(b-a< -Math.PI)b+=2*Math.PI;let total=0,prior=op.clear.position;for(let i=1;i<=128;i++){const t=i/128,r=Math.hypot(ax,az)+(Math.hypot(bx,bz)-Math.hypot(ax,az))*t,angle=a+(b-a)*t,next:[number,number,number]=[base[0]+Math.cos(angle)*r,op.clear.position[1]+(op.approach.position[1]-op.clear.position[1])*t,base[2]+Math.sin(angle)*r];total+=Math.hypot(next[0]-prior[0],next[1]-prior[1],next[2]-prior[2]);prior=next;}return total;};
const hoistPoses=(op:EiffelPhysicalClockOperation)=>op.assemblyDeckClear&&op.assemblyOutboardLow?[op.pickup,op.assemblyDeckClear,op.assemblyOutboardLow,op.clear]:[op.pickup,op.clear];
const pathDistance=(poses:readonly RigidPose[])=>poses.slice(1).reduce((sum,pose,index)=>sum+distance(poses[index]!,pose),0);
const quatAngle=(a:RigidQuat,b:RigidQuat)=>{const an=Math.hypot(...a),bn=Math.hypot(...b);if(!Number.isFinite(an)||!Number.isFinite(bn)||an===0||bn===0)throw Error('Clock poses require finite nonzero quaternions');const dot=Math.min(1,Math.abs(a.reduce((sum,value,index)=>sum+value*b[index]!,0)/(an*bn)));return 2*Math.acos(dot);};

/** Review clock for a bounded set of construction stages. It changes time only;
 * existing rigid routes, simultaneous waves and dependency order stay intact. */
export function createEiffelPhysicalConstructionClock(operations:readonly EiffelPhysicalClockOperation[],originalDuration=60,options:EiffelPhysicalClockOptions={}):EiffelPhysicalConstructionClock{
 finitePositive(originalDuration,'Original duration');
 const fps=finitePositive(options.fps??60,'FPS'),rigging=finitePositive(options.riggingSeconds??1.5,'Rigging duration'),hoistRate=finitePositive(options.hoistMetresPerSecond??.75,'Hoist rate'),rotationRate=finitePositive(options.radiansPerSecond??Math.PI/9,'Rotation rate'),transferRate=finitePositive(options.transferMetresPerSecond??.65,'Transfer rate'),lowerRate=finitePositive(options.lowerMetresPerSecond??.25,'Lower rate'),seating=finitePositive(options.seatingSeconds??.8,'Seating duration'),backgroundMetres=finitePositive(options.backgroundMetresPerFrame??.22,'Background displacement'),backgroundRadians=finitePositive(options.backgroundRadiansPerFrame??Math.PI/36,'Background rotation'),backgroundRigging=(finitePositive(options.backgroundRiggingFrames??4,'Background rigging frames'))/fps,minimum=1/fps,representativeIds=new Set(options.representativePartIds??['summit-crown-m072-c002']);
 const selectedStages=[...(options.stages??[63])];if(selectedStages.some(stage=>!Number.isInteger(stage)))throw Error('Selected stages must be integers');
 const stageSet=new Set(selectedStages),selected=operations.filter(op=>stageSet.has(op.stage)&&!op.assemblyParentId);
 const waves=new Map<number,EiffelPhysicalClockOperation[]>();
 for(const op of selected){if(!Number.isFinite(op.start)||!Number.isFinite(op.end)||op.start<0||op.end>1||op.end<=op.start)throw Error('Clock operations require 0 <= start < end <= 1');const prior=waves.get(op.wave);if(prior&&(prior[0]!.start!==op.start||prior[0]!.end!==op.end))throw Error(`Wave ${op.wave} has inconsistent intervals`);(prior??(waves.set(op.wave,[]),waves.get(op.wave)!)).push(op);}
 const ordered=[...waves].map(([wave,items])=>({wave,items,start:items[0]!.start,end:items[0]!.end})).sort((a,b)=>a.start-b.start||a.wave-b.wave);
 for(let i=1;i<ordered.length;i++)if(ordered[i]!.start<ordered[i-1]!.end-1e-12)throw Error('Selected waves overlap without being simultaneous');
 const segments:EiffelPhysicalClockSegment[]=[];let pc=0,sc=0;
 const append=(productionStart:number,productionEnd:number,secondsLength:number,kind:EiffelPhysicalClockSegment['kind'],wave:number|null,phase:EiffelPhysicalClockPhase|null)=>{if(productionEnd<=productionStart)return;segments.push({productionStart,productionEnd,secondsStart:sc,secondsEnd:sc+secondsLength,kind,wave,phase});pc=productionEnd;sc+=secondsLength;};
 for(const wave of ordered){append(pc,wave.start,(wave.start-pc)*originalDuration,'hold',null,null);const representative=wave.items.some(op=>op.id&&representativeIds.has(op.id));for(const [phase,a,b]of PHASES){let needed=minimum;if(phase==='staged')needed=representative?rigging:backgroundRigging;else if(phase==='hoist')needed=Math.max(...wave.items.map(op=>representative?SMOOTHSTEP_PEAK*Math.max(pathDistance(hoistPoses(op))/hoistRate,hoistPoses(op).slice(1).reduce((sum,pose,index)=>sum+quatAngle(hoistPoses(op)[index]!.quaternion,pose.quaternion),0)/rotationRate):SMOOTHSTEP_PEAK*Math.max(pathDistance(hoistPoses(op))/(backgroundMetres*fps),hoistPoses(op).slice(1).reduce((sum,pose,index)=>sum+quatAngle(hoistPoses(op)[index]!.quaternion,pose.quaternion),0)/(backgroundRadians*fps))));else if(phase==='transfer')needed=Math.max(...wave.items.map(op=>SMOOTHSTEP_PEAK*transferDistance(op)/(representative?transferRate:backgroundMetres*fps)));else needed=representative?Math.max(seating,...wave.items.map(op=>SMOOTHSTEP_PEAK*distance(op.approach,op.finalPose)/lowerRate)):Math.max(minimum,...wave.items.map(op=>SMOOTHSTEP_PEAK*distance(op.approach,op.finalPose)/(backgroundMetres*fps)));const ps=wave.start+(wave.end-wave.start)*a,pe=wave.start+(wave.end-wave.start)*b,original=(pe-ps)*originalDuration;append(ps,pe,Math.max(original,needed,minimum),'wave-phase',wave.wave,phase);}}
 append(pc,1,(1-pc)*originalDuration,'hold',null,null);if(!segments.length)append(0,1,originalDuration,'hold',null,null);
 const map=(value:number,sourceStart:'productionStart'|'secondsStart',sourceEnd:'productionEnd'|'secondsEnd',targetStart:'productionStart'|'secondsStart',targetEnd:'productionEnd'|'secondsEnd')=>{if(!Number.isFinite(value))throw Error('Clock query must be finite');const first=segments[0]!,last=segments.at(-1)!;if(value<=first[sourceStart])return first[targetStart];if(value>=last[sourceEnd])return last[targetEnd];let low=0,high=segments.length-1;while(low<high){const mid=(low+high)>>>1;if(value>segments[mid]![sourceEnd])low=mid+1;else high=mid;}const s=segments[low]!,u=(value-s[sourceStart])/(s[sourceEnd]-s[sourceStart]);return s[targetStart]+(s[targetEnd]-s[targetStart])*u;};
 return{originalDuration,duration:sc,selectedStages,selectedOperationCount:selected.length,selectedWaveCount:ordered.length,segments,productionToSeconds:t=>map(t,'productionStart','productionEnd','secondsStart','secondsEnd'),secondsToProductionT:s=>map(s,'secondsStart','secondsEnd','productionStart','productionEnd')};
}
