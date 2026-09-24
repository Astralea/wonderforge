/** Original Blender kit for the Neronian branch on the Caelian.
 * Span/pier proportions follow Platner/Ashby. Route, height and covered
 * conduit section are authored for the compressed diorama, not a survey.
 */
export const COLOSSEUM_AQUEDUCT = {
  glb: '/models/colosseum-rome/neronian-aqueduct.glb',
  pierCount: 28,
  clearSpan: 7.75,
  pierWidth: 2.3,
  depth: 2.1,
  archRise: 3.875,
  spandrelTop: 4.65,
  channelHeight: 1.8,
  capHeight: 0.22,
  capDepth: 2.55,
  springingHeight: 25.2,
  grade: 0.001,
  start: [140, -260] as const,
  direction: [14 / Math.hypot(14, 6), -6 / Math.hypot(14, 6)] as const,
  desktopSegments: 10,
  portraitSegments: 7,
} as const;
