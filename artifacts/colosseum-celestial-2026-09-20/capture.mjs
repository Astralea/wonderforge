import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const stage=process.argv[2]||'dev',port=stage==='production'?5590:5589;
const out=`artifacts/colosseum-celestial-2026-09-20/${stage}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});const results=[];
try {
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const [label,t] of [['dawn',0],['sunrise',.06],['day',.48],['sunset',.702],['moon',.88],['moon-low',.93],['after-set',1]]) {
   await page.goto(`http://127.0.0.1:${port}/#/debug/wonder/colosseum/${t}`,{waitUntil:'networkidle'});
   await page.waitForTimeout(1100);
   const diagnostics=await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__);
   const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
   const assets=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).filter(x=>x.includes('/assets/main-')));
   await page.screenshot({path:`${out}/${mode}-${label}.png`});
   results.push({mode,label,t,diagnostics,gpu,assets,errors:[...errors]});
   console.log(JSON.stringify({mode,label,t,triangles:diagnostics?.renderer.triangles,errors}));
  }
  await page.close();
 }
 await writeFile(`${out}/captures.json`,JSON.stringify(results,null,2));
 if(results.some(x=>x.errors.length||!x.diagnostics?.colosseumCelestial||x.diagnostics.renderer.triangles>(x.mode==='mobile'?120000:180000)))process.exitCode=1;
} finally {await browser.close();}
