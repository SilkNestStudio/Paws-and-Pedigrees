// Browser check that messages are never hidden behind a panel, and that a panel says why a dog
// can't do something (too young, worn out). Usage: dev server on :5180, then
// `node scripts/messages-check.mjs [label] [--phone]`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? 'messages';
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
const visibleOnTop = async (text) =>
  page.evaluate((text) => {
    const el = [...document.querySelectorAll('.event')].find((e) => e.textContent.includes(text));
    if (!el) return 'not shown';
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el.closest('.panel-messages')
      ? 'on top of the panel'
      : top === el
        ? 'visible'
        : 'HIDDEN';
  }, text);

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
await tap('Menu');
await wait(300);
await tap('Skip the first week');
await wait(1800);
await patch((g) => {
  g.money = 400;
  g.flags.push('restored:agilityRing');
});

// A message from inside a panel: buying at the shop.
await walkTo(24, 69);
await tap('Get in the van');
await wait(400);
await tap('Go shopping');
await wait(300);
await page
  .locator('.row', { hasText: 'Bag of kibble' })
  .getByRole('button', { name: 'Buy' })
  .click();
await wait(500);
await shot('shop-message');
console.log('shop message:', await visibleOnTop('Bought'));
await tap('Drive home');
await wait(400);

// A young dog: the agility tab says why, and the buttons are off.
await patch((g) => {
  g.dogs[0].ageMonths = 6;
});
await walkTo(0, 46.3);
await tap('Go training');
await wait(400);
await page.getByRole('button', { name: 'Agility', exact: true }).click();
await wait(300);
await shot('agility-too-young');
console.log(
  'too young:',
  JSON.stringify({
    reason: await page
      .locator('.panel .blocked')
      .textContent()
      .catch(() => null),
    runItDisabled: await page.getByRole('button', { name: 'Run it' }).first().isDisabled(),
  }),
);
await page.getByRole('button', { name: 'Lessons', exact: true }).click();
await wait(200);
console.log(
  'lessons still open for a puppy:',
  !(await page.getByRole('button', { name: 'Train' }).first().isDisabled()),
);
await tap('Close');
await wait(300);

// A worn-out dog.
await patch((g) => {
  g.dogs[0].ageMonths = 24;
  g.dogs[0].energy = 8;
});
await walkTo(0, 46.3);
await tap('Go training');
await wait(400);
await shot('worn-out');
console.log(
  'worn out:',
  JSON.stringify({
    reason: await page
      .locator('.panel .blocked')
      .textContent()
      .catch(() => null),
    trainDisabled: await page.getByRole('button', { name: 'Train' }).first().isDisabled(),
  }),
);
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
