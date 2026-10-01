// Visual check: opens the game in a real browser (desktop and phone sizes),
// plays a little, and saves screenshots to .browser.local/.
// Usage: start `npm run dev`, then `node scripts/screenshots.mjs [label]`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'shot';
const url = process.env.GAME_URL ?? 'http://127.0.0.1:5180/';
mkdirSync('.browser.local', { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const errors = [];
try {
  for (const phone of [false, true]) {
    const context = await browser.newContext(
      phone
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
            deviceScaleFactor: 2,
          }
        : { viewport: { width: 1440, height: 900 } },
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`${phone ? 'phone' : 'desktop'}: ${e.message}`));
    page.on(
      'console',
      (m) =>
        m.type() === 'error' && errors.push(`${phone ? 'phone' : 'desktop'} console: ${m.text()}`),
    );
    await page.goto(url);
    await page.waitForTimeout(2500);
    const tag = `${label}-${phone ? 'phone' : 'desktop'}`;
    await page.screenshot({ path: `.browser.local/${tag}-1-welcome.png` });
    await page.getByRole('button', { name: "Let's go" }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `.browser.local/${tag}-2-field.png` });

    // Throw the ball ahead of the keeper (tap upper-middle of the screen).
    const size = page.viewportSize();
    await page.mouse.click(size.width * 0.5, size.height * 0.42);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `.browser.local/${tag}-3-chase.png` });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `.browser.local/${tag}-4-return.png` });

    // Open the field book.
    await page.getByRole('button', { name: 'Field book' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.browser.local/${tag}-5-book.png` });
    await page.getByRole('button', { name: 'Dogs' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `.browser.local/${tag}-6-dogs.png` });
    await context.close();
  }
} finally {
  await browser.close();
}
if (errors.length) {
  console.log('Errors:\n' + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('No page errors.');
}
