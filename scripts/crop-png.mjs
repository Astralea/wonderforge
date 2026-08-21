// Crop a region from a PNG: crop-png.mjs <in> <out> <x> <y> <w> <h>
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, x, y, w, h] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(input));
const crop = new PNG({ width: Number(w), height: Number(h) });
PNG.bitblt(png, crop, Number(x), Number(y), Number(w), Number(h), 0, 0);
writeFileSync(output, PNG.sync.write(crop));
console.log('cropped', input, '->', output);
