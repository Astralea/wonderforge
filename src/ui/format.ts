import type { Era } from '../data/types';

export function formatYear(year: number): string {
  if (year < 0) return `c. ${Math.abs(year)} BC`;
  if (year < 1000) return `${year} AD`;
  return `${year}`;
}

export function eraLabel(era: Era): string {
  return `${era[0]!.toUpperCase()}${era.slice(1)} Era`;
}

const NUMERALS: ReadonlyArray<readonly [number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function roman(n: number): string {
  let out = '';
  let v = n;
  for (const [value, symbol] of NUMERALS) {
    while (v >= value) {
      out += symbol;
      v -= value;
    }
  }
  return out;
}
