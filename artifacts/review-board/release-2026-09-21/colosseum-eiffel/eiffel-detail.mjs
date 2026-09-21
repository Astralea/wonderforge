import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/review-board/release-2026-09-21/colosseum-eiffel';
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const result={startedAt:new Date().toISOString(),scope:'Targeted actual UI seeks for visibility; separate from uninterrupted runs. Muted browser; no auditory-quality claim.',runs:[],failures:[]};
const check=(v,s)=>{if(!v)result.failures.push(s);};
try{for(const[mode,width,height]of[['desktop',1440,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.__detailAudio=[];window.__detailErrors=[];const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/audio/')&&!window.__detailAudio.includes(this))window.__detailAudio.push(this);const p=original.call(this);p?.catch(e=>window.__detailErrors.push(String(e)));return p;};});
 await page.goto('http://127.0.0.1:5590/#/wonder/eiffel-tower',{waitUntil:'networkidle'});await page.locator('canvas[data-assets="ready"]').waitFor({timeout:60000});await page.waitForTimeout(700);
 const slider=page.getByLabel('Film position');
 const wake=()=>page.mouse.move(width/2,height-100);
 const pause=async()=>{await wake();const b=page.getByRole('button',{name:'Pause',exact:true});if(await b.count())await b.click();};
 const play=async()=>{await wake();await page.getByRole('button',{name:'Play',exact:true}).click();};
 const seek=async(seconds)=>{await slider.evaluate((el,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(t));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},seconds/180);await page.waitForTimeout(150);};
 const state=()=>page.evaluate(()=>window.__detailAudio.map(a=>({src:a.src,time:a.currentTime,paused:a.paused,ended:a.ended,volume:a.volume,muted:a.muted})));
 const active=s=>s.filter(a=>a.src.includes('/narration/')&&!a.paused&&!a.ended&&a.volume>0);
 await pause();await seek(15.4);await play();await page.waitForTimeout(250);const controls={initial:await state()};
 check(active(controls.initial).some(a=>a.src.endsWith('eiffel-adam-lift-prepared.mp3')&&a.time>.3),`${mode} in-beat narration`);
 await pause();const pausedT=await slider.inputValue();await page.waitForTimeout(350);controls.paused=await state();check(active(controls.paused).length===0&&await slider.inputValue()===pausedT,`${mode} pause film and voice`);
 await play();await page.waitForTimeout(250);controls.resumed=await state();check(active(controls.resumed).some(a=>a.time>.6),`${mode} narration resume`);
 await page.getByRole('button',{name:'Turn narration off',exact:true}).click();const offT=Number(await slider.inputValue());await page.waitForTimeout(230);controls.off=await state();check(active(controls.off).length===0&&Number(await slider.inputValue())>offT,`${mode} narration off while film runs`);
 await page.getByRole('button',{name:'Turn narration on',exact:true}).click();await page.waitForTimeout(200);controls.onAgain=await state();check(active(controls.onAgain).some(a=>a.time>1),`${mode} narration on active beat`);
 await seek(34.7);await page.waitForTimeout(200);controls.forward=await state();check(active(controls.forward).length===1&&active(controls.forward)[0].src.endsWith('eiffel-adam-joint-prepared.mp3'),`${mode} seek replaces voice`);
 await seek(0);await page.waitForTimeout(150);controls.gap=await state();check(active(controls.gap).length===0,`${mode} gap voice silent`);
 await page.getByRole('button',{name:'Mute soundtrack',exact:true}).click();await page.waitForTimeout(150);controls.muted=await state();check(controls.muted.filter(a=>a.src.endsWith('/eiffel-tower-short.mp3')).every(a=>a.volume===0||a.muted||a.paused),`${mode} soundtrack mute`);
 await page.getByRole('button',{name:'Unmute soundtrack',exact:true}).click();await page.waitForTimeout(150);controls.unmuted=await state();check(controls.unmuted.some(a=>a.src.endsWith('/eiffel-tower-short.mp3')&&a.volume>0&&!a.paused),`${mode} soundtrack unmute`);
 await pause();await page.getByRole('button',{name:'Turn narration off',exact:true}).click();
 const directory=`${out}/${mode}/eiffel-tower/detail`;await mkdir(directory,{recursive:true});const frames=[];
 for(const seconds of[12,15,16,17,18,19,20,21,22,23,34,36,38,40,42,72,76,80]){
  await seek(seconds);await page.mouse.move(width-2,height-2);await page.waitForTimeout(100);const path=`${directory}/seek-${String(seconds).padStart(3,'0')}.png`;await page.screenshot({path});frames.push({seconds,t:Number(await slider.inputValue()),path});
 }
 const mediaErrors=await page.evaluate(()=>window.__detailErrors);check(errors.length===0,`${mode} no browser errors`);check(mediaErrors.length===0,`${mode} no rejected audio`);
 result.runs.push({mode,width,height,controls,frames,errors,mediaErrors});await context.close();console.log(JSON.stringify({mode,failures:result.failures}));
}}finally{await browser.close();result.finishedAt=new Date().toISOString();await writeFile(`${out}/eiffel-detail.json`,JSON.stringify(result,null,2));}
if(result.failures.length)process.exitCode=1;
