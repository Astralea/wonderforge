import {describe,it,expect} from 'vitest';
import {eiffelDiagonalRigAt as rig,eiffelDiagonalWorld as world,EIFFEL_DIAGONAL_LENGTH as L} from '../src/engine/eiffelDiagonalRig';
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,k)=>v-b[k]!));
describe('diagonal receiver continuous rope',()=>{
 it('meets actual fixed/moving sheave radii and the unchanged cargo column',()=>{
  for(const u of[0,L/2,L])for(const y of[59.18000244140625,118.7,117.38]){const r=rig(u,y),fixed=world([L+2.8,121.35,0]),moving=world([u+.25,121.35,0]);for(const p of r.rope.slice(1,26))expect(distance(p,fixed)).toBeCloseTo(.25,10);for(const p of r.rope.slice(26,51))expect(distance(p,moving)).toBeCloseTo(.25,10);expect(r.rope.at(-1)).toEqual(r.hook);expect(r.hook[0]).toBeCloseTo(r.cargo[0],12);expect(r.hook[2]).toBeCloseTo(r.cargo[2],12);expect(r.trolley[1]).toBe(121.495);}
 });
 it('uses a common drum/guide tangent and preserves cable length through horizontal and vertical travel',()=>{
  const r=rig(0,59.18000244140625),drum=world([L+3.6,117.05,0]),guide=world([L+2.8,121.35,0]);expect(distance(r.rope[0]!,drum)).toBeCloseTo(.3,10);const tangent=r.rope[1]!.map((v,k)=>v-r.rope[0]![k]!);for(const[point,center]of[[r.rope[0]!,drum],[r.rope[1]!,guide]])expect(tangent.reduce((s,v,k)=>s+v*(point![k]!-center![k]!),0)).toBeCloseTo(0,10);
  const b=rig(L,118.7),delta=b.deployedLength-r.deployedLength;expect(delta).toBeCloseTo(-L-(118.7-59.18000244140625),10);expect(b.drumAngle*.3).toBeCloseTo(delta,10);expect(b.fixedSheaveAngle*.25).toBeCloseTo(delta,10);expect(rig(L,118.7).movingSheaveAngle).toBe(rig(0,118.7).movingSheaveAngle);expect(r.drumAngle).toBe(0);
 });
 it('rejects impossible columns and above-sheave hooks',()=>{expect(()=>rig(-.1,100)).toThrow();expect(()=>rig(L+.1,100)).toThrow();expect(()=>rig(0,120)).toThrow();expect(()=>rig(NaN,100)).toThrow();});
});
