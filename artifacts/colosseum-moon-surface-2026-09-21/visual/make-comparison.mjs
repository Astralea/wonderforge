import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const base='artifacts/colosseum-moon-surface-2026-09-21/visual';
const before=await readFile(`${base}/before/1080p-t0.95-moon-crop.png`);
const after=await readFile(`${base}/candidate/1080p-t0.95-moon-crop.png`);
const sources=[before,after].map(b=>`data:image/png;base64,${b.toString('base64')}`);
const browser=await chromium.launch({channel:'chromium'});
try{
  const page=await browser.newPage({viewport:{width:960,height:810},deviceScaleFactor:1});
  await page.setContent(`<html><style>
  *{box-sizing:border-box}body{margin:0;background:#09101c;color:#e3e8ef;font:16px Arial,sans-serif;padding:28px 36px}
  h1{font-size:24px;letter-spacing:.2px;margin:0 0 9px}p{color:#a5b2c4;margin:0;font-size:14px;line-height:1.5}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;text-align:center}.head{margin-top:22px;font-size:18px;font-weight:bold}.head span{display:block;font-size:12px;font-weight:normal;color:#a5b2c4;margin-top:8px}
  .native img{width:137px;height:137px}.native{margin-top:14px;margin-bottom:17px} .large img{width:411px;height:411px;border:1px solid #26364c} .small{font-size:12px;text-align:center;margin:11px 0 0}
  </style><body><h1>Colosseum Moon · before / after</h1><p>Actual production frames at 1920 × 1080, film 95% (57 seconds).</p>
  <div class="grid head"><div>Before<span>Flat bright disc and broad glow</span></div><div>After<span>Lunar surface visible, subdued brightness</span></div></div>
  <div class="grid native">${sources.map(s=>`<div><img src="${s}"></div>`).join('')}</div>
  <p class="small">Native-size crops above · 3× enlargement below</p>
  <div class="grid large" style="margin-top:12px">${sources.map(s=>`<div><img src="${s}"></div>`).join('')}</div>
  <p class="small">Camera, position, apparent size, and near-full waning phase are unchanged.</p></body></html>`);
  await page.screenshot({path:`${base}/moon-before-after.png`});
}finally{await browser.close();}
