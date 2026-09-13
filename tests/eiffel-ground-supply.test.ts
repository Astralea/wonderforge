import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import type {EiffelKitManifest,EiffelKitPart} from '../src/data/eiffelKitTypes';
import type {EiffelProductionOperation} from '../src/engine/eiffelProductionConstruction';
import {EiffelOccupancy,eiffelAxisBox} from '../src/engine/eiffelOccupancy';
import {eiffelGroundFeedBlocker,eiffelGroundPickup,probeEiffelGroundFeed,sampleEiffelGroundFeed} from '../src/engine/eiffelGroundSupply';
import {eiffelTerrainHeightAt} from '../src/engine/eiffelTerrain';
import {transformedRigidBounds,type RigidPose} from '../src/engine/eiffelRigid';

const manifest=JSON.parse(readFileSync('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8')) as EiffelKitManifest;
const pose=(x:number,y:number,z:number):RigidPose=>({position:[x,y,z],quaternion:[0,0,0,1]});
const part:EiffelKitPart={...manifest.parts.find(p=>p.group!=='foundation')!,id:'probe-cargo',shape:'box',
 localBounds:{min:[-.25,-.25,-.25],max:[.25,.25,.25]},transportSize:[.5,.5,.5],
 pickupLugs:[[-.2,.25,0],[.2,.25,0]],finalPose:pose(0,10,0)};
describe('Ground supply envelope planning',()=>{
 it('detects a receiver or thin beam crossed between clear ascent endpoints',()=>{
  const empty=new EiffelOccupancy([]),deck={id:'receiver',box:eiffelAxisBox([4,5,0],[2,.05,2])};
  expect(eiffelGroundFeedBlocker(part,pose(4,1,0),pose(4,9,0),1,empty,[deck])).toBe('receiver');
  expect(eiffelGroundFeedBlocker(part,pose(4,1,0),pose(4,2,0),1,empty,[deck])).toBeNull();
  expect(eiffelGroundFeedBlocker(part,pose(4,8,0),pose(4,9,0),1,empty,[deck])).toBeNull();
  const beam={...part,id:'thin-beam',localBounds:{min:[-1,-.005,-1] as const,max:[1,.005,1] as const},finalPose:pose(4,5,0)};
  const occupied=new EiffelOccupancy([{part:beam,end:.4}]);
  expect(eiffelGroundFeedBlocker(part,pose(4,1,0),pose(4,9,0),.3,occupied)).toBeNull();
  expect(eiffelGroundFeedBlocker(part,pose(4,1,0),pose(4,9,0),.4,occupied)).toBe('thin-beam');
 });
 it('starts the full rotated footprint above terrain rather than placing only its origin on ground',()=>{
  const q=[0,Math.sin(.3),0,Math.cos(.3)] as const;
  const ground=eiffelGroundPickup(part,{position:[155,40,40],quaternion:q});
  const b=transformedRigidBounds(ground,part.localBounds.min,part.localBounds.max);
  const floors=[b.min[0],b.max[0]].flatMap(x=>[b.min[2],b.max[2]].map(z=>eiffelTerrainHeightAt(x,z)));
  expect(b.min[1]-Math.max(...floors)).toBeCloseTo(.6,10);
  expect(ground.quaternion).toEqual(q);
 });
 it('routes around a receiving deck and preserves cargo identity and continuous phase boundaries',()=>{
  const pickup=pose(4,9,0);
  const op:EiffelProductionOperation={part,start:.5,end:.6,pickup,staging:pickup,clear:pose(4,11,0),
   approach:pose(0,11,0),waypoint:pose(3,11,3),bracket:null,hero:false,wave:1,
   station:{base:[0,8,0],mastHeight:16,boomLength:8.4},
   receiver:{center:[4,8.15,0],size:[2,.3,2],saddles:[[0,8,-.5],[0,8,.5]]}};
  const result=probeEiffelGroundFeed(op,new EiffelOccupancy([]));
  expect(result.directBlocker).toBe('receiver-deck');expect(result.route).not.toBeNull();
  const route=result.route!;expect(route.productionReady).toBe(false);
  expect(route.received).toBe(pickup);
  expect(sampleEiffelGroundFeed(route,0)).toEqual(route.ground);
  expect(sampleEiffelGroundFeed(route,1)).toEqual(pickup);
  for(const t of [.65,.85]){
   const a=sampleEiffelGroundFeed(route,t-1e-7),b=sampleEiffelGroundFeed(route,t+1e-7);
   expect(Math.hypot(...a.position.map((v,i)=>v-b.position[i]!))).toBeLessThan(1e-8);
  }
  const later=sampleEiffelGroundFeed(route,.93);sampleEiffelGroundFeed(route,.1);
  expect(sampleEiffelGroundFeed(route,.93)).toEqual(later);
  expect(()=>eiffelGroundFeedBlocker(part,pose(0,0,0),{...pose(0,1,0),quaternion:[0,.1,0,Math.sqrt(.99)]},1,new EiffelOccupancy([]))).toThrow(/fixed orientation/);
 });
});
