import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio'] });
const out = 'artifacts/review-board/release-2026-09-21/giza-stonehenge/stonehenge';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const t of [.86, 1]) {
    await page.goto(`http://127.0.0.1:5590/#/debug/wonder/stonehenge/${t}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900); await page.screenshot({ path: `${out}/desktop-debug-t${t}.png` });
  }
} finally { await browser.close(); }
