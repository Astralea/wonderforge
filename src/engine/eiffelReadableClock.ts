export interface EiffelReadableClockOperation {
  readonly start: number;
  readonly end: number;
  readonly wave: number;
}

export interface EiffelReadableClockOptions {
  readonly fps?: number;
  readonly minimumFrames?: number;
}

export interface EiffelReadableClockSegment {
  readonly productionStart: number;
  readonly productionEnd: number;
  readonly secondsStart: number;
  readonly secondsEnd: number;
  readonly kind: 'hold' | 'wave';
  readonly wave: number | null;
}

export interface EiffelReadableClock {
  readonly originalDuration: number;
  readonly duration: number;
  readonly minimumWaveSeconds: number;
  readonly segments: readonly EiffelReadableClockSegment[];
  productionToSeconds(productionT: number): number;
  secondsToProductionT(seconds: number): number;
}

const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
};

/**
 * Stretches each unique active wave to a readable minimum while retaining the
 * original duration of every inactive gap. A single global monotonic mapping
 * keeps simultaneous work simultaneous and preserves all dependency ordering.
 */
export function createEiffelReadableClock(
  operations: readonly EiffelReadableClockOperation[],
  originalDuration = 60,
  options: EiffelReadableClockOptions = {},
): EiffelReadableClock {
  finite(originalDuration, 'Original duration');
  if (originalDuration <= 0) throw new Error('Original duration must be positive');
  const fps = options.fps ?? 60, minimumFrames = options.minimumFrames ?? 4;
  finite(fps, 'FPS'); finite(minimumFrames, 'Minimum frames');
  if (fps <= 0 || minimumFrames <= 0) throw new Error('Readable-clock frame settings must be positive');
  const minimumWaveSeconds = minimumFrames / fps;
  const waves = new Map<number, { start: number; end: number }>();
  for (const operation of operations) {
    finite(operation.start, 'Operation start'); finite(operation.end, 'Operation end'); finite(operation.wave, 'Operation wave');
    if (operation.start < 0 || operation.end > 1 || operation.end <= operation.start)
      throw new Error('Readable-clock operations require 0 <= start < end <= 1');
    const prior = waves.get(operation.wave);
    if (prior && (prior.start !== operation.start || prior.end !== operation.end))
      throw new Error(`Wave ${operation.wave} has inconsistent intervals`);
    waves.set(operation.wave, { start: operation.start, end: operation.end });
  }
  const ordered = [...waves].map(([wave, interval]) => ({ wave, ...interval }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.wave - b.wave);
  for (let i = 1; i < ordered.length; i++) if (ordered[i]!.start < ordered[i - 1]!.end)
    throw new Error(`Waves ${ordered[i - 1]!.wave} and ${ordered[i]!.wave} overlap without being simultaneous`);

  const segments: EiffelReadableClockSegment[] = [];
  let productionCursor = 0, secondsCursor = 0;
  const append = (productionStart: number, productionEnd: number, secondsLength: number, kind: 'hold'|'wave', wave: number|null) => {
    if (productionEnd <= productionStart) return;
    segments.push({ productionStart, productionEnd, secondsStart: secondsCursor, secondsEnd: secondsCursor + secondsLength, kind, wave });
    productionCursor = productionEnd; secondsCursor += secondsLength;
  };
  for (const interval of ordered) {
    append(productionCursor, interval.start, (interval.start - productionCursor) * originalDuration, 'hold', null);
    append(interval.start, interval.end, Math.max((interval.end - interval.start) * originalDuration, minimumWaveSeconds), 'wave', interval.wave);
  }
  append(productionCursor, 1, (1 - productionCursor) * originalDuration, 'hold', null);
  if (!segments.length) append(0, 1, originalDuration, 'hold', null);

  const map = (value: number, sourceStart: keyof EiffelReadableClockSegment, sourceEnd: keyof EiffelReadableClockSegment, targetStart: keyof EiffelReadableClockSegment, targetEnd: keyof EiffelReadableClockSegment) => {
    finite(value, 'Readable-clock query');
    const first = segments[0]!, last = segments.at(-1)!;
    if (value <= Number(first[sourceStart])) return Number(first[targetStart]);
    if (value >= Number(last[sourceEnd])) return Number(last[targetEnd]);
    let low = 0, high = segments.length - 1;
    while (low < high) { const mid = (low + high) >>> 1; if (value > Number(segments[mid]![sourceEnd])) low = mid + 1; else high = mid; }
    const segment = segments[low]!, a = Number(segment[sourceStart]), b = Number(segment[sourceEnd]);
    const t = (value - a) / (b - a);
    return Number(segment[targetStart]) + (Number(segment[targetEnd]) - Number(segment[targetStart])) * t;
  };
  return {
    originalDuration,
    duration: secondsCursor,
    minimumWaveSeconds,
    segments,
    productionToSeconds: productionT => map(productionT, 'productionStart', 'productionEnd', 'secondsStart', 'secondsEnd'),
    secondsToProductionT: seconds => map(seconds, 'secondsStart', 'secondsEnd', 'productionStart', 'productionEnd'),
  };
}
