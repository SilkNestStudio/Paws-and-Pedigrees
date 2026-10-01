import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const errors = [];
try {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }], ['small-phone', { width: 320, height: 568 }], ['landscape', { width: 844, height: 390 }]]) {
    const context = await browser.newContext({ viewport, hasTouch: label !== 'desktop', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/?preview=legacy');
    const root = page.locator('.legacy-preview');
    const dialog = page.getByRole('dialog');
    await page.getByRole('heading', { name: 'Before it was yours.', exact: true }).waitFor();
    await page.locator('.legacy-preview[data-ready="true"]').waitFor();
    const before = await root.getAttribute('data-z');
    await page.keyboard.down('KeyW'); await page.waitForTimeout(150); await page.keyboard.up('KeyW');
    assert.equal(await root.getAttribute('data-z'), before, 'Story pauses movement');
    for (let part = 0; part < 3; part++) {
      await page.waitForFunction(() => {
        const image = document.querySelector('.legacy-story-picture img');
        return image?.complete && image.naturalWidth > 0;
      });
      assert.ok(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Story has no horizontal overflow');
      if (label === 'desktop' || label === 'phone') await page.screenshot({ path: `.browser.local/homecoming-story-${label}-${part + 1}.png` });
      if (part < 2) await page.getByRole('button', { name: 'Continue', exact: true }).click();
    }
    await page.getByRole('heading', { name: 'He left it to you.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('heading', { name: 'A legacy takes generations.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Step into the courtyard', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('dialog')?.open);
    await page.getByRole('button', { name: 'Test tools', exact: true }).click();
    await page.getByLabel('Add Scout, a test companion').check();
    await page.getByRole('button', { name: 'Return to the property', exact: true }).click();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await page.getByRole('button', { name: 'Revisit Grandpa’s story', exact: true }).click();
    await page.getByRole('heading', { name: 'Before it was yours.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    assert.equal(await root.getAttribute('data-companion'), 'true', 'Replaying does not reset preview state');
    assert.deepEqual(await page.evaluate(async () => (await indexedDB.databases()).map(db => db.name)), ['paws-homecoming'], 'Story opens only the separate Homecoming database');
    console.log(`${label}: all three pictures, back/continue/skip/replay, movement pause, layout and save isolation passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
