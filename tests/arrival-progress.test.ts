import { expect, it } from 'vitest';
import { arrivalProgress } from '../src/engine/arrivalProgress';

it('gives cached assets a complete 600 ms fill', () => {
  expect([0, 150, 300, 450, 599, 600].map(ms => arrivalProgress(ms, 1, true))).toEqual([0, 25, 50, 75, 99, 100]);
});
it('follows real preparation for slow loads and never reports unready completion', () => {
  expect(arrivalProgress(300, .1, false)).toBe(10);
  expect(arrivalProgress(3000, .4, false)).toBe(40);
  expect(arrivalProgress(9000, 1, false)).toBe(99);
  expect(arrivalProgress(9001, 1, true)).toBe(100);
});
