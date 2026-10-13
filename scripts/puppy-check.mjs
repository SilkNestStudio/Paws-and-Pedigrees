// Raises a litter in a real browser with screenshots: a raising session, then evaluation day.
// Usage: dev server on :5180, then `node scripts/puppy-check.mjs [label] [phone]`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'puppies';
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
  // A torn page of Grandpa's ledger may be read out first; let it finish.
  await wait(1200);
  await finishDialogs();
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
await page.keyboard.press('Escape');
await wait(300);
await menu('Skip to the litter');
await finishDialogs();
await wait(600);
await shot('litter-with-raising');

const pupState = () =>
  page.evaluate(() => {
    const s = window.__game.live.puppies;
    if (!s) return null;
    const r = s.round;
    return {
      phase: s.phase,
      round: r ? { phase: r.phase, willGo: r.willGo, response: r.response, easy: r.easy } : null,
      done: s.results.length,
    };
  });

// A raising session: read each puppy and answer.
await page.getByRole('button', { name: /New sights and sounds/ }).click();
await wait(1800);
if ((await panel()) === 'intro') {
  await shot('raising-intro');
  await clickButton('Got it');
}
const seen = new Set();
for (let i = 0; i < 900; i++) {
  const s = await pupState();
  if (!s || s.phase === 'done' || (await panel()) === 'result') break;
  const r = s.round;
  if (r && s.phase === 'round') {
    if (!seen.has(r.phase) && ['hesitate', 'cower', 'reached', 'approach'].includes(r.phase)) {
      seen.add(r.phase);
      await wait(700);
      await shot(`raising-${r.phase}`);
    }
    if (r.phase === 'reached') await page.keyboard.press('Space');
    else if ((r.phase === 'cower' || (r.phase === 'hesitate' && !r.willGo)) && !r.easy)
      await page.keyboard.press('KeyX');
  }
  await wait(150);
}
for (let i = 0; i < 40 && (await panel()) !== 'result'; i++) await wait(250);
await shot('raising-result');
await clickButton('Back home');
await wait(1500);
console.log(
  'after raising',
  JSON.stringify(
    await page.evaluate(() =>
      window.__game.useApp
        .getState()
        .game.litters[0].puppies.map((p) => `${p.name}:${JSON.stringify(p.rearing ?? {})}`),
    ),
  ),
);

// Evaluation day, once the puppies can leave.
await menu('Skip until the puppies can leave');
await finishDialogs();
if ((await panel()) === 'season') await clickButton('On to');
await wait(400);
if ((await panel()) === 'breeding') await page.keyboard.press('Escape');
await walkTo(31, 50.6);
await page.keyboard.press('KeyE');
await wait(600);
await shot('litter-ready');
await clickButton('Hold evaluation day');
await wait(1800);
if ((await panel()) === 'intro') {
  await shot('evaluation-intro');
  await clickButton('Got it');
}
let shotEval = false;
for (let i = 0; i < 1500; i++) {
  const s = await pupState();
  if (!s || s.phase === 'done' || (await panel()) === 'result') break;
  const r = s.round;
  if (r && s.phase === 'round' && r.phase !== 'notice') {
    await wait(900);
    if (!shotEval) {
      shotEval = true;
      await shot('evaluation-reading');
    }
    // Read most puppies right, a few wrong, like a careful beginner.
    const wrong = i % 5 === 0;
    const key = { keen: 'Digit1', unsure: 'Digit2', worried: 'Digit3' }[
      wrong ? 'unsure' : r.response
    ];
    await page.keyboard.press(key);
  }
  await wait(150);
}
for (let i = 0; i < 40 && (await panel()) !== 'result'; i++) await wait(250);
await shot('evaluation-result');
await clickButton('Back home');
await wait(1500);
await walkTo(31, 50.6);
await page.keyboard.press('KeyE');
await wait(600);
await shot('litter-evaluated');
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
