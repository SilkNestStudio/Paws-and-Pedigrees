import { distance } from '../core/math';
import type { Cue } from '../core/dog/dog';
import type { RetrieveSession } from './retrieve';

/**
 * The judge's card after a retrieve: a score, a grade, plain-language notes
 * explaining what the dog did and why, and a suggested next step.
 */
export interface RetrieveReport {
  score: number;
  grade: 'Excellent' | 'Very good' | 'Good' | 'Pass' | 'Not completed';
  seconds: number;
  notes: { text: string; tone: 'good' | 'info' | 'warn' }[];
  suggestion: { kind: 'lesson'; lesson: Cue; text: string } | { kind: 'setup'; text: string };
}

export function buildReport(s: RetrieveSession): RetrieveReport {
  const st = s.stats;
  const name = s.dogName;
  const seconds =
    st.finishedAt !== null && st.startedAt !== null ? st.finishedAt - st.startedAt : 0;
  const notes: RetrieveReport['notes'] = [];
  let score = 100;

  const items = s.items.filter((i) => i.kind !== 'ball');
  const blinds = items.filter((i) => i.kind === 'blind');
  const par = items.reduce((sum, i) => sum + distance(s.field.line, i.landing) / 4.5 + 8, 0);
  if (seconds > par) score -= Math.min(25, (seconds - par) * 0.5);

  if (st.broke) {
    score -= 45;
    notes.push({ text: `Broke before being sent. Steadiness lessons will help.`, tone: 'warn' });
  }
  if (st.wrongItem) {
    score -= 25;
    notes.push({ text: `Went back to an old fall instead of the blind.`, tone: 'warn' });
  }
  if (st.handledOnMarks > 0) {
    score -= st.handledOnMarks * 5;
    notes.push({
      text: `Needed ${st.handledOnMarks} whistle${st.handledOnMarks > 1 ? 's' : ''} on a mark. Judges prefer a dog that marks on its own.`,
      tone: 'info',
    });
  }
  if (st.ignoredWhistles > 0) {
    score -= st.ignoredWhistles * 3;
    notes.push({
      text:
        s.params.skills.stop < 0.5
          ? `Ignored ${st.ignoredWhistles} whistle${st.ignoredWhistles > 1 ? 's' : ''}. The stop whistle isn't trained yet.`
          : `Ignored ${st.ignoredWhistles} whistle${st.ignoredWhistles > 1 ? 's' : ''} in the excitement.`,
      tone: 'warn',
    });
  }
  if (blinds.length > 0) {
    const extra = Math.max(0, st.whistles - 2 * blinds.length);
    score -= extra * 3;
    const avgOff = st.lineSamples > 0 ? st.lineError / st.lineSamples : 0;
    if (avgOff > 6) {
      score -= Math.min(15, (avgOff - 6) * 1.5);
      notes.push({
        text: `Drifted off the line (about ${Math.round(avgOff)} m on average). Wind, cover and old falls pull an untrained dog.`,
        tone: 'info',
      });
    } else if (avgOff > 0 && avgOff < 3.5) {
      notes.push({ text: `Held a tight line to the blind.`, tone: 'good' });
    }
  }
  if (st.refusals > 0) {
    score -= st.refusals * 6;
    notes.push({
      text: `Didn't take ${st.refusals} direction${st.refusals > 1 ? 's' : ''}. The directions drill builds this.`,
      tone: 'warn',
    });
  }
  if (st.pops > 0) {
    score -= st.pops * 4;
    notes.push({
      text: `Stopped to look to you for help ${st.pops} time${st.pops > 1 ? 's' : ''}.`,
      tone: 'info',
    });
  }
  if (st.drops > 0) {
    score -= st.drops * 5;
    notes.push({ text: `Dropped the dummy on the way back.`, tone: 'info' });
  }

  const best = st.scentDistances.length ? Math.max(...st.scentDistances) : 0;
  if (best >= 14) {
    notes.push({
      text: `Caught the scent from ${Math.round(best)} m downwind. That's a good nose.`,
      tone: 'good',
    });
  } else if (best > 0 && best < 6) {
    notes.push({
      text: `Only picked up the scent close in, at ${Math.round(best)} m.`,
      tone: 'info',
    });
  }

  score = Math.max(0, Math.round(score));
  const complete = s.phase === 'complete';
  const grade: RetrieveReport['grade'] = !complete
    ? 'Not completed'
    : score >= 85
      ? 'Excellent'
      : score >= 70
        ? 'Very good'
        : score >= 55
          ? 'Good'
          : 'Pass';

  if (complete && notes.every((n) => n.tone !== 'warn') && score >= 80) {
    notes.unshift({ text: `A clean, confident piece of work from ${name}.`, tone: 'good' });
  }

  let suggestion: RetrieveReport['suggestion'];
  if (st.broke)
    suggestion = {
      kind: 'lesson',
      lesson: 'stay',
      text: 'Work on steadiness with the Steady lesson.',
    };
  else if (st.ignoredWhistles >= 2)
    suggestion = { kind: 'lesson', lesson: 'stop', text: 'Train the stop whistle.' };
  else if (st.refusals >= 1)
    suggestion = { kind: 'lesson', lesson: 'cast', text: 'Practise the directions drill.' };
  else
    suggestion = { kind: 'setup', text: complete ? 'Ready for a harder set-up.' : 'Try it again.' };

  return { score: complete ? score : 0, grade, seconds, notes, suggestion };
}
