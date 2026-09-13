import type { WebGLRenderer } from 'three';

export interface RendererDiagnostics {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
}

export interface ThreeGameDiagnostics {
  /** Plain sampled state and source-node pose snapshots; no writable scene handles. */
  eiffelLongLoad?: Record<string, unknown>;
  eiffelCrowd?: Record<string, unknown>;
  camera?: { position: number[]; direction: number[]; fov: number; aspect: number; near: number };
  renderer: RendererDiagnostics;
  scene: 'giza-reference' | 'stonehenge-reference' | 'petra-reference' | 'colosseum-reference' | 'sydney-opera-house-reference' | 'eiffel-tower-reference' | 'legacy-fallback';
}

export function readRendererDiagnostics(renderer: WebGLRenderer): RendererDiagnostics {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  };
}

declare global {
  interface Window {
    __WONDERFORGE_RENDERER__?: RendererDiagnostics;
    __THREE_GAME_DIAGNOSTICS__?: ThreeGameDiagnostics;
  }
}
