// Runs every lesson in the browser: gives the cue, watches what the dog does, and presses Yes!
// when the response finishes. Usage: dev server on :5180, then `node scripts/lesson-probe.mjs`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('.browser.local', { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
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
const walkTo = async (x, z) => {
  for (let i = 0; i < 120; i++) {
    const k = await page.evaluate(() => window.__game.live.home?.keeper.pos ?? null);
    if (k && Math.hypot(k.x - x, k.z - z) < 0.9) return;
    await page.evaluate(([x, z]) => window.__tap({ x, z }), [x, z]);
    await wait(250);
  }
};
const lessonState = () =>
  page.evaluate(() => {
    const t = window.__game.live.lesson;
    if (!t) return null;
    return {
      phase: t.phase,
      current: t.current
        ? {
            id: t.current.def.id,
            toComplete: t.current.completeAt - t.time,
            marked: t.current.marked,
          }
        : null,
      pending: !!t.pendingResponse,
      pose: t.dog.pose,
      speed: Math.round(t.dog.speed * 10) / 10,
      feedback: t.feedback?.text ?? '',
      skill: Math.round(t.skill * 100),
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
if (await page.getByRole('button', { name: 'Got it' }).count()) await clickButton('Got it');
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Adopt the first dog now');
await wait(2000);
await finishDialogs();

const LESSONS = [
  { title: 'Sit on cue', key: 'KeyF' },
  { title: 'Steady to the throw', key: 'KeyG' },
  { title: 'Stop whistle', key: 'KeyF', whistle: true },
  { title: 'Directions drill', key: 'Digit2' },
];
const shotCoach = new Set();
for (const l of LESSONS) {
  await page.evaluate(() => {
    const g = structuredClone(window.__game.useApp.getState().game);
    g.block = 'morning';
    for (const d of g.dogs) d.energy = 100;
    window.__game.useApp.setState({ game: g });
  });
  await walkTo(0, 46.3);
  await page.keyboard.press('KeyE');
  await wait(400);
  await page.locator('.row', { hasText: l.title }).getByRole('button', { name: 'Train' }).click();
  await wait(1800);
  if ((await panel()) === 'intro') await clickButton('Got it');
  await wait(500);
  console.log(`\n== ${l.title}`);
  for (let rep = 0; rep < 4; rep++) {
    await page.keyboard.press(l.key);
    if (l.whistle) {
      await wait(900);
      await page.keyboard.press('KeyF');
    }
    let marked = false;
    const seen = [];
    for (let i = 0; i < 40; i++) {
      const s = await lessonState();
      if (!s) break;
      seen.push(
        `${s.phase}${s.current ? ':' + s.current.id : ''}${s.pending ? '…' : ''}/${s.pose}`,
      );
      const coach = await page.evaluate(
        () => window.__game.useApp && document.querySelector('.hint')?.className,
      );
      if (coach?.includes('coach-') && !shotCoach.has(l.title)) {
        shotCoach.add(l.title);
        await page.screenshot({
          path: `.browser.local/lessonprobe-coach-${l.title.replace(/\W+/g, '-')}.png`,
        });
      }
      if (s.current && !s.current.marked && s.current.toComplete <= 0.05 && !marked) {
        await page.keyboard.press('Space');
        marked = true;
        await wait(120);
        const after = await lessonState();
        console.log(
          `  rep ${rep + 1}: Yes! on "${s.current.id}" -> ${after.feedback} (skill ${after.skill}%)`,
        );
      }
      if (s.phase === 'idle' && i > 3) break;
      await wait(100);
    }
    if (!marked)
      console.log(`  rep ${rep + 1}: nothing to reward. Saw: ${[...new Set(seen)].join(' ')}`);
    for (let i = 0; i < 30 && (await lessonState())?.phase !== 'idle'; i++) await wait(100);
  }
  await page.screenshot({ path: `.browser.local/lessonprobe-${l.title.replace(/\W+/g, '-')}.png` });
  await clickButton('Finish');
  await wait(1500);
  if ((await panel()) === 'result') await clickButton('Back home');
  await wait(1500);
  await finishDialogs();
}
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
