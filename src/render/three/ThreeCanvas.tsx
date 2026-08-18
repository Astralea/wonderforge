import { useEffect, useRef } from 'react';
import type { Wonder } from '../../data/types';
import { usePlaybackStore } from '../../store/playback';
import { WorldScene } from './WorldScene';

export type SceneMode = 'cinematic' | 'ambient';

export function ThreeCanvas({ wonder, mode }: { wonder: Wonder; mode: SceneMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = new WorldScene(canvas, wonder);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let frame = 0;
    let scheduled = false;
    let insideFrame = false;
    let lastNow = performance.now();
    let ambientElapsed = 0;

    const requestFrame = () => {
      if (disposed || scheduled) return;
      scheduled = true;
      frame = requestAnimationFrame(paint);
    };

    const paint = (now: number) => {
      scheduled = false;
      insideFrame = true;
      const delta = Math.min(100, Math.max(0, now - lastNow));
      lastNow = now;

      if (mode === 'ambient') {
        if (reducedMotion) {
          world.updateAmbient(31, 0.82);
        } else {
          ambientElapsed += delta;
          const daylightT = 0.79 + Math.sin(ambientElapsed / 55_000) * 0.035;
          // Continuous closed orbit — no modulo of cinematic t, no snap.
          world.updateAmbient(ambientElapsed / 1000, daylightT);
        }
      } else {
        const before = usePlaybackStore.getState();
        if (!reducedMotion && before.status === 'playing') before.tick(delta);
        const playback = usePlaybackStore.getState();
        world.update(playback.t, playback.t, playback.t);
      }

      insideFrame = false;
      if ((mode === 'ambient' && !reducedMotion) || usePlaybackStore.getState().status === 'playing') {
        requestFrame();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      world.resize(Math.max(1, rect.width), Math.max(1, rect.height));
      requestFrame();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const unsubscribe = usePlaybackStore.subscribe(() => {
      if (!insideFrame && mode === 'cinematic') requestFrame();
    });
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      world.dispose();
    };
  }, [mode, wonder]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full"
      role="img"
      aria-label={`${wonder.name} physical construction diorama`}
    />
  );
}
