import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// This gate is deliberately required. Do not invoke it until the release owner
// confirms deployment and supplies the expected new main bundle filename.
const args = process.argv.slice(2);
const bundle = args[args.indexOf('--ready-bundle') + 1];
if (!args.includes('--ready-bundle') || !/^main-[A-Za-z0-9_-]+\.js$/.test(bundle ?? '')) {
  throw new Error('Await deployment-ready confirmation, then pass --ready-bundle main-HASH.js');
}
const origin = 'https://wonderforge.pages.dev';
const runName = args.includes('--run') ? args[args.indexOf('--run') + 1] : '';
if (runName && !/^[a-z0-9-]+$/.test(runName)) throw new Error('Run name must contain only lowercase letters, digits and hyphens');
const output = fileURLToPath(new URL(runName ? `./${runName}/` : './', import.meta.url));
const tracks = JSON.parse(await readFile('artifacts/chapters-history-2026-09-21/narration/source-snapshot.json', 'utf8'));
const manifest = JSON.parse(await readFile('artifacts/chapters-history-2026-09-21/narration/manifest.json', 'utf8'));
const films = [
  { id: 'pyramids-of-giza', name: 'Pyramids of Giza' },
  { id: 'stonehenge', name: 'Stonehenge' },
  { id: 'colosseum', name: 'Colosseum' },
  { id: 'eiffel-tower', name: 'Eiffel Tower' },
];
const result = {
  startedAt: new Date().toISOString(), origin, expectedBundle: bundle,
  scope: 'Public production launch, render and real click/keyboard transport smoke checks. Browser audio output is muted. Not full-film playback, subjective listening, phone performance, Stonehenge composition, or served-asset hash acceptance.',
  homes: [], runs: [], failures: [],
};
const check = (condition, message) => {
  if (!condition) { result.failures.push(message); console.log(`FAIL ${message}`); }
  return condition;
};
const save = () => writeFile(`${output}/results.json`, JSON.stringify(result, null, 2) + '\n');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
try {
  for (const [mode, width, height] of [['desktop', 1440, 900], ['portrait', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const pageErrors = [], consoleErrors = [], httpFailures = [], requestFailures = [], abortedRequests = [], responses = [];
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('response', response => {
      const entry = { url: response.url(), status: response.status() };
      responses.push(entry); if (entry.status >= 400) httpFailures.push(entry);
    });
    page.on('requestfailed', request => {
      const entry = { url: request.url(), error: request.failure()?.errorText };
      (entry.error === 'net::ERR_ABORTED' ? abortedRequests : requestFailures).push(entry);
    });
    await page.addInitScript(() => {
      window.__publicSmokeMedia = []; window.__publicSmokeAudio = [];
      const play = HTMLMediaElement.prototype.play;
      const record = (audio, action, extra = {}) => window.__publicSmokeMedia.push({
        action, path: new URL(audio.src).pathname, time: audio.currentTime,
        duration: audio.duration, paused: audio.paused, volume: audio.volume,
        filmT: Number(document.querySelector('[aria-label="Film position"]')?.value), ...extra,
      });
      HTMLMediaElement.prototype.play = function () {
        const tracked = this.src.includes('/audio/narration/');
        if (tracked && !window.__publicSmokeAudio.includes(this)) {
          window.__publicSmokeAudio.push(this);
          for (const event of ['loadedmetadata', 'playing', 'ended', 'error']) {
            this.addEventListener(event, () => record(this, event, { error: this.error?.code ?? null }));
          }
        }
        if (tracked) record(this, 'play-call');
        const promise = play.call(this);
        if (tracked && promise?.catch) promise.catch(error => record(this, 'rejected', { error: error.message }));
        return promise;
      };
    });
    const wake = () => page.mouse.move(width / 2, height - 90);
    const pause = async () => {
      await wake();
      const button = page.getByRole('button', { name: 'Pause', exact: true });
      if (await button.count()) await button.click();
    };
    try {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      const scripts = await page.locator('script[src]').evaluateAll(elements => elements.map(element => new URL(element.src).pathname));
      if (!scripts.some(src => src === `/assets/${bundle}`)) {
        throw new Error(`Deployment bundle mismatch: expected ${bundle}, saw ${scripts.join(', ')}`);
      }
      check(await page.getByRole('progressbar').count() === 0, `${mode}: homepage has no arrival overlay`);
      await page.getByRole('button', { name: 'Choose a site', exact: true }).click();
      const ready = page.locator('section[aria-labelledby="catalog-ready"]');
      const upcoming = page.locator('section[aria-labelledby="catalog-in-progress"]');
      const readyNames = await ready.getByRole('button').allTextContents();
      check(readyNames.length === 4, `${mode}: exactly four released choices`);
      for (const film of films) check(await ready.getByRole('button', { name: new RegExp(film.name) }).count() === 1, `${mode}: released choice ${film.id}`);
      check(await upcoming.locator('[aria-disabled="true"]').count() === 6, `${mode}: six in-production entries disabled`);
      check(await upcoming.getByRole('button').count() === 0, `${mode}: in-production entries not playable`);
      await page.screenshot({ path: `${output}/${mode}-catalog.png` });
      result.homes.push({ mode, scripts, readyNames, pageErrors: [...pageErrors], httpFailures: [...httpFailures] });
      check(pageErrors.length === 0, `${mode}: no homepage errors`);
      check(httpFailures.length === 0, `${mode}: no homepage HTTP failures`);
      check(requestFailures.length === 0, `${mode}: no homepage request failures`);

      for (const film of films) {
        const label = `${mode}/${film.id}`;
        const offsets = { page: pageErrors.length, console: consoleErrors.length, http: httpFailures.length, request: requestFailures.length, aborted: abortedRequests.length, responses: responses.length, media: await page.evaluate(() => window.__publicSmokeMedia.length) };
        const run = { mode, width, height, wonderId: film.id, controls: {} };
        try {
          // Gallery click is an ordinary user activation and creates the public
          // hash route. No renderer/store hooks or synthetic play bypasses.
          await page.getByRole('button', { name: new RegExp(film.name) }).click();
          await page.waitForURL(`${origin}/#/wonder/${film.id}`);
          await page.locator('canvas[data-assets="ready"]').waitFor({ timeout: 120000 });
          await page.getByRole('progressbar').waitFor({ state: 'detached', timeout: 120000 });
          const slider = page.getByRole('slider', { name: 'Film position', exact: true });
          await pause();
          run.controls.pausedAt = Number(await slider.inputValue());
          await page.waitForTimeout(350);
          check(Number(await slider.inputValue()) === run.controls.pausedAt, `${label}: pause freezes film`);

          // A real pointer seek through the native range control.
          const box = await slider.boundingBox();
          await slider.click({ position: { x: box.width * 0.42, y: box.height / 2 } });
          run.controls.seekTo = Number(await slider.inputValue());
          check(run.controls.seekTo > 0.35 && run.controls.seekTo < 0.49, `${label}: pointer scrub changes position`);
          await page.getByRole('button', { name: 'Play', exact: true }).click();
          await page.waitForTimeout(450);
          run.controls.playAdvancedTo = Number(await slider.inputValue());
          check(run.controls.playAdvancedTo > run.controls.seekTo, `${label}: click Play advances clock`);
          await pause();

          await slider.focus(); await page.keyboard.press('End');
          run.controls.endpointBeforeReverse = Number(await slider.inputValue());
          check(run.controls.endpointBeforeReverse === 1, `${label}: End reaches completed endpoint`);
          check(await page.getByRole('button', { name: 'Replay film', exact: true }).count() === 1, `${label}: endpoint offers replay`);
          if (film.id === 'stonehenge') {
            await page.waitForTimeout(300);
            await page.screenshot({ path: `${output}/${mode}-stonehenge-final-ui.png` });
            run.finalFrame = await page.evaluate(() => ({ t: Number(document.querySelector('[aria-label="Film position"]')?.value), renderer: window.__WONDERFORGE_RENDERER__ }));
          }
          await page.keyboard.press('ArrowLeft');
          run.controls.reverseSeek = Number(await slider.inputValue());
          check(run.controls.reverseSeek === 0.999 && await page.getByRole('button', { name: 'Play', exact: true }).count() === 1, `${label}: reverse seek returns paused`);
          check(new URL(page.url()).hash === `#/wonder/${film.id}`, `${label}: focused slider arrow does not navigate films`);

          const track = tracks.find(track => track.wonderId === film.id);
          if (track) {
            const first = track.beats[0];
            const clip = manifest.find(clip => clip.wonderId === film.id && clip.captionId === first.id);
            const on = page.getByRole('button', { name: 'Turn narration on', exact: true });
            if (await on.count()) await on.click();
            const chapters = page.getByRole('button', { name: 'Chapters', exact: true });
            if (await chapters.count()) await chapters.click();
            await page.getByRole('button', { name: `Play from ${first.kicker}`, exact: true }).click();
            await page.waitForFunction(path => window.__publicSmokeAudio.some(audio => new URL(audio.src).pathname === path && !audio.paused && audio.currentTime > 0.12 && Number.isFinite(audio.duration)), clip.src, { timeout: 15000 });
            run.narration = await page.evaluate(({ clip, track }) => {
              const audio = window.__publicSmokeAudio.find(audio => new URL(audio.src).pathname === clip.src);
              return { captionId: clip.captionId, src: clip.src, expectedVoice: track.voice, expectedDuration: clip.duration, actualDuration: audio.duration, currentTime: audio.currentTime, paused: audio.paused, volume: audio.volume, visibleCaption: document.querySelector('[data-testid="live-caption"] p:last-child')?.textContent };
            }, { clip, track });
            check(Math.abs(run.narration.actualDuration - clip.duration) < 0.08, `${label}: selected first narration duration matches local accepted metadata`);
            check(run.narration.visibleCaption === first.text, `${label}: first historical caption matches narration`);
            await pause();
            await page.getByRole('button', { name: 'Turn narration off', exact: true }).click();
          } else {
            // Eiffel has its separately reviewed three-minute narration clock.
            const off = page.getByRole('button', { name: 'Turn narration off', exact: true });
            if (await off.count()) await off.click();
          }

          run.render = await page.evaluate(() => ({
            canvas: { width: document.querySelector('canvas')?.width, height: document.querySelector('canvas')?.height, assets: document.querySelector('canvas')?.dataset.assets },
            renderer: window.__WONDERFORGE_RENDERER__, filmPosition: document.querySelector('[aria-label="Film position"]')?.value,
          }));
          check(run.render.renderer?.triangles > 0 && run.render.renderer?.calls > 0, `${label}: nonempty rendered scene`);
          await page.screenshot({ path: `${output}/${mode}-${film.id}.png` });
        } catch (error) {
          run.error = String(error); check(false, `${label}: ${error}`);
          await page.screenshot({ path: `${output}/${mode}-${film.id}-failure.png` }).catch(() => {});
        }
        run.pageErrors = pageErrors.slice(offsets.page);
        run.consoleErrors = consoleErrors.slice(offsets.console);
        run.httpFailures = httpFailures.slice(offsets.http);
        run.requestFailures = requestFailures.slice(offsets.request);
        run.abortedRequests = abortedRequests.slice(offsets.aborted);
        run.responses = responses.slice(offsets.responses);
        run.narrationRequests = run.responses.filter(response => response.url.includes('/audio/narration/'));
        run.mediaEvents = await page.evaluate(start => window.__publicSmokeMedia.slice(start), offsets.media);
        check(run.pageErrors.length === 0, `${label}: no page errors`);
        check(run.consoleErrors.length === 0, `${label}: no console errors`);
        check(run.httpFailures.length === 0, `${label}: no HTTP asset failures`);
        check(run.requestFailures.length === 0, `${label}: no non-aborted request failures`);
        check(!run.mediaEvents.some(event => event.action === 'error' || event.action === 'rejected'), `${label}: no narration errors or rejected play`);
        result.runs.push(run); await save();
        console.log(JSON.stringify({ completed: label, failureCount: result.failures.length, renderer: run.render?.renderer }));

        // Return through the visible wordmark, retaining normal browser cache.
        const back = page.getByRole('button', { name: 'WonderForge, back to films', exact: true });
        if (await back.count()) await back.click();
        else await page.goto(`${origin}/#/`, { waitUntil: 'domcontentloaded' });
        const choose = page.getByRole('button', { name: 'Choose a site', exact: true });
        if (await choose.count()) await choose.click();
      }
    } catch (error) {
      check(false, `${mode}: ${error}`);
    } finally {
      await context.close(); await save();
    }
  }
} finally {
  await browser.close(); result.finishedAt = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ runs: result.runs.length, failures: result.failures }, null, 2));
if (result.failures.length || result.runs.length !== 8) process.exitCode = 1;
