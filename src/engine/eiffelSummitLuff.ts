import type { RigidVec3 as V } from './eiffelRigid';
import type { EiffelCargoRopeSegment as Segment } from './eiffelSummitCargoRope';

export const EIFFEL_SUMMIT_LUFF = {
  drumCenter: [-.15, .60, 0] as V,
  drumRadius: .06,
  topGuideCenter: [-.20, 1.13, 0] as V,
  topGuideRadius: .08,
  lowerBlockRadius: .07,
  becket: [.16, 1.0, 0] as V,
  ropeRadius: .006,
} as const;
export interface EiffelSummitLuffOptions {
  readonly referencePitch?: number;
  /** Explicit measured inventory only. Omission returns no stored-length claim. */
  readonly totalRopeLength?: number;
}
const sub = (a: V, b: V): V => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const distance = (a: V, b: V) => Math.hypot(...sub(a,b));
const unit = (v: V): V => { const n=Math.hypot(...v); return [v[0]/n,v[1]/n,v[2]/n]; };
const rotatePitch = (x: number, y: number, pitch: number): V => [
  .30+x*Math.cos(pitch)-y*Math.sin(pitch), x*Math.sin(pitch)+y*Math.cos(pitch), 0,
];
function validatePitch(pitch: number) {
  if (!Number.isFinite(pitch) || pitch<0 || pitch>Math.PI/2) throw Error('Luff pitch must be within0..90 degrees');
}
/** The same left-hand external tangent branch is retained for every angle. */
function tangent(a: V, ra: number, b: V, rb: number) {
  const d=sub(b,a), size=Math.hypot(d[0],d[1]), k=(ra-rb)/size;
  if (!(size>0) || Math.abs(k)>=1 || Math.abs(d[2])>1e-10) throw Error('Invalid planar luff tangent');
  const x=d[0]/size, y=d[1]/size, h=Math.sqrt(1-k*k);
  const normal: V=[k*x-h*y,k*y+h*x,0];
  return {a:[a[0]+ra*normal[0],a[1]+ra*normal[1],0] as V,
    b:[b[0]+rb*normal[0],b[1]+rb*normal[1],0] as V};
}
function line(id: string, start: V, end: V): Segment {
  return {kind:'line',id,start,end,length:distance(start,end)};
}
function clockwiseArc(id: string, center: V, radius: number, start: V, end: V): Segment {
  const radial=unit(sub(start,center)), finish=unit(sub(end,center));
  const tangent: V=[radial[1],-radial[0],0];
  let sweep=Math.atan2(finish[0]*tangent[0]+finish[1]*tangent[1],finish[0]*radial[0]+finish[1]*radial[1]);
  if(sweep<0)sweep+=Math.PI*2;
  if(!(sweep>0&&sweep<Math.PI))throw Error('Luff wrap crosses its admitted continuous branch');
  return {kind:'arc',id,start,end,center,radius,axis:[0,0,-1],startRadial:radial,startTangent:tangent,sweep,length:radius*sweep};
}
function path(pitch: number) {
  validatePitch(pitch);
  const h=EIFFEL_SUMMIT_LUFF, center=rotatePitch(5.25,.34,pitch), boomPin=rotatePitch(5.25,.19,pitch);
  const feed=tangent(h.drumCenter,h.drumRadius,h.topGuideCenter,h.topGuideRadius);
  const outbound=tangent(h.topGuideCenter,h.topGuideRadius,center,h.lowerBlockRadius);
  const returning=tangent(center,h.lowerBlockRadius,h.becket,0);
  const segments: Segment[]=[
    line('luff-drum-feed',feed.a,feed.b),
    clockwiseArc('luff-top-wrap',h.topGuideCenter,h.topGuideRadius,feed.b,outbound.a),
    line('luff-outbound-fall',outbound.a,outbound.b),
    clockwiseArc('luff-block-wrap',center,h.lowerBlockRadius,outbound.b,returning.a),
    line('luff-return-fall',returning.a,h.becket),
  ];
  return {segments,lowerBlock:{center,boomPin,radius:h.lowerBlockRadius},deployedLength:segments.reduce((sum,s)=>sum+s.length,0)};
}
export function sampleEiffelSummitLuffSegment(segment: Segment, progress: number): V {
  const u=Math.max(0,Math.min(1,progress));
  if(u===0)return segment.start;if(u===1)return segment.end;
  if(segment.kind==='line')return segment.start.map((v,i)=>v+(segment.end[i]!-v)*u) as unknown as V;
  const a=u*segment.sweep;
  return segment.center.map((v,i)=>v+segment.radius*(segment.startRadial[i]!*Math.cos(a)+segment.startTangent[i]!*Math.sin(a))) as unknown as V;
}
/** Yaw-local analytical two-fall luff path. Actual winding/contact is a separate gate. */
export function solveEiffelSummitLuff(pitch: number, options: EiffelSummitLuffOptions={}) {
  const current=path(pitch), referencePitch=options.referencePitch??0, reference=path(referencePitch);
  const total=options.totalRopeLength;
  if(total!==undefined&&(!Number.isFinite(total)||total<Math.max(current.deployedLength,reference.deployedLength))) {
    throw Error('Luff rope inventory is insufficient for current or reference pitch');
  }
  const takeUpLength=reference.deployedLength-current.deployedLength;
  const points: V[]=[];
  for(const s of current.segments){if(!points.length)points.push(s.start);const n=s.kind==='arc'?24:1;for(let i=1;i<=n;i++)points.push(sampleEiffelSummitLuffSegment(s,i/n));}
  return {...current,pitch,points,ropeRadius:EIFFEL_SUMMIT_LUFF.ropeRadius,
    inventory:total===undefined?null:{totalLength:total,storedLength:total-current.deployedLength},
    drive:{referencePitch,referenceDeployedLength:reference.deployedLength,takeUpLength,
      drumAngle:takeUpLength/EIFFEL_SUMMIT_LUFF.drumRadius,referenceRadius:EIFFEL_SUMMIT_LUFF.drumRadius,
      visualWindingAdmitted:false as const,pendingReason:'Source drum width, physical winding and fleet contact are not yet admitted'},
  };
}
