import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'artifacts/colosseum-moon-surface-2026-09-21/visual/runtime';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'chromium',args:['--mute-audio']});
const evidence = { sun:[], checks:[] };
try {
  for (const [label, origin] of [['before-public','https://wonderforge.pages.dev'],['candidate','http://127.0.0.1:5590']]) {
    const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    for (const t of [.02,.4]) {
      await page.goto(`${origin}/#/debug/wonder/colosseum/${t}`,{waitUntil:'networkidle'});
      await page.waitForFunction(()=>window.__THREE_GAME_DIAGNOSTICS__?.scene==='colosseum-reference');
      await page.waitForTimeout(600);
      const path=`${out}/${label}-sun-t${t}.png`; await page.screenshot({path});
      evidence.sun.push({label,t,path,state:await page.evaluate(()=>({diagnostics:window.__THREE_GAME_DIAGNOSTICS__,scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}))});
    }
    await page.close();
  }
  for (const [mode,width,height] of [['desktop',1440,900],['portrait',390,844]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[],responses=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.url().includes('lroc-color-poles')) responses.push({url:r.url(),status:r.status(),headers:r.headers()});});
    await page.addInitScript(()=>{
      window.__QA_SCENES__=[];
      window.__THREE_DEVTOOLS__={dispatchEvent(e){if(e.type==='observe' && e.detail.isScene)window.__QA_SCENES__.push(e.detail);}};
    });
    await page.goto('http://127.0.0.1:5590/#/wonder/colosseum',{waitUntil:'networkidle'});
    const slider=page.getByLabel('Film position'); await slider.waitFor();
    await page.waitForFunction(()=>window.__QA_SCENES__.some(s=>s.getObjectByName('colosseum-world-space-weather-sky')?.userData.lunarSurfaceStatus==='ready'));
    await page.mouse.move(width/2,height-95);
    if(await page.getByRole('button',{name:'Pause',exact:true}).count())await page.getByRole('button',{name:'Pause',exact:true}).click();
    const seek=async t=>{await slider.evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},t);await page.waitForTimeout(200);};
    const state=()=>page.evaluate(()=>{
      const mesh=window.__QA_SCENES__.map(s=>s.getObjectByName('colosseum-world-space-weather-sky')).find(Boolean);
      const uniforms=mesh.material.uniforms;
      return {diagnostics:window.__THREE_GAME_DIAGNOSTICS__,surfaceStatus:mesh.userData.lunarSurfaceStatus,surfaceReady:uniforms.uMoonSurfaceReady.value,textureWidth:uniforms.uMoonSurfaceMap.value.image?.width,textureHeight:uniforms.uMoonSurfaceMap.value.image?.height};
    });
    await seek(.9);const first=await state();
    await seek(1);await seek(.9);const reverse=await state();
    await seek(.4);const day=await state();
    await seek(.86);
    await page.getByRole('button',{name:'Play',exact:true}).click();
    const playback=[];
    for(let i=0;i<44;i++){
      await page.waitForTimeout(250); const s=await state();
      playback.push({t:s.diagnostics.colosseumCelestial.t,moon:s.diagnostics.colosseumCelestial.moon,surfaceStatus:s.surfaceStatus});
      if(s.diagnostics.colosseumCelestial.t===1)break;
    }
    await page.screenshot({path:`${out}/${mode}-playback-end.png`});
    if(mode==='portrait'){
      const buttons=await page.getByRole('button').allTextContents();
      evidence.infoButtons=buttons;
      await page.mouse.move(width/2,height-95);
      const info=page.getByRole('button',{name:/information|info|about/i}).first();
      if(await info.count()){
        await info.click();await page.waitForTimeout(300);
        await page.screenshot({path:`${out}/portrait-info.png`});
        evidence.info=await page.evaluate(()=>({text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth}));
      }
    }
    evidence.checks.push({mode,first,reverse,reverseExact:JSON.stringify(first)===JSON.stringify(reverse),day,playback,errors,responses});
    console.log(JSON.stringify({mode,reverseExact:JSON.stringify(first)===JSON.stringify(reverse),playbackEnd:playback.at(-1)?.t,surface:first.surfaceStatus,errors,responses}));
    await page.close();
  }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(evidence,null,2));}
