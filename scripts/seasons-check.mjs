// Browser check of the seasons' looks and the beach: a picture of home in each season, then a
// water mark at Sandy Cove. Usage: dev server on :5180, then `node scripts/seasons-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'seasons';
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
await walkTo(2, 62);
await walkTo(2, 52);
for (const [name, day] of [
  ['summer', 8],
  ['autumn', 15],
  ['winter', 22],
  ['spring', 29],
]) {
  await page.evaluate(`(() => {
    const app = window.__game.useApp;
    const g = structuredClone(app.getState().game);
    g.day = ${day};
    app.setState({ game: g });
  })()`);
  await wait(2200);
  await shot(`home-${name}`);
}

// The beach.
await patch((g) => {
  g.dogs[0].energy = 100;
  g.block = 'morning';
  g.flags.push('intro:water', 'intro:mark');
});
await walkTo(24, 69);
await page.keyboard.press('KeyE');
await wait(400);
await page.locator('.row', { hasText: 'Sandy Cove' }).getByRole('button').click();
await wait(300);
await shot('beach-panel');
await page
  .locator('.row', { hasText: 'Into the surf' })
  .getByRole('button', { name: 'Go' })
  .click();
await wait(2600);
await closeIntro();
await wait(500);
await shot('beach-ready');
await page.keyboard.press('KeyT');
await wait(3200);
const landing = await page.evaluate(() => {
  const f = window.__game.live.field;
  return f?.items.find((i) => i.kind === 'mark')?.landing ?? null;
});
console.log('landing', JSON.stringify(landing));
if (landing) await page.evaluate((p) => window.__tap(p), landing);
for (let i = 0; i < 60; i++) {
  const s = await page.evaluate(() => {
    const f = window.__game.live.field;
    return f
      ? { phase: f.phase, mode: f.dog.mode, swimming: f.dog.swimming, pos: f.dog.pos }
      : null;
  });
  if (!s || s.phase === 'complete') break;
  if (i === 6 || i === 12) await shot(`beach-swim-${i}`);
  if (i % 8 === 0) console.log('dog', JSON.stringify(s));
  await wait(700);
}
await wait(1500);
await shot('beach-result');
console.log('panel', await panel());
console.log(
  'result',
  JSON.stringify(await page.evaluate(() => window.__game.useApp.getState().result?.grade ?? null)),
);
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
