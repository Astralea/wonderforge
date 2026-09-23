// Deterministic reference-matching captures of the PRODUCTION Sydney scene.
// Boots an isolated WorldScene on the dev server (same pattern as
// scripts/probe-sydney-background.mjs), renders the completed monument
// (constructionT=1) under fixed daylight (lightT=0.58), then overrides the
// camera AFTER a normal update() for compass elevations, a roof plan and a
// north-west aerial. Each angle ships a full context frame and a tighter
// architectural frame. This is acceptance tooling: no production camera or
// scene source is changed.
//
//   node scripts/verify-sydney-reference-views.mjs
//   SYDNEY_QA_URL=http://127.0.0.1:5590/ SYDNEY_QA_OUT=artifacts/... node ...
//
// Coordinates (src/data/sydneyHarbourContext.ts): +X east, +Z south, +Y up.
// Camera positions use the production orbit convention:
//   position = target + [cos(az)*cos(pitch)*r, sin(pitch)*r, sin(az)*cos(pitch)*r]
// so azimuth -90deg is a camera due NORTH looking south, +90deg due SOUTH
// looking north, 0deg due EAST, 180deg due WEST, -135deg north-west.

import { chromium } from '@playwright/test';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.SYDNEY_QA_URL ?? 'http://127.0.0.1:5590/';
const out = path.resolve(
  process.env.SYDNEY_QA_OUT ??
    'artifacts/sydney-reference-rebuild-2026-09-23/baseline-views',
);
await mkdir(out, { recursive: true });

const CONSTRUCTION_T = 1; // completed house
const LIGHT_T = 0.58; // fixed daylight: midday harbour sun, no dusk obscuring
const CAMERA_T = 1; // normal-update shot schedule slot; only fog/near/far survive the override
const MONUMENT = [0, 24, 0]; // production look-at height over Bennelong Point

const d2r = (d) => (d * Math.PI) / 180;
const shot = (id, azimuthDeg, pitchDeg, radius, target = MONUMENT) => ({
  id,
  azimuth: d2r(azimuthDeg),
  pitch: d2r(pitchDeg),
  radius,
  target,
});

// Six required angles x {context, architecture} frames.
const SHOTS = [
  shot('north-context', -90, 22, 560),
  shot('north-architecture', -90, 9, 240, [0, 28, 0]),
  shot('south-context', 90, 22, 560),
  shot('south-architecture', 90, 7, 250, [0, 26, 0]), // user-side.png style elevation
  shot('east-context', 0, 22, 560),
  shot('east-architecture', 0, 10, 240, [0, 26, 0]),
  shot('west-context', 180, 22, 560),
  shot('west-architecture', 180, 10, 240, [0, 26, 0]),
  // Camera sits south looking north-down so frame-up reads as north.
  shot('roof-plan-context', 90, 76, 640, [0, 8, 0]),
  shot('roof-plan-architecture', 90, 80, 320, [0, 8, 15]),
  shot('northwest-aerial-context', -135, 40, 540),
  shot('northwest-aerial-architecture', -135, 30, 280, [0, 22, 0]),
];

// Portrait keeps the same six angles in context framing, widened for the
// narrow aspect the way the production narrow factor widens radius.
const PORTRAIT_SHOTS = SHOTS.filter((s) => s.id.endsWith('-context')).map(
  (s) => ({ ...s, id: s.id.replace('-context', '-portrait'), radius: s.radius * 1.5 }),
);

const VIEWPORTS = [
  { id: 'desktop', width: 1200, height: 900, shots: SHOTS },
  { id: 'portrait', width: 390, height: 844, shots: PORTRAIT_SHOTS },
];

const pageHtml = await (await fetch(base)).text();
const scriptSrcs = [...pageHtml.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
const entry = scriptSrcs.find((s) => /main|\.js$/.test(s)) ?? scriptSrcs[0] ?? null;

const report = {
  tool: 'verify-sydney-reference-views',
  base,
  entry,
  scriptSrcs,
  imports: [
    '/src/render/three/WorldScene.ts',
    '/src/data/wonders/sydney-opera-house.ts',
  ],
  constructionT: CONSTRUCTION_T,
  lightT: LIGHT_T,
  cameraT: CAMERA_T,
  convention: '+X east, +Z south; position = target + [cos(az)*cos(pitch)*r, sin(pitch)*r, sin(az)*cos(pitch)*r]',
  captures: [],
  errors: [],
};

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--mute-audio'],
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 1,
});
page.on('pageerror', (e) => report.errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') report.errors.push(m.text());
  if (m.type() === 'warning' && /WebGL|GL_INVALID|GL_OUT_OF_MEMORY/i.test(m.text()))
    report.errors.push(m.text());
});
page.on('requestfailed', (r) =>
  report.errors.push(`requestfailed ${r.url()} ${r.failure()?.errorText}`),
);
// Run against a frozen source tree: keep the real Vite module graph intact so
// page and network errors remain meaningful rather than suppressing its client.

await page.goto(base, { waitUntil: 'networkidle' });
// Vite transforms on demand; a source file mid-edit by another process can
// 500 once and succeed on retry. Retry briefly, then fail with the error.
let booted = false;
let lastError;
for (let attempt = 0; attempt < 4 && !booted; attempt++) {
  if (attempt) await page.waitForTimeout(3000);
  lastError = await page.evaluate(async () => {
    try {
      const [{ WorldScene }, { sydneyOperaHouse }] = await Promise.all([
        import('/src/render/three/WorldScene.ts'),
        import('/src/data/wonders/sydney-opera-house.ts'),
      ]);
      const canvas = document.createElement('canvas');
      canvas.id = 'refprobe';
      canvas.style = 'position:fixed;inset:0;z-index:99999';
      document.body.append(canvas);
      window.__refprobe = new WorldScene(canvas, sydneyOperaHouse);
      return null;
    } catch (e) {
      return String(e?.message ?? e);
    }
  });
  booted = lastError === null;
}
if (!booted) {
  report.errors.push(`WorldScene module import failed: ${lastError}`);
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  throw new Error(`WorldScene module import failed: ${lastError}`);
}
await page.evaluate(() => window.__refprobe.ready);

for (const view of VIEWPORTS) {
  await page.evaluate(({ width, height }) => {
    window.__refprobe.resize(width, height);
  }, view);
  for (const s of view.shots) {
    const r = await page
      .evaluate(
      ({ s, constructionT, cameraT, lightT }) => {
        const probe = window.__refprobe;
        // Normal production update first: builds the completed scene, light
        // rig, fog and clip planes; only THEN is the camera redirected.
        probe.update(constructionT, cameraT, lightT);
        const pipeline = probe.pipeline;
        const camera = pipeline?.camera;
        if (!camera || typeof pipeline.render !== 'function')
          return { error: 'pipeline.camera/render interface unavailable' };
        const horizontal = Math.cos(s.pitch) * s.radius;
        const position = [
          s.target[0] + Math.cos(s.azimuth) * horizontal,
          s.target[1] + Math.sin(s.pitch) * s.radius,
          s.target[2] + Math.sin(s.azimuth) * horizontal,
        ];
        camera.position.set(position[0], position[1], position[2]);
        camera.lookAt(s.target[0], s.target[1], s.target[2]);
        camera.updateProjectionMatrix();
        pipeline.render(lightT);
        const info = pipeline.renderer?.info;
        return {
          position,
          camera: {
            fov: camera.fov,
            aspect: camera.aspect,
            near: camera.near,
            far: camera.far,
          },
          fog:
            pipeline.scene?.fog != null
              ? { near: pipeline.scene.fog.near, far: pipeline.scene.fog.far }
              : null,
          renderer: info
            ? {
                calls: info.render.calls,
                triangles: info.render.triangles,
                geometries: info.memory.geometries,
                textures: info.memory.textures,
              }
            : null,
          dataUrl: document.querySelector('#refprobe').toDataURL('image/png'),
        };
      },
      { s, constructionT: CONSTRUCTION_T, cameraT: CAMERA_T, lightT: LIGHT_T },
      )
      .catch((e) => ({ error: String(e?.message ?? e) }));
    if (r.error) {
      report.captures.push({ viewport: view.id, id: s.id, error: r.error });
      report.errors.push(`${view.id}/${s.id}: ${r.error}`);
      continue;
    }
    const file = `${view.id}-${s.id}.png`;
    await writeFile(`${out}/${file}`, Buffer.from(r.dataUrl.split(',')[1], 'base64'));
    report.captures.push({
      viewport: view.id,
      id: s.id,
      file,
      azimuthDeg: Math.round((s.azimuth * 180) / Math.PI * 100) / 100,
      pitchDeg: Math.round((s.pitch * 180) / Math.PI * 100) / 100,
      radius: s.radius,
      target: s.target,
      position: r.position.map((v) => Math.round(v * 100) / 100),
      camera: r.camera,
      fog: r.fog,
      renderer: r.renderer,
    });
  }
}
await browser.close();

// Optional owner references live beside the output dir (../references/*.png);
// fall back to the canonical dated folder so custom SYDNEY_QA_OUT still links.
async function referenceHref(name) {
  for (const dir of [
    path.join(out, '..', 'references'),
    path.join(repo, 'artifacts/sydney-reference-rebuild-2026-09-23/references'),
  ]) {
    const p = path.join(dir, name);
    try {
      await access(p);
      return path.relative(out, p).split(path.sep).join('/');
    } catch {}
  }
  return null;
}
const references = [];
for (const name of ['user-aerial.png', 'user-side.png']) {
  const href = await referenceHref(name);
  if (href) references.push({ name, href });
}

const figure = (src, caption) =>
  `  <figure><img src="${src}" loading="lazy"/><figcaption>${caption}</figcaption></figure>`;
const html = `<!doctype html>
<meta charset="utf-8"/>
<title>Sydney reference views — ${base}</title>
<style>
 body{font:13px/1.45 ui-monospace,Menlo,monospace;background:#14181d;color:#dde4ea;margin:24px}
 h1{font-size:15px} h2{font-size:13px;margin-top:28px;color:#9fb4c8}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
 figure{margin:0;background:#0c0f12;padding:8px;border:1px solid #2a3340}
 img{width:100%;display:block;background:#000}
 figcaption{padding-top:6px;color:#9fb4c8;white-space:pre-wrap}
</style>
<h1>Sydney production WorldScene — reference matching baseline</h1>
<p>base ${base} · constructionT=${CONSTRUCTION_T} · lightT=${LIGHT_T} ·
camera positions in report.json (+X east, +Z south)</p>
${references.length ? `<h2>Owner references</h2><div class="grid">
${references.map((r) => figure(r.href, r.name)).join('\n')}
</div>` : ''}
<h2>Captures</h2>
<div class="grid">
${report.captures
  .filter((c) => c.file)
  .map((c) =>
    figure(
      c.file,
      `${c.file}\naz ${c.azimuthDeg}° pitch ${c.pitchDeg}° r ${c.radius}m` +
        ` · calls ${c.renderer?.calls ?? '?'} tris ${c.renderer?.triangles ?? '?'}`,
    ),
  )
  .join('\n')}
</div>
`;
await writeFile(`${out}/index.html`, html);
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
if (report.errors.length || report.captures.filter((c) => c.file).length !== 18)
  throw new Error(`Reference captures failed: ${report.errors.join('; ')}`);
console.log(
  JSON.stringify({
    out,
    captures: report.captures.filter((c) => c.file).length,
    errors: report.errors,
    entry,
    references: references.map((r) => r.href),
  }),
);
