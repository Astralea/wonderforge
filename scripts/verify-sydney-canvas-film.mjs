// Direct canvas capture distinguishes WebGL output from browser compositor-video artifacts.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const preserve=process.env.SYDNEY_CAPTURE_PRESERVE==='1';
const out=process.env.SYDNEY_QA_OUT??'artifacts/sydney-reference-rebuild-2026-09-23/final/canvas-film';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const bundle=(await(await fetch('http://127.0.0.1:5591/')).text()).match(/src="([^"]+\.js)"/)?.[1];
await page.addInitScript(({preserve})=>{
 window.captureResizes=[];
 for(const axis of ['width','height']){const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,axis);Object.defineProperty(HTMLCanvasElement.prototype,axis,{...d,set(value){if(window.canvasRecorder?.state==='recording'&&this===document.querySelector('canvas'))window.captureResizes.push({axis,value,at:performance.now()});d.set.call(this,value);}});}
 if(preserve){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,(type==='webgl'||type==='webgl2')?{...options,preserveDrawingBuffer:true}:options);};}
},{preserve});
await page.goto('http://127.0.0.1:5591/#/debug/film/sydney-opera-house',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__THREE_GAME_DIAGNOSTICS__?.scene==='sydney-opera-house-reference');
await page.evaluate(()=>{
 const canvas=document.querySelector('canvas');window.lostContexts=0;canvas.addEventListener('webglcontextlost',()=>window.lostContexts++);
 window.videoChunks=[];window.canvasRecorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000});
 window.canvasRecorder.ondataavailable=e=>{if(e.data.size)window.videoChunks.push(e.data);};window.canvasRecorder.start(1000);
});
await page.keyboard.press('r');const seek=page.getByLabel('Film position',{exact:true}),started=Date.now(),samples=[];
while(Date.now()-started<70000){const t=Number(await seek.inputValue());samples.push({elapsed:(Date.now()-started)/1000,t});if(t>=1)break;await page.waitForTimeout(1000);}
if(samples.at(-1).t!==1)throw new Error('Canvas film did not finish');
const result=await page.evaluate(()=>new Promise(resolve=>{window.canvasRecorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve({video:reader.result,lostContexts:window.lostContexts,mimeType:window.canvasRecorder.mimeType,contextAttributes:document.querySelector('canvas').getContext('webgl2').getContextAttributes(),resizes:window.captureResizes});reader.readAsDataURL(new Blob(window.videoChunks,{type:window.canvasRecorder.mimeType}));};window.canvasRecorder.stop();}));
await writeFile(`${out}/sydney-canvas.webm`,Buffer.from(result.video.split(',')[1],'base64'));
await writeFile(`${out}/report.json`,JSON.stringify({bundle,samples,errors,lostContexts:result.lostContexts,mimeType:result.mimeType,contextAttributes:result.contextAttributes,resizes:result.resizes,captureContextOverride:preserve,source:'canvas.captureStream(30), production player at 1x',audibleListening:false},null,2));
await browser.close();if(errors.length||result.lostContexts)throw new Error('Canvas playback failed');console.log(JSON.stringify({bundle,samples:samples.length,elapsed:samples.at(-1).elapsed,errors,lostContexts:result.lostContexts}));
