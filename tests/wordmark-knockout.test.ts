import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

describe('WonderForge lockup knockout (Spec 05)', () => {
  it('punches leftover field and sparkle-rays above the Great Wall W', () => {
    const png = PNG.sync.read(readFileSync('public/brand/wonderforge-wordmark.png'));
    let leftover = 0;
    for (let y = 0; y < 120; y += 1) {
      for (let x = 40; x < 260; x += 1) {
        if (png.data[(y * png.width + x) * 4 + 3]! > 40) leftover += 1;
      }
    }
    expect(leftover).toBe(0);
    let wall = 0;
    for (let y = 140; y < 400; y += 1) {
      for (let x = 50; x < 250; x += 1) {
        if (png.data[(y * png.width + x) * 4 + 3]! > 200) wall += 1;
      }
    }
    expect(wall).toBeGreaterThan(20_000);
  });
});
