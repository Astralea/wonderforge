import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const root='artifacts/chapters-history-2026-09-20/browser/visual';
const results=JSON.parse(await readFile(`${root}/results.json`,'utf8'));
const browser=await chromium.launch({channel:'chromium'});
try{
for(const row of results){
 const mobile=row.mode==='mobile',width=mobile?390:720,height=mobile?844:450,columns=mobile?3:2;
 const cards=await Promise.all(row.shots.map(async s=>`<article><label>${s.id} · ${s.t.toFixed(3)}</label><img src="data:image/png;base64,${(await readFile(s.file)).toString('base64')}"/></article>`));
 const html=`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#222;color:white;font:14px sans-serif;display:grid;grid-template-columns:repeat(${columns},${width}px);gap:8px}article{width:${width}px}label{display:block;height:24px;padding:4px 8px}img{width:${width}px;height:${height}px;display:block}</style>${cards.join('')}`;
 const base=`${root}/${row.mode}-${row.wonder}-contact`;
 await writeFile(`${base}.html`,html);
 const page=await browser.newPage({viewport:{width:columns*(width+8)-8,height:Math.ceil(cards.length/columns)*(height+32)-8},deviceScaleFactor:1});
 await page.setContent(html);await page.screenshot({path:`${base}.png`,fullPage:true});await page.close();
 console.log(base+'.png');
}
}finally{await browser.close()}
