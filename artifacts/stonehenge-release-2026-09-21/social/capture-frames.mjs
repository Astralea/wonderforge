import {chromium} from '@playwright/test';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='artifacts/stonehenge-release-2026-09-21/social',args=process.argv.slice(2),dry=args.includes('--dry-run'),base=args.find(a=>/^https?:/.test(a));
const option=n=>{const i=args.indexOf(n);return i<0?undefined:args[i+1]};
if(!base)throw new Error('Provide production base URL, or localhost with --dry-run for method probe.');
if(!dry&&!args.includes('--deployed-ready'))throw new Error('Final recording requires root ready signal, then --deployed-ready.');
const expectedBundle=option('--bundle'),take=option('--take')??(dry?'dry-frames':'take-01'),out=`${root}/${take}`;
try{await access(`${out}/capture-report.json`);throw new Error(`Refusing to overwrite preserved ${out}; use a new --take.`);}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
const shots=[{id:'pyramids-of-giza',label:'Pyramids of Giza',start:27,duration:60},{id:'eiffel-tower',label:'Eiffel Tower',start:18,duration:180},{id:'colosseum',label:'Colosseum',start:54,duration:60},{id:'stonehenge',label:'Stonehenge',start:55,duration:60}];
const browser=await chromium.launch({channel:'chromium',args:['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const report={startedAt:new Date().toISOString(),base,dry,method:'Existing deployed deterministic debug route. Original app ThreeCanvas/WorldScene, no source imports, no renderer or pose changes. One PNG per exact1/30s sample.',width:1920,height:1080,fps:30,framesPerShot:dry?4:150,expectedBundle,shots:[]};
const sha=b=>createHash('sha256').update(b).digest('hex');
try{for(const shot of dry?shots.slice(0,1):shots){
 const directory=`${out}/${shot.id}`;await mkdir(directory,{recursive:true});
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});const page=await context.newPage(),errors=[],warnings=[],failed=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});
 const initialT=shot.start/shot.duration,href=`${base}/#/debug/wonder/${shot.id}/${initialT.toFixed(12)}`;
 await page.goto(href,{waitUntil:'networkidle'});await page.locator('canvas[data-assets="ready"]').waitFor({timeout:120000});await page.waitForTimeout(850);
 const metadata=await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {bundle:[...document.scripts].map(s=>s.src).filter(Boolean),canvas:{width:c.width,height:c.height},gpu:gl.getParameter(e.UNMASKED_RENDERER_WEBGL),scene:window.__THREE_GAME_DIAGNOSTICS__?.scene};});
 if(expectedBundle&&!metadata.bundle.some(x=>x.endsWith('/'+expectedBundle)))throw new Error(`Wrong deployed bundle for ${shot.id}: ${metadata.bundle}`);
 if(metadata.canvas.width!==1920||metadata.canvas.height!==1080)throw new Error('Wrong canvas resolution');
 if(/SwiftShader/i.test(metadata.gpu))throw new Error('Software GPU fallback rejected');
 const scriptProof=[];for(const url of metadata.bundle){const r=await context.request.get(url),bytes=await r.body();scriptProof.push({url,status:r.status(),sha256:sha(bytes),bytes:bytes.length,headers:r.headers()});}
 const frames=[];
 console.log(JSON.stringify({start:shot.id,base,bundle:metadata.bundle,gpu:metadata.gpu,frames:report.framesPerShot}));
 for(let frame=0;frame<report.framesPerShot;frame++){
  const seconds=shot.start+frame/30,t=seconds/shot.duration;
  if(frame>0)await page.evaluate(async({id,t})=>{
   const c=document.querySelector('canvas'),hash=`#/debug/wonder/${id}/${t.toFixed(12)}`;
   await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('No renderer frame after deterministic time change'));},12000);
    const observer=new MutationObserver(records=>{if(records.some(r=>r.attributeName==='data-renderer-diagnostics')&&location.hash===hash){clearTimeout(timeout);observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(resolve));}});
    observer.observe(c,{attributes:true,attributeFilter:['data-renderer-diagnostics']});location.hash=hash;
   });
  },{id:shot.id,t});
  const png=await page.locator('canvas').screenshot({type:'png',timeout:20000});const file=`${directory}/${String(frame).padStart(4,'0')}.png`;await writeFile(file,png);
  const diag=await page.evaluate(()=>({hash:location.hash,scene:window.__THREE_GAME_DIAGNOSTICS__?.scene,camera:window.__THREE_GAME_DIAGNOSTICS__?.camera,renderer:window.__THREE_GAME_DIAGNOSTICS__?.renderer}));
  frames.push({frame,seconds,t,file,bytes:png.length,sha256:sha(png),...diag});if(frame%30===0)console.log(JSON.stringify({progress:shot.id,frame,seconds}));
 }
 // Produce a transparent, restrained editorial label. It changes neither
 // captured geometry nor lighting; ffmpeg overlays it during final assembly.
 const labelPng=await page.evaluate(async({label})=>{
  await document.fonts.load('500 34px Cinzel');await document.fonts.load('400 26px "Alegreya Sans"');
  const c=document.createElement('canvas');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,900,0,1080);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.32)');ctx.fillStyle=g;ctx.fillRect(0,900,1920,180);
  ctx.fillStyle='#d5b36d';ctx.fillRect(64,964,42,2);ctx.fillStyle='#f3ecdb';ctx.font='500 34px Cinzel';ctx.letterSpacing='2px';ctx.fillText(label,64,1010);
  return c.toDataURL('image/png').split(',')[1];
 },shot);await writeFile(`${directory}/label.png`,Buffer.from(labelPng,'base64'));
 const entry={...shot,href,...metadata,scriptProof,frames,errors,warnings,failed};report.shots.push(entry);await writeFile(`${out}/capture-report.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({done:shot.id,frames:frames.length,errors,failed}));await context.close();
 }
 if(!dry){const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage();await page.goto(`${base}/#/debug/wonder/stonehenge/1`,{waitUntil:'networkidle'});await page.locator('canvas[data-assets="ready"]').waitFor({timeout:120000});
 const endCard=await page.evaluate(async url=>{await document.fonts.load('500 28px Cinzel');await document.fonts.load('400 25px "Alegreya Sans"');const c=document.createElement('canvas');c.width=1920;c.height=1080;const ctx=c.getContext('2d');ctx.textAlign='right';ctx.fillStyle='#f3ecdb';ctx.font='500 28px Cinzel';ctx.letterSpacing='3px';ctx.fillText('WonderForge',1856,968);ctx.font='400 25px "Alegreya Sans"';ctx.letterSpacing='0.5px';ctx.fillStyle='#e0daca';ctx.fillText(url,1856,1010);return c.toDataURL('image/png').split(',')[1];},new URL(base).host);await writeFile(`${out}/end-label.png`,Buffer.from(endCard,'base64'));await context.close();
 const r=await fetch(`${base}/audio/stonehenge-cinematic.mp3`),bytes=Buffer.from(await r.arrayBuffer());if(!r.ok)throw new Error('Public score download failed');await writeFile(`${out}/stonehenge-cinematic.mp3`,bytes);report.audio={url:r.url,status:r.status,sha256:sha(bytes),bytes:bytes.length,headers:Object.fromEntries(r.headers),excerpt:[40,60],fades:{inSeconds:.6,outSeconds:.9}};
 }
}finally{await browser.close();report.finishedAt=new Date().toISOString();await writeFile(`${out}/capture-report.json`,JSON.stringify(report,null,2));}
