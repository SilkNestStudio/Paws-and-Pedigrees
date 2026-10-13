// Browser check of agility played with the mouse alone: no keys at all. Clicks the Go! button,
// then clicks on the ground at each numbered obstacle in turn, as a player who moves by clicking
// would. Usage: dev server on :5180, then `node scripts/agility-mouse-check.mjs`.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'agility-mouse';
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

/** Runs a course with mouse clicks only. */
async function runByClicking(name) {
  await page.getByRole('button', { name: 'Go!' }).click();
  let shots = 0;
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => {
      const a = window.__game.live.agility;
      return a ? { phase: a.phase, next: a.next, k: a.keeper.pos, speed: a.keeper.speed } : null;
    });
    if (!s || s.phase === 'complete') break;
    // Click the ground just under the label of the next obstacle.
    const box = await page
      .locator('.target-label')
      .first()
      .boundingBox()
      .catch(() => null);
    if (box) await page.mouse.click(box.x + box.width / 2, Math.min(860, box.y + box.height + 46));
    else {
      // Off screen: follow the arrow at the edge.
      const edge = await page
        .locator('.target-edge')
        .first()
        .boundingBox()
        .catch(() => null);
      if (edge)
        await page.mouse.click(
          Math.min(1300, Math.max(380, edge.x + 20)),
          Math.min(820, Math.max(260, edge.y + 20)),
        );
    }
    if (i % 12 === 5 && shots < 4) {
      shots++;
      await shot(`${name}-${s.next + 1}`);
    }
    await wait(280);
  }
  return page.evaluate(() => {
    const a = window.__game.live.agility;
    return a
      ? { phase: a.phase, cleared: a.stats.cleared, of: a.course.obstacles.length, stats: a.stats }
      : null;
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
await clickButton('Menu');
await wait(300);
await clickButton('Skip the first week');
await wait(1800);
await clickButton('Menu');
await wait(300);
await clickButton('+$200');
await wait(200);
await clickButton('Resume');
await wait(300);
await walkTo(0, 46.3);
await clickButton('Go training');
await wait(400);
await page.getByRole('button', { name: 'Agility', exact: true }).click();
await wait(200);
await clickButton('Restore for $110');
await wait(500);
for (const course of ['First jumps', 'Tunnel and turn', 'Full course']) {
  if ((await panel()) !== 'fieldGate') {
    await walkTo(0, 46.3);
    await clickButton('Go training');
    await wait(400);
    await page.getByRole('button', { name: 'Agility', exact: true }).click();
    await wait(200);
  }
  await page.evaluate(() => {
    const app = window.__game.useApp;
    const g = structuredClone(app.getState().game);
    g.dogs[0].energy = 100;
    app.setState({ game: g });
  });
  await page.locator('.row', { hasText: course }).getByRole('button', { name: 'Run it' }).click();
  await wait(1900);
  if ((await panel()) === 'intro') {
    await shot('intro');
    await clickButton('Got it');
    await wait(500);
  }
  await shot(`${course.split(' ')[0].toLowerCase()}-ready`);
  console.log(course, JSON.stringify(await runByClicking(course.split(' ')[0].toLowerCase())));
  await wait(1700);
  console.log(
    '  result',
    JSON.stringify(
      await page.evaluate(() => {
        const r = window.__game.useApp.getState().result;
        return r ? { grade: r.grade, score: r.score, seconds: Math.round(r.seconds) } : null;
      }),
    ),
  );
  await clickButton('Enough for today');
  await wait(2000);
}
console.log('errors', JSON.stringify(errors.slice(0, 8)));
await browser.close();
