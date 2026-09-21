// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { getWonder } from '../src/data';
import { FactsPanel } from '../src/ui/FactsPanel';

afterEach(cleanup);

it('credits the lunar image inside Colosseum information without placing it over the closed film', () => {
  const wonder = getWonder('colosseum')!;
  const { rerender } = render(<FactsPanel wonder={wonder} open={false} onClose={() => {}} />);
  expect(screen.queryByRole('link', { name: /Moon imagery/ })).not.toBeInTheDocument();
  rerender(<FactsPanel wonder={wonder} open onClose={() => {}} />);
  expect(screen.getByRole('link', { name: "Moon imagery: NASA's Scientific Visualization Studio" }))
    .toHaveAttribute('href', 'https://svs.gsfc.nasa.gov/4720/');
});
