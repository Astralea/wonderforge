import {describe,it,expect} from 'vitest';
import {sampleEiffelDiagonalTrolley as sample,EIFFEL_DIAGONAL_TROLLEY_LENGTH as length} from '../src/engine/eiffelDiagonalTrolley';
describe('empty diagonal trolley fit clock',()=>{
 it('keeps rail height and maps full diagonal travel to the wheel circumference',()=>{expect(sample(0).position).toEqual([-8.5,121.495,-4]);expect(sample(16).position[0]).toBe(-15);expect(sample(16).position[1]).toBe(121.495);expect(sample(16).position[2]).toBeCloseTo(-1.8,12);for(let t=0;t<=16;t+=.1){const s=sample(t);expect(s.position[1]).toBe(121.495);expect(Math.hypot(s.position[0]+8.5,s.position[2]+4)).toBeCloseTo(s.distance,12);expect(-s.wheelAngle*.115).toBeCloseTo(s.distance,12);}expect(sample(16).distance).toBe(length);});
 it('stops smoothly, is deterministic under reverse seeking and rejects invalid time',()=>{expect(sample(-2)).toEqual(sample(0));expect(sample(18)).toEqual(sample(16));expect(sample(.001).distance/.001).toBeLessThan(.001);expect((length-sample(15.999).distance)/.001).toBeLessThan(.001);const middle=sample(8);sample(16);sample(0);expect(sample(8)).toEqual(middle);expect(()=>sample(NaN)).toThrow();});
});
