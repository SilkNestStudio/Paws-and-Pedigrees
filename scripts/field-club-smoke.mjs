import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// Isolated browser saves. Plays search, herding and water through public controls.
// Agility traversal is covered by the simulation tests; this checks its UI and cancellation.
const browser = await chromium.launch();
const errors = [];
let page;
async function savedState() {
  return page.evaluate(async () => {
    const { flushLocalSave, localDatabase } = await import('/src/lib/storage/localDatabase.ts');
    await flushLocalSave();
    return JSON.parse(await localDatabase.getItem('paws-and-pedigrees-storage')).state;
  });
}
async function openPractice(name) {
  await page.getByRole('button', { name: `Practice ${name}`, exact: true }).first().click();
  await page.getByRole('button', { name: `Begin ${name} round`, exact: true }).click();
}
async function playSearch(label) {
  const saved = await savedState();
  const hidden = await page.evaluate(async seed => {
    const { createField } = await import('/src/game/club/simulation.ts');
    return createField('search', 40, seed).hidden;
  }, saved.tutorialProgress.fieldClub.active.seed);
  await page.getByRole('button', { name: 'Begin round', exact: true }).click();
  const field = page.locator('.field-game');
  await page.screenshot({ path: `.browser.local/club-search-${label}.png` });
  for (const index of hidden) {
    await page.getByRole('button', { name: `Send to station ${index + 1}`, exact: true }).click();
    await page.waitForFunction(index => {
      const stations = [[-5, 3], [0, 3], [5, 3], [-5, -.5], [0, -.5], [5, -.5], [-5, -4], [0, -4], [5, -4]];
      const el = document.querySelector('.field-game');
      return Math.hypot(Number(el.dataset.x) - stations[index][0], Number(el.dataset.z) - stations[index][1]) < .15;
    }, index, { timeout: 20000 });
    const count = Number(await field.getAttribute('data-count'));
    await page.getByRole('button', { name: 'Investigate scent', exact: true }).click();
    await page.waitForFunction(n => Number(document.querySelector('.field-game').dataset.count) > n, count);
  }
  await page.getByRole('button', { name: 'Save round & continue', exact: true }).click();
  await page.getByRole('region', { name: 'Latest club result' }).waitFor();
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: 'Meet your first companion', exact: false }).click();
    await page.locator('.rescue-candidate').first().click();
    await page.getByLabel('What will you call your dog?').fill('Scout');
    await page.getByRole('button', { name: 'Bring Scout home', exact: true }).click();
    await page.getByRole('button', { name: 'Visit the Field Club', exact: false }).click();
    await page.getByRole('heading', { name: 'Try scent search with Scout.', exact: true }).waitFor();
    assert.equal(await page.locator('[data-tutorial-step]').count(), 0);
    assert.equal(await page.getByText('Daily Reward!', { exact: true }).count(), 0);
    assert.equal(await page.locator('.club-content').evaluate(el => el.scrollWidth > el.clientWidth + 2), false);
    const label = mobile ? 'mobile' : 'desktop';
    await page.screenshot({ path: `.browser.local/club-overview-${label}.png`, fullPage: true });
    await openPractice('Scent search'); await playSearch(label);
    console.log(label, 'adoption, onboarding and a real search round passed');
    const first = await savedState();
    assert.equal(first.tutorialProgress.fieldClub.records[first.dogs[0].id].search.sessions, 1);
    await page.reload();
    await page.getByRole('button', { name: 'Visit the Field Club', exact: false }).click();
    await page.getByRole('region', { name: 'Latest club result' }).waitFor();

    if (!mobile) {
      await openPractice('Herding');
      await page.getByRole('button', { name: 'Begin round', exact: true }).click();
      await page.screenshot({ path: '.browser.local/club-herding-desktop.png' });
      for (let i = 0; i < 200 && await page.locator('.field-game').getAttribute('data-phase') === 'playing'; i++) {
        await page.getByRole('button', { name: /Position behind sheep/ }).first().click();
        await page.waitForTimeout(950);
      }
      assert.equal(await page.locator('.field-game').getAttribute('data-count'), '3');
      await page.getByRole('button', { name: 'Save round & continue', exact: true }).click();
      console.log('desktop real herding round passed');
    }

    await openPractice('Water retrieval');
    await page.getByRole('button', { name: 'Begin round', exact: true }).click();
    await page.screenshot({ path: `.browser.local/club-water-${label}.png` });
    for (let i = 1; i <= 3; i++) {
      await page.getByRole('button', { name: `Retrieve dummy ${i}`, exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.field-game').dataset.carrying === 'true', null, { timeout: 25000 });
      await page.getByRole('button', { name: 'Call back to shore', exact: true }).click();
      await page.waitForFunction(n => Number(document.querySelector('.field-game').dataset.count) === n, i, { timeout: 25000 });
    }
    await page.getByRole('button', { name: 'Save round & continue', exact: true }).click();
    console.log(label, 'real water retrieval round passed');
    await openPractice('Agility');
    await page.getByRole('button', { name: 'Start session', exact: true }).waitFor();
    await page.screenshot({ path: `.browser.local/club-agility-${label}.png` });
    await page.getByRole('button', { name: 'Return to Field Club', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Continue club visit', exact: false }).click();
    await page.getByRole('button', { name: 'Begin Agility round', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Leave this visit', exact: true }).click();
    await page.getByRole('button', { name: 'End visit and return to club', exact: true }).click();
    assert.equal((await savedState()).tutorialProgress.fieldClub.records[first.dogs[0].id].agility, undefined);
    console.log(label, 'agility launch, cancellation and IndexedDB resume passed');
    await context.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  await page?.screenshot({ path: '.browser.local/club-failure.png' }).catch(() => {});
  throw error;
} finally { await browser.close(); }
