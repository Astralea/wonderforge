// Photographic rebuild depth regression. The original motion-pass evidence is preserved.
import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const out=process.env.SYDNEY_QA_OUT??'artifacts/sydney-reference-rebuild-2026-09-23/depth-orbit';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:960,height:600}});
await page.goto('http://127.0.0.1:5590/');
await page.evaluate(async()=>{
 const [{WorldScene},{sydneyOperaHouse}]=await Promise.all([import('/src/render/three/WorldScene.ts'),import('/src/data/wonders/sydney-opera-house.ts')]);
 const canvas=document.createElement('canvas');canvas.id='probe';canvas.style='position:fixed;inset:0;z-index:99999';document.body.append(canvas);
 window.probe=new WorldScene(canvas,sydneyOperaHouse);window.probe.resize(960,600);await window.probe.ready;
});
const report=[];
await page.evaluate(()=>{for(let i=0;i<3;i++)window.probe.update(1,.52,.58);});
for(let i=0;i<31;i++) {
 const t=i/30, frames={};
 for(const near of [.5,20,100]) {
  const data=await page.evaluate(({t,near})=>{window.probe.update(1,1,.58);
  // A real continuous northern harbour orbit, clear of the close yard insert.
  // Keeping geometry and lighting fixed isolates depth precision from motion.
  const c=window.probe.pipeline.camera, az=-.25-t*2.1, pitch=24*Math.PI/180;
  c.position.set(Math.cos(az)*Math.cos(pitch)*540,25+Math.sin(pitch)*540,Math.sin(az)*Math.cos(pitch)*540);c.lookAt(0,25,0);
  window.probe.pipeline.camera.near=near;window.probe.pipeline.camera.updateProjectionMatrix();window.probe.pipeline.render(.58);return document.querySelector('#probe').toDataURL();},{t,near});
  const buffer=Buffer.from(data.split(',')[1],'base64');frames[near]=PNG.sync.read(buffer);
  if(i===14)await writeFile(`${out}/near-${near}.png`,buffer);
 }
 const ref=frames[100].data;
 for(const near of [.5,20]) {let changed=0,total=0,delta=0;const data=frames[near].data;for(let p=0;p<ref.length;p+=4){let d=0;for(let c=0;c<3;c++)d+=Math.abs(data[p+c]-ref[p+c]);delta+=d/3;if(d/3>12)changed++;total++;}report.push({t,near,changedPixels:changed,meanDelta:delta/total});}
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(report.reduce((a,r)=>{a[r.near]=(a[r.near]??0)+r.changedPixels;return a;},{}));
await browser.close();
