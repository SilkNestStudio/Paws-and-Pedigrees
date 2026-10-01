import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/?preview=yard');
    await page.locator('canvas').waitFor(); await page.waitForTimeout(1800);
    await page.screenshot({ path: `.browser.local/new-yard-${mobile ? 'phone' : 'desktop'}.png` });
    const root = page.locator('.play-yard');
    if (mobile) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 255, y: 440 }] });
      await page.waitForTimeout(300);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 280, y: 380 }] });
      await page.waitForTimeout(350);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else { await page.mouse.move(960, 410); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); }
    await page.waitForFunction(() => Number(document.querySelector('.play-yard')?.getAttribute('data-throws')) >= 1, null, { timeout: 10000 });
    await page.screenshot({ path: `.browser.local/new-yard-${mobile ? 'phone' : 'desktop'}-chase.png` });
    await page.waitForFunction(() => Number(document.querySelector('.play-yard')?.getAttribute('data-returns')) >= 1, null, { timeout: 45000 });
    const before = Number(await root.getAttribute('data-keeper-z'));
    if (mobile) {
      const b = await page.getByRole('group', { name: 'Move keeper joystick' }).boundingBox();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + 12 }] });
      await page.waitForTimeout(650); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else { await page.keyboard.down('KeyW'); await page.waitForTimeout(650); await page.keyboard.up('KeyW'); }
    await page.waitForTimeout(200);
    assert.ok(Number(await root.getAttribute('data-keeper-z')) < before - .4);
    await page.getByRole('button', { name: 'See the whole yard', exact: true }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `.browser.local/new-yard-${mobile ? 'phone' : 'desktop'}-wide.png` });
    await page.getByRole('button', { name: 'Meet June', exact: true }).click();
    assert.equal(await root.getAttribute('data-returns'), '0');
    await page.getByRole('button', { name: 'Pause yard', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('dialog').evaluate(d => d.matches(':modal')), true);
    await page.getByRole('button', { name: 'Back to playing', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(await page.evaluate(async () => await indexedDB.databases()), []);
    console.log(`${mobile ? 'Phone' : 'Desktop'}: real throw/return, keeper movement, wide camera, companion switch, pause and save isolation passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
