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
  adoptDog,
  ADOPTION_FEE,
  brushDog,
  buy,
  canStartActivity,
  dogAte,
  feedRuns,
  refreshShelter,
  setActiveDog,
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
  breed as breedRule,
  dnaTest,
  keepPuppy,
  placePuppy,
  register as registerDog,
} from '../game/breeding';
import { formatGenotype } from '../core/genetics/loci';
import {
  enterEvent,
  funDayEvent,
  QUALIFY,
  recordEvent,
  rivalScore,
  trialEvent,
  trialLevel,
  TRIAL_RULES,
  type EventDef,
  type EventOutcome,
} from '../game/events';
import { isTrialDay } from '../game/calendar';
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
import { FREE_PLAY, RETRIEVE_SETUPS, type RetrieveSetup } from '../sim/exercises';
import {
  createOrchard,
  createShelterYard,
  createTrainingField,
  createTrialGround,
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

/**
 * Runs a change of place behind a short fade. The click responds at once
 * (the fade paints first), then the next place is built while it shows.
 */
export function go(label: string, change: () => void): void {
  if (get().cover) return;
  useApp.setState({ cover: label });
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      setTimeout(() => {
        change();
        setTimeout(() => useApp.setState({ cover: null }), 450);
      }, 0),
    ),
  );
}

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
    case 'trial':
      return createTrialGround();
    default: {
      const g = get().game;
      return createTrainingField({ pond: !!g && hasFlag(g, 'restored:duckPond') });
    }
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
    event: null,
  });
  saveGame(g);
}

export function continueGame(): void {
  const g = game();
  if (g.story === 'letter') useApp.setState({ screen: { kind: 'letter', page: 0 } });
  else {
    goHome(g.dogs.length ? 'house' : 'arrive');
    // Saves from before the trials guide was added still get to read it once.
    if (g.story === 'afterFunDay') showIntro('trials');
  }
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
      'W walks forward and S backs up; A and D turn you, and the camera turns with you. Hold Shift to jog. On a phone, use the stick in the corner, or tap the ground to walk there.',
      'The orange arrow always points to your next goal. Walk up to things to use them: a button appears (E).',
      'Drag the screen or press Q to look around for a moment.',
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
  trials: {
    title: 'How trials work',
    lines: [
      'Every Sunday from the second week there is a field trial at Larkspur. Take the van. Three rounds: a mark, a search and a blind, each scored out of 100.',
      'A qualifying run means at least 50 in every round and 165 or more in total. Your placing does not matter for that. Two qualifying runs earn the title, and your dog moves up a level.',
      'Your goal card lists the lessons to build up first. "Steady to the throw" stops your dog breaking on the mark (that costs 40 points); the "Stop whistle" and "Directions drill" let you handle the blind.',
      'Practise each round at home: marks and blinds at the training field gate, searches from the noticeboard jobs. After each trial you will be told which round to work on.',
    ],
  },
  breeding: {
    title: 'Breeding',
    lines: [
      'Pick a dam (one of your females, 18 months or older) and a sire: one of your own males, or a stud from the stud book for a fee.',
      'The forecast shows what the puppies are likely to be. Talent ranges come from what you know about the parents, so dogs you have worked a lot give clearer forecasts. A DNA test reveals coat genes, so you can see likely colours.',
      'Puppies arrive five days after mating, each with its own mix of genes. At three months, keep the best (each needs a run) and place the rest in good homes.',
    ],
  },
  water: {
    title: 'Water work',
    lines: [
      'Dogs swim far slower than they run, so many try to run round the pond by the bank instead of swimming. Judges count that as a serious fault.',
      'Watch for the dog veering along the edge. Blow the whistle (Space) straight away, then click a point across the water to send it back in.',
      'Dogs that love water go straight in. Shy ones hesitate at the edge; easy water marks build their confidence.',
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
  const next = get().introNext;
  useApp.setState({ intro: null, panel: next, introNext: null });
}

/** The breeding screen, with its how-to card first the very first time. */
export function openBreeding(tab: 'plan' | 'litters' | 'studs'): void {
  useApp.setState({ breedingTab: tab });
  if (!hasFlag(game(), 'intro:breeding')) {
    showIntro('breeding');
    useApp.setState({ introNext: 'breeding' });
  } else useApp.setState({ panel: 'breeding' });
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

const SPAWNS: Record<string, Vec2> = {
  arrive: { x: 0, z: 78 },
  house: { x: -16, z: 54.6 },
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
    // At the runs or the farmhouse, face the building so the camera stays out in the yard.
    spawn === 'runs' || spawn === 'house' ? 0 : Math.PI,
  );
  useApp.setState({ screen: { kind: 'home' }, panel: null, runId: nextRun(), homeSpawn: spawn });
}

/** The home simulation reports that the dog finished its bowl. */
export function homeDogAte(): void {
  const name = activeDog(game())?.name ?? 'Your dog';
  commit((g) => dogAte(g));
  toast(`${name} cleaned the bowl.`, 'good');
}

export function activateSpot(spot: SpotId): void {
  const g = game();
  switch (spot) {
    case 'office':
      // The farmhouse door. The first visit goes straight to Grandpa's ledger.
      commit((d) => addFlag(d, 'saw:office'));
      if (!hasFlag(g, 'saw:office'))
        say(LINES.ledger!(g), () => useApp.setState({ panel: 'office' }));
      else useApp.setState({ panel: 'bed' });
      break;
    case 'runs':
      commit((d) => addFlag(d, 'saw:runs'));
      if (!g.dogs.length) say(LINES.runs!(g));
      else if (g.dogs.length > 1) useApp.setState({ panel: 'kennel' });
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
    case 'paddock':
      if (!hasFlag(g, 'restored:whelpingRoom')) useApp.setState({ panel: 'whelping' });
      else {
        const pups = g.litters.some((l) => l.puppies.length > 0);
        openBreeding(pups || g.pregnancies.length ? 'litters' : 'plan');
      }
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

export function travel(dest: 'shelter' | 'village' | 'green' | 'trial' | 'home'): void {
  useApp.setState({ panel: null });
  if (dest === 'shelter') {
    commit((g) => {
      if (g.story === 'explore') g.story = 'toShelter';
      refreshShelter(g);
    });
    meetShelterDog(0);
    showIntro('shelter');
  } else if (dest === 'village') {
    useApp.setState({ panel: 'shop' });
  } else if (dest === 'green') {
    beginFunDay();
  } else if (dest === 'trial') {
    beginTrial();
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
  const before = game();
  const chosen = before.shelter[index];
  if (!chosen) return;
  const clean = name.trim().slice(0, 16) || chosen.name;
  const first = before.dogs.length === 0;
  let dog: Dog | null = null;
  commit((g) => {
    dog = adoptDog(g, index, clean);
    if (!dog) return;
    if (first) g.block = 'evening';
    note(g, `Brought ${clean} home from Larchwood Rescue.`);
  });
  if (!dog) {
    toast(`The adoption fee is $${ADOPTION_FEE}. Noticeboard jobs pay.`, 'warn');
    return;
  }
  goHome('van');
  if (first) {
    say([
      { speaker: 'You', text: `Welcome home, ${clean}. This is where you live now.` },
      { speaker: 'You', text: 'First things first: a meal. The food bowl is by the runs.' },
    ]);
    return;
  }
  const others = before.dogs.map((d) => d.name).join(' and ');
  say([
    {
      speaker: 'You',
      text: `Welcome home, ${clean}. ${others} will show you around. Your run is ready, with your name on the door.`,
    },
    {
      speaker: 'You',
      text: 'At the runs I can choose who comes out with me. The others wait in their runs, and need feeding too.',
    },
  ]);
}

/** Leaves the rescue without adopting (only once you already have a dog). */
export function leaveShelter(): void {
  if (!game().dogs.length) return;
  goHome('van');
}

/** Swaps which dog walks out with you. */
export function takeOut(id: string): void {
  const dog = game().dogs.find((d) => d.id === id);
  if (!dog) return;
  commit((g) => setActiveDog(g, id));
  goHome('runs');
  toast(`${dog.name} bounds out of the run to join you.`, 'good');
}

/** Feeds the dogs waiting in the runs. */
export function feedRunDogs(): void {
  let out = { fed: [] as string[], hungry: [] as string[] };
  commit((g) => {
    out = feedRuns(g);
  });
  if (out.fed.length) toast(`Fed ${out.fed.join(' and ')}. ${game().food} meals left.`, 'good');
  if (out.hungry.length)
    toast(`No food left for ${out.hungry.join(' and ')}. Buy kibble at the village shop.`, 'warn');
  if (!out.fed.length && !out.hungry.length) toast('Everyone in the runs is well fed.');
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
  opts: { job?: Job; round?: number; place?: Place } = {},
): void {
  const kind: ActivityKind = setup.free
    ? 'free'
    : setup.blinds.length && !setup.marks.length
      ? 'blind'
      : 'mark';
  if (opts.round === undefined && !allowed(kind)) return;
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
  if (!setup.free) showIntro(setup.water ? 'water' : kind);
}

export function startSearch(
  setup: SearchSetup,
  opts: { job?: Job; round?: number; place?: Place } = {},
): void {
  if (opts.round === undefined && !allowed('search')) return;
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
  'mara-keys': { item: "Mara's keys", center: { x: -10, z: -24 }, radius: 10 },
  'hollins-glove': { item: 'the glove', center: { x: 16, z: -22 }, radius: 16 },
  'ellis-knife': { item: 'the pocket knife', center: { x: -20, z: -46 }, radius: 16 },
  'pip-rabbit': { item: 'the toy rabbit', center: { x: 12, z: -50 }, radius: 14 },
};

export function startJob(job: Job): void {
  const rng = createRng(job.seed);
  if (job.kind === 'search') {
    const area = SEARCH_AREAS[job.id] ?? { item: 'it', center: { x: 0, z: -30 }, radius: 16 };
    const setup = randomSearchSetup(rng, job.title, area.item, area);
    // Mara's keys is the first search: a breeze toward you makes it forgiving.
    if (job.id === 'mara-keys') Object.assign(setup, { windDeg: 10, windStrength: 0.5 });
    startSearch(setup, { job, place: 'orchard' });
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
    startFieldWork(setup, { job, place: job.place === 'field' ? 'home' : 'orchard' });
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
  if (screen.round !== undefined) return finishRound(screen.round, report.score, report.notes);
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
  if (screen.round !== undefined) return finishRound(screen.round, report.score, report.notes);
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
  if (screen.kind === 'shelter') {
    leaveShelter();
    return;
  }
  // Ending a lesson early keeps whatever the dog learned so far.
  if (screen.kind === 'lesson') {
    finishLessonActivity();
    return;
  }
  if ((screen.kind === 'retrieve' || screen.kind === 'search') && screen.round !== undefined) {
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
  if (r.next === 'eventNext') return nextRound();
  if (r.next === 'eventDone') return finishEvent();
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
// Competitions: the Village Fun Day and the Larkspur trials
// ---------------------------------------------------------------------------

export function canGoToFunDay(g: GameState): boolean {
  return g.day >= FUN_DAY && !g.funDay && g.dogs.length > 0 && g.block !== 'night';
}

/** Today's trial, if there is one and the active dog can still enter it. */
export function todaysTrial(g: GameState): EventDef | null {
  const dog = activeDog(g);
  if (!dog || !isTrialDay(g.day)) return null;
  if (g.trials.some((t) => t.day === g.day && t.dogId === dog.id)) return null;
  return trialEvent(g.seed, g.day, trialLevel(dog));
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
  beginEvent(funDayEvent(g.seed));
  say(LINES.funDayIntro!(g));
}

function beginTrial(): void {
  const g = game();
  const def = todaysTrial(g);
  if (!def || g.block === 'night') {
    toast('There is no trial for you to enter right now. Trials run every Sunday.', 'info');
    goHome('van');
    return;
  }
  let paid = false;
  commit((d) => {
    paid = enterEvent(d, def);
  });
  if (!paid) {
    toast(`The entry fee is $${def.entryFee}. Noticeboard jobs pay.`, 'warn');
    goHome('van');
    return;
  }
  beginEvent(def);
  say(trialIntro(def));
}

function trialIntro(def: EventDef): Line[] {
  const g = game();
  const dog = activeDog(g)!;
  const first = g.trials.length === 0;
  const names = def.rivals.map((r) => `${r.handler} with ${r.dog.name}`).join(', ');
  const lines: Line[] = [
    {
      speaker: 'Mara',
      text: first
        ? `Welcome to Larkspur! This is a proper trial: three rounds, a judge, and a $${def.entryFee} entry. Today you're up against ${names}.`
        : `${def.name} today. Running against ${names}.`,
    },
  ];
  if (first) {
    lines.push(
      {
        speaker: 'Mara',
        text: `Score at least ${QUALIFY.minRound} in every round and ${QUALIFY.minTotal} in total and that's a qualifying run. Two of those and ${dog.name} earns a ${TRIAL_RULES[def.level!].name} title and moves up a level.`,
      },
      {
        speaker: 'Mara',
        text: 'Prize money goes to the top three. But the qualifying run is what counts.',
      },
    );
  }
  return lines;
}

function beginEvent(def: EventDef): void {
  useApp.setState({
    event: { def, round: 0, player: [], rivals: def.rivals.map(() => []) },
  });
  startRound(0);
}

function startRound(index: number): void {
  const ev = get().event;
  if (!ev) return;
  const round = ev.def.rounds[index]!;
  if (round.kind === 'search') startSearch(round.search!, { round: index, place: ev.def.place });
  else startFieldWork(round.retrieve!, { round: index, place: ev.def.place });
}

function finishRound(index: number, score: number, notes: ResultView['notes']): void {
  const ev = get().event;
  if (!ev) return;
  const rivalScores = ev.def.rivals.map((r) => rivalScore(ev.def, r, index));
  useApp.setState({
    event: {
      ...ev,
      round: index,
      player: [...ev.player, score],
      rivals: ev.rivals.map((rs, i) => [...rs, rivalScores[i]!]),
    },
  });
  const last = index === ev.def.rounds.length - 1;
  const beat = ev.def.rivals
    .map((r, i) => ({ r, s: rivalScores[i]! }))
    .filter((x) => score > x.s)
    .map((x) => `${x.r.handler} (${x.s})`);
  const extra: ResultView['notes'] = [];
  if (ev.def.kind === 'trial' && score < QUALIFY.minRound)
    extra.push({
      text: `Under ${QUALIFY.minRound} in this round, so no qualifying run today. Every round still counts toward the placings.`,
      tone: 'warn',
    });
  extra.push({
    text: ev.def.rivals
      .map((r, i) => `${r.handler} and ${r.dog.name} scored ${rivalScores[i]}.`)
      .join(' '),
    tone: 'info',
  });
  if (beat.length) extra.push({ text: `You beat ${beat.join(' and ')} this round!`, tone: 'good' });
  useApp.setState({
    panel: 'result',
    result: {
      title: ev.def.rounds[index]!.title,
      grade:
        score >= 85
          ? 'Excellent'
          : score >= 70
            ? 'Very good'
            : score >= 55
              ? 'Good'
              : score >= 30
                ? 'Pass'
                : score > 0
                  ? 'Untidy'
                  : 'No score',
      score,
      seconds: 0,
      notes: [...notes, ...extra],
      discoveries: [],
      pay: 0,
      next: last ? 'eventDone' : 'eventNext',
    },
  });
}

function nextRound(): void {
  const ev = get().event;
  if (!ev) return;
  startRound(ev.round + 1);
}

/** The finished event, kept for the standings panel and Mara's words afterwards. */
export interface EventResult {
  def: EventDef;
  outcome: EventOutcome;
}

let lastEvent: EventResult | null = null;
export const finishedEvent = (): EventResult | null => lastEvent;

function finishEvent(): void {
  const ev = get().event;
  if (!ev) return;
  const dog = activeDog(game())!;
  let outcome: EventOutcome | null = null;
  commit((d) => {
    outcome = recordEvent(d, ev.def, ev.player, ev.rivals);
    d.knowledge[dog.id] ??= {};
    for (const o of ['mark', 'search', 'blind'] as const) {
      observe(
        createRng(eventSeed(d, `${ev.def.id}-${o}`)),
        dog,
        d.knowledge[dog.id]!,
        ACTIVITY_OBSERVATIONS[o]!,
      );
    }
  });
  if (!outcome) return;
  lastEvent = { def: ev.def, outcome };
  useApp.setState({ panel: 'standings' });
}

export function leaveEvent(): void {
  const done = lastEvent;
  useApp.setState({ panel: null, event: null });
  goHome('van');
  if (!done) return;
  const g = game();
  const dog = activeDog(g)!;
  const { record, title } = done.outcome;
  const best = done.def.rounds[record.bestRound]!;
  if (done.def.kind === 'funday') {
    say(
      [
        {
          speaker: 'Mara',
          text:
            record.placing === 1
              ? `You won it! In your very first week. Your grandpa would be over the moon.`
              : `${ordinal(record.placing)} place. Victor will be insufferable, but you saw it too, didn't you? ${dog.name} has a real gift for ${best.skill}.`,
        },
        {
          speaker: 'Mara',
          text: 'That is what you build on. From next week there is a proper trial at Larkspur every Sunday. Two qualifying runs earn a Novice title, then come the Open trials, and one day, the Hollowmere Cup.',
        },
        {
          speaker: 'Mara',
          text: 'Seven days make a season out here, and the dogs grow up with them. Train the weak spots, take the jobs, fix up the place. See you at Larkspur.',
        },
        { speaker: 'You', text: 'The cup Grandpa used to win. One day.' },
      ],
      () => showIntro('trials'),
    );
    return;
  }
  const level = TRIAL_RULES[done.def.level!].name;
  const qs = dog.qualifiers[done.def.level!] ?? 0;
  const pronoun = dog.sex === 'female' ? 'her' : 'his';
  say([
    {
      speaker: 'Mara',
      text: title
        ? `A ${level} title! It's official: ${dogWithTitles(dog)}. From next Sunday you run at ${TRIAL_RULES[trialLevel(dog)].name} level. Harder work, bigger prizes.`
        : record.qualified
          ? `A qualifying run! That's ${qs} of ${QUALIFY.toTitle} toward the ${level} title.`
          : `No qualifying run today. Look at the round that let you down: that's this week's training. ${dog.name} was at ${pronoun} best in ${best.skill}.`,
    },
  ]);
}

/** Short title letters after a dog's name: Novice → FN, Open → FO, Excellent → FX. */
export const titleLetters = (level: string): string =>
  level === 'novice' ? 'FN' : level === 'open' ? 'FO' : 'FX';

/** "Pepper FN FO" */
export const dogWithTitles = (dog: Dog): string =>
  [dog.name, ...dog.titles.map(titleLetters)].join(' ');

export const ordinal = (n: number) =>
  n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

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
  afterWaking();
}

/** A new morning: the season recap first, then any new puppies. */
function afterWaking(): void {
  if (game().recap) useApp.setState({ panel: 'season' });
  else if (game().litters.some((l) => l.bornDay === game().day && l.puppies.length))
    useApp.setState({ panel: 'breeding', breedingTab: 'litters' });
}

// ---------------------------------------------------------------------------
// Breeding
// ---------------------------------------------------------------------------

export function planLitter(damId: string, sireId: string): void {
  let ok = false;
  commit((g) => {
    ok = !!breedRule(g, damId, sireId);
  });
  const g = game();
  const p = g.pregnancies.find((x) => x.damId === damId);
  if (ok && p) {
    const dam = g.dogs.find((d) => d.id === damId)!;
    toast(`${dam.name} and ${p.sireName}: puppies due on day ${p.dueDay}.`, 'good');
    useApp.setState({ breedingTab: 'litters' });
  } else toast('That pairing is not possible right now.', 'warn');
}

export function runDnaTest(dogId: string): void {
  let ok = false;
  commit((g) => {
    ok = dnaTest(g, dogId);
  });
  const dog = game().dogs.find((d) => d.id === dogId);
  if (ok && dog)
    toast(`${dog.name}'s coat genes are in: ${formatGenotype(dog.genome.loci)}.`, 'good');
  else toast('Could not test: check your money.', 'warn');
}

export function keepPup(litterId: string, puppyId: string, name: string): void {
  let kept: Dog | null = null;
  commit((g) => {
    kept = keepPuppy(g, litterId, puppyId, name);
  });
  if (kept) toast(`${(kept as Dog).name} is staying! A run is ready for them.`, 'good');
  else toast('No free run: you have room for six dogs.', 'warn');
}

export function placePup(litterId: string, puppyId: string): void {
  let placed: { name: string; home: string; fee: number } | null = null;
  commit((g) => {
    placed = placePuppy(g, litterId, puppyId);
  });
  if (placed) {
    const p = placed as { name: string; home: string; fee: number };
    toast(`${p.name} is going to ${p.home}. +$${p.fee}`, 'good');
  }
}

/** Tester tool: jump to the morning the next litter is due. */
export function devSkipToLitter(): void {
  const g = game();
  const due = Math.min(...g.pregnancies.map((p) => p.dueDay));
  if (Number.isFinite(due)) devSkipDays(Math.max(1, due - g.day));
}

/** Tester tool: jump to when the puppies can leave their mother. */
export function devSkipToPuppiesReady(): void {
  const g = game();
  const pups = g.litters.flatMap((l) => l.puppies);
  if (!pups.length) return;
  const days = 7 - ((g.day - 1) % 7);
  devSkipDays(days);
}

/** The season recap has been read. */
export function closeRecap(): void {
  commit((g) => {
    g.recap = null;
  });
  useApp.setState({ panel: null });
  if (game().litters.some((l) => l.bornDay === game().day))
    useApp.setState({ panel: 'breeding', breedingTab: 'litters' });
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
  restoreThing('scentGarden');
}

export function restoreThing(id: string): void {
  let result = { ok: false, message: '' };
  commit((g) => {
    result = restore(g, id);
  });
  toast(result.message, result.ok ? 'good' : 'warn');
  if (result.ok && id === 'scentGarden') useApp.setState({ panel: null });
}

// ---------------------------------------------------------------------------
// Tester tools (development only, behind the menu)
// ---------------------------------------------------------------------------

export function devSkipDays(days: number): void {
  for (let i = 0; i < days; i++) commit((g) => sleepRule(g));
  goHome('house');
  afterWaking();
}

/** Tester tool: jump to the morning of the next Sunday. */
export function devSkipToSunday(): void {
  const g = game();
  const days = 6 - ((g.day - 1) % 7);
  devSkipDays(days === 0 ? 7 : days);
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
    g.season.skills[dog.id] = { ...dog.skills };
    registerDog(g, dog, 'Larchwood Rescue');
    g.shelter = [];
    if (g.kennelName === '') g.kennelName = 'Test';
    g.story = 'settle';
  });
  goHome('house');
}
