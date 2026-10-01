import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/?preview=legacy');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
    const saved = await page.evaluate(async () => {
      const { journeyRepository } = await import('/src/game/legacy/journeyRepository.ts');
      const { adoptRescue } = await import('/src/game/legacy/journey.ts');
      const current = await journeyRepository.load();
      const journey = { ...adoptRescue({ ...current.journey, readLedger: true, prepared: true, kennelName: 'Meadow House' }, 'willow', 'Maple', ['quiet'], 'test-founder', '2026-09-30T12:00:00Z'), settled: true, firstRecall: true };
      await journeyRepository.save(journey, current.revision); return journey;
    });
    await page.reload();
    const root = page.locator('.legacy-preview');
    await page.getByRole('button', { name: 'Play fetch', exact: true }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `.browser.local/homecoming-fetch-${mobile ? 'phone' : 'desktop'}.png` });
    if (mobile) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 250, y: 365 }] });
      await page.waitForTimeout(500);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 275, y: 390 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else { await page.mouse.move(900, 410); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up(); }
    await page.waitForFunction(() => Number(document.querySelector('.legacy-preview')?.dataset.fetchThrows) === 1);
    const before = Number(await root.getAttribute('data-z'));
    if (mobile) {
      const b = await page.getByRole('button', { name: 'Walk forward', exact: true }).boundingBox();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x:b.x+22,y:b.y+22 }] });
      await page.waitForTimeout(600); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else { await page.keyboard.down('KeyW'); await page.waitForTimeout(600); await page.keyboard.up('KeyW'); }
    await page.waitForTimeout(200); assert.ok(Number(await root.getAttribute('data-z')) < before-.4);
    await page.getByRole('button', { name: 'Call Maple', exact: true }).click();
    await page.waitForFunction(() => Number(document.querySelector('.legacy-preview')?.dataset.fetchReturns) === 1, null, {timeout:45000});
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    assert.equal(await page.getByRole('dialog').evaluate(d=>d.matches(':modal')),true);
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.getByRole('button', { name: 'Put toy away', exact: true }).click();
    assert.equal(await root.getAttribute('data-playing'),'false');
    await page.reload(); await page.getByRole('button', { name: 'Play fetch', exact: true }).waitFor();
    const actual = await page.evaluate(async () => { const { journeyRepository } = await import('/src/game/legacy/journeyRepository.ts'); return (await journeyRepository.load()).journey; });
    assert.deepEqual(actual,saved);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    assert.deepEqual((await page.evaluate(async()=>await indexedDB.databases())).map(d=>d.name),['paws-homecoming']);
    console.log(`${mobile?'Phone':'Desktop'}: fetch, moving return, pause, exit and save preservation passed`);
    await context.close();
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
