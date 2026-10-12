import { SPORTS, titlesIn } from '../core/dog/dog';
import { SPORT_INFO, TRIAL_RULES } from './events';
import { reputationName } from './reputation';
import { RESTORATIONS } from './rules';
import { hasFlag, type GameState } from './state';

/**
 * The shelf in the farmhouse: everything the kennel has won or put right,
 * worked out from the save (nothing extra is stored).
 */
export interface Trophy {
  kind: 'cup' | 'title' | 'rosette' | 'keepsake';
  text: string;
  day?: number;
}

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

export function trophies(state: GameState): Trophy[] {
  const out: Trophy[] = [];
  for (const t of state.trials)
    if (t.kind === 'cup' && t.placing <= 3)
      out.push({
        kind: 'cup',
        text:
          t.placing === 1
            ? 'The Hollowmere Cup itself, with your kennel engraved under Grandpa.'
            : `The Hollowmere Cup: ${ordinal(t.placing)} place.`,
        day: t.day,
      });
  for (const dog of state.dogs)
    for (const sport of SPORTS)
      for (const level of titlesIn(dog, sport))
        out.push({
          kind: 'title',
          text: `${dog.name}: ${SPORT_INFO[sport].name} ${TRIAL_RULES[level].name} title.`,
        });
  if (state.funDay) {
    const place = state.funDay.entries.findIndex((e) => e.player) + 1;
    if (place > 0)
      out.push({ kind: 'rosette', text: `Village Fun Day: ${ordinal(place)} place.`, day: 7 });
  }
  for (const t of state.trials)
    if (t.kind === 'trial' && t.placing === 1)
      out.push({ kind: 'rosette', text: `Won the ${t.name}.`, day: t.day });
  for (const r of RESTORATIONS)
    if (hasFlag(state, `restored:${r.id}`))
      out.push({ kind: 'keepsake', text: `${r.name}, put back the way he had it.` });
  if (hasFlag(state, 'firstLitter'))
    out.push({ kind: 'keepsake', text: 'A lock of puppy fluff from the first litter bred here.' });
  if (hasFlag(state, 'legacy:home'))
    out.push({ kind: 'keepsake', text: "Wren's collar tag, stamped at Fell Top." });
  if (state.reputation >= 10)
    out.push({ kind: 'keepsake', text: `The kennel's name: ${reputationName(state.reputation)}.` });
  return out;
}
