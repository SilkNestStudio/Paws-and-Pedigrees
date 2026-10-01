import { distance, type Vec2 } from '../core/math';
import { blowWhistle, callForThrows, castDog, recallDog, sendDog, steadyDog, throwBall } from '../sim/retrieve';
import { giveCue, mark, type CueChoice } from '../sim/training';
import { playCue, playMark, playRecall, playThrow, playWhistle } from './audio';
import { live, useGame } from './store';

/**
 * Everything the player can do, routed to whichever session is running.
 * Keyboard, touch buttons and ground taps all go through here.
 */
export function whistle(): void {
  if (live.field) {
    playWhistle();
    blowWhistle(live.field);
  } else if (live.lesson?.lesson === 'stop') {
    playWhistle();
    giveCue(live.lesson);
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
  }
}

export function throwsPlease(): void {
  if (live.field && live.field.phase === 'ready') {
    playThrow();
    callForThrows(live.field);
  }
}

export function yes(): void {
  if (live.lesson) {
    playMark();
    mark(live.lesson);
  }
}

export function lessonCue(choice?: CueChoice): void {
  const t = live.lesson;
  if (!t) return;
  if (t.lesson === 'stop') {
    // The stop lesson's first press throws; once the dog is running, it whistles.
    if (t.phase === 'idle') {
      playThrow();
      giveCue(t);
    } else {
      whistle();
    }
    return;
  }
  if (t.lesson === 'stay') playThrow();
  else playCue();
  giveCue(t, choice);
}

/** A tap or click on the ground: send, cast, throw, or pick a pile. */
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
  const t = live.lesson;
  if (t?.lesson === 'cast') {
    const pile = t.scene.piles.reduce((best, p) => (distance(p.pos, point) < distance(best.pos, point) ? p : best));
    if (distance(pile.pos, point) < 7) lessonCue(pile.id);
  }
}

export function openBook(): void {
  const { panel, setPanel } = useGame.getState();
  setPanel(panel === 'book' ? 'none' : 'book');
}
