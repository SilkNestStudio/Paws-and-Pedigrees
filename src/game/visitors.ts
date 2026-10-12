import { titleCount } from '../core/dog/dog';
import { isCupDay, nextCupDay, weekday } from './calendar';
import { CUP } from './events';
import { addFlag, hasFlag, type GameState } from './state';
import type { Line } from './story';

/**
 * People who drop by the gate. Each has something to say that points at a
 * part of the game, and some bring a little something. One visitor a day at
 * most; they wait by the gate until spoken to.
 */
export interface Visitor {
  id: 'mara' | 'sam' | 'dora' | 'victor';
  name: string;
  /** Set once they have been spoken to. */
  flag: string;
  lines: Line[];
  /** Meals left on the gatepost, if any. */
  meals?: number;
}

const MARA_TIPS: ((dog: string) => string)[] = [
  (dog) =>
    `A tip from an old hand: a dog learns most in the first few rewards of a lesson. When ${dog} loses interest, stop. Tomorrow is another day.`,
  () =>
    'Scent runs downwind like smoke. On a search, start your dog on the side the wind blows toward and let the nose do the rest.',
  (dog) =>
    `On the blind, do not wait for ${dog} to go wrong by a field's width. Whistle early, cast once, and trust it.`,
  () =>
    'When you breed, look at the dam as hard as the sire. Half of every puppy is hers, and she raises them too.',
  () =>
    'A litter raised well is worth more than a litter bred well. Five quiet minutes with each puppy, every day you can.',
  (dog) =>
    `Rest is training too. If ${dog} is flat, take a day at the beach. You will get it back twice over.`,
];

/** Who is at the gate today, if anyone. */
export function visitorToday(state: GameState): Visitor | null {
  if (state.story !== 'afterFunDay' || !state.dogs.length) return null;
  const dog = state.dogs.find((d) => d.id === state.activeDogId)?.name ?? 'your dog';
  const said = (flag: string) => hasFlag(state, flag);

  // Victor Sterling, the day he hears you have a titled dog.
  if (!said('visit:victor') && state.dogs.some((d) => titleCount(d) > 0))
    return {
      id: 'victor',
      name: 'Victor Sterling',
      flag: 'visit:victor',
      lines: [
        {
          speaker: 'You',
          text: 'A long dark car at the gate. Victor Sterling, of Sterling Kennels, looking the place over.',
        },
        {
          speaker: 'Victor',
          text: `A title already. From a rescue. I will give you four hundred for ${dog}, today. That would mend every fence on this place.`,
        },
        { speaker: 'You', text: `${dog} is not for sale.` },
        {
          speaker: 'Victor',
          text: 'That is what your grandfather said. See you at the Cup, then.',
        },
      ],
    };

  // Sam Pennock, on a Friday, with an invitation.
  if (!said('visit:sam') && !said('practised:herding') && weekday(state.day) === 4)
    return {
      id: 'sam',
      name: 'Sam Pennock',
      flag: 'visit:sam',
      lines: [
        {
          speaker: 'Sam',
          text: "Sam Pennock, Fell Top Farm. Your grandad used to bring his young dogs up to my grandad's sheep. Settles them, he said.",
        },
        {
          speaker: 'Sam',
          text: `Bring ${dog} up any day: the van knows the way. There is a trial on Saturdays too, if you fancy it.`,
        },
      ],
    };

  // Dora Finch, who remembers the agility ring.
  if (!said('visit:dora') && !said('restored:agilityRing') && state.day >= 10)
    return {
      id: 'dora',
      name: 'Dora Finch',
      flag: 'visit:dora',
      lines: [
        {
          speaker: 'Dora',
          text: 'Dora Finch, from Finch Cottage! Your grandfather had a lovely set of jumps and a tunnel. They must still be in the barn. Tilly and I learned on them.',
        },
        {
          speaker: 'Dora',
          text: 'Set them out again, do, and come to the show on the green on Saturday. (At the field gate: Agility.)',
        },
      ],
    };

  // Mara, every few days, with a tip and sometimes a little something.
  const cupSoon = nextCupDay(state.day) - state.day;
  if (state.day % 3 === 0 && !said(`mara:${state.day}`) && !isCupDay(state.day)) {
    const tip = MARA_TIPS[Math.floor(state.day / 3) % MARA_TIPS.length]!(dog);
    const lines: Line[] = [{ speaker: 'Mara', text: tip }];
    if (cupSoon <= 6 && cupSoon > 0)
      lines.push({
        speaker: 'Mara',
        text:
          state.reputation >= CUP.minReputation
            ? `The Hollowmere Cup is in ${cupSoon} day${cupSoon === 1 ? '' : 's'}, and you are invited. You will need two dogs fit to run.`
            : `The Hollowmere Cup is in ${cupSoon} day${cupSoon === 1 ? '' : 's'}. It is by invitation: a respected name, or an Open title. Next year, perhaps.`,
      });
    const meals = state.food <= 3 ? 2 : 0;
    if (meals)
      lines.push({
        speaker: 'Mara',
        text: 'Your pantry is looking thin. I have left a couple of meals on the gatepost. Pay me back in apples.',
      });
    return { id: 'mara', name: 'Mara', flag: `mara:${state.day}`, lines, meals };
  }
  return null;
}

/** The visitor has been spoken to: they say their piece once. */
export function greetVisitor(state: GameState): Visitor | null {
  const visitor = visitorToday(state);
  if (!visitor) return null;
  addFlag(state, visitor.flag);
  if (visitor.meals) state.food += visitor.meals;
  return visitor;
}
