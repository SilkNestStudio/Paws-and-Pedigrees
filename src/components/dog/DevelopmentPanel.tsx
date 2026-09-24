import type { Dog } from '../../types';
import { APTITUDES, aptitudeDescription, isAptitudeKnown, trainedAbility } from '../../utils/dogDevelopment';

export default function DevelopmentPanel({ dog }: { dog: Dog }) {
  const discovered = APTITUDES.filter(a => isAptitudeKnown(dog, a.key)).length;
  return <section className="mt-6 bg-white/95 rounded-2xl shadow-lg overflow-hidden">
    <div className="bg-kennel-800 text-white p-5">
      <p className="text-xs uppercase tracking-widest text-kennel-200">Every champion starts somewhere</p>
      <h3 className="text-xl font-bold mt-1">Getting to know {dog.name}</h3>
      <p className="text-sm text-kennel-100 mt-2">{dog.is_rescue
        ? 'Your rescue’s potential is already there. Bonding and training help you discover it.'
        : 'Inherited ability is the starting point. Care and practice turn potential into performance.'}</p>
    </div>
    <div className="p-5">
      <div className="flex justify-between text-sm mb-4"><span>Bond level {dog.bond_level}/10</span><span>{discovered}/{APTITUDES.length} aptitudes assessed</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {APTITUDES.map(a => <div key={a.key} className="rounded-xl border border-earth-200 bg-earth-50 p-3">
          <p className="text-sm font-semibold text-earth-700">{a.label}</p>
          <p className={`mt-1 font-bold ${isAptitudeKnown(dog, a.key) ? 'text-2xl text-kennel-700' : 'text-sm text-earth-600'}`}>{aptitudeDescription(dog, a.key)}</p>
          <p className="text-xs text-earth-600 mt-2">+{trainedAbility(dog, a.key).toFixed(1)} developed through practice</p>
          {!isAptitudeKnown(dog, a.key) && <p className="text-xs text-earth-500 mt-2">Try {a.activity}. Bond 1 and +1 training reveal this aptitude; bond 3 reveals all.</p>}
        </div>)}
      </div>
      <p className="text-xs text-earth-600 mt-4">Rescue origin never lowers inherited potential. Training gains belong to this dog; future puppies inherit ancestry and base traits, not earned training points or titles.</p>
    </div>
  </section>;
}
