import { activeDog, dayName, FUN_DAY, hasFlag, type GameState, type StoryStep } from './state';

/**
 * The first week's story and the "what next?" guidance. The objective shown
 * on screen always comes from here, so the player is never left guessing.
 */

/** Places at home the guidance arrow can point to. */
export type Landmark =
  | 'office'
  | 'runs'
  | 'pantry'
  | 'gateSign'
  | 'van'
  | 'noticeboard'
  | 'fieldGate'
  | 'house'
  | 'dog'
  | 'mara'
  | 'scentGarden';

export interface Objective {
  title: string;
  steps: { text: string; done: boolean }[];
  /** Where to go next, for the on-screen arrow. */
  target: Landmark | null;
}

export interface Line {
  speaker: 'Mara' | 'Grandpa' | 'You';
  text: string;
}

const pronoun = (state: GameState) => (activeDog(state)?.sex === 'female' ? 'she' : 'he');
const dogName = (state: GameState) => activeDog(state)?.name ?? 'your dog';

export function objective(state: GameState): Objective {
  const f = (flag: string) => hasFlag(state, flag);
  switch (state.story) {
    case 'letter':
      return { title: "Grandpa's letter", steps: [], target: null };
    case 'explore': {
      const steps = [
        { text: "Read Grandpa's ledger in the office", done: f('saw:office') },
        { text: 'Look at the empty kennel runs', done: f('saw:runs') },
        { text: "Check what's left in the pantry", done: f('saw:pantry') },
        { text: 'Give the kennel your own name at the gate sign', done: state.kennelName !== '' },
        { text: 'Take the van to Larchwood Rescue', done: false },
      ];
      const next = !f('saw:office')
        ? 'office'
        : !f('saw:runs')
          ? 'runs'
          : !f('saw:pantry')
            ? 'pantry'
            : state.kennelName === ''
              ? 'gateSign'
              : 'van';
      return { title: "Look around Grandpa's kennel", steps, target: next };
    }
    case 'toShelter':
      return {
        title: 'Choose your first dog',
        steps: [
          {
            text: 'Meet all three dogs: throw the ball and watch how each one plays',
            done: f('met:all'),
          },
          { text: 'Choose the dog you want to start with', done: false },
        ],
        target: null,
      };
    case 'settle':
      return {
        title: `Settle ${dogName(state)} in`,
        steps: [
          { text: `Fill ${dogName(state)}'s bowl at the runs`, done: f('filledBowl') },
          { text: `Let ${pronoun(state) === 'she' ? 'her' : 'him'} eat`, done: f('dogAte') },
          { text: 'Walk up to your dog and give a pat', done: f('petted') },
        ],
        target: !f('filledBowl') ? 'runs' : !f('petted') ? 'dog' : 'runs',
      };
    case 'firstLesson':
      return {
        title: 'Teach a first lesson',
        steps: [
          { text: 'Go to the training field gate and choose "Sit on cue"', done: f('lesson:sit') },
        ],
        target: 'fieldGate',
      };
    case 'firstNight':
      return {
        title: 'The end of a long day',
        steps: [{ text: 'Go to bed: the farmhouse door', done: false }],
        target: 'house',
      };
    case 'meetMara':
      return {
        title: 'Someone is at the gate',
        steps: [{ text: 'Go and say hello', done: f('metMara') }],
        target: 'mara',
      };
    case 'firstJob':
      return {
        title: "Find Mara's keys",
        steps: [
          {
            text: "Take the van to Mara's orchard and search with your dog",
            done: state.jobsDone.includes('mara-keys'),
          },
        ],
        target: 'van',
      };
    case 'firstMark':
      return {
        title: 'Try a retrieve',
        steps: [{ text: 'At the training field gate, choose "First mark"', done: false }],
        target: 'fieldGate',
      };
    case 'freeWeek': {
      const days = FUN_DAY - state.day;
      const did = (activity: string) => state.results.some((r) => r.activity === activity);
      return {
        title:
          days > 0
            ? `Get ready for the Fun Day (${days === 1 ? 'tomorrow' : `in ${days} days`})`
            : 'The Fun Day is today',
        steps: [
          { text: 'Practise marks in the field', done: did('mark') },
          { text: 'Practise a blind in the field', done: did('blind') },
          { text: 'Do a search job from the noticeboard', done: state.jobsDone.length >= 2 },
          { text: 'Keep the pantry stocked (village shop)', done: state.food >= 3 },
          {
            text: "Optional: restore Grandpa's scent garden",
            done: hasFlag(state, 'restored:scentGarden'),
          },
        ],
        target: state.food < 2 ? 'van' : 'noticeboard',
      };
    }
    case 'funDay':
      return {
        title: 'The Village Fun Day',
        steps: [{ text: 'Take the van to the village green', done: false }],
        target: 'van',
      };
    case 'afterFunDay':
      return {
        title: 'Keep building the kennel',
        steps: [
          { text: 'Train, take jobs and save up', done: false },
          { text: "Restore Grandpa's scent garden", done: hasFlag(state, 'restored:scentGarden') },
        ],
        target: null,
      };
  }
}

/** Moves the story on whenever its conditions are met. Call after any change. */
export function progressStory(state: GameState): StoryStep {
  const f = (flag: string) => hasFlag(state, flag);
  for (let guard = 0; guard < 12; guard++) {
    const before = state.story;
    switch (state.story) {
      case 'explore':
        if (state.dogs.length > 0) state.story = 'settle';
        break;
      case 'toShelter':
        if (state.dogs.length > 0) state.story = 'settle';
        break;
      case 'settle':
        if (f('dogAte') && f('petted')) state.story = 'firstLesson';
        if (state.day >= 2) state.story = 'meetMara';
        break;
      case 'firstLesson':
        if (f('lesson:sit') || state.results.some((r) => r.activity === 'lesson'))
          state.story = 'firstNight';
        if (state.day >= 2) state.story = 'meetMara';
        break;
      case 'firstNight':
        if (state.day >= 2) state.story = 'meetMara';
        break;
      case 'meetMara':
        if (f('metMara')) state.story = 'firstJob';
        break;
      case 'firstJob':
        if (state.jobsDone.includes('mara-keys')) state.story = 'firstMark';
        break;
      case 'firstMark':
        if (state.results.some((r) => r.activity === 'mark')) state.story = 'freeWeek';
        if (state.day >= FUN_DAY) state.story = 'funDay';
        break;
      case 'freeWeek':
        if (state.day >= FUN_DAY) state.story = 'funDay';
        break;
      case 'funDay':
        if (state.funDay) state.story = 'afterFunDay';
        break;
    }
    if (state.story === before) break;
  }
  return state.story;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

export const LETTER_PAGES = [
  {
    image: '/story/homecoming/grandpa.jpg',
    caption: 'Grandpa, and the dogs he loved.',
    text: [
      "If you're reading this, the kennel is yours now.",
      'I spent forty years out here with the dogs. Some of them were champions. All of them were family. I never minded which was which.',
    ],
  },
  {
    image: '/story/homecoming/championship-years.jpg',
    caption: 'The kennel in its best years.',
    text: [
      'There was a time this place won the Hollowmere Cup more often than anyone. People came from three counties for one of our pups.',
      "That was a long while ago. The runs are empty now, and the fences need work. I let it slip when I got old. I'm sorry for that.",
    ],
  },
  {
    image: '/story/homecoming/inheritance.jpg',
    caption: 'The keys, the ledger, and a new beginning.',
    text: [
      "I've left you the keys, my ledger, a little money and not much else. Don't buy a fancy dog. Go to Larchwood Rescue and find one that needs you.",
      'Train it well, treat it kindly, and see where it takes you. The rest will follow. With love, Grandpa.',
    ],
  },
];

export const LINES: Record<string, (state: GameState) => Line[]> = {
  ledger: () => [
    {
      speaker: 'Grandpa',
      text: 'From the ledger: "A dog tells you everything if you watch. Ears, tail, nose. Learn to read them before you learn to command them."',
    },
    {
      speaker: 'Grandpa',
      text: '"Feed them before you ask anything of them. A hungry dog listens to its stomach, not to you."',
    },
  ],
  runs: () => [
    {
      speaker: 'You',
      text: "Six runs, all empty. Grandpa's old dogs' names are still painted above the doors.",
    },
  ],
  pantry: (s) => [
    {
      speaker: 'You',
      text: `A few bags of kibble left: ${s.food} meals. That won't last long. The village shop sells more.`,
    },
  ],
  maraHello: (s) => [
    {
      speaker: 'Mara',
      text: `You must be the grandchild! I'm Mara, from the orchard over the lane. Your grandpa and I trained dogs together for thirty years.`,
    },
    {
      speaker: 'Mara',
      text: `And this must be ${dogName(s)}. Good choice. Rescue dogs have a way of surprising you.`,
    },
    {
      speaker: 'Mara',
      text: 'Two things. On Sunday the village holds its Fun Day: a friendly little competition. Marks, a search, a blind. You should enter.',
    },
    {
      speaker: 'Mara',
      text: "And I need a favour. I've lost my keys somewhere in the orchard. Bring your dog over in the van and let that nose earn its supper. I'll pay you.",
    },
  ],
  maraAfterKeys: (s) => [
    {
      speaker: 'Mara',
      text: `My keys! ${dogName(s)} found them. Here's $25, and you've earned it.`,
    },
    {
      speaker: 'Mara',
      text: "People pin jobs on the noticeboard by your gate. Lost things, help with dogs. It's how your grandpa kept the lights on in lean years.",
    },
    {
      speaker: 'Mara',
      text: "Next, try your field. Grandpa's old throwers still come by. Start with a single mark and watch where it lands.",
    },
  ],
  funDayIntro: () => [
    {
      speaker: 'Mara',
      text: 'Welcome to the Fun Day! Three rounds: a mark, a search and a blind. Points from each round add up.',
    },
    {
      speaker: 'Mara',
      text: "You're up against Victor Sterling of Sterling Kennels. He bought half the good dogs in the county after your grandpa stopped competing. And young Billy Ashby with Pickles.",
    },
    {
      speaker: 'Mara',
      text: "Don't worry about winning. Watch what your dog is good at. That's what today is for.",
    },
  ],
  dayStartHint: (s) => [
    {
      speaker: 'Mara',
      text: `${dayName(s.day)}. Remember: each part of the day fits one main job, lesson or practice. Use them well, and keep ${dogName(s)} fed.`,
    },
  ],
};
