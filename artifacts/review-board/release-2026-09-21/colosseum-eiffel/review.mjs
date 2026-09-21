import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

const out='artifacts/review-board/release-2026-09-21/colosseum-eiffel';await mkdir(out,{recursive:true});
const compiled=await build({stdin:{contents:`export {eiffelChapterCaptionsForEdit} from './src/ui/eiffelChapterCaptions';export {EIFFEL_STORY_NARRATION} from './src/data/narration';export {trackFor} from './src/data/soundtrack';export {EIFFEL_CINEMATIC_DURATION} from './src/engine/eiffelFilmEdit';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const source=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const expected={duration:source.EIFFEL_CINEMATIC_DURATION,cues:source.eiffelChapterCaptionsForEdit('cinematic'),narration:source.EIFFEL_STORY_NARRATION,soundtrack:source.trackFor('eiffel-tower','cinematic','cinematic')};
await writeFile(`${out}/eiffel-source.json`,JSON.stringify(expected,null,2));
const onlyMode=process.argv[2],onlyWonder=process.argv[3];
const result={startedAt:new Date().toISOString(),scope:'Full1x films, motion/shot sequence evidence, media event checks; shared GPU, no performance or auditory-quality claim.',runs:[]};
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
try{
for(const[mode,width,height]of [['desktop',1440,900],['mobile',390,844]]){
 if(onlyMode&&mode!==onlyMode)continue;
 for(const[id,duration,step]of [['colosseum',60,2],['eiffel-tower',expected.duration,4]]){
  if(onlyWonder&&id!==onlyWonder)continue;
  const directory=`${out}/${mode}/${id}`;await mkdir(directory,{recursive:true});
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:`${directory}/video`,size:{width,height}}});
  const page=await context.newPage(),errors=[],warnings=[],failedRequests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push({text:m.text(),url:m.location().url});if(m.type()==='warning')warnings.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()})});
  await page.addInitScript(()=>{
   window.__releaseMedia=[];window.__releaseAudio=[];const play=HTMLMediaElement.prototype.play;
   const record=(a,action)=>window.__releaseMedia.push({action,src:a.src,filmT:Number(document.querySelector('[aria-label="Film position"]')?.value),time:a.currentTime,duration:a.duration,volume:a.volume,muted:a.muted,paused:a.paused,error:a.error?.code??null,wall:performance.now()});
   HTMLMediaElement.prototype.play=function(){
    if(this.src.includes('/audio/')){if(!window.__releaseAudio.includes(this)){window.__releaseAudio.push(this);for(const event of ['playing','ended','error'])this.addEventListener(event,()=>record(this,event));}record(this,'play');}
    return play.call(this);
   };
  });
  await page.goto(`http://127.0.0.1:5590/#/wonder/${id}`,{waitUntil:'networkidle'});
  await page.locator('canvas[data-assets="ready"]').waitFor({timeout:60000});
  const slider=page.getByLabel('Film position');await slider.waitFor();await page.waitForTimeout(950);
  const wake=()=>page.mouse.move(width/2,height-95);
  const pause=async()=>{await wake();const b=page.getByRole('button',{name:'Pause',exact:true});if(await b.count())await b.click();};
  const seek=async(t)=>{await slider.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},t);await page.waitForTimeout(250);};
  await pause();await seek(0);
  const header=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {scripts:[...document.scripts].map(s=>s.src).filter(Boolean),gpu:gl.getParameter(e.UNMASKED_RENDERER_WEBGL),text:document.body.innerText};});
  const canvas=await page.locator('canvas').elementHandle();
  await page.getByRole('button',{name:'Play',exact:true}).click();await page.mouse.move(width-2,height-2);
  const startWall=Date.now(),samples=[],frames=[];let nextFrame=0,lastT=-1;
  console.log(JSON.stringify({start:mode+'/'+id,duration,bundle:header.scripts,gpu:header.gpu}));
  while(Date.now()-startWall<(duration*1.7+20)*1000){
   const t=Number(await slider.inputValue());
   if(t<lastT-.002)throw new Error(`Non-monotone full playback ${mode}/${id}`);lastT=t;
   const seconds=t*duration;
   const diagnostics=await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__);
   samples.push({t,seconds,wallMs:Date.now()-startWall,camera:diagnostics?.camera,renderer:diagnostics?.renderer,celestial:diagnostics?.colosseumCelestial});
   if(seconds>=nextFrame||t>=.999){
    const file=`${directory}/frame-${String(Math.round(seconds*100)).padStart(5,'0')}.png`;await page.screenshot({path:file});frames.push({t,seconds,file});nextFrame+=step;
    if(Math.floor(seconds/20)!==Math.floor(Math.max(0,seconds-step)/20)||t>=.999)console.log(JSON.stringify({progress:mode+'/'+id,seconds}));
   }
   if(t>=.999)break;
   await page.waitForTimeout(220);
  }
  const endT=Number(await slider.inputValue());
  if(endT<.999)throw new Error(`Full playback failed to reach end ${mode}/${id}`);
  await page.waitForTimeout(180);await page.screenshot({path:`${directory}/ending.png`});
  const fullMedia=await page.evaluate(()=>window.__releaseMedia);
  const fullAudio=await page.evaluate(()=>window.__releaseAudio.map(a=>({src:a.src,time:a.currentTime,duration:a.duration,paused:a.paused,ended:a.ended,error:a.error?.code??null})));
  const controls={replayPresent:await page.getByRole('button',{name:'Replay film',exact:true}).count()===1,sameCanvas:await canvas.evaluate(el=>el.isConnected)};
  await page.getByRole('button',{name:'Replay film',exact:true}).click();await page.waitForTimeout(450);controls.replayT=Number(await slider.inputValue());await pause();
  if(id==='eiffel-tower'){
   await seek(36/duration);await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(500);await pause();
   controls.alignmentCaption=await page.getByTestId('eiffel-chapter-caption').textContent();
   await page.screenshot({path:`${directory}/alignment-controls.png`});
   await seek(12/duration);controls.reverseT=Number(await slider.inputValue());controls.reversePaused=await page.getByRole('button',{name:'Play',exact:true}).count()===1;
   if(mode==='mobile')await page.getByRole('button',{name:'Chapters',exact:true}).click();
   const nav=page.getByTestId('caption-beat-index');controls.chapterCount=await nav.locator('button').count();await nav.locator('button').last().scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/chapter-menu.png`});
   await nav.locator('button').last().click();await page.waitForTimeout(150);await pause();controls.lastChapterT=Number(await slider.inputValue());
  }
  await page.getByRole('button',{name:'WonderForge, back to films'}).click();await page.waitForTimeout(400);
  controls.home=await page.evaluate(()=>({hash:location.hash,loader:!!document.querySelector('.eiffel-arrival'),overflow:document.documentElement.scrollWidth>innerWidth}));
  const video=page.video();await context.close();const videoPath=await video.path();
  const entry={mode,width,height,wonder:id,duration,header,elapsedWallMs:Date.now()-startWall,endT,frames,samples,fullMedia,fullAudio,controls,errors,warnings,failedRequests,videoPath};
  result.runs.push(entry);await writeFile(`${out}/results${onlyMode?'-'+onlyMode:''}${onlyWonder?'-'+onlyWonder:''}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({done:mode+'/'+id,frames:frames.length,errors,warnings: warnings.length,controls}));
 }
}
}finally{await browser.close();result.finishedAt=new Date().toISOString();await writeFile(`${out}/results${onlyMode?'-'+onlyMode:''}${onlyWonder?'-'+onlyWonder:''}.json`,JSON.stringify(result,null,2));}
