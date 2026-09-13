import {describe,expect,it} from 'vitest';
import {EIFFEL_FIRST_FLOOR_Y as F} from '../src/engine/eiffelFirstFloorSupply';
import {sampleEiffelMasterLinkHoist} from '../src/engine/eiffelMasterLinkHoist';
import {EIFFEL_LONG_LOAD_CART_WHEEL_RADIUS,EIFFEL_LONG_LOAD_ONWARD_DISTANCE,EIFFEL_LONG_LOAD_ONWARD_DURATION,sampleEiffelLongLoadOnward} from '../src/engine/eiffelLongLoadOnward';
import {sampleEiffelLongLoadFilm} from '../src/engine/eiffelLongLoadFilm';
import closed from '../artifacts/eiffel-closed-sling-2026-09-08/design.json';
import onwardDesign from '../artifacts/eiffel-long-load-onward-2026-09-08/design.json';

const d=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
describe('Eiffel actual long-load onward first-floor crossing',()=>{
 it('preserves the reviewed 128-second handoff and one transported identity',()=>{
  const old=sampleEiffelMasterLinkHoist(128,{...closed,hoistEnd:onwardDesign.hoistEnd}),at=sampleEiffelLongLoadFilm(128),after=sampleEiffelLongLoadFilm(128+1e-8);
  for(const key of['carrierOrigin','masterOrigin','hoistTermination']as const){expect(at[key]).toEqual(old[key]);expect(d(at[key],after[key])).toBeLessThan(1e-8);}
  expect(after.partId).toBe('summit-access-stair-m000-c000');expect(after.ownsPayload).toBe(true);
  expect(after.worldSlings).toHaveLength(4);expect('slingSupport'in after.onward&&after.onward.slingSupport).toBe('hoist');
 });

 it('fastens four distinct bolts continuously before unloading and release',()=>{
  for(let index=0;index<4;index++){
   const start=128+index*6.5,role=`cart-bolt-${index}`,position=(t:number)=>sampleEiffelLongLoadOnward(t).onward.roles.find(r=>r.role===role)!.position!;
   expect(position(start)).toEqual(onwardDesign.bolts.storedCenters[index]);expect(position(start+2)[1]).toBeCloseTo(F+.75,12);expect(position(start+3)[1]).toBeCloseTo(F+.75,12);expect(position(start+5)[1]).toBeCloseTo(F+onwardDesign.bolts.centerY,12);
   for(let i=30;i<50;i++)expect(position(start+(i+1)/10)[1]).toBeLessThanOrEqual(position(start+i/10)[1]+1e-12);
  }
  expect(sampleEiffelLongLoadOnward(153.999).onward.fastening.completedBolts).toBe(3);
  expect(sampleEiffelLongLoadOnward(154).onward.fastening.completedBolts).toBe(4);
  expect(sampleEiffelLongLoadOnward(168).onward.hookReleased).toBe(false);
  expect(sampleEiffelLongLoadOnward(172).onward.slingSupport).toBe('carrier-saddle');
  expect(sampleEiffelLongLoadOnward(180).onward.hookReleased).toBe(true);
 });

 it('retains the lower sling on its saddle while only the free connector retracts',()=>{
  const seated=sampleEiffelLongLoadOnward(172),released=sampleEiffelLongLoadOnward(184);
  expect(released.onward.connector.pinOffset).toBeCloseTo(.084,12);expect(released.onward.connector.keeperAngle).toBeCloseTo(Math.PI/2,12);expect(released.onward.connector.ropeRetraction).toBeCloseTo(.15,12);
  expect(released.masterOrigin).toEqual(seated.masterOrigin);expect(released.worldSlings).toEqual(seated.worldSlings);
  expect(released.hoistTermination[1]-seated.hoistTermination[1]).toBeCloseTo(.15,12);
  for(const role of['opening-clevis','clevis-pin','clevis-keeper','sling-parking-saddle'])expect(released.onward.roles.some(r=>r.role===role)).toBe(true);
 });

 it('pays the released connector motion through the drum and sheave without losing rope endpoint continuity',()=>{
  const start=sampleEiffelLongLoadOnward(168);
  for(let t=168;t<=184;t+=.05){const sample=sampleEiffelLongLoadOnward(t),dy=sample.hoistTermination[1]-start.hoistTermination[1];
   expect(sample.drumAngle-start.drumAngle).toBeCloseTo(-dy/.30,10);expect(sample.sheaveAngle-start.sheaveAngle).toBeCloseTo(-dy/.25,10);
   expect(sample.worldRope.at(-1)).toEqual(sample.hoistTermination);expect(sample.worldHook).toEqual(sample.hoistTermination);
  }
 });

 it('closes the hatch by two-hand contact before gripping and moving the cart',()=>{
  expect(sampleEiffelLongLoadOnward(198).onward.hatchAngle).toBeCloseTo(Math.PI/2,12);
  for(let t=198;t<=206;t+=.25){const s=sampleEiffelLongLoadOnward(t),worker=s.onward.hatchWorker;expect(worker.hands).toHaveLength(2);expect(d(worker.hands[0]!,worker.hands[1]!)).toBeCloseTo(.2,10);expect(s.onward.cart.distance).toBe(0);}
  expect(sampleEiffelLongLoadOnward(206).onward.hatchAngle).toBeCloseTo(0,12);
  expect(sampleEiffelLongLoadOnward(211.999).onward.cart.distance).toBe(0);
  const grip=sampleEiffelLongLoadOnward(212).onward.pusher;expect(grip.hands.every(h=>h.active)).toBe(true);expect(grip.hands.every(h=>d(h.center,h.surface)<.036)).toBe(true);
 });

 it('moves the same rigid carrier through the full supported 13m crossing',()=>{
  let previous=0;
  for(let t=212;t<=272;t+=.1){const s=sampleEiffelLongLoadOnward(t),distance=s.onward.cart.distance;expect(distance).toBeGreaterThanOrEqual(previous-1e-12);previous=distance;
   expect(s.carrierOrigin[0]-s.onward.cart.position[0]).toBeCloseTo(0,12);expect(s.carrierOrigin[1]-s.onward.cart.position[1]).toBeCloseTo(.34,12);expect(s.carrierOrigin[2]).toBe(-4);
   expect(s.onward.cart.wheelAngle).toBeCloseTo(-distance/EIFFEL_LONG_LOAD_CART_WHEEL_RADIUS,10);expect(s.wheelAngle).toBe(sampleEiffelLongLoadOnward(128).wheelAngle);
   for(const strand of s.worldSlings)expect(strand[0]![0]-sampleEiffelLongLoadOnward(212).worldSlings[s.worldSlings.indexOf(strand)]![0]![0]).toBeCloseTo(distance,8);
  }
  const end=sampleEiffelLongLoadOnward(272);expect(end.onward.cart.distance).toBe(EIFFEL_LONG_LOAD_ONWARD_DISTANCE);expect(end.onward.cart.position).toEqual([-8.5,F,-4]);expect(end.onward.cart.moving).toBe(false);
  expect(sampleEiffelLongLoadOnward(280).onward.cart.chocked).toBe(true);
  const final=sampleEiffelLongLoadOnward(280),chock=final.onward.roles.find(role=>role.role==='cart-chock')!;
  expect(chock.position).toEqual([final.onward.cart.position[0]+.354,F,final.onward.cart.position[2]-.38]);
 });

 it('has continuous rigid positions at every phase boundary and deterministic reverse queries',()=>{
  for(const boundary of[128,154,168,172,180,184,198,206,212,272,280]){const a=sampleEiffelLongLoadFilm(boundary-1e-6),b=sampleEiffelLongLoadFilm(boundary+1e-6);expect(d(a.carrierOrigin,b.carrierOrigin),`carrier@${boundary}`).toBeLessThan(1e-5);expect(d(a.masterOrigin,b.masterOrigin),`master@${boundary}`).toBeLessThan(1e-5);expect(d(a.hoistTermination,b.hoistTermination),`rope@${boundary}`).toBeLessThan(1e-5);}
  const expected=sampleEiffelLongLoadOnward(243.21);sampleEiffelLongLoadOnward(130);expect(sampleEiffelLongLoadOnward(243.21)).toEqual(expected);
  expect(sampleEiffelLongLoadOnward(-1)).toEqual(sampleEiffelLongLoadOnward(128));expect(sampleEiffelLongLoadOnward(999)).toEqual(sampleEiffelLongLoadOnward(EIFFEL_LONG_LOAD_ONWARD_DURATION));expect(()=>sampleEiffelLongLoadOnward(NaN)).toThrow(/finite/);
 });
});
