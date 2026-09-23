// Causal bloom A/B of the real Sydney renderer at the bright-roof orbit angle.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const out='artifacts/sydney-reference-rebuild-2026-09-23/bloom-ab';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5590/');
await page.evaluate(async()=>{
 const [{WorldScene},{sydneyOperaHouse}]=await Promise.all([import('/src/render/three/WorldScene.ts'),import('/src/data/wonders/sydney-opera-house.ts')]);
 const canvas=document.createElement('canvas');canvas.id='rays';canvas.style='position:fixed;inset:0;z-index:99999';document.body.append(canvas);
 window.rays=new WorldScene(canvas,sydneyOperaHouse);window.rays.resize(1440,900);await window.rays.ready;
});
const rows=[];
for(const t of [.5,.58,.625,.7])for(const enabled of [true,false]){
 const data=await page.evaluate(({t,enabled})=>{window.rays.update(t,t,t);window.rays.pipeline.setBloomStrength(enabled?.32:.06);window.rays.pipeline.render(t);return document.querySelector('#rays').toDataURL();},{t,enabled});
 const b=Buffer.from(data.split(',')[1],'base64');await writeFile(`${out}/${t}-${enabled?'before':'after'}.png`,b);
 const p=PNG.sync.read(b);let bright=0;for(let i=0;i<p.data.length;i+=4)if(Math.min(p.data[i],p.data[i+1],p.data[i+2])>230)bright++;
 rows.push({t,enabled,brightPixels:bright});
}
await browser.close();await writeFile(`${out}/report.json`,JSON.stringify({viewport:[1440,900],rows,errors},null,2));
if(errors.length)throw new Error(errors.join('; '));console.log(JSON.stringify(rows));
