import { describe, expect, it } from 'vitest';
import { captionsFor, type CaptionBeat } from '../src/data/captions';
import { captionBeatProgressAt, captionStateAt } from '../src/engine/captions';
import { getWonder, WONDERS } from '../src/data';

const giza = getWonder('pyramids-of-giza');

describe('caption tracks (Spec 05 §Caption layer)', () => {
  it('schedules authored beats inside disjoint windows with reading gaps, clean of the reveal', () => {
    for (const wonder of [giza, getWonder('stonehenge'), getWonder('petra'), getWonder('colosseum'), getWonder('sydney-opera-house'), getWonder('eiffel-tower')]) {
      const beats = captionsFor(wonder);
      expect(beats.length).toBeGreaterThanOrEqual(2);
      expect(new Set(beats.map((beat) => beat.id)).size).toBe(beats.length);
      let lastUntil = 0.12; // never before the title card hands off
      for (const beat of beats) {
        expect(beat.from + 1e-12).toBeGreaterThanOrEqual(lastUntil + 0.03);
        expect(beat.until).toBeGreaterThan(beat.from + 0.08); // ≥ ~5 s at 1×
        expect(beat.until).toBeLessThanOrEqual(0.88); // the reveal stays clean
        expect(beat.text.length).toBeGreaterThan(40);
        expect(beat.text.length).toBeLessThan(120); // one readable sentence
        expect(beat.kicker.length).toBeGreaterThan(2);
        lastUntil = beat.until;
      }
    }
  });

  it('derives two authentic beats from catalog facts for every other wonder', () => {
    const authored = new Set(['pyramids-of-giza', 'stonehenge', 'petra', 'colosseum', 'sydney-opera-house', 'eiffel-tower']);
    for (const wonder of WONDERS) {
      if (authored.has(wonder.id)) continue;
      const beats = captionsFor(wonder);
      expect(beats.length).toBe(2);
      // Caption text is verbatim catalog fact text — authentic by the
      // historian rule, never invented for the caption layer.
      expect(wonder.facts).toContain(beats[0]!.text);
      expect(wonder.facts).toContain(beats[1]!.text);
    }
  });

  it('never takes the quote card corner: no beat places lower-left', () => {
    for (const wonder of WONDERS) {
      for (const beat of captionsFor(wonder)) {
        expect(beat.place).not.toBe('lower-left');
      }
    }
  });
});

describe('caption envelope engine', () => {
  const beats: CaptionBeat[] = captionsFor(giza);

  it('is null outside every window and fully on at mid-window', () => {
    expect(captionStateAt(beats, 0)).toBeNull();
    expect(captionStateAt(beats, 0.9)).toBeNull();
    expect(captionStateAt(beats, 1)).toBeNull();
    for (const beat of beats) {
      const mid = captionStateAt(beats, (beat.from + beat.until) / 2);
      expect(mid).not.toBeNull();
      expect(mid!.opacity).toBe(1);
      expect(mid!.id).toBe(beat.id);
      expect(mid!.text).toBe(beat.text);
    }
  });

  it('fades in and out smoothly at the window edges', () => {
    const beat = beats[0]!;
    const before = captionStateAt(beats, beat.from - 0.001);
    const early = captionStateAt(beats, beat.from + 0.002);
    const late = captionStateAt(beats, beat.until - 0.002);
    const after = captionStateAt(beats, beat.until + 0.001);
    expect(before).toBeNull();
    expect(early!.opacity).toBeGreaterThan(0);
    expect(early!.opacity).toBeLessThan(0.2);
    expect(late!.opacity).toBeGreaterThan(0);
    expect(late!.opacity).toBeLessThan(0.2);
    expect(after).toBeNull();
  });

  it('is a pure function of t: identical state on repeat, frozen when paused', () => {
    const t = (beats[1]!.from + beats[1]!.until) / 2;
    expect(captionStateAt(beats, t)).toEqual(captionStateAt(beats, t));
    // A frozen t holds the caption: pausing never drops text mid-read.
    for (const probe of [t, t, t]) {
      expect(captionStateAt(beats, probe)!.opacity).toBe(1);
    }
  });
});

describe('caption beat progress', () => {
  const beats: CaptionBeat[] = captionsFor(giza);

  it('marks each window upcoming, current, or past from t', () => {
    const beat = beats[0]!;
    expect(captionBeatProgressAt(beat, beat.from - 0.01)).toBe('upcoming');
    expect(captionBeatProgressAt(beat, beat.from)).toBe('current');
    expect(captionBeatProgressAt(beat, (beat.from + beat.until) / 2)).toBe('current');
    expect(captionBeatProgressAt(beat, beat.until)).toBe('past');
    expect(captionBeatProgressAt(beat, 1)).toBe('past');
  });
});
