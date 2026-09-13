import {describe,it,expect} from 'vitest';
import {EIFFEL_SUMMIT_RUNG_SOLE0,eiffelSummitWorkerRig,eiffelSummitWorkerRoles,sampleEiffelSummitCrankWorker} from '../src/engine/eiffelSummitWorker';
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]!));
describe('connected summit crank worker',()=>{
 it('keeps all four source bone lengths and rung/grip contacts throughout a full revolution',()=>{
 for(let i=0;i<=720;i++){const s=sampleEiffelSummitCrankWorker(i*Math.PI/360),r=eiffelSummitWorkerRig(s);for(let j=0;j<2;j++){
 expect(distance(r.shoulders[j]!,r.elbows[j]!)).toBeCloseTo(.31,9);expect(distance(r.elbows[j]!,r.hands[j]!)).toBeCloseTo(.31,9);
 expect(distance(r.ankles[j]!,r.knees[j]!)).toBeCloseTo(.43,9);expect(distance(r.knees[j]!,r.hips[j]!)).toBeCloseTo(.44,9);
 if(j===0)expect(Math.hypot(s.hands[j]![1]-306.7,s.hands[j]![2]+.12)).toBeCloseTo(.18,10);else expect(s.hands[j]).toEqual([-.17320508075688773,306.71,-.355]);expect(s.feet[j]![1]).toBe(EIFFEL_SUMMIT_RUNG_SOLE0+16*.28);
 }expect(eiffelSummitWorkerRoles(s)).toHaveLength(18);}
 });
 it('rejects impossible hand targets and is exactly independent of query order',()=>{const s=sampleEiffelSummitCrankWorker(.8);const before=eiffelSummitWorkerRoles(s);eiffelSummitWorkerRoles(sampleEiffelSummitCrankWorker(9));expect(eiffelSummitWorkerRoles(s)).toEqual(before);expect(()=>eiffelSummitWorkerRig({...s,hands:[[9,310,0],s.hands[1]]})).toThrow('Unreachable');});
});
