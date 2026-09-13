import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {trackFor} from '../src/data/soundtrack';
import {eiffelFilmEditDuration} from '../src/engine/eiffelFilmEdit';
import {soundtrackClockAt} from '../src/engine/soundtrackClock';
import manifest from '../artifacts/soundtrack/eiffel-tower/editions-2026-09-08/manifest.json';

it('selects two distinct Eiffel-owned complete scores and never wraps either edition',()=>{
  const detailed=trackFor('eiffel-tower','cinematic','detailed')!,short=trackFor('eiffel-tower','cinematic','cinematic')!;
  expect(trackFor('eiffel-tower','cinematic')).toEqual(detailed);expect(detailed.src).not.toBe(short.src);expect(detailed.id).not.toBe(short.id);
  expect(trackFor('eiffel-tower','ambient','cinematic')).toEqual(trackFor('eiffel-tower','ambient','detailed'));
  expect(trackFor('pyramids-of-giza','cinematic','cinematic')).toEqual(trackFor('pyramids-of-giza','cinematic','detailed'));
  for(const edit of['detailed','cinematic']as const){
    const track=trackFor('eiffel-tower','cinematic',edit)!,duration=eiffelFilmEditDuration(edit);
    expect(track.wonderId).toBe('eiffel-tower');expect(track.loop).toBe(false);expect(Math.abs(track.duration-duration)).toBeLessThan(.05);
    let previous=-1;
    for(let i=0;i<=1000;i++){
      const clock=soundtrackClockAt(i/1000,duration,track.duration,track.loop);
      expect(clock.loop).toBe(false);expect(clock.time).toBeGreaterThan(previous);previous=clock.time;
    }
    for(const t of[.999,.02,.7,0,1])expect(soundtrackClockAt(t,duration,track.duration,false).time).toBeCloseTo(t*track.duration,8);
  }
});

it('matches both delivered MP3 byte identities and decoder durations to the assembly record',()=>{
  expect(manifest.model).toBe('lyria-3-pro-preview');expect(manifest.repeatedSource).toBe(false);expect(manifest.deliveries).toHaveLength(2);
  for(const edit of['detailed','cinematic']as const){
    const track=trackFor('eiffel-tower','cinematic',edit)!,record=manifest.deliveries.find(c=>c.src===track.src)!;
    expect(record).toBeDefined();const bytes=readFileSync(`public${track.src}`);
    expect(bytes.length).toBe(record.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
    const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',`public${track.src}`],{encoding:'utf8'}));
    expect(Math.abs(duration-eiffelFilmEditDuration(edit))).toBeLessThan(.05);
    expect(Math.abs(duration-record.duration)).toBeLessThan(.05);
  }
},15000);
