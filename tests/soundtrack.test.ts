import { describe, expect, it } from 'vitest';
import { SOUNDTRACK, trackFor } from '../src/data/soundtrack';
import { createInitialState } from '../src/store/playback';

describe('soundtrack description', () => {
  it('matches the cinematic cue to the movie length exactly', () => {
    // Audio time is `t * duration`, so a movie-length change without a
    // regenerated score would silently desync the climax from the reveal.
    const movieSeconds = createInitialState().durationMs / 1000;
    expect(SOUNDTRACK.cinematic.duration).toBe(movieSeconds);
  });

  it('loops the ambient cue and plays the cinematic cue once', () => {
    expect(SOUNDTRACK.ambient.loop).toBe(true);
    expect(SOUNDTRACK.cinematic.loop).toBe(false);
  });

  it('keeps the ambient bed quieter than the cinematic score', () => {
    expect(SOUNDTRACK.ambient.volume).toBeLessThan(SOUNDTRACK.cinematic.volume);
    for (const track of Object.values(SOUNDTRACK)) {
      expect(track.volume).toBeGreaterThan(0);
      expect(track.volume).toBeLessThanOrEqual(1);
    }
  });

  it('serves every cue from the public audio directory', () => {
    for (const track of Object.values(SOUNDTRACK)) {
      expect(track.src).toMatch(/^\/audio\/[a-z0-9-]+\.mp3$/);
      expect(track.duration).toBeGreaterThan(0);
      expect(track.description.length).toBeGreaterThan(40);
      expect(track.prompt.length).toBeGreaterThan(20);
    }
  });

  it('indexes tracks by role', () => {
    expect(trackFor('cinematic').id).toBe('giza-cinematic');
    expect(trackFor('ambient').id).toBe('giza-ambient-loop');
    for (const [role, track] of Object.entries(SOUNDTRACK)) {
      expect(track.role).toBe(role);
    }
  });
});
