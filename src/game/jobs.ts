import { createRng, int, shuffle } from '../core/rng';

/**
 * Paid work from the village noticeboard. Jobs use the same skills as the
 * training field, in different places, for neighbours who need help.
 */
export type JobKind = 'search' | 'mark' | 'blind';
export type JobPlace = 'orchard' | 'field';

export interface Job {
  id: string;
  title: string;
  client: string;
  blurb: string;
  kind: JobKind;
  place: JobPlace;
  pay: number;
  seed: number;
}

interface JobTemplate {
  id: string;
  title: string;
  client: string;
  blurb: string;
  kind: JobKind;
  place: JobPlace;
  pay: number;
}

/** Mara's lost keys: the first job, which teaches scent search. */
export const FIRST_JOB: JobTemplate = {
  id: 'mara-keys',
  title: "Mara's lost keys",
  client: 'Mara Whitlow',
  blurb: "Mara dropped her keys somewhere in her orchard. Your dog's nose can find them.",
  kind: 'search',
  place: 'orchard',
  pay: 25,
};

const TEMPLATES: JobTemplate[] = [
  {
    id: 'hollins-glove',
    title: 'A dropped glove',
    client: 'Mrs Hollins',
    blurb: 'Lost a good leather glove walking through the orchard. Sentimental. Small reward.',
    kind: 'search',
    place: 'orchard',
    pay: 22,
  },
  {
    id: 'ellis-knife',
    title: "Ellis's pocket knife",
    client: 'Ellis Brand',
    blurb: "My grandfather's pocket knife fell out somewhere between the apple rows.",
    kind: 'search',
    place: 'orchard',
    pay: 30,
  },
  {
    id: 'pip-rabbit',
    title: 'A toy rabbit',
    client: 'The Ashby children',
    blurb: 'Our toy rabbit is lost in the long grass! We can pay in pocket money.',
    kind: 'search',
    place: 'orchard',
    pay: 15,
  },
  {
    id: 'keeper-marks',
    title: "Gamekeeper's practice",
    client: 'Tom Garrow',
    blurb:
      "Bring your dog to Grandpa's field; I'll throw a couple of marks to test my new launcher.",
    kind: 'mark',
    place: 'field',
    pay: 28,
  },
  {
    id: 'toolbag-blind',
    title: 'Tool bag by the hedge',
    client: 'Ellis Brand',
    blurb: 'Left my tool bag somewhere along the far hedge of the orchard. I know roughly where.',
    kind: 'blind',
    place: 'orchard',
    pay: 34,
  },
  {
    id: 'parcel-blind',
    title: 'A lost parcel',
    client: 'The post van',
    blurb: 'A parcel bounced off the van by the orchard gate and rolled into the grass.',
    kind: 'blind',
    place: 'orchard',
    pay: 26,
  },
  {
    id: 'garrow-blind',
    title: "Tom's lost dummy",
    client: 'Tom Garrow',
    blurb:
      "One of my training dummies sailed over the hedge into your grandpa's field. I know about where.",
    kind: 'blind',
    place: 'field',
    pay: 24,
  },
  {
    id: 'vicar-hat',
    title: "The vicar's hat",
    client: 'Reverend Pike',
    blurb: 'The wind took my hat across the orchard on Sunday. It is my good one.',
    kind: 'search',
    place: 'orchard',
    pay: 20,
  },
  {
    id: 'market-marks',
    title: 'Market day display',
    client: 'The village committee',
    blurb: 'Show the market crowd what a trained dog can do: a couple of marks in your field.',
    kind: 'mark',
    place: 'field',
    pay: 32,
  },
  {
    id: 'mara-gloves',
    title: "Mara's gardening gloves",
    client: 'Mara Whitlow',
    blurb: "I put my gloves down to prune a tree and now I can't find them. Again.",
    kind: 'search',
    place: 'orchard',
    pay: 18,
  },
];

function fromTemplate(t: JobTemplate, seed: number): Job {
  return { ...t, seed };
}

export function firstJob(seed: number): Job {
  return fromTemplate(FIRST_JOB, seed);
}

/**
 * Two jobs a day from the ones not done recently, chosen the same way for the
 * same day. Jobs done this season come back next season.
 */
export function boardForDay(seed: number, day: number, exclude: string[]): Job[] {
  const rng = createRng(seed ^ (day * 7919));
  const open = TEMPLATES.filter((t) => !exclude.includes(t.id));
  return shuffle(rng, open)
    .slice(0, 2)
    .map((t) => fromTemplate(t, int(rng, 1, 2 ** 30)));
}
