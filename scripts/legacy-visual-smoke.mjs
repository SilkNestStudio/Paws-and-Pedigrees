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
    await page.getByRole('region', { name: 'Destination directions' }).waitFor();
    await page.getByRole('button', { name: 'Test tools', exact: true }).click();
    await page.getByLabel('Add Scout, a test companion').check();
    await page.getByRole('button', { name: 'Return to the property', exact: true }).click();
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(r => r.name.includes('homecoming_companion.glb')));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.browser.local/homecoming-${mobile ? 'touch' : 'desktop'}-characters.png` });
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await page.locator('.legacy-journal-list').getByRole('button', { name: 'The road to town', exact: true }).click();
    const direction = page.getByRole('region', { name: 'Destination directions' });
    await page.waitForFunction(() => document.querySelector('.legacy-wayfinder')?.getAttribute('data-direction') === 'Behind you');
    assert.equal(await direction.getAttribute('data-destination'), 'gate');
    await page.getByRole('button', { name: 'Face destination', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-wayfinder')?.getAttribute('data-direction') === 'Ahead', null, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === 'gate', null, { timeout: 15000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `.browser.local/homecoming-${mobile ? 'touch' : 'desktop'}-gate.png` });
    // Move away from the end of the courtyard, then orbit through a full turn.
    for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Turn camera left', exact: true }).click();
    await page.getByRole('button', { name: 'Face destination', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-wayfinder')?.getAttribute('data-direction') === 'Ahead');
    await page.getByRole('button', { name: 'Test tools', exact: true }).click();
    await page.getByLabel('Test companion build').selectOption('stocky');
    await page.getByRole('button', { name: 'Return to the property', exact: true }).click();
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(r => r.name.includes('homecoming_stocky.glb')));
    await page.getByRole('button', { name: 'Wait here', exact: true }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `.browser.local/homecoming-${mobile ? 'touch' : 'desktop'}-stocky-sit.png` });
    await page.getByRole('button', { name: 'Release', exact: true }).click();
    const imports = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
    assert.ok(imports.some(url => url.includes('homecoming_keeper.glb')));
    assert.ok(!imports.some(url => /stores\/gameStore|athletic_dog.glb|stocky_dog.glb/.test(url)));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`${mobile ? 'Touch' : 'Desktop'}: new character assets, off-screen gate directions, face destination, full camera rotation and both companion builds passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
