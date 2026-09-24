const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { PNG } = require('pngjs');
const path = require('node:path');
const directory = __dirname;
const source = fs.readFileSync('src/render/three/wonderArrivalDrawings.ts', 'utf8');
const eiffel = source.split('const EIFFEL: WonderArrivalDrawing = {')[1].split('\n};')[0];
const outline = eiffel.match(/outline: '([^']+)'/)[1];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="984" viewBox="0 0 160 246"><path d="${outline}" fill="white" fill-rule="evenodd"/></svg>`;
fs.writeFileSync(path.join(directory, 'eiffel-fill-silhouette.svg'), svg);
execFileSync('rsvg-convert', [path.join(directory, 'eiffel-fill-silhouette.svg'), '-o', path.join(directory, 'eiffel-fill-silhouette.png')]);
const png = PNG.sync.read(fs.readFileSync(path.join(directory, 'eiffel-fill-silhouette.png')));
const probes = [
  { label: 'Open campanile', x: 80, y: 25, expected: 0 },
  { label: 'Campanile frame', x: 74.8, y: 26.5, expected: 255 },
  { label: 'Lantern', x: 80, y: 16, expected: 255 },
  { label: 'Gallery', x: 80, y: 33, expected: 255 },
  { label: 'Open lower arch', x: 80, y: 210, expected: 0 },
  { label: 'Foot', x: 42, y: 220, expected: 255 },
];
for (const probe of probes) {
  probe.alpha = png.data[(Math.floor(probe.y * 4) * png.width + Math.floor(probe.x * 4)) * 4 + 3];
  if (probe.alpha !== probe.expected) throw new Error(`${probe.label}: ${probe.alpha} != ${probe.expected}`);
}
const report = { renderer: 'librsvg', scale: 4, passed: probes.length, probes };
fs.writeFileSync(path.join(directory, 'opening-checks.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
