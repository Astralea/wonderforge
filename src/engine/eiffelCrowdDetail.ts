/** Stateless ranker: projection is supplied by the renderer, never imported here. */
export interface EiffelCrowdCandidate {
  readonly id: string;
  readonly kind: string;
  readonly inFrustum: boolean;
  readonly projectedHeight: number;
}

export function selectEiffelCrowdDetail(
  candidates: readonly EiffelCrowdCandidate[],
  capacities: Readonly<Record<string, number>>,
  minimumProjectedHeight = 0,
): ReadonlySet<string> {
  const selected = new Set<string>();
  const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const size = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const priority = (actor: EiffelCrowdCandidate) => !actor.inFrustum ? 1
    : size(actor.projectedHeight) >= minimumProjectedHeight ? 2 : 0;
  for (const [kind, capacity] of Object.entries(capacities)) {
    const ranked = candidates.filter(candidate => candidate.kind === kind).sort((a, b) =>
      priority(b) - priority(a)
      || size(b.projectedHeight) - size(a.projectedHeight)
      || compareId(a.id, b.id));
    for (const candidate of ranked.slice(0, Math.max(0, Math.floor(capacity)))) selected.add(candidate.id);
  }
  return selected;
}
