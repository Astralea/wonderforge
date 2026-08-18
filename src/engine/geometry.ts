import type { Part, StructureSpec, Wonder } from '../data/types';
import { mulberry32 } from './random';

export function flattenStages(structure: StructureSpec): Part[] {
  return structure.stages.flatMap((stage) => stage.parts);
}

export interface StagedPart {
  part: Part;
  stageIndex: number;
}

function applyJitter(part: Part, rand: () => number): Part {
  if (!part.jitter) return { ...part };
  const dx = (rand() - 0.5) * part.jitter;
  const dz = (rand() - 0.5) * part.jitter;
  const dYaw = (rand() - 0.5) * Math.PI * 0.2;
  const rotation: [number, number, number] = part.rotation
    ? [part.rotation[0], part.rotation[1] + dYaw, part.rotation[2]]
    : [0, dYaw, 0];
  return {
    ...part,
    position: [part.position[0] + dx, part.position[1], part.position[2] + dz],
    rotation,
  };
}

/**
 * Expand a structure recipe into concrete parts, keeping stage indices.
 * Pure & deterministic: jitter draws from a PRNG seeded by `seed`,
 * consumed in stable stage/part order (Spec 01 §Structural recipes).
 */
export function expandStructure(structure: StructureSpec, seed: string): StagedPart[] {
  const rand = mulberry32(seed);
  return structure.stages.flatMap((stage, stageIndex) =>
    stage.parts.map((part) => ({ part: applyJitter(part, rand), stageIndex })),
  );
}

/** Expand a wonder's recipe (seeded by the wonder id). */
export function expandStaged(wonder: Wonder): StagedPart[] {
  return expandStructure(wonder.structure, wonder.id);
}

/** Flat expansion (same deterministic result as expandStaged, minus indices). */
export function expandRecipe(wonder: Wonder): Part[] {
  return expandStaged(wonder).map((s) => s.part);
}

export interface BoundingCylinder {
  /** Radius around the world Y axis that contains every part. */
  radius: number;
  /** Highest part top. */
  height: number;
  center: [number, number, number];
}

export function boundingCylinder(parts: Part[]): BoundingCylinder {
  let radius = 0;
  let height = 0;
  for (const p of parts) {
    const horizontal =
      Math.hypot(p.position[0], p.position[2]) +
      Math.max(p.scale[0], p.scale[2]) / 2;
    radius = Math.max(radius, horizontal);
    height = Math.max(height, p.position[1] + p.scale[1]);
  }
  return {
    radius: radius || 1,
    height: height || 1,
    center: [0, 0, 0],
  };
}
