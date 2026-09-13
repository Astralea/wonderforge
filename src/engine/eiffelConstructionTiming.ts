/** Camera-matched stage windows for the bounded Eiffel construction kit. */
const RANGES = [
  [0, 0.99, 0.035, 0.065],
  [1, 9, 0.065, 0.15466666666666667],
  [10, 21, 0.15466666666666667, 0.285],
  [23, 23, 0.285, 0.3152],
  [24, 32, 0.3152, 0.41],
  [34, 34, 0.41, 0.4298666666666666],
  [35, 52, 0.4298666666666666, 0.63],
  [54, 54, 0.63, 0.6477333333333334],
  [55, 63, 0.6477333333333334, 0.9],
] as const;
const HERO_STAGES = new Set([
  1, 5, 9, 14, 21, 23, 27, 32, 34, 38, 44, 50, 54, 58, 63,
]);
export interface EiffelTimingPart {
  readonly id: string;
  readonly stage: number;
}
export interface EiffelTiming {
  readonly start: number;
  readonly end: number;
  readonly hero: boolean;
  readonly wave: number;
}
/**
 * Parts arrive in topological order. Four-lift waves wait until all their
 * dependencies have seated. Hero waves receive longer screen time; every
 * ordinary member still owns a positive continuous motion interval.
 */
export function scheduleEiffelKitTiming(
  parts: readonly EiffelTimingPart[],
  dependencies: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, EiffelTiming> {
  const result = new Map<string, EiffelTiming>();
  const grouped = new Map<number, EiffelTimingPart[]>();
  for (const part of parts) {
    if (!grouped.has(part.stage)) grouped.set(part.stage, []);
    grouped.get(part.stage)!.push(part);
  }
  let globalWave = 0;
  for (const [low, high, begin, end] of RANGES) {
    const stages = [...grouped]
      .filter(([stage]) => stage >= low && stage <= high)
      .sort((a, b) => a[0] - b[0]);
    const weights = stages.map(([, items]) => Math.sqrt(items.length));
    const totalWeight = weights.reduce((sum, n) => sum + n, 0);
    let cursor: number = begin;
    stages.forEach(([stage, items], stageIndex) => {
      const stageEnd =
        stageIndex === stages.length - 1
          ? end
          : cursor + ((end - begin) * weights[stageIndex]!) / totalWeight;
      const waves: EiffelTimingPart[][] = [];
      const assigned = new Map<string, number>();
      for (const part of items) {
        const deps = dependencies.get(part.id) ?? [];
        let earliest = 0;
        for (const id of deps) {
          const priorWave = assigned.get(id);
          if (priorWave !== undefined)
            earliest = Math.max(earliest, priorWave + 1);
          else if (!result.has(id))
            throw new Error(
              `Unscheduled Eiffel dependency ${id} for ${part.id}`,
            );
        }
        let wave = Math.max(earliest, waves.length ? waves.length - 1 : 0);
        while ((waves[wave]?.length ?? 0) >= 4) wave++;
        while (waves.length <= wave) waves.push([]);
        waves[wave]!.push(part);
        assigned.set(part.id, wave);
      }
      const heroWave = HERO_STAGES.has(stage)
        ? Math.floor(waves.length * 0.28)
        : -1;
      const stageSpan = stageEnd - cursor;
      const heroSpan =
        heroWave >= 0 ? Math.min(0.35 / 60, stageSpan * 0.42) : 0;
      const ordinarySpan =
        (stageSpan - heroSpan) /
        Math.max(1, waves.length - (heroWave >= 0 ? 1 : 0));
      let waveStart: number = cursor;
      waves.forEach((items, wave) => {
        const waveEnd =
          wave === waves.length - 1
            ? stageEnd
            : waveStart + (wave === heroWave ? heroSpan : ordinarySpan);
        for (const part of items)
          result.set(part.id, {
            start: waveStart,
            end: waveEnd,
            hero: wave === heroWave,
            wave: globalWave,
          });
        waveStart = waveEnd;
        globalWave++;
      });
      cursor = stageEnd;
    });
  }
  if (result.size !== parts.length)
    throw new Error('Eiffel timing omitted a part or contains duplicate IDs');
  return result;
}
