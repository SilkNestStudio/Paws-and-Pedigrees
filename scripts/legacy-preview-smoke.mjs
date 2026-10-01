import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/?preview=legacy');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.locator('.legacy-preview[data-ready="true"]').waitFor();
    const root = page.locator('.legacy-preview');
    await page.screenshot({ path: `.browser.local/legacy-${mobile ? 'touch' : 'desktop'}-arrival.png` });
    const before = Number(await root.getAttribute('data-z'));
    if (mobile) {
      const control = await page.getByRole('button', { name: 'Walk forward', exact: true }).boundingBox();
      const touch = await context.newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: control.x + control.width / 2, y: control.y + control.height / 2 }] });
      await page.waitForTimeout(700);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
    } else {
      await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
    }
    await page.waitForTimeout(200);
    assert.ok(Number(await root.getAttribute('data-z')) < before - .4, 'Movement moves the keeper forward');
    async function travel(id, label) {
      await page.getByRole('button', { name: 'Journal', exact: true }).click();
      await page.locator('.legacy-journal-list').getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(id => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === id, id, { timeout: 25000 });
      await page.locator('.legacy-interaction button').click();
    }
    await travel('ledger', "Grandpa's ledger");
    await page.getByRole('button', { name: 'Keep the ledger. Prepare a home.', exact: true }).click();
    await travel('run', 'The first dog run');
    await page.getByRole('button', { name: 'Lay out the blanket and bowls', exact: true }).click();
    assert.equal(await root.getAttribute('data-prepared'), 'true');
    await travel('ledger', "Grandpa's ledger");
    await page.getByLabel('Your kennel’s new name').fill('Oak & Ember');
    await page.getByRole('button', { name: 'Write the first page', exact: true }).click();
    await page.getByRole('heading', { name: 'Oak & Ember', exact: true }).waitFor();
    await page.screenshot({ path: `.browser.local/legacy-${mobile ? 'touch' : 'desktop'}-kennel.png` });
    await travel('gate', 'The road to town');
    await page.getByRole('heading', { name: 'A home needs a dog.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep exploring', exact: true }).click();
    await page.getByRole('button', { name: 'Test tools', exact: true }).click();
    await page.getByLabel('Add Scout, a test companion').check();
    await page.getByRole('button', { name: 'Return to the property', exact: true }).click();
    assert.equal(await root.getAttribute('data-companion'), 'true');
    await page.getByRole('button', { name: 'Call Scout', exact: true }).click();
    await page.getByRole('button', { name: 'Wait here', exact: true }).click();
    await page.getByRole('button', { name: 'Release', exact: true }).click();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    const paused = await root.getAttribute('data-z'); await page.waitForTimeout(500);
    assert.equal(await root.getAttribute('data-z'), paused);
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.screenshot({ path: `.browser.local/legacy-${mobile ? 'touch' : 'desktop'}-companion.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const databases = await page.evaluate(async () => (await indexedDB.databases()).map(db => db.name));
    assert.deepEqual(databases, ['paws-homecoming'], 'Homecoming saves separately from the original game');
    const imports = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name));
    assert.ok(!imports.some(url => /stores\/gameStore|supabaseService/.test(url)), 'Preview does not mount the game store');
    await page.getByRole('button', { name: 'Test tools', exact: true }).click();
    await page.getByRole('button', { name: 'Restart this preview', exact: true }).click();
    await page.getByRole('button', { name: 'Reset Homecoming', exact: true }).click();
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    assert.equal(await root.getAttribute('data-prepared'), 'false');
    assert.equal(await root.getAttribute('data-companion'), 'false');
    console.log(`${mobile ? 'Touch' : 'Desktop'}: movement, ledger, run, naming, gate, companion controls, pause, reset, save isolation passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
