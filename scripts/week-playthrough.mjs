// Plays the opening of the first week in a real browser, with screenshots.
// Usage: dev server on :5180, then `node scripts/week-playthrough.mjs [label] [phone]`.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'week';
const phone = process.argv[3] === 'phone';
mkdirSync('.browser.local', { recursive: true });
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
// Record slow interactions (what the Vercel toolbar reports as INP issues).
await page.addInitScript(() => {
  window.__slow = [];
  window.__last = '';
  const name = (t) =>
    ((t && (t.closest?.('button')?.textContent || t.tagName)) || '').toString().trim().slice(0, 40);
  document.addEventListener('pointerdown', (e) => (window.__last = name(e.target)), true);
  document.addEventListener('keydown', (e) => (window.__last = 'key ' + e.code), true);
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.duration < 120 || !['click', 'keydown', 'pointerup'].includes(e.name)) continue;
      window.__slow.push({
        type: e.name,
        ms: Math.round(e.duration),
        label: name(e.target) || window.__last,
      });
    }
  }).observe({ type: 'event', durationThreshold: 104, buffered: true });
});
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
const app = () =>
  page.evaluate(() => {
    const s = window.__game.useApp.getState();
    return {
      screen: s.screen.kind,
      panel: s.panel,
      dialog: !!s.dialog,
      story: s.game?.story,
      day: s.game?.day,
      block: s.game?.block,
    };
  });
const keeper = () => page.evaluate(() => window.__game.live.home?.keeper.pos ?? null);
const hintAtHide = async (t, after) => {
  if (t < after || t % 20 !== 0) return;
  if (t === after) slowSearches.push(`search stalled after ${after} checks`);
  await page.evaluate(() => {
    const se = window.__game.live.search;
    const h = se?.hides.find((x) => x.kind === 'target');
    if (h) window.__tap({ x: h.pos.x, z: h.pos.z });
  });
};
const slowSearches = [];

// ---------------------------------------------------------------------------
// Playing competition rounds (the Fun Day and Larkspur trials)
// ---------------------------------------------------------------------------
const eventRounds = () =>
  page.evaluate(() => window.__game.useApp.getState().event?.def.rounds.map((r) => r.kind) ?? []);

async function playMarkRound() {
  await page.keyboard.press('KeyT');
  await wait(4500);
  for (let t = 0; t < 160 && (await app()).panel !== 'result'; t++) {
    const s = await page.evaluate(() => {
      const f = window.__game.live.field;
      if (!f) return null;
      const lying = f.items.filter((i) => i.kind === 'mark' && i.state === 'lying');
      return { mode: f.dog.mode, phase: f.phase, target: lying[lying.length - 1]?.landing ?? null };
    });
    if (s && s.target && (s.mode === 'sit' || s.mode === 'heel'))
      await page.evaluate(([x, z]) => window.__tap({ x, z }), [s.target.x, s.target.z]);
    await wait(500);
  }
}

async function playSearchRound() {
  const h = await page.evaluate(() => window.__game.live.search.setup.hintCenter);
  await page.evaluate(([x, z]) => window.__tap({ x, z }), [h.x, h.z]);
  for (let t = 0; t < 700; t++) {
    const s = await page.evaluate(() => {
      const se = window.__game.live.search;
      return se
        ? {
            phase: se.phase,
            clear: se.alert?.clear ?? null,
            hunt: se.dog.huntTime,
            k: se.keeper.pos,
          }
        : null;
    });
    if (!s || (await app()).panel === 'result') break;
    if (Math.hypot(s.k.x - h.x, s.k.z - h.z) > 18) {
      // Face the area first (A/D turn the keeper), then walk.
      await page.evaluate(
        ([x, z]) => {
          const k = window.__game.live.search.keeper;
          k.heading = Math.atan2(x - k.pos.x, z - k.pos.z);
        },
        [h.x, h.z],
      );
      await page.keyboard.down('KeyW');
      await wait(300);
      await page.keyboard.up('KeyW');
    }
    if (s.phase === 'alert') await page.keyboard.press(s.clear ? 'Space' : 'KeyX');
    if (s.phase === 'searching' && s.hunt > 20 && t < 300) {
      const a = t * 0.9;
      await page.evaluate(
        ([x, z]) => window.__tap({ x, z }),
        [h.x + Math.cos(a) * 10, h.z + Math.sin(a) * 10],
      );
    }
    if (s.phase === 'searching') await hintAtHide(t, 300);
    await wait(300);
  }
}

async function playBlindRound() {
  // Some blinds start with a mark (the old fall): throw and pick it first.
  const hasMark = await page.evaluate(() =>
    window.__game.live.field.items.some((i) => i.kind === 'mark'),
  );
  if (hasMark) {
    await page.keyboard.press('KeyT');
    await wait(4500);
  }
  for (let t = 0; t < 260 && (await app()).panel !== 'result'; t++) {
    const s = await page.evaluate(() => {
      const f = window.__game.live.field;
      if (!f) return null;
      const want =
        f.items.find((i) => i.kind === 'mark' && i.state === 'lying') ??
        f.items.find((i) => i.kind === 'blind' && i.state === 'lying');
      return { mode: f.dog.mode, pos: f.dog.pos, want: want ? want.pos : null };
    });
    if (s && s.want) {
      if (['sit', 'heel', 'stopped', 'popped'].includes(s.mode))
        await page.evaluate(([x, z]) => window.__tap({ x, z }), [s.want.x, s.want.z]);
      else if (
        s.mode === 'hunt' &&
        Math.hypot(s.pos.x - s.want.x, s.pos.z - s.want.z) > 10 &&
        t % 6 === 0
      )
        await page.keyboard.press('Space');
    }
    await wait(400);
  }
}

async function playEvent(label) {
  const kinds = await eventRounds();
  for (let i = 0; i < kinds.length; i++) {
    if (i > 0) {
      await clickButton('Next round');
      await wait(1200);
      await closeIntro();
    }
    if (kinds[i] === 'search') await playSearchRound();
    else if (kinds[i] === 'mark') await playMarkRound();
    else await playBlindRound();
    for (let t = 0; t < 60 && (await app()).panel !== 'result'; t++) await wait(500);
    await shot(`${label}-round${i + 1}`);
  }
  await clickButton('Final standings');
}

const clickButton = async (name) =>
  page.getByRole('button', { name, exact: false }).first().click();
const finishDialogs = async () => {
  for (let i = 0; i < 12 && (await app()).dialog; i++) {
    await page.keyboard.press('Space');
    await wait(150);
  }
};
const closeIntro = async () => {
  if ((await app()).panel === 'intro') await clickButton('Got it');
  await wait(200);
};
const walkTo = async (x, z) => {
  for (let i = 0; i < 120; i++) {
    const k = await keeper();
    if (k && Math.hypot(k.x - x, k.z - z) < 0.9) return true;
    await page.evaluate(([x, z]) => window.__tap({ x, z }), [x, z]);
    await wait(250);
  }
  return false;
};
const use = async () => {
  await page.keyboard.press('KeyE');
  await wait(300);
};

// Fresh start.
await page.goto('http://127.0.0.1:5180/');
await page.evaluate(() => indexedDB.deleteDatabase('paws-rebuild'));
await page.reload();
await wait(2500);
await shot('title');
await clickButton('Begin');
await wait(600);
await shot('letter');
await clickButton('Continue');
await wait(300);
await clickButton('Continue');
await wait(300);
await clickButton('Go to the kennel');
await wait(1200);
await shot('arrive-dialog');
await finishDialogs();
await closeIntro();
await wait(800);
await shot('home');

// Explore: office, runs, pantry, then name the kennel.
await walkTo(-16, 56);
await use();
await shot('office-dialog');
await finishDialogs();
await wait(300);
await shot('office-panel');
await clickButton('Close');
await walkTo(10, 53.5);
await use();
await finishDialogs();
await walkTo(22.5, 56);
await use();
await finishDialogs();
await walkTo(0, 78.5);
await use();
await page.getByRole('textbox').fill('Oak Hollow');
await shot('name-kennel');
await clickButton('Paint the sign');
await wait(500);
await shot('named');

// The van to the shelter.
await walkTo(24, 69);
await use();
await shot('van');
await clickButton('Drive there');
await wait(1500);
await shot('shelter-intro');
await closeIntro();
await page.evaluate(() => window.__tap({ x: 2, z: -10 }));
await wait(1500);
await shot('shelter-play');
await wait(4000);
await page.locator('.shelter-card').nth(1).getByRole('button', { name: 'Play' }).click();
await wait(1000);
await page.evaluate(() => window.__tap({ x: -4, z: -12 }));
await wait(2500);
await shot('shelter-second-dog');
await page.locator('.shelter-card').first().getByRole('button', { name: 'Choose' }).click();
await wait(300);
await shot('shelter-choose');
await page
  .locator('.shelter-card')
  .first()
  .getByRole('button', { name: /Take .* home/ })
  .click();
await wait(1500);
await shot('home-with-dog');
await finishDialogs();

// Feed, watch the dog eat, give a pat.
await walkTo(12.5, 51.8);
await use();
await wait(6000);
await shot('dog-eating');
const dogPos = await page.evaluate(() => window.__game.live.home.dog.pos);
await walkTo(dogPos.x + 1, dogPos.z - 1);
await page.keyboard.press('KeyF');
await wait(600);
await shot('petted');

// First lesson at the field gate.
await walkTo(0, 46.5);
await use();
await shot('field-gate');
await page
  .locator('.row', { hasText: 'Sit on cue' })
  .getByRole('button', { name: 'Train' })
  .click();
await wait(1000);
await closeIntro();
for (let rep = 0; rep < 60; rep++) {
  const s = await app();
  if (s.panel === 'result') break;
  await page.keyboard.press('KeyF');
  for (let t = 0; t < 30; t++) {
    const st = await page.evaluate(() => {
      const l = window.__game.live.lesson;
      return l?.current
        ? { id: l.current.def.id, until: l.current.completeAt - l.time, marked: l.current.marked }
        : null;
    });
    if (st && !st.marked && st.until <= 0.05) {
      if (st.id === 'sit' || st.id === 'slowSit') await page.keyboard.press('Space');
      break;
    }
    await wait(80);
  }
  if (rep === 2) await shot('lesson');
  await wait(1500);
}
await wait(1500);
await shot('lesson-result');
console.log('day 1', JSON.stringify(await app()));

// Bed, then day 2: Mara at the gate.
await clickButton('Back home');
await wait(1000);
await walkTo(-11, 56);
await use();
await shot('bed');
await clickButton('Go to bed');
await wait(1200);
await shot('day2-morning');
await walkTo(3, 72.5);
await use();
await shot('mara');
await finishDialogs();
await wait(500);

// Mara's keys: the search tutorial.
await walkTo(5, 48.5);
await use();
await shot('noticeboard');
await page
  .locator('.row', { hasText: "Mara's lost keys" })
  .getByRole('button', { name: 'Take it' })
  .click();
await wait(1500);
await shot('search-intro');
await closeIntro();
const hint = await page.evaluate(() => window.__game.live.search.setup.hintCenter);
for (let i = 0; i < 20; i++) {
  await page.keyboard.down('KeyW');
  await wait(400);
  await page.keyboard.up('KeyW');
  const k = await page.evaluate(() => window.__game.live.search.keeper.pos);
  if (Math.hypot(k.x - hint.x, k.z - hint.z) < 20) break;
}
await page.evaluate(([x, z]) => window.__tap({ x, z }), [hint.x, hint.z]);
await wait(3000);
await shot('searching');
for (let t = 0; t < 480; t++) {
  const s = await page.evaluate(() => {
    const se = window.__game.live.search;
    return se ? { phase: se.phase, clear: se.alert?.clear ?? null, hunt: se.dog.huntTime } : null;
  });
  if (!s || (await app()).panel === 'result') break;
  if (s.phase === 'alert') {
    await shot('search-alert');
    await page.keyboard.press(s.clear ? 'Space' : 'KeyX');
  }
  if (s.phase === 'searching' && s.hunt > 20 && t < 240) {
    const a = t * 0.9;
    await page.evaluate(
      ([x, z]) => window.__tap({ x, z }),
      [hint.x + Math.cos(a) * 9, hint.z + Math.sin(a) * 9],
    );
  }
  if (s.phase === 'searching') await hintAtHide(t, 240);
  await wait(500);
}
await wait(1500);
await shot('search-result');
await clickButton('Back home');
await wait(800);
await shot('mara-after-keys');
await finishDialogs();

// First mark in Grandpa's field.
await walkTo(0, 46.5);
await use();
await page.getByRole('button', { name: 'Field work' }).click();
await page.locator('.row', { hasText: 'First mark' }).getByRole('button', { name: 'Go' }).click();
await wait(1000);
await shot('mark-intro');
await closeIntro();
await page.keyboard.press('KeyT');
await wait(1100);
await shot('mark-throw');
await wait(1800);
const fall = await page.evaluate(
  () => window.__game.live.field.items.find((i) => i.kind === 'mark').landing,
);
await page.mouse.move(700, 400);
await shot('mark-fall-flag');
await page.evaluate(([x, z]) => window.__tap({ x, z }), [fall.x, fall.z]);
await wait(2500);
await shot('mark-running');
for (let t = 0; t < 60 && (await app()).panel !== 'result'; t++) await wait(500);
await shot('mark-result');
await clickButton('Back home');
await wait(600);

// Jump to Sunday with the tester tools and enter the Fun Day.
for (let d = 0; d < 7 && (await app()).day < 7; d++) {
  await page.keyboard.press('Escape');
  await wait(200);
  await clickButton('Skip a day');
  await wait(400);
}
if ((await app()).panel) await page.keyboard.press('Escape');
await wait(600);
await walkTo(24, 69);
await use();
await shot('van-funday');
await clickButton('Enter');
await wait(1500);
await shot('funday-intro');
await finishDialogs();
await closeIntro();
await playEvent('funday');
await wait(800);
await shot('funday-standings');
await clickButton('Head home');
await wait(1200);
await shot('after-funday');
await finishDialogs();
await shot('end-of-week');
console.log('end of week one', JSON.stringify(await app()));

// Week two: go to bed, read the season recap, then jump to Sunday's trial.
await walkTo(-11, 56);
await use();
await wait(400);
await clickButton('Go to bed');
await wait(1500);
await shot('season-recap');
await clickButton('On to');
await wait(600);
await page.keyboard.press('Escape');
await wait(300);
await clickButton('+$200');
await wait(200);
await clickButton('Skip to Sunday');
await wait(1200);
if ((await app()).panel) await page.keyboard.press('Escape');
await wait(400);
await walkTo(24, 69);
await use();
await shot('van-trial');
await clickButton('Enter');
await wait(1500);
await shot('trial-intro');
await finishDialogs();
await closeIntro();
await playEvent('trial');
await wait(800);
await shot('trial-standings');
await clickButton('Head home');
await wait(1200);
await finishDialogs();
await shot('after-trial');
const trialEnd = await page.evaluate(() => {
  const g = window.__game.useApp.getState().game;
  const d = g.dogs[0];
  return { day: g.day, trials: g.trials.length, q: d.qualifiers, titles: d.titles, money: g.money };
});
console.log('after trial', JSON.stringify(trialEnd));

// A second dog from Larchwood, then swap dogs and feed at the runs.
await walkTo(24, 69);
await use();
await clickButton('Visit');
await wait(1800);
await closeIntro();
await shot('shelter-second-visit');
await page.locator('.shelter-card').first().getByRole('button', { name: 'Choose' }).click();
await wait(300);
await clickButton('Take');
await wait(1800);
await finishDialogs();
await shot('home-two-dogs');
await walkTo(10, 52.8);
await use();
await wait(500);
await shot('kennel-panel');
await page
  .locator('.row', { hasNot: page.locator('.badge.good') })
  .getByRole('button', { name: 'Take out' })
  .first()
  .click();
await wait(1800);
await shot('swapped-dog');
await walkTo(10, 52.8);
await use();
await wait(400);
const feed = page.getByRole('button', { name: /Feed the dogs/ });
if (await feed.isEnabled()) await feed.click();
await wait(400);
await shot('fed-runs');
await page.keyboard.press('Escape');
const kennel = await page.evaluate(() => {
  const g = window.__game.useApp.getState().game;
  return {
    dogs: g.dogs.map((d) => `${d.name}:${Math.round(d.fullness)}`),
    active: g.activeDogId,
    money: g.money,
    food: g.food,
  };
});
console.log('kennel', JSON.stringify(kennel));
console.log('end', JSON.stringify(await app()));
const slow = await page.evaluate(() => window.__slow);
console.log('SEARCH FALLBACKS:', slowSearches.join('; ') || 'none');
console.log('SLOW INTERACTIONS:');
console.log(slow.map((x) => `${x.ms}ms ${x.type} "${x.label}"`).join(String.fromCharCode(10)));
await browser.close();

console.log(errors.length ? 'Errors:\n' + errors.join('\n') : 'No page errors.');
