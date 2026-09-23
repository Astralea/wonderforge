// Read-only causal probe: direct WorldScene update and synchronous default-FBO reads.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.SYDNEY_QA_URL ?? 'http://127.0.0.1:5590';
const out =
  process.env.SYDNEY_QA_OUT ??
  'artifacts/sydney-reference-rebuild-2026-09-23/black-frames-ab';
const variants = (
  process.env.SYDNEY_AB_VARIANTS ?? 'baseline,samples0,bloom-off,godrays-off'
).split(',');
const frames = Number(process.env.SYDNEY_AB_FRAMES ?? 900);
const startT = Number(process.env.SYDNEY_AB_START ?? 0);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--mute-audio'],
});
const summaries = [];
try {
  for (const variant of variants) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    // Empty document on the real Vite origin avoids a second hidden application renderer.
    await page.route(`${base}/`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body style="margin:0"><canvas id="probe"></canvas></body></html>',
      }),
    );
    await page.goto(`${base}/`);
    const result = await page.evaluate(
      async ({ variant, frames, startT }) => {
        const [{ WorldScene }, { sydneyOperaHouse }] = await Promise.all([
          import('/src/render/three/WorldScene.ts'),
          import('/src/data/wonders/sydney-opera-house.ts'),
        ]);
        const canvas = document.querySelector('#probe');
        const world = new WorldScene(canvas, sydneyOperaHouse);
        world.resize(1440, 900);
        await world.ready;
        const pipeline = world.pipeline;
        const composer = pipeline.composer;
        if (variant === 'samples0') {
          const target = composer.renderTarget1.clone();
          target.samples = 0;
          composer.reset(target);
        } else if (variant === 'bloom-off') {
          // Keep enabled=true because RenderPipeline gates godrays on this flag.
          pipeline.bloom.render = () => {};
        } else if (variant === 'godrays-off') {
          pipeline.godrays.enabled = false;
        } else if (variant === 'sky-denominator-safe') {
          const sky = pipeline.scene.getObjectByName(
            'sydney-world-space-harbour-sky',
          );
          if (!sky?.material.fragmentShader.includes('(dir.y + 0.38)'))
            throw new Error('Expected sky denominator not found');
          sky.material.fragmentShader = sky.material.fragmentShader.replace(
            '(dir.y + 0.38)',
            '(max(dir.y, 0.0) + 0.38)',
          );
          sky.material.needsUpdate = true;
        } else if (variant === 'fullscreen-depth-off') {
          for (const pass of composer.passes) {
            if (pass.material) {
              pass.material.depthTest = false;
              pass.material.depthWrite = false;
            }
          }
        }
        const gl = pipeline.renderer.getContext();
        const hdr = [];
        let probeIndex = -1;
        if (variant === 'hdr-inspect' || variant === 'sky-denominator-safe') {
          const inspect = (name, target) => {
            const data = new Uint16Array(target.width * target.height * 4);
            pipeline.renderer.readRenderTargetPixels(
              target,
              0,
              0,
              target.width,
              target.height,
              data,
            );
            let nan = 0,
              infinity = 0,
              negative = 0,
              peak = 0;
            const nonfiniteCoordinates = [];
            for (let i = 0; i < data.length; i++) {
              if (i % 4 === 3) continue;
              const word = data[i],
                exponent = (word >> 10) & 31,
                fraction = word & 1023;
              if (word & 32768) negative++;
              if (exponent === 31) {
                if (fraction) nan++;
                else infinity++;
                if (nonfiniteCoordinates.length < 12)
                  nonfiniteCoordinates.push([
                    Math.floor(i / 4) % target.width,
                    Math.floor(i / 4 / target.width),
                    i % 4,
                    word,
                  ]);
              } else {
                const value =
                  (word & 32768 ? -1 : 1) *
                  (exponent
                    ? Math.pow(2, exponent - 15) * (1 + fraction / 1024)
                    : (Math.pow(2, -14) * fraction) / 1024);
                peak = Math.max(peak, value);
              }
            }
            hdr.push({
              index: probeIndex,
              name,
              dimensions: [target.width, target.height],
              nan,
              infinity,
              negative,
              peak,
              nonfiniteCoordinates,
              error: gl.getError(),
            });
          };
          const original = pipeline.bloom.render.bind(pipeline.bloom);
          pipeline.bloom.render = (
            renderer,
            writeBuffer,
            readBuffer,
            ...rest
          ) => {
            const check = [13, 14, 17].includes(probeIndex);
            if (check) inspect('input', readBuffer);
            original(renderer, writeBuffer, readBuffer, ...rest);
            if (check) {
              inspect('bright', pipeline.bloom.renderTargetBright);
              pipeline.bloom.renderTargetsVertical.forEach((target, index) =>
                inspect(`blur-v${index}`, target),
              );
              inspect('composite', pipeline.bloom.renderTargetsHorizontal[0]);
              inspect('blended', readBuffer);
            }
          };
        }
        const gpu = gl.getExtension('WEBGL_debug_renderer_info');
        const configuration = {
          variant,
          frames,
          startT,
          stepT: 1 / 3600,
          samples: [
            composer.renderTarget1.samples,
            composer.renderTarget2.samples,
          ],
          bloomEnabled: pipeline.bloom.enabled,
          bloomBypassed: variant === 'bloom-off',
          godraysEnabled: pipeline.godrays.enabled,
          context: gl.getContextAttributes(),
          gpu: gpu
            ? gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          dimensions: [canvas.width, canvas.height],
        };
        const pixels = new Uint8Array(4 * 4 * 4);
        const samples = [];
        const captures = [];
        let lost = 0;
        canvas.addEventListener('webglcontextlost', () => lost++);
        const begun = performance.now();
        await new Promise((resolve, reject) => {
          let index = 0;
          function frame(now) {
            try {
              if (now - begun < index * (1000 / 60)) {
                requestAnimationFrame(frame);
                return;
              }
              const t = Math.min(1, startT + index / 3600);
              probeIndex = index;
              world.update(t, t, t);
              let blackPatches = 0;
              let max = 0;
              let sum = 0;
              let centerMax = 0;
              for (let row = 0; row < 5; row++)
                for (let col = 0; col < 5; col++) {
                  const x = Math.floor(canvas.width * (0.1 + 0.2 * col));
                  const y = Math.floor(canvas.height * (0.1 + 0.2 * row));
                  gl.readPixels(x, y, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                  let patchMax = 0;
                  for (let p = 0; p < pixels.length; p += 4) {
                    patchMax = Math.max(
                      patchMax,
                      pixels[p],
                      pixels[p + 1],
                      pixels[p + 2],
                    );
                    sum += pixels[p] + pixels[p + 1] + pixels[p + 2];
                  }
                  if (patchMax <= 1) blackPatches++;
                  if (row === 2 && col === 2) centerMax = patchMax;
                  max = Math.max(max, patchMax);
                }
              const record = {
                index,
                t,
                ms: performance.now() - begun,
                blackPatches,
                max,
                mean: sum / (25 * 16 * 3),
                centerMax,
                error: gl.getError(),
                framebufferBound:
                  gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null,
              };
              if (blackPatches >= 24) {
                const whole = new Uint8Array(canvas.width * canvas.height * 4);
                gl.readPixels(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  whole,
                );
                let black = 0,
                  wholeMax = 0;
                for (let p = 0; p < whole.length; p += 4) {
                  const m = Math.max(whole[p], whole[p + 1], whole[p + 2]);
                  if (m <= 1) black++;
                  wholeMax = Math.max(wholeMax, m);
                }
                record.fullFrameBlackFraction =
                  black / (canvas.width * canvas.height);
                record.fullFrameMax = wholeMax;
              }
              if (
                index === 0 ||
                index === frames - 1 ||
                (blackPatches >= 24 && captures.length < 14)
              ) {
                captures.push({
                  index,
                  t,
                  blackPatches,
                  url: canvas.toDataURL('image/png'),
                });
              }
              samples.push(record);
              index++;
              if (index < frames) requestAnimationFrame(frame);
              else resolve();
            } catch (error) {
              reject(error);
            }
          }
          requestAnimationFrame(frame);
        });
        const wallMs = performance.now() - begun;
        world.dispose();
        return { configuration, wallMs, lost, samples, captures, hdr };
      },
      { variant, frames, startT },
    );
    const directory = `${out}/${variant}`;
    await mkdir(directory, { recursive: true });
    for (const capture of result.captures) {
      await writeFile(
        `${directory}/frame-${String(capture.index).padStart(4, '0')}.png`,
        Buffer.from(capture.url.split(',')[1], 'base64'),
      );
      delete capture.url;
    }
    result.errors = errors;
    const summary = {
      ...result.configuration,
      wallMs: result.wallMs,
      lost: result.lost,
      centerBlack: result.samples.filter((s) => s.centerMax <= 1).length,
      gridBlack: result.samples.filter((s) => s.blackPatches >= 24).length,
      fullBlack: result.samples.filter((s) => s.fullFrameBlackFraction > 0.99)
        .length,
      glErrors: result.samples.filter((s) => s.error !== 0),
      nonDefaultFramebuffer: result.samples.filter((s) => s.framebufferBound)
        .length,
      blackIndices: result.samples
        .filter((s) => s.blackPatches >= 24)
        .map((s) => s.index),
      errors,
    };
    await writeFile(
      `${directory}/report.json`,
      JSON.stringify(result, null, 2),
    );
    summaries.push(summary);
    await writeFile(`${out}/summary.json`, JSON.stringify(summaries, null, 2));
    console.log(JSON.stringify(summary));
    await context.close();
  }
} finally {
  await browser.close();
}
