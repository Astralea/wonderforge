// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { EiffelLoading } from '../src/render/three/EiffelLoading';
import { WonderArrival } from '../src/render/three/WonderArrival';
import {
  arrivalPlaceFor,
  arrivalStageFor,
  WONDER_ARRIVAL_DRAWINGS,
} from '../src/render/three/wonderArrivalDrawings';
import { WONDERS } from '../src/data';

afterEach(cleanup);

it('keeps the animated edge at the measured height across stalled-stage updates', () => {
  const view = render(<EiffelLoading percent={50} stage="City" />);
  const level = screen.getByTestId('eiffel-loading-fill');
  const frame = screen.getByTestId('eiffel-arrival-tower-frame');
  const animatedWave = screen.getByTestId('eiffel-loading-wave');
  expect(level.getAttribute('transform')).toBe('translate(0 120)');
  expect(frame.style.getPropertyValue('--fill-y')).toBe('120');
  expect(animatedWave.classList.contains('eiffel-arrival-wave')).toBe(true);
  expect(animatedWave.tagName.toLowerCase()).toBe('g');
  expect(animatedWave.closest('clipPath')).toBeNull();
  expect(animatedWave.closest('.eiffel-arrival-haze')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Loading Eiffel Tower…' })).toBeTruthy();
  expect(screen.queryByText('An iron landmark, piece by piece.')).toBeNull();
  view.rerender(<EiffelLoading percent={50} stage="Summit" />);
  expect(screen.getByTestId('eiffel-loading-fill')).toBe(level);
  expect(screen.getByTestId('eiffel-loading-wave')).toBe(animatedWave);
  expect(level.getAttribute('transform')).toBe('translate(0 120)');
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  expect(screen.getByRole('status').textContent).toContain('50%');
  view.rerender(<EiffelLoading percent={80} stage="Summit" />);
  const measuredLevel = Number(level.getAttribute('transform')!.match(/translate\(0 ([\d.]+)\)/)![1]);
  expect(measuredLevel).toBeCloseTo(57.6, 8);
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('80');
  expect(Number(frame.style.getPropertyValue('--fill-y'))).toBeCloseTo(57.6, 8);
});

it('keeps a moving base waterline at zero and fills the complete summit at 100 without a ripple', () => {
  const view = render(<EiffelLoading percent={0} stage="City" />);
  expect(screen.getByTestId('eiffel-loading-wave')).toBeTruthy();
  expect(screen.getByTestId('eiffel-arrival-tower-frame').style.getPropertyValue('--fill-y')).toBe('224');
  expect(screen.getByTestId('eiffel-arrival-tower-frame').style.getPropertyValue('--wave-y')).toBe('198');
  expect(screen.getByTestId('eiffel-loading-fill').getAttribute('transform')).toBe('translate(0 224)');
  expect(screen.getByTestId('eiffel-arrival').getAttribute('data-empty')).toBe('true');
  view.rerender(<EiffelLoading percent={100} stage="Starting film…" />);
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

it('fills every catalog silhouette from measured readiness with a live waterline', () => {
  for (const wonder of WONDERS) {
    cleanup();
    const view = render(<WonderArrival wonder={wonder} percent={0} stage={arrivalStageFor(wonder.id)} />);
    const testId = wonder.id === 'eiffel-tower' ? 'eiffel-arrival' : 'wonder-arrival';
    expect(screen.getByTestId(testId).getAttribute('data-wonder')).toBe(wonder.id);
    expect(WONDER_ARRIVAL_DRAWINGS[wonder.id]?.outline.startsWith('M')).toBe(true);
    expect(screen.getByRole('heading', { name: `Loading ${wonder.name}…` })).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe(`Loading ${wonder.name}`);
    expect(screen.getByText(arrivalPlaceFor(wonder.location, wonder.completedYear))).toBeTruthy();
    const waveId = wonder.id === 'eiffel-tower' ? 'eiffel-loading-wave' : 'wonder-arrival-wave';
    expect(screen.getByTestId(waveId).closest('clipPath')).toBeNull();
    view.rerender(<WonderArrival wonder={wonder} percent={50} stage={arrivalStageFor(wonder.id)} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    view.rerender(<WonderArrival wonder={wonder} percent={100} stage="Starting film…" />);
    expect(screen.queryByTestId(waveId)).toBeNull();
  }
});

it('uses identical architectural cutouts for the arrival surface and its animated wave', () => {
  for (const id of ['colosseum', 'petra', 'chichen-itza', 'eiffel-tower']) {
    cleanup();
    const wonder = WONDERS.find(wonder => wonder.id === id)!;
    const drawing = WONDER_ARRIVAL_DRAWINGS[id];
    const { container } = render(<WonderArrival wonder={wonder} percent={50} stage="Valley" />);
    const surface = container.querySelector('.eiffel-arrival-surface')!;
    const monumentClip = container.querySelector('clipPath path')!;
    expect(surface.getAttribute('fill-rule'), id).toBe('evenodd');
    expect(monumentClip.getAttribute('clip-rule'), id).toBe('evenodd');
    expect(surface.getAttribute('d'), id).toBe(drawing.outline);
    expect(monumentClip.getAttribute('d'), id).toBe(drawing.outline);
    // These are actual closed holes, not dark painted overlays that a
    // rising gold waterline could cover.
    expect((drawing.outline.match(/Z/g) ?? []).length, id).toBeGreaterThanOrEqual(2);
  }
  const colosseum = WONDER_ARRIVAL_DRAWINGS.colosseum;
  expect((colosseum.outline.match(/Z/g) ?? []).length).toBeGreaterThanOrEqual(14);
});

it('keeps every arrival fill bounded, monotone, and complete at 100 percent', () => {
  for (const wonder of WONDERS) {
    cleanup();
    const drawing = WONDER_ARRIVAL_DRAWINGS[wonder.id];
    const isEiffel = wonder.id === 'eiffel-tower';
    const fillId = isEiffel ? 'eiffel-loading-fill' : 'wonder-arrival-fill';
    const view = render(<WonderArrival wonder={wonder} percent={0} stage="Ground" />);
    let previous = Infinity;
    for (const progress of [0, 25, 50, 75, 99, 100]) {
      view.rerender(<WonderArrival wonder={wonder} percent={progress} stage="Ground" />);
      const y = Number(screen.getByTestId(fillId).getAttribute('transform')!.match(/translate\(0 ([\d.]+)\)/)![1]);
      expect(y, wonder.id).toBeLessThanOrEqual(previous);
      expect(y, wonder.id).toBeGreaterThanOrEqual(drawing.fillTop);
      expect(y, wonder.id).toBeLessThanOrEqual(drawing.viewBox[1]);
      previous = y;
    }
    expect(previous, wonder.id).toBe(drawing.fillTop);
    expect(view.container.querySelectorAll('filter,image,foreignObject')).toHaveLength(0);
  }
});
