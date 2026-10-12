// Browser check of kennel life: a visitor at the gate, dogs greeting you from their runs, a
// photograph, the album and trophy shelf, and the handbook. Usage: dev server on :5180, then
// `node scripts/life-check.mjs` (add --phone for a phone-sized screen).
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? 'life';
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

const patch = (fn) =>
  page.evaluate(`(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  (${fn.toString()})(g);
  app.setState({ game: g });
})()`);
const tap = async (name) => page.getByRole('button', { name, exact: false }).first().click();
const openMenu = async () => {
  await tap('Menu');
  await wait(300);
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
for (
  let i = 0;
  i < 8 && (await page.evaluate(() => !!window.__game.useApp.getState().dialog));
  i++
) {
  await page.locator('.dialog-wrap').click();
  await wait(200);
}
await closeIntro();
await openMenu();
await shot('menu');
await tap('Skip the first week');
await wait(1800);
await patch((g) => {
  const first = g.dogs[0];
  for (let i = 1; i < 3; i++) {
    const d = structuredClone(first);
    d.id = `test-dog-${i}`;
    d.name = ['Rex', 'Fern'][i - 1];
    g.dogs.push(d);
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
  }
  g.dogs[0].titles = ['novice'];
  g.flags.push('visit:victor', 'visit:dora', 'restored:duckPond');
  g.food = 2;
});
await openMenu();
await tap('Skip a day');
await wait(1800);
if ((await panel()) === 'menu') await tap('Resume');
await wait(2500);
const dismiss = async () => {
  for (let i = 0; i < 12; i++) {
    await wait(500);
    if (!(await page.evaluate(() => !!window.__game.useApp.getState().dialog))) {
      if (i > 3) break;
      continue;
    }
    await page.locator('.dialog-wrap').click();
  }
};
await dismiss();
console.log('day', await page.evaluate(() => window.__game.useApp.getState().game.day));

// Dogs in the runs greet you.
await walkTo(12, 51.5);
await wait(900);
await shot('runs-greeting');

// Someone at the gate.
await walkTo(3, 71.6);
await wait(600);
await shot('visitor');
await tap('Talk to');
await wait(500);
await shot('visitor-talk');
for (
  let i = 0;
  i < 8 && (await page.evaluate(() => !!window.__game.useApp.getState().dialog));
  i++
) {
  await page.locator('.dialog-wrap').click();
  await wait(250);
}
await wait(600);

// A photograph, then the album.
await tap('Photo');
await wait(1200);
await walkTo(-16, 56.4);
await wait(300);
await tap('Go into the farmhouse');
await wait(500);
await shot('farmhouse');
await tap('Trophy shelf and album');
await wait(600);
await shot('album');
await tap('Back');
await wait(300);
await page.getByRole('button', { name: 'Not yet' }).click();
await wait(300);

// The handbook.
await openMenu();
await tap('How to play');
await wait(400);
await shot('handbook');
await tap('Close');
await wait(300);

// The van, regrouped.
await walkTo(24, 69);
await wait(300);
await tap('Get in the van');
await wait(500);
await shot('van');
console.log(
  'end',
  JSON.stringify(
    await page.evaluate(() => {
      const g = window.__game.useApp.getState().game;
      return {
        day: g.day,
        food: g.food,
        photos: g.photos.length,
        bytes: g.photos[0]?.image.length,
        flags: g.flags.filter((f) => f.startsWith('mara:') || f.startsWith('visit')),
      };
    }),
  ),
);
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
