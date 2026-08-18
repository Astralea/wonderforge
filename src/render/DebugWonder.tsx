import { useEffect } from 'react';
import type { Wonder } from '../data/types';
import { usePlaybackStore } from '../store/playback';
import { WonderCanvas } from './WonderCanvas';

/** Fixed-frame scene-authoring surface: #/debug/wonder/:id/:t. */
export function DebugWonder({ wonder, t }: { wonder: Wonder; t: number }) {
  useEffect(() => {
    usePlaybackStore.setState({ wonderId: wonder.id, status: 'paused', t });
  }, [wonder.id, t]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-umber-950">
      <WonderCanvas wonder={wonder} mode="cinematic" />
    </div>
  );
}
