import type { CompiledScene } from '../../render/sceneCompiler';
import { compileScene } from '../../render/sceneCompiler';
import pyramidsScene from './pyramids-of-giza.scene.json';
import stonehengeScene from './stonehenge.scene.json';
import petraScene from './petra.scene.json';
import colosseumScene from './colosseum.scene.json';
import chichenScene from './chichen-itza.scene.json';
import machuScene from './machu-picchu.scene.json';
import angkorScene from './angkor-wat.scene.json';
import forbiddenScene from './forbidden-city.scene.json';
import eiffelScene from './eiffel-tower.scene.json';
import sydneyScene from './sydney-opera-house.scene.json';

/** Scene documents keyed by wonder id (Spec 07) — the canonical structures. */
const SCENE_DOCS: Record<string, unknown> = {
  'pyramids-of-giza': pyramidsScene,
  stonehenge: stonehengeScene,
  petra: petraScene,
  colosseum: colosseumScene,
  'chichen-itza': chichenScene,
  'machu-picchu': machuScene,
  'angkor-wat': angkorScene,
  'forbidden-city': forbiddenScene,
  'eiffel-tower': eiffelScene,
  'sydney-opera-house': sydneyScene,
};

const cache = new Map<string, CompiledScene>();

/** Compiled scene for a wonder, or null if it has no JSON scene doc yet. */
export function getCompiledScene(wonderId: string): CompiledScene | null {
  if (!(wonderId in SCENE_DOCS)) return null;
  const hit = cache.get(wonderId);
  if (hit) return hit;
  const compiled = compileScene(SCENE_DOCS[wonderId]);
  cache.set(wonderId, compiled);
  return compiled;
}
