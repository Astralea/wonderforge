import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='artifacts/stonehenge-release-2026-09-21/social';
const args=process.argv.slice(2),dry=args.includes('--dry-run'),base=args.find(a=>/^https?:/.test(a));
if(!base)throw new Error('Provide verified base URL. Use --dry-run for the permitted short local method probe.');
if(!dry&&!args.includes('--deployed-ready'))throw new Error('Final recording requires root deployed-ready signal then explicit --deployed-ready.');
const out=`${root}/${dry?'dry-run':'originals-stream'}`;await mkdir(out,{recursive:true});
const shots=dry?[{id:'pyramids-of-giza',start:27,length:2,duration:60}]:[
{id:'pyramids-of-giza',start:27,length:5,duration:60},
{id:'eiffel-tower',start:18,length:5,duration:180},
{id:'colosseum',start:54,length:5,duration:60},
{id:'stonehenge',start:55,length:5,duration:60}];
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const report={startedAt:new Date().toISOString(),base,dry,width:1920,height:1080,targetFps:30,shots:[]};
try{for(const shot of shots){
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[],warnings=[],failed=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});
 await page.goto(`${base}/#/wonder/${shot.id}`,{waitUntil:'networkidle'});await page.locator('canvas[data-assets="ready"]').waitFor({timeout:120000});await page.waitForTimeout(900);
 await page.mouse.move(960,950);const pause=page.getByRole('button',{name:'Pause',exact:true});if(await pause.count())await pause.click();
 const voiceOff=page.getByRole('button',{name:'Turn narration off',exact:true});if(await voiceOff.count())await voiceOff.click();
 const mute=page.getByRole('button',{name:'Mute soundtrack',exact:true});if(await mute.count())await mute.click();
 const slider=page.getByLabel('Film position');await slider.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},shot.start/shot.duration);await page.waitForTimeout(250);
 const metadata=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {bundle:[...document.scripts].map(s=>s.src).filter(Boolean),width:c.width,height:c.height,gpu:gl.getParameter(e.UNMASKED_RENDERER_WEBGL),mimeSupported:['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4;codecs=avc1'].filter(m=>MediaRecorder.isTypeSupported(m))};});
 await page.evaluate(({length})=>{
  const c=document.querySelector('canvas'),stream=c.captureStream(30),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm;codecs=vp8';
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:24000000});
  const chunks=[];window.__social={recorder,stream,samples:[],start:performance.now(),mime};
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  window.__social.done=new Promise((resolve,reject)=>{recorder.onerror=reject;recorder.onstop=async()=>{const b=new Blob(chunks,{type:mime});const bytes=new Uint8Array(await b.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=65536)binary+=String.fromCharCode(...bytes.subarray(i,i+65536));window.__social.base64=btoa(binary);stream.getTracks().forEach(t=>t.stop());resolve({bytes:b.size,mime,wallMs:performance.now()-window.__social.start});};});
  // Start recording and user-interface playback within the same task.
  recorder.start(250);[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Play')?.click();
  const sample=()=>{window.__social.samples.push({wall:performance.now()-window.__social.start,t:Number(document.querySelector('[aria-label="Film position"]').value)});if(recorder.state==='recording')requestAnimationFrame(sample);};requestAnimationFrame(sample);
  setTimeout(()=>recorder.stop(),length*1000+200);
 },shot);
 const recording=await page.evaluate(()=>window.__social.done);
 const data=await page.evaluate(()=>({base64:window.__social.base64,samples:window.__social.samples,endT:Number(document.querySelector('[aria-label="Film position"]').value)}));
 const bytes=Buffer.from(data.base64,'base64'),file=`${out}/${shot.id}.webm`;await writeFile(file,bytes);await page.locator('canvas').screenshot({path:`${out}/${shot.id}-after.png`});
 const entry={...shot,...metadata,recording,actualStartT:data.samples[0]?.t,endT:data.endT,samples:data.samples,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),errors,warnings,failed};report.shots.push(entry);
 console.log(JSON.stringify({id:shot.id,file,width:metadata.width,height:metadata.height,recording,actualStartT:entry.actualStartT,endT:entry.endT,errors,failed}));await context.close();
}}finally{await browser.close();report.finishedAt=new Date().toISOString();await writeFile(`${out}/capture-report.json`,JSON.stringify(report,null,2));}
