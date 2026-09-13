import { describe, expect, it } from 'vitest';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { SOUNDTRACK, trackFor } from '../src/data/soundtrack';
import { createInitialState } from '../src/store/playback';
import { EIFFEL_FILM_DURATION } from '../src/engine/eiffelFilm';

const giza = SOUNDTRACK['pyramids-of-giza']!;
const stonehenge = SOUNDTRACK.stonehenge!;
const colosseum = SOUNDTRACK.colosseum!;
const sydney = SOUNDTRACK['sydney-opera-house']!;
const eiffel = SOUNDTRACK['eiffel-tower']!;
const allTracks = Object.values(SOUNDTRACK).flatMap((tracks) =>
  tracks ? Object.values(tracks) : []);

describe('soundtrack description', () => {
  it('matches the cinematic cue to the movie length exactly', () => {
    // Audio time is `t * duration`, so a movie-length change without a
    // regenerated score would silently desync the climax from the reveal.
    const movieSeconds = createInitialState().durationMs / 1000;
    expect(giza.cinematic.duration).toBe(movieSeconds);
    expect(stonehenge.cinematic.duration).toBe(movieSeconds);
    expect(colosseum.cinematic.duration).toBe(movieSeconds);
    expect(sydney.cinematic.duration).toBe(movieSeconds);
    // MP3 encoder frame boundaries may differ from the movie by a few ms.
    expect(Math.abs(eiffel.cinematic.duration-EIFFEL_FILM_DURATION)).toBeLessThan(.05);
  });

  it('loops the ambient cue and plays the cinematic cue once', () => {
    for (const tracks of [giza, stonehenge, colosseum, sydney, eiffel]) {
      expect(tracks.ambient.loop).toBe(true);
      expect(tracks.cinematic.loop).toBe(false);
    }
  });

  it('keeps the ambient bed quieter than the cinematic score', () => {
    for (const tracks of [giza, stonehenge, colosseum, sydney, eiffel]) {
      expect(tracks.ambient.volume).toBeLessThan(tracks.cinematic.volume);
    }
    for (const track of allTracks) {
      expect(track.volume).toBeGreaterThan(0);
      expect(track.volume).toBeLessThanOrEqual(1);
    }
  });

  it('serves every cue from the public audio directory', () => {
    for (const track of allTracks) {
      expect(track.src).toMatch(/^\/audio\/[a-z0-9-]+\.mp3$/);
      expect(track.duration).toBeGreaterThan(0);
      expect(track.description.length).toBeGreaterThan(40);
      expect(track.prompt.length).toBeGreaterThan(20);
      expect(statSync(join(process.cwd(), 'public', track.src)).size).toBeGreaterThan(10_000);
    }
  });

  it('indexes tracks by wonder and role without a cross-cultural fallback', () => {
    expect(trackFor('pyramids-of-giza', 'cinematic')?.id).toBe('giza-cinematic');
    expect(trackFor('stonehenge', 'cinematic')?.id).toBe('stonehenge-cinematic');
    expect(trackFor('stonehenge', 'ambient')?.id).toBe('stonehenge-ambient-loop');
    expect(trackFor('colosseum', 'cinematic')?.id).toBe('colosseum-cinematic');
    expect(trackFor('colosseum', 'ambient')?.id).toBe('colosseum-ambient-loop');
    expect(trackFor('sydney-opera-house', 'cinematic')?.id).toBe('sydney-opera-house-cinematic');
    expect(trackFor('sydney-opera-house', 'ambient')?.id).toBe('sydney-opera-house-ambient-loop');
    expect(trackFor('eiffel-tower', 'cinematic')?.id).toBe('eiffel-tower-detailed');
    expect(trackFor('eiffel-tower', 'ambient')?.id).toBe('eiffel-tower-ambient-loop');
    expect(trackFor('petra', 'cinematic')).toBeUndefined();
    for (const tracks of Object.values(SOUNDTRACK)) {
      if (!tracks) continue;
      for (const [role, track] of Object.entries(tracks)) {
        expect(track.role).toBe(role);
      }
    }
  });

  it('never reuses cue identities or files between wonders', () => {
    expect(new Set(allTracks.map((track) => track.id)).size).toBe(allTracks.length);
    expect(new Set(allTracks.map((track) => track.src)).size).toBe(allTracks.length);
    expect(stonehenge.cinematic.prompt).not.toMatch(/Egypt|Egyptian|Giza/i);
    expect(stonehenge.cinematic.prompt).not.toMatch(/Celtic|Druid|bagpipe|medieval/i);
    expect(colosseum.cinematic.prompt).not.toMatch(/Egypt|Egyptian|Giza|Stonehenge|Petra/i);
    expect(colosseum.cinematic.prompt).not.toMatch(/Gregorian|opera|tarantella|gladiator/i);
    expect(colosseum.cinematic.src).not.toBe(giza.cinematic.src);
    expect(colosseum.cinematic.src).not.toBe(stonehenge.cinematic.src);
    expect(sydney.cinematic.src).not.toBe(giza.cinematic.src);
    expect(sydney.cinematic.src).not.toBe(colosseum.cinematic.src);
    expect(sydney.cinematic.prompt).not.toMatch(/Egypt|Giza|Stonehenge|didgeridoo-as-tourism|Christopher Tin/i);
    expect(sydney.cinematic.prompt).toMatch(/harbour concert house|concert-hall/i);
    expect(sydney.cinematic.prompt).not.toMatch(/88 BPM|patient labour pulse/i);
    expect(eiffel.cinematic.src).not.toBe(giza.cinematic.src);
    expect(eiffel.cinematic.src).not.toBe(sydney.cinematic.src);
    expect(eiffel.cinematic.src).not.toBe(colosseum.cinematic.src);
    expect(eiffel.cinematic.prompt).toMatch(/salon strings|restrained brass|1887-1889|Exposition Universelle/i);
    expect(eiffel.cinematic.prompt).toMatch(/(?:Never|no) accordion, musette, can-can, jazz/i);
    expect(eiffel.cinematic.prompt).not.toMatch(/Egypt|Giza|Stonehenge|Colosseum|Sydney|didgeridoo/i);
    expect(eiffel.cinematic.description).not.toMatch(/accordion|musette|can-can|jazz|Piaf/i);
  });
});
