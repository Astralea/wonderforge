import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const results=[];
try{
for(const [mode,width,height] of [['desktop',1280,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5589/artifacts/voice-review-2026-09-21/index.html',{waitUntil:'networkidle'});
 const all=page.locator('audio');if(await all.count()!==9)throw new Error('Missing comparison audio');
 // Expand the baseline demo so every native player is reachable.
 await page.getByText('George’s official demo and voice ID',{exact:true}).click();
 const samples=[];
 for(let i=0;i<9;i++){
  const el=all.nth(i);await el.scrollIntoViewIfNeeded();const box=await el.boundingBox();
  await page.mouse.click(box.x+20,box.y+box.height/2);
  await page.waitForTimeout(400);
  const state=await el.evaluate(a=>({label:a.getAttribute('aria-label'),duration:a.duration,currentTime:a.currentTime,paused:a.paused,readyState:a.readyState,error:a.error?.code}));
  if(state.error||!Number.isFinite(state.duration)||state.duration<=0||state.paused||state.currentTime<=0)throw new Error(JSON.stringify(state));
  const playing=await all.evaluateAll(list=>list.filter(a=>!a.paused).length);
  if(playing!==1)throw new Error('Audio overlap');samples.push(state);
 }
 await all.evaluateAll(list=>list.forEach(a=>a.pause()));
 await page.evaluate(()=>scrollTo(0,0));
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(overflow||errors.length)throw new Error(JSON.stringify({overflow,errors}));
 await page.screenshot({path:`artifacts/voice-review-2026-09-21/${mode}.png`,fullPage:true});
 results.push({mode,samples,overflow,errors});await page.close();
}
await writeFile('artifacts/voice-review-2026-09-21/browser-check.json',JSON.stringify(results,null,2));console.log('All nine audio players decode and play; exclusive playback, desktop/mobile layout pass.');
}finally{await browser.close();}
