export type ReferenceWorldKind = 'giza' | 'stonehenge' | 'petra' | 'colosseum' | 'sydney' | 'eiffel' | 'legacy';

const REFERENCE_WORLDS: Readonly<Record<string, Exclude<ReferenceWorldKind, 'legacy'>>> = {
  'pyramids-of-giza': 'giza',
  stonehenge: 'stonehenge',
  petra: 'petra',
  colosseum: 'colosseum',
  'sydney-opera-house': 'sydney',
  'eiffel-tower': 'eiffel',
};

/** Small explicit production registry; every un-migrated ID keeps its fallback. */
export function referenceWorldKindFor(wonderId: string): ReferenceWorldKind {
  return REFERENCE_WORLDS[wonderId] ?? 'legacy';
}
