import type { Journey } from './journey';
import { careBlocked, type CareAction } from './routine';

export default function CarePanel({ journey, busy, onCare, onParcel, onBack }: { journey: Journey; busy: boolean; onCare: (action: CareAction) => void; onParcel: () => void; onBack: () => void }) {
  const r = journey.routine;
  return <><span className="legacy-eyebrow">A home and a routine</span><h2 id="legacy-panel-title">Looking after {journey.dog!.name}.</h2><p>Food, water and a quiet rest make learning easier. Offer what your dog needs, then watch them settle by their bowls.</p>
    <div className="legacy-care-grid">{[['Food', r.food], ['Water', r.water], ['Energy', r.energy]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>of 100</small></div>)}</div>
    <p className="legacy-note">{r.meals} meals in the cupboard. Fresh water and rest are always available. The rescue can provide an emergency meal if you run out.</p>
    {(['meal', 'water', 'rest'] as const).map(action => { const reason = careBlocked(journey, action); return <div key={action}><button className="legacy-secondary" disabled={busy || !!reason} onClick={() => onCare(action)}>{action === 'meal' ? 'Serve a meal' : action === 'water' ? 'Offer fresh water' : 'Settle for a quiet rest'}</button>{reason && <small>{reason}</small>}</div>; })}
    {r.meals === 0 && <button className="legacy-secondary" onClick={onParcel}>Collect an emergency rescue meal</button>}
    <button className="legacy-primary" onClick={onBack}>Back to the courtyard</button></>;
}
