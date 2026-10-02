import { describe, expect, it } from 'vitest';
import { createOrchard } from '../src/sim/field';
import { FIXED_DT } from '../src/sim/retrieve';
import {
  buildSearchReport,
  createSearchSession,
  doubtAlert,
  searchHere,
  stepSearch,
  trustAlert,
  type SearchSession,
  type SearchSetup,
} from '../src/sim/search';
import { testDog } from './helpers';

const SETUP: SearchSetup = {
  title: 'Test search',
  itemName: 'the keys',
  hintCenter: { x: -12, z: -30 },
  hintRadius: 12,
  windDeg: 20,
  windStrength: 0.45,
};

/** Searches the hinted area, then trusts clear indications and doubts unsure ones. */
function sensibleHandler(s: SearchSession): void {
  if (s.phase === 'ready') {
    searchHere(s, s.setup.hintCenter);
    return;
  }
  if (s.phase === 'alert' && s.alert && s.time - s.alert.since > 0.8) {
    if (s.alert.clear) trustAlert(s);
    else doubtAlert(s);
  }
  // Move the search around the area if nothing turns up for a while.
  if (s.phase === 'searching' && s.dog.mode === 'hunt' && s.dog.huntTime > 25) {
    const a = s.time * 0.37;
    searchHere(s, { x: s.setup.hintCenter.x + Math.cos(a) * 8, z: s.setup.hintCenter.z + Math.sin(a) * 8 });
  }
}

function play(nose: number, focus: number, indicate: number, seed: number) {
  const s = createSearchSession(testDog({ nose, focus }, { indicate }, seed), SETUP, createOrchard(), seed);
  for (let i = 0; i < 240 / FIXED_DT && s.phase !== 'complete'; i++) {
    stepSearch(s, FIXED_DT);
    sensibleHandler(s);
  }
  return s;
}

describe('scent search', () => {
  it('a sensible handler with an average dog finds the item', () => {
    let found = 0;
    for (let seed = 1; seed <= 8; seed++) if (play(55, 55, 0.2, seed).phase === 'complete') found++;
    expect(found).toBeGreaterThanOrEqual(6);
  });

  it('a better nose finds things faster', () => {
    const time = (nose: number) => {
      let total = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const s = play(nose, 55, 0.3, seed);
        total += s.phase === 'complete' ? s.stats.finishedAt! - s.stats.startedAt! : 240;
      }
      return total;
    };
    expect(time(90)).toBeLessThan(time(20));
  });

  it('an unfocused, untrained dog gives more false indications', () => {
    const falseAlerts = (focus: number, indicate: number) => {
      let n = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const s = play(60, focus, indicate, seed);
        n += s.events.filter((e) => e.text.includes('An indication') || e.text.includes('Maybe something')).length;
      }
      return n;
    };
    expect(falseAlerts(15, 0)).toBeGreaterThan(falseAlerts(85, 0.9));
  });

  it('trusting a false indication costs points', () => {
    const s = play(55, 55, 0.2, 3);
    const clean = buildSearchReport(s).score;
    s.stats.falseTrusted = 2;
    expect(buildSearchReport(s).score).toBeLessThan(clean);
  });
});
