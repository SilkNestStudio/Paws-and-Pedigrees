import type { Dog } from '../../types';
import { APTITUDES, aptitudeDescription, isAptitudeKnown, trainedAbility } from '../../utils/dogDevelopment';
import { companionFieldProgress } from '../../utils/companionProgress';
import { DISCIPLINE_INFO } from '../../game/club/model';
import { useGameStore } from '../../stores/gameStore';

export default function DevelopmentPanel({ dog }: { dog: Dog }) {
  const progress = useGameStore(state => state.syncEnabled ? undefined : state.tutorialProgress.fieldClub);
  const field = companionFieldProgress(dog, progress);
  const discovered = APTITUDES.filter(a => isAptitudeKnown(dog, a.key)).length;
  return <section className="mt-6 bg-white/95 rounded-2xl shadow-lg overflow-hidden">
    <div className="bg-kennel-800 text-white p-5">
      <p className="text-xs uppercase tracking-widest text-kennel-200">Every champion starts somewhere</p>
      <h3 className="text-xl font-bold mt-1">Getting to know {dog.name}</h3>
      <p className="text-sm text-kennel-100 mt-2">{progress ? 'Field Club practice reveals natural strengths and develops learned ability. Saved rounds show what changed and what to try next.' : dog.is_rescue
        ? 'Your rescue’s potential is already there. Bonding and training help you discover it.'
        : 'Inherited ability is the starting point. Care and practice turn potential into performance.'}</p>
    </div>
    <div className="p-5">
      {progress && <section aria-label="Field Club development" className="mb-6">
        <h4 className="text-lg font-bold text-kennel-800">Field Club strengths &amp; learned ability</h4>
        <p className="text-sm text-earth-600 mt-2">{field.explored}/4 disciplines explored with {dog.name}. One saved round gives an early indication; three assess a rescue’s aptitude. Purchased dogs already have an assessment.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {field.disciplines.map(item => <article key={item.discipline} className="rounded-xl border border-earth-200 bg-earth-50 p-3">
            <h5 className="font-semibold text-earth-700">{DISCIPLINE_INFO[item.discipline].name}</h5>
            <p className="text-sm text-kennel-700 mt-1">{item.discovery}</p>
            <p className="text-sm mt-3">Learned ability: <strong>{item.learned.toFixed(1)}/100</strong></p>
            <progress aria-label={`${DISCIPLINE_INFO[item.discipline].name} learned ability`} className="w-full" max={100} value={item.learned}/>
            <p className="text-xs text-earth-600 mt-2">{DISCIPLINE_INFO[item.discipline].effect}</p>
            <p className="text-xs text-earth-600 mt-2">{item.record.sessions ? `${item.record.sessions} saved rounds · last ${item.record.last}/100 · best ${item.record.best}/100` : 'No saved round yet. Try a practice at the club.'}</p>
          </article>)}
        </div>
        {field.latest ? <div className="mt-4 text-sm text-earth-700">
          <h5 className="font-semibold">Latest saved {field.latest.kind === 'team' ? 'team trial' : field.latest.kind === 'combined' ? 'combined trial' : field.latest.kind === 'specialist' ? 'specialist event' : 'practice'} for {dog.name}</h5>
          <ul className="mt-2">{field.latest.results.filter(result => result.dogId === dog.id).map(result => <li key={result.discipline}>{DISCIPLINE_INFO[result.discipline].name}: {result.score}/100 · +{result.gain} Field Club XP</li>)}</ul>
          {field.latest.kind !== 'practice' && <p className="mt-2">{field.latest.kind === 'team' ? 'Kennel team' : 'Event'} overall: {field.latest.average}/100 · placed {field.latest.placement} of 4 entries · simulated club opponents.</p>}
          <p className="text-xs text-earth-600 mt-2">Visit reports keep the latest 16 kennel visits. Accumulated learning and personal bests remain when older reports leave this list.</p>
        </div> : <p className="text-sm text-earth-600 mt-4">No recent saved visit report for {dog.name}. Accumulated learning and personal bests above are kept independently of the latest 16 reports.</p>}
      </section>}
      <h4 className="text-lg font-bold text-kennel-800 mb-2">Foundation traits &amp; stat training</h4>
      <p className="text-xs text-earth-600 mb-4">These original stat-training points are separate from Field Club learned ability. Stat training and bond also contribute to club performance.</p>
      <div className="flex justify-between text-sm mb-4"><span>Bond level {dog.bond_level}/10</span><span>{discovered}/{APTITUDES.length} foundation traits assessed</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {APTITUDES.map(a => <div key={a.key} className="rounded-xl border border-earth-200 bg-earth-50 p-3">
          <p className="text-sm font-semibold text-earth-700">{a.label}</p>
          <p className={`mt-1 font-bold ${isAptitudeKnown(dog, a.key) ? 'text-2xl text-kennel-700' : 'text-sm text-earth-600'}`}>{aptitudeDescription(dog, a.key)}</p>
          <p className="text-xs text-earth-600 mt-2">+{trainedAbility(dog, a.key).toFixed(1)} stat-training points</p>
          {!isAptitudeKnown(dog, a.key) && <p className="text-xs text-earth-500 mt-2">Try {a.activity}. Bond 1 and +1 training reveal this aptitude; bond 3 reveals all.</p>}
        </div>)}
      </div>
      <p className="text-xs text-earth-600 mt-4">Rescue origin never lowers inherited potential. Training gains belong to this dog; future puppies inherit ancestry and base traits, not earned training points or titles.</p>
    </div>
  </section>;
}
