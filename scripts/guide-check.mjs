// Screenshots the trial guidance: the How trials work card on loading a post-Fun-Day save, and the goal card.
// Usage: dev server on :5180, then `node scripts/guide-check.mjs`.
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const wait = (ms) => page.waitForTimeout(ms);
const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
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
for (let i = 0; i < 6; i++) await page.keyboard.press('Space');
if (await page.getByRole('button', { name: 'Got it' }).count()) await clickButton('Got it');
await page.keyboard.press('Escape');
await wait(300);
await clickButton('Adopt the first dog now');
await wait(1500);
await page.evaluate(() => {
  const s = window.__game.useApp.getState();
  const g = structuredClone(s.game);
  g.dogs[0].name = 'Fern';
  g.story = 'afterFunDay';
  g.funDay = { entries: [], bestRound: 'mark' };
  g.day = 9;
  g.flags = g.flags.filter((f) => f !== 'intro:trials');
  window.__game.useApp.setState({ game: g, screen: { kind: 'title' }, panel: null, dialog: null });
});
await wait(500);
await clickButton('Continue');
await wait(1500);
await page.screenshot({ path: '.browser.local/guide-trials-card.png' });
await clickButton('Got it');
await wait(800);
await page.screenshot({ path: '.browser.local/guide-goal-card.png' });
await browser.close();
