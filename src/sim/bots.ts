import { add, distance, fromHeading, headingOf, normalize, sub } from '../core/math';
import { random, type Rng } from '../core/rng';
import {
  blowWhistle,
  callForThrows,
  castDog,
  sendDog,
  stepSession,
  FIXED_DT,
  type RetrieveSession,
} from './retrieve';
import {
  doubtAlert,
  searchHere,
  setSearchKeeperInput,
  stepSearch,
  trustAlert,
  type SearchSession,
} from './search';
import { windAt } from './scent';

/**
 * Computer handlers for rival competitors. They play through exactly the
 * same simulation as the player, so a rival's result comes from their dog's
 * aptitudes and training plus their handler's skill, never from a dice roll
 * on the scoreboard. `skill` runs from 0 (novice) to 1 (expert).
 */

/** Plays a retrieve set-up to the end and returns the finished session. */
export function playRetrieve(
  s: RetrieveSession,
  skill: number,
  rng: Rng,
  maxSeconds = 240,
): RetrieveSession {
  const reaction = 1.6 - skill * 1.2;
  let nextDecision = 0;
  for (let i = 0; i < maxSeconds / FIXED_DT && s.phase !== 'complete'; i++) {
    stepSession(s, FIXED_DT);
    if (s.time < nextDecision) continue;
    nextDecision = s.time + reaction * (0.7 + random(rng) * 0.6);
    decideRetrieve(s, skill, rng);
  }
  return s;
}

function decideRetrieve(s: RetrieveSession, skill: number, rng: Rng): void {
  const { dog } = s;
  if (s.phase === 'ready') {
    if (s.items.some((i) => i.kind === 'mark' && i.state === 'waiting')) callForThrows(s);
    else {
      const blind = s.items.find((i) => i.kind === 'blind' && i.state === 'lying');
      if (blind) sendDog(s, blind.pos);
    }
    return;
  }
  if (s.phase === 'throwing') return;

  const wanted = s.items.find((i) => i.state === 'lying' && i.kind !== 'ball');
  if (!wanted) return;
  if (dog.mode === 'sit' || dog.mode === 'heel') {
    sendDog(s, wanted.pos);
    return;
  }
  if (dog.mode === 'stopped' || dog.mode === 'popped') {
    // Good handlers cast to the downwind side so the nose can finish the job.
    const { dir } = windAt(s.wind, s.time);
    const offset = skill > 0.5 ? fromHeading(headingOf(dir), 4) : { x: 0, z: 0 };
    const aimError = (1 - skill) * 10;
    castDog(
      s,
      add(add(wanted.pos, offset), {
        x: (random(rng) - 0.5) * aimError,
        z: (random(rng) - 0.5) * aimError,
      }),
    );
    return;
  }
  if (dog.mode === 'line' || dog.mode === 'hunt' || dog.mode === 'run') {
    const offTarget = dog.mode === 'hunt' ? distance(dog.huntCenter, wanted.pos) : 0;
    const from = s.lineFrom ?? s.field.line;
    const line = sub(wanted.pos, from);
    const off = sub(dog.pos, from);
    const len = Math.hypot(line.x, line.z) || 1;
    const offLine = dog.mode === 'line' ? Math.abs(off.x * line.z - off.z * line.x) / len : 0;
    const tolerance = 4 + (1 - skill) * 10;
    if ((offLine > tolerance || offTarget > tolerance + 4) && random(rng) < 0.3 + skill * 0.7)
      blowWhistle(s);
  }
}

/** Plays a search to the end. Better handlers read indications correctly more often. */
export function playSearch(
  s: SearchSession,
  skill: number,
  rng: Rng,
  maxSeconds = 240,
): SearchSession {
  let nextMove = 0;
  for (let i = 0; i < maxSeconds / FIXED_DT && s.phase !== 'complete'; i++) {
    // Walk out toward the search area, staying a little behind the dog.
    const goal = s.searchCenter ?? s.setup.hintCenter;
    const toGoal = sub(goal, s.keeper.pos);
    const far = Math.hypot(toGoal.x, toGoal.z) > 16;
    setSearchKeeperInput(s, far ? normalize(toGoal) : { x: 0, z: 0 }, false);
    stepSearch(s, FIXED_DT);
    if (s.phase === 'ready') searchHere(s, s.setup.hintCenter);
    if (s.phase === 'alert' && s.alert && s.time - s.alert.since > 1.2 - skill * 0.6) {
      const real = s.hides[s.alert.hide]!.kind === 'target';
      const readsCorrectly = random(rng) < 0.5 + skill * 0.4;
      if (real === readsCorrectly) trustAlert(s);
      else doubtAlert(s);
    }
    if (
      s.phase === 'searching' &&
      s.dog.mode === 'hunt' &&
      s.time > nextMove &&
      s.dog.huntTime > 30 - skill * 12
    ) {
      nextMove = s.time + 8;
      const a = random(rng) * Math.PI * 2;
      const r = s.setup.hintRadius * 0.6;
      searchHere(s, {
        x: s.setup.hintCenter.x + Math.cos(a) * r,
        z: s.setup.hintCenter.z + Math.sin(a) * r,
      });
    }
  }
  return s;
}
