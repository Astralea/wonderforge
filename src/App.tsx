import { useEffect, useState } from 'react';
import { CinematicView } from './ui/CinematicView';
import { Home } from './ui/Home';
import { useUiStore } from './store/ui';
import { DebugShape } from './render/DebugShape';
import { DebugWonder } from './render/DebugWonder';
import { getWonder } from './data';
import type { ShapeKind } from './data/types';

const SHAPES: ShapeKind[] = [
  'box', 'cylinder', 'cone', 'pyramid', 'prism', 'sphere', 'torus', 'ramp', 'sail',
];

export default function App() {
  const view = useUiStore((s) => s.view);
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    useUiStore.getState().syncFromHash();
    const onHash = () => {
      setHash(window.location.hash);
      useUiStore.getState().syncFromHash();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Hidden dev route for shape development: #/debug/sail
  const debugMatch = hash.match(/^#\/debug\/([a-z]+)$/);
  if (debugMatch && SHAPES.includes(debugMatch[1] as ShapeKind)) {
    return <DebugShape shape={debugMatch[1] as ShapeKind} />;
  }

  const debugWonderMatch = hash.match(
    /^#\/debug\/wonder\/([a-z0-9-]+)\/(0(?:\.\d+)?|1(?:\.0+)?)$/,
  );
  if (debugWonderMatch) {
    try {
      return (
        <DebugWonder
          wonder={getWonder(debugWonderMatch[1]!)}
          t={Number.parseFloat(debugWonderMatch[2]!)}
        />
      );
    } catch {
      // Unknown debug ids fall through to the normal app.
    }
  }

  return view === 'watch' ? <CinematicView /> : <Home />;
}
