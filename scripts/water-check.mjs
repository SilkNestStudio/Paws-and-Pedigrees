// Quick browser check of water work: restore the pond, run the water set-ups, take screenshots.
// Usage: dev server on :5180, then `node scripts/water-check.mjs [label]`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'water';
mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
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
  if ((await panel()) === 'intro') await clickButton('Got it');
  await wait(200);
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
  for (let i = 0; i < 120; i++) {
    const k = await page.evaluate(() => window.__game.live.home?.keeper.pos ?? null);
    if (k && Math.hypot(k.x - x, k.z - z) < 0.9) return;
    await page.evaluate(([x, z]) => window.__tap({ x, z }), [x, z]);
    await wait(250);
  }
};
const dogState = () =>
  page.evaluate(() => {
    const f = window.__game.live.field;
    if (!f) return null;
    return {
      mode: f.dog.mode,
      swimming: f.dog.swimming,
      detour: !!f.dog.detour,
      balk: f.dog.balk > 0,
      pos: f.dog.pos,
      bank: f.stats.bankRuns,
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
await clickButton('Adopt the first dog now');
await wait(1200);
await page.keyboard.press('Escape');
await wait(300);
await clickButton('+$200');
await page.keyboard.press('Escape');
await wait(400);
await finishDialogs();

for (const id of ['Across the pond', 'Into the pond', 'Water blind']) {
  await walkTo(0, 46.3);
  await finishDialogs();
  await page.keyboard.press('KeyE');
  await wait(400);
  if ((await panel()) !== 'fieldGate') {
    await shot('no-gate');
    console.log(
      'state',
      JSON.stringify(
        await page.evaluate(() => {
          const s = window.__game.useApp.getState();
          return {
            panel: s.panel,
            dialog: !!s.dialog,
            screen: s.screen.kind,
            k: window.__game.live.home?.keeper.pos,
            near: window.__game.live.home?.nearSpot,
          };
        }),
      ),
    );
  }
  await clickButton('Field work');
  await wait(200);
  if (await page.getByRole('button', { name: 'Restore for $150' }).count()) {
    await clickButton('Restore for $150');
    await wait(400);
    await shot('restored');
  }
  await page.locator('.row', { hasText: id }).getByRole('button', { name: 'Go' }).click();
  await wait(1800);
  await closeIntro();
  await shot(`${id}-start`);
  const marks = await page.evaluate(() =>
    window.__game.live.field.items.some((i) => i.kind === 'mark'),
  );
  if (marks) {
    await page.keyboard.press('KeyT');
    await wait(4000);
  }
  const target = await page.evaluate(() => {
    const f = window.__game.live.field;
    const i = f.items.find((x) => x.state === 'lying');
    return i.kind === 'mark' ? i.landing : i.pos;
  });
  await page.evaluate(([x, z]) => window.__tap({ x, z }), [target.x, target.z]);
  let shotBank = false;
  let shotSwim = false;
  const log = [];
  for (let t = 0; t < 140; t++) {
    const s = await dogState();
    if (!s || (await panel()) === 'result') break;
    log.push(`${s.mode}${s.swimming ? '~' : ''}${s.detour ? '!' : ''}${s.balk ? '?' : ''}`);
    if (s.detour && !shotBank) {
      shotBank = true;
      await shot(`${id}-bank`);
      await page.keyboard.press('Space');
    }
    if (s.swimming && !shotSwim) {
      shotSwim = true;
      await wait(600);
      await shot(`${id}-swimming`);
    }
    if (s.mode === 'stopped' || s.mode === 'popped')
      await page.evaluate(([x, z]) => window.__tap({ x, z }), [target.x, target.z]);
    await wait(350);
  }
  await wait(500);
  await shot(`${id}-result`);
  console.log(id, [...new Set(log)].join(' '));
  if ((await panel()) === 'result') await clickButton('Back home');
  await wait(1500);
  // Rest the dog so the next set-up is allowed.
  await page.evaluate(() => {
    const g = window.__game.useApp.getState().game;
    const next = structuredClone(g);
    next.block = 'morning';
    for (const d of next.dogs) d.energy = 100;
    window.__game.useApp.setState({ game: next });
  });
}
// Larkspur at Open level: retire from rounds 1 and 2 to reach the water blind.
await page.evaluate(() => {
  const g = structuredClone(window.__game.useApp.getState().game);
  g.day = 14;
  g.block = 'morning';
  g.funDay = { entries: [], bestRound: 'mark' };
  g.story = 'afterFunDay';
  g.dogs[0].titles = ['novice'];
  window.__game.useApp.setState({ game: g });
});
await walkTo(24, 69);
await page.keyboard.press('KeyE');
await wait(400);
await clickButton('Enter');
await wait(1800);
await finishDialogs();
await closeIntro();
await shot('larkspur-open');
for (let r = 0; r < 2; r++) {
  await clickButton('Leave');
  await wait(1200);
  await clickButton('Next round');
  await wait(1800);
  await closeIntro();
}
await shot('larkspur-water-round');
const lake = await page.evaluate(
  () => window.__game.live.field.items.find((i) => i.kind === 'blind').pos,
);
await page.evaluate(([x, z]) => window.__tap({ x, z }), [lake.x, lake.z]);
await wait(5000);
await shot('larkspur-water-running');
await wait(5000);
await shot('larkspur-water-later');
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
