// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WONDERS } from '../src/data';
import { GLYPH_STROKES, WonderGlyph, glyphPlan } from '../src/ui/WonderGlyph';
import { PEN, pathLength, planGlyphStrokes } from '../src/ui/wonderGlyphTiming';

afterEach(cleanup);

describe('glyph pen timing (Spec 05)', () => {
  it('measures absolute path commands in viewBox units', () => {
    expect(pathLength('M0 0 H10')).toBeCloseTo(10);
    expect(pathLength('M0 0 V7')).toBeCloseTo(7);
    expect(pathLength('M0 0 L3 4')).toBeCloseTo(5);
    expect(pathLength('M0 0 L3 4 Z')).toBeCloseTo(10);
    // Pen lifts (M) add no length; sub-paths add up.
    expect(pathLength('M0 0 H4 M10 10 V6')).toBeCloseTo(8);
    // A straight quadratic equals its chord; a bent one is longer.
    expect(pathLength('M0 0 Q5 0 10 0')).toBeCloseTo(10, 5);
    expect(pathLength('M0 0 Q5 8 10 0')).toBeGreaterThan(10);
    // Petra's near-closed arc is a full circle of r=3.2.
    expect(pathLength('M16 12.2 A3.2 3.2 0 1 1 16 12.21')).toBeCloseTo(2 * Math.PI * 3.2, 0);
    expect(() => pathLength('M0 0 c1 1 2 2 3 3')).toThrow(/unsupported/);
  });

  it('gives longer strokes proportionally more time, within the pen clamps', () => {
    const plan = planGlyphStrokes(
      [
        { d: 'M0 0 H10', stage: 0 },
        { d: 'M0 0 H20', stage: 0 },
        { d: 'M0 0 H0.5', stage: 0 },
        { d: 'M0 0 H400', stage: 0 },
      ],
      { unitsPerSecond: 100, minMs: 120, maxMs: 500, overlap: 0.4 },
    );
    expect(plan.strokes[0].durationMs).toBe(120); // 100 ms → clamped up
    expect(plan.strokes[1].durationMs).toBe(200);
    expect(plan.strokes[2].durationMs).toBe(120);
    expect(plan.strokes[3].durationMs).toBe(500);
    expect(plan.strokes.every((t) => t.delayMs === 0)).toBe(true);
  });

  it('starts each stage after the previous one is mostly drawn', () => {
    const plan = planGlyphStrokes(
      [
        { d: 'M0 0 H30', stage: 0 }, // 300 ms
        { d: 'M0 0 H10', stage: 1 }, // 100 ms
        { d: 'M0 0 H20', stage: 1 }, // 200 ms
        { d: 'M0 0 H10', stage: 2 },
      ],
      { unitsPerSecond: 100, minMs: 50, maxMs: 1000, overlap: 0.4 },
    );
    expect(plan.strokes.map((t) => t.delayMs)).toEqual([0, 180, 180, 300]);
    expect(plan.totalMs).toBe(400);
  });

  it('plans every catalog glyph as a short, ordered build', () => {
    for (const wonder of WONDERS) {
      const strokes = GLYPH_STROKES[wonder.id];
      expect(strokes, wonder.id).toBeTruthy();
      const stages = [...new Set(strokes.map((s) => s.stage))].sort((a, b) => a - b);
      expect(stages[0], wonder.id).toBe(0);
      expect(stages, wonder.id).toEqual(stages.map((_, i) => i));
      const plan = glyphPlan(wonder.id)!;
      expect(plan.totalMs, wonder.id).toBeGreaterThanOrEqual(500);
      expect(plan.totalMs, wonder.id).toBeLessThanOrEqual(1300);
      const groundStart = plan.strokes.filter((_, i) => strokes[i].stage === 0);
      expect(groundStart.every((t) => t.delayMs === 0), wonder.id).toBe(true);
      strokes.forEach((s, i) => {
        expect(plan.strokes[i].durationMs).toBeGreaterThanOrEqual(PEN.minMs);
        expect(plan.strokes[i].durationMs).toBeLessThanOrEqual(PEN.maxMs);
        if (i > 0 && s.stage > strokes[i - 1].stage) {
          expect(plan.strokes[i].delayMs, `${wonder.id} stroke ${i}`).toBeGreaterThan(
            plan.strokes[i - 1].delayMs,
          );
        }
      });
    }
  });

  it('draws independent straight or curved flanks upward toward the apex', () => {
    const straightFlank = /^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/;
    const risingFlank = /^M[\d.]+ [\d.]+(?: [LQ][\d. ]+)+$/;
    let checked = 0;
    for (const [id, strokes] of Object.entries(GLYPH_STROKES)) {
      for (const stroke of strokes) {
        const isFlank = straightFlank.test(stroke.d)
          || (id === 'eiffel-tower' && risingFlank.test(stroke.d));
        if (stroke.stage === 0 || !isFlank) continue;
        checked += 1;
        const segments = stroke.d.match(/[MLQ][^MLQ]*/g)!;
        let previousY = Number(segments[0].slice(1).trim().split(/\s+/)[1]);
        for (const segment of segments.slice(1)) {
          const points = segment.slice(1).trim().split(/\s+/).map(Number);
          const endY = points[points.length - 1];
          expect(endY, stroke.d).toBeLessThanOrEqual(previousY);
          if (segment[0] === 'Q') {
            // A rising endpoint alone does not prevent a curve dipping down.
            expect(points[1], stroke.d).toBeLessThanOrEqual(previousY);
            expect(points[1], stroke.d).toBeGreaterThanOrEqual(endY);
          }
          previousY = endY;
        }
      }
    }
    // Pyramid ridges/flanks and Eiffel legs remain independent rising strokes.
    expect(checked).toBeGreaterThanOrEqual(12);
  });

  it('splits pyramid flanks so both sides rise together', () => {
    const giza = GLYPH_STROKES['pyramids-of-giza'];
    const great = giza.filter((s) => s.weight === 'heavy' && s.d.endsWith('L17 7.4'));
    expect(great).toHaveLength(2);
    expect(great[0].stage).toBe(great[1].stage);
    const eiffel = GLYPH_STROKES['eiffel-tower'];
    const legs = eiffel.filter((s) => s.weight === 'heavy' && /^M[\d.]+ 28\.5 L/.test(s.d));
    expect(legs).toHaveLength(2);
    expect(legs[0].stage).toBe(legs[1].stage);
  });
});

describe('catalog wonder glyphs (Spec 05)', () => {
  it('draws a distinct line glyph for every catalog id', () => {
    const marks = new Set<string>();
    for (const wonder of WONDERS) {
      const { container } = render(<WonderGlyph id={wonder.id} />);
      const glyph = container.querySelector(`[data-testid="wonder-glyph-${wonder.id}"]`);
      expect(glyph).toBeTruthy();
      expect(glyph?.getAttribute('data-glyph')).toBe(wonder.id);
      const svg = glyph?.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.querySelectorAll('.wg-build').length).toBeGreaterThan(3);
      const mark = svg?.innerHTML ?? '';
      expect(mark.length).toBeGreaterThan(80);
      expect(marks.has(mark)).toBe(false);
      marks.add(mark);
    }
  });

  it('draws Stonehenge as a horseshoe of trilithons, not a single lintel', () => {
    const { container } = render(<WonderGlyph id="stonehenge" />);
    const strokes = container.querySelectorAll('.wg-build');
    expect(strokes.length).toBeGreaterThanOrEqual(6);
    const d = [...strokes].map((node) => node.getAttribute('d') ?? '').join(' ');
    // Two closed low lintels and one closed tall lintel retain real stone thickness.
    expect((d.match(/Z/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((d.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it('draws the Colosseum as stacked arcades with a ruined wing', () => {
    const { container } = render(<WonderGlyph id="colosseum" />);
    const strokes = container.querySelectorAll('.wg-build');
    expect(strokes.length).toBeGreaterThanOrEqual(6);
    const d = [...strokes].map((node) => node.getAttribute('d') ?? '').join(' ');
    // Three rows carry complete arch openings; the outer wall steps down on the right.
    const arcades = GLYPH_STROKES.colosseum.filter((stroke) => (stroke.d.match(/Q/g) ?? []).length >= 4);
    expect(arcades).toHaveLength(3);
    const wall = GLYPH_STROKES.colosseum.find((stroke) => stroke.weight === 'heavy')!;
    expect((wall.d.match(/L/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(d).toContain('Q16 30.1');
  });

  it('keeps the full family inside the small viewBox with a bounded SVG cost', () => {
    for (const wonder of WONDERS) {
      const strokes = GLYPH_STROKES[wonder.id];
      expect(strokes.length, wonder.id).toBeLessThanOrEqual(12);
      for (const stroke of strokes) {
        expect(pathLength(stroke.d), wonder.id).toBeGreaterThan(0);
        // All artwork uses absolute coordinates; control points stay inside
        // the 32-unit frame as well as the visible contour.
        expect(stroke.d, wonder.id).not.toMatch(/[aclhmqstv]/);
        const coordinates = stroke.d.match(/-?\d*\.?\d+/g)!.map(Number);
        expect(Math.min(...coordinates), wonder.id).toBeGreaterThanOrEqual(1);
        expect(Math.max(...coordinates), wonder.id).toBeLessThanOrEqual(31);
      }
      const { container } = render(<WonderGlyph id={wonder.id} />);
      expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 32 32');
      expect(container.querySelectorAll('filter,image,foreignObject')).toHaveLength(0);
      expect(container.querySelectorAll('path')).toHaveLength(strokes.length * 2);
    }
  });

  it('carries per-stroke pen timing and a dotted plan under the ink', () => {
    const { container } = render(<WonderGlyph id="stonehenge" />);
    const glyph = container.querySelector('[data-testid="wonder-glyph-stonehenge"]') as HTMLElement;
    expect(glyph.style.getPropertyValue('--wg-total')).toMatch(/^\d+ms$/);
    const ink = [...container.querySelectorAll<SVGPathElement>('.wg-ink .wg-build')];
    const plan = [...container.querySelectorAll<SVGPathElement>('.wg-plan path')];
    expect(plan.length).toBe(ink.length);
    plan.forEach((p, i) => expect(p.getAttribute('d')).toBe(ink[i].getAttribute('d')));
    let lastStage = -1;
    let lastDelay = -1;
    for (const path of ink) {
      expect(path.getAttribute('pathLength')).toBe('1');
      const delay = Number.parseInt(path.style.getPropertyValue('--wg-d'), 10);
      const duration = Number.parseInt(path.style.getPropertyValue('--wg-t'), 10);
      expect(Number.isFinite(delay)).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(PEN.minMs);
      const stage = Number(path.dataset.stage);
      expect(stage).toBeGreaterThanOrEqual(lastStage);
      if (stage > lastStage) expect(delay).toBeGreaterThan(lastDelay);
      lastStage = stage;
      lastDelay = delay;
    }
  });

  it('uses quiet ink for In-production rows and ready ink by default', () => {
    const { container } = render(
      <>
        <WonderGlyph id="stonehenge" />
        <WonderGlyph id="petra" tone="quiet" />
      </>,
    );
    expect(container.querySelector<HTMLElement>('[data-glyph="stonehenge"]')?.dataset.tone).toBe('ready');
    expect(container.querySelector<HTMLElement>('[data-glyph="petra"]')?.dataset.tone).toBe('quiet');
  });

  it('stays undrawn until hover, then builds the stroke', () => {
    const css = readFileSync('src/ui/wonderGlyph.css', 'utf8');
    expect(css).toMatch(/stroke-dashoffset:\s*1/);
    expect(css).toMatch(/\.group:hover[\s\S]*stroke-dashoffset:\s*0/);
    expect(css).not.toMatch(/animation-play-state:\s*paused/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('draws at pen speed, cools fresh ink, and fades out instead of rewinding', () => {
    const css = readFileSync('src/ui/wonderGlyph.css', 'utf8');
    // Hover: per-stroke duration/delay from the planner.
    expect(css).toMatch(/stroke-dashoffset var\(--wg-t[^)]*\) cubic-bezier\([^)]*\) var\(--wg-d/);
    // Hot ink cools to the row's ink after the stroke lands. Both tones are
    // absolute colors: Chrome cannot interpolate SVG paint to currentColor.
    expect(css).toMatch(/--wg-hot:\s*color-mix\(in srgb, var\(--color-gold/);
    expect(css).toMatch(/\.wg-build \{[^}]*stroke:\s*var\(--wg-hot\)/);
    expect(css).toMatch(/\.group:hover \.wonder-glyph \.wg-build[\s\S]*?stroke:\s*var\(--wg-ink\)/);
    expect(css).not.toMatch(/\.wg-build \{[^}]*stroke:\s*currentColor/);
    expect(css).toMatch(/\[data-tone='quiet'\]/);
    expect(css).toMatch(/stroke [\d.]+s ease-out calc\(var\(--wg-d[^)]*\) \+ var\(--wg-t/);
    // Leave: opacity fades, then the dash offset snaps back with zero duration.
    expect(css).toMatch(/opacity [\d.]+s ease-out,\s*stroke-dashoffset 0s linear [\d.]+s/);
    // Plan underdrawing is dotted and only visible on hover.
    expect(css).toMatch(/\.wg-plan path \{[^}]*stroke-dasharray:[^}]*opacity:\s*0;/);
    expect(css).toMatch(/\.group:hover \.wonder-glyph \.wg-plan path[\s\S]*?opacity:\s*0\.\d+/);
    // Rise is anchored at the ground line, so the ground itself never moves.
    expect(css).toMatch(/transform-origin:\s*50% 8\d%/);
  });
});
