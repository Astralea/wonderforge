import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const out = 'artifacts/chapters-history-2026-09-20/browser/visual';
const tracks = [
  {id:'pyramids-of-giza', beats:[['giza-khufu',.07,.19],['giza-roads',.215,.335],['giza-ramps',.36,.48],['giza-khafre',.545,.675],['giza-casing',.7,.82],['giza-menkaure',.845,.935]]},
  {id:'stonehenge', beats:[['stonehenge-earthwork',.07,.19],['stonehenge-sarsens',.215,.335],['stonehenge-pits',.36,.48],['stonehenge-lintels',.505,.625],['stonehenge-bluestones',.65,.77],['stonehenge-axis',.795,.915]]},
  {id:'colosseum', beats:[['colosseum-valley',.07,.18],['colosseum-stone',.2,.3],['colosseum-cranes',.32,.43],['colosseum-vaults',.465,.565],['colosseum-seating',.585,.685],['colosseum-titus',.71,.81],['colosseum-moonrise',.885,.965]]},
];
await mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:'chromium',args:['--mute-audio']});
const onlyMode=process.argv[2];
const results=onlyMode?JSON.parse(await readFile(`${out}/results.json`,'utf8')).filter(r=>r.mode!==onlyMode):[];
try {
 for(const [mode,width,height] of [['desktop',1440,900],['mobile',390,844]]) {
  if(onlyMode&&mode!==onlyMode)continue;
  for(const track of tracks) {
   const directory=`${out}/${mode}/${track.id}`; await mkdir(directory,{recursive:true});
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.goto(`http://127.0.0.1:5590/#/wonder/${track.id}`,{waitUntil:'networkidle'});
   const slider=page.getByLabel('Film position');await slider.waitFor();await page.waitForTimeout(1100);
   const wake=async()=>{await page.mouse.move(width/2,height-90);};
   const pause=async()=>{await wake();const p=page.getByRole('button',{name:'Pause',exact:true});if(await p.count())await p.click();};
   const seek=async(t)=>{
    await slider.evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},t);
    await page.waitForTimeout(220);
    const actual=Number(await slider.inputValue());if(Math.abs(actual-t)>.0015)throw new Error(`UI seek failed ${actual} vs ${t}`);
   };
   await pause();
   const canvas=await page.locator('canvas').elementHandle();
   const header=await page.evaluate(()=>{
    const c=document.querySelector('canvas'),gl=c?.getContext('webgl2')??c?.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    return {scripts:[...document.scripts].map(s=>s.src).filter(Boolean),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};
   });
   if(!header.gpu||/swiftshader|software|llvmpipe/i.test(header.gpu))throw new Error(`Real GPU unavailable: ${header.gpu}`);
   const nav=page.getByTestId('caption-beat-index');
   if(await nav.locator('button').count()!==track.beats.length)throw new Error(`Wrong production chapter count ${track.id}`);
   const shots=[];
   for(const [index,[id,from,until]] of track.beats.entries()) {
    await pause();
    if(mode==='mobile')await page.getByRole('button',{name:'Chapters',exact:true}).click();
    const item=nav.getByRole('button').nth(index);await item.scrollIntoViewIfNeeded();
    const menuLabel=await item.getAttribute('aria-label');
    const expectedBody=await page.locator(`[id="${await item.getAttribute('aria-describedby')}"]`).textContent();
    if(index===0||index===track.beats.length-1)await page.screenshot({path:`${directory}/menu-${index===0?'first':'last'}.png`});
    await item.click();
    const clickedT=Number(await slider.inputValue());
    if(clickedT<from-.002||clickedT>from+.04)throw new Error(`Chapter click wrong target: ${id} ${clickedT}`);
    if(mode==='mobile'&&await page.getByRole('button',{name:'Close chapters',exact:true}).count())throw new Error('Mobile menu failed to close on chapter selection');
    await pause();await seek((from+until)/2);await slider.focus();await page.mouse.move(width-10,height-10);await page.waitForTimeout(330);
    const caption=page.getByTestId('live-caption');await caption.waitFor({state:'visible'});
    const info=await caption.evaluate(el=>{
     const b=el.getBoundingClientRect(),s=getComputedStyle(el);const ps=[...el.querySelectorAll('p')].map(p=>{const r=p.getBoundingClientRect();return {text:p.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollWidth:p.scrollWidth,clientWidth:p.clientWidth,font:getComputedStyle(p).fontSize};});
     return {rect:{x:b.x,y:b.y,width:b.width,height:b.height},opacity:s.opacity,paragraphs:ps,inViewport:b.left>=0&&b.top>=0&&b.right<=innerWidth&&b.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,titleVisible:!!document.querySelector('[data-testid="cinematic-title-card"]')};
    });
    const active=await nav.locator('[aria-current="true"]').count();
    const body=info.paragraphs.at(-1)?.text;
    if(body!==expectedBody)throw new Error(`Wrong caption body ${id}`);
    if(!info.inViewport||info.overflow||Number(info.opacity)<.99||active!==1||info.titleVisible)errors.push(`Caption layout/state failure ${id}: ${JSON.stringify(info)}, active=${active}`);
    if(!await canvas.evaluate(el=>el.isConnected))errors.push(`Canvas replaced during ${id}`);
    const file=`${directory}/${id}.png`;await page.screenshot({path:file});
    shots.push({id,from,until,t:Number(await slider.inputValue()),menuLabel,clickedT,file,...info,active});
   }
   const boundaries=[];
   for(const t of [.04,.069,.071,track.beats.at(-1)[2]-.002,track.beats.at(-1)[2]+.002,.99]) {
    await seek(t);await page.waitForTimeout(160);
    boundaries.push({t,title:await page.getByTestId('cinematic-title-card').count(),quote:await page.locator('blockquote').count(),caption:await page.getByTestId('live-caption').count()});
    if(t===.04||t===.99)await page.screenshot({path:`${directory}/${t===.04?'opening-title':'closing-quote'}.png`});
   }
   const result={mode,width,height,wonder:track.id,header,errors,shots,boundaries};results.push(result);
   await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
   console.log(JSON.stringify({mode,wonder:track.id,gpu:header.gpu,chapters:shots.length,errors,boundaries}));
   await page.close();
  }
 }
} finally {await browser.close();}
