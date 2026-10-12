import { createRng, hashString } from '../core/rng';
import { generateRescue, titleCount, type Dog } from '../core/dog/dog';
import { createFounderGenome } from '../core/genetics/genome';
import { register } from './breeding';
import { runsFree } from './kennel';
import { addFlag, hasFlag, note, type GameState } from './state';

/**
 * Grandpa's ledger has pages torn out. They turn up around the kennel as it
 * comes back to life, and together they tell why he stopped, and where the
 * last of his champion line went.
 */
export interface LedgerPage {
  id: string;
  title: string;
  /** Where it turns up, said when it is found. */
  where: string;
  /** A nudge shown for pages still missing. */
  hint: string;
  text: string;
  found: (state: GameState) => boolean;
}

export const LEDGER_PAGES: LedgerPage[] = [
  {
    id: 'litter',
    title: 'The last litter',
    where: 'under the old bedding in the whelping room',
    hint: 'Somewhere in the whelping room.',
    text: 'Spring. Nell whelped in the night: seven, by Tam. I have bred dogs for forty years and I knew it by the time their eyes opened. This is the best litter this kennel will ever see. The little bitch with one white toe never stops watching me.',
    found: (s) => hasFlag(s, 'restored:whelpingRoom'),
  },
  {
    id: 'offer',
    title: "Sterling's offer",
    where: 'folded inside the rosette box in the office',
    hint: 'Earn a title in any sport, and look where the rosettes are kept.',
    text: 'Victor Sterling came up the lane again with his chequebook. He wants the whole litter and names a sum that would mend every fence on the place. I told him a dog is not stock. He laughed and said everything is stock to somebody.',
    found: (s) => s.dogs.some((d) => titleCount(d) > 0),
  },
  {
    id: 'winter',
    title: 'The winter it went wrong',
    where: 'in a tin by the field wall',
    hint: "Put more of Grandpa's field back to rights.",
    text: 'My hip went in November. By January I could not walk the line, let alone handle a dog on it. Seven youngsters with more talent than I have ever had in my hands, and nobody to bring it out of them. The bills came anyway.',
    found: (s) =>
      ['restored:scentGarden', 'restored:duckPond', 'restored:agilityRing'].filter((f) =>
        hasFlag(s, f),
      ).length >= 2,
  },
  {
    id: 'homes',
    title: 'Where they went',
    where: 'pinned behind a notice on the board, where a neighbour left it for you',
    hint: 'Become respected locally, and people start returning what they kept for him.',
    text: 'I placed them one by one, with people who would work them and never with Sterling. It cost me the Cup and most of my pride. The bitch with the white toe went up to Ned Pennock at Fell Top. I made him promise: her line is never to be sold, only given, and only to someone who would do right by it.',
    found: (s) => s.reputation >= 25,
  },
  {
    id: 'sorry',
    title: 'What I should have said',
    where: "in the puppy paddock, where the first litter's bedding was",
    hint: 'Breed a litter of your own.',
    text: 'I let them think I had lost heart. It was easier than saying I could not do right by the dogs any more. If the kennel ever goes to the child, I hope they start with a dog nobody wanted, and learn what I learned too late: you do not own a good dog. You are trusted with one.',
    found: (s) => hasFlag(s, 'firstLitter'),
  },
];

export const LEGACY_PAGE = {
  id: 'whitetoe',
  title: 'The white toe',
  text: 'Sam Pennock read the pages on his kitchen table and went quiet. Then he walked you out to the barn. "Grandad kept his word. That bitch\'s line never left this farm." A young dog looked up from the straw: black, bright-eyed, one white toe. "Her name\'s Wren. She was always meant to go home."',
};

/** Pages found since the last check. Call after any change to the game. */
export function checkLedger(state: GameState): LedgerPage[] {
  const fresh: LedgerPage[] = [];
  for (const page of LEDGER_PAGES) {
    if (state.ledger.includes(page.id) || !page.found(state)) continue;
    state.ledger.push(page.id);
    note(state, `Found a torn page from Grandpa's ledger: "${page.title}".`);
    fresh.push(page);
  }
  return fresh;
}

export const allPagesFound = (state: GameState): boolean =>
  LEDGER_PAGES.every((p) => state.ledger.includes(p.id));

/** Sam can be shown the pages once you have them all and have worked his sheep. */
export const legacyReady = (state: GameState): boolean =>
  allPagesFound(state) && hasFlag(state, 'practised:herding') && !hasFlag(state, 'legacy:home');

export const LEGACY_ID = 'legacy-wren';

/** Wren: the last of Tam and Nell's line, kept at Fell Top all these years. */
export function legacyDog(state: GameState): Dog {
  const rng = createRng(hashString(`legacy-${state.seed}`));
  const dog = generateRescue(rng, 'Wren');
  dog.genome = createFounderGenome(rng, 'labrador');
  for (const key of ['speed', 'nose', 'drive', 'focus', 'biddability', 'mouth', 'water'] as const)
    dog.genome.traits[key].g += 0.55;
  // Black, with a little white: the toe Grandpa wrote about.
  dog.genome.loci.E = ['E', 'E'];
  dog.genome.loci.B = ['B', 'B'];
  dog.genome.loci.D = ['D', 'D'];
  dog.genome.loci.S = ['S', 'sp'];
  dog.id = LEGACY_ID;
  dog.sex = 'female';
  dog.ageMonths = 15;
  dog.origin = 'bred';
  dog.breedMix = { labrador: 1 };
  dog.breeder = 'Fell Top Farm';
  dog.sireId = 'legacy-jet';
  dog.damId = 'legacy-linnet';
  dog.skills = { ...dog.skills, sit: 0.6, stay: 0.5, recall: 0.6, herd: 0.2, agility: 0 };
  dog.bond = 35;
  dog.fullness = 80;
  dog.energy = 100;
  dog.titles = [];
  dog.qualifiers = {};
  return dog;
}

/** Brings Wren home, with her pedigree back to Grandpa's champions. Needs a free run. */
export function bringLegacyHome(state: GameState): Dog | null {
  if (!legacyReady(state) || runsFree(state) <= 0) return null;
  const dog = legacyDog(state);
  const old = (
    id: string,
    name: string,
    sex: Dog['sex'],
    kennel: string,
    titles: Dog['titles'],
    sireId?: string,
    damId?: string,
  ) => {
    state.pedigree[id] = {
      id,
      name,
      sex,
      sireId,
      damId,
      kennel,
      coat: 'Black',
      breed: 'Labrador',
      titles,
      inbreeding: 0,
    };
  };
  old('legacy-tam', 'Tam', 'male', "Grandpa's kennel", ['novice', 'open', 'excellent']);
  old('legacy-nell', 'Nell', 'female', "Grandpa's kennel", ['novice', 'open']);
  old('legacy-linnet', 'Linnet', 'female', 'Fell Top Farm', [], 'legacy-tam', 'legacy-nell');
  old('legacy-jet', 'Fell Top Jet', 'male', 'Fell Top Farm', ['novice']);
  state.dogs.push(dog);
  state.season.skills[dog.id] = { ...dog.skills };
  register(state, dog, 'Fell Top Farm');
  state.ledger.push(LEGACY_PAGE.id);
  addFlag(state, 'legacy:home');
  note(state, "Wren came home from Fell Top: the last of Tam and Nell's line.");
  return dog;
}
