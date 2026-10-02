import { createRng, random } from '../core/rng';
import { CUE_LABELS, type Dog } from '../core/dog/dog';
import type { Vec2 } from '../core/math';
import { createFounderGenome } from '../core/genetics/genome';
import { observe, ACTIVITY_OBSERVATIONS } from '../core/dog/knowledge';
import {
  activeDog,
  addFlag,
  eventSeed,
  FUN_DAY,
  hasFlag,
  newGame,
  note,
  update,
  type GameState,
} from '../game/state';
import { firstJob, type Job } from '../game/jobs';
import {
  brushDog,
  buy,
  canStartActivity,
  dogAte,
  fillBowl as fillBowlRule,
  finishActivity,
  petDog as petDogRule,
  restAtHome,
  restore,
  sleep as sleepRule,
  type ActivityKind,
} from '../game/rules';
import { LINES, progressStory, type Line } from '../game/story';
import {
  createRivals,
  funDaySearch,
  rivalRound,
  ROUNDS,
  standings,
  type RoundId,
} from '../game/funday';
import { deleteGame, loadGame, saveGame } from '../game/save';
import { createHomeSession, fillHomeBowl, HOME_SPOTS, type SpotId } from '../sim/home';
import { createRetrieveSession } from '../sim/retrieve';
import { buildReport } from '../sim/report';
import {
  buildSearchReport,
  createSearchSession,
  randomSearchSetup,
  type SearchSetup,
} from '../sim/search';
import { createTrainingSession, lessonSummary, LESSONS, type Lesson } from '../sim/training';
import {
  FREE_PLAY,
  FUN_DAY_BLIND,
  FUN_DAY_MARK,
  RETRIEVE_SETUPS,
  type RetrieveSetup,
} from '../sim/exercises';
import {
  createOrchard,
  createShelterYard,
  createTrainingField,
  createVillageGreen,
  type Field,
} from '../sim/field';
import { live, toast, useApp, type Place, type ResultView } from './store';

/**
 * Everything that moves the player through the week: starting and saving the
 * game, walking around home, travelling, starting and finishing activities,
 * the Fun Day, and going to bed. Rules come from src/game; this file decides
 * what the player sees next.
 */

const get = () => useApp.getState();
const game = (): GameState => {
  const g = get().game;
  if (!g) throw new Error('No game loaded');
  return g;
};

/** Changes the saved game, moves the story on, and saves. */
export function commit(change: (draft: GameState) => void): GameState {
  const next = update(game(), (draft) => {
    change(draft);
    progressStory(draft);
  });
  useApp.setState({ game: next });
  saveGame(next);
  return next;
}

export function fieldFor(place: Place): Field {
  switch (place) {
    case 'orchard':
      return createOrchard();
    case 'green':
      return createVillageGreen();
    case 'shelter':
      return createShelterYard();
    default:
      return createTrainingField();
  }
}

function clearLive(): void {
  live.home = null;
  live.field = null;
  live.search = null;
  live.lesson = null;
}

function nextRun(): number {
  return get().runId + 1;
}

// ---------------------------------------------------------------------------
// Starting
// ---------------------------------------------------------------------------

export async function boot(): Promise<void> {
  const saved = await loadGame();
  useApp.setState({ game: saved, screen: { kind: 'title' } });
}

export function startNewGame(): void {
  const g = newGame();
  useApp.setState({
    game: g,
    screen: { kind: 'letter', page: 0 },
    panel: null,
    result: null,
    funDay: null,
  });
  saveGame(g);
}

export function continueGame(): void {
  const g = game();
  if (g.story === 'letter') useApp.setState({ screen: { kind: 'letter', page: 0 } });
  else goHome(g.dogs.length ? 'house' : 'arrive');
}

export async function resetGame(): Promise<void> {
  await deleteGame();
  clearLive();
  useApp.setState({ game: null, screen: { kind: 'title' }, panel: null });
}

export function finishLetter(): void {
  commit((g) => {
    if (g.story === 'letter') g.story = 'explore';
  });
  goHome('arrive');
  say(
    [
      { speaker: 'You', text: "So this is it. Grandpa's kennel. It's quieter than I remember." },
      {
        speaker: 'You',
        text: 'I should look around first: his office, the runs, the pantry. The arrow will show me where.',
      },
    ],
    () => showIntro('home'),
  );
}

// ---------------------------------------------------------------------------
// Dialogue and intro cards
// ---------------------------------------------------------------------------

export function say(lines: Line[], then?: () => void): void {
  useApp.setState({ dialog: { lines, index: 0, then } });
}

export function advanceDialog(): void {
  const d = get().dialog;
  if (!d) return;
  if (d.index + 1 < d.lines.length) useApp.setState({ dialog: { ...d, index: d.index + 1 } });
  else {
    useApp.setState({ dialog: null });
    d.then?.();
  }
}

const INTROS: Record<string, { title: string; lines: string[] }> = {
  home: {
    title: 'Getting around',
    lines: [
      'Walk with WASD or the arrow keys (on a phone, the stick in the corner). Hold Shift to jog.',
      'The orange arrow always points to your next goal. Walk up to things to use them: a button appears.',
      'Drag the screen or press Q and E to look around.',
    ],
  },
  mark: {
    title: 'How a mark works',
    lines: [
      '1. Press "Throw!". A helper throws a dummy. Watch where it lands: a flag marks the spot.',
      '2. Keep your dog steady. If it starts to quiver, press "Sit".',
      '3. Click or tap on the fall to send your dog. It runs to where it saw it land and hunts with its nose.',
      '4. If it hunts in the wrong place, blow the whistle (Space), then click where you want it to go.',
    ],
  },
  blind: {
    title: 'How a blind works',
    lines: [
      "Something is hidden by the orange stake. Your dog didn't see it fall; only you know where it is.",
      '1. Click or tap toward the stake to send your dog. It runs out along the dotted line.',
      '2. If it drifts off, blow the whistle (Space) to stop it, then click where it should go.',
      '3. Check the wind arrow at the top. Scent drifts downwind, so sending your dog downwind of the stake lets its nose finish the job.',
    ],
  },
  search: {
    title: 'How a search works',
    lines: [
      'The lost item is somewhere in the circle. Walk out with your dog; it searches near you.',
      '1. Click or tap the ground to say "Search here!". Your dog quarters back and forth across the wind.',
      '2. Watch its body language. Slow, careful sniffing means a real scent. Bouncy, excited sniffing usually means a rabbit or picnic smell.',
      '3. When your dog indicates (sits and stares, or paws at a spot), choose "Show me!" if you trust it, or "Search on" if you don\'t.',
    ],
  },
  lesson: {
    title: 'How lessons work',
    lines: [
      'Lessons are marker training. Give the cue, then press "Yes!" (Space) at the exact moment your dog does the right thing.',
      'On time teaches fast. Late teaches little. Rewarding the wrong thing teaches the wrong thing.',
      'Each lesson uses one part of the day. Skills you build here make field work and jobs easier.',
    ],
  },
  shelter: {
    title: 'Meeting the dogs',
    lines: [
      'Three dogs are waiting for a home. Play ball with each one: click or tap the ground to throw.',
      "Watch how they play. Speed, nose, focus: each dog is different, and you'll learn more as you work together.",
      "When you're ready, choose one. This dog will be the start of your kennel.",
    ],
  },
};

export function showIntro(key: string, force = false): void {
  if (!force && hasFlag(game(), `intro:${key}`)) return;
  const card = INTROS[key];
  if (!card) return;
  commit((g) => addFlag(g, `intro:${key}`));
  useApp.setState({ intro: { ...card, key }, panel: 'intro' });
}

export function closeIntro(): void {
  useApp.setState({ intro: null, panel: null });
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

const SPAWNS: Record<string, Vec2> = {
  arrive: { x: 0, z: 78 },
  house: { x: -11, z: 55.5 },
  fieldGate: { x: 0, z: 47.5 },
  van: { x: 23, z: 68 },
};

export const MARA_POS: Vec2 = { x: 3, z: 74 };

export function goHome(spawn: SpotId | 'arrive' = 'arrive'): void {
  clearLive();
  const g = game();
  const at = SPAWNS[spawn] ?? HOME_SPOTS.find((s) => s.id === spawn)?.pos ?? SPAWNS.arrive!;
  live.home = createHomeSession(
    activeDog(g),
    eventSeed(g, `home-${get().runId}`),
    at,
    g.bowlFilled,
  );
  useApp.setState({ screen: { kind: 'home' }, panel: null, runId: nextRun(), homeSpawn: spawn });
}

/** The home simulation reports that the dog finished its bowl. */
export function homeDogAte(): void {
  const name = activeDog(game())?.name ?? 'Your dog';
  commit((g) => dogAte(g));
  toast(`${name} cleaned the bowl.`, 'good');
}

export function useSpot(spot: SpotId): void {
  const g = game();
  switch (spot) {
    case 'office':
      commit((d) => addFlag(d, 'saw:office'));
      if (!hasFlag(g, 'saw:office'))
        say(LINES.ledger!(g), () => useApp.setState({ panel: 'office' }));
      else useApp.setState({ panel: 'office' });
      break;
    case 'runs':
      commit((d) => addFlag(d, 'saw:runs'));
      if (!g.dogs.length) say(LINES.runs!(g));
      else fillBowl();
      break;
    case 'bowl':
      fillBowl();
      break;
    case 'pantry':
      commit((d) => addFlag(d, 'saw:pantry'));
      say(LINES.pantry!(game()));
      break;
    case 'gateSign':
      useApp.setState({ panel: 'gateSign' });
      break;
    case 'van':
      if (g.story === 'explore' && g.kennelName === '') {
        say([
          {
            speaker: 'You',
            text: "Before I head off, I should put a name on the gate sign. It's my kennel now.",
          },
        ]);
        return;
      }
      useApp.setState({ panel: 'van' });
      break;
    case 'noticeboard':
      useApp.setState({ panel: 'noticeboard' });
      break;
    case 'fieldGate':
      if (!g.dogs.length) {
        say([{ speaker: 'You', text: "Grandpa's training field. Not much use without a dog." }]);
        return;
      }
      useApp.setState({ panel: 'fieldGate' });
      break;
    case 'house':
      useApp.setState({ panel: 'bed' });
      break;
    case 'scentGarden':
      useApp.setState({ panel: 'scentGarden' });
      break;
  }
}

export function fillBowl(): void {
  const g = game();
  const dog = activeDog(g);
  if (!dog) return;
  if (g.bowlFilled) {
    toast(`The bowl is already full. ${dog.name} will eat when hungry.`);
    return;
  }
  if (g.food <= 0) {
    toast('The pantry is empty! Buy kibble at the village shop (take the van).', 'warn');
    return;
  }
  commit((d) => fillBowlRule(d));
  if (live.home) fillHomeBowl(live.home);
  toast(`Bowl filled. ${game().food} meals left in the pantry.`);
}

export function petDog(): void {
  const dog = activeDog(game());
  if (!dog) return;
  let petted = false;
  commit((g) => {
    petted = petDogRule(g);
  });
  toast(
    petted ? `${dog.name} leans into your hand, tail going.` : `${dog.name} enjoys the fuss.`,
    'good',
  );
}

export function brush(): void {
  const dog = activeDog(game());
  if (!dog) return;
  let ok = false;
  commit((g) => {
    ok = brushDog(g);
  });
  toast(
    ok ? `A good brush. ${dog.name}'s coat shines.` : 'Already brushed today.',
    ok ? 'good' : 'info',
  );
}

export function talkToMara(): void {
  say(LINES.maraHello!(game()), () => {
    commit((g) => {
      addFlag(g, 'metMara');
      if (!g.jobs.some((j) => j.id === 'mara-keys') && !g.jobsDone.includes('mara-keys')) {
        g.jobs.unshift(firstJob(eventSeed(g, 'mara-keys')));
      }
    });
    toast("New job on the noticeboard: Mara's lost keys. Take the van to her orchard.", 'good');
  });
}

export function nameKennel(name: string): void {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 28);
  if (clean.length < 2) return;
  commit((g) => {
    g.kennelName = clean;
    note(g, `Named the kennel ${clean}.`);
  });
  useApp.setState({ panel: null });
  toast(`Welcome to ${clean} Kennels.`, 'good');
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

export function travel(dest: 'shelter' | 'village' | 'green' | 'home'): void {
  useApp.setState({ panel: null });
  if (dest === 'shelter') {
    commit((g) => {
      if (g.story === 'explore') g.story = 'toShelter';
    });
    meetShelterDog(0);
    showIntro('shelter');
  } else if (dest === 'village') {
    useApp.setState({ panel: 'shop' });
  } else if (dest === 'green') {
    beginFunDay();
  } else goHome('van');
}

// ---------------------------------------------------------------------------
// The shelter
// ---------------------------------------------------------------------------

export function meetShelterDog(index: number): void {
  const g = game();
  const dog = g.shelter[index];
  if (!dog) return;
  clearLive();
  live.field = createRetrieveSession(
    dog,
    FREE_PLAY,
    eventSeed(g, `shelter-${index}`),
    createShelterYard(),
  );
  commit((d) => {
    addFlag(d, `met:${dog.id}`);
    if (d.shelter.every((s) => hasFlag(d, `met:${s.id}`))) addFlag(d, 'met:all');
    d.knowledge[dog.id] ??= {};
    observe(
      createRng(eventSeed(d, `meet-${dog.id}`)),
      dog,
      d.knowledge[dog.id]!,
      ACTIVITY_OBSERVATIONS.meet!,
    );
  });
  useApp.setState({
    screen: { kind: 'shelter' },
    shelterPick: index,
    runId: nextRun(),
    panel: null,
  });
}

export function adopt(index: number, name: string): void {
  const chosen = game().shelter[index];
  if (!chosen) return;
  const clean = name.trim().slice(0, 16) || chosen.name;
  commit((g) => {
    const dog: Dog = { ...g.shelter[index]!, name: clean };
    g.dogs.push(dog);
    g.activeDogId = dog.id;
    g.shelter = [];
    g.block = 'evening';
    note(g, `Brought ${clean} home from Larchwood Rescue.`);
  });
  goHome('van');
  say([
    { speaker: 'You', text: `Welcome home, ${clean}. This is where you live now.` },
    { speaker: 'You', text: 'First things first: a meal. The food bowl is by the runs.' },
  ]);
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

function allowed(kind: ActivityKind): boolean {
  const check = canStartActivity(game(), kind);
  if (!check.ok) {
    toast(check.reason, 'warn');
    return false;
  }
  return true;
}

export function startFieldWork(
  setup: RetrieveSetup,
  opts: { job?: Job; round?: RoundId; place?: Place } = {},
): void {
  const kind: ActivityKind = setup.free
    ? 'free'
    : setup.blinds.length && !setup.marks.length
      ? 'blind'
      : 'mark';
  if (!opts.round && !allowed(kind)) return;
  const g = game();
  const dog = activeDog(g)!;
  const place = opts.place ?? 'home';
  clearLive();
  live.field = createRetrieveSession(
    dog,
    setup,
    eventSeed(g, `field-${setup.id}-${g.results.length}`),
    fieldFor(place),
  );
  useApp.setState({
    screen: { kind: 'retrieve', place, setup, job: opts.job, round: opts.round },
    panel: null,
    runId: nextRun(),
  });
  if (!setup.free) showIntro(kind);
}

export function startSearch(
  setup: SearchSetup,
  opts: { job?: Job; round?: RoundId; place?: Place } = {},
): void {
  if (!opts.round && !allowed('search')) return;
  const g = game();
  const dog = activeDog(g)!;
  const place = opts.place ?? 'orchard';
  clearLive();
  live.search = createSearchSession(
    dog,
    setup,
    fieldFor(place),
    eventSeed(g, `search-${setup.title}-${g.results.length}`),
  );
  useApp.setState({
    screen: { kind: 'search', place, setup, job: opts.job, round: opts.round },
    panel: null,
    runId: nextRun(),
  });
  showIntro('search');
}

export function startLesson(lesson: Lesson): void {
  if (!allowed('lesson')) return;
  const g = game();
  const dog = activeDog(g)!;
  clearLive();
  live.lesson = createTrainingSession(
    dog,
    lesson,
    eventSeed(g, `lesson-${lesson}-${g.results.length}`),
  );
  if (hasFlag(g, 'own:longline')) live.lesson.treats += 5;
  useApp.setState({ screen: { kind: 'lesson', lesson }, panel: null, runId: nextRun() });
  showIntro('lesson');
}

const SEARCH_AREAS: Record<string, { item: string; center: Vec2; radius: number }> = {
  'mara-keys': { item: "Mara's keys", center: { x: -12, z: -28 }, radius: 14 },
  'hollins-glove': { item: 'the glove', center: { x: 16, z: -22 }, radius: 16 },
  'ellis-knife': { item: 'the pocket knife', center: { x: -20, z: -46 }, radius: 16 },
  'pip-rabbit': { item: 'the toy rabbit', center: { x: 12, z: -50 }, radius: 14 },
};

export function startJob(job: Job): void {
  const rng = createRng(job.seed);
  if (job.kind === 'search') {
    const area = SEARCH_AREAS[job.id] ?? { item: 'it', center: { x: 0, z: -30 }, radius: 16 };
    startSearch(randomSearchSetup(rng, job.title, area.item, area), { job, place: 'orchard' });
  } else if (job.kind === 'blind') {
    const x = -30 + random(rng) * 60;
    const setup: RetrieveSetup = {
      id: `job-${job.id}`,
      title: job.title,
      summary: job.blurb,
      focus: 'A blind for a neighbour',
      marks: [],
      blinds: [{ x, z: -58 + random(rng) * 10 }],
      windDeg: Math.round(random(rng) * 360),
      windStrength: 0.35 + random(rng) * 0.35,
    };
    startFieldWork(setup, { job, place: 'orchard' });
  } else {
    const base = RETRIEVE_SETUPS.find(
      (s) => s.id === (random(rng) < 0.5 ? 'double' : 'long-mark'),
    )!;
    startFieldWork({ ...base, id: `job-${job.id}`, title: job.title }, { job, place: 'home' });
  }
}

/** Called by the scene when the live session ends. */
export function activityFinished(): void {
  const screen = get().screen;
  if (screen.kind === 'retrieve') finishRetrieve();
  else if (screen.kind === 'search') finishSearchActivity();
  else if (screen.kind === 'lesson') finishLessonActivity();
}

function finishRetrieve(): void {
  const s = live.field;
  const screen = get().screen;
  if (!s || screen.kind !== 'retrieve') return;
  const report = buildReport(s);
  const kind: ActivityKind =
    screen.setup.blinds.length && !screen.setup.marks.length ? 'blind' : 'mark';
  if (screen.round) return finishRound(screen.round, report.score, report.notes);
  const pay = screen.job ? screen.job.pay : 0;
  let discoveries: ResultView['discoveries'] = [];
  commit((g) => {
    discoveries = finishActivity(g, {
      kind,
      title: screen.setup.title,
      score: report.score,
      grade: report.grade,
      observe: kind,
      pay,
      jobId: screen.job?.id,
    });
  });
  useApp.setState({
    panel: 'result',
    result: {
      title: screen.setup.title,
      grade: report.grade,
      score: report.score,
      seconds: report.seconds,
      notes: report.notes,
      discoveries,
      pay,
      suggestion: report.suggestion.text,
      next: 'home',
    },
  });
}

function finishSearchActivity(): void {
  const s = live.search;
  const screen = get().screen;
  if (!s || screen.kind !== 'search') return;
  const report = buildSearchReport(s);
  if (screen.round) return finishRound(screen.round, report.score, report.notes);
  const pay = screen.job ? screen.job.pay : 0;
  let discoveries: ResultView['discoveries'] = [];
  commit((g) => {
    discoveries = finishActivity(g, {
      kind: 'search',
      title: screen.setup.title,
      score: report.score,
      grade: report.grade,
      observe: 'search',
      pay,
      jobId: screen.job?.id,
    });
  });
  useApp.setState({
    panel: 'result',
    result: {
      title: screen.setup.title,
      grade: report.grade,
      score: report.score,
      seconds: report.seconds,
      notes: report.notes,
      discoveries,
      pay,
      next: 'home',
    },
  });
  if (screen.job?.id === 'mara-keys')
    useApp.setState({ result: { ...get().result!, suggestion: 'Mara is delighted.' } });
}

function finishLessonActivity(): void {
  const t = live.lesson;
  const screen = get().screen;
  if (!t || screen.kind !== 'lesson') return;
  const summary = lessonSummary(t);
  const gain = summary.after - summary.before;
  let discoveries: ResultView['discoveries'] = [];
  commit((g) => {
    addFlag(g, `lesson:${t.lesson}`);
    discoveries = finishActivity(g, {
      kind: 'lesson',
      title: LESSONS[t.lesson].title,
      score: Math.round(summary.after * 100),
      grade: gain > 0.05 ? 'Good progress' : gain > 0 ? 'A little progress' : 'No progress',
      observe: 'lesson',
      skill: { cue: t.lesson, value: t.skill },
    });
  });
  const c = summary.counts;
  const notes: ResultView['notes'] = [];
  if (c.perfect) notes.push({ text: `${c.perfect} perfectly timed rewards.`, tone: 'good' });
  if (c.shaping)
    notes.push({ text: `${c.shaping} rewards for steps in the right direction.`, tone: 'good' });
  if ((c.early ?? 0) + (c.late ?? 0) > 0)
    notes.push({ text: `${c.early ?? 0} early and ${c.late ?? 0} late marks.`, tone: 'info' });
  if ((c.wrong ?? 0) + (c.sloppy ?? 0) > 0)
    notes.push({
      text: `${(c.wrong ?? 0) + (c.sloppy ?? 0)} rewards for the wrong thing cost progress.`,
      tone: 'warn',
    });
  useApp.setState({
    panel: 'result',
    result: {
      title: LESSONS[t.lesson].title,
      grade: gain >= 0 ? `+${Math.round(gain * 100)} points` : `${Math.round(gain * 100)} points`,
      score: Math.round(summary.after * 100),
      seconds: t.time,
      notes,
      discoveries,
      pay: 0,
      skill: { name: CUE_LABELS[t.lesson].name, before: summary.before, after: summary.after },
      next: 'home',
    },
  });
}

/** Leaves an activity early: no reward, no cost. */
export function abandonActivity(): void {
  const screen = get().screen;
  useApp.setState({ panel: null, result: null });
  if (screen.kind === 'shelter') return;
  if ((screen.kind === 'retrieve' || screen.kind === 'search') && screen.round) {
    finishRound(screen.round, 0, [{ text: 'Retired from the round.', tone: 'warn' }]);
    return;
  }
  goHome(
    screen.kind === 'search' || (screen.kind === 'retrieve' && screen.place === 'orchard')
      ? 'van'
      : 'fieldGate',
  );
}

export function closeResult(): void {
  const r = get().result;
  useApp.setState({ result: null, panel: null });
  const screen = get().screen;
  if (!r) return;
  if (r.next === 'funDayNext') return nextRound();
  if (r.next === 'funDayDone') return finishFunDay();
  const g = game();
  if (screen.kind === 'search' && screen.job?.id === 'mara-keys') {
    goHome('van');
    say(LINES.maraAfterKeys!(g));
    return;
  }
  goHome(
    screen.kind === 'search' || (screen.kind === 'retrieve' && screen.place === 'orchard')
      ? 'van'
      : 'fieldGate',
  );
  if (g.block === 'night')
    toast("It's getting dark. Time to head to bed (the farmhouse door).", 'info');
}

// ---------------------------------------------------------------------------
// The Fun Day
// ---------------------------------------------------------------------------

export function canGoToFunDay(g: GameState): boolean {
  return g.day >= FUN_DAY && !g.funDay && g.dogs.length > 0 && g.block !== 'night';
}

function beginFunDay(): void {
  const g = game();
  if (!canGoToFunDay(g)) {
    toast(
      g.funDay
        ? 'The Fun Day is over for this year.'
        : `The Fun Day is on Sunday. It's day ${g.day} of 7.`,
      'info',
    );
    return;
  }
  useApp.setState({ funDay: { round: 0, player: [], rivals: [[], []] } });
  // Show the green first, then Mara explains.
  startRound(0);
  say(LINES.funDayIntro!(g));
}

function startRound(index: number): void {
  const round = ROUNDS[index]!;
  const g = game();
  if (round.id === 'search')
    startSearch(funDaySearch(g.seed % 997), { round: round.id, place: 'green' });
  else
    startFieldWork(round.id === 'mark' ? FUN_DAY_MARK : FUN_DAY_BLIND, {
      round: round.id,
      place: 'green',
    });
}

function finishRound(round: RoundId, score: number, notes: ResultView['notes']): void {
  const g = game();
  const fd = get().funDay;
  if (!fd) return;
  const index = ROUNDS.findIndex((r) => r.id === round);
  const rivals = createRivals(g.seed);
  const rivalScores = rivals.map((r) => rivalRound(r, round, g.seed % 9973));
  const progress = {
    round: index,
    player: [...fd.player, score],
    rivals: fd.rivals.map((rs, i) => [...rs, rivalScores[i]!]),
  };
  useApp.setState({ funDay: progress });
  const last = index === ROUNDS.length - 1;
  const beat = rivals
    .filter((_, i) => score > rivalScores[i]!)
    .map((r) => `${r.handler} (${rivalScores[rivals.indexOf(r)]})`);
  useApp.setState({
    panel: 'result',
    result: {
      title: ROUNDS[index]!.title,
      grade:
        score >= 85
          ? 'Excellent'
          : score >= 70
            ? 'Very good'
            : score >= 55
              ? 'Good'
              : score > 0
                ? 'Pass'
                : 'No score',
      score,
      seconds: 0,
      notes: [
        ...notes,
        {
          text: `Victor Sterling and Duchess scored ${rivalScores[0]}. Billy Ashby and Pickles scored ${rivalScores[1]}.`,
          tone: 'info',
        },
        ...(beat.length
          ? [{ text: `You beat ${beat.join(' and ')} this round!`, tone: 'good' as const }]
          : []),
      ],
      discoveries: [],
      pay: 0,
      next: last ? 'funDayDone' : 'funDayNext',
    },
  });
}

function nextRound(): void {
  const fd = get().funDay;
  if (!fd) return;
  startRound(fd.round + 1);
}

function finishFunDay(): void {
  const fd = get().funDay;
  if (!fd) return;
  const g = game();
  const dog = activeDog(g)!;
  const rivals = createRivals(g.seed);
  const record = standings(g.kennelName || 'Your kennel', dog, fd.player, rivals, fd.rivals);
  const place = record.entries.findIndex((e) => e.player) + 1;
  const best = ROUNDS.find((r) => r.id === record.bestRound)!;
  commit((d) => {
    d.funDay = record;
    d.block = 'evening';
    note(
      d,
      `Village Fun Day: placed ${ordinal(place)} of 3. ${dog.name} was best at ${best.skill}.`,
    );
    d.knowledge[dog.id] ??= {};
    for (const o of ['mark', 'search', 'blind'] as const) {
      observe(
        createRng(eventSeed(d, `fd-${o}`)),
        dog,
        d.knowledge[dog.id]!,
        ACTIVITY_OBSERVATIONS[o]!,
      );
    }
  });
  useApp.setState({ panel: 'funDay' });
}

export function leaveFunDay(): void {
  const g = game();
  const record = g.funDay;
  useApp.setState({ panel: null, funDay: null });
  goHome('van');
  if (!record) return;
  const dog = activeDog(g)!;
  const place = record.entries.findIndex((e) => e.player) + 1;
  const best = ROUNDS.find((r) => r.id === record.bestRound)!;
  say([
    {
      speaker: 'Mara',
      text:
        place === 1
          ? `You won it! In your very first week. Your grandpa would be over the moon.`
          : `${ordinal(place)} place. Victor will be insufferable, but you saw it too, didn't you? ${dog.name} has a real gift for ${best.skill}.`,
    },
    {
      speaker: 'Mara',
      text: "That's what you build on. Train the weak spots, take the jobs, fix up the place. Next season there's the county trial, and after that, the Hollowmere Cup.",
    },
    { speaker: 'You', text: 'The cup Grandpa used to win. One day.' },
  ]);
}

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

// ---------------------------------------------------------------------------
// Bed, rest, shopping, restoring
// ---------------------------------------------------------------------------

export function goToBed(): void {
  const g = game();
  if (g.dogs.length === 0) {
    say([
      {
        speaker: 'You',
        text: 'Not yet. Grandpa wanted me to start with a dog from Larchwood Rescue. The van is out front.',
      },
    ]);
    useApp.setState({ panel: null });
    return;
  }
  let messages: string[] = [];
  commit((d) => {
    messages = sleepRule(d);
  });
  useApp.setState({ panel: null });
  goHome('house');
  messages.forEach((m, i) => setTimeout(() => toast(m, i === 0 ? 'info' : 'warn'), i * 400));
}

export function restEvening(): void {
  commit((g) => restAtHome(g));
  useApp.setState({ panel: null });
  toast('A quiet hour together. Your dog stretches out in the sun.', 'good');
}

export function buyItem(id: string): void {
  let result = { ok: false, message: '' };
  commit((g) => {
    result = buy(g, id);
  });
  toast(result.message, result.ok ? 'good' : 'warn');
}

export function restoreGarden(): void {
  let result = { ok: false, message: '' };
  commit((g) => {
    result = restore(g, 'scentGarden');
  });
  toast(result.message, result.ok ? 'good' : 'warn');
  if (result.ok) useApp.setState({ panel: null });
}

// ---------------------------------------------------------------------------
// Tester tools (development only, behind the menu)
// ---------------------------------------------------------------------------

export function devSkipDays(days: number): void {
  for (let i = 0; i < days; i++) commit((g) => sleepRule(g));
  goHome('house');
}

export function devMoney(): void {
  commit((g) => {
    g.money += 200;
    g.food += 10;
  });
}

export function devAdoptQuick(): void {
  commit((g) => {
    if (g.dogs.length) return;
    const dog = g.shelter[0] ?? {
      ...g.dogs[0]!,
      genome: createFounderGenome(createRng(1), 'labrador'),
    };
    g.dogs.push(dog);
    g.activeDogId = dog.id;
    g.shelter = [];
    if (g.kennelName === '') g.kennelName = 'Test';
    g.story = 'settle';
  });
  goHome('house');
}
