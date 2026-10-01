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
    await page.evaluate(async () => {
      const { journeyRepository } = await import('/src/game/legacy/journeyRepository.ts');
      const { adoptRescue } = await import('/src/game/legacy/journey.ts');
      const current = await journeyRepository.load();
      const adopted = adoptRescue({ ...current.journey, readLedger: true, prepared: true, kennelName: 'Meadow House' }, 'willow', 'Maple', ['quiet'], 'test-founder', '2026-09-30T12:00:00Z');
      // Exercise migration of the user's already completed version-one introduction.
      const old = { ...adopted, version: 1, settled: true, firstRecall: true }; delete old.routine;
      const db = await new Promise(resolve => { const r = indexedDB.open('paws-homecoming'); r.onsuccess = () => resolve(r.result); });
      await new Promise(resolve => { const tx = db.transaction('journey', 'readwrite'); tx.objectStore('journey').put({ revision: current.revision + 1, journey: old }, 'current'); tx.oncomplete = resolve; }); db.close();
    });
    await page.reload();
    await page.locator('.legacy-preview[data-dog-name="Maple"]').waitFor();
    async function travel(id, label) {
      await page.getByRole('button', { name: 'Journal', exact: true }).click();
      await page.locator('.legacy-journal-list').getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(id => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === id, id, { timeout: 35000 });
      await page.locator('.legacy-interaction button').click();
    }
    await travel('run', 'The first dog run');
    await page.getByRole('button', { name: 'Serve a meal', exact: true }).click();
    await page.locator('.legacy-preview[data-care-busy="false"]').waitFor({ timeout: 30000 });
    await page.locator('.legacy-interaction button').click();
    assert.equal(await page.getByRole('button', { name: 'Serve a meal', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Offer fresh water', exact: true }).click();
    await page.locator('.legacy-preview[data-care-busy="false"]').waitFor({ timeout: 30000 });
    await travel('field', 'Training grounds');
    await page.getByRole('button', { name: 'Enter the training meadow', exact: true }).click();
    await page.getByRole('button', { name: 'Start our walk', exact: true }).click();
    await page.getByRole('button', { name: 'Praise', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Praise', exact: true }).isDisabled(), true);
    await page.screenshot({ path: `.browser.local/focus-walk-${mobile ? 'phone' : 'desktop'}.png` });
    const root = page.locator('.focus-game');
    // Drive actual keyboard/touch controls toward world markers, without mutating the simulation.
    const points = [[-4, 3], [-4, -3], [3, -5], [5, 2], [0, 6]];
    const touch = mobile ? await context.newCDPSession(page) : null;
    for (let attempts = 0; attempts < 150 && await root.getAttribute('data-complete') !== 'true'; attempts++) {
      const index = Number(await root.getAttribute('data-marker')), [x, z] = points[index];
      const dx = x - Number(await root.getAttribute('data-keeper-x')), dz = z - Number(await root.getAttribute('data-keeper-z'));
      const direction = Math.abs(dx) > Math.abs(dz) ? dx > 0 ? ['KeyD', 'Walk right'] : ['KeyA', 'Walk left'] : dz > 0 ? ['KeyS', 'Walk backward'] : ['KeyW', 'Walk forward'];
      if (Math.hypot(dx, dz) > .7) {
        if (touch) {
          const box = await page.getByRole('button', { name: direction[1], exact: true }).boundingBox();
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
          await page.waitForTimeout(400); await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else { await page.keyboard.down(direction[0]); await page.waitForTimeout(400); await page.keyboard.up(direction[0]); }
      } else await page.waitForTimeout(300);
      const cue = page.getByRole('button', { name: /^Call close/ });
      if (await cue.isEnabled()) await cue.click();
    }
    await touch?.detach();
    await page.getByRole('heading', { name: 'Better together.', exact: true }).waitFor();
    await page.screenshot({ path: `.browser.local/focus-result-${mobile ? 'phone' : 'desktop'}.png` });
    await page.getByRole('button', { name: 'Keep the lesson and return home', exact: true }).click();
    await page.locator('.legacy-preview[data-training-sessions="1"]').waitFor();
    await page.getByRole('button', { name: 'Back to the courtyard', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
    await page.reload();
    await page.locator('.legacy-preview[data-training-sessions="1"][data-dog-name="Maple"]').waitFor();
    const record = await page.evaluate(async () => (await (await import('/src/game/legacy/journeyRepository.ts')).journeyRepository.load()).journey);
    assert.equal(record.version, 2); assert.equal(record.routine.meals, 3); assert.equal(record.routine.food, 92); assert.equal(record.routine.water, 88); assert.equal(record.routine.energy, 57);
    assert.ok(record.routine.focus >= 3); assert.ok(record.routine.keeperXp >= 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`${mobile ? 'Phone' : 'Desktop'}: migration, physical care, overfeeding guard, real movement lesson, rewards, costs and reload passed`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
