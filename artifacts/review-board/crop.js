// Crop a region from a PNG and upscale nearest-neighbor. Read-only review tool.
// usage: node crop.js <in.png> <out.png> <x> <y> <w> <h> <scale>
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [, , inPath, outPath, x0, y0, w0, h0, s0] = process.argv;
const x = +x0, y = +y0, w = +w0, h = +h0, s = +(s0 || 3);
const src = PNG.sync.read(fs.readFileSync(inPath));
const out = new PNG({ width: w * s, height: h * s });
for (let dy = 0; dy < h * s; dy++) {
  for (let dx = 0; dx < w * s; dx++) {
    const sx = Math.min(src.width - 1, x + Math.floor(dx / s));
    const sy = Math.min(src.height - 1, y + Math.floor(dy / s));
    const si = (sy * src.width + sx) << 2;
    const di = (dy * out.width + dx) << 2;
    out.data[di] = src.data[si];
    out.data[di + 1] = src.data[si + 1];
    out.data[di + 2] = src.data[si + 2];
    out.data[di + 3] = 255;
  }
}
fs.writeFileSync(outPath, PNG.sync.write(out));
console.log('wrote', outPath, out.width + 'x' + out.height, 'src', src.width + 'x' + src.height);
