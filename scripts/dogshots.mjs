// Screenshots of the dog viewer in every pose: node scripts/dogshots.mjs [seed] [label]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const seed = process.argv[2] ?? '1';
const label = process.argv[3] ?? 'dogs';
const poses = (process.env.POSES ?? '0,1,2,5').split(',');
mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const pose of poses) {
  await page.goto(
    `http://127.0.0.1:5180/?view=dogs&seed=${seed}&pose=${pose}${process.env.KEEPER ? '&keeper=1' : ''}${process.env.CAM ? `&cam=${process.env.CAM}` : ''}`,
  );
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `.browser.local/${label}-s${seed}-p${pose}.png` });
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'ok');
