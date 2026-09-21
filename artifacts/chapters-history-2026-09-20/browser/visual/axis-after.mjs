import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/chapters-history-2026-09-20/browser/visual/after-axis';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});const results=[];
try{
for(const [width,height]of [[390,844],[320,844],[375,667]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:5590/#/wonder/stonehenge',{waitUntil:'networkidle'});const slider=page.getByLabel('Film position');await slider.waitFor();await page.waitForTimeout(1100);await page.mouse.move(width/2,height-90);
 const pause=page.getByRole('button',{name:'Pause',exact:true});if(await pause.count())await pause.click();
 for(const t of [.80,.855,.91]){
  await slider.evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},t);await page.waitForTimeout(400);
  const cap=page.locator('[data-caption-id="stonehenge-axis"]');await cap.waitFor({state:'visible'});
  const data=await page.evaluate(()=>{const c=document.querySelector('[data-caption-id="stonehenge-axis"]'),b=c.getBoundingClientRect(),s=getComputedStyle(c),canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {scripts:[...document.scripts].map(s=>s.src).filter(Boolean),gpu:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),rect:{x:b.x,y:b.y,width:b.width,height:b.height},cssTop:s.top,opacity:s.opacity,text:c.textContent,overflow:document.documentElement.scrollWidth>innerWidth};});
  const file=`${out}/${width}x${height}-${t}.png`;await page.screenshot({path:file});results.push({width,height,t,file,errors,...data});console.log(JSON.stringify({width,height,t,rect:data.rect,cssTop:data.cssTop,bundle:data.scripts}));
 }
 await page.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
}finally{await browser.close()}
