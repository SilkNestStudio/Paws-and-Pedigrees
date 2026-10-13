// Browser check of the working day: lesson after lesson until the dog is worn out (energy, not
// the clock, is the limit), then a second dog with its own energy.
// Usage: dev server on :5180, then `node scripts/energy-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'energy';
const phone = process.argv.includes('--phone');
mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const context = await browser.newContext(
  phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } },
);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on(
  'console',
  (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()),
);
let n = 0;
const shot = async (name) => {
  n++;
  await page.screenshot({
    path: `.browser.local/${label}-${String(n).padStart(2, '0')}-${name}.png`,
  });
};
const wait = (ms) => page.waitForTimeout(ms);
const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
const panel = () => page.evaluate(() => window.__game.useApp.getState().panel);
const closeIntro = async () => {
  for (let i = 0; i < 3 && (await panel()) === 'intro'; i++) {
    await clickButton('Got it');
    await wait(250);
  }
};
const finishDialogs = async () => {
  for (
    let i = 0;
    i < 12 && (await page.evaluate(() => !!window.__game.useApp.getState().dialog));
    i++
  ) {
    await page.keyboard.press('Space');
    await wait(150);
  }
};
const walkTo = async (x, z) => {
  for (let i = 0; i < 140; i++) {
    const k = await page.evaluate(() => window.__game.live.home?.keeper.pos ?? null);
    if (k && Math.hypot(k.x - x, k.z - z) < 0.9) return;
    await page.evaluate(([x, z]) => window.__tap({ x, z }), [x, z]);
    await wait(250);
  }
};

const info = () =>
  page.evaluate(() => {
    const s = window.__game.useApp.getState();
    const g = s.game;
    const d = g.dogs.find((x) => x.id === g.activeDogId);
    return {
      block: g.block,
      dog: d.name,
      energy: Math.round(d.energy),
      fed: Math.round(d.fullness),
      panel: s.panel,
      screen: s.screen.kind,
    };
  });

await page.goto('http://127.0.0.1:5180/');
await page.evaluate(() => indexedDB.deleteDatabase('paws-rebuild'));
await page.reload();
await wait(2500);
await clickButton('Begin');
await wait(600);
await clickButton('Continue');
await wait(300);
await clickButton('Continue');
await wait(300);
await clickButton('Go to the kennel');
await wait(1200);
await finishDialogs();
await closeIntro();
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Skip the first week');
await wait(1800);
await page.evaluate(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  const second = structuredClone(g.dogs[0]);
  second.id = 'test-second';
  second.name = 'Second';
  second.energy = 100;
  g.dogs.push(second);
  g.pedigree[second.id] = {
    id: second.id,
    name: 'Second',
    sex: second.sex,
    kennel: 'Larchwood Rescue',
    coat: '',
    breed: '',
    titles: [],
    inbreeding: 0,
  };
  g.dogs[0].energy = 100;
  g.dogs[0].fullness = 100;
  g.flags.push('intro:lesson');
  app.setState({ game: g });
});
console.log('start', JSON.stringify(await info()));

// Lesson after lesson, ending each straight away, until the dog has nothing left.
let lessons = 0;
for (let i = 0; i < 10; i++) {
  await walkTo(0, 46.3);
  await page.keyboard.press('KeyE');
  await wait(400);
  if ((await panel()) !== 'fieldGate') break;
  const train = page
    .locator('.row', { hasText: 'Sit on cue' })
    .getByRole('button', { name: 'Train' });
  // Worn out: the button is off and the panel says why.
  if (await train.isDisabled()) {
    await shot('worn-out');
    console.log(
      'blocked',
      JSON.stringify(await info()),
      await page.locator('.panel .blocked').textContent(),
    );
    break;
  }
  await train.click();
  await wait(1700);
  await closeIntro();
  const now = await info();
  if (now.screen !== 'lesson') {
    await shot('worn-out');
    console.log('blocked', JSON.stringify(now));
    break;
  }
  lessons++;
  await clickButton('Finish');
  await wait(1600);
  await clickButton('Back home');
  await wait(1900);
  console.log(`after lesson ${lessons}`, JSON.stringify(await info()));
}
await wait(400);
await walkTo(0, 46.3);
await page.keyboard.press('KeyE');
await wait(500);
await shot('gate-when-tired');
await page.keyboard.press('Escape');
await wait(300);

// The other dog still has a full day in it.
await walkTo(10, 53.3);
await page.keyboard.press('KeyE');
await wait(500);
await shot('kennel-runs');
await page.locator('.row', { hasText: 'Second' }).getByRole('button', { name: 'Take out' }).click();
await wait(2200);
await walkTo(0, 46.3);
await page.keyboard.press('KeyE');
await wait(400);
await page
  .locator('.row', { hasText: 'Sit on cue' })
  .getByRole('button', { name: 'Train' })
  .click();
await wait(1700);
console.log('second dog', JSON.stringify(await info()));
await clickButton('Finish');
await wait(1600);
await clickButton('Back home');
await wait(1900);

// The farmhouse: a rest, then bed.
await walkTo(-16, 56.4);
await page.keyboard.press('KeyE');
await wait(500);
await shot('farmhouse');
console.log('lessons with the first dog', lessons);
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
