import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const tracks=JSON.parse(await readFile('artifacts/chapters-history-2026-09-20/narration/source-snapshot.json','utf8'));
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const report=[];
try {
 for (const [mode,width,height] of [['desktop',1440,900],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});
  await page.addInitScript(()=>{
   window.__narrationQA=[];
   const originalPlay=HTMLMediaElement.prototype.play;
   const originalPause=HTMLMediaElement.prototype.pause;
   HTMLMediaElement.prototype.play=function(){
    if(this.src.includes('/audio/narration/')){
     window.__narrationQA.push({action:'play',src:this.src,t:this.currentTime,duration:this.duration});
     if(!this.dataset.qaBound){this.dataset.qaBound='1';for(const event of ['playing','ended','error'])this.addEventListener(event,()=>window.__narrationQA.push({action:event,src:this.src,t:this.currentTime,duration:this.duration,error:this.error?.code}));}
    }
    return originalPlay.call(this);
   };
   HTMLMediaElement.prototype.pause=function(){if(this.src.includes('/audio/narration/'))window.__narrationQA.push({action:'pause',src:this.src,t:this.currentTime});return originalPause.call(this);};
  });
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5590/#/wonder/pyramids-of-giza',{waitUntil:'networkidle'});
  const slider=page.getByLabel('Film position');await slider.waitFor();await page.waitForTimeout(1200);
  await page.mouse.move(width/2,height-100);
  if(await page.getByRole('button',{name:'Pause',exact:true}).count())await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('button',{name:'Turn narration on',exact:true}).click();
  for (const id of ['giza-roads','giza-ramps']){
   const beat=tracks[0].beats.find(b=>b.id===id);
   await slider.evaluate((el,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(t));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},beat.from);
   await page.getByRole('button',{name:'Play',exact:true}).click();
   await page.waitForTimeout(850);
   await page.mouse.move(width/2,height-100);
   await page.getByRole('button',{name:'Pause',exact:true}).click();
   const paused=Number(await slider.inputValue());await page.waitForTimeout(300);
   if(Number(await slider.inputValue())!==paused)throw new Error('pause did not freeze film');
   await page.getByRole('button',{name:'Play',exact:true}).click();
   await page.waitForTimeout(6200);await page.mouse.move(width/2,height-100);
   if(await page.getByRole('button',{name:'Pause',exact:true}).count())await page.getByRole('button',{name:'Pause',exact:true}).click();
  }
  const events=await page.evaluate(()=>window.__narrationQA);
  for(const id of ['giza-roads','giza-ramps']){
   if(!events.some(e=>e.src.includes(id)&&e.action==='playing'))throw new Error(`${id} never played`);
   if(!events.some(e=>e.src.includes(id)&&e.action==='ended'))throw new Error(`${id} was cut before ending`);
   if(!events.some(e=>e.src.includes(id)&&e.action==='play'&&e.t>.3))throw new Error(`${id} did not resume at elapsed time`);
  }
  if(errors.length||events.some(e=>e.action==='error'))throw new Error('audio/browser errors');
  report.push({mode,events,errors,scope:'Two generated clips; remaining17 blocked by ElevenLabs key quota. Browser decode/play/ended tested with muted output, no listening claim.'});
  await page.close();
 }
 await writeFile('artifacts/chapters-history-2026-09-20/browser/audio/report.json',JSON.stringify(report,null,2));
 console.log('Two generated clips decode, pause, resume and end naturally on desktop/mobile.');
} finally {await browser.close();}
