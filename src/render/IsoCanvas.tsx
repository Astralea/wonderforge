import { useEffect, useRef } from 'react';
import type { Wonder } from '../data/types';
import { getCompiledScene } from '../data/scenes';
import { orbitState } from '../engine/camera';
import { lightStateAt, lerpColor } from '../engine/daynight';
import { mulberry32 } from '../engine/random';
import { usePlaybackStore } from '../store/playback';
import { backdropColor, backdropPhase, backdropSilhouette, layerDetails } from './backdrop';
import { cloudAlphaAt, cloudSpecs, cloudXAt } from './atmosphere';
import { birdPositions, dustPuffs } from './life';
import { isoProject, type IsoCamera } from './projection';
import { blobShadowOffset, buildScene, structureFootprint } from './sceneGraph';
import { shadeFace, sunDirection } from './shade';
import type { Vec3 } from './vec';

export type SceneMode = 'cinematic' | 'ambient';

const AMBIENT_CAMERA_SPEED = 0.006; // azimuth turns per second-equivalent
const AMBIENT_DAY_SPEED = 0.012;

interface StarPoint {
  x: number;
  y: number;
  r: number;
  twinkle: number;
}

/**
 * Canvas 2D painting surface. The store is still the clock: in cinematic mode
 * we tick playback every animation frame; ambient mode freezes construction
 * and free-runs the camera + day cycle. Spec 06.
 */
export function IsoCanvas({ wonder, mode }: { wonder: Wonder; mode: SceneMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // JSON scene document (Spec 07) or the catalog's hand-authored structure
    const compiled = getCompiledScene(wonder.id);
    const structure = compiled?.structure ?? wonder.structure;

    let raf = 0;
    let lastNow = performance.now();
    let width = 0;
    let height = 0;
    let lastPaintedT = -1;
    let lastAzimuth = NaN;

    const stars: StarPoint[] = (() => {
      const rand = mulberry32('wonderforge-stars');
      return Array.from({ length: 150 }, () => ({
        x: rand(),
        y: rand() * 0.62,
        r: 0.6 + rand() * 1.3,
        twinkle: 0.35 + rand() * 0.65,
      }));
    })();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastPaintedT = -1; // force repaint
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const paint = (t: number, lightT: number, azimuth: number, radius: number, targetY: number) => {
      const light = lightStateAt(lightT, wonder);
      const footprint = structureFootprint(structure);
      const cam: IsoCamera = {
        azimuth,
        pitch: (30 * Math.PI) / 180,
        scale: Math.min(width, height) / (radius * 0.95),
        center: [width / 2, height * 0.5],
        targetY,
      };

      // --- sky ---
      const horizon = lerpColor(light.sky, '#fff2dd', 0.16);
      const zenith = lerpColor(
        light.sky,
        '#10283d',
        0.2 + light.emissive * 0.28,
      );
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, zenith);
      skyGrad.addColorStop(0.62, light.sky);
      skyGrad.addColorStop(1, horizon);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // --- stars (fade in with the night crossfade) ---
      if (light.emissive > 0.01) {
        ctx.fillStyle = '#e8eeff';
        for (const s of stars) {
          ctx.globalAlpha = light.emissive * s.twinkle;
          ctx.beginPath();
          ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // --- sun / moon glow ---
      const sunDir = sunDirection(light);
      const sunWorld: Vec3 = [
        sunDir[0] * radius * 2.6,
        targetY + sunDir[1] * radius * 2.6,
        sunDir[2] * radius * 2.6,
      ];
      const sunScreen = isoProject(sunWorld, cam);
      const glowR = Math.min(width, height) * 0.34;
      const glow = ctx.createRadialGradient(
        sunScreen.x, sunScreen.y, 0,
        sunScreen.x, sunScreen.y, glowR,
      );
      glow.addColorStop(0, light.sun.color);
      glow.addColorStop(0.4, lerpColor(light.sun.color, light.sky, 0.5));
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = glow;
      ctx.fillRect(sunScreen.x - glowR, sunScreen.y - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;

      // --- clouds: seeded clusters drifting with the day, gone at night ---
      const cloudAlpha = cloudAlphaAt(lightT, light.emissive);
      if (cloudAlpha > 0.02) {
        const warmBelly = lerpColor('#ffffff', light.sun.color, 0.3);
        for (const spec of cloudSpecs(wonder.id)) {
          const cx = cloudXAt(spec, lightT, azimuth, width);
          const cy = spec.y0 * height;
          ctx.shadowColor = 'rgba(255,255,255,0.28)';
          ctx.shadowBlur = 12 * spec.s;
          ctx.globalAlpha = cloudAlpha * 0.62;
          ctx.fillStyle = warmBelly;
          ctx.beginPath();
          ctx.ellipse(cx, cy + 6 * spec.s, 42 * spec.s, 11 * spec.s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = cloudAlpha * 0.82;
          ctx.fillStyle = '#ffffff';
          for (const [ox, oy, orx, ory] of [
            [-26, 3, 22, 9],
            [-7, -5, 29, 13],
            [18, -1, 25, 11],
            [34, 5, 17, 8],
          ] as const) {
            ctx.beginPath();
            ctx.ellipse(
              cx + ox * spec.s,
              cy + oy * spec.s,
              orx * spec.s,
              ory * spec.s,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      // --- background layers (Spec 07): horizon silhouettes, far → near ---
      const groundR = footprint * 1.6;
      const horizonY =
        cam.center[1] - groundR * Math.sin(cam.pitch) * cam.scale;
      if (compiled) {
        for (const layer of compiled.backdrop) {
          const phase = backdropPhase(azimuth, layer.distance, width);
          const heightPx = layer.height * footprint * cam.scale;
          const sil = backdropSilhouette(
            layer,
            width,
            horizonY + 2,
            heightPx,
            phase,
            wonder.id,
          );
          ctx.beginPath();
          sil.points.forEach(([x, y], i) =>
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y),
          );
          ctx.closePath();
          const layerColor = backdropColor(layer, light);
          ctx.fillStyle = layerColor;
          ctx.fill();

          // layer details (Spec 08): river ribbon / palm treeline at its foot
          const details = layerDetails(layer, width, horizonY + 2, phase, wonder.id, light);
          if (details.river) {
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = details.river.color;
            ctx.fillRect(0, details.river.y, width, details.river.h);
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = lerpColor(details.river.color, '#ffffff', 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 24) {
              const y = details.river.y + details.river.h * 0.4 + Math.sin(x * 0.05) * 1.2;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          if (details.palms.length) {
            const palmColor = lerpColor(layerColor, '#1c2b14', 0.55);
            ctx.strokeStyle = palmColor;
            ctx.lineCap = 'round';
            for (const p of details.palms) {
              const h = 7 * p.s;
              ctx.lineWidth = 1.2 * p.s;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + 0.8 * p.s, p.y - h);
              ctx.stroke();
              ctx.lineWidth = 1 * p.s;
              for (const f of [-1.6, -0.6, 0.6, 1.6]) {
                ctx.beginPath();
                ctx.moveTo(p.x + 0.8 * p.s, p.y - h);
                ctx.quadraticCurveTo(
                  p.x + 0.8 * p.s + f * 3.4 * p.s,
                  p.y - h - 1.4 * p.s,
                  p.x + 0.8 * p.s + f * 4.6 * p.s,
                  p.y - h + 1.6 * p.s,
                );
                ctx.stroke();
              }
            }
          }
        }
      }

      // --- birds (foreground fauna, sky band) ---
      if (compiled?.foreground.fauna) {
        const birds = birdPositions(wonder.id, compiled.foreground.fauna.count, lightT);
        if (birds.length) {
          ctx.strokeStyle = lerpColor('#1a1410', light.sky, light.emissive * 0.6);
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.75 * (1 - light.emissive * 0.7);
          for (const b of birds) {
            const bx = (b.x * 1.2 - 0.1) * width;
            const by = (1 - b.y) * height * 0.5 + height * 0.03;
            const w = 5;
            const flapY = b.flap * 3;
            ctx.beginPath();
            ctx.moveTo(bx - w, by + flapY);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + w, by + flapY);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }

      // --- ground: a floating diorama island ---------------------------
      // Sized from the structure footprint (not the camera radius) so the
      // island edge — and the sky beyond it — is always in frame.
      // Harbor terrain: the island itself is a body of water.
      const isHarbor = compiled?.terrain === 'harbor';
      const groundLit = shadeFace(
        isHarbor ? '#3d6e8f' : wonder.palette.ground,
        [0, 1, 0],
        light,
        isHarbor ? 'water' : 'ground',
      );
      const ring: [number, number][] = [];
      const edgeRand = mulberry32(`${wonder.id}-island-edge`);
      for (let i = 0; i < 56; i++) {
        const a = (i / 56) * Math.PI * 2;
        const r = groundR * (0.985 + edgeRand() * 0.03);
        const p = isoProject(
          [Math.cos(a) * r, 0, Math.sin(a) * r],
          cam,
        );
        ring.push([p.x, p.y]);
      }
      const island = (dy: number) => {
        ctx.beginPath();
        ring.forEach(([x, y], i) =>
          i === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy),
        );
        ctx.closePath();
      };
      // island side wall: same ellipse pushed down, darker
      const edgePx = Math.max(9, groundR * cam.scale * 0.055);
      island(edgePx);
      ctx.fillStyle = lerpColor(groundLit, '#100c08', 0.55);
      ctx.fill();
      // island top
      const groundCenter = isoProject([0, 0, 0], cam);
      const groundGrad = ctx.createRadialGradient(
        groundCenter.x, groundCenter.y, 0,
        groundCenter.x, groundCenter.y, groundR * cam.scale,
      );
      groundGrad.addColorStop(0, lerpColor(groundLit, '#ffffff', 0.07));
      groundGrad.addColorStop(0.72, groundLit);
      groundGrad.addColorStop(1, lerpColor(groundLit, '#100c08', 0.18));
      island(0);
      ctx.fillStyle = groundGrad;
      ctx.fill();

      // --- ground texture + site roads (Spec 08 §Site) ---
      {
        const texRand = mulberry32(`${wonder.id}-ground`);
        if (isHarbor) {
          // water shimmer: short horizontal light strokes
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.1;
          for (let i = 0; i < 16; i++) {
            const a = texRand() * Math.PI * 2;
            const r = Math.sqrt(texRand()) * groundR * 0.85;
            const p = isoProject(
              [Math.cos(a) * r, 0.02, Math.sin(a) * r],
              cam,
            );
            const len = (6 + texRand() * 14) * 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x - len / 2, p.y);
            ctx.lineTo(p.x + len / 2, p.y);
            ctx.stroke();
          }
        } else {
          // desert ripples / mown grass: faint short arcs
          ctx.strokeStyle = lerpColor(groundLit, '#100c08', 0.16);
          ctx.lineWidth = 1;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.4;
          for (let i = 0; i < 22; i++) {
            const a = texRand() * Math.PI * 2;
            const r = Math.sqrt(texRand()) * groundR * 0.82;
            const p = isoProject(
              [Math.cos(a) * r, 0.02, Math.sin(a) * r],
              cam,
            );
            const len = 5 + texRand() * 9;
            const tilt = texRand() * Math.PI;
            ctx.beginPath();
            ctx.moveTo(p.x - (len / 2) * Math.cos(tilt), p.y - (len / 4) * Math.sin(tilt));
            ctx.quadraticCurveTo(
              p.x,
              p.y - (len / 4) * Math.sin(tilt) - 1.5,
              p.x + (len / 2) * Math.cos(tilt),
              p.y + (len / 4) * Math.sin(tilt),
            );
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // authored site roads (packed dirt ribbons under the structure)
        for (const road of compiled?.foreground.roads ?? []) {
          const a = isoProject([road.from[0], 0.02, road.from[1]], cam);
          const b = isoProject([road.to[0], 0.02, road.to[1]], cam);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = lerpColor(groundLit, '#8a6f4d', 0.5);
          ctx.lineWidth = (road.width ?? 1.4) * cam.scale;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.55;
          ctx.stroke();
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = (road.width ?? 1.4) * cam.scale * 0.45;
          ctx.strokeStyle = lerpColor(groundLit, '#ffffff', 0.35);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // --- blob shadow ---
      const [sdx, sdz] = blobShadowOffset(light, footprint);
      const shadowR = footprint * 0.58;
      const shadowAlpha =
        0.1 *
        (0.45 + 0.55 * Math.min(1, light.sun.intensity / 1.6)) *
        (1 - light.emissive * 0.65);
      if (shadowAlpha > 0.02) {
        const center = isoProject([sdx, 0.025, sdz], cam);
        const lowSun = 1 - Math.sin((light.sun.elevation * Math.PI) / 180);
        const rx = shadowR * cam.scale * (1 + lowSun * 0.35);
        const ry = rx * Math.sin(cam.pitch) * 0.62;
        const softShadow = ctx.createRadialGradient(
          center.x,
          center.y,
          0,
          center.x,
          center.y,
          rx,
        );
        softShadow.addColorStop(0, `rgba(16,12,8,${shadowAlpha})`);
        softShadow.addColorStop(0.58, `rgba(16,12,8,${shadowAlpha * 0.5})`);
        softShadow.addColorStop(1, 'rgba(16,12,8,0)');
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = softShadow;
        ctx.fill();
      }

      // --- dust puffs where parts just landed (ground-plane decals) ---
      if (compiled?.foreground.dust) {
        const dustColor = lerpColor(groundLit, '#ffffff', 0.4);
        for (const puff of dustPuffs(wonder.id, structure, t)) {
          const c = isoProject([puff.x, 0.05, puff.z], cam);
          const r = puff.size * cam.scale * (0.25 + puff.age * 1.3);
          ctx.beginPath();
          ctx.ellipse(
            c.x, c.y,
            r,
            r * Math.sin(cam.pitch) * 0.7,
            0, 0, Math.PI * 2,
          );
          ctx.fillStyle = dustColor;
          ctx.globalAlpha = (1 - puff.age) * 0.32;
          ctx.fill();
          // A pair of lifting motes makes the landing read as volume, while
          // their offsets stay a pure function of the puff coordinates.
          for (let j = 0; j < 2; j++) {
            const drift = Math.sin(puff.x * 1.7 + puff.z * 0.8 + j * 2.1);
            ctx.beginPath();
            ctx.ellipse(
              c.x + drift * r * 0.45,
              c.y - puff.age * r * (0.8 + j * 0.35),
              r * (0.34 + j * 0.12),
              r * (0.18 + j * 0.05),
              0,
              0,
              Math.PI * 2,
            );
            ctx.globalAlpha = (1 - puff.age) * (0.18 - j * 0.04);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      // --- structure + scaffolding + workers (depth-sorted together) ---
      const faces = buildScene({
        wonder,
        structure,
        foreground: compiled?.foreground,
        t,
        camera: cam,
        light,
        scatter: !isHarbor && (compiled?.foreground.scatter ?? true),
      });
      ctx.lineWidth = Math.max(0.52, Math.min(0.78, cam.scale * 0.045));
      ctx.lineJoin = 'round';
      for (const face of faces) {
        ctx.globalAlpha = face.opacity;
        ctx.beginPath();
        face.polygon.forEach(([x, y], i) =>
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y),
        );
        ctx.closePath();
        ctx.fillStyle = face.fill;
        ctx.fill();
        ctx.strokeStyle = face.stroke;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, now - lastNow);
      lastNow = now;
      const aspect = width / Math.max(1, height);

      let t: number;
      let lightT: number;
      let azimuth: number;
      let radius: number;
      let targetY: number;

      if (mode === 'cinematic') {
        const store = usePlaybackStore.getState();
        store.tick(dt);
        t = store.t;
        lightT = t;
        const o = orbitState(t, structure, undefined, aspect);
        azimuth = o.azimuth;
        radius = o.radius;
        targetY = o.targetY;
      } else {
        const elapsed = now / 1000;
        t = 1; // construction frozen complete
        lightT = (elapsed * AMBIENT_DAY_SPEED) % 1;
        const o = orbitState(0.5, structure, undefined, aspect);
        azimuth =
          (structure.startAzimuth ?? 0) +
          elapsed * AMBIENT_CAMERA_SPEED * 2 * Math.PI;
        radius = o.radius;
        targetY = o.targetY;
      }

      // Skip repaints when nothing moves (paused cinematic on a still frame).
      const still =
        mode === 'cinematic' &&
        usePlaybackStore.getState().status !== 'playing' &&
        t === lastPaintedT &&
        azimuth === lastAzimuth;
      if (still) return;
      lastPaintedT = t;
      lastAzimuth = azimuth;

      paint(t, lightT, azimuth, radius, targetY);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [wonder, mode]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}
