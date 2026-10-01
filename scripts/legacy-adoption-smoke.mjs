import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/?preview=legacy');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
    // Isolated fixture: the earlier smoke covers the full property preparation.
    await page.evaluate(async () => {
      async function put(dbName, storeName, key, value) {
        const db = await new Promise((resolve, reject) => { const req = indexedDB.open(dbName, 1); req.onupgradeneeded = () => req.result.createObjectStore(storeName); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
        await new Promise((resolve, reject) => { const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
      }
      await put('paws-homecoming', 'journey', 'current', { revision: 50, journey: { version: 1, introSeen: true, readLedger: true, prepared: true, kennelName: 'Oak & Ember', dog: null, settled: false, firstRecall: false } });
      await put('paws-and-pedigrees', 'saves', 'sentinel', 'original game untouched');
    });
    await page.reload();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await page.locator('.legacy-journal-list').getByRole('button', { name: 'The road to town', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === 'gate', null, { timeout: 30000 });
    await page.locator('.legacy-interaction button').click();
    await page.getByRole('button', { name: 'Visit Larchwood Rescue', exact: true }).click();
    await page.getByRole('heading', { name: 'Larchwood Rescue', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Choose Willow', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Offer a toy', exact: true }).click();
    await page.locator('.shelter-visit[data-met="true"]').waitFor({ timeout: 30000 });
    await page.getByRole('navigation', { name: 'Rescue dogs' }).getByRole('button', { name: 'Bruno', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Choose Bruno', exact: true }).isDisabled(), true, 'Meeting one dog does not qualify another');
    await page.getByRole('button', { name: 'Wait quietly nearby', exact: true }).click();
    await page.locator('.shelter-visit[data-met="true"]').waitFor({ timeout: 30000 });
    await page.screenshot({ path: `.browser.local/shelter-${mobile ? 'phone' : 'desktop'}.png` });
    await page.getByRole('button', { name: 'Choose Bruno', exact: true }).click();
    await page.getByLabel('What will you call your dog?').fill(' ');
    await page.getByRole('button', { name: 'Adopt and head home', exact: true }).click();
    await page.getByRole('alert').waitFor();
    await page.getByLabel('What will you call your dog?').fill('Copper');
    await page.getByRole('button', { name: 'Adopt and head home', exact: true }).click();
    await page.getByRole('heading', { name: 'Welcome home, Copper.', exact: true }).waitFor();
    assert.equal(await page.locator('.legacy-preview').getAttribute('data-dog-name'), 'Copper');
    await page.getByRole('button', { name: 'Show them their new home', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === 'run', null, { timeout: 40000 });
    await page.locator('.legacy-interaction button').click();
    await page.getByRole('button', { name: 'Let them settle in', exact: true }).click();
    await page.getByRole('button', { name: 'Wait here', exact: true }).click();
    // Click ground navigation is tested elsewhere; use the journal to separate keeper and waiting dog.
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await page.locator('.legacy-journal-list').getByRole('button', { name: 'Training grounds', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === 'field', null, { timeout: 40000 });
    await page.getByRole('button', { name: 'Call Copper', exact: true }).click();
    await page.locator('.legacy-preview[data-first-recall="true"]').waitFor({ timeout: 40000 });
    await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
    await page.reload();
    await page.locator('.legacy-preview[data-dog-name="Copper"][data-first-recall="true"]').waitFor();
    await page.getByRole('button', { name: 'Call Copper', exact: true }).waitFor();
    const saved = await page.evaluate(async () => {
      async function read(dbName, storeName, key) { const db = await new Promise(resolve => { const r = indexedDB.open(dbName); r.onsuccess = () => resolve(r.result); }); const value = await new Promise(resolve => { const r = db.transaction(storeName).objectStore(storeName).get(key); r.onsuccess = () => resolve(r.result); }); db.close(); return value; }
      return { legacy: await read('paws-and-pedigrees', 'saves', 'sentinel'), record: await read('paws-homecoming', 'journey', 'current') };
    });
    assert.equal(saved.legacy, 'original game untouched');
    assert.equal(saved.record.journey.dog.rescueId, 'bruno');
    assert.equal(saved.record.journey.dog.bond, 10);
    assert.equal(saved.record.journey.settled, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`${mobile ? 'Phone' : 'Desktop'}: rescue meetings, naming validation, adoption, settling, recall, reload and original-save isolation passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
