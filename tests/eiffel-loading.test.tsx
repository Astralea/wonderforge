// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { EiffelLoading } from '../src/render/three/EiffelLoading';

afterEach(cleanup);

it('keeps the animated edge at the measured height across stalled-stage updates', () => {
  const view = render(<EiffelLoading percent={50} stage="Preparing Paris" />);
  const level = screen.getByTestId('eiffel-loading-fill');
  const frame = screen.getByTestId('eiffel-arrival-tower-frame');
  const animatedWave = screen.getByTestId('eiffel-loading-wave');
  expect(level.getAttribute('transform')).toBe('translate(0 120)');
  expect(frame.style.getPropertyValue('--fill-y')).toBe('120');
  expect(animatedWave.classList.contains('eiffel-arrival-wave')).toBe(true);
  expect(animatedWave.tagName.toLowerCase()).toBe('g');
  expect(animatedWave.closest('clipPath')).toBeNull();
  expect(animatedWave.closest('.eiffel-arrival-haze')).toBeNull();
  view.rerender(<EiffelLoading percent={50} stage="Preparing the summit" />);
  expect(screen.getByTestId('eiffel-loading-fill')).toBe(level);
  expect(screen.getByTestId('eiffel-loading-wave')).toBe(animatedWave);
  expect(level.getAttribute('transform')).toBe('translate(0 120)');
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  expect(screen.getByRole('status').textContent).toContain('50%');
  view.rerender(<EiffelLoading percent={80} stage="Preparing the summit" />);
  const measuredLevel = Number(level.getAttribute('transform')!.match(/translate\(0 ([\d.]+)\)/)![1]);
  expect(measuredLevel).toBeCloseTo(57.6, 8);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('80');
  expect(Number(frame.style.getPropertyValue('--fill-y'))).toBeCloseTo(57.6, 8);
});

it('keeps a moving base waterline at zero and fills the complete summit at 100 without a ripple', () => {
  const view = render(<EiffelLoading percent={0} stage="Preparing Paris" />);
  expect(screen.getByTestId('eiffel-loading-wave')).toBeTruthy();
  expect(screen.getByTestId('eiffel-arrival-tower-frame').style.getPropertyValue('--fill-y')).toBe('224');
  expect(screen.getByTestId('eiffel-arrival-tower-frame').style.getPropertyValue('--wave-y')).toBe('198');
  expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe('translate(0 224)');
  expect(screen.getByTestId('eiffel-arrival').getAttribute('data-empty')).toBe('true');
  view.rerender(<EiffelLoading percent={100} stage="Preparing the first view" />);
  expect(screen.queryByTestId('eiffel-loading-wave')).toBeNull();
  expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe('translate(0 0)');
  expect(screen.getByTestId('eiffel-arrival').getAttribute('data-empty')).toBe('false');
});

it('uses horizontal CSS motion and a still fill for reduced motion', () => {
  const css = readFileSync('src/render/three/eiffelLoading.css', 'utf8');
  const stylesheet = document.createElement('style');
  stylesheet.textContent = css;
  document.head.append(stylesheet);
  try {
    const rules = [...stylesheet.sheet!.cssRules];
    const ripple = rules.find(rule => rule.cssText.startsWith('@keyframes eiffel-arrival-ripple')) as CSSKeyframesRule;
    expect(ripple.cssRules[0]!.cssText).toContain('translate3d(0, 0, 0)');
    expect(ripple.cssRules[1]!.cssText).toContain('translate3d(-80px, 0, 0)');
    const reduced = rules.find(rule => rule.cssText.startsWith('@media (prefers-reduced-motion: reduce)')) as CSSMediaRule;
    const declarations = [...reduced.cssRules] as CSSStyleRule[];
    const wave = declarations.find(rule => rule.selectorText.includes('eiffel-arrival-wave'))!;
    expect(wave.style.getPropertyValue('animation')).toBe('none');
    expect(wave.style.getPropertyValue('display')).toBe('none');
    expect(declarations.find(rule => rule.selectorText.includes('skeleton'))!.style.getPropertyValue('animation')).toBe('none');
  } finally {
    stylesheet.remove();
  }
});
