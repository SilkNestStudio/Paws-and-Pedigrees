// Browser check of the mark in a first Larkspur trial, over several different trial layouts: is
// the fall marked and visible, and does a dog sent to it find the dummy?
// Usage: dev server on :5180, then `node scripts/mark-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'mark';
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
await clickButton('Menu');
await wait(300);
await clickButton('Skip the first week');
await wait(1800);

for (const seed of [11, 222, 3333, 44444, 555555, 6666666]) {
  await page.evaluate((seed) => {
    const app = window.__game.useApp;
    const g = structuredClone(app.getState().game);
    g.seed = seed;
    g.day = 14;
    g.block = 'morning';
    g.money = 200;
    g.trials = [];
    g.dogs[0].energy = 100;
    g.dogs[0].fullness = 90;
    g.flags.push('intro:mark', 'intro:trials', 'intro:search', 'intro:blind');
    app.setState({ game: g, event: null });
  }, seed);
  await walkTo(24, 69);
  await page.keyboard.press('KeyE');
  await wait(500);
  await page
    .locator('.row', { hasText: 'Larkspur trial ground' })
    .getByRole('button', { name: 'Enter' })
    .click();
  await wait(2400);
  await finishDialogs();
  await closeIntro();
  await wait(500);
  await page.keyboard.press('KeyT');
  // Wait for the fall.
  let item = null;
  for (let i = 0; i < 40; i++) {
    await wait(300);
    item = await page.evaluate(() => {
      const f = window.__game.live.field;
      const it = f?.items.find((i) => i.kind === 'mark');
      return it
        ? {
            state: it.state,
            pos: it.pos,
            landing: it.landing,
            hidden: it.hiddenInCover,
            phase: f.phase,
            mode: f.dog.mode,
          }
        : null;
    });
    if (item?.state === 'lying') break;
  }
  await wait(1200);
  await shot(`seed-${seed}-fallen`);
  const labels = await page.locator('.target-label, .target-edge').allTextContents();
  console.log(`seed ${seed}: item`, JSON.stringify(item), 'labels', JSON.stringify(labels));
  if (!item) continue;
  // Send the dog to where it fell.
  const before = await page.evaluate(() => window.__game.live.field.dog.mode);
  await page.evaluate((p) => window.__tap(p), item.landing);
  let found = null;
  const modes = new Set([before]);
  for (let i = 0; i < 130; i++) {
    await wait(400);
    const s = await page.evaluate(() => {
      const f = window.__game.live.field;
      if (!f) return null;
      const it = f.items.find((i) => i.kind === 'mark');
      return {
        phase: f.phase,
        mode: f.dog.mode,
        state: it.state,
        t: f.time,
        d: Math.hypot(f.dog.pos.x - it.pos.x, f.dog.pos.z - it.pos.z),
        events: f.events.slice(-3).map((e) => e.text),
      };
    });
    if (!s) break;
    modes.add(s.mode);
    if (i === 12) await shot(`seed-${seed}-working`);
    if (s.state !== 'lying' || s.phase === 'complete') {
      found = s;
      break;
    }
    if (i === 129) found = { ...s, timedOut: true };
  }
  console.log(`   outcome`, JSON.stringify(found), 'modes', [...modes].join(','));
  // Leave the event and go home for the next layout.
  await clickButton('Leave').catch(() => {});
  await wait(2000);
  for (let k = 0; k < 6; k++) {
    const p = await panel();
    if (p === 'result') {
      // Retire from the remaining rounds.
      await page.getByRole('button', { name: /Next round|Final standings/ }).click();
      await wait(2000);
      if ((await panel()) === null) {
        await clickButton('Leave').catch(() => {});
        await wait(1800);
      }
    } else if (p === 'standings') {
      await clickButton('Head home');
      await wait(2200);
      await finishDialogs();
      break;
    } else {
      await wait(600);
    }
  }
  await finishDialogs();
}
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
