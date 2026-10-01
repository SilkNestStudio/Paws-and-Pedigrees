// Scripted playthrough in a real browser with screenshots: a marked retrieve,
// a blind with whistle and cast, and a stop-whistle lesson.
// Usage: dev server on :5180, then `node scripts/playthrough.mjs [label] [phone]`.
import { chromium } from '@playwright/test';
const label = process.argv[2] ?? 'play';
const phone = process.argv[3] === 'phone';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const context = await browser.newContext(
  phone
    ? {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      }
    : { viewport: { width: 1440, height: 900 } },
);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: `.browser.local/${label}-${name}.png` });
const state = () =>
  page.evaluate(() => {
    const g = window.__game;
    const f = g.live.field;
    const l = g.live.lesson;
    return f
      ? {
          kind: 'field',
          phase: f.phase,
          mode: f.dog.mode,
          items: f.items.map((i) => ({ x: i.pos.x, z: i.pos.z, kind: i.kind, state: i.state })),
          dog: f.dog.pos,
          keeper: f.keeper.pos,
          panel: g.useGame.getState().panel,
        }
      : {
          kind: 'lesson',
          phase: l.phase,
          skill: l.skill,
          current: l.current?.def.id ?? null,
          complete: l.current ? l.current.completeAt - l.time : null,
          panel: g.useGame.getState().panel,
        };
  });
const until = async (fn, ms = 30000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const s = await state();
    if (fn(s)) return s;
    await page.waitForTimeout(100);
  }
  return state();
};
// Tap a world point by projecting it with the game camera.
const tapWorld = async (x, z) => {
  const pt = await page.evaluate(
    ([x, z]) => {
      const canvas = document.querySelector('canvas');
      const r = canvas.getBoundingClientRect();
      return { r: { left: r.left, top: r.top, w: r.width, h: r.height } };
    },
    [x, z],
  );
  // Fallback: dispatch the game action directly at the world point.
  await page.evaluate(([x, z]) => window.__tap?.({ x, z }), [x, z]);
  return pt;
};

await page.goto('http://127.0.0.1:5180/');
await page.waitForTimeout(2000);
const welcome = page.getByRole('button', { name: "Let's go" });
if (await welcome.isVisible()) await welcome.click();

// 1. First mark.
await page.getByRole('button', { name: 'Field book' }).click();
await page.locator('.row', { hasText: 'First mark' }).getByRole('button').click();
await page.waitForTimeout(800);
await shot('1-mark-ready');
await page.keyboard.press('KeyT');
await page.waitForTimeout(1300);
await shot('2-mark-flying');
let s = await until((s) => s.items[0]?.state === 'lying', 8000);
await page.waitForTimeout(700);
await tapWorld(s.items[0].x, s.items[0].z);
await page.waitForTimeout(1600);
await shot('3-mark-running');
s = await until((s) => s.panel === 'result', 40000);
await page.waitForTimeout(400);
await shot('4-mark-result');

// 2. First blind with handling.
await page.locator('.panel').getByRole('button', { name: 'Field book' }).click();
await page.locator('.row', { hasText: 'First blind' }).getByRole('button').click();
await page.waitForTimeout(800);
s = await state();
const blind = s.items.find((i) => i.kind === 'blind');
await shot('5-blind-ready');
await tapWorld(blind.x - 6, blind.z + 2);
await page.waitForTimeout(2200);
await page.keyboard.press('Space');
await page.waitForTimeout(900);
await shot('6-blind-whistle');
s = await state();
if (s.mode === 'stopped') {
  await tapWorld(blind.x, blind.z - 3);
}
await page.waitForTimeout(1500);
await shot('7-blind-cast');
s = await until((s) => s.panel === 'result', 60000);
await page.waitForTimeout(400);
await shot('8-blind-result');

// 3. Stop whistle lesson.
await page.locator('.panel').getByRole('button', { name: 'Field book' }).click();
await page.getByRole('button', { name: 'Lessons' }).click();
await page.locator('.row', { hasText: 'Stop whistle' }).getByRole('button').click();
await page.waitForTimeout(800);
await shot('9-lesson-start');
for (let rep = 0; rep < 4; rep++) {
  await page.keyboard.press('KeyF'); // throw
  await page.waitForTimeout(900);
  await page.keyboard.press('KeyF'); // whistle
  const r = await until((s) => s.current !== null, 3000);
  if (rep === 1) await shot('10-lesson-response');
  await page.waitForTimeout(Math.max(0, (r.complete ?? 0) * 1000 + 80));
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  if (rep === 1) await shot('11-lesson-feedback');
  await until((s) => s.phase === 'idle', 6000);
}
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
