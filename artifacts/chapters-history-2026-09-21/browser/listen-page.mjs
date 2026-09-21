import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root='artifacts/chapters-history-2026-09-21',out=`${root}/browser`;
const suffix=process.argv[2]?`-${process.argv[2]}`:'';
await mkdir(out,{recursive:true});const manifest=JSON.parse(await readFile(`${root}/narration/manifest.json`,'utf8'));
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio']});const results=[];
try{for(const[mode,width,height]of [['desktop',1440,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[],networkErrors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()})});
 page.on('response',r=>{if(r.status()>=400)networkErrors.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:5589/artifacts/chapters-history-2026-09-21/listen.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('audio').length===19&&[...document.querySelectorAll('audio')].every(a=>a.readyState>=1&&Number.isFinite(a.duration)));
 const info=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,audios:[...document.querySelectorAll('audio')].map(a=>{const b=a.getBoundingClientRect();return {path:new URL(a.src).pathname,duration:a.duration,readyState:a.readyState,error:a.error?.code??null,label:a.getAttribute('aria-label'),left:b.left,right:b.right,width:b.width}})}));
 const failures=[];if(info.overflow)failures.push('horizontal overflow');if(errors.length)failures.push('browser errors');
 for(const clip of manifest){const a=info.audios.find(a=>a.path===clip.src);if(!a||Math.abs(a.duration-clip.duration)>.08||a.error||a.left<0||a.right>width)failures.push(`asset/metadata/bounds ${clip.captionId}`);}
 await page.screenshot({path:`${out}/${mode}-listen-page${suffix}.png`,fullPage:true});results.push({mode,width,height,...info,errors,networkErrors,failures});console.log(JSON.stringify({mode,count:info.audios.length,failures,errors,networkErrors}));await page.close();
}}finally{await browser.close();await writeFile(`${out}/listen-page-results${suffix}.json`,JSON.stringify(results,null,2));}
if(results.some(r=>r.failures.length))process.exitCode=1;
