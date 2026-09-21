/**
 * Spec 05 §Catalog: one pen draws each catalog glyph. This module is pure
 * (no React/DOM) so stroke timing can be tested without a browser.
 *
 * `pathLength` measures an absolute-command SVG path (M L H V Q A Z) in
 * viewBox units. `planGlyphStrokes` turns measured lengths into per-stroke
 * CSS delays/durations: duration ∝ length (constant pen speed, clamped so a
 * short tick never pops), and build stages start in order with a slight
 * overlap so the drawing has rhythm instead of a uniform sweep.
 */

export interface GlyphStrokeInput {
  d: string;
  stage: number;
}

export interface StrokeTiming {
  delayMs: number;
  durationMs: number;
}

export interface PenSettings {
  /** viewBox units the pen covers per second. */
  unitsPerSecond: number;
  /** Shortest stroke duration; keeps small ticks readable. */
  minMs: number;
  /** Longest single stroke duration; keeps one long outline from stalling the build. */
  maxMs: number;
  /** Fraction of a stage that the next stage may overlap (0 = strictly sequential). */
  overlap: number;
}

export const PEN: PenSettings = {
  unitsPerSecond: 96,
  minMs: 140,
  maxMs: 460,
  overlap: 0.45,
};

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi;

function numbers(chunk: string): number[] {
  return (chunk.match(NUMBER) ?? []).map(Number);
}

function quadLength(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): number {
  const steps = 16;
  let length = 0;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return length;
}

function arcLength(
  x0: number,
  y0: number,
  rx: number,
  ry: number,
  largeArc: number,
  x1: number,
  y1: number,
): number {
  const r = (Math.abs(rx) + Math.abs(ry)) / 2;
  if (r === 0) return Math.hypot(x1 - x0, y1 - y0);
  const chord = Math.hypot(x1 - x0, y1 - y0);
  let sweep = 2 * Math.asin(Math.min(1, chord / (2 * r)));
  if (largeArc) sweep = Math.PI * 2 - sweep;
  return r * sweep;
}

/** Length of an absolute-command SVG path in viewBox units. Throws on commands the glyph set does not use. */
export function pathLength(d: string): number {
  let length = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const tokens = d.match(/[A-Za-z][^A-Za-z]*/g) ?? [];
  for (const token of tokens) {
    const command = token[0];
    const args = numbers(token.slice(1));
    switch (command) {
      case 'M': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          if (i === 0) {
            x = args[i];
            y = args[i + 1];
            startX = x;
            startY = y;
          } else {
            length += Math.hypot(args[i] - x, args[i + 1] - y);
            x = args[i];
            y = args[i + 1];
          }
        }
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          length += Math.hypot(args[i] - x, args[i + 1] - y);
          x = args[i];
          y = args[i + 1];
        }
        break;
      }
      case 'H': {
        for (const nx of args) {
          length += Math.abs(nx - x);
          x = nx;
        }
        break;
      }
      case 'V': {
        for (const ny of args) {
          length += Math.abs(ny - y);
          y = ny;
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i + 3 < args.length; i += 4) {
          length += quadLength(x, y, args[i], args[i + 1], args[i + 2], args[i + 3]);
          x = args[i + 2];
          y = args[i + 3];
        }
        break;
      }
      case 'A': {
        for (let i = 0; i + 6 < args.length; i += 7) {
          length += arcLength(x, y, args[i], args[i + 1], args[i + 3], args[i + 5], args[i + 6]);
          x = args[i + 5];
          y = args[i + 6];
        }
        break;
      }
      case 'Z':
      case 'z': {
        length += Math.hypot(startX - x, startY - y);
        x = startX;
        y = startY;
        break;
      }
      default:
        throw new Error(`wonderGlyphTiming: unsupported path command "${command}" in "${d}"`);
    }
  }
  return length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Per-stroke delay/duration for one glyph. Strokes sharing a stage start
 * together; the next stage begins once the slowest stroke of the current
 * stage is `1 - overlap` of the way through.
 */
export function planGlyphStrokes(
  strokes: readonly GlyphStrokeInput[],
  pen: PenSettings = PEN,
): { strokes: StrokeTiming[]; totalMs: number } {
  const durations = strokes.map((stroke) =>
    Math.round(clamp((pathLength(stroke.d) / pen.unitsPerSecond) * 1000, pen.minMs, pen.maxMs)),
  );
  const stages = [...new Set(strokes.map((stroke) => stroke.stage))].sort((a, b) => a - b);
  const stageStart = new Map<number, number>();
  let cursor = 0;
  for (const stage of stages) {
    stageStart.set(stage, Math.round(cursor));
    let stageDuration = 0;
    strokes.forEach((stroke, i) => {
      if (stroke.stage === stage) stageDuration = Math.max(stageDuration, durations[i]);
    });
    cursor += stageDuration * (1 - pen.overlap);
  }
  const timings = strokes.map((stroke, i) => ({
    delayMs: stageStart.get(stroke.stage) ?? 0,
    durationMs: durations[i],
  }));
  const totalMs = timings.reduce((max, t) => Math.max(max, t.delayMs + t.durationMs), 0);
  return { strokes: timings, totalMs };
}
