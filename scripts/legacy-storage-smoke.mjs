import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/?preview=legacy');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
  const result = await page.evaluate(async () => {
    const { journeyRepository } = await import('/src/game/legacy/journeyRepository.ts');
    const first = await journeyRepository.load(), stale = await journeyRepository.load();
    await journeyRepository.save({ ...first.journey, kennelName: 'Newer kennel' }, first.revision);
    let conflict = '';
    try { await journeyRepository.save({ ...stale.journey, kennelName: 'Old tab' }, stale.revision); } catch (error) { conflict = error.message; }
    const latest = await journeyRepository.load();
    return { conflict, name: latest.journey.kennelName };
  });
  assert.match(result.conflict, /Another tab/);
  assert.equal(result.name, 'Newer kennel');
  await page.reload();
  await page.getByRole('heading', { name: 'Newer kennel', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
  await page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open('paws-homecoming'); r.onsuccess = () => resolve(r.result); });
    await new Promise((resolve, reject) => { const tx = db.transaction('journey', 'readwrite'); tx.objectStore('journey').put({ revision: 999, journey: { version: 999 } }, 'current'); tx.oncomplete = resolve; tx.onerror = reject; }); db.close();
  });
  await page.reload();
  await page.getByText('This Homecoming save is not a supported version. It has not been overwritten.', { exact: true }).waitFor();
  assert.equal(await page.locator('.legacy-preview').count(), 0);
  const version = await page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open('paws-homecoming'); r.onsuccess = () => resolve(r.result); });
    const record = await new Promise(resolve => { const r = db.transaction('journey').objectStore('journey').get('current'); r.onsuccess = () => resolve(r.result); }); db.close(); return record.journey.version;
  });
  assert.equal(version, 999);
  console.log('Homecoming: stale writes rejected, newer progress preserved, unsupported saves never overwritten');
  await context.close();
} finally { await browser.close(); }
