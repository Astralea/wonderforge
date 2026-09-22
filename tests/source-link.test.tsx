// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FactsPanel } from '../src/ui/FactsPanel';
import { Gallery } from '../src/ui/Gallery';
import { SOURCE_URL } from '../src/ui/links';
import { WONDERS } from '../src/data';

/** Spec 05: the catalog plate and the facts panel footer are the only repository links. */
describe('project source link', () => {
  it('appears once under the catalog, below In production', () => {
    const view = render(<Gallery active onBack={() => {}} />);
    const links = screen.getAllByRole('link', { name: /source on github/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', SOURCE_URL);
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain('In production');
    const inProduction = screen.getByText('In production');
    expect(
      inProduction.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    view.unmount();
  });

  it('points at the public repository over https', () => {
    expect(SOURCE_URL).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  });

  it('shows the GitHub mark as decoration, keeping the label as the accessible name', () => {
    for (const [label, ui] of [
      ['catalog', <Gallery active onBack={() => {}} />],
      ['facts', <FactsPanel wonder={WONDERS[0]} open onClose={() => {}} />],
    ] as const) {
      const view = render(ui);
      const link = screen.getByRole('link', { name: 'Source on GitHub' });
      const svg = link.querySelector('svg');
      expect(svg, `${label} link should carry the mark`).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden');
      expect(link).toHaveTextContent('Source on GitHub');
      view.unmount();
    }
  });

  it('renders once in the facts panel of every wonder, credited or not', () => {
    for (const wonder of WONDERS) {
      const view = render(<FactsPanel wonder={wonder} open onClose={() => {}} />);
      const links = screen.getAllByRole('link', { name: /source on github/i });
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', SOURCE_URL);
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
      view.unmount();
    }
  });

  it('keeps each wonder\'s own credits alongside it', () => {
    const credited = WONDERS.find((w) => w.credits?.length);
    expect(credited).toBeDefined();
    const view = render(<FactsPanel wonder={credited!} open onClose={() => {}} />);
    for (const credit of credited!.credits ?? []) {
      expect(screen.getByRole('link', { name: credit.label })).toHaveAttribute(
        'href',
        credit.url,
      );
    }
    view.unmount();
  });
});
