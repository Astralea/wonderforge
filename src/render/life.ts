import type { Part, StructureSpec } from '../data/types';
import { clamp, easeOutCubic } from '../engine/easing';
import { boundingCylinder, expandStructure, flattenStages } from '../engine/geometry';
import { mulberry32 } from '../engine/random';
import {
  PLACEMENT_CONTACT,
  STACK_STAGGER,
  stageWindows,
  type EntranceState,
  type TimeWindow,
} from '../engine/timeline';

/** Spec 07 §Foreground life — everything here is a pure function of t. */

export interface DynamicPart {
  part: Part;
  state: EntranceState;
}

const HIDDEN: EntranceState = { visible: false, yOffset: 0, scale: 0, opacity: 0 };

/** How far past its own window a scaffold stands before sinking away. */
const SCAFFOLD_EXIT_DELAY = 0.015;
const SCAFFOLD_EXIT_SPAN = 0.05;

/** Scaffolding entrance: poles drop in quickly at stage start (appear +
 * settle, like any placement), and are dismantled fast after the stage —
 * a short sink, then carried off (fade). Never scaled, never long travel. */
export function scaffoldState(part: Part, t: number, window: TimeWindow): EntranceState {
  const riseP = clamp((t - (window.start - 0.01)) / 0.03);
  const outP = clamp((t - (window.end + SCAFFOLD_EXIT_DELAY)) / SCAFFOLD_EXIT_SPAN);
  if (riseP <= 0 || outP >= 1) return HIDDEN;
  const height = part.scale[1];
  const drop = Math.min(height * 0.15, 1.6);
  return {
    visible: true,
    yOffset: drop * (1 - easeOutCubic(riseP)) - drop * 0.8 * easeOutCubic(outP),
    scale: 1,
    opacity: 1 - outP,
  };
}

/** Wood-frame scaffolding (poles + rails) boxed around a stage's footprint. */
export function scaffoldParts(
  structure: StructureSpec,
  stageNames: string[],
): { part: Part; stageIndex: number }[] {
  const out: { part: Part; stageIndex: number }[] = [];
  const stages = structure.stages;
  for (const name of stageNames) {
    const stageIndex = stages.findIndex((s) => s.name === name);
    if (stageIndex < 0) continue;
    const parts = stages[stageIndex]!.parts;
    if (parts.length === 0) continue;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, top = 0;
    for (const p of parts) {
      minX = Math.min(minX, p.position[0] - p.scale[0] / 2);
      maxX = Math.max(maxX, p.position[0] + p.scale[0] / 2);
      minZ = Math.min(minZ, p.position[2] - p.scale[2] / 2);
      maxZ = Math.max(maxZ, p.position[2] + p.scale[2] / 2);
      top = Math.max(top, p.position[1] + p.scale[1]);
    }
    const pad = 0.8;
    const corners: [number, number][] = [
      [minX - pad, minZ - pad],
      [maxX + pad, minZ - pad],
      [maxX + pad, maxZ + pad],
      [minX - pad, maxZ + pad],
    ];
    const poles: { part: Part; stageIndex: number }[] = corners.map(([x, z], i) => ({
      part: {
        shape: 'box',
        material: 'accent',
        position: [x, 0, z],
        scale: [0.22, Math.min(top * 0.55, 8), 0.22],
        entrance: 'scaffold',
        order: i,
      },
      stageIndex,
    }));
    const railH = Math.min(top * 0.4, 4.5);
    const rails: { part: Part; stageIndex: number }[] = corners.map(([x, z], i) => {
      const [nx, nz] = corners[(i + 1) % corners.length]!;
      const cx = (x + nx) / 2;
      const cz = (z + nz) / 2;
      const len = Math.hypot(nx - x, nz - z);
      const yaw = Math.atan2(nz - z, nx - x);
      return {
        part: {
          shape: 'box',
          material: 'accent',
          position: [cx, railH, cz],
          scale: [len, 0.16, 0.16],
          rotation: [0, -yaw, 0],
          entrance: 'scaffold',
          order: i,
        },
        stageIndex,
      };
    });
    out.push(...poles, ...rails);
  }
  return out;
}

const WORKER_LAPS = 5; // closed loops over the whole movie

export interface WorkerSpecNorm {
  count: number;
  path: 'perimeter' | 'road' | 'ramp';
  carry: boolean;
}

export interface RoadRoute {
  from: [number, number];
  to: [number, number];
}

export interface RampRoute extends RoadRoute {
  height: number;
  stage: string;
}

/**
 * Workers on site during construction. `perimeter`: walking a loop around the
 * footprint. `road`: ping-pong along the first authored road — outbound
 * hauling a block on a pole, inbound empty-handed (Spec 08 §Workers).
 * Deterministic: position is a pure function of (seed, index, t).
 */
export function workerParts(
  seed: string,
  structure: StructureSpec,
  specs: WorkerSpecNorm[],
  t: number,
  road?: RoadRoute,
  ramp?: RampRoute,
): DynamicPart[] {
  if (t < 0.06 || t > 0.93) return [];
  const appear = clamp((t - 0.06) / 0.04);
  const vanish = clamp((0.93 - t) / 0.04);
  const alpha = Math.min(appear, vanish);
  if (alpha <= 0) return [];

  const footprint = boundingCylinder(flattenStages(structure)).radius;
  const loopR = footprint * 1.12;
  const rand = mulberry32(`${seed}-workers`);
  const out: DynamicPart[] = [];

  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      const phase = rand();
      const speed = 0.8 + rand() * 0.4;
      let x: number;
      let z: number;
      let yaw: number;
      let carrying: boolean;
      let baseY = 0;
      let routeAlpha = 1;

      if (spec.path === 'ramp') {
        if (!ramp) continue;
        const stageIndex = structure.stages.findIndex((stage) => stage.name === ramp.stage);
        if (stageIndex < 0) continue;
        const window = stageWindows(structure.stages)[stageIndex]!;
        if (t < window.start || t > window.end) continue;
        const stageP = clamp((t - window.start) / (window.end - window.start));
        routeAlpha = Math.min(clamp(stageP / 0.08), clamp((1 - stageP) / 0.08));
        const tt = stageP * 4 * 2 * speed + phase * 2;
        const seg = tt % 2;
        const outbound = seg < 1;
        const s = outbound ? seg : 2 - seg;
        x = ramp.from[0] + (ramp.to[0] - ramp.from[0]) * s;
        z = ramp.from[1] + (ramp.to[1] - ramp.from[1]) * s;
        baseY = ramp.height * s;
        const dirSign = outbound ? 1 : -1;
        yaw = -Math.atan2(
          (ramp.to[1] - ramp.from[1]) * dirSign,
          (ramp.to[0] - ramp.from[0]) * dirSign,
        );
        carrying = spec.carry && outbound;
      } else if (spec.path === 'road' && road) {
        // ping-pong along the route (triangle wave, period 2 = round trip)
        const laps = 4;
        const tt = t * laps * 2 * speed + phase * 2;
        const seg = tt % 2;
        const outbound = seg < 1;
        const s = outbound ? seg : 2 - seg;
        x = road.from[0] + (road.to[0] - road.from[0]) * s;
        z = road.from[1] + (road.to[1] - road.from[1]) * s;
        const dirSign = outbound ? 1 : -1;
        yaw = -Math.atan2(
          (road.to[1] - road.from[1]) * dirSign,
          (road.to[0] - road.from[0]) * dirSign,
        );
        carrying = spec.carry && outbound;
      } else {
        const dir = rand() > 0.5 ? 1 : -1;
        const angle = (phase + dir * t * WORKER_LAPS * speed) * Math.PI * 2;
        x = Math.cos(angle) * loopR;
        z = Math.sin(angle) * loopR;
        yaw = -angle + (dir > 0 ? 0 : Math.PI);
        carrying = spec.carry;
      }

      const wobble = Math.sin(t * 46 + i * 2.4) * 0.04; // walk bob
      const body: Part = {
        shape: 'box',
        material: 'accent',
        position: [x, baseY + wobble, z],
        scale: [0.34, 0.82, 0.34],
        rotation: [carrying ? 0.08 : 0, yaw, 0],
      };
      const head: Part = {
        shape: 'sphere',
        material: 'primary',
        position: [x, baseY + 0.82 + wobble, z],
        scale: [0.28, 0.3, 0.28],
        rotation: [0, yaw, 0],
      };
      const state: EntranceState = {
        visible: true,
        yOffset: 0,
        scale: 1,
        opacity: alpha * routeAlpha,
      };
      out.push({ part: body, state }, { part: head, state });
      if (carrying) {
        const pole: Part = {
          shape: 'box',
          material: 'accent',
          position: [x, baseY + 0.98 + wobble, z],
          scale: [1.1, 0.09, 0.09],
          rotation: [0, yaw + Math.PI / 2, 0],
        };
        const block: Part = {
          shape: 'box',
          material: 'primary',
          position: [x, baseY + 1.05 + wobble, z],
          scale: [0.38, 0.3, 0.3],
          rotation: [0, yaw + Math.PI / 2, 0],
        };
        out.push({ part: pole, state }, { part: block, state });
      }
    }
  }
  return out;
}

export interface DustPuff {
  x: number;
  z: number;
  /** 0..1 lifecycle within the puff's short life. */
  age: number;
  size: number;
}

const DUST_SPAN = 0.045;

/** Dust rings where parts have just landed. Precomputed land times. */
export function dustPuffs(seed: string, structure: StructureSpec, t: number, maxPuffs = 48): DustPuff[] {
  if (!structure.stages.length) return [];
  const windows = stageWindows(structure.stages);
  const out: DustPuff[] = [];
  const staged = expandStructure(structure, seed);
  for (const { part, stageIndex } of staged) {
    if (part.entrance === 'fade' || part.entrance === 'scaffold' || part.entrance === 'none') continue;
    const w = windows[stageIndex]!;
    const lag = part.entrance === 'stack' ? (part.order ?? 0) * STACK_STAGGER : 0;
    // placed parts land at the placement contact; carved chunks hit later
    const target = part.entrance === 'carve' ? 0.8 : PLACEMENT_CONTACT;
    const pLand = (target + lag) / (1 + lag);
    if (pLand > 1) continue;
    const landAt = w.start + pLand * (w.end - w.start);
    const age = (t - landAt) / DUST_SPAN;
    if (age <= 0 || age >= 1) continue;
    const footprint = Math.max(part.scale[0], part.scale[2]);
    if (footprint < 0.8) continue; // skip tiny pieces
    out.push({
      x: part.position[0],
      z: part.position[2],
      age,
      size: Math.min(footprint * 0.9, 6) * (part.entrance === 'carve' ? 1.3 : 1),
    });
    if (out.length >= maxPuffs) break;
  }
  return out;
}

/** Bird chevrons crossing the sky during BUILD. */
export function birdPositions(
  seed: string,
  count: number,
  t: number,
): { x: number; y: number; flap: number; progress: number }[] {
  if (t < 0.15 || t > 0.9) return [];
  const rand = mulberry32(`${seed}-birds`);
  const out = [];
  for (let i = 0; i < count; i++) {
    const offset = rand();
    const altitude = 0.6 + rand() * 0.3;
    const progress = (t * 0.55 + offset) % 1; // fraction across the sky
    out.push({
      progress,
      x: progress, // renderer maps to screen space
      y: altitude,
      flap: Math.sin(t * 60 + i * 3) * 0.5,
    });
  }
  return out;
}
