import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'artifacts/colosseum-moon-surface-2026-09-21/lifecycle';
const base = 'http://127.0.0.1:5590';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'chromium', args:['--mute-audio']});
const results = [];
try {
  for (const scenario of ['failed-image', 'leave-during-image']) {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors = [], expectedNetworkFailures = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => {if(m.type()==='error') {
      if(m.text().includes('net::ERR_FAILED')) expectedNetworkFailures.push(m.text());
      else errors.push(m.text());
    }});
    let receivedImage;
    const received = new Promise(resolve => {receivedImage = resolve;});
    let releaseImage;
    const held = new Promise(resolve => {releaseImage = resolve;});
    await page.route('**/lroc-color-poles-1k-*.jpg', async route => {
      receivedImage();
      if(scenario==='failed-image') await route.abort('failed');
      else {await held; await route.continue();}
    });
    await page.goto(`${base}/#/wonder/colosseum`, {waitUntil:'domcontentloaded'});
    await received;
    if(scenario==='failed-image') {
      await page.locator('canvas[data-assets="ready"]').waitFor({timeout:30000});
      await page.getByRole('progressbar', {name:'Loading Colosseum'}).waitFor({state:'hidden'});
      const slider = page.getByLabel('Film position');
      await page.mouse.move(720,805);
      await page.waitForTimeout(150);
      if(await page.getByRole('button',{name:'Pause',exact:true}).count())
        await page.getByRole('button',{name:'Pause',exact:true}).click();
      await slider.evaluate(el=>{
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1');
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      });
      await page.waitForTimeout(250);
      const state = await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__);
      assert.equal(state.scene,'colosseum-reference');
      assert.ok(state.renderer.triangles>0);
      assert.equal(await page.locator('canvas[data-assets="error"]').count(),0);
      await page.screenshot({path:`${out}/failed-image-fallback.png`});
      results.push({scenario,passed:true,state,errors,expectedNetworkFailures});
    } else {
      // A deep link can briefly mount the ambient home world before hash sync.
      // Wait for the cinematic component before exercising route disposal.
      await page.getByLabel('Film position').waitFor({state:'attached'});
      await page.waitForTimeout(500);
      assert.equal(await page.locator('canvas').getAttribute('data-assets'),'loading');
      // Change the browser URL while the old world still has an image in flight.
      // The arrival overlay intentionally intercepts clicks until readiness.
      await page.evaluate(()=>{location.hash='#/';});
      await page.waitForFunction(()=>!location.hash.includes('/wonder/'));
      releaseImage();
      await page.waitForTimeout(800);
      assert.equal(await page.getByRole('progressbar',{name:'Loading Colosseum'}).count(),0);
      assert.equal(await page.locator('canvas[data-assets="error"]').count(),0);
      results.push({scenario,passed:true,hash:new URL(page.url()).hash,errors,expectedNetworkFailures});
    }
    assert.deepEqual(errors,[]);
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`,JSON.stringify({base,checkedAt:new Date().toISOString(),results},null,2));
}
console.log(JSON.stringify(results.map(({scenario,passed,errors,expectedNetworkFailures})=>({scenario,passed,errors,expectedNetworkFailures})),null,2));
