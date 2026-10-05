// Samples the dog's position, facing and mode in a real browser session, to catch odd motion.
// Usage: dev server on :5180, then `node scripts/dog-probe.mjs`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
const panel = () => page.evaluate(() => window.__game.useApp.getState().panel);
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
let n = 0;
const shot = async (name) => {
  n++;
  await page.screenshot({ path: `.browser.local/probe-${String(n).padStart(2, '0')}-${name}.png` });
};

/** Samples every animation frame for `ms` and summarises the dog's motion. */
async function sample(label, ms) {
  const r = await page.evaluate(async (ms) => {
    const live = window.__game.live;
    const rows = [];
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const s = live.home ?? live.field ?? live.search ?? live.lesson;
        const d = s?.dog;
        const k = s?.keeper;
        if (d && k)
          rows.push({
            t: performance.now() - t0,
            x: d.pos.x,
            z: d.pos.z,
            h: d.heading,
            mode: s.dogMode ?? d.mode,
            pose: d.pose,
            speed: d.speed,
            kh: k.heading,
            kd: Math.hypot(d.pos.x - k.pos.x, d.pos.z - k.pos.z),
          });
        if (performance.now() - t0 < ms) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return rows;
  }, ms);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let turned = 0;
  let still = 0;
  let stillTurn = 0;
  let maxKd = 0;
  let nan = false;
  let kTurn = 0;
  for (let i = 1; i < r.length; i++) {
    const dh = wrap(r[i].h - r[i - 1].h);
    turned += dh;
    kTurn += wrap(r[i].kh - r[i - 1].kh);
    if (r[i].speed < 0.2) {
      still++;
      stillTurn += Math.abs(dh);
    }
    maxKd = Math.max(maxKd, r[i].kd);
    if (!Number.isFinite(r[i].x) || !Number.isFinite(r[i].h)) nan = true;
  }
  const modes = [...new Set(r.map((x) => `${x.mode}/${x.pose}`))].join(' ');
  console.log(
    `${label}: frames ${r.length}, net dog turn ${turned.toFixed(2)} rad, turning while still ${stillTurn.toFixed(2)} rad over ${still} frames, keeper turn ${kTurn.toFixed(2)}, max dist from keeper ${maxKd.toFixed(1)} m${nan ? ' NaN!' : ''} | ${modes}`,
  );
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
if ((await panel()) === 'intro') await clickButton('Got it');
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Adopt the first dog now');
await wait(1500);
await finishDialogs();

await sample('home, standing still', 6000);
await shot('home-still');
await page.keyboard.press('KeyF');
await sample('home, after a pat', 5000);
await shot('home-pat');
await page.keyboard.press('KeyR');
await sample('home, after calling', 6000);
await shot('home-call');
await page.keyboard.down('KeyA');
await sample('home, turning left', 2500);
await page.keyboard.up('KeyA');
await sample('home, after turning', 5000);
await shot('home-after-turn');
await page.keyboard.down('KeyW');
await sample('home, walking', 2500);
await page.keyboard.up('KeyW');
await sample('home, stopped after walking', 9000);
await shot('home-stopped');

// A first mark in the field.
await page.evaluate(() => {
  const k = window.__game.live.home.keeper;
  k.pos = { x: 0, z: 46.3 };
});
await wait(300);
await page.keyboard.press('KeyE');
await wait(400);
await clickButton('Field work');
await page.locator('.row', { hasText: 'First mark' }).getByRole('button', { name: 'Go' }).click();
await wait(1800);
if ((await panel()) === 'intro') await clickButton('Got it');
await sample('field, ready at side', 5000);
await shot('field-ready');
await page.keyboard.press('KeyT');
await sample('field, throw', 4000);
const fall = await page.evaluate(
  () => window.__game.live.field.items.find((i) => i.state === 'lying')?.landing,
);
if (fall) await page.evaluate(([x, z]) => window.__tap({ x, z }), [fall.x, fall.z]);
await sample('field, retrieve', 14000);
await shot('field-after');
await sample('field, sitting after', 6000);
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
