import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const base = 'artifacts/colosseum-moon-surface-2026-09-21/visual';
const out = `${base}/public`;
const url = 'https://wonderforge.pages.dev/#/wonder/colosseum';
const candidate = JSON.parse(await readFile(`${base}/candidate/results.json`, 'utf8'));
await mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'chromium',args:['--mute-audio']});
const results = [];
try {
  for (const [mode,width,height] of [['desktop',1440,900],['portrait',390,844]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[], responses=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.url().includes('lroc-color-poles'))responses.push({url:r.url(),status:r.status(),headers:r.headers()});});
    await page.addInitScript(()=>{
      window.__QA_SCENES__=[];
      window.__THREE_DEVTOOLS__={dispatchEvent(e){if(e.type==='observe' && e.detail.isScene)window.__QA_SCENES__.push(e.detail);}};
    });
    await page.goto(url,{waitUntil:'networkidle'});
    const slider=page.getByLabel('Film position');await slider.waitFor();
    await page.waitForFunction(()=>window.__QA_SCENES__.some(s=>s.getObjectByName('colosseum-world-space-weather-sky')?.userData.lunarSurfaceStatus==='ready'));
    await page.mouse.move(width/2,height-95);
    if(await page.getByRole('button',{name:'Pause',exact:true}).count())await page.getByRole('button',{name:'Pause',exact:true}).click();
    await slider.evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.waitForTimeout(450);
    const path=`${out}/${mode}-t1.png`;await page.screenshot({path});
    const state=await page.evaluate(()=>{
      const sky=window.__QA_SCENES__.map(s=>s.getObjectByName('colosseum-world-space-weather-sky')).find(Boolean);
      return {diagnostics:window.__THREE_GAME_DIAGNOSTICS__,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),surfaceStatus:sky.userData.lunarSurfaceStatus,surfaceReady:sky.material.uniforms.uMoonSurfaceReady.value,textureDimensions:[sky.material.uniforms.uMoonSurfaceMap.value.image.width,sky.material.uniforms.uMoonSurfaceMap.value.image.height]};
    });
    const accepted=candidate.results.find(r=>r.mode===mode && r.t===1);
    const m=accepted.moon;
    const clip={x:Math.max(0,Math.floor(m.left-50)),y:Math.max(0,Math.floor(m.top-50)),width:1,height:1};
    clip.width=Math.min(width-clip.x,Math.ceil(m.right+50-clip.x));
    clip.height=Math.min(height-clip.y,Math.ceil(m.bottom+50-clip.y));
    const cropPath=`${out}/${mode}-t1-moon-crop.png`;await page.screenshot({path:cropPath,clip});
    const before=PNG.sync.read(await readFile(accepted.cropPath)),after=PNG.sync.read(await readFile(cropPath));
    let changedChannels=0,maxChannelDelta=0;
    for(let i=0;i<before.data.length;i++){const d=Math.abs(before.data[i]-after.data[i]);if(d)changedChannels++;maxChannelDelta=Math.max(maxChannelDelta,d);}
    const checks={expectedBundle:state.scripts.some(s=>s.endsWith('/assets/main-D06KFf-n.js')),cameraIdentical:JSON.stringify(state.diagnostics.camera)===JSON.stringify(accepted.state.diagnostics.camera),moonIdentical:JSON.stringify(state.diagnostics.colosseumCelestial.moon)===JSON.stringify(accepted.state.diagnostics.colosseumCelestial.moon),surfaceReady:state.surfaceStatus==='ready'&&state.surfaceReady===1,imageHttp200:responses.some(r=>r.status===200),zeroErrors:errors.length===0,changedCropChannels:changedChannels,maxCropChannelDelta:maxChannelDelta};
    results.push({mode,width,height,t:1,path,cropPath,state,errors,responses,checks});
    console.log(JSON.stringify({mode,checks}));
    await page.close();
  }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({url,capturedAt:new Date().toISOString(),results},null,2));}
