import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { captionsFor } from '../src/data/captions';
import { getWonder } from '../src/data';
import { HISTORICAL_NARRATION_ASSETS } from '../src/data/historicalNarration.generated';
import {
  GIZA_NARRATION,
  STONEHENGE_NARRATION,
  COLOSSEUM_NARRATION,
  EIFFEL_NARRATION,
  EIFFEL_STORY_NARRATION,
  SYDNEY_NARRATION,
  narrationClipFor,
  narrationClipsForWonder,
} from '../src/data/narration';

const giza = getWonder('pyramids-of-giza');
const stonehenge = getWonder('stonehenge');

describe('prerecorded caption narration (Spec 05 §Caption voice)', () => {
  it('binds exactly one Charles clip to every authored Giza caption beat', () => {
    const beats = captionsFor(giza);
    expect(GIZA_NARRATION).toHaveLength(beats.length);

    for (const beat of beats) {
      const clip = narrationClipFor(giza.id, beat.id);
      expect(clip).toBeDefined();
      expect(clip!.captionText).toBe(beat.text);
      expect(clip!.voice.name).toBe('Charles');
      expect(clip!.voice.voiceId).toBe('zNsotODqUhvbJ5wMG7Ei');
      expect(clip!.voice.provider).toBe('ElevenLabs');
      expect(clip!.voice.model).toBe('eleven_multilingual_v2');
      expect(clip!.duration).toBeGreaterThan(2);
      expect(clip!.duration + 0.4).toBeLessThanOrEqual((beat.until - beat.from) * 60);
    }
  });

  it('binds exactly one Oliver clip to every authored Stonehenge caption beat', () => {
    const beats = captionsFor(stonehenge);
    expect(STONEHENGE_NARRATION).toHaveLength(beats.length);
    expect(narrationClipsForWonder(stonehenge.id)).toEqual(STONEHENGE_NARRATION);

    for (const beat of beats) {
      const clip = narrationClipFor(stonehenge.id, beat.id);
      expect(clip).toBeDefined();
      expect(clip!.captionText).toBe(beat.text);
      expect(clip!.voice.name).toBe('Oliver');
      expect(clip!.voice.voiceId).toBe('L1aJrPa7pLJEyYlh3Ilq');
      expect(clip!.voice.provider).toBe('ElevenLabs');
      expect(clip!.voice.model).toBe('eleven_multilingual_v2');
      expect(clip!.duration).toBeGreaterThan(2);
      expect(clip!.duration + 0.4).toBeLessThanOrEqual((beat.until - beat.from) * 60);
    }
  });

  it('binds exactly one Andrea Williams clip to every authored Colosseum caption beat', () => {
    const colosseum = getWonder('colosseum');
    const beats = captionsFor(colosseum);
    expect(COLOSSEUM_NARRATION).toHaveLength(beats.length);
    expect(narrationClipsForWonder(colosseum.id)).toEqual(COLOSSEUM_NARRATION);

    for (const beat of beats) {
      const clip = narrationClipFor(colosseum.id, beat.id);
      expect(clip).toBeDefined();
      expect(clip!.captionText).toBe(beat.text);
      expect(clip!.voice.name).toBe('Andrea Williams');
      expect(clip!.voice.voiceId).toBe('dcWyhLms5IOM9o93xsQu');
      expect(clip!.voice.provider).toBe('ElevenLabs');
      expect(clip!.voice.model).toBe('eleven_multilingual_v2');
      expect(clip!.duration).toBeGreaterThan(2);
      expect(clip!.duration + 0.4).toBeLessThanOrEqual((beat.until - beat.from) * 60);
    }
  });

  it('binds exactly one Alice clip to every authored Sydney caption beat', () => {
    const sydney = getWonder('sydney-opera-house');
    const beats = captionsFor(sydney);
    expect(SYDNEY_NARRATION).toHaveLength(beats.length);
    expect(narrationClipsForWonder(sydney.id)).toEqual(SYDNEY_NARRATION);

    for (const beat of beats) {
      const clip = narrationClipFor(sydney.id, beat.id);
      expect(clip).toBeDefined();
      expect(clip!.captionText).toBe(beat.text);
      expect(clip!.voice.name).toBe('Alice');
      expect(clip!.voice.voiceId).toBe('Xb7hH8MSUJpSbSDYk0k2');
      expect(clip!.voice.provider).toBe('ElevenLabs');
      expect(clip!.voice.model).toBe('eleven_multilingual_v2');
      expect(clip!.duration).toBeGreaterThan(2);
      expect(clip!.duration + 0.4).toBeLessThanOrEqual((beat.until - beat.from) * 60);
    }
  });

  it('binds exactly one Adam clip to every authored Eiffel caption beat', () => {
    const eiffel = getWonder('eiffel-tower');
    const beats = captionsFor(eiffel);
    expect(EIFFEL_NARRATION).toHaveLength(beats.length);
    expect(narrationClipsForWonder(eiffel.id)).toEqual([...EIFFEL_NARRATION, ...EIFFEL_STORY_NARRATION]);

    for (const beat of beats) {
      const clip = narrationClipFor(eiffel.id, beat.id);
      expect(clip).toBeDefined();
      expect(clip!.captionText).toBe(beat.text);
      expect(clip!.voice.name).toBe('Adam');
      expect(clip!.voice.voiceId).toBe('pNInz6obpgDQGcFmaJgB');
      expect(clip!.voice.provider).toBe('ElevenLabs');
      expect(clip!.voice.model).toBe('eleven_multilingual_v2');
      expect(clip!.duration).toBeGreaterThan(2);
      expect(clip!.duration + 0.4).toBeLessThanOrEqual((beat.until - beat.from) * 60);
    }
  });

  it('serves valid, non-placeholder MP3 assets from public/audio/narration', () => {
    for (const clip of GIZA_NARRATION) {
      expect(clip.src).toMatch(/^\/audio\/narration\/giza-[a-z]+-charles-[a-f0-9]{12}\.mp3$/);
      const path = join(process.cwd(), 'public', clip.src);
      expect(statSync(path).size).toBeGreaterThan(10_000);
      expect(readFileSync(path, { encoding: null }).subarray(0, 3).toString()).toBe('ID3');
    }
    for (const clip of STONEHENGE_NARRATION) {
      expect(clip.src).toMatch(/^\/audio\/narration\/stonehenge-[a-z]+-oliver-[a-f0-9]{12}\.mp3$/);
      const path = join(process.cwd(), 'public', clip.src);
      expect(statSync(path).size).toBeGreaterThan(10_000);
      expect(readFileSync(path, { encoding: null }).subarray(0, 3).toString()).toBe('ID3');
    }
    for (const clip of COLOSSEUM_NARRATION) {
      expect(clip.src).toMatch(/^\/audio\/narration\/colosseum-[a-z]+-andrea-williams-[a-f0-9]{12}\.mp3$/);
      const path = join(process.cwd(), 'public', clip.src);
      expect(statSync(path).size).toBeGreaterThan(10_000);
      expect(readFileSync(path, { encoding: null }).subarray(0, 3).toString()).toBe('ID3');
    }
    for (const clip of SYDNEY_NARRATION) {
      expect(clip.src).toMatch(/^\/audio\/narration\/sydney-alice-[a-z]+\.mp3$/);
      const path = join(process.cwd(), 'public', clip.src);
      expect(statSync(path).size).toBeGreaterThan(10_000);
      expect(readFileSync(path, { encoding: null }).subarray(0, 3).toString()).toBe('ID3');
    }
    for (const clip of EIFFEL_NARRATION) {
      expect(clip.src).toMatch(/^\/audio\/narration\/eiffel-adam-[a-z]+\.mp3$/);
      const path = join(process.cwd(), 'public', clip.src);
      expect(statSync(path).size).toBeGreaterThan(10_000);
      expect(readFileSync(path, { encoding: null }).subarray(0, 3).toString()).toBe('ID3');
    }
  });

  it('binds each historical take to its actual generated voice and delivery settings', () => {
    const clips = [...GIZA_NARRATION, ...STONEHENGE_NARRATION, ...COLOSSEUM_NARRATION];
    const expectedCount = ['pyramids-of-giza', 'stonehenge', 'colosseum']
      .reduce((count, id) => count + captionsFor(getWonder(id)).length, 0);
    expect(clips).toHaveLength(expectedCount);
    for (const clip of clips) {
      const takes = HISTORICAL_NARRATION_ASSETS.filter(take => take.src === clip.src);
      expect(takes, `${clip.captionId}: exactly one generated take`).toHaveLength(1);
      const take = takes[0]!;
      expect(take.wonderId).toBe(clip.wonderId);
      expect(take.captionId).toBe(clip.captionId);
      expect(take.captionText).toBe(clip.captionText);
      expect(take.voiceId, `${clip.captionId}: never relabel a previous voice's take`).toBe(clip.voice.voiceId);
      expect(take.voiceName).toBe(clip.voice.name);
      expect(take.provider).toBe(clip.voice.provider);
      expect(take.model).toBe(clip.voice.model);
      expect(take.duration).toBe(clip.duration);
      expect(take.volume).toBe(clip.volume);
      expect(take.settings.speed).toBe(0.92);
    }
  });

  it('gives each authored reference scene a distinct ElevenLabs voice and files', () => {
    for (const track of [GIZA_NARRATION, STONEHENGE_NARRATION, COLOSSEUM_NARRATION, SYDNEY_NARRATION, EIFFEL_NARRATION]) {
      expect(track.length, 'every reference scene needs generated narration').toBeGreaterThan(0);
    }
    const voices = [
      GIZA_NARRATION[0]!.voice.voiceId,
      STONEHENGE_NARRATION[0]!.voice.voiceId,
      COLOSSEUM_NARRATION[0]!.voice.voiceId,
      SYDNEY_NARRATION[0]!.voice.voiceId,
      EIFFEL_NARRATION[0]!.voice.voiceId,
    ];
    expect(new Set(voices).size).toBe(5);
    expect(SYDNEY_NARRATION[0]!.voice.name).toBe('Alice');
    expect(EIFFEL_NARRATION[0]!.voice.name).toBe('Adam');

    const gizaSources = new Set(GIZA_NARRATION.map((clip) => clip.src));
    for (const clip of STONEHENGE_NARRATION) {
      expect(gizaSources.has(clip.src)).toBe(false);
      expect(clip.voice.name).not.toBe('Charles');
      expect(clip.voice.voiceId).not.toBe(GIZA_NARRATION[0]!.voice.voiceId);
    }
    const taken = new Set(
      [...GIZA_NARRATION, ...STONEHENGE_NARRATION, ...COLOSSEUM_NARRATION, ...SYDNEY_NARRATION].map(
        (clip) => clip.src,
      ),
    );
    for (const clip of EIFFEL_NARRATION) {
      expect(taken.has(clip.src)).toBe(false);
      expect(clip.voice.name).toBe('Adam');
    }
    for (const clip of SYDNEY_NARRATION) {
      expect(clip.voice.name).toBe('Alice');
    }
  });

  it('returns no prerecorded clip for wonders without an ElevenLabs track', () => {
    expect(narrationClipFor('petra', 'petra-sandstone')).toBeUndefined();
    expect(narrationClipFor('machu-picchu', 'machu-picchu-fact-1')).toBeUndefined();
    expect(narrationClipsForWonder('machu-picchu')).toEqual([]);
  });
});
