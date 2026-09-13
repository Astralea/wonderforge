import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out=process.env.EIFFEL_QA_OUT||'artifacts/paris-1889-2026-09-07/qa-mobile-sweep';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});const samples=[];const errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1.35,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://127.0.0.1:5589/#/wonder/eiffel-tower',{waitUntil:'networkidle'});
 await page.waitForSelector('canvas[data-assets="ready"]');
 await page.touchscreen.tap(195,420);
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 const slider=page.locator('input[aria-label="Seek"]');
 const seek=async t=>{
  await slider.evaluate((input,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(t));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},t);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
 };
 for(let i=0;i<=100;i++){await seek(i/100);samples.push({t:i/100,...await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__.renderer)});}
 const maxTriangles=samples.reduce((a,b)=>a.triangles>b.triangles?a:b);const maxCalls=samples.reduce((a,b)=>a.calls>b.calls?a:b);
 await seek(maxTriangles.t);await page.screenshot({path:`${out}/peak-triangles.png`});
 const report={samples,maxTriangles,maxCalls,errors};await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({maxTriangles,maxCalls,errors}));
 if(errors.length||maxTriangles.triangles>300000||maxCalls.calls>150)throw new Error('Mobile budget or browser error gate failed');
}finally{await browser.close();}
