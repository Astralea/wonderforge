import {describe,it,expect} from 'vitest';
import {EIFFEL_GUYENET as D,sampleEiffelGuyenetClimb as climb,sampleEiffelGuyenetLuff as luff} from '../src/engine/eiffelGuyenet';
import {eiffelAxisBox,eiffelBoxPenetration,type EiffelSolidBox} from '../src/engine/eiffelOccupancy';
import type {RigidVec3 as V} from '../src/engine/eiffelRigid';

const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const guide=(s:number,x=0):V=>[x,s*Math.cos(D.model.railTiltDegrees*Math.PI/180),s*Math.sin(D.model.railTiltDegrees*Math.PI/180)];

/** Exact distance from a segment to an OBB: partition at slab crossings, then
 * minimize the quadratic squared distance on each interval. No origin-only test. */
function segmentBoxDistance(a:V,b:V,box:EiffelSolidBox){
 const p=box.axes.map(v=>dot(sub(a,box.center),v));
 const d=box.axes.map(v=>dot(sub(b,a),v));
 const cuts=[0,1];
 for(let i=0;i<3;i++)if(Math.abs(d[i]!)>1e-12)for(const sign of [-1,1]){
  const t=(sign*box.half[i]!-p[i]!)/d[i]!;if(t>0&&t<1)cuts.push(t);
 }
 cuts.sort((x,y)=>x-y);
 const dist=(t:number)=>p.reduce((s,v,i)=>s+Math.max(0,Math.abs(v+t*d[i]!)-box.half[i]!)**2,0);
 let result=Infinity;
 for(let j=1;j<cuts.length;j++){
  const lo=cuts[j-1]!,hi=cuts[j]!,mid=(lo+hi)/2;
  let linear=0,quadratic=0;
  for(let i=0;i<3;i++){
   const v=p[i]!+mid*d[i]!,h=box.half[i]!;
   if(Math.abs(v)>h){linear+=d[i]!*(p[i]!-Math.sign(v)*h);quadratic+=d[i]!**2;}
  }
  const t=quadratic?Math.max(lo,Math.min(hi,-linear/quadratic)):mid;
  result=Math.min(result,dist(lo),dist(hi),dist(t));
 }
 return Math.sqrt(result);
}

/** Bounds copied from blender_eiffel_guyenet.py, including lattice radii,
 * crossbars, tip pulley/axle and heel hoist. Empty space is conservative. */
function jibBoxes(reach:number,yaw:number,carriage=0):EiffelSolidBox[]{
 const {angle}=luff(reach),c=Math.cos(angle),s=Math.sin(angle),cy=Math.cos(yaw),sy=Math.sin(yaw);
 const rotate=([x,y,z]:V):V=>[x*cy+(y*s+z*c)*sy,y*c-z*s,-x*sy+(y*s+z*c)*cy];
 const heel=add(guide(carriage),[0,D.model.hingeY,D.model.platformOffsetZ]);
 const axes=[rotate([1,0,0]),rotate([0,1,0]),rotate([0,0,1])] as const;
 const bounds: {center:V;half:V}[] = [
  {center:[0,D.model.boomLength/2,0],half:[.313,D.model.boomLength/2+.033,.213]},
  {center:[0,D.model.boomLength,0],half:[.4,.305,.305]},
  {center:[0,.605,-.4],half:[.51,.505,.46]},
 ];
 return bounds.map(b=>({center:add(heel,rotate(b.center)),half:b.half,axes}));
}
function headClearance(boxes:EiffelSolidBox[],head:number){
 const p=guide(head),g=D.model.railGauge/2;
 const capsules=[
  {a:add(p,[-g,0,0]),b:add(p,[g,0,0]),radius:.13},
  // Thread markers extend .085 sideways plus .018 beam radius.
  {a:guide(head,-.8),b:guide(head-D.model.screwLength,-.8),radius:.103},
 ];
 let minimum=Infinity,shoePenetration=0;
 for(const box of boxes){
  for(const cap of capsules)minimum=Math.min(minimum,segmentBoxDistance(cap.a,cap.b,box)-cap.radius);
  // Exact square G crossbar, not a circular capsule approximation.
  shoePenetration=Math.max(shoePenetration,eiffelBoxPenetration(box,eiffelAxisBox(p,[g*2,.26,.26])));
  const u=guide(1),n:V=[0,-u[2],u[1]],axes=[[1,0,0],u,n] as const;
  for(const x of [-g,g])for(const [z,r] of [[0,.14],[.14,.055]] as const)
   shoePenetration=Math.max(shoePenetration,eiffelBoxPenetration(box,{center:add(p,[x,0,z]),half:[r,.25,r],axes}));
 }
 return {minimum,shoePenetration};
}
describe('documented Eiffel screw-climbing mechanism',()=>{
 it('checks the geometric distance oracle against crossing, face and corner cases',()=>{
  const box=eiffelAxisBox([0,0,0],[2,2,2]);
  expect(segmentBoxDistance([-2,0,0],[2,0,0],box)).toBe(0);
  expect(segmentBoxDistance([-2,3,0],[2,3,0],box)).toBe(2);
  expect(segmentBoxDistance([2,2,2],[3,3,3],box)).toBeCloseTo(Math.sqrt(3),12);
 });
 it('keeps a bolted load path and safety-jack contact throughout the full stroke',()=>{
  for(let i=0;i<=5000;i++){
   const s=climb(i/5000);
   expect(s.carriageBolted || (s.headBolted && s.safetyBaseBolted)).toBe(true);
   expect(s.safetyBaseBolted || (s.carriageBolted && s.safetyHeadBolted)).toBe(true);
   expect(s.safetyHead-s.carriage).toBeCloseTo(D.model.safetyHead,10);
   expect(s.safetyExtension).toBeGreaterThanOrEqual(-1e-10);
   expect(s.safetyExtension).toBeLessThanOrEqual(.5+1e-10);
   expect(s.head-s.carriage).toBeGreaterThanOrEqual(D.model.headRest-1e-10);
   expect(s.head-s.carriage).toBeLessThan(D.model.screwLength);
  }
  expect(climb(1).carriage).toBe(2.5);expect(climb(1).head-climb(0).head).toBe(2.5);
 });
 it('has continuous rigid translations at every bolt and jack phase boundary',()=>{
  const boundaries=[.18,.98,...Array.from({length:5},(_,i)=>.18+.16*(i+.65)),...Array.from({length:4},(_,i)=>.18+.16*(i+1))];
  for(const t of boundaries)for(const key of ['carriage','head','safetyBase','safetyHead'] as const)
   expect(Math.abs(climb(t-1e-8)[key]-climb(t+1e-8)[key])).toBeLessThan(1e-6);
 });
 it('luffs through the sourced working annulus with fixed jib and tie lengths',()=>{
  for(let i=0;i<=650;i++){
   const s=luff(5.5+i/100);
   expect(Math.hypot(s.reach,s.rise)).toBeCloseTo(D.model.boomLength,10);
   expect(Math.hypot(s.reach,s.rise-s.slider)).toBeCloseTo(D.model.tieLength,10);
   expect(s.slider).toBeGreaterThan(0);expect(s.slider+D.model.hingeY).toBeLessThan(D.model.mastAboveDeck);
  }
  expect(()=>luff(5)).toThrow();expect(()=>luff(12.01)).toThrow();
 });
 it('keeps the full working jib envelope clear of head G, its shoes and screw I throughout a sampled full slew',()=>{
  let minimum=Infinity,shoePenetration=0;
  for(let r=0;r<=65;r++)for(let a=0;a<180;a++){
   const clear=headClearance(jibBoxes(5.5+r/10,a*Math.PI/90),D.model.headRest);
   minimum=Math.min(minimum,clear.minimum);shoePenetration=Math.max(shoePenetration,clear.shoePenetration);
  }
  // The rectangular lattice envelope includes empty corner space; its
  // separate exact square beam and oriented shoe boxes catch corner collisions.
  expect(minimum).toBeGreaterThan(.035);
  expect(shoePenetration).toBe(0);
  // The previous 3.5 m head and initially proposed 1.2 m head intersect
  // actual lower chord extents at an inward working azimuth.
  expect(headClearance(jibBoxes(10.092590454076701,0),3.5).minimum).toBeLessThan(0);
  expect(headClearance(jibBoxes(12,0),1.2).minimum).toBeLessThan(-.015);
 });
 it('keeps G/I and the rigid jib clear through the entire unloaded, inward parked climb',()=>{
  let minimum=Infinity,shoePenetration=0;
  for(let i=0;i<=1000;i++){
   const state=climb(i/1000);
   const clear=headClearance(jibBoxes(D.historical.minReach,0,state.carriage),state.head);
   minimum=Math.min(minimum,clear.minimum);shoePenetration=Math.max(shoePenetration,clear.shoePenetration);
   // Nut at carriage guide-coordinate 0 stays within the authored threaded
   // span, including a minimum half-metre engagement below it.
   expect(D.model.screwLength-(state.head-state.carriage)).toBeGreaterThanOrEqual(.5-1e-10);
  }
  expect(minimum).toBeGreaterThan(.04);expect(shoePenetration).toBe(0);
 });
 it('keeps every engaged anchor fixed to the guides while its bolt is engaged',()=>{
  for(let i=0;i<1000;i++){
   const a=climb((i+.25)/1000),b=climb((i+.75)/1000);
   if(a.phase!==b.phase)continue;
   for(const [bolt,coordinate] of [
    ['carriageBolted','carriage'],['headBolted','head'],
    ['safetyBaseBolted','safetyBase'],['safetyHeadBolted','safetyHead'],
   ] as const)if(a[bolt]&&b[bolt])expect(b[coordinate]).toBeCloseTo(a[coordinate],10);
  }
 });
 it('records the original pre-face-offset guide collision so G/I clearance cannot be mistaken for unrestricted slew clearance',()=>{
  const yaw=32.59012849590578*Math.PI/180,{angle}=luff(12);
  const y=2.3612927382744235,x=.26,z=.18;
  const v=y*Math.sin(angle)+z*Math.cos(angle);
  const chord:V=[x*Math.cos(yaw)+v*Math.sin(yaw),D.model.hingeY+y*Math.cos(angle)-z*Math.sin(angle),D.model.platformOffsetZ-x*Math.sin(yaw)+v*Math.cos(yaw)];
  const flange=add(guide(1.3185424843793565,D.model.railGauge/2),[0,0,-.65]);
  expect(Math.hypot(...sub(chord,flange))).toBeLessThan(1e-10);
  // Actual chord radius .033 and guide flange radius .09 overlap here.
  // This is a known-limitation witness, not a production clearance pass.
 });
});
