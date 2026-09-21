import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Run only after root confirms that the final source snapshot, generated
// manifest and production preview all refer to the accepted takes.
const root='artifacts/chapters-history-2026-09-21';
const out=`${root}/browser`;
await mkdir(out,{recursive:true});
const snapshotBytes=await readFile(`${root}/narration/source-snapshot.json`);
const manifestBytes=await readFile(`${root}/narration/manifest.json`);
const tracks=JSON.parse(snapshotBytes),manifest=JSON.parse(manifestBytes);
const sha=value=>createHash('sha256').update(value).digest('hex');
const result={startedAt:new Date().toISOString(),scope:'Actual HTMLMediaElement decode/play/ended and UI transport checks. Browser output muted; no auditory-quality assessment.',snapshotSha256:sha(snapshotBytes),manifestSha256:sha(manifestBytes),assets:[],runs:[]};
const failures=[];
const check=(ok,message)=>{if(!ok){failures.push(message);console.log(`FAIL ${message}`);}return ok;};
for(const track of tracks)for(const beat of track.beats){
 const matches=manifest.filter(c=>c.wonderId===track.wonderId&&c.captionId===beat.id);
 if(matches.length!==1)throw new Error(`Manifest binding count ${beat.id}: ${matches.length}`);
 const clip=matches[0];
 if(clip.captionText!==beat.text||clip.voiceId!==track.voice.voiceId)throw new Error(`Stale text/voice ${beat.id}`);
 if(clip.duration+.4>(beat.until-beat.from)*60+1e-9)throw new Error(`Duration contract ${beat.id}`);
}
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
try{
 for(const [mode,width,height]of [['desktop',1440,900],['mobile',390,844]]){
  for(const track of tracks){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const browserErrors=[],networkErrors=[];
   page.on('pageerror',e=>browserErrors.push(String(e)));
   page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text());});
   page.on('response',r=>{if(r.url().includes('/audio/narration/')&&r.status()>=400)networkErrors.push({url:r.url(),status:r.status()});});
   page.on('requestfailed',r=>{if(r.url().includes('/audio/narration/'))networkErrors.push({url:r.url(),failure:r.failure()});});
   await page.addInitScript(()=>{
    window.__narrationQA=[];window.__narrationElements=[];window.__narrationStage='initial';
    const originalPlay=HTMLMediaElement.prototype.play,originalPause=HTMLMediaElement.prototype.pause;
    const tracked=a=>a.src.includes('/audio/narration/');
    const record=(a,action,extra={})=>window.__narrationQA.push({action,stage:window.__narrationStage,src:a.src,path:new URL(a.src).pathname,filmT:Number(document.querySelector('[aria-label="Film position"]')?.value),mediaTime:a.currentTime,duration:a.duration,volume:a.volume,muted:a.muted,paused:a.paused,ended:a.ended,readyState:a.readyState,wallMs:performance.now(),...extra});
    HTMLMediaElement.prototype.play=function(){
     if(tracked(this)){
      if(!window.__narrationElements.includes(this)){
       window.__narrationElements.push(this);
       for(const action of ['loadedmetadata','loadeddata','playing','ended','error','seeking','seeked'])this.addEventListener(action,()=>record(this,action,{mediaError:this.error?.code??null}));
      }
      record(this,'play-call');
     }
     const p=originalPlay.call(this);
     if(tracked(this)&&p?.catch)p.catch(e=>record(this,'play-rejected',{name:e.name,message:e.message}));
     return p;
    };
    HTMLMediaElement.prototype.pause=function(){if(tracked(this))record(this,'pause-call');return originalPause.call(this);};
    window.__narrationStates=()=>window.__narrationElements.map(a=>({path:new URL(a.src).pathname,time:a.currentTime,duration:a.duration,paused:a.paused,ended:a.ended,volume:a.volume,muted:a.muted,error:a.error?.code??null}));
   });
   await page.goto(`http://127.0.0.1:5590/#/wonder/${track.wonderId}`,{waitUntil:'networkidle'});
   const slider=page.getByLabel('Film position');await slider.waitFor();await page.waitForTimeout(1100);
   const wake=()=>page.mouse.move(width/2,height-95);
   const pause=async()=>{await wake();const b=page.getByRole('button',{name:'Pause',exact:true});if(await b.count())await b.click();};
   const play=async()=>{await wake();await page.getByRole('button',{name:'Play',exact:true}).click();};
   const seek=async(t)=>{await slider.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},t);await page.waitForTimeout(100);};
   const stage=name=>page.evaluate(name=>{window.__narrationStage=name;},name);
   const state=()=>page.evaluate(()=>window.__narrationStates());
   const active=states=>states.filter(s=>!s.paused&&!s.ended&&s.volume>0&&!s.muted);
   await pause();await seek(0);
   const header=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {scripts:[...document.scripts].map(s=>s.src).filter(Boolean),gpu:gl.getParameter(e.UNMASKED_RENDERER_WEBGL)};});
   check(!!header.gpu&&!/swiftshader|software|llvmpipe/i.test(header.gpu),`${mode}/${track.wonderId}: physical GPU backend`);
   if(mode==='desktop'){
    const assets=await Promise.all(track.beats.map(async beat=>{
     const clip=manifest.find(c=>c.captionId===beat.id),response=await page.request.get(`http://127.0.0.1:5590${clip.src}`),body=await response.body();
     const entry={captionId:beat.id,src:clip.src,status:response.status(),bytes:body.length,sha256:sha(body),expectedSha256:clip.sha256,voice:track.voice.name};
     check(response.ok()&&entry.sha256===clip.sha256&&body.length===clip.bytes,`Served asset mismatch ${beat.id}`);return entry;
    }));result.assets.push(...assets);
   }
   await page.getByRole('button',{name:'Turn narration on',exact:true}).click();await page.waitForTimeout(180);
   const clips=[];
   for(const beat of track.beats){
    const clip=manifest.find(c=>c.captionId===beat.id),key=`natural:${beat.id}`;
    await pause();await stage(key);
    if(mode==='mobile')await page.getByRole('button',{name:'Chapters',exact:true}).click();
    await page.getByRole('button',{name:`Play from ${beat.kicker}`,exact:true}).click();
    const body=await page.getByTestId('live-caption').locator('p').last().textContent();
    check(body===beat.text,`${mode}/${beat.id}: actual caption text`);
    let waitError=null;
    try{await page.waitForFunction(({key,path})=>window.__narrationQA.some(e=>e.stage===key&&e.action==='ended'&&e.path===path),{key,path:clip.src},{timeout:Math.ceil((clip.duration+3)*1000)});}catch(e){waitError=String(e);check(false,`${mode}/${beat.id}: no natural ended event`);}
    await pause();
    const events=await page.evaluate(key=>window.__narrationQA.filter(e=>e.stage===key),key);
    const plays=events.filter(e=>e.action==='play-call'&&e.volume>0&&!e.muted);
    const ended=events.find(e=>e.action==='ended'&&e.path===clip.src);
    check(plays.some(e=>e.path===clip.src),`${mode}/${beat.id}: correct audible-volume play invocation`);
    check(!plays.some(e=>e.path!==clip.src),`${mode}/${beat.id}: no stale/other audible clip`);
    check(events.some(e=>e.action==='playing'&&e.path===clip.src),`${mode}/${beat.id}: browser playing event`);
    if(ended){
     check(ended.filmT<beat.until,`${mode}/${beat.id}: natural end before chapter end`);
     check(Math.abs(ended.duration-clip.duration)<.08,`${mode}/${beat.id}: decoded duration agrees`);
    }
    const entry={captionId:beat.id,voice:track.voice.name,src:clip.src,from:beat.from,until:beat.until,metadataDuration:clip.duration,ended:ended??null,remainingFilmSeconds:ended?(beat.until-ended.filmT)*60:null,waitError,events};clips.push(entry);
    console.log(JSON.stringify({mode,wonder:track.wonderId,captionId:beat.id,ended:!!ended,remainingFilmSeconds:entry.remainingFilmSeconds}));
   }
   // Exercise transport and on/off on each wonder in each viewport, including
   // an in-beat seek that must resume the matching asset at elapsed film time.
   const first=track.beats[0],second=track.beats[1],firstAsset=manifest.find(c=>c.captionId===first.id),secondAsset=manifest.find(c=>c.captionId===second.id);
   const controls={};await stage('controls');await seek(first.from+.012);await play();await page.waitForTimeout(350);
   controls.initial=await state();check(active(controls.initial).some(s=>s.path===firstAsset.src&&s.time>.5),`${mode}/${track.wonderId}: in-beat start seeks audio`);
   await pause();const pausedT=Number(await slider.inputValue());await page.waitForTimeout(300);controls.paused=await state();
   check(Math.abs(Number(await slider.inputValue())-pausedT)<1e-9,`${mode}/${track.wonderId}: film freezes on pause`);
   check(active(controls.paused).length===0,`${mode}/${track.wonderId}: narration pauses`);
   await play();await page.waitForTimeout(350);controls.resumed=await state();
   check(active(controls.resumed).some(s=>s.path===firstAsset.src&&s.time>.8),`${mode}/${track.wonderId}: resume preserves elapsed position`);
   await wake();await page.getByRole('button',{name:'Turn narration off',exact:true}).click();const offT=Number(await slider.inputValue());await page.waitForTimeout(300);controls.off=await state();
   check(active(controls.off).length===0&&Number(await slider.inputValue())>offT,`${mode}/${track.wonderId}: narration off stops voice while film runs`);
   await page.getByRole('button',{name:'Turn narration on',exact:true}).click();await page.waitForTimeout(220);controls.onAgain=await state();
   check(active(controls.onAgain).some(s=>s.path===firstAsset.src&&s.time>1),`${mode}/${track.wonderId}: narration on resumes active beat`);
   await seek(second.from+.012);await page.waitForTimeout(250);controls.seek=await state();
   check(active(controls.seek).length===1&&active(controls.seek)[0].path===secondAsset.src&&active(controls.seek)[0].time>.5,`${mode}/${track.wonderId}: forward seek replaces clip at elapsed time`);
   await seek(0);await page.waitForTimeout(200);controls.gap=await state();check(active(controls.gap).length===0,`${mode}/${track.wonderId}: seek outside chapters is silent`);
   await pause();await page.getByRole('button',{name:'Turn narration off',exact:true}).click();
   if(track.wonderId==='stonehenge'){
    const axis=track.beats.find(b=>b.id==='stonehenge-axis');await seek((axis.from+axis.until)/2);await page.waitForTimeout(220);await page.mouse.move(width-8,height-8);
    const caption=page.locator('[data-caption-id="stonehenge-axis"]');
    controls.axis={text:await caption.locator('p').last().textContent(),rect:await caption.boundingBox(),t:Number(await slider.inputValue())};
    check(controls.axis.text===axis.text,`${mode}/stonehenge-axis: shortened production caption`);
    await page.screenshot({path:`${out}/${mode}-stonehenge-axis.png`});
   }
   const events=await page.evaluate(()=>window.__narrationQA);
   const mediaErrors=events.filter(e=>e.action==='error'||e.action==='play-rejected');
   check(browserErrors.length===0,`${mode}/${track.wonderId}: browser errors absent`);
   check(networkErrors.length===0,`${mode}/${track.wonderId}: narration network errors absent`);
   check(mediaErrors.length===0,`${mode}/${track.wonderId}: media errors/rejected play absent`);
   result.runs.push({mode,width,height,wonderId:track.wonderId,voice:track.voice,header,clips,controls,browserErrors,networkErrors,mediaErrors,events});
   result.failures=failures;await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
   console.log(JSON.stringify({completed:mode+'/'+track.wonderId,failures:failures.length}));await page.close();
  }
 }
}finally{await browser.close();result.finishedAt=new Date().toISOString();result.failures=failures;await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));}
console.log(JSON.stringify({assetCount:result.assets.length,clipViewportRuns:result.runs.reduce((s,r)=>s+r.clips.length,0),failures}));
if(failures.length)process.exitCode=1;
