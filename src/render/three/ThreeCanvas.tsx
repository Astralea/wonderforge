import { useEffect, useRef, useState } from 'react';
import type { Wonder } from '../../data/types';
import { usePlaybackStore } from '../../store/playback';
import { WorldScene } from './WorldScene';
import { WonderArrival } from './WonderArrival';
import { arrivalStageFor } from './wonderArrivalDrawings';
import { eiffelFilmEditSourceTAt } from '../../engine/eiffelFilmEdit';

export type SceneMode = 'cinematic' | 'ambient';

export function ThreeCanvas({
  wonder,
  mode,
}: {
  wonder: Wonder;
  mode: SceneMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadPercent, setLoadPercent] = useState(0);
  const [assetError, setAssetError] = useState(false);
  const [loadStage, setLoadStage] = useState(() => arrivalStageFor(wonder.id));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setAssetError(false);
    setLoadPercent(0);
    let cancelled = false;
    let startupFrame = 0;
    let stopWorld: (() => void) | undefined;
    setLoadStage(arrivalStageFor(wonder.id));
    if (mode === 'cinematic') usePlaybackStore.setState({ assetsReady: false });
    canvas.dataset.assets = 'loading';
    const startWorld = () => {
      if (cancelled) return;
      let sceneReady = false;
      const world = new WorldScene(canvas, wonder);
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
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
          const sourceT =
            wonder.id === 'eiffel-tower'
              ? eiffelFilmEditSourceTAt(playback.eiffelEdit, playback.t)
              : playback.t;
          if (
            wonder.id === 'eiffel-tower' &&
            playback.eiffelEdit === 'cinematic'
          ) {
            world.update(sourceT, sourceT, sourceT, {
              edit: playback.eiffelEdit,
              t: playback.t,
            });
          } else {
            world.update(sourceT, sourceT, sourceT);
          }
        }

        setLoadStage(world.loadStage ?? arrivalStageFor(wonder.id));
        setLoadPercent(
          sceneReady
            ? 100
            : Math.min(99, Math.floor((world.loadProgress ?? 0) * 100)),
        );
        insideFrame = false;
        if (
          !sceneReady ||
          (mode === 'ambient' && !reducedMotion) ||
          usePlaybackStore.getState().status === 'playing'
        ) {
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
      canvas.dataset.assets = 'loading';
      void world.ready
        .then(() => {
          if (disposed) return;
          sceneReady = true;
          canvas.dataset.assets = 'ready';
          lastNow = performance.now();
          if (mode === 'cinematic')
            usePlaybackStore.setState({ assetsReady: true });
          requestFrame();
        })
        .catch((error: unknown) => {
          if (disposed) return;
          sceneReady = true;
          canvas.dataset.assets = 'error';
          setAssetError(true);
          console.error('WonderForge asset loading failed', error);
        });

      stopWorld = () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        unsubscribe();
        world.dispose();
      };
    };
    const startSafely = () => {
      try {
        startWorld();
      } catch (error) {
        if (cancelled) return;
        canvas.dataset.assets = 'error';
        setAssetError(true);
        console.error('WonderForge scene initialization failed', error);
      }
    };
    // Two frame boundaries give the SVG a real paint before CPU-heavy terrain
    // and model initialization. No timer invents or advances loading progress.
    startupFrame = requestAnimationFrame(() => {
      if (!cancelled) startupFrame = requestAnimationFrame(startSafely);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(startupFrame);
      stopWorld?.();
    };
  }, [mode, wonder]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        role="img"
        aria-label={`Animated construction of ${wonder.name}`}
      />
      {!assetError && loadPercent < 100 && (
        <WonderArrival wonder={wonder} percent={loadPercent} stage={loadStage} />
      )}
      {assetError && (
        <div
          role="alert"
          className="absolute inset-0 z-20 grid place-content-center gap-3 bg-black/70 p-6 text-center text-parchment"
        >
          <p>We couldn’t load this scene.</p>
          <button
            className="min-h-11 cursor-pointer rounded border border-parchment/40 px-4"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )}
    </>
  );
}
