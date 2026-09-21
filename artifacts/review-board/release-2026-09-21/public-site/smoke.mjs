import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const out='artifacts/review-board/release-2026-09-21/public-site';
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const narrowOnly=process.argv.includes('--narrow');
const reportName=narrowOnly?'narrow-final':'smoke-final';
const result={live:{},local:[],failures:[]};
const check=(ok,message)=>{if(!ok)result.failures.push(message);};
try {
 if(!narrowOnly){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('https://wonderforge.pages.dev/',{waitUntil:'networkidle',timeout:45000});
 await page.getByRole('button',{name:'Choose a site',exact:true}).waitFor();
 await page.waitForTimeout(1000);
 await page.screenshot({path:`${out}/live-home.png`});
 await page.getByRole('button',{name:'Choose a site',exact:true}).click();
 await page.waitForTimeout(400);
 result.live={url:page.url(),scripts:await page.locator('script[src]').evaluateAll(els=>els.map(e=>e.src)),ready:await page.locator('[aria-labelledby="catalog-ready"] li').allTextContents(),inProduction:await page.locator('[aria-labelledby="catalog-in-progress"] li').allTextContents(),errors};
 await page.screenshot({path:`${out}/live-gallery.png`});
 check(result.live.ready.length===4,'Live ready catalog must contain4 films');
 await page.close();
 }
 for(const [mode,width,height] of (narrowOnly?[['narrow',320,844]]:[['desktop',1440,900],['portrait',390,844],['narrow',320,844]])) {
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.addInitScript(()=>{window.__homeLoaders=[];new MutationObserver(()=>{if(location.hash===''||location.hash==='#/'||location.hash==='#')for(const e of document.querySelectorAll('[data-testid="wonder-arrival"],[data-testid="eiffel-arrival"]'))window.__homeLoaders.push(e.outerHTML.slice(0,150));}).observe(document,{subtree:true,childList:true});});
  await p.goto('http://127.0.0.1:5590/',{waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Choose a site',exact:true}).click();
  const homeLoaders=await p.evaluate(()=>window.__homeLoaders);
  check(homeLoaders.length===0,`${mode}: home loader appears`);
  const ready=await p.locator('[aria-labelledby="catalog-ready"] button').allTextContents();
  check(ready.length===4,`${mode}: four playable films`);
  const scenes=[];
  for(const id of ['pyramids-of-giza','stonehenge','colosseum','eiffel-tower']) {
   await p.goto(`http://127.0.0.1:5590/#/wonder/${id}`,{waitUntil:'networkidle'});
   await p.locator('canvas[data-assets="ready"]').waitFor({timeout:45000});
   await p.waitForTimeout(950);
   const slider=p.getByLabel('Film position');await slider.waitFor();
   const initial=await slider.inputValue();await p.waitForTimeout(800);const after=await slider.inputValue();
   check(initial===after,`${mode}/${id}: reduced-motion autoplay`);
   await slider.evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'.5');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
   await p.waitForTimeout(200);
   const box=await p.getByRole('group',{name:'Cinematic controls',exact:true}).boundingBox();
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   check(box&&box.x>=-1&&box.x+box.width<=width+1,`${mode}/${id}: controls overflow`);
   check(!overflow,`${mode}/${id}: page overflows`);
   const text=await p.getByRole('group',{name:'Cinematic controls',exact:true}).innerText();
   scenes.push({id,initial,after,seek:await slider.inputValue(),box,overflow,text,canvasReady:await p.locator('canvas').getAttribute('data-assets')});
   if(mode==='narrow')await p.screenshot({path:`${out}/${reportName}-${id}.png`});
   await p.getByRole('button',{name:'About this wonder',exact:true}).click();
   const close=p.getByRole('button',{name:'Close information panel',exact:true});
   check(await close.isVisible(),`${mode}/${id}: information panel missing`);
   await close.click();
   check(await close.count()===0,`${mode}/${id}: information close button fails`);
   check(await slider.count()===1,`${mode}/${id}: closing information exits film`);
  }
  result.local.push({mode,width,height,reducedMotion:true,homeLoaders,ready,scenes,errors:errs});
  check(errs.length===0,`${mode}: browser errors`);
  await p.close();
 }
} finally {await browser.close();await writeFile(`${out}/${reportName}-results.json`,JSON.stringify(result,null,2));}
console.log(JSON.stringify({liveReady:result.live.ready?.length,localViewports:result.local.length,failures:result.failures}));
if(result.failures.length)process.exitCode=1;
