// Raster oracle: an external SVG renderer checks real filled/clip negative space.
const { writeFileSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { PNG } = require('pngjs');
execFileSync('node_modules/.bin/esbuild', ['src/render/three/wonderArrivalDrawings.ts', '--bundle', '--platform=node', '--format=cjs', '--outfile=/tmp/wonder-arrival-cutouts.cjs']);
const { WONDER_ARRIVAL_DRAWINGS: drawings } = require('/tmp/wonder-arrival-cutouts.cjs');
const dir = 'artifacts/colosseum-icon-2026-09-20';
const cases = [
  ['colosseum', 3, [
    ['open bowl', 16, 11, 0], ['ground arch', 6.5, 24.6, 0],
    ['middle arch', 6.5, 20, 0], ['upper arch', 6.5, 15.2, 0],
    ['solid pier', 8.8, 20, 255], ['solid lower pier', 14, 26, 255],
  ]],
  ['petra', 0, [['door', 16, 24, 0], ['wall', 8, 24, 255]]],
  ['chichen-itza', 2, [['temple door', 16, 8.5, 0], ['temple wall', 13.5, 8.5, 255]]],
  ['stonehenge', 4, [['lintel opening', 16, 12, 0], ['upright stone', 11.5, 20, 255]]],
];
const results=[];
for (const [id, offset, probes] of cases) {
  const d=drawings[id], [width,height]=d.viewBox;
  const rule=d.fillRule ?? 'nonzero';
  for (const mode of ['surface','wave-clip']) {
    const geometry=mode==='surface' ? `<path d="${d.outline}" fill-rule="${rule}" fill="white"/>` : `<defs><clipPath id="monument"><path d="${d.outline}" clip-rule="${rule}"/></clipPath></defs><rect width="${width}" height="${height}" fill="white" clip-path="url(#monument)"/>`;
    const file=`${dir}/${id}-${mode}-cutouts`;
    writeFileSync(`${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${width*4}" height="${height*4}" viewBox="0 0 ${width} ${height}">${geometry}</svg>`);
    execFileSync('rsvg-convert', [`${file}.svg`, '-o', `${file}.png`]);
    const png=PNG.sync.read(readFileSync(`${file}.png`));
    for (const [label,x,y,expected] of probes) {
      const px=Math.round(x*7*4),py=Math.round((y-offset)*7*4);
      const actual=png.data[(py*png.width+px)*4+3];
      if(actual!==expected)throw new Error(`${id} ${mode} ${label}: alpha ${actual}, expected ${expected}`);
      results.push({id,mode,label,alpha:actual});
    }
  }
}
writeFileSync(`${dir}/cutout-raster-checks.json`,JSON.stringify({renderer:'librsvg',checks:results.length,results},null,2)+'\n');
console.log(`${results.length} SVG raster alpha checks passed (surface and wave clip).`);
