/** Daylight work ends before the quiet evening moonrise. Pure, reversible. */
import { clamp } from './easing';

export const COLOSSEUM_WORK_END = 0.8;

export function colosseumFilmAt(rawT: number) {
  const t = clamp(rawT);
  return {
    t,
    constructionT: clamp(t / COLOSSEUM_WORK_END),
    chapter: t < COLOSSEUM_WORK_END ? 'construction' as const : 'evening' as const,
  };
}
