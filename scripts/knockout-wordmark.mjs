#!/usr/bin/env node
/**
 * Flood-fill the painted dark field of the Vertex lockup to true alpha.
 * Seeds from the image edges and walks only through dark pixels, so enclosed
 * letter interiors (Colosseum arena, Sydney C) stay opaque. Haze and sparkle
 * rays attached to the field — including the glow cloud above the W — are
 * punched next. Not a luma key of the whole frame, and not a CSS mix-blend.
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = resolve(root, 'artifacts/vertex-wordmark/wonderforge-wonders-v3.png');
const dests = [
  resolve(root, 'public/brand/wonderforge-wordmark.png'),
  resolve(root, 'artifacts/vertex-wordmark/wonderforge-wonders-v3-knockout.png'),
];

const FILL = 48;
const FEATHER = 4;
const STONE_STD = 7;
const GOLD_LUMA = 118;
const GOLD_REACH = 4;
const W_MAX_X = 270;
const src = PNG.sync.read(readFileSync(srcPath));
const { width: w, height: h, data } = src;
const luma = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
const bg = new Uint8Array(w * h);
const q = [];
const tryPush = (x, y) => {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const p = y * w + x;
  if (bg[p] || luma(p * 4) >= FILL) return;
  bg[p] = 1;
  q.push(p);
};
for (let x = 0; x < w; x += 1) {
  tryPush(x, 0);
  tryPush(x, h - 1);
}
for (let y = 0; y < h; y += 1) {
  tryPush(0, y);
  tryPush(w - 1, y);
}
while (q.length) {
  const p = q.pop();
  const x = p % w;
  const y = (p - x) / w;
  tryPush(x - 1, y);
  tryPush(x + 1, y);
  tryPush(x, y - 1);
  tryPush(x, y + 1);
}

const stdAt = (x, y) => {
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const value = luma((yy * w + xx) * 4);
      n += 1;
      sum += value;
      sum2 += value * value;
    }
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean));
};

const stone = new Uint8Array(w * h);
for (let p = 0; p < w * h; p += 1) {
  if (bg[p]) continue;
  const x = p % w;
  const y = (p - x) / w;
  if (stdAt(x, y) >= STONE_STD) stone[p] = 1;
}

const keep = new Uint8Array(w * h);
for (let p = 0; p < w * h; p += 1) {
  if (!stone[p]) continue;
  const x = p % w;
  const y = (p - x) / w;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      keep[yy * w + xx] = 1;
    }
  }
}

const distStone = new Float32Array(w * h);
distStone.fill(1e9);
const sq = [];
for (let p = 0; p < w * h; p += 1) {
  if (!keep[p]) continue;
  distStone[p] = 0;
  sq.push(p);
}
for (let i = 0; i < sq.length; i += 1) {
  const p = sq[i];
  const x = p % w;
  const y = (p - x) / w;
  const nd = distStone[p] + 1;
  for (const [cx, cy] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const np = cy * w + cx;
    if (nd < distStone[np]) {
      distStone[np] = nd;
      sq.push(np);
    }
  }
}

for (let p = 0; p < w * h; p += 1) {
  if (bg[p] || keep[p]) continue;
  if (luma(p * 4) >= GOLD_LUMA && distStone[p] <= GOLD_REACH) keep[p] = 1;
}

const hq = [];
for (let p = 0; p < w * h; p += 1) {
  if (bg[p]) hq.push(p);
}
for (let i = 0; i < hq.length; i += 1) {
  const p = hq[i];
  const x = p % w;
  const y = (p - x) / w;
  for (const [cx, cy] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const np = cy * w + cx;
    if (bg[np] || keep[np]) continue;
    bg[np] = 1;
    hq.push(np);
  }
}

const topStone = new Int32Array(W_MAX_X + 1);
topStone.fill(h);
for (let x = 0; x <= W_MAX_X; x += 1) {
  for (let y = 0; y < h; y += 1) {
    if (keep[y * w + x]) {
      topStone[x] = y;
      break;
    }
  }
}
for (let x = 0; x <= W_MAX_X; x += 1) {
  const roof = topStone[x] - 3;
  if (roof <= 0) continue;
  for (let y = 0; y < roof; y += 1) bg[y * w + x] = 1;
}

const seen = new Uint8Array(w * h);
for (let start = 0; start < w * h; start += 1) {
  if (bg[start] || seen[start]) continue;
  const stack = [start];
  const members = [];
  seen[start] = 1;
  while (stack.length) {
    const p = stack.pop();
    members.push(p);
    const x = p % w;
    const y = (p - x) / w;
    for (const [cx, cy] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const np = cy * w + cx;
      if (bg[np] || seen[np]) continue;
      seen[np] = 1;
      stack.push(np);
    }
  }
  if (members.length < 700) {
    for (const p of members) bg[p] = 1;
  }
}

const dist = new Float32Array(w * h);
dist.fill(1e9);
const dq = [];
for (let p = 0; p < w * h; p += 1) {
  if (bg[p]) continue;
  dist[p] = 0;
  dq.push(p);
}
for (let i = 0; i < dq.length; i += 1) {
  const p = dq[i];
  const x = p % w;
  const y = (p - x) / w;
  const nd = dist[p] + 1;
  for (const [cx, cy] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const np = cy * w + cx;
    if (nd < dist[np]) {
      dist[np] = nd;
      dq.push(np);
    }
  }
}

for (let p = 0; p < w * h; p += 1) {
  const i = p * 4;
  if (!bg[p]) {
    data[i + 3] = 255;
    continue;
  }
  const d = dist[p];
  data[i + 3] = d >= FEATHER ? 0 : Math.round(255 * (1 - d / FEATHER));
}

const out = PNG.sync.write(src);
for (const dest of dests) writeFileSync(dest, out);
console.log(`knockout → ${dests.map((d) => d.slice(root.length + 1)).join(', ')}`);
