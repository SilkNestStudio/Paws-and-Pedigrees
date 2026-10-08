// Walks through breeding in a real browser with screenshots: restore the whelping room,
// plan a litter with a stud, DNA test, whelp, see the puppies, keep and place them.
// Usage: dev server on :5180, then `node scripts/breeding-check.mjs [label] [phone]`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'breeding';
const phone = process.argv[3] === 'phone';
mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (
  await browser.newContext(
    phone
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 2,
        }
      : { viewport: { width: 1440, height: 900 } },
  )
).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on(
  'console',
  (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()),
);
const wait = (ms) => page.waitForTimeout(ms);
const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
const panel = () => page.evaluate(() => window.__game.useApp.getState().panel);
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
let n = 0;
const shot = async (name) => {
  n++;
  await page.screenshot({
    path: `.browser.local/${label}-${String(n).padStart(2, '0')}-${name}.png`,
  });
};
const walkTo = async (x, z) => {
  for (let i = 0; i < 120; i++) {
    const k = await page.evaluate(() => window.__game.live.home?.keeper.pos ?? null);
    if (k && Math.hypot(k.x - x, k.z - z) < 0.9) return;
    await page.evaluate(([x, z]) => window.__tap({ x, z }), [x, z]);
    await wait(250);
  }
};
const menu = async (button) => {
  await page.keyboard.press('Escape');
  await wait(300);
  await clickButton(button);
  await wait(1500);
};

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
if ((await panel()) === 'intro') await clickButton('Got it');
await menu('Adopt the first dog now');
await finishDialogs();
// A grown female after the first week, with money for the stud.
await page.evaluate(() => {
  const s = window.__game.useApp.getState();
  const g = structuredClone(s.game);
  g.dogs[0].sex = 'female';
  g.dogs[0].ageMonths = 30;
  g.dogs[0].name = 'Bess';
  g.money = 900;
  g.food = 40;
  g.story = 'afterFunDay';
  g.funDay = { entries: [], bestRound: 'mark' };
  window.__game.useApp.setState({ game: g });
});
await menu('Skip a day');
await finishDialogs();
await walkTo(31, 50.6);
await page.keyboard.press('KeyE');
await wait(500);
await shot('whelping-room');
await clickButton('Restore for $80');
await wait(800);
if ((await panel()) === 'intro') {
  await shot('breeding-intro');
  await clickButton('Got it');
  await wait(400);
}
await shot('plan-empty');
await page.locator('.pick', { hasText: 'Hartley Rowan' }).click();
await wait(300);
await shot('plan-stud');
await clickButton('DNA test Bess');
await wait(500);
await shot('plan-forecast');
await clickButton('Breed (stud fee');
await wait(600);
await shot('in-whelp');
await page.keyboard.press('Escape');
await wait(300);
await menu('Skip to the litter');
await finishDialogs();
await wait(600);
await shot('litter-born');
console.log(
  'litter',
  JSON.stringify(
    await page.evaluate(() =>
      window.__game.useApp.getState().game.litters.map((l) => ({
        dam: l.damName,
        sire: l.sireName,
        pups: l.puppies.map((p) => p.name),
      })),
    ),
  ),
);
await clickButton('Close');
await wait(300);
await walkTo(31, 49.2);
await page.evaluate(() => {
  window.__game.live.home.keeper.heading = 0;
});
await wait(2500);
await shot('paddock-puppies');
await wait(2500);
await shot('paddock-puppies-2');
await menu('Skip until the puppies can leave');
await finishDialogs();
if ((await panel()) === 'season') {
  await shot('season-recap');
  await clickButton('On to');
  await wait(400);
}
await walkTo(31, 50.6);
await page.keyboard.press('KeyE');
await wait(600);
if ((await panel()) !== 'breeding') {
  await shot('no-breeding-panel');
  console.log(
    'panel',
    await panel(),
    JSON.stringify(await page.evaluate(() => window.__game.live.home?.keeper.pos)),
  );
}
await shot('puppies-ready');
const firstPup = page.locator('.puppy').first();
await firstPup.locator('input').fill('Legacy');
await firstPup.getByRole('button', { name: 'Keep' }).click();
await wait(400);
await page.locator('.puppy').first().getByRole('button', { name: /Place/ }).click();
await wait(400);
await shot('kept-and-placed');
await clickButton('Close');
await walkTo(-16, 57.2);
await page.keyboard.press('KeyE');
await wait(600);
await finishDialogs();
await wait(400);
if ((await panel()) === 'bed') {
  await shot('farmhouse');
  await clickButton("Grandpa's office");
  await wait(300);
}
await clickButton('Legacy');
await wait(300);
await shot('ledger-pedigree');
const end = await page.evaluate(() => {
  const g = window.__game.useApp.getState().game;
  return { dogs: g.dogs.map((d) => d.name), money: g.money, placed: g.litters[0]?.placed.length };
});
console.log('end', JSON.stringify(end));
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
