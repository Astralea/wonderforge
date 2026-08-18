import { describe, expect, it } from 'vitest';
import { eraLabel, formatYear, roman } from '../src/ui/format';

describe('formatYear', () => {
  it('renders BC years with circa', () => {
    expect(formatYear(-2560)).toBe('c. 2560 BC');
    expect(formatYear(-100)).toBe('c. 100 BC');
  });

  it('renders early AD years with an era suffix', () => {
    expect(formatYear(80)).toBe('80 AD');
    expect(formatYear(900)).toBe('900 AD');
  });

  it('renders modern years bare', () => {
    expect(formatYear(1420)).toBe('1420');
    expect(formatYear(1889)).toBe('1889');
    expect(formatYear(1973)).toBe('1973');
  });
});

describe('eraLabel', () => {
  it('title-cases eras', () => {
    expect(eraLabel('ancient')).toBe('Ancient Era');
    expect(eraLabel('industrial')).toBe('Industrial Era');
  });
});

describe('roman', () => {
  it('converts gallery ordinals', () => {
    expect(roman(1)).toBe('I');
    expect(roman(4)).toBe('IV');
    expect(roman(9)).toBe('IX');
    expect(roman(10)).toBe('X');
  });
});
