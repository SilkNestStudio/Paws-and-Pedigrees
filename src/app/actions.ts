import { distance, type Vec2 } from '../core/math';
import { activeDog } from '../game/state';
import {
  blowWhistle,
  callForThrows,
  castDog,
  recallDog,
  sendDog,
  steadyDog,
  throwBall,
} from '../sim/retrieve';
import { callBack, doubtAlert, searchHere, trustAlert } from '../sim/search';
import { giveCue, mark, type CueChoice } from '../sim/training';
import { callDog, greetDog } from '../sim/home';
import { playCue, playMark, playRecall, playThrow, playWhistle } from './audio';
import { live, useApp } from './store';
import { MARA_POS, petDog, talkToMara, activateSpot } from './flow';

/**
 * Everything the player can do with keys, buttons or taps, routed to
 * whichever activity is running.
 */

/** Click-to-walk target at home (mainly for phones). */
export const walkTarget: { point: Vec2 | null } = { point: null };

export function whistle(): void {
  if (live.field) {
    playWhistle();
    blowWhistle(live.field);
  } else if (live.lesson?.lesson === 'stop') {
    playWhistle();
    giveCue(live.lesson);
  } else if (live.home) {
    playRecall();
    callDog(live.home);
  }
}

export function steady(): void {
  if (live.field) {
    playCue();
    steadyDog(live.field);
  }
}

export function recall(): void {
  if (live.field) {
    playRecall();
    recallDog(live.field);
  } else if (live.search) {
    playRecall();
    callBack(live.search);
  } else if (live.home) {
    playRecall();
    callDog(live.home);
  }
}

export function throwsPlease(): void {
  if (
    live.field &&
    live.field.phase === 'ready' &&
    live.field.items.some((i) => i.state === 'waiting')
  ) {
    playThrow();
    callForThrows(live.field);
  }
}

export function yes(): void {
  if (live.lesson) {
    playMark();
    mark(live.lesson);
  } else if (live.search?.phase === 'alert') {
    showMe();
  }
}

export function showMe(): void {
  if (live.search) {
    playMark();
    trustAlert(live.search);
  }
}

export function searchOn(): void {
  if (live.search) {
    playCue();
    doubtAlert(live.search);
  }
}

export function lessonCue(choice?: CueChoice): void {
  const t = live.lesson;
  if (!t) return;
  if (t.lesson === 'stop') {
    if (t.phase === 'idle') {
      playThrow();
      giveCue(t);
    } else whistle();
    return;
  }
  if (t.lesson === 'stay') playThrow();
  else playCue();
  giveCue(t, choice);
}

/** The context action at home (E / the big button): use whatever is nearby. */
export function interact(): void {
  const h = live.home;
  const g = useApp.getState().game;
  if (!h || !g) return;
  if (g.story === 'meetMara' && distance(h.keeper.pos, MARA_POS) < 2.8) {
    talkToMara();
    return;
  }
  if (h.nearSpot) {
    activateSpot(h.nearSpot);
    return;
  }
  if (h.nearDog && activeDog(g)) pat();
}

/** Give your dog a pat (F, or the button that appears when you're close). */
export function pat(): void {
  const h = live.home;
  const g = useApp.getState().game;
  if (!h || !g || !h.nearDog || !activeDog(g)) return;
  greetDog(h);
  petDog();
}

/** A tap or click on the ground. */
export function tapGround(point: Vec2): void {
  const s = live.field;
  if (s) {
    const mode = s.dog.mode;
    if (mode === 'stopped' || mode === 'popped') {
      playCue();
      castDog(s, point);
    } else if (mode === 'sit' || mode === 'heel') {
      if (s.setup.free) {
        playThrow();
        throwBall(s, point);
      } else if (s.phase !== 'throwing') {
        playCue();
        sendDog(s, point);
      }
    }
    return;
  }
  if (live.search) {
    if (live.search.phase !== 'complete' && live.search.phase !== 'returning') {
      playCue();
      searchHere(live.search, point);
    }
    return;
  }
  const t = live.lesson;
  if (t?.lesson === 'cast') {
    const pile = t.scene.piles.reduce((best, p) =>
      distance(p.pos, point) < distance(best.pos, point) ? p : best,
    );
    if (distance(pile.pos, point) < 7) lessonCue(pile.id);
    return;
  }
  if (live.home) walkTarget.point = { ...point };
}

// Development builds let test scripts tap the ground at a world point.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __tap: typeof tapGround }).__tap = (p) => tapGround(p);
}
