import type { EiffelAssemblyManifest, EiffelAssemblyManifestPart, EiffelAssemblyPart, EiffelAssemblyPlan, EiffelAssemblySample, EiffelAssemblyVec3 } from '../data/eiffelAssemblyTypes';
import { eiffelTerrainHeightAt } from './eiffelTerrain';

export const EIFFEL_ASSEMBLY_MAX_ACTIVE = 16;
export const EIFFEL_ASSEMBLY_WAGON_BED = 0.85;
const START = 0.04;
const END = 0.9;
const CRIB = 0.25;
const SLING = 1.5;
const FRACTIONS = [0.08, 0.42, 0.5, 0.74, 0.9, 1, 1] as const;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const a = clamp(x); return a * a * (3 - 2 * a); };
const mix = (a: EiffelAssemblyVec3, b: EiffelAssemblyVec3, t: number): EiffelAssemblyVec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Four corner and centre terrain clearance for this untranslated, final-size cargo. */
export function eiffelAssemblyGroundSupport(part: EiffelAssemblyManifestPart, x: number, z: number): number {
  let y = eiffelTerrainHeightAt(x, z);
  for (const bx of [part.boundsMin[0], part.boundsMax[0]]) {
    for (const bz of [part.boundsMin[2], part.boundsMax[2]]) {
      y = Math.max(y, eiffelTerrainHeightAt(x + bx - part.center[0], z + bz - part.center[2]));
    }
  }
  return y;
}
function groundPose(part: EiffelAssemblyManifestPart, x: number, z: number, bed: number): EiffelAssemblyVec3 {
  return [x, eiffelAssemblyGroundSupport(part, x, z) + bed + part.center[1] - part.boundsMin[1], z];
}
function validate(manifest: EiffelAssemblyManifest): void {
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported Eiffel assembly manifest version');
  const ids = new Set<string>();
  for (const part of manifest.parts) {
    if (ids.has(part.id)) throw new Error(`Duplicate Eiffel assembly id: ${part.id}`);
    ids.add(part.id);
    if (!Number.isFinite(part.stage) || ![...part.center, ...part.boundsMin, ...part.boundsMax].every(Number.isFinite)) throw new Error(`Invalid Eiffel assembly bounds: ${part.id}`);
    for (let i = 0; i < 3; i++) if (part.boundsMin[i] > part.boundsMax[i] || part.center[i] < part.boundsMin[i] || part.center[i] > part.boundsMax[i]) throw new Error(`Inverted Eiffel assembly bounds: ${part.id}`);
  }
}

/**
 * Stage barriers guarantee no part of stage N+1 moves before stage N is seated.
 * Up to sixteen shop assemblies share each compressed erection wave. This is an
 * authored erection schedule; it does not simulate the historical crane fleet.
 */
export function createEiffelAssemblyPlan(manifest: EiffelAssemblyManifest): EiffelAssemblyPlan {
  validate(manifest);
  const ordered = [...manifest.parts].sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id));
  const stageIds = [...new Set(ordered.map(part => part.stage))];
  const buckets = stageIds.map(stage => ordered.filter(part => part.stage === stage));
  const waves = buckets.map(parts => Math.ceil(parts.length / EIFFEL_ASSEMBLY_MAX_ACTIVE));
  const totalWaves = waves.reduce((a, b) => a + b, 0);
  const parts: EiffelAssemblyPart[] = [];
  const stages: { stage: number; start: number; end: number }[] = [];
  let waveOffset = 0;
  for (let si = 0; si < buckets.length; si++) {
    const stageStart = START + (END - START) * waveOffset / totalWaves;
    const stageEnd = START + (END - START) * (waveOffset + waves[si]) / totalWaves;
    stages.push({ stage: stageIds[si], start: stageStart, end: stageEnd });
    buckets[si].forEach((original, index) => {
      const wave = waveOffset + Math.floor(index / EIFFEL_ASSEMBLY_MAX_ACTIVE);
      const start = START + (END - START) * wave / totalWaves;
      const end = START + (END - START) * (wave + 1) / totalWaves;
      const slot = index % EIFFEL_ASSEMBLY_MAX_ACTIVE;
      const sx = original.leg === 'nw' || original.leg === 'sw' ? -1 : 1;
      const sz = original.leg === 'nw' || original.leg === 'ne' ? -1 : 1;
      const halfX = Math.max(original.center[0] - original.boundsMin[0], original.boundsMax[0] - original.center[0]);
      const halfZ = Math.max(original.center[2] - original.boundsMin[2], original.boundsMax[2] - original.center[2]);
      const perimeter = manifest.base / 2 + Math.max(halfX, halfZ) + 12;
      const source = groundPose(original, 118 + (slot % 4) * 8, 45 + Math.floor(slot / 4) * 10, EIFFEL_ASSEMBLY_WAGON_BED);
      const staging = groundPose(original, sx * perimeter, sz * perimeter, CRIB);
      // Route goes around the southern or northern perimeter, never through feet.
      const route: EiffelAssemblyVec3[] = [source, [Math.max(source[0], perimeter), 0, sz * perimeter], [sx * perimeter, 0, sz * perimeter]];
      const previous = parts.filter(part => part.stage < original.stage && (part.leg === original.leg || part.group === 'platform'))
        .sort((a, b) => b.boundsMax[1] - a.boundsMax[1])[0];
      const baseY = previous ? Math.min(previous.boundsMax[1], original.boundsMin[1]) : eiffelTerrainHeightAt(original.center[0], original.center[2]);
      const craneBase: EiffelAssemblyVec3 = previous ? [previous.center[0], baseY, previous.center[2]] : [original.center[0] + sx * 10, baseY, original.center[2] + sz * 10];
      const liftY = Math.max(staging[1], original.center[1]) + 7;
      const topOffset = original.boundsMax[1] - original.center[1];
      parts.push({ ...original, center: [...original.center], boundsMin: [...original.boundsMin], boundsMax: [...original.boundsMax], start, end, source, staging, haulRoute: route, liftY, craneBase, jibY: liftY + topOffset + SLING + 5, phaseTimes: FRACTIONS.map(f => start + (end - start) * f) as unknown as EiffelAssemblyPart['phaseTimes'] });
    });
    waveOffset += waves[si];
  }
  return { parts, stages, start: START, end: END };
}
function routePose(part: EiffelAssemblyPart, u: number): EiffelAssemblyVec3 {
  const route = part.haulRoute;
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[2] - route[i][2]));
  let distance = smooth(u) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const p = mix(route[i], route[i + 1], lengths[i] > 0 ? clamp(distance / lengths[i]) : 1);
      return groundPose(part, p[0], p[2], EIFFEL_ASSEMBLY_WAGON_BED);
    }
    distance -= lengths[i];
  }
  return part.source;
}

/** Absolute-time, side-effect-free pose. Apply translation position - center only. */
export function sampleEiffelAssemblyPart(part: EiffelAssemblyPart, t: number): EiffelAssemblySample {
  const p = clamp((t - part.start) / (part.end - part.start));
  let phase: EiffelAssemblySample['phase'];
  let position: EiffelAssemblyVec3;
  const wagonEnd = groundPose(part, part.staging[0], part.staging[2], EIFFEL_ASSEMBLY_WAGON_BED);
  if (t < part.start) { phase = 'queued'; position = part.source; }
  else if (p < 0.08) { phase = 'yard'; position = part.source; }
  else if (p < 0.42) { phase = 'haul'; position = routePose(part, (p - 0.08) / 0.34); }
  else if (p < 0.5) { phase = 'staged'; position = mix(wagonEnd, part.staging, smooth((p - 0.42) / 0.08)); }
  else if (p < 0.74) { phase = 'hoist'; position = mix(part.staging, [part.staging[0], part.liftY, part.staging[2]], smooth((p - 0.5) / 0.24)); }
  else if (p < 0.9) { phase = 'transfer'; position = mix([part.staging[0], part.liftY, part.staging[2]], [part.center[0], part.liftY, part.center[2]], smooth((p - 0.74) / 0.16)); }
  else if (t < part.end) { phase = 'lower'; position = mix([part.center[0], part.liftY, part.center[2]], part.center, smooth((p - 0.9) / 0.1)); }
  else { phase = 'seated'; position = part.center; }
  const bottomY = position[1] + part.boundsMin[1] - part.center[1];
  const onWagon = phase === 'queued' || phase === 'yard' || phase === 'haul';
  const wagonPose = onWagon ? position : wagonEnd;
  const bedY = wagonPose[1] + part.boundsMin[1] - part.center[1];
  const hook: EiffelAssemblyVec3 = [position[0], position[1] + part.boundsMax[1] - part.center[1] + SLING, position[2]];
  const kind = onWagon ? 'wagon' : phase === 'seated' ? 'seat' : phase === 'hoist' && p === 0.5 ? 'crib' : 'air';
  const supportY = onWagon ? bedY : phase === 'seated' ? part.boundsMin[1] : eiffelAssemblyGroundSupport(part, position[0], position[2]) + CRIB;
  return { phase, visible: phase !== 'queued', position, scale: [1, 1, 1], progress: p, hook, craneBase: part.craneBase, boomTip: [hook[0], part.jibY, hook[2]], ropeAttached: ['staged', 'hoist', 'transfer', 'lower'].includes(phase), wagon: { visible: phase === 'yard' || phase === 'haul', position: [wagonPose[0], bedY - EIFFEL_ASSEMBLY_WAGON_BED, wagonPose[2]], bedY }, contact: { bottomY, supportY, residual: bottomY - supportY, kind } };
}
