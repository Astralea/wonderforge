import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { getWonder } from '../src/data';
import { captionsFor } from '../src/data/captions';
import { HISTORICAL_NARRATION_ASSETS } from '../src/data/historicalNarration.generated';
import { colosseumFilmAt } from '../src/engine/colosseumFilm';
import { captionStateAt } from '../src/engine/captions';
import { narrationClipFor } from '../src/data/narration';

const chapter = (wonderId: string, id: string) => captionsFor(getWonder(wonderId)).find(beat => beat.id === id)!;

describe('historical chapters follow their films', () => {
  it('identifies all three royal projects at the actual Giza handoffs', () => {
    const khufu = chapter('pyramids-of-giza', 'giza-khufu');
    const khafre = chapter('pyramids-of-giza', 'giza-khafre');
    const menkaure = chapter('pyramids-of-giza', 'giza-menkaure');
    expect(khufu.from).toBeGreaterThanOrEqual(.03);
    expect(khufu.until).toBeLessThan(.5);
    expect(khafre.from).toBeGreaterThan(.5);
    expect(khafre.until).toBeLessThan(.8443676);
    expect(menkaure.from).toBeGreaterThanOrEqual(.8443675);
    expect(menkaure.from).toBeLessThan(.905);
    expect(menkaure.text).toContain('three separate reigns');
  });

  it('places Stonehenge transport and alignment chapters with their visible operations', () => {
    const pits = chapter('stonehenge', 'stonehenge-pits');
    const lintels = chapter('stonehenge', 'stonehenge-lintels');
    const bluestones = chapter('stonehenge', 'stonehenge-bluestones');
    const axis = chapter('stonehenge', 'stonehenge-axis');
    expect(pits.until).toBeLessThanOrEqual(.5236);
    expect(lintels.from).toBeGreaterThanOrEqual(.48);
    expect(lintels.until).toBeLessThan(.7675);
    expect(bluestones.from).toBeGreaterThanOrEqual(.58);
    expect(bluestones.until).toBeLessThanOrEqual(.828);
    expect(bluestones.text).toMatch(/^Many /);
    expect(axis.from).toBeGreaterThanOrEqual(.78);
    expect(axis.text).toContain('midsummer sunrise');
    expect(axis.text).toContain('midwinter sunset');
  });

  it('ends on the construction milestone after work finishes, then leaves the final hold without narration', () => {
    const wonder = getWonder('colosseum');
    const beats = captionsFor(wonder);
    const last = beats.at(-1)!;
    expect(last.id).toBe('colosseum-titus');
    expect(colosseumFilmAt(last.from).constructionT).toBe(1);
    expect(last.text).toContain('Construction began under Vespasian');
    expect(last.text).toContain('Titus opened the amphitheatre in AD 80');
    expect(last.until).toBeLessThanOrEqual(.94);
    expect(beats.some(beat => /moonrise|after sunset/i.test(beat.kicker + ' ' + beat.text))).toBe(false);
    expect(HISTORICAL_NARRATION_ASSETS.some(clip => clip.captionId === 'colosseum-moonrise')).toBe(false);
    expect(narrationClipFor('colosseum', 'colosseum-moonrise')).toBeUndefined();
    for (const t of [.95, .97, 1]) expect(captionStateAt(beats, t)).toBeNull();
  });

  it('checks generated assets against the actual decoded duration and recorded hash', () => {
    for (const clip of HISTORICAL_NARRATION_ASSETS) {
      const beat = chapter(clip.wonderId, clip.captionId);
      expect(clip.captionText).toBe(beat.text);
      const path = `${process.cwd()}/public${clip.src}`;
      const bytes = readFileSync(path);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(clip.sha256);
      expect(bytes.length).toBe(clip.bytes);
      const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path], { encoding: 'utf8' }));
      expect(duration).toBeCloseTo(clip.duration, 5);
      expect(duration + .4).toBeLessThanOrEqual((beat.until - beat.from) * 60);
    }
  });

  it('measures the delivered MP3 loudness and peak instead of trusting filter targets', () => {
    for (const clip of HISTORICAL_NARRATION_ASSETS) {
      const result = spawnSync('ffmpeg', [
        '-hide_banner', '-nostats', '-i', `${process.cwd()}/public${clip.src}`,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-',
      ], { encoding: 'utf8' });
      expect(result.status, clip.captionId).toBe(0);
      const measurement = result.stderr.match(/\{\s*"input_i"[^]*?\}/);
      expect(measurement, clip.captionId).not.toBeNull();
      const stats = JSON.parse(measurement![0]);
      const integrated = Number(stats.input_i);
      const peak = Number(stats.input_tp);
      expect(Math.abs(integrated + 16), clip.captionId).toBeLessThanOrEqual(.3);
      expect(peak, clip.captionId).toBeLessThanOrEqual(-1.5);
      expect(clip.mastering.version).toBe('measured-limiter-v1');
      expect(clip.mastering.integratedLufs).toBe(integrated);
      expect(clip.mastering.truePeakDbtp).toBe(peak);
    }
  }, 15000);
});
