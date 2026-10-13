// Browser check of click-to-walk at the fences, and of the agility ring seen from the yard.
// Usage: dev server on :5180, then `node scripts/fence-check.mjs`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const click = (name) => page.getByRole('button', { name, exact: false }).first().click();
const keeper = () =>
  page.evaluate(() => {
    const k = window.__game.live.home.keeper;
    return { x: +k.pos.x.toFixed(2), z: +k.pos.z.toFixed(2), speed: +k.speed.toFixed(2) };
  });

await page.goto('http://127.0.0.1:5180/');
await page.evaluate(() => indexedDB.deleteDatabase('paws-rebuild'));
await page.reload();
await wait(2500);
await click('Begin');
await wait(600);
await click('Continue');
await wait(300);
await click('Continue');
await wait(300);
await click('Go to the kennel');
await wait(1200);
for (
  let i = 0;
  i < 8 && (await page.evaluate(() => !!window.__game.useApp.getState().dialog));
  i++
) {
  await page.keyboard.press('Space');
  await wait(200);
}
if ((await page.evaluate(() => window.__game.useApp.getState().panel)) === 'intro')
  await click('Got it');
await page.keyboard.press('Escape');
await wait(300);
await click('Skip the first week');
await wait(1800);
await page.evaluate(() => {
  const app = window.__game.useApp;
  const g = structuredClone(app.getState().game);
  g.flags.push('restored:agilityRing');
  app.setState({ game: g });
});

// Taps on the fence line, beyond it, and on a building: each should end with the keeper standing still.
const taps = [
  ['on the field fence', { x: 20, z: 44 }],
  ['out in the field, at the agility ring', { x: 32, z: 32 }],
  ['beyond the east fence', { x: 48, z: 60 }],
  ['on the lane beyond the gate', { x: 10, z: 90 }],
  ['inside the farmhouse', { x: -16, z: 62 }],
];
for (const [name, point] of taps) {
  await page.evaluate((p) => window.__tap(p), point);
  let last = await keeper();
  let stopped = 0;
  for (let i = 0; i < 80 && stopped < 3; i++) {
    await wait(250);
    const now = await keeper();
    stopped =
      now.speed < 0.05 && Math.hypot(now.x - last.x, now.z - last.z) < 0.02 ? stopped + 1 : 0;
    last = now;
  }
  const target = await page.evaluate(() => window.__game.live.home && null);
  console.log(
    `${name}: tapped (${point.x}, ${point.z}) -> stood still at (${last.x}, ${last.z})`,
    stopped >= 3 ? 'OK' : 'STILL MOVING',
    target ?? '',
  );
}

// The ring from the yard: equipment, but no circle or numbers.
await page.evaluate(() => {
  const k = window.__game.live.home.keeper;
  k.pos = { x: 32, z: 45.6 };
  k.heading = Math.PI;
});
await wait(2500);
await page.screenshot({ path: '.browser.local/fence-ring-from-yard.png' });
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close();
