import type { Dog } from '../../types';

interface DogMemorialModalProps {
  dog: Dog;
  onClose: () => void;
  onRevive: (dogId: string) => void;
  onStartFresh: (dogId: string) => void;
}

export default function DogMemorialModal({ dog, onClose, onRevive }: DogMemorialModalProps) {
  const legacyRecovery = dog.death_cause !== 'old_age';
  return <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true" aria-labelledby="memorial-title">
    <div className="max-w-lg w-full bg-white rounded-2xl p-6 shadow-2xl">
      <p className="text-xs uppercase tracking-widest text-kennel-700">Part of your story</p>
      <h2 id="memorial-title" className="text-3xl font-bold text-earth-900 my-3">{dog.name}</h2>
      <p className="text-earth-700">{legacyRecovery
        ? 'This dog was affected by the previous health rules. You can return them to community care for free. The new care system caps absence-related health loss and provides a recovery path.'
        : 'A life shared, and a legacy that stays. Their bond, accomplishments, and place in your family are remembered here.'}</p>
      <div className="flex gap-6 my-5 text-sm text-earth-700"><span>Bond level {dog.bond_level}</span><span>{dog.championship_points || 0} championship points</span></div>
      {legacyRecovery && <button onClick={() => onRevive(dog.id)} className="w-full bg-kennel-700 text-white rounded-xl p-3 font-bold">Free community recovery</button>}
      <button onClick={onClose} className="w-full mt-3 border border-earth-300 rounded-xl p-3">Keep in kennel history</button>
    </div>
  </div>;
}
