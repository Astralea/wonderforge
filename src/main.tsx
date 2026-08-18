import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { usePlaybackStore } from './store/playback.ts';

// Dev-only handle for visual verification: seek/pause from the console.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__wf = usePlaybackStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
