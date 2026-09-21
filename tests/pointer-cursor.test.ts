import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('pointer cursor', () => {
  it('author the hand cursor on clickable chrome in the shared stylesheet', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toMatch(/button:not\(:disabled\)[\s\S]*cursor:\s*pointer/);
    expect(css).toMatch(/input\[type='range'\][\s\S]*cursor:\s*pointer/);
    expect(css).toMatch(/button:disabled[\s\S]*cursor:\s*not-allowed/);
  });
});
