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
    s(0, 'fine', 'M2 27.8 Q16 28.8 30 27.8'),
    s(1, 'mid', 'M2.5 26.8 L7.4 19.3'),
    s(1, 'mid', 'M12.1 26.8 L7.4 19.3'),
    s(2, 'heavy', 'M8.5 26.8 L17 7.4'),
    s(2, 'heavy', 'M25.2 26.8 L17 7.4'),
    s(2, 'fine', 'M20.1 26.8 L17 7.4'),
    s(3, 'mid', 'M21 17.5 L24.2 12.1'),
    s(3, 'mid', 'M30 26.8 L24.2 12.1'),
    s(3, 'fine', 'M27.3 26.8 L24.2 12.1'),
    s(4, 'fine', 'M15.4 11 H18.5 M11.8 23 H19.5 M4.7 23.5 H8.5'),
  ],
  stonehenge: [
    s(0, 'fine', 'M2 27.6 Q16 30 30 27.6'),
    s(1, 'mid', 'M4.8 26.3 L5.1 17.7 H7.3 L7.6 26.3 M25 26.3 L24.7 17.7 H27 L27.4 26.3'),
    s(2, 'mid', 'M3.7 17.7 L3.9 15.3 L10.2 15.6 V17.8 Z M22 17.8 L21.8 15.6 L28.4 15.3 V17.7 Z'),
    s(3, 'heavy', 'M10 27 L10.3 10.5 H12.8 L13.1 27 M18.6 27 L18.9 10.5 H21.4 L21.6 27'),
    s(3, 'heavy', 'M9.4 10.5 L9.7 7.8 L22 7.5 L22.5 10.5 Z'),
    s(4, 'fine', 'M8 24.8 V19.5 M24 24.8 V19.5 M14.7 25.8 L15 16.5 H16.9 L17.3 25.8 M13.9 16.5 H18 V14.6 H14 Z'),
  ],
  colosseum: [
    s(0, 'fine', 'M2 27.8 Q16 30.4 30 27.8'),
    s(1, 'heavy', 'M3.2 25.5 V12.1 Q4 7.9 15.7 6.5 Q21 6.1 24.1 8.1 L24.1 10.4 L22.4 11.2 L25.7 14.6 L24.1 16 L28.7 20.4 L28.7 25.5 Q16 30.1 3.2 25.5'),
    s(2, 'fine', 'M3.6 22 Q16 26.2 27.8 22 M3.6 17.4 Q14.9 21.2 24.5 18 M3.6 12.8 Q13.2 16.3 22.5 13.7'),
    s(3, 'mid', 'M5.3 25.5 V23.8 Q6.5 21.6 7.7 24.3 V26.2 M10 26.7 V24.8 Q11.4 22.4 12.8 25.3 V27.2 M15.3 27.4 V25.7 Q16.7 23.2 18.1 25.7 V27.4 M20.8 27 V25.2 Q22.1 22.7 23.4 24.8 V26.4 M25.5 25.8 V24.1 Q26.2 22.4 27 23.5 V25.3'),
    s(3, 'mid', 'M5.3 20.8 V19.1 Q6.5 17.2 7.7 19.7 V21.5 M10 22.2 V20.1 Q11.4 18.1 12.8 20.7 V22.7 M15.3 22.9 V21 Q16.7 18.6 18.1 21 V22.9 M20.8 22.3 V20.8 Q22 18.7 23.2 20.2 V21.8'),
    s(4, 'fine', 'M5.3 16.2 V14.7 Q6.5 12.9 7.7 15.2 V16.8 M10 17.5 V15.8 Q11.4 13.8 12.8 16.2 V18 M15.3 18.2 V16.4 Q16.7 14.3 18.1 16.3 V18 M20.7 17.6 V16.1 Q21.5 14.8 22.3 15.7'),
    s(4, 'fine', 'M6.2 12 V10.9 M10.9 13.5 V12.4 M16.1 13.9 V12.8 M20.7 13.2 V12.1 M4.6 10.7 Q14.3 4.7 23.1 8.5 M7.5 11.4 Q14.8 7.9 21.7 10.5'),
  ],
  'eiffel-tower': [
    s(0, 'fine', 'M3 29 H29'),
    s(1, 'heavy', 'M5.1 28.5 L12.3 17.2'),
    s(1, 'heavy', 'M26.9 28.5 L19.7 17.2'),
    s(1, 'mid', 'M9.6 28.5 Q16 16.7 22.4 28.5'),
    s(2, 'mid', 'M9.2 21.5 H22.8 M8.6 23 H23.4 M5.1 28.5 H9.6 M22.4 28.5 H26.9'),
    s(3, 'heavy', 'M12.3 17.2 L14.7 7.6'),
    s(3, 'heavy', 'M19.7 17.2 L17.3 7.6'),
    s(3, 'fine', 'M12.7 17 L18.3 12.6 L14.7 8.2 M19.3 17 L13.7 12.6 L17.3 8.2'),
    s(4, 'mid', 'M11.5 16.6 H20.5 M11.5 18 H20.5 M14.2 7.6 H17.8 M16 6.8 V2.2'),
    s(5, 'fine', 'M7.4 25 L11.3 26.2 M24.6 25 L20.7 26.2 M13.7 12.5 H18.3 M14.7 7.6 L15.3 5.7 H16.7 L17.3 7.6'),
  ],
  petra: [
    s(0, 'fine', 'M3 29 H29 M5 27.7 H27'),
    s(1, 'heavy', 'M6 27.6 V17 H26 V27.6'),
    s(1, 'mid', 'M8 26.9 V18.2 M11.3 26.9 V18.2 M20.7 26.9 V18.2 M24 26.9 V18.2 M13.8 27.5 V21.3 H18.2 V27.5'),
    s(2, 'mid', 'M4.8 17 H27.2 M6.4 15.6 L16 10.5 L25.6 15.6 Z'),
    s(3, 'mid', 'M7.2 13.6 V8.1 L11.7 5.9 V12 M24.8 13.6 V8.1 L20.3 5.9 V12 M13.2 11.7 V7.1 Q16 5.2 18.8 7.1 V11.7'),
    s(3, 'fine', 'M12.8 7.2 Q16 3.4 19.2 7.2 M16 5.1 V2.8 M14.8 3.3 Q16 1.8 17.2 3.3 M2.7 26.7 L2.2 7.2 L4 3.8 M29.3 26.7 L29.8 8.1 L28.2 4.2'),
  ],
  'chichen-itza': [
    s(0, 'fine', 'M2 28.7 H30'),
    s(1, 'heavy', 'M3.4 27.6 H28.6 L27.2 25 H26.1 V24 H5.9 V25 H4.8 Z'),
    s(2, 'mid', 'M5.9 24 L7.4 21.5 H8 V20.5 H24 V21.5 H24.6 L26.1 24 M8 20.5 L9.4 18 H10 V17 H22 V18 H22.6 L24 20.5'),
    s(3, 'mid', 'M10 17 L11.3 14.5 H11.8 V13.5 H20.2 V14.5 H20.7 L22 17 M11.8 13.5 L12.7 11.3 V10.5 H19.3 V11.3 L20.2 13.5'),
    s(3, 'heavy', 'M12.4 10.5 V5.4 H19.6 V10.5 M11.6 5.4 H20.4 M14.7 10.5 V7.1 H17.3 V10.5'),
    s(3, 'fine', 'M12.1 27.6 L14.6 10.7 M19.9 27.6 L17.4 10.7 M12.8 24 H19.2 M13.3 20.5 H18.7 M13.8 17 H18.2 M14.2 13.5 H17.8'),
  ],
  'angkor-wat': [
    s(0, 'fine', 'M2 28.8 H30 M3.5 27.1 H28.5'),
    s(1, 'mid', 'M5 27.1 V22.5 H27 V27.1 M7.1 26 V24 M10.7 26 V24 M14.3 26 V23.5 M17.8 26 V23.5 M21.3 26 V24 M24.9 26 V24'),
    s(2, 'mid', 'M4.8 22.5 V21 H5.3 V19.8 Q4.4 18.8 6.5 15.9 Q8.6 18.8 7.7 19.8 V21 H8.2 V22.5 M23.8 22.5 V21 H24.3 V19.8 Q23.4 18.8 25.5 15.9 Q27.6 18.8 26.7 19.8 V21 H27.2 V22.5'),
    s(3, 'mid', 'M8.8 22.5 V20.5 H9.3 V18.5 H9.7 V17 Q8.7 15.3 10.8 11.6 Q12.9 15.3 11.9 17 V18.5 H12.3 V20.5 H12.8 V22.5 M19.2 22.5 V20.5 H19.7 V18.5 H20.1 V17 Q19.1 15.3 21.2 11.6 Q23.3 15.3 22.3 17 V18.5 H22.7 V20.5 H23.2 V22.5'),
    s(4, 'heavy', 'M12.8 22.5 V20 H13.3 V17.8 H13.8 V15.8 H14.1 V13.8 Q12.8 10.1 16 4.2'),
    s(4, 'heavy', 'M19.2 22.5 V20 H18.7 V17.8 H18.2 V15.8 H17.9 V13.8 Q19.2 10.1 16 4.2'),
    s(4, 'fine', 'M14.1 13.8 H17.9 M13.8 15.8 H18.2 M13.3 17.8 H18.7 M15.1 22.5 V19.5 H16.9 V22.5 M16 7.6 V12.1'),
  ],
  'forbidden-city': [
    s(0, 'mid', 'M2.6 28.6 H29.4 M4.2 28.6 V26.8 H27.8 V28.6 M5.7 26.8 V24.8 H26.3 V26.8'),
    s(1, 'mid', 'M8 24.8 V18.6 M11.9 24.8 V18.6 M20.1 24.8 V18.6 M24 24.8 V18.6 M14.4 24.8 V20.5 H17.6 V24.8'),
    s(2, 'heavy', 'M2.5 17.1 Q5.7 18.9 8.2 16.7 L16 12 L23.8 16.7 Q26.3 18.9 29.5 17.1 L27.6 19 H4.4 Z'),
    s(2, 'fine', 'M9.8 15.7 V12.7 M22.2 15.7 V12.7 M11.5 22.9 H20.5'),
    s(3, 'heavy', 'M6 11.4 Q8.2 13 10.2 10.8 L16 6.8 L21.8 10.8 Q23.8 13 26 11.4 L24.1 13.2 H7.9 Z'),
    s(3, 'fine', 'M12.5 6.8 H19.5 M16 6.8 V4.8 M14.2 28.6 V24.8 M17.8 28.6 V24.8 M9.8 12.5 L16 7.8 L22.2 12.5'),
  ],
  'machu-picchu': [
    s(0, 'fine', 'M2.5 28.2 H27 M4 25.8 H24.8 M5.4 23.4 H21.9 M6.8 21 H19.1'),
    s(1, 'heavy', 'M10.1 20.2 L14.1 13.3 L16.1 13.8 L20.5 4.5 L23.8 8.7 L25.8 16.9 L29.4 22.9'),
    s(2, 'fine', 'M12 19 L13.4 11.7 L15.9 8.5 L17.8 10.3 M20.5 4.5 L21 11.3 L19 17.2'),
    s(3, 'mid', 'M5.5 21 V16.8 L9.3 14.9 L12.7 16.8 V20.9 M5.5 16.8 H12.7 M9.3 14.9 V20.9'),
    s(4, 'mid', 'M13.7 25.8 V19.1 L17.1 17.6 L20.8 19.1 V25.8 M13.7 19.1 H20.8 M17.1 17.6 V22.3'),
    s(5, 'fine', 'M15.3 25.8 V22.5 H17.1 V25.8 M8 23.4 V21 M10.7 25.8 V23.4 M22.8 25.8 L25.8 22.8 H28.3'),
  ],
  'sydney-opera-house': [
    s(0, 'fine', 'M2 28 Q8 29.7 14 28 M17 28 Q23 29.7 30 28'),
    s(1, 'mid', 'M3.5 26.4 H28.5 V24.3 H3.5 Z M5.5 24.3 L7 22.5 H27.1'),
    s(2, 'mid', 'M4.7 22.5 Q4.6 17 6.5 13.9 Q12 16.2 14.5 22.5 Z'),
    s(3, 'heavy', 'M9.7 22.5 Q10.8 12.5 14.7 7.1 Q14.4 17.1 21 22.5 Z'),
    s(3, 'heavy', 'M16.2 22.5 Q19.1 9.7 23 5.2 Q20.7 16.8 28.2 22.5 Z'),
    s(4, 'fine', 'M6.5 13.9 Q8 19.7 12.6 22.5 M14.7 7.1 Q15.3 17.9 18.7 22.5 M23 5.2 Q21.3 17.4 25.6 22.5 M6 25.3 H27'),
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
