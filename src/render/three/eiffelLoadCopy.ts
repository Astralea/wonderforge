/** Display labels for Eiffel asset readiness. Keys are stable; labels may change. */
export const EIFFEL_LOAD_STAGES = [
  { key: 'paris', label: 'City' },
  { key: 'ironwork', label: 'Ironwork' },
  { key: 'lifting-frames', label: 'Lifting frames' },
  { key: 'iron-joints', label: 'Joints' },
  { key: 'fastenings', label: 'Fastenings' },
  { key: 'first-platform', label: 'First platform' },
  { key: 'steam-winch', label: 'Steam winch' },
  { key: 'upper-platforms', label: 'Upper platforms' },
  { key: 'summit', label: 'Summit' },
] as const;

export type EiffelLoadStageKey = (typeof EIFFEL_LOAD_STAGES)[number]['key'];

export const EIFFEL_LOAD_STAGE_INITIAL = EIFFEL_LOAD_STAGES[0].label;
export const EIFFEL_LOAD_STAGE_OPENING = 'Starting film…';
export const GENERIC_LOAD_STAGE = 'Loading…';

const LABELS: Record<EiffelLoadStageKey, string> = Object.fromEntries(
  EIFFEL_LOAD_STAGES.map((stage) => [stage.key, stage.label]),
) as Record<EiffelLoadStageKey, string>;

export function eiffelLoadStageLabel(key: EiffelLoadStageKey | undefined): string {
  return key ? LABELS[key] : EIFFEL_LOAD_STAGE_OPENING;
}
