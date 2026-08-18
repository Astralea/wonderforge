import type { Wonder } from '../data/types';
import { ThreeCanvas, type SceneMode } from './three/ThreeCanvas';

/** Stable public renderer surface used by the UI and its contract tests. */
export function WonderCanvas({
  wonder,
  mode,
}: {
  wonder: Wonder;
  mode: SceneMode;
}) {
  return <ThreeCanvas wonder={wonder} mode={mode} />;
}

export type { SceneMode };
