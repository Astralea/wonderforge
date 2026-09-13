import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {EIFFEL_NARRATION,EIFFEL_STORY_NARRATION,narrationClipFor,narrationClipsForWonder} from '../src/data/narration';
import {eiffelChapterCaptionsForEdit} from '../src/ui/eiffelChapterCaptions';
import manifest from '../artifacts/eiffel-upper-material-chain-2026-09-08/narration/manifest.json';

it('retains five fact clips and binds all six story texts to their actual generated ElevenLabs files',()=>{
  expect(EIFFEL_NARRATION).toHaveLength(5);expect(EIFFEL_STORY_NARRATION).toHaveLength(6);
  const all=narrationClipsForWonder('eiffel-tower');expect(all).toHaveLength(11);
  expect(new Set(all.map(c=>c.captionId)).size).toBe(11);expect(new Set(all.map(c=>c.src)).size).toBe(11);
  expect(manifest).toHaveLength(6);
  for(const clip of EIFFEL_STORY_NARRATION){
    const generated=manifest.find(c=>c.captionId===clip.captionId)!;
    expect(generated).toBeDefined();expect(narrationClipFor('eiffel-tower',clip.captionId)).toEqual(clip);
    expect(generated.text).toBe(clip.captionText);expect(generated.src).toBe(clip.src);
    expect(generated.voiceId).toBe(clip.voice.voiceId);expect(generated.model).toBe('eleven_multilingual_v2');expect(clip.voice.provider).toBe('ElevenLabs');expect(clip.voice.name).toBe('Adam');
    const bytes=readFileSync(`public${clip.src}`);expect(bytes.length).toBe(generated.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(generated.sha256);
    expect(clip.duration).toBe(generated.duration);
    for(const edit of['detailed','cinematic']as const){
      const cue=eiffelChapterCaptionsForEdit(edit).find(c=>c.id===clip.captionId)!;
      expect(cue.text).toBe(clip.captionText);expect(clip.duration+.4).toBeLessThanOrEqual(cue.toSeconds-cue.fromSeconds);
    }
  }
});

it('reads MP3 decoder duration for every story clip rather than trusting declared duration alone',()=>{
  for(const clip of EIFFEL_STORY_NARRATION){
    const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',`public${clip.src}`],{encoding:'utf8'}));
    expect(duration).toBeGreaterThan(0);expect(duration).toBeCloseTo(clip.duration,5);
  }
},15000);
