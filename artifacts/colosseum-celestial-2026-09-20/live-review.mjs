import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const results=[];
try{
for(const [mode,width,height] of [['desktop',1280,720],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}); const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5590/#/wonder/colosseum',{waitUntil:'networkidle'});
 const slider=page.getByLabel('Film position');await slider.waitFor();
 await page.waitForTimeout(1300);await page.mouse.move(width/2,height-80);
 const pause=page.getByRole('button',{name:'Pause',exact:true});if(await pause.count())await pause.click();
 const canvas=await page.locator('canvas').elementHandle();const shots=[];
 for(const t of [.06,.48,.702,.88,.93,.48,.88,1]){
  await slider.evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},t);
  await page.waitForTimeout(250);
  const value=Number(await slider.inputValue());if(Math.abs(value-t)>.002)throw new Error('seek failed');
  if(!await canvas.evaluate(el=>el.isConnected))throw new Error('canvas replaced during seek');
  shots.push({t,diagnostics:await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__)});
  if(t===.88||t===.93)await page.screenshot({path:`artifacts/colosseum-celestial-2026-09-20/production/${mode}-ui-${t}.png`});
 }
 // Play the last quarter continuously as well as deterministic seeking.
 await slider.evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'0.76');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForTimeout(180);
 await page.getByRole('button',{name:'Play',exact:true}).click();
 const continuous = []; const deadline = Date.now() + 19000;
 while(Date.now() < deadline){
  const t = Number(await slider.inputValue());
  const diagnostics = await page.evaluate(()=>window.__THREE_GAME_DIAGNOSTICS__);
  const renderer = diagnostics?.renderer;
  continuous.push({t,renderer,celestial:diagnostics?.colosseumCelestial});
  if(renderer?.triangles > (mode==='mobile'?120000:180000))throw new Error(`Geometry budget exceeded during playback ${mode} ${t}: ${renderer.triangles}`);
  if(t>=.999)break;
  await page.waitForTimeout(250);
 }
 if(Number(await slider.inputValue())<.999)throw new Error('Continuous closing playback did not finish');
 if(!await canvas.evaluate(el=>el.isConnected))throw new Error('Canvas replaced during closing playback');
 await page.screenshot({path:`artifacts/colosseum-celestial-2026-09-20/${mode}-live-ending.png`});
 const replay=page.getByRole('button',{name:'Replay film',exact:true});await replay.click();await page.waitForTimeout(300);
 const replayValue=Number(await slider.inputValue());if(replayValue>=.1)throw new Error('replay did not restart');
 await page.getByRole('button',{name:'WonderForge, back to films'}).click();
 await page.waitForTimeout(400);
 const home=await page.evaluate(()=>({hash:location.hash,overflow:document.documentElement.scrollWidth>innerWidth,loader:!!document.querySelector('.eiffel-arrival')}));
 if(home.loader)throw new Error('homepage loader appeared');
 if(home.hash.includes('/wonder/'))throw new Error('home return failed');
 if(errors.length)throw new Error(errors.join('\n'));
 await page.screenshot({path:`artifacts/colosseum-celestial-2026-09-20/${mode}-live-return.png`});
 results.push({mode,errors,shots,continuous,replayValue,home});await page.close();
}
await writeFile('artifacts/colosseum-celestial-2026-09-20/production/live-review.json',JSON.stringify(results,null,2));
console.log('Desktop/mobile seek, reverse seek, replay, return and error checks passed.');
}finally{await browser.close();}
