// Browser check of the later game: the Hollowmere Cup, the vet, the breeders' market, Grandpa's
// torn pages, retirement and Wren. Usage: dev server on :5180, then `node scripts/latergame-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'later';
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

const state = () =>
  page.evaluate(() => {
    const s = window.__game.useApp.getState();
    return { panel: s.panel, screen: s.screen.kind, dialog: !!s.dialog, day: s.game?.day };
  });
const patch = (fn) =>
  page.evaluate(`(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  (${fn.toString()})(g);
  app.setState({ game: g });
})()`);
const openVan = async () => {
  await walkTo(24, 69);
  await page.keyboard.press('KeyE');
  await wait(400);
};
const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await wait(1100);
    await finishDialogs();
    if ((await panel()) === 'season') await clickButton('On to');
    await closeIntro();
    const s = await state();
    if (!s.dialog && !s.panel) break;
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

// Tester tools: skip the first week, then set up a kennel of three on the eve of the Cup.
await page.keyboard.press('Escape');
await wait(300);
await shot('menu');
await clickButton('Skip the first week');
await wait(1500);
await patch((g) => {
  const names = ['Bess', 'Rex', 'Fern'];
  const first = g.dogs[0];
  first.name = names[0];
  first.sex = 'female';
  for (let i = 1; i < 3; i++) {
    const d = structuredClone(first);
    d.id = `test-dog-${i}`;
    d.name = names[i];
    d.sex = i === 1 ? 'male' : 'female';
    g.dogs.push(d);
  }
  for (const d of g.dogs)
    g.pedigree[d.id] = {
      id: d.id,
      name: d.name,
      sex: d.sex,
      kennel: 'Larchwood Rescue',
      coat: '',
      breed: '',
      titles: [],
      inbreeding: 0,
    };
  g.shelter = [];
  g.day = 27;
  g.money = 900;
  g.food = 40;
  g.season.startDay = 22;
  for (const d of g.dogs) {
    d.ageMonths = 30;
    d.energy = 100;
    d.fullness = 90;
  }
});
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Train every dog to 75%');
await wait(300);
await clickButton('Skip a day');
await wait(1500);
if ((await panel()) === 'menu') await page.keyboard.press('Escape');
await settle();
console.log('cup morning', JSON.stringify(await state()));

// The Hollowmere Cup.
await openVan();
await shot('van-cup-day');
await page
  .locator('.row', { hasText: 'Hollowmere Cup' })
  .getByRole('button', { name: 'Enter' })
  .click();
await wait(2200);
await finishDialogs();
await wait(600);
await shot('cup-pick-1');
console.log('pick', JSON.stringify(await state()));
const send = async (nth) => {
  await page
    .getByRole('button', { name: /^Send / })
    .nth(nth)
    .click();
  await wait(2400);
  await closeIntro();
  await finishDialogs();
  await wait(500);
};
// Rounds 1 and 2: field work (retire from each; the field rounds have their own checks).
for (const round of [1, 2]) {
  await send(0);
  if (round === 1) await shot('cup-round-1');
  await clickButton('Leave');
  await wait(2000);
  await clickButton(round === 4 ? 'Final standings' : 'Next round');
  await wait(1600);
}
await shot('cup-pick-3');
await send(1);
await shot('cup-agility-ready');
console.log('cup agility', JSON.stringify(await runCourse('cup')));
await wait(1700);
await clickButton('Next round');
await wait(1600);
await send(1);
await shot('cup-sheep-ready');
console.log('cup sheep', JSON.stringify(await workSheep('cup')));
await wait(1900);
await clickButton('Final standings');
await wait(1500);
await shot('cup-standings');
await clickButton('Head home');
await settle();
await shot('cup-home');

// The vet.
await openVan();
await page.locator('.row', { hasText: 'The vet' }).getByRole('button').click();
await wait(400);
await page
  .getByRole('button', { name: /Check-up/ })
  .first()
  .click();
await wait(600);
await shot('vet');
await clickButton('Drive home');
await wait(400);

// Monday: the breeders' market.
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Skip a day');
await wait(1500);
if ((await panel()) === 'menu') await page.keyboard.press('Escape');
await settle();
await openVan();
await page.locator('.row', { hasText: "Breeders' market" }).getByRole('button').click();
await wait(400);
await shot('market');
await page.locator('.row').getByRole('button', { name: 'Buy' }).first().click();
await settle();
await shot('market-home');
console.log(
  'kennel',
  JSON.stringify(
    await page.evaluate(() =>
      window.__game.useApp.getState().game.dogs.map((d) => [d.name, d.ageMonths, d.origin]),
    ),
  ),
);

// A torn page turns up after a restoration.
await patch((g) => {
  g.flags.push('restored:whelpingRoom');
});
await openVan();
await page.locator('.row', { hasText: 'The vet' }).getByRole('button').click();
await wait(300);
await page
  .getByRole('button', { name: /Check-up/ })
  .first()
  .click();
await wait(400);
await clickButton('Drive home');
await wait(2600);
await shot('torn-page-dialog');
await finishDialogs();
await wait(300);

// Retirement.
await patch((g) => {
  g.dogs[0].ageMonths = 100;
  g.dogs[0].titles = ['novice'];
});
await walkTo(-16, 56.4);
await page.keyboard.press('KeyE');
await wait(400);
await clickButton("Grandpa's office");
await wait(300);
await page.getByRole('button', { name: 'Torn pages' }).click();
await wait(200);
await shot('office-pages');
await page.locator('.tabs').getByRole('button', { name: 'Bess' }).click();
await wait(200);
await shot('office-old-dog');
await clickButton('Retire Bess');
await settle();
await wait(800);
await shot('retired-by-the-door');

// Wren.
await patch((g) => {
  g.ledger = ['litter', 'offer', 'winter', 'homes', 'sorry'];
  g.flags.push('practised:herding');
});
await openVan();
await clickButton('See the work');
await wait(400);
await shot('fell-sam');
await clickButton('Show him');
await wait(2200);
await shot('wren-dialog');
await settle();
await walkTo(-16, 56.4);
await page.keyboard.press('KeyE');
await wait(400);
await clickButton("Grandpa's office");
await wait(300);
await page.locator('.tabs').getByRole('button', { name: 'Wren' }).click();
await wait(200);
await page.locator('.panel').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await wait(200);
await shot('wren-pedigree');
console.log(
  'end',
  JSON.stringify(
    await page.evaluate(() => {
      const g = window.__game.useApp.getState().game;
      return {
        day: g.day,
        money: g.money,
        rep: g.reputation,
        dogs: g.dogs.map((d) => `${d.name}${d.retired ? ' (retired)' : ''}`),
        ledger: g.ledger,
        cup: g.trials
          .filter((t) => t.kind === 'cup')
          .map((t) => [t.placing, t.entries.map((e) => `${e.kennel} ${e.total}`)]),
      };
    }),
  ),
);
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
