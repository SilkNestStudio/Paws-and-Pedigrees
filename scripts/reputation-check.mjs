// Screenshots the stud service, kennel standing and letters. Usage: dev server on :5180, then `node scripts/reputation-check.mjs`.
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
const panel = () => page.evaluate(() => window.__game.useApp.getState().panel);
const dialogs = async () => {
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
  for (let i = 0; i < 160; i++) {
    const k = await page.evaluate(() => window.__game.live.home?.keeper.pos ?? null);
    if (k && Math.hypot(k.x - x, k.z - z) < 0.9) return;
    await page.evaluate(([x, z]) => window.__tap({ x, z }), [x, z]);
    await wait(250);
  }
};
const menu = async (button) => {
  await page.keyboard.press('Escape');
  await wait(300);
  await clickButton(button);
  await wait(1500);
};
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
await dialogs();
if ((await panel()) === 'intro') await clickButton('Got it');
await menu('Adopt the first dog now');
await dialogs();
// A titled male with a name for himself, the whelping room, and a puppy placed last season.
await page.evaluate(() => {
  const g = structuredClone(window.__game.useApp.getState().game);
  const d = g.dogs[0];
  d.sex = 'male';
  d.name = 'Rex';
  d.ageMonths = 36;
  d.titles = ['novice', 'open'];
  g.reputation = 38;
  g.money = 300;
  g.food = 40;
  g.day = 13;
  g.story = 'afterFunDay';
  g.funDay = { entries: [], bestRound: 'mark' };
  g.kennelName = 'Oak Hollow';
  g.flags.push('restored:whelpingRoom', 'intro:breeding', 'intro:trials', 'saw:office');
  g.litters.push({
    id: 'l1',
    damId: 'x',
    sireId: d.id,
    damName: 'Bess',
    sireName: 'Rex',
    bornDay: 2,
    puppies: [],
    kept: [],
    inbreeding: 0,
    placed: [
      {
        puppyId: 'p1',
        name: 'Tor',
        home: 'the Hendersons at Elm Cross',
        fee: 110,
        day: 6,
        sex: 'male',
        quality: 66,
        raised: 6,
        letters: 0,
      },
      {
        puppyId: 'p2',
        name: 'Skye',
        home: 'a young couple in the village',
        fee: 90,
        day: 6,
        sex: 'female',
        quality: 47,
        raised: 2,
        letters: 0,
      },
    ],
  });
  window.__game.useApp.setState({ game: g });
});
await walkTo(31, 50.6);
await page.keyboard.press('KeyE');
await wait(600);
await clickButton('Stud book');
await wait(300);
await clickButton('Offer at stud');
await wait(500);
await page.screenshot({ path: '.browser.local/rep-01-stud-book.png' });
await clickButton('Close');
// Sleep into the new season: bookings and letters arrive.
await menu('Skip a day');
await menu('Skip a day');
await dialogs();
await wait(500);
await page.screenshot({ path: '.browser.local/rep-02-season-news.png' });
if ((await panel()) === 'season') await clickButton('On to');
await wait(400);
await walkTo(-16, 56.4);
await page.keyboard.press('KeyE');
await wait(600);
if ((await panel()) === 'bed') await clickButton("Grandpa's office");
await wait(300);
await clickButton('Kennel');
await wait(300);
await page.screenshot({ path: '.browser.local/rep-03-kennel-standing.png' });
console.log(
  JSON.stringify(
    await page.evaluate(() => {
      const g = window.__game.useApp.getState().game;
      return {
        rep: g.reputation,
        letters: g.letters.length,
        bookings: g.studBookings.length,
        money: g.money,
      };
    }),
  ),
);
await browser.close();
console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
