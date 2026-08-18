/** Reproduce the live-playback vanish: first render at t≈0, then late t. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', String(e)));

// Watch route: playback starts at t=0 (autoplay), exactly like the user.
await page.goto('http://127.0.0.1:5589/#/wonder/pyramids-of-giza', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); // several frames render with count ~0

// Jump to the reported beat via the scrubber (store-driven seek, same canvas).
await page.getByLabel('Seek').evaluate((el) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, '0.87');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(800);
await page.screenshot({ path: 'artifacts/vanish-live/repro.png' });
console.log('screenshot saved');
await browser.close();
