import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
let activePage;
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile, isMobile: mobile });
    const page = await context.newPage(); activePage = page;
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: 'Meet your first companion', exact: false }).click();
    await page.locator('.rescue-candidate').first().click();
    await page.getByLabel('What will you call your dog?').fill('Scout');
    await page.getByRole('button', { name: 'Bring Scout home', exact: true }).click();
    await page.getByRole('button', { name: 'Visit the Field Club', exact: false }).click();
    await page.getByRole('button', { name: 'Play Scent search', exact: true }).first().click();
    await page.getByRole('button', { name: 'Begin Scent search round', exact: true }).click();
    await page.getByRole('button', { name: 'Take the scent & begin', exact: true }).click();
    const field = page.locator('.search-adventure');
    const beforeZ = Number(await field.getAttribute('data-z'));
    const box = await page.locator('.search-world canvas').boundingBox();
    if (mobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(z => Math.abs(Number(document.querySelector('.search-adventure').dataset.z) - z) > .3, beforeZ);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForTimeout(200);
    const paused = await field.getAttribute('data-z');
    await page.waitForTimeout(700); assert.equal(await field.getAttribute('data-z'), paused);
    await page.getByRole('button', { name: 'Continue search', exact: true }).click();
    await page.getByRole('button', { name: 'Exit search', exact: true }).click();
    await page.getByRole('button', { name: 'Leave this visit', exact: true }).click();
    await page.getByRole('button', { name: 'End visit and return to club', exact: true }).click();
    await page.getByRole('button', { name: 'Play Agility', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Agility round', exact: true }).click();
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    const point = await page.evaluate(async () => {
      const { PerspectiveCamera, Vector3 } = await import('/node_modules/.vite/deps/three.js');
      const rect = document.querySelector('.agility-game canvas').getBoundingClientRect();
      const camera = new PerspectiveCamera(55, rect.width / rect.height, .1, 1000);
      camera.position.set(0, 7, 24); camera.lookAt(0, .5, 10); camera.updateMatrixWorld();
      const point = new Vector3(0, .035, 0).project(camera);
      return { x: rect.x + (point.x + 1) * rect.width / 2, y: rect.y + (1 - point.y) * rect.height / 2 };
    });
    if (mobile) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
    await page.getByText('Bar touched.', { exact: false }).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Field Club', exact: true }).click();
    assert.deepEqual(errors, []);
    console.log(mobile ? 'Touch' : 'Mouse', 'ground commands, pause/resume, agility destination movement and safe cancellation passed');
    await context.close();
  }
} catch (error) { await activePage?.screenshot({ path: '.browser.local/club-controls-failure.png' }); console.log(await activePage?.locator('.search-adventure').evaluate(el => ({ x: el.dataset.x, z: el.dataset.z, text: el.innerText })).catch(() => null)); throw error; } finally { await browser.close(); }
