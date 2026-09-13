export const EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID = 'summit-crown-m072-c002';

/** The flag is a final furnishing. It can appear only once its physical mast
 * owner has seated, and never while a chapter renderer owns that mast. */
export function eiffelHistoricFlagIsSupported(
  productionT: number,
  supportSeatT: number | undefined,
  transportedPartIds: readonly string[],
): boolean {
  return Number.isFinite(productionT)
    && supportSeatT !== undefined
    && productionT >= supportSeatT
    && !transportedPartIds.includes(EIFFEL_HISTORIC_FLAG_SUPPORT_PART_ID);
}

/** Pure local-Z cloth displacement. UV.x is the normalized span from the
 * hoist, so every vertex on that edge remains exactly at its authored pose. */
export function eiffelHistoricFlagWindOffset(seconds: number, u: number, v: number): number {
  if (![seconds, u, v].every(Number.isFinite)) throw new Error('Historic flag wind inputs must be finite');
  const span = Math.max(0, Math.min(1, u));
  if (span === 0) return 0;
  const vertical = Math.max(0, Math.min(1, v));
  const broad = Math.sin(seconds * 1.05 - span * Math.PI * 2.25 + vertical * .55);
  const ripple = Math.sin(seconds * 1.73 - span * Math.PI * 5.5 - vertical * .8);
  return span * span * (.16 * broad + .045 * ripple);
}
