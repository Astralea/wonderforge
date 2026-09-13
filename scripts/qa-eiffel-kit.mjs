#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const out=process.env.EIFFEL_KIT_QA_OUT || 'artifacts/eiffel-mechanics-2026-09-06/qa';
await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile('public/models/eiffel-construction-kit/tower-kit.manifest.json','utf8'));
const selected=manifest.parts.find(p=>p.sourceGroup==='shaft-00' && p.transportSize[2]>3 && p.boundsMax[1]-p.boundsMin[1]>3 && p.transportSize[0]<.8);
const browser=await chromium.launch({channel:'chromium'});
const report={captures:[],errors:[],comparison:null,selected:selected.id};
try {
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
  await page.route('**/kit-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Eiffel kit geometry inspection</title></head><body style="margin:0;overflow:hidden"></body></html>'}));
  await page.goto('http://127.0.0.1:5590/kit-review');
  for(const [mode,progress] of name==='desktop' ? [['compact',0],['expanded',0],['transport',0],['transport',.5],['transport',1]] : [['compact',0],['transport',0]]){
   const metrics=await page.evaluate(async({mode,id,progress})=>{
    const {mountKitReview}=await import('/scripts/eiffel-kit-review.ts');
    return mountKitReview(mode,id,progress);
   },{mode,id:selected.id,progress});
   const path=`${out}/${name}-${mode}-${progress}.png`;
   await page.screenshot({path});report.captures.push({name,mode,progress,path,metrics});
  }
  await context.close();
 }
 const a=PNG.sync.read(await readFile(`${out}/desktop-compact-0.png`));
 const b=PNG.sync.read(await readFile(`${out}/desktop-expanded-0.png`));
 let changed=0,total=0;
 for(let i=0;i<a.data.length;i+=4){let pixel=0;for(let c=0;c<3;c++){const d=Math.abs(a.data[i+c]-b.data[i+c]);pixel=Math.max(pixel,d);total+=d;}if(pixel>12)changed++;}
 report.comparison={changedPixelFraction:changed/(a.width*a.height),meanChannelError:total/(a.width*a.height*3)};
 if(report.comparison.changedPixelFraction>.02 || report.comparison.meanChannelError>1) throw new Error('Compaction changed visible geometry beyond tolerance');
 if(report.errors.length)throw new Error('Browser errors');
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report,null,2));
