// Pure camera math for the Giza reference scene (Spec 02 §Camera). No Three.js
// or DOM imports — WorldScene consumes these functions.
//
// Two paths:
// - Cinematic: the authored one-shot movie path breathes pitch with the orbit
//   so the horizon and sky band periodically enter the frame.
// - Ambient (homepage hero): a continuous closed orbit with constant azimuth
//   rate, fixed target, and constant radius — no periodic snap on loop.

const DEG = Math.PI / 180;

export const GIZA_CAMERA = {
  fov: { desktop: 35, mobile: 42 },
  /** Breathing pitch limits, degrees above the horizon. */
  pitch: {
    desktop: { base: 22.5, amplitude: 6.5 },
    mobile: { base: 21.5, amplitude: 5 },
  },
  /**
   * Pitch wave timing: minima (horizon moments) at t = 0.12 (dawn) and
   * t = 0.92 (reveal); maximum (top-down detail) near mid-build.
   */
  wave: { phaseT: 0.12, period: 0.8 },
  startAzimuth: 0.56,
  /** Ambient hero orbit: one full closed turn per 100 s, pitch wave 80 s. */
  ambient: { turnSeconds: 100, waveSeconds: 80 },
  narrowBreakpoint: 0.72,
} as const;

function pitchRange(aspect: number): { base: number; amplitude: number } {
  return aspect < GIZA_CAMERA.narrowBreakpoint
    ? GIZA_CAMERA.pitch.mobile
    : GIZA_CAMERA.pitch.desktop;
}

/** Cinematic pitch in radians; minima at t = 0.12 and 0.92. */
export function gizaCinematicPitchAt(t: number, aspect: number): number {
  const { base, amplitude } = pitchRange(aspect);
  const phase = ((t - GIZA_CAMERA.wave.phaseT) / GIZA_CAMERA.wave.period) * Math.PI * 2;
  return (base - amplitude * Math.cos(phase)) * DEG;
}

export interface GizaCinematicShot {
  /** Look-at point in world space. */
  target: [number, number, number];
  /** Camera distance from the target. */
  radius: number;
  azimuth: number;
  /** Radians above the horizon. */
  pitch: number;
}

/**
 * Cinematic shot schedule (Spec 02 §Camera): Khufu close-up through its
 * build, hand-offs to Khafre and Menkaure, then the ensemble reveal.
 *
 * The reveal blend starts at t = 0.88 — while Menkaure's last courses seat —
 * and lands on the ensemble by ~0.96. It used to start at 0.92, which kept
 * the camera on the Menkaure close-up so long that the finished Khufu sat
 * outside the frustum from t ≈ 0.86 to ≈ 0.95: to a viewer, the Great
 * Pyramid "disappeared" near the end of the movie. The frustum contract in
 * tests/giza-camera.test.ts pins all three monuments on screen through the
 * reveal.
 */
export const GIZA_SHOTS = {
  khufu: [7, 7.6, -1],
  khafre: [-38, 8.1, -33],
  menkaure: [-63, 5.2, -60],
  ensemble: [-31, 7.8, -31],
  handoffs: {
    khufuToKhafre: { from: 0.5, to: 0.58 },
    khafreToMenkaure: { from: 0.8, to: 0.86 },
    reveal: { from: 0.88, to: 0.96 },
  },
  baseRadius: 148,
  /** The reveal widens the orbit from focus (0.82) to full (1.0). */
  focus: { min: 0.82, from: 0.87, to: 0.97 },
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOutQuad(value: number): number {
  const x = clamp01(value);
  return x < 0.5 ? 2 * x * x : 1 - (1 - x) * (1 - x) * 2;
}

function lerp3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  p: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
}

export function gizaCinematicShotAt(t: number, aspect: number): GizaCinematicShot {
  const { handoffs, focus } = GIZA_SHOTS;
  let target: [number, number, number];
  if (t < handoffs.khufuToKhafre.from) {
    target = [...GIZA_SHOTS.khufu];
  } else if (t < handoffs.khufuToKhafre.to) {
    const span = handoffs.khufuToKhafre.to - handoffs.khufuToKhafre.from;
    target = lerp3(GIZA_SHOTS.khufu, GIZA_SHOTS.khafre, easeInOutQuad((t - handoffs.khufuToKhafre.from) / span));
  } else if (t < handoffs.khafreToMenkaure.from) {
    target = [...GIZA_SHOTS.khafre];
  } else if (t < handoffs.khafreToMenkaure.to) {
    const span = handoffs.khafreToMenkaure.to - handoffs.khafreToMenkaure.from;
    target = lerp3(GIZA_SHOTS.khafre, GIZA_SHOTS.menkaure, easeInOutQuad((t - handoffs.khafreToMenkaure.from) / span));
  } else if (t < handoffs.reveal.from) {
    target = [...GIZA_SHOTS.menkaure];
  } else {
    const span = handoffs.reveal.to - handoffs.reveal.from;
    target = lerp3(GIZA_SHOTS.menkaure, GIZA_SHOTS.ensemble, easeInOutQuad((t - handoffs.reveal.from) / span));
  }
  target[1] += Math.sin(t * Math.PI * 2) * 0.35;

  const intro = t < 0.08 ? 1.22 - easeInOutQuad(t / 0.08) * 0.22 : 1;
  const reveal = t > handoffs.reveal.from
    ? 1 + easeInOutQuad((t - handoffs.reveal.from) / (1 - handoffs.reveal.from)) * 0.08
    : 1;
  const narrowExponent = aspect < GIZA_CAMERA.narrowBreakpoint ? 0.25 : 0.62;
  const narrow = Math.pow(
    Math.min(2.2, Math.max(1, 1.78 / Math.max(0.3, aspect))),
    narrowExponent,
  );
  const revealFocus = easeInOutQuad((t - focus.from) / (focus.to - focus.from));
  const focusRadius = focus.min + revealFocus * (1 - focus.min);
  const mobileReveal = aspect < GIZA_CAMERA.narrowBreakpoint ? 1 + revealFocus * 0.05 : 1;

  return {
    target,
    radius: GIZA_SHOTS.baseRadius * focusRadius * intro * reveal * narrow * mobileReveal,
    azimuth: GIZA_CAMERA.startAzimuth + t * Math.PI * 2 * 1.25,
    pitch: gizaCinematicPitchAt(t, aspect),
  };
}

export interface GizaAmbientOrbit {
  azimuth: number;
  /** Radians above the horizon. */
  pitch: number;
}

/**
 * Ambient hero orbit: continuous azimuth (never wrapped through a modulo of
 * the cinematic t, so no 90-degree snap every loop) and the same breathing
 * pitch, phased by elapsed wall time.
 */
export function gizaAmbientOrbitAt(elapsedSeconds: number, aspect: number): GizaAmbientOrbit {
  const { base, amplitude } = pitchRange(aspect);
  return {
    azimuth: GIZA_CAMERA.startAzimuth
      + (elapsedSeconds / GIZA_CAMERA.ambient.turnSeconds) * Math.PI * 2,
    pitch: (base
      + amplitude * Math.sin((elapsedSeconds / GIZA_CAMERA.ambient.waveSeconds) * Math.PI * 2)) * DEG,
  };
}
