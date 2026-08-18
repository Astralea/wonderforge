import { useEffect, useRef } from 'react';
import type { Part, ShapeKind, Wonder } from '../data/types';
import { lightStateAt } from '../engine/daynight';
import { isoProject, type IsoCamera } from './projection';
import { buildScene } from './sceneGraph';

const fixture: Wonder = {
  id: 'debug-shape',
  name: 'Debug',
  location: '',
  region: '',
  era: 'ancient',
  completedYear: 1,
  endsAtNight: false,
  quote: { text: '', author: '' },
  description: '',
  facts: [],
  palette: { ground: '#7a6a55', primary: '#c9b18a', accent: '#8a6f4d', sky: '#87b5d6' },
  structure: { stages: [{ name: 's', parts: [] }] },
};

const PART: Part = {
  shape: 'box',
  material: 'primary',
  position: [0, 0, 0],
  scale: [3, 3, 3],
};

/** Hidden dev route: render one tessellated shape spinning slowly. */
export function DebugShape({ shape }: { shape: ShapeKind }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 800;
    canvas.height = 800;
    let raf = 0;

    const wonder: Wonder = {
      ...fixture,
      structure: { stages: [{ name: 's', parts: [{ ...PART, shape }] }] },
    };
    const light = lightStateAt(0.4, wonder);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const cam: IsoCamera = {
        azimuth: now / 2400,
        pitch: 0.45,
        scale: 90,
        center: [400, 420],
        targetY: 1.5,
      };
      ctx.fillStyle = '#1e1812';
      ctx.fillRect(0, 0, 800, 800);
      // ground line
      const a = isoProject([-4, 0, 0], cam);
      const b = isoProject([4, 0, 0], cam);
      const c = isoProject([0, 0, -4], cam);
      const d = isoProject([0, 0, 4], cam);
      ctx.strokeStyle = '#3a3128';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();

      const faces = buildScene({ wonder, t: 1, camera: cam, light, scatter: false });
      ctx.lineWidth = 1;
      for (const f of faces) {
        ctx.beginPath();
        f.polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = f.fill;
        ctx.fill();
        ctx.strokeStyle = f.stroke;
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [shape]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-umber-950">
      <p className="mb-4 font-display tracking-[0.3em] text-gold uppercase">{shape}</p>
      <canvas ref={ref} style={{ width: 400, height: 400 }} />
    </div>
  );
}
