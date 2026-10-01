import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { activityRestriction } from '../../utils/dogDevelopment';
import { DISCIPLINES, DISCIPLINE_INFO, fieldAbility, recordFor, type Discipline } from './model';
import { completeClubRound, leaveClubRun, startClubRun } from './progress';
import { trainingName } from './trainingSimulation';
import type { ActivityReport } from './performance';
import './club.css';

const TrainingGame = lazy(() => import('./TrainingGame'));
const EXERCISES: Record<Discipline, string> = {
  agility: 'Guide your dog between ground pads to develop footwork and changes of direction.',
  search: 'Build focus around distractions so your dog can work a scent with less guidance.',
  herding: 'Practice a steady stay around distractions to develop control for flock work.',
  water: 'Alternate pace and recovery on a dry-land circuit to build swimming endurance.',
};

export default function TrainingMenu({ onReturn, onOtherTraining, onFieldClub }: {
  onReturn: () => void; onOtherTraining: () => void; onFieldClub?: () => void;
}) {
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => { menuRef.current?.scrollIntoView({ block: 'start' }); }, []);
  const { dogs, selectedDog, selectDog, tutorialProgress } = useGameStore();
  const [playing, setPlaying] = useState(false), [message, setMessage] = useState('');
  const living = dogs.filter(d => !d.is_dead);
  const dog = living.find(d => d.id === selectedDog?.id) ?? living[0];
  const progress = tutorialProgress.fieldClub, run = progress?.active;
  const trainingRun = run?.exercise === 'training' && run.kind === 'practice' ? run : undefined;
  const round = trainingRun?.rounds[trainingRun.results.length];
  const trainee = living.find(d => d.id === round?.dogId);
  const latest = progress?.matches.find(m => m.kind === 'practice')?.results[0];
  const reason = dog ? activityRestriction(dog) ?? (dog.energy_stat < 26 ? 'Rest with your dog before training. You need at least 26% energy.' : dog.training_points < 4 ? 'Your dog needs at least 4 training points. Let them recover before training again.' : null) : null;
  const begin = (discipline: Discipline) => {
    if (!dog) return;
    const result = startClubRun('practice', [{ discipline, dogId: dog.id }], 'training');
    setMessage(result.message);
    if (result.success) setPlaying(true);
  };
  const finish = (score: number, report: ActivityReport) => {
    if (!trainingRun) return;
    const result = completeClubRound(trainingRun.id, trainingRun.results.length, score, report);
    setMessage(result.message); setPlaying(false);
  };
  return <section ref={menuRef} className="field-club training-menu" aria-label="Yard training menu">
    <button className="journey-text-button" onClick={onReturn}>Return to the yard</button>
    <header className="club-section-heading"><div><small>YOUR YARD / TRAINING</small><h1 className="text-3xl">Choose what to develop.</h1><p>Build the skills your companion will use in the field. Each saved exercise uses 6 energy and 4 training points.</p></div></header>
    {!dog ? <p>Choose a living companion to begin training.</p> : <>
      <div className="club-preparation"><label>Your companion<select aria-label="Training companion" value={dog.id} disabled={!!run} onChange={e => selectDog(living.find(d => d.id === e.target.value)!)}>{living.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><div><strong>{Math.round(dog.energy_stat)}% energy</strong><span>{dog.training_points} training points</span></div></div>
      {message && <p className="club-notice" role="status">{message}</p>}
      {reason && <p className="club-notice">{reason} Return to the yard for care.</p>}
      {run && <section className="club-round-board" aria-label="Unfinished activity"><h2>{trainingRun ? 'Your training session is saved.' : 'You have a club event in progress.'}</h2><p>{trainingRun && round ? `${trainee?.name ?? 'Your companion'} is working on ${trainingName(round.discipline).toLowerCase()}.` : 'Continue your event at the Field Club before starting another session.'}</p><div className="club-actions">{trainingRun ? <><button disabled={!trainee || !!activityRestriction(trainee)} onClick={() => setPlaying(true)}>Continue training</button><button onClick={() => { leaveClubRun(); setPlaying(false); setMessage('Unfinished training ended. Choose an exercise when you are ready.'); }}>End this training session</button></> : onFieldClub && <button onClick={onFieldClub}>Continue at the Field Club</button>}</div></section>}
      {latest && !run && <section className="club-results" aria-label="Latest training result"><small>LAST TRAINING SESSION</small><h2>{latest.dogName}: {trainingName(latest.discipline)}</h2><p>+{latest.gain} discipline experience{latest.abilityBefore !== undefined && latest.abilityAfter !== undefined ? ` | Working ability ${latest.abilityBefore.toFixed(1)} to ${latest.abilityAfter.toFixed(1)}` : ''}</p></section>}
      <div className="club-sports">{DISCIPLINES.map(d => {
        const record = recordFor(progress, dog.id, d), ability = fieldAbility(dog, d, record);
        return <article key={d} className="club-sport" style={{ borderTop: `4px solid ${DISCIPLINE_INFO[d].color}` }}><div className="club-sport-copy"><small>{DISCIPLINE_INFO[d].name.toUpperCase()}</small><h2>{trainingName(d)}</h2><p>{EXERCISES[d]}</p><div className="club-ability"><strong>Working ability {ability.toFixed(1)}</strong><span>{DISCIPLINE_INFO[d].effect}</span><small>{ability >= 35 ? 'Ready for club events in this discipline.' : `Develop toward working ability 35 to enter club events.`}</small></div><button disabled={!!run || !!reason} onClick={() => begin(d)}>Train {DISCIPLINE_INFO[d].name}</button></div></article>;
      })}</div>
      <section className="club-next-step"><div><h2>More ways to train</h2><p>Open the other training plans for recall, speed, strength and general conditioning.</p></div><button disabled={!!run} onClick={onOtherTraining}>Other training plans</button></section>
    </>}
    {playing && trainingRun && round && trainee && <Suspense fallback={<div className="field-loading-overlay">Preparing your training session...</div>}><TrainingGame key={trainingRun.id} dog={trainee} discipline={round.discipline} ability={fieldAbility(trainee, round.discipline, recordFor(progress, trainee.id, round.discipline))} returnLabel="Return to training menu" onCancel={() => setPlaying(false)} onComplete={finish}/></Suspense>}
  </section>;
}
