import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='artifacts/colosseum-moon-surface-2026-09-21/social',args=process.argv.slice(2),base=args.find(a=>/^https:\/\//.test(a));
const option=n=>{const i=args.indexOf(n);return i<0?undefined:args[i+1]};
const expectedBundle=option('--bundle'),take=option('--take')??'take-01',out=`${root}/${take}`,directory=`${out}/colosseum`;
if(!base||!expectedBundle||!args.includes('--deployed-ready'))throw new Error('Requires root public-ready signal, verified HTTPS base, --bundle EXACT_BUNDLE and --deployed-ready.');
try{await access(`${out}/capture-report.json`);throw new Error('Refusing to overwrite preserved take; choose another --take.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(directory,{recursive:true});
const oldRoot='artifacts/stonehenge-release-2026-09-21/social/take-01';
const old=JSON.parse(await readFile(`${oldRoot}/capture-report.json`,'utf8')).shots.find(s=>s.id==='colosseum');
const sha=b=>createHash('sha256').update(b).digest('hex');
const moon={credit:"NASA's Scientific Visualization Studio",source:'https://svs.gsfc.nasa.gov/4720/',original:'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg',width:1024,height:512,bytes:139068,sha256:'b246064f217f8d479df78c49c7c8595a8f5fbda008a72fd539978d2e121e0109',interpretation:'2019 aesthetic color map. Authored mean near-side presentation; no date-exact libration claim.'};
const report={startedAt:new Date().toISOString(),base,expectedBundle,width:1920,height:1080,fps:30,framesPerShot:150,method:'Capture only Colosseum54–59s using existing deployed debug route, unchanged real renderer/poses. Reuse original encoded other three shots and AAC score.',moon,shots:[]};
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1}),page=await context.newPage(),errors=[],warnings=[],failed=[],lunarUrls=new Set();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});if(r.url().includes('lroc-color-poles-1k'))lunarUrls.add(r.url());});
 const href=`${base}/#/debug/wonder/colosseum/0.900000000000`;await page.goto(href,{waitUntil:'networkidle'});await page.locator('canvas[data-assets="ready"]').waitFor({timeout:120000});await page.waitForTimeout(850);
 const metadata=await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {bundle:[...document.scripts].map(s=>s.src).filter(Boolean),canvas:{width:c.width,height:c.height},gpu:gl.getParameter(e.UNMASKED_RENDERER_WEBGL),scene:window.__THREE_GAME_DIAGNOSTICS__?.scene};});
 if(!metadata.bundle.some(x=>x.endsWith('/'+expectedBundle)))throw new Error('Wrong public bundle: '+metadata.bundle);
 if(metadata.canvas.width!==1920||metadata.canvas.height!==1080||/SwiftShader/i.test(metadata.gpu))throw new Error('Unexpected render surface');
 const scriptProof=[];for(const url of metadata.bundle){const r=await context.request.get(url),bytes=await r.body();scriptProof.push({url,status:r.status(),sha256:sha(bytes),bytes:bytes.length,headers:r.headers()});}
 if(lunarUrls.size!==1)throw new Error('Expected exactly one locally served lunar texture request; got '+[...lunarUrls]);
 const moonAsset=[];for(const url of lunarUrls){const r=await context.request.get(url),bytes=await r.body();if(r.status()!==200||sha(bytes)!==moon.sha256)throw new Error('Public lunar texture bytes do not match approved NASA image');await writeFile(`${out}/nasa-lroc-color-poles-1k.jpg`,bytes);moonAsset.push({url,status:r.status(),sha256:sha(bytes),bytes:bytes.length,headers:r.headers()});}
 const frames=[];let largestCameraDelta=0;
 console.log(JSON.stringify({start:'colosseum',bundle:metadata.bundle,moonAsset,frames:150}));
 for(let frame=0;frame<150;frame++){
  const seconds=54+frame/30,t=seconds/60;
  if(frame>0)await page.evaluate(async t=>{const c=document.querySelector('canvas'),hash=`#/debug/wonder/colosseum/${t.toFixed(12)}`;await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('No rendered frame after time change'));},12000);const observer=new MutationObserver(records=>{if(records.some(r=>r.attributeName==='data-renderer-diagnostics')&&location.hash===hash){clearTimeout(timeout);observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(resolve));}});observer.observe(c,{attributes:true,attributeFilter:['data-renderer-diagnostics']});location.hash=hash;});},t);
  const png=await page.locator('canvas').screenshot({type:'png',timeout:20000}),file=`${directory}/${String(frame).padStart(4,'0')}.png`;await writeFile(file,png);
  const diag=await page.evaluate(()=>({hash:location.hash,scene:window.__THREE_GAME_DIAGNOSTICS__?.scene,camera:window.__THREE_GAME_DIAGNOSTICS__?.camera,renderer:window.__THREE_GAME_DIAGNOSTICS__?.renderer,celestial:window.__THREE_GAME_DIAGNOSTICS__?.colosseumCelestial}));
  const vals=c=>[...c.position,...c.direction,c.fov,c.aspect,c.near],a=vals(diag.camera),b=vals(old.frames[frame].camera);largestCameraDelta=Math.max(largestCameraDelta,...a.map((x,i)=>Math.abs(x-b[i])));
  frames.push({frame,seconds,t,file,bytes:png.length,sha256:sha(png),...diag});if(frame%30===0)console.log(JSON.stringify({frame,seconds}));
 }
 await copyFile(`${oldRoot}/colosseum/label.png`,`${directory}/label.png`);
 report.shots.push({id:'colosseum',label:'Colosseum',start:54,duration:60,href,...metadata,scriptProof,moonAsset,frames,errors,warnings,failed,largestCameraDelta,originalCapture:`${oldRoot}/capture-report.json`});
 if(largestCameraDelta>1e-8)throw new Error('Camera differs from accepted original montage: '+largestCameraDelta);
 console.log(JSON.stringify({done:true,frames:frames.length,largestCameraDelta,errors,failed}));await context.close();
}finally{await browser.close();report.finishedAt=new Date().toISOString();await writeFile(`${out}/capture-report.json`,JSON.stringify(report,null,2));}
