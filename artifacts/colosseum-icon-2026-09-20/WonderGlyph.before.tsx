import type { CSSProperties } from 'react';
import './wonderGlyph.css';
import { planGlyphStrokes, type StrokeTiming } from './wonderGlyphTiming';

type Weight = 'heavy' | 'mid' | 'fine';

export interface GlyphStroke {
  /** Absolute-command SVG path in the 32×32 glyph viewBox. */
  d: string;
  /** Build stage: 0 is the ground line; higher stages draw later. */
  stage: number;
  weight: Weight;
}

const STROKE_WIDTH: Record<Weight, number> = { heavy: 1.4, mid: 1.15, fine: 0.8 };

function s(stage: number, weight: Weight, d: string): GlyphStroke {
  return { d, stage, weight };
}

/**
 * Spec 05 §Catalog: every stroke is authored so the pen moves upward or
 * along a course. Symmetric forms are split into two strokes that share a
 * stage so both flanks rise to meet at the apex.
 */
export const GLYPH_STROKES: Record<string, readonly GlyphStroke[]> = {
  'pyramids-of-giza': [
    s(0, 'fine', 'M2 27.5 Q16 29 30 27.4'),
    s(1, 'mid', 'M4 27 L8.2 20.2'),
    s(1, 'mid', 'M12.4 27 L8.2 20.2'),
    s(1, 'fine', 'M5.2 27 L6.4 24.6 L7.6 27 M8.4 27 L9.4 25.2 L10.4 27'),
    s(2, 'heavy', 'M10 27 L16 8'),
    s(2, 'heavy', 'M22 27 L16 8'),
    s(2, 'fine', 'M16 27 V8 M14.2 16 H17.8'),
    s(3, 'heavy', 'M17.5 27 L24.2 11.2'),
    s(3, 'heavy', 'M30.5 27 L24.2 11.2'),
    s(3, 'fine', 'M22.6 14.4 H25.8 L24.2 11.2 Z'),
  ],
  stonehenge: [
    s(0, 'fine', 'M1.8 27.6 Q16 30.2 30.4 27.2'),
    s(1, 'mid', 'M4.2 27.2 V18.6 M8 27.2 V18.6 M3.5 17.8 H8.7'),
    s(1, 'mid', 'M24.2 27.2 V18.6 M28 27.2 V18.6 M23.5 17.8 H28.7'),
    s(2, 'heavy', 'M9.2 27 V14.2 M13.4 27 V14.2 M8.4 13.3 H14.2'),
    s(3, 'heavy', 'M13.8 26.6 V8.6 M19.4 26.6 V8.6 M12.8 7.7 H20.4'),
    s(4, 'heavy', 'M19.8 27 V14.2 M24 27 V14.2 M19 13.3 H24.8'),
    s(5, 'fine', 'M7.2 26.8 L12.4 25.2 L13.6 27.2'),
  ],
  colosseum: [
    s(0, 'fine', 'M3 27 Q16 30.4 29.4 26.6'),
    s(
      1,
      'heavy',
      'M4.4 26.4 V12.2 Q8.2 6.4 16 5.6 Q22.4 5.2 24.6 9.2 L22.6 11.4 L26.4 15.6 L23.2 16.6 L28.2 21.4 L24.6 22.2 L29.2 26.6',
    ),
    s(2, 'mid', 'M11.2 23.4 Q17.4 19.6 25.8 23'),
    s(3, 'fine', 'M5.4 19.6 H23.2 M6.2 14.8 H22.4'),
    s(4, 'mid', 'M6.2 26 Q8.4 19.6 10.8 26 M11.4 25.6 Q13.6 19.4 15.8 25.6 M16.4 25.2 Q18.4 19.6 20.6 25.2'),
    s(5, 'mid', 'M6.8 19.4 Q8.6 14.6 10.6 19.4 M11.2 19 Q13 14.4 14.8 19 M15.4 18.6 Q17.2 14.4 19 18.6'),
    s(6, 'fine', 'M7.4 14.6 Q8.8 10.8 10.4 14.6 M11.2 14.2 Q12.6 10.6 14.2 14.2 M15 13.8 Q16.4 10.4 18 13.8'),
  ],
  'eiffel-tower': [
    s(0, 'fine', 'M4 29 H28'),
    s(1, 'heavy', 'M8.2 29 L14.2 16.2'),
    s(1, 'heavy', 'M23.8 29 L17.8 16.2'),
    s(2, 'fine', 'M10.2 26.4 L16 21.2 L21.8 26.4 M10.6 23.6 H21.4 M11.4 28.4 L16 24.2 L20.6 28.4'),
    s(3, 'mid', 'M10.4 20.6 H21.6 M14.2 16.2 H17.8 M13.2 14.2 H18.8'),
    s(4, 'heavy', 'M14.2 16.2 L15.4 8.2'),
    s(4, 'heavy', 'M17.8 16.2 L16.6 8.2'),
    s(5, 'fine', 'M15.4 8.2 H16.6 M15.4 10.4 H16.6 M16 8.2 V3.6 M14.8 5.2 H17.2'),
  ],
  petra: [
    s(0, 'mid', 'M1.6 29 V5.2 Q6.4 2.2 9.2 7.4 V29'),
    s(0, 'mid', 'M22.8 8.4 Q27.6 2.4 30.6 5.6 V29'),
    s(1, 'heavy', 'M9.2 28.6 V16.4 H22.8 V28.6'),
    s(
      2,
      'fine',
      'M11 28.6 V16.6 M13.4 28.6 V16.6 M18.6 28.6 V16.6 M21 28.6 V16.6 M14.6 28.6 V21.6 H17.4 V28.6 M14.6 21.6 L16 19.6 L17.4 21.6',
    ),
    s(3, 'mid', 'M9.2 16.4 H22.8 L16 12.2 Z'),
    s(4, 'heavy', 'M16 12.2 A3.2 3.2 0 1 1 16 12.21'),
    s(5, 'fine', 'M16 8.8 V4.4 M14.5 5.6 Q16 3.2 17.5 5.6'),
  ],
  'chichen-itza': [
    s(0, 'fine', 'M2 28 H30'),
    s(1, 'mid', 'M4.2 28 L7.2 23.6 H24.8 L27.8 28'),
    s(2, 'mid', 'M7.2 23.6 L9.6 19.4 H22.4 L24.8 23.6'),
    s(3, 'mid', 'M9.6 19.4 L11.8 15.4 H20.2 L22.4 19.4'),
    s(4, 'heavy', 'M11.8 15.4 L13.4 12 H18.6 L20.2 15.4'),
    s(5, 'heavy', 'M13.4 12 V7.4 H18.6 V12 M14.8 12 V9 H17.2 V12'),
    s(6, 'fine', 'M14.6 28 V12 M17.4 28 V12 M12.4 27.6 Q11.2 25.4 13.4 26.4 M19.6 27.6 Q20.8 25.4 18.6 26.4'),
  ],
  'angkor-wat': [
    s(0, 'fine', 'M2 29 H30 M3.2 27.2 H28.8'),
    s(1, 'mid', 'M5 27.2 V22.4 H27 V27.2 M6.6 22.4 H25.4 V20.2 H6.6 Z'),
    s(2, 'mid', 'M7.4 20.2 L6 16.2 H8.8 Z M23.2 20.2 L21.2 16.2 H24 Z'),
    s(3, 'mid', 'M11.2 20.2 L9.6 13.6 H12.8 Z M20.8 20.2 L19.2 13.6 H22.4 Z'),
    s(4, 'heavy', 'M16 20.2 L13.4 8.2'),
    s(4, 'heavy', 'M16 20.2 L18.6 8.2'),
    s(4, 'heavy', 'M13.4 8.2 H18.6'),
    s(
      5,
      'fine',
      'M6 16.2 Q7.4 13.8 8.8 16.2 M9.6 13.6 Q11.2 10.4 12.8 13.6 M13.4 8.2 Q16 4.2 18.6 8.2 M19.2 13.6 Q20.8 10.4 22.4 13.6 M21.2 16.2 Q22.6 13.8 24 16.2',
    ),
  ],
  'forbidden-city': [
    s(0, 'mid', 'M3.6 28.4 H28.4 V25.8 H3.6 Z M13.2 28.4 V25.8 M18.8 28.4 V25.8'),
    s(1, 'fine', 'M6 25.8 H26 V23.2 H6 Z'),
    s(2, 'mid', 'M8.2 23.2 V16.6 M12.4 23.2 V16.6 M19.6 23.2 V16.6 M23.8 23.2 V16.6 M14.6 23.2 V18 H17.4 V23.2'),
    s(3, 'heavy', 'M3.2 16.6 L16 12.2 L28.8 16.6'),
    s(4, 'heavy', 'M6.2 14.8 L16 8.4 L25.8 14.8'),
    s(
      5,
      'fine',
      'M16 8.4 V6.4 M3.2 16.6 Q1.8 14.6 4.2 15.2 M28.8 16.6 Q30.2 14.6 27.8 15.2 M6.2 14.8 Q5 13.2 6.8 13.6 M25.8 14.8 Q27 13.2 25.2 13.6',
    ),
  ],
  'machu-picchu': [
    s(0, 'mid', 'M1.8 23.6 L8.8 9.2 L13.6 15.4 L18.2 5.6 L24.4 13 L30.4 23.2'),
    s(1, 'fine', 'M3.6 25.6 H22.4 M5.6 22.8 H20.2 M7.6 20 H18.2 M9.4 17.4 H16.6'),
    s(2, 'heavy', 'M8.8 26 V16.4 H13.2 L14.4 14.8 H18.2 V26'),
    s(3, 'fine', 'M11.2 26 L11.8 19.4 H15.4 L16 26 M10.2 21.6 H12.4 M16.2 21.6 H17.6'),
    s(4, 'fine', 'M18.2 5.6 L19.4 8.8 L17.2 8.4 Z'),
  ],
  'sydney-opera-house': [
    s(0, 'fine', 'M1.6 25.6 Q16 29.4 30.6 24.6'),
    s(1, 'mid', 'M5.4 25.2 H26.4 V22.8 H5.4 Z'),
    s(2, 'mid', 'M6.8 22.8 Q11.2 14.8 16.4 22.8'),
    s(3, 'heavy', 'M10.2 22.8 Q16.4 6.8 23.2 22.8'),
    s(4, 'heavy', 'M14.4 22.8 Q21 5.4 27.6 22.8'),
    s(
      5,
      'fine',
      'M8.4 22.8 Q11.6 16.8 15.2 22.8 M12.2 22.8 Q16.6 10.6 21.6 22.8 M16.6 22.8 Q21.2 9.2 25.6 22.8 M16.4 9.6 L17.2 7.4 L18.4 9.2 M21 8.2 L22 5.8 L23.4 8',
    ),
  ],
};

const PLANS = new Map<string, { strokes: StrokeTiming[]; totalMs: number }>();

/** Pen timing per glyph id, computed once from the stroke data. */
export function glyphPlan(id: string): { strokes: StrokeTiming[]; totalMs: number } | undefined {
  const strokes = GLYPH_STROKES[id];
  if (!strokes) return undefined;
  let plan = PLANS.get(id);
  if (!plan) {
    plan = planGlyphStrokes(strokes);
    PLANS.set(id, plan);
  }
  return plan;
}

/** Spec 05 §Catalog: empty until hover, then one pen builds the line drawing from the ground up. */
export function WonderGlyph({
  id,
  className = '',
  tone = 'ready',
}: {
  id: string;
  className?: string;
  /** `quiet` is the dimmer ink for In-production rows. */
  tone?: 'ready' | 'quiet';
}) {
  const strokes = GLYPH_STROKES[id];
  const plan = glyphPlan(id);
  if (!strokes || !plan) return null;
  return (
    <span
      className={`wonder-glyph ${className}`}
      data-testid={`wonder-glyph-${id}`}
      data-glyph={id}
      data-tone={tone}
      aria-hidden
      style={{ ['--wg-total' as string]: `${plan.totalMs}ms` } as CSSProperties}
    >
      <svg viewBox="0 0 32 32" aria-hidden>
        <g className="wg-plan">
          {strokes.map((stroke, i) => (
            <path key={i} d={stroke.d} />
          ))}
        </g>
        <g className="wg-ink">
          {strokes.map((stroke, i) => (
            <path
              key={i}
              className="wg-build"
              d={stroke.d}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={STROKE_WIDTH[stroke.weight]}
              pathLength={1}
              data-stage={stroke.stage}
              style={
                {
                  ['--wg-d' as string]: `${plan.strokes[i].delayMs}ms`,
                  ['--wg-t' as string]: `${plan.strokes[i].durationMs}ms`,
                } as CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
