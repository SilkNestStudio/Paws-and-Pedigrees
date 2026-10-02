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
  title: 'Mara\'s lost keys',
  client: 'Mara Whitlow',
  blurb: 'Mara dropped her keys somewhere in her orchard. Your dog\'s nose can find them.',
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
    title: 'Ellis\'s pocket knife',
    client: 'Ellis Brand',
    blurb: 'My grandfather\'s pocket knife fell out somewhere between the apple rows.',
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
    title: 'Gamekeeper\'s practice',
    client: 'Tom Garrow',
    blurb: 'Bring your dog to Grandpa\'s field; I\'ll throw a couple of marks to test my new launcher.',
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
];

function fromTemplate(t: JobTemplate, seed: number): Job {
  return { ...t, seed };
}

export function firstJob(seed: number): Job {
  return fromTemplate(FIRST_JOB, seed);
}

/** Two jobs a day from the ones not yet done, chosen the same way for the same day. */
export function boardForDay(seed: number, day: number, done: string[]): Job[] {
  const rng = createRng(seed ^ (day * 7919));
  const open = TEMPLATES.filter((t) => !done.includes(t.id));
  return shuffle(rng, open)
    .slice(0, 2)
    .map((t) => fromTemplate(t, int(rng, 1, 2 ** 30)));
}
