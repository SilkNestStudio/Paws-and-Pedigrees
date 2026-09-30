import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const errors = [];
let page;
const scene = name => page.locator(`[data-scene=${name}]`);
async function lastRound() {
  // Persist an explicit three-result fixture. The final round is played through UI;
  // all four domain receipts and resource costs are exercised in the unit tests.
  await page.evaluate(async () => {
    const { localDatabase, flushLocalSave } = await import('/src/lib/storage/localDatabase.ts');
    await flushLocalSave();
    const key = 'paws-and-pedigrees-storage';
    const saved = JSON.parse(await localDatabase.getItem(key));
    const run = saved.state.tutorialProgress.fieldClub.active;
    if (!run) throw Error('The event did not start');
    run.results = run.rounds.slice(0, 3).map((round, i) => ({ ...round, score: [78, 85, 72][i], dogName: saved.state.dogs.find(d => d.id === round.dogId).name, gain: 0 }));
    await localDatabase.setItem(key, JSON.stringify(saved));
    await flushLocalSave();
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue club visit', exact: false }).click();
  await page.getByRole('button', { name: 'Begin Water retrieval round', exact: true }).click();
  await page.getByRole('button', { name: 'Begin round', exact: true }).click();
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: `Retrieve dummy ${i}`, exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.field-game').dataset.carrying === 'true', null, { timeout: 30000 });
    await page.getByRole('button', { name: 'Call back to shore', exact: true }).click();
    await page.waitForFunction(n => Number(document.querySelector('.field-game').dataset.count) === n, i, { timeout: 30000 });
  }
  await page.getByRole('button', { name: 'Save round & continue', exact: true }).click();
  await page.getByRole('table').waitFor();
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: 'Meet your first companion', exact: false }).waitFor();
    await page.evaluate(async () => {
      const { useGameStore } = await import('/src/stores/gameStore.ts');
      const { generateDog } = await import('/src/utils/dogGenerator.ts');
      const { rescueBreeds } = await import('/src/data/rescueBreeds.ts');
      const { newClubProgress, DISCIPLINES } = await import('/src/game/club/model.ts');
      const { flushLocalSave } = await import('/src/lib/storage/localDatabase.ts');
      const state = useGameStore.getState();
      const dog = { ...generateDog(rescueBreeds[1], 'Scout', state.user.id, true, 'male'), hunger: 100, thirst: 100, health: 100, energy_stat: 100, training_points: 100 };
      const progress = newClubProgress();
      progress.records[dog.id] = Object.fromEntries(DISCIPLINES.map(d => [d, { xp: 20, sessions: 1, best: 75, last: 75 }]));
      useGameStore.setState({ dogs: [dog], hasAdoptedFirstDog: true, activeTutorial: null, tutorialProgress: { ...state.tutorialProgress, firstRibbon: undefined, fieldClub: progress } });
      await flushLocalSave();
    });
    await page.reload();
    await page.getByRole('button', { name: 'Visit the Field Club', exact: false }).click();
    await page.getByRole('button', { name: 'Enter combined trial', exact: true }).first().click();
    await lastRound();
    await page.getByText('$150 first-completion grant added to your kennel.', { exact: true }).waitFor();
    assert.equal(await page.getByText('Daily Reward!', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('row').count(), 5);
    await page.screenshot({ path: `.browser.local/club-combined-${mobile ? 'landscape' : 'desktop'}.png` });
    await page.getByRole('button', { name: 'Meet another rescue · adoption $100', exact: true }).click();
    await scene('shop').waitFor();
    page.once('dialog', d => d.accept('Maple'));
    await page.getByRole('button', { name: 'Adopt for $100', exact: true }).first().click();
    await page.getByRole('navigation', { name: 'Return controls' }).getByRole('button', { name: 'Back to the Field Club', exact: true }).click();
    const secondId = await page.getByLabel('Scent search teammate', { exact: true }).locator('option').filter({ hasText: 'Maple' }).getAttribute('value');
    await page.getByLabel('Scent search teammate', { exact: true }).selectOption(secondId);
    const firstId = await page.getByLabel('Agility teammate', { exact: true }).locator('option').filter({ hasText: 'Scout' }).getAttribute('value');
    for (const name of ['Agility', 'Herding', 'Water retrieval']) await page.getByLabel(`${name} teammate`, { exact: true }).selectOption(firstId);
    await page.getByRole('button', { name: 'Enter team trial', exact: true }).click();
    // Newly adopted dogs may need care before event entry; prepare through the actual panel.
    if (!await page.getByRole('region', { name: 'Current club visit' }).count()) {
      await page.getByLabel('Field Club companion', { exact: true }).selectOption(secondId);
      await page.locator('.club-care summary').click();
      await page.getByRole('button', { name: 'Buy 10 food · $40', exact: true }).click();
      for (const name of [/Serve meal/, /Fresh water/, /Rest together/]) {
        const button = page.locator('.club-care').getByRole('button', { name });
        if (await button.isEnabled()) await button.click();
      }
      await page.getByRole('button', { name: 'Enter team trial', exact: true }).click();
    }
    await page.getByRole('region', { name: 'Current club visit' }).waitFor();
    assert.match(await page.locator('.club-round-board').textContent(), /Maple/);
    await lastRound();
    await page.getByText('$120 first-completion grant added to your kennel.', { exact: true }).waitFor();
    assert.match(await page.locator('.club-result-rounds').textContent(), /Maple/);
    await page.getByRole('button', { name: 'Explore breeding readiness', exact: true }).click();
    await scene('breeding').waitFor();
    await page.getByRole('navigation', { name: 'Return controls' }).getByRole('button', { name: 'Back to the Field Club', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Visit the Field Club', exact: false }).click();
    await page.getByText('$120 first-completion grant added to your kennel.', { exact: true }).waitFor();
    console.log(mobile ? 'Phone landscape' : 'Desktop', 'combined final round, grant, adoption, team roster/final round, breeding return, persistence passed');
    await context.close();
  }
  assert.deepEqual(errors, []);
} catch (error) { await page?.screenshot({ path: '.browser.local/club-events-failure.png' }).catch(() => {}); throw error; }
finally { await browser.close(); }
