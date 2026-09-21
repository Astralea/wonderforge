import type { MonumentPlan } from '../data/constructionTypes';

/**
 * Keep the occupancy frustum inside the casing ring. Exterior stones are ~1 m
 * deep; this inset leaves the working face visible while closing the cavity
 * that would otherwise let the key light hit the far inner casing.
 */
export const GIZA_CORE_OCCUPANCY_INSET = 1.35;

export interface GizaCoreOccupancyVolume {
  height: number;
  bottomWidth: number;
  topWidth: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Opaque interior volume for one pyramid at the highest course that has
 * started. Matches the monument slope so the mass cannot poke through the
 * casing, and grows course by course so an unfinished pyramid is never a
 * finished solid popping into empty air.
 */
export function gizaCoreOccupancyVolume(
  monument: MonumentPlan,
  activeCourse: number,
): GizaCoreOccupancyVolume | null {
  if (activeCourse < 0) return null;
  const finishedTopWidth = Math.max(3.2, monument.baseWidth * 0.13);
  const heightRatio = (activeCourse + 1) / monument.courses;
  const height = Math.max(0.35, heightRatio * monument.height - 0.12);
  const widthAtHeight =
    monument.baseWidth
    - (monument.baseWidth - finishedTopWidth) * (height / monument.height);
  return {
    height,
    bottomWidth: Math.max(0.8, monument.baseWidth - GIZA_CORE_OCCUPANCY_INSET * 2),
    topWidth: Math.max(0.45, widthAtHeight - GIZA_CORE_OCCUPANCY_INSET * 2),
    x: monument.center[0],
    y: monument.groundY + height / 2,
    z: monument.center[1],
  };
}
