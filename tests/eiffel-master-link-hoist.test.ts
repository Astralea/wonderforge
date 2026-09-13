import {describe,expect,it} from 'vitest';
import {sampleEiffelLongLoadHoist} from '../src/engine/eiffelLongLoadHoist';
import {sampleEiffelMasterLinkHoist} from '../src/engine/eiffelMasterLinkHoist';
import closed from '../artifacts/eiffel-closed-sling-2026-09-08/design.json';

describe('real master-link hoist rope termination',()=>{
 it('retains the entire carrier route and terminates at the raised rope-eye apex',()=>{
  for(const t of [0,6,40,80,112,116,120,124,128]){
   const old=sampleEiffelLongLoadHoist(t),next=sampleEiffelMasterLinkHoist(t);
   expect(next.carrierOrigin).toEqual(old.carrierOrigin);expect(next.masterOrigin).toEqual(old.worldHook);
   next.worldHook.forEach((v,i)=>expect(v).toBeCloseTo(next.hoistTermination[i]!,10));
   expect(next.worldHook[1]-old.worldHook[1]).toBeCloseTo(.25,10);
   expect(next.worldRope.at(-1)).toEqual(next.worldHook);
   expect(next.worldRope.at(-2)![1]-next.worldHook[1]).toBeGreaterThan(.3874);
   expect(next.deployedLength-old.deployedLength).toBeCloseTo(-.25,10);
   expect(next.released).toBe(false);
  }
 });
 it('places the shortened legs at the closed lower eye splices without retiming the load',()=>{
  for(const t of [0,80,112,120,128]){
   const old=sampleEiffelMasterLinkHoist(t),next=sampleEiffelMasterLinkHoist(t,closed);
   expect(next.carrierOrigin).toEqual(old.carrierOrigin);expect(next.worldRope).toEqual(old.worldRope);
   next.worldSlings.forEach((line,i)=>line.forEach((point,j)=>point.forEach((v,k)=>expect(v-next.masterOrigin[k]!).toBeCloseTo(closed.strands[i]!.line[j]![k]!,10))));
   expect(next.worldSlings).not.toEqual(old.worldSlings);
  }
 });
});
