import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/eiffel-campaigns-2026-09-07/web';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const records=[],interaction=[];
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.WF_REVIEW_URL||'http://127.0.0.1:5590/eiffel-crane.html'));
 await page.waitForSelector('body[data-ready="true"]');
 for(const [mode,t] of [['lift',0],['lift',.5],['luff',0],['luff',1],['climb',.12],['climb',.27],['climb',.32],['climb',1]]){
  await page.evaluate(([m,t])=>window.__GUYENET_REVIEW__.setState(m,t),[mode,t]);
  await page.screenshot({path:`${out}/${name}-${mode}-${t}.png`});
  records.push({name,mode,t,...await page.evaluate(()=>window.__GUYENET_REVIEW__.snapshot()),errors:[...errors]});
 }
 await page.getByRole('button',{name:'Hoist',exact:true}).click();
 await page.getByRole('button',{name:'Play mechanism',exact:true}).click();
 await page.waitForTimeout(1300);
 const playing=await page.evaluate(()=>window.__GUYENET_REVIEW__.snapshot());
 await page.getByRole('button',{name:'Pause mechanism',exact:true}).click();
 if(playing.progress<=.02)throw Error('Playback did not advance');
 await page.evaluate(()=>window.__GUYENET_REVIEW__.setState('climb',.27));
 const initial=await page.locator('canvas').evaluate(c=>c.toDataURL());
 await page.evaluate(()=>{window.__GUYENET_REVIEW__.setState('climb',.93);window.__GUYENET_REVIEW__.setState('climb',.27);});
 const reverseExact=initial===await page.locator('canvas').evaluate(c=>c.toDataURL());
 if(!reverseExact)throw Error('Reverse seek changed pixels');
 const bounds=await page.locator('canvas').boundingBox();
 await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.45);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.7+50,bounds.y+bounds.height*.45+20,{steps:8});await page.mouse.up();
 const orbitChanged=initial!==await page.locator('canvas').evaluate(c=>c.toDataURL());
 if(!orbitChanged)throw Error('Pointer orbit did not change frame');
 interaction.push({name,playbackProgress:playing.progress,reverseExact,orbitChanged,errors});
 await page.close();
}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({records,interaction},null,2));
if(records.some(r=>r.errors.length||r.framing.x>.98||r.framing.y>.98))process.exitCode=1;console.log(JSON.stringify({frames:records.length,errors:records.flatMap(r=>r.errors),maxTriangles:Math.max(...records.map(r=>r.triangles))}));
