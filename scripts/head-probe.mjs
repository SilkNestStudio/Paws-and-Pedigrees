// Measures the dog's head bone in the browser while it sits and watches you, to catch a
// spinning head. Usage: dev server on :5180, then `node scripts/head-probe.mjs`.
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const wait = (ms) => page.waitForTimeout(ms);
const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
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

/** Total turning of the head relative to the body over `ms`, and the most it ever differs from its start. */
async function headTurn(label, ms) {
  const r = await page.evaluate(async (ms) => {
    const rig = window.__rigs?.[window.__rigs.length - 1];
    if (!rig) return null;
    const head = rig.bones.head;
    const neck = rig.bones.neck_02;
    const q0 = head.quaternion.clone().premultiply(neck.quaternion);
    let prev = q0.clone();
    let travelled = 0;
    let furthest = 0;
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const q = head.quaternion.clone().premultiply(neck.quaternion);
        travelled += q.angleTo(prev);
        furthest = Math.max(furthest, q.angleTo(q0));
        prev = q;
        if (performance.now() - t0 < ms) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return { travelled, furthest };
  }, ms);
  console.log(
    `${label}: head moved ${r.travelled.toFixed(2)} rad in total, furthest from start ${r.furthest.toFixed(2)} rad`,
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
if (await page.getByRole('button', { name: 'Got it' }).count()) await clickButton('Got it');
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Adopt the first dog now');
await wait(2500);
await finishDialogs();
await wait(3000);
await headTurn('home, dog sitting beside you', 8000);
await page.keyboard.press('KeyF');
await wait(2500);
await headTurn('home, after a pat (sitting in front)', 6000);
await page.keyboard.down('KeyA');
await wait(500);
await page.keyboard.up('KeyA');
await wait(2500);
await headTurn('home, after turning a little', 8000);
await browser.close();
