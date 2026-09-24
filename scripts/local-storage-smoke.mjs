import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const context = await browser.newContext();
const requests = [], errors = [];
async function waitForState(page, predicate) {
  for (let i = 0; i < 100; i++) {
    if (await page.evaluate(predicate)) return;
    await page.waitForTimeout(100);
  }
  throw new Error('Game state did not become ready');
}
await context.route('**/*', route => {
  if (new URL(route.request().url()).hostname.includes('supabase')) { requests.push(route.request().url()); return route.abort(); }
  return route.continue();
});
try {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => { if(response.status() >= 400) console.log(response.url(), (await response.text()).slice(0,1500)); });
  page.on('console', msg => { if (msg.type() === 'error' || msg.text().includes('STORE')) console.log(msg.text()); });
  await page.goto('http://127.0.0.1:5173/');
  await waitForState(page, async () => (await import('/src/stores/gameStore.ts')).useGameStore.getState().user.id === 'local-player');
  const original = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/stores/gameStore.ts');
    const { generateDog } = await import('/src/utils/dogGenerator.ts');
    const { rescueBreeds } = await import('/src/data/rescueBreeds.ts');
    const storage = await import('/src/lib/storage/localDatabase.ts');
    const dog = generateDog(rescueBreeds[0], 'Local Scout', 'local-player', true, 'male');
    useGameStore.getState().addDog(dog);
    useGameStore.getState().setHasAdoptedFirstDog(true);
    useGameStore.getState().updateUserCash(123);
    await storage.flushLocalSave();
    return JSON.parse(await storage.exportLocalSave());
  });
  await page.reload();
  await page.waitForTimeout(500);
  await waitForState(page, async () => (await import('/src/stores/gameStore.ts')).useGameStore.getState().dogs.length === 1);
  const restored = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/stores/gameStore.ts');
    return { cash: useGameStore.getState().user.cash, name: useGameStore.getState().dogs[0].name };
  });
  assert.equal(restored.name, 'Local Scout');
  assert.equal(restored.cash, original.snapshot.state.user.cash);
  await page.evaluate(async original => {
    const storage = await import('/src/lib/storage/localDatabase.ts');
    const { useGameStore } = await import('/src/stores/gameStore.ts');
    useGameStore.getState().resetGame();
    await storage.flushLocalSave();
    if (useGameStore.getState().dogs.length) throw Error('reset failed');
    let rejected = false;
    try { await storage.importLocalSave('{"format":"invalid"}'); } catch { rejected = true; }
    if (!rejected) throw Error('invalid backup accepted');
    await storage.importLocalSave(JSON.stringify(original));
  }, original);
  await page.reload();
  await waitForState(page, async () => (await import('/src/stores/gameStore.ts')).useGameStore.getState().dogs[0]?.name === 'Local Scout');
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:5173/');
  await other.getByText('Your local save could not be opened.', { exact: false }).waitFor();
  await other.close();
  const legacyContext = await browser.newContext();
  await legacyContext.addInitScript(snapshot => {
    if (!localStorage.getItem('migration-seeded')) {
      localStorage.setItem('paws-and-pedigrees-storage', JSON.stringify(snapshot));
      localStorage.setItem('migration-seeded', 'true');
    }
  }, original.snapshot);
  const legacy = await legacyContext.newPage();
  await legacy.goto('http://127.0.0.1:5173/');
  await waitForState(legacy, async () => (await import('/src/stores/gameStore.ts')).useGameStore.getState().dogs[0]?.name === 'Local Scout');
  assert.equal(await legacy.evaluate(() => !!localStorage.getItem('paws-and-pedigrees-storage')), true);
  await legacyContext.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  console.log('Local database: fresh startup, dog/cash reload, reset, backup round trip, invalid backup rejection, legacy migration, and second-tab protection passed. No Supabase requests or page exceptions.');
} finally { await browser.close(); }
