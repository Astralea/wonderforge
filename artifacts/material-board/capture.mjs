#!/usr/bin/env node
// One-off capture for the material review board. Same real-GPU Chromium
// launch discipline as scripts/inspect-threejs-canvas.mjs.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = `file://${path.join(dir, 'index.html')}`;
const out = path.join(dir, 'board.png');

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chromium' });
  } catch {
    return chromium.launch();
  }
}

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1504, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('.card canvas', { state: 'visible', timeout: 10_000 });
await page.waitForTimeout(1200); // let web fonts and the water ripple settle
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`captured ${out}`);
