// Audit the built player's framebuffer immediately after its real RAF render.
// Browser video/captureStream can sample at a different presentation boundary.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out=process.env.SYDNEY_QA_OUT??'artifacts/sydney-reference-rebuild-2026-09-23/final/rendered-film';
await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.exposeFunction('saveSydneyFrame',async(index,data)=>writeFile(`${out}/frames/${String(index).padStart(5,'0')}.jpg`,Buffer.from(data.split(',')[1],'base64')));
await page.addInitScript(()=>{
 window.audit={active:false,rendered:0,black:[],frames:[],pending:[],captureErrors:[],nonDefaultFramebuffer:0};
 const raf=window.requestAnimationFrame.bind(window);let lastDiag,lastCapture=-1;const pixel=new Uint8Array(4*4*4);
 window.requestAnimationFrame=callback=>raf(now=>{
  callback(now);const d=window.__THREE_GAME_DIAGNOSTICS__,a=window.audit;
  if(!a.active||!d||d===lastDiag||d.scene!=='sydney-opera-house-reference')return;lastDiag=d;
  const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),t=Number(document.querySelector('input[aria-label="Film position"]').value);
  if(gl.getParameter(gl.FRAMEBUFFER_BINDING)!==null)a.nonDefaultFramebuffer++;
  let max=0;
  // A dark window or shadow is not a black frame: test a 5x5 viewport grid.
  for(const x of [.1,.3,.5,.7,.9])for(const y of [.1,.3,.5,.7,.9]){
   gl.readPixels(Math.floor(canvas.width*x),Math.floor(canvas.height*y),4,4,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   for(let i=0;i<pixel.length;i++)if(i%4!==3)max=Math.max(max,pixel[i]);
  }
  a.rendered++;if(max<=3)a.black.push({t,now,max});
  if(t-lastCapture>=1/720||t===1){
   lastCapture=t;const index=a.frames.length;a.frames.push({index,t,now});
   a.pending.push(window.saveSydneyFrame(index,canvas.toDataURL('image/jpeg',.84)).catch(e=>a.captureErrors.push(String(e))));
  }
 });
});
const bundle=(await(await fetch('http://127.0.0.1:5591/')).text()).match(/src="([^"]+\.js)"/)?.[1];
await page.goto('http://127.0.0.1:5591/#/debug/film/sydney-opera-house',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__THREE_GAME_DIAGNOSTICS__?.scene==='sydney-opera-house-reference');
await page.keyboard.press('r');await page.evaluate(()=>{window.audit.active=true;});
const start=Date.now(),seek=page.getByLabel('Film position',{exact:true});
while(Number(await seek.inputValue())<1){if(Date.now()-start>75000)throw new Error('Rendered film stalled');await page.waitForTimeout(500);}
const audit=await page.evaluate(async()=>{window.audit.active=false;await Promise.all(window.audit.pending);const {pending,...result}=window.audit;return result;});
await writeFile(`${out}/report.json`,JSON.stringify({bundle,elapsed:(Date.now()-start)/1000,errors,...audit,source:'Production player 1x; framebuffer read immediately after the real RAF/composer; no context overrides'},null,2));
const lines=[];for(let i=0;i<audit.frames.length;i++){const f=audit.frames[i];lines.push(`file 'frames/${String(f.index).padStart(5,'0')}.jpg'`);lines.push(`duration ${Math.max(1/120,((audit.frames[i+1]?.t??1+1/720)-f.t)*60)}`);}
await writeFile(`${out}/frames.ffconcat`,lines.join('\n')+'\n');
await browser.close();console.log(JSON.stringify({bundle,rendered:audit.rendered,black:audit.black.length,frames:audit.frames.length,errors,nonDefaultFramebuffer:audit.nonDefaultFramebuffer}));
if(audit.black.length||errors.length||audit.captureErrors.length||audit.nonDefaultFramebuffer)throw new Error('Rendered frame audit failed');
