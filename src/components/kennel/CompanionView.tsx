import { createPortal } from 'react-dom';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { rescueBreeds } from '../../data/rescueBreeds';
import { shopBreeds } from '../../data/shopBreeds';
import { getDogImage } from '../../utils/dogImages';
import { getXPForNextBondLevel } from '../../utils/bondSystem';
import { calculateFoodConsumption } from '../../utils/careCalculations';
import { activityRestriction } from '../../utils/dogDevelopment';
import { BONDING_ACTIVITIES, bondingRestriction, nextCompanionStep, type BondingActivity } from '../../utils/companionLoop';
import DevelopmentPanel from '../dog/DevelopmentPanel';
import NavIcon from '../layout/NavIcon';
const DogDetailView = lazy(() => import('./DogDetailView'));
const Petting = lazy(() => import('../minigames/RealisticPettingActivity'));
const Fetch = lazy(() => import('../minigames/RealisticFetchActivity'));
const Walk = lazy(() => import('../minigames/RealisticWalkActivity'));
type Destination = 'kennel' | 'training' | 'competition' | 'vet' | 'shop';
interface Props { onNavigate: (view: Destination) => void; }
export default function CompanionView({ onNavigate }: Props) {
 const { selectedDog, dogs, user, selectDog, feedDog, waterDog, restDog, eventRegistrations } = useGameStore();
 const [tab, setTab] = useState<'today' | 'development' | 'record'>('today');
 const [activity, setActivity] = useState<BondingActivity | null>(null);
 const activeDog = useRef<string | null>(null);
 const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
 const [, tick] = useState(0);
 useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(timer); }, []);
 const dog = dogs.find(d => d.id === selectedDog?.id);
 useEffect(() => { setFeedback(null); setTab('today'); setActivity(null); activeDog.current = null; }, [dog?.id]);
 if (!dog) return <section className="club-panel"><h2>Choose a companion</h2><p>Your dogs are waiting in the kennel.</p><button className="club-button" onClick={() => onNavigate('kennel')}>Back to your dogs</button></section>;
 const breed = [...rescueBreeds, ...shopBreeds].find(b => b.id === dog.breed_id);
 const next = nextCompanionStep(dog);
 const restriction = activityRestriction(dog);
 const food = calculateFoodConsumption(dog.size);
 const bondTarget = getXPForNextBondLevel(dog.bond_level);
 const trained = Math.max(dog.agility_trained || 0, dog.speed_trained || 0, dog.strength_trained || 0, dog.endurance_trained || 0, dog.obedience_trained || 0);
 const milestones = [
   { title: 'A place to belong', text: 'The beginning of your life together.', done: true },
   { title: 'Trust takes root', text: 'Reach bond level 1 through care and time together.', done: dog.bond_level >= 1 },
   { title: 'A skill to build on', text: 'Earn 10 trained points in any skill.', done: trained >= 10 },
   { title: 'Step into the ring', text: 'Complete your first registered competition.', done: eventRegistrations.some(r => r.dogId === dog.id && r.status === 'competed') },
 ];
 function begin(kind: BondingActivity) {
   if (!dog) return;
   const reason = bondingRestriction(dog, kind);
   if (reason) { setFeedback({ success: false, message: reason }); return; }
   activeDog.current = dog.id; setActivity(kind); setFeedback(null);
 }
 function finish(kind: BondingActivity) {
   const id = activeDog.current; activeDog.current = null; setActivity(null);
   if (id) setFeedback(useGameStore.getState().bondWithDog(id, kind));
 }
 const cancel = () => { activeDog.current = null; setActivity(null); };
 const indicators = [{ label:'Nourishment', value:dog.hunger },{ label:'Hydration', value:dog.thirst },{ label:'Energy', value:dog.energy_stat },{ label:'Happiness', value:dog.happiness }];
 return <div className="companion-page">
   <div className="companion-toolbar"><button className="club-text-button" onClick={() => onNavigate('kennel')}>Back to your dogs</button><label>Spend time with <select aria-label="Choose companion" value={dog.id} onChange={event => selectDog(dogs.find(d => d.id === event.target.value) || null)}>{dogs.filter(d => !d.is_dead || d.id === dog.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div>
   <section className="companion-hero"><div className="companion-portrait"><img src={getDogImage(breed?.name || 'Mixed Breed', dog.energy_stat < 30 ? 'Laying' : 'Sitting')} alt={dog.name}/><span>{dog.is_rescue ? 'A rescue. A new beginning.' : 'Part of your growing legacy.'}</span></div><div className="companion-introduction"><p className="club-eyebrow">YOUR COMPANION</p><h2>{dog.name}</h2><p className="companion-breed">{breed?.name || 'Mixed breed'} &middot; {dog.gender} &middot; {dog.age_weeks < 52 ? 'Puppy' : dog.life_stage === 'senior' ? 'Senior' : 'Adult'}</p><p className="companion-story">{dog.rescue_story || (dog.is_rescue ? 'Their past is only the beginning. The trust you build together will shape what comes next.' : 'Every shared session adds another chapter to your story.')}</p><div className="companion-bond"><div><strong>{dog.bond_level >= 10 ? 'An enduring bond' : dog.bond_level === 0 ? 'Getting to know you' : 'Growing together'}</strong><span>Bond level {dog.bond_level}</span></div><progress aria-label="Bond progress" max={bondTarget} value={dog.bond_level >= 10 ? bondTarget : dog.bond_xp}/><small>{dog.bond_level >= 10 ? 'You have reached the highest bond level.' : dog.bond_xp + ' / ' + bondTarget + ' XP to your next bond level'}</small></div></div></section>
   <div className="companion-tabs" role="tablist" aria-label="Companion details">{(['today','development','record'] as const).map(key => <button role="tab" aria-selected={tab===key} aria-controls={'companion-'+key} id={'tab-'+key} className={tab===key?'is-active':''} key={key} onClick={() => setTab(key)}>{key==='today'?'Time together':key==='development'?'Their potential':'Full record & options'}</button>)}</div>
   <div role="tabpanel" id={'companion-'+tab} aria-labelledby={'tab-'+tab}>
   {tab === 'today' && <>
     <div className="companion-condition">{indicators.map(item => <div key={item.label}><div><span>{item.label}</span><strong>{Math.round(item.value)}%</strong></div><progress aria-label={item.label} max={100} value={item.value} className={item.value < 30 ? 'is-low' : ''}/></div>)}</div>
     <section className="companion-next"><span className="club-stat-icon"><NavIcon name={next.destination === 'vet' ? 'vet' : 'breeding'}/></span><div><p className="club-eyebrow">READ THE MOMENT</p><h3>{next.title}</h3><p>{next.detail}</p></div>{next.destination !== 'dogDetail' && <button className="club-button" onClick={() => onNavigate(next.destination === 'dogDetail' ? 'kennel' : next.destination)}> {next.destination === 'vet' ? 'Visit the clinic' : 'Go to training'} <NavIcon name="arrow" size={18}/></button>}</section>
     {feedback && <div role="status" className={'companion-feedback ' + (feedback.success ? '' : 'is-warning')}><strong>{feedback.success ? 'A little progress, together.' : 'Not just yet.'}</strong><p>{feedback.message}</p></div>}
     {!dog.is_dead && <div className="companion-care-layout"><section className="club-panel"><div className="club-section-heading"><div><p className="club-eyebrow">COMFORT COMES FIRST</p><h3>The everyday essentials</h3></div><button className="club-text-button" onClick={() => onNavigate('shop')}>Buy supplies</button></div><p className="companion-supplies">Food in storage: {(user?.food_storage || 0).toFixed(1)} units &middot; {food} units per meal</p><div className="companion-essentials">{[
       { title:'Serve a meal', detail: dog.hunger >= 95 ? 'Comfortably fed' : (user?.food_storage || 0) < food ? 'Buy food supplies first' : food + ' food units - restores nourishment', disabled: dog.hunger >= 95 || (user?.food_storage || 0) < food, action: () => feedDog(dog.id) },
       { title:'Fresh water', detail: dog.thirst >= 95 ? 'Water is topped up' : 'Free - restores hydration', disabled:dog.thirst >= 95, action: () => waterDog(dog.id) },
       { title:'Settle down', detail: dog.energy_stat >= 95 ? 'Already well rested' : 'Free - recover energy', disabled:dog.energy_stat >= 95, action: () => restDog(dog.id) },
     ].map(item => <button key={item.title} disabled={item.disabled} onClick={() => { const result = item.action(); setFeedback({ ...result, message: result.message || 'Care complete.' }); }}><strong>{item.title}</strong><span>{item.detail}</span></button>)}</div></section>
     <section className="club-panel"><div className="club-section-heading"><div><p className="club-eyebrow">MORE THAN A ROUTINE</p><h3>Make a memory</h3></div></div><div className="companion-activities">{(Object.keys(BONDING_ACTIVITIES) as BondingActivity[]).map(kind => { const item = BONDING_ACTIVITIES[kind]; const reason = bondingRestriction(dog,kind); return <button key={kind} disabled={!!reason} onClick={() => begin(kind)}><NavIcon name={kind==='pet'?'breeding':'training'}/><div><strong>{item.title}</strong><p>{reason || item.description}</p><small>{item.energy ? item.energy + ' energy' : 'Gentle activity'} &middot; Builds bond and happiness</small></div><NavIcon name="arrow" size={17}/></button>; })}</div></section></div>}
     {!dog.is_dead && <section className="companion-session"><div><p className="club-eyebrow">WHEN YOU ARE BOTH READY</p><h3>Turn connection into confidence.</h3><p>{restriction || (dog.energy_stat < 30 ? 'Rest until energy reaches 30% before training.' : 'Practice together, then see how far you have come in a competition.')}</p></div><div><button className="club-button" disabled={!!restriction || dog.energy_stat < 30} onClick={() => onNavigate('training')}>Choose training</button><button className="club-text-button" onClick={() => onNavigate('competition')}>Explore events <NavIcon name="arrow" size={17}/></button></div></section>}
   </>}
   {tab === 'development' && <><section className="club-panel companion-milestones"><p className="club-eyebrow">A JOURNEY, NOT A CHECKLIST</p><h3>A companion with a future</h3><p>These markers reflect their current bond, learned skills, and recorded competitions. Explore every discipline at your own pace.</p><ol>{milestones.map((item,index) => <li key={item.title} className={item.done?'is-complete':''}><span>{item.done?'Done':'0'+(index+1)}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></li>)}</ol></section><DevelopmentPanel dog={dog}/></>}
   {tab === 'record' && <Suspense fallback={<p>Opening their record...</p>}><DogDetailView onBack={() => setTab('today')} onNavigateToShop={() => onNavigate('shop')}/></Suspense>}
   </div>
   {activity && createPortal(<div className="companion-activity-layer"><Suspense fallback={<div className="companion-loading" role="status">Preparing your time together...<button className="club-button" onClick={cancel}>Back to your companion</button></div>}>
    {activity === 'pet' && <Petting dog={dog} onComplete={() => finish('pet')} onCancel={cancel}/>}
    {activity === 'fetch' && <Fetch dog={dog} onComplete={() => finish('fetch')} onCancel={cancel}/>}
    {activity === 'walk' && <Walk dog={dog} onComplete={() => finish('walk')} onCancel={cancel}/>}
   </Suspense></div>, document.body)}
 </div>;
}
