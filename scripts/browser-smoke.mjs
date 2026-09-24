import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [], cloudRequests = [];
try {
  await mkdir('.browser.local', { recursive: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile, isMobile: mobile });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname.includes('supabase')) { cloudRequests.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/?practice=agility');
    await page.getByRole('button', { name: 'Start session', exact: true }).waitFor();
    await page.screenshot({ path: `.browser.local/${mobile ? 'mobile' : 'desktop'}-ready.png` });
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor({ timeout: 15000 });
    if (mobile) {
      const up = page.getByRole('button', { name: '↑', exact: true });
      const box = await up.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down(); await page.waitForTimeout(2800); await page.mouse.up();
    } else {
      await page.keyboard.down('KeyW'); await page.waitForTimeout(2800); await page.keyboard.up('KeyW');
    }
    await page.getByText('Bar touched.', { exact: false }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: `.browser.local/${mobile ? 'mobile' : 'desktop'}-course.png` });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('heading', { name: 'Taking a breather' }).waitFor();
    // Let the last throttled HUD snapshot catch up to the paused simulation.
    await page.waitForTimeout(200);
    const clock = await page.locator('.font-bold > span').first().textContent();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.font-bold > span').first().textContent(), clock);
    await page.getByRole('button', { name: 'Restart course', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor({ timeout: 15000 });
    await page.getByText('0 faults', { exact: true }).waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.getByRole('heading', { name: 'Taking a breather' }).waitFor();
    assert.ok(await page.locator('canvas').count());
    console.log(`${mobile ? 'Mobile' : 'Desktop'}: rendered, moved, collision checked, paused, restarted, blur released input.`);
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(cloudRequests, []);
  console.log('Browser smoke checks passed; no page exceptions or Supabase requests.');
} finally { await browser.close(); }
