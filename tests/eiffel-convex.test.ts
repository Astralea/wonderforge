import {describe,it,expect} from 'vitest';
import {eiffelAxisBox,eiffelBoxPenetration} from '../src/engine/eiffelOccupancy';
import {eiffelConvexBox,eiffelConvexSolid,eiffelConvexPenetration,eiffelConvexTranslationSweep,transformEiffelConvexSolid} from '../src/engine/eiffelConvex';

describe('Eiffel occupied convex geometry',()=>{
 it('preserves separation depth when both occupied solids undergo the same rigid motion',()=>{
  const a=eiffelConvexBox(eiffelAxisBox([0,0,0],[.3,.2,.7])),b=eiffelConvexBox(eiffelAxisBox([.1,.05,.2],[.2,.2,.3]));
  const pose={position:[52,19,-43] as const,quaternion:[0,Math.sin(.37),0,Math.cos(.37)] as const};
  expect(eiffelConvexPenetration(transformEiffelConvexSolid(a,pose),transformEiffelConvexSolid(b,pose))).toBeCloseTo(eiffelConvexPenetration(a,b),10);
 });
 it('matches the independent box SAT, including contained solids and surface contact',()=>{
  const outer=eiffelAxisBox([51,19,-43],[2,2,2]);
  for(const x of [49,50,51,52,53])for(const size of [.014,.2,3]){
   const box=eiffelAxisBox([x,19,-43],[size,.3,.5]);
   expect(eiffelConvexPenetration(eiffelConvexBox(outer),eiffelConvexBox(box))).toBeCloseTo(eiffelBoxPenetration(outer,box),10);
  }
 });
 it('does not fill a wedge empty corner with its enclosing box',()=>{
  const wedge=eiffelConvexSolid([[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,0,1],[0,1,1]],[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]);
  expect(eiffelConvexPenetration(wedge,eiffelConvexBox(eiffelAxisBox([.8,.8,.5],[.1,.1,.1])))).toBe(0);
  expect(eiffelConvexPenetration(wedge,eiffelConvexBox(eiffelAxisBox([.2,.2,.5],[.1,.1,.1])))).toBeGreaterThan(.1);
 });
 it('detects a collision between clear endpoints of a whole straight insertion',()=>{
  const start=eiffelConvexBox(eiffelAxisBox([0,0,0],[.1,.1,.1]));
  const finish=eiffelConvexBox(eiffelAxisBox([1,1,0],[.1,.1,.1]));
  const obstacle=eiffelConvexBox(eiffelAxisBox([.5,.5,0],[.02,.02,.1]));
  expect(eiffelConvexPenetration(start,obstacle)).toBe(0);
  expect(eiffelConvexPenetration(finish,obstacle)).toBe(0);
  const swept=eiffelConvexTranslationSweep(start,[1,1,0]);
  expect(eiffelConvexPenetration(swept,obstacle)).toBeGreaterThan(.01);
  expect(eiffelConvexPenetration(swept,eiffelConvexBox(eiffelAxisBox([.9,.1,0],[.1,.1,.1])))).toBe(0);
 });
});
