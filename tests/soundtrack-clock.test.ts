import {describe,it,expect} from 'vitest';
import {soundtrackClockAt} from '../src/engine/soundtrackClock';
describe('long construction-film soundtrack clock',()=>{
 it('advances at native seconds through the added lift instead of seeking backward every second',()=>{
  expect(soundtrackClockAt(20/122,122,60,false).time).toBeCloseTo(20);
  expect(soundtrackClockAt(21/122,122,60,false).time).toBeCloseTo(21);
 });
 it('wraps only at the end of the same cue',()=>{
  expect(soundtrackClockAt(61/122,122,60,false)).toEqual({loop:true,time:1});
 });
 it('preserves ordinary sixty-second cue timing',()=>{
  expect(soundtrackClockAt(.4,60,60,false)).toEqual({loop:false,time:24});
 });
});
