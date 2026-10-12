// Browser check of agility: restore the ring, run a practice course with real key presses,
// then enter the Saturday show. Usage: dev server on :5180, then `node scripts/agility-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'agility';
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

/** Runs the course the way a player would: W to run, A/D to turn, toward each number in turn. */
async function runCourse(name) {
  const held = new Set();
  const hold = async (key, on) => {
    if (on && !held.has(key)) {
      held.add(key);
      await page.keyboard.down(key);
    } else if (!on && held.has(key)) {
      held.delete(key);
      await page.keyboard.up(key);
    }
  };
  await page.keyboard.press('Space');
  let shots = 0;
  for (let i = 0; i < 700; i++) {
    const s = await page.evaluate(() => {
      const a = window.__game.live.agility;
      if (!a) return null;
      const list = a.course.obstacles;
      const committed = a.state === 'commit' && a.target?.index === a.next;
      const goal = list[Math.min(list.length - 1, committed ? a.next + 1 : a.next)];
      return {
        phase: a.phase,
        next: a.next,
        k: a.keeper.pos,
        h: a.keeper.heading,
        goal,
        wrong: !!a.target && a.target.index !== a.next && a.state === 'seek',
        frame: committed && list[a.next].kind === 'frame',
        stats: a.stats,
      };
    });
    if (!s || s.phase === 'complete') break;
    const len = { jump: 0.5, tunnel: 4.5, weave: 5.4, frame: 4.2 }[s.goal.kind] / 2 + 1.1;
    const tx = Math.sin(s.goal.heading);
    const tz = Math.cos(s.goal.heading);
    const side = Math.sign((s.k.x - s.goal.pos.x) * -tz + (s.k.z - s.goal.pos.z) * tx) || 1;
    const spot = {
      x: s.goal.pos.x - tx * len + -tz * side * 1.5,
      z: s.goal.pos.z - tz * len + tx * side * 1.5,
    };
    const dx = spot.x - s.k.x;
    const dz = spot.z - s.k.z;
    const far = Math.hypot(dx, dz);
    const want = far > 0.7 ? Math.atan2(dx, dz) : s.goal.heading;
    let err = want - s.h;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    await hold('KeyA', err > 0.12);
    await hold('KeyD', err < -0.12);
    await hold('KeyW', far > 0.7 && Math.abs(err) < 1.1);
    await hold('ShiftLeft', far > 2);
    if (s.wrong) await page.keyboard.press('KeyR');
    if (s.frame) await page.keyboard.press('KeyF');
    if (i % 45 === 20 && shots < 4) {
      shots++;
      await shot(`${name}-run-${s.next + 1}`);
    }
    await wait(60);
  }
  for (const k of [...held]) await page.keyboard.up(k);
  return page.evaluate(() => {
    const a = window.__game.live.agility;
    return a ? { phase: a.phase, next: a.next, stats: a.stats } : null;
  });
}

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

// Practice at home.
await walkTo(0, 46.3);
await page.keyboard.press('KeyE');
await wait(400);
await clickButton('Agility');
await wait(200);
await shot('gate-locked');
await clickButton('Restore for $110');
await wait(500);
await shot('gate-courses');
await page
  .locator('.row', { hasText: 'First jumps' })
  .getByRole('button', { name: 'Run it' })
  .click();
await wait(1800);
await shot('intro');
await closeIntro();
await wait(600);
await shot('ready');
console.log('first jumps', JSON.stringify(await runCourse('first')));
await wait(1600);
await shot('result');
console.log('panel', await panel());
await clickButton('Enough for today');
await wait(1800);
await shot('home-with-ring');

// The full course.
await walkTo(0, 46.3);
await page.keyboard.press('KeyE');
await wait(400);
await clickButton('Agility');
await wait(200);
await page.evaluate(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  g.dogs[0].skills.agility = 0.5;
  g.dogs[0].energy = 100;
  g.block = 'morning';
  app.setState({ game: g });
});
await page
  .locator('.row', { hasText: 'Full course' })
  .getByRole('button', { name: 'Run it' })
  .click();
await wait(1800);
await closeIntro();
await shot('full-ready');
console.log('full course', JSON.stringify(await runCourse('full')));
await wait(1600);
await shot('full-result');
await clickButton('Enough for today');
await wait(1800);

// The Saturday show.
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
await shot('van');
await page
  .locator('.row', { hasText: 'agility show' })
  .getByRole('button', { name: 'Enter' })
  .click();
await wait(2200);
await finishDialogs();
await closeIntro();
await wait(500);
await shot('show-ready');
console.log('show round 1', JSON.stringify(await runCourse('show1')));
await wait(1600);
await shot('show-result-1');
await clickButton('Next round');
await wait(2200);
console.log('show round 2', JSON.stringify(await runCourse('show2')));
await wait(1600);
await clickButton('Final standings');
await wait(1500);
await shot('standings');
await clickButton('Head home');
await wait(2000);
await finishDialogs();
await shot('home-after');
console.log(
  'after',
  JSON.stringify(
    await page.evaluate(() => {
      const g = window.__game.useApp.getState().game;
      const d = g.dogs[0];
      return {
        day: g.day,
        block: g.block,
        skill: d.skills.agility,
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
