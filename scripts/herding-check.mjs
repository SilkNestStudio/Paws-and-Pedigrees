// Browser check of sheep work: practise at Fell Top by pressing the suggested command,
// then enter the Saturday sheepdog trial. Usage: dev server on :5180, then `node scripts/herding-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'herding';
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
// Past the first week, with a dog that knows a little agility and money for the ring.
await page.evaluate(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  const dog = g.shelter[0];
  g.dogs.push(dog);
  g.activeDogId = dog.id;
  g.shelter = [];
  g.kennelName = 'Test';
  g.story = 'afterFunDay';
  g.funDay = { entries: [], bestRound: 'mark' };
  g.day = 12;
  g.block = 'morning';
  g.money = 400;
  g.food = 20;
  g.flags.push('intro:trials', 'saw:office');
  dog.skills.herd = 0.45;
  app.setState({ game: g });
});
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Skip a day');
await wait(1500);
if ((await panel()) === 'menu') await page.keyboard.press('Escape');
await wait(600);
if ((await panel()) === 'season') await clickButton('On to');
await wait(400);
await finishDialogs();
await closeIntro();
console.log('day', await page.evaluate(() => window.__game.useApp.getState().game.day));

/** Works the sheep by pressing whichever command the game suggests. */
async function workSheep(name) {
  let shots = 0;
  for (let i = 0; i < 900; i++) {
    const s = await page.evaluate(() => {
      const h = window.__game.live.herding;
      return h ? { phase: h.phase, task: h.task, t: h.time, penned: h.stats.penned } : null;
    });
    if (!s || s.phase === 'complete') break;
    const suggested = page.locator('.action.suggested');
    if (await suggested.count())
      await suggested
        .first()
        .click({ timeout: 800 })
        .catch(() => {});
    if (i % 60 === 25 && shots < 5) {
      shots++;
      await shot(`${name}-task-${s.task + 1}`);
    }
    await wait(350);
  }
  return page.evaluate(() => {
    const h = window.__game.live.herding;
    return h ? { phase: h.phase, t: Math.round(h.time), stats: h.stats } : null;
  });
}

await walkTo(24, 69);
await page.keyboard.press('KeyE');
await wait(400);
await shot('van');
await clickButton('See the work');
await wait(300);
await shot('fell-panel');
await page
  .locator('.row', { hasText: 'Gather and pen' })
  .getByRole('button', { name: 'Go' })
  .click();
await wait(2200);
await shot('intro');
await closeIntro();
await wait(800);
await shot('ready');
console.log('practice', JSON.stringify(await workSheep('practice')));
await wait(1800);
await shot('result');
console.log('panel', await panel());
await clickButton('Back home');
await wait(2000);

// The Saturday sheepdog trial.
await page.evaluate(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  g.dogs[0].energy = 100;
  g.block = 'morning';
  app.setState({ game: g });
});
await walkTo(24, 69);
await page.keyboard.press('KeyE');
await wait(400);
await page
  .locator('.row', { hasText: 'sheepdog trial' })
  .getByRole('button', { name: 'Enter' })
  .click();
await wait(2400);
await finishDialogs();
await closeIntro();
await wait(600);
await shot('trial-ready');
console.log('trial run 1', JSON.stringify(await workSheep('trial1')));
await wait(1800);
await shot('trial-result-1');
await clickButton('Next round');
await wait(2400);
console.log('trial run 2', JSON.stringify(await workSheep('trial2')));
await wait(1800);
await clickButton('Final standings');
await wait(1500);
await shot('standings');
await clickButton('Head home');
await wait(2000);
await finishDialogs();
console.log(
  'after',
  JSON.stringify(
    await page.evaluate(() => {
      const g = window.__game.useApp.getState().game;
      const d = g.dogs[0];
      return {
        day: g.day,
        block: g.block,
        skill: d.skills.herd,
        q: d.sportQualifiers,
        trials: g.trials.map((t) => [
          t.name,
          t.placing,
          t.qualified,
          t.entries.map((e) => e.total),
        ]),
      };
    }),
  ),
);
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
