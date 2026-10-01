import TrainingMenu from '../club/TrainingMenu';
import World from './YardWorld';
import { YARD_CARE_THRESHOLD } from './care';
import { YARD_CAMERA } from './camera';
import AgilityGame from '../agility/AgilityGame';
import { nextRibbonStep, RIBBON_STEPS, apprenticeshipComplete } from '../../utils/firstRibbon';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import TrainingView from '../../components/training/TrainingView';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useGameStore } from '../../stores/gameStore';
import { stations, stationApproach, type YardPosition } from './simulation';
import './yard.css';
import { yardPath } from './handler';
import YardActivity from './YardActivity';
import { bondingRestriction } from '../../utils/companionLoop';
import { activityRestriction } from '../../utils/dogDevelopment';
export default function KennelYard({onInside,onShop,onFieldClub,launch,onWelcomeComplete}:{onFieldClub?:()=>void;onInside?:()=>void;onShop?:()=>void;launch?:{id:number;action:string}|null;onWelcomeComplete?:()=>void}) {
    const { dogs, selectedDog, selectDog, tutorialProgress } = useGameStore();
    const journey = tutorialProgress.firstRibbon;
    const lesson = journey?.status === 'active' ? nextRibbonStep(journey)?.id : undefined;
    const lessonReached=(id:string)=>!!tutorialProgress.fieldClub || apprenticeshipComplete(tutorialProgress) || RIBBON_STEPS.findIndex(s=>s.id===id)<=RIBBON_STEPS.findIndex(s=>s.id===nextRibbonStep(journey)?.id);
    const [waiting,setWaiting]=useState(false);
    const [behavior,setBehavior]=useState('Taking in the surroundings');
    const [overview, setOverview] = useState(false);
    const [welcomeMeet, setWelcomeMeet] = useState(false);
    const companions = dogs.filter(d => !d.is_dead);
    const dog = companions.find(d => d.id === selectedDog?.id) ?? companions[0];
    const [ownerPosition,setOwnerPosition] = useState<YardPosition>({x:0,z:6});
    const [cue,setCue] = useState<{id:number;kind:'recall'|'rest'}|null>(null);
    const [position, setPosition] = useState<YardPosition>({ x: .8, z: 5.2 });
    const [caring, setCaring] = useState(false), [training, setTraining] = useState<string | null>(null), [fetching, setFetching] = useState(false), [low, setLow] = useState(false), [message, setMessage] = useState('Tap the lawn to walk. Your dog can follow you or explore nearby.');
    const [destination,setDestination]=useState<YardPosition|null>(null);
    const [paused,setPaused]=useState(false);
    const pendingStation=useRef<typeof stations[number] | null>(null);
    const send = (p:YardPosition, action:typeof stations[number]|null=null) => {
        if(paused)return;
        if(!yardPath(ownerPosition,p)){setMessage('Choose an open spot inside the fence.');return;}
        setWaiting(false);setCue(null);setCaring(false);pendingStation.current=action;setDestination({...p});
        setMessage(action?`Walking over to ${action.name.toLowerCase()}.`:`You are walking across the yard. ${dog.name} can follow.`);
    };
    useEffect(() => {
        const clear = () => { setCaring(false); setDestination(null); pendingStation.current=null; setPaused(true); };
        window.addEventListener('blur', clear);
        document.addEventListener('visibilitychange', clear);
        return () => { window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
    }, []);
    useEffect(()=>{if(dog)useGameStore.getState().recordRibbon(dog.id,'yard');},[dog?.id,journey?.status]);
    const consumedLaunch=useRef<number>();
    useEffect(()=>{
      if(!launch||!dog||consumedLaunch.current===launch.id)return;
      consumedLaunch.current=launch.id;const action=launch.action;
      if(!lessonReached(action))return;
      if(['fetch','obedience','agility','meet'].includes(action)){
        const reason=action==='fetch'?bondingRestriction(dog,'fetch'):activityRestriction(dog);
        if(reason){setMessage(reason);return;}
        selectDog(dog);
        if(action==='fetch')setFetching(true);else if(action==='meet')setWelcomeMeet(true);else setTraining(action);
      }else{const station=stations.find(s=>s.id===(action==='feed'?'food':action));if(station)send(stationApproach(station),station);}
    },[launch,dog?.id]);

    if (!dog)
        return <p>Adopt your first companion to open your kennel yard.</p>;
    const interact = () => {
        const station=pendingStation.current; pendingStation.current=null; setDestination(null);
        setCaring(false);
        if (!station) { setMessage(`${dog.name} can explore while you are here.`); return; }
        if (station.id === 'inside') { onInside?.(); return; }
        if (station.id === 'supplies') { onShop?.(); return; }
        if (station.id === 'agility') { selectDog(dog); setTraining('menu'); return; }
        if (station.id === 'rest') { setCue({id:Date.now(),kind:'rest'}); setMessage(`Calling ${dog.name} to settle on the mat.`); return; }
        const result = useGameStore.getState().prepareYardBowl(dog.id,station.id);
        setMessage(result.message);
    };
    if (welcomeMeet) return <AgilityGame dog={dog} dogName={dog.name} mode="welcome" agility={dog.agility+dog.agility_trained} onCancel={()=>setWelcomeMeet(false)} onComplete={()=>{
      const state=useGameStore.getState(); const live=state.dogs.find(d=>d.id===dog.id);
      if(live && !activityRestriction(live))state.recordRibbon(dog.id,'meet');
      setWelcomeMeet(false);onWelcomeComplete?.();
    }}/>;
    if (fetching) return <YardActivity dog={dog} onCancel={()=>setFetching(false)} onComplete={()=>{
      const result=useGameStore.getState().bondWithDog(dog.id,'fetch');
      setMessage(result.message ?? 'Time together complete.');setFetching(false);
    }}/>;
    if (training === 'menu') return <TrainingMenu onReturn={() => setTraining(null)} onOtherTraining={() => setTraining('general')} onFieldClub={onFieldClub}/>;
    if (training)
        return <div className="yard-training"><button className="yard-button" onClick={() => setTraining('menu')}>Back to training menu</button><button className="yard-button" onClick={() => setTraining(null)}>Return to the yard</button><TrainingView key={training} initialTraining={training === 'general' ? undefined : training} onReturnToDog={() => setTraining(null)} onCancelSession={() => setTraining(null)}/></div>;
    return <section className="kennel-yard">
    <div className="yard-interior-link">{onInside&&<button className="journey-text-button" onClick={onInside}>Go inside the kennel</button>}</div><header className="yard-heading"><div><p>YOUR KENNEL / TIME TOGETHER</p><h1>A partnership, every day.</h1><span>Care for them. Discover their strengths. Grow together.</span></div><label>Your companion<select aria-label="Yard companion" disabled={caring} value={dog.id} onChange={e => { selectDog(companions.find(d => d.id === e.target.value)!); setPosition({ x: .8, z: 5.2 }); setOwnerPosition({x:0,z:6}); setCue(null); setWaiting(false); setDestination(null); pendingStation.current=null; }}>{companions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></header>
    {journey?.ribbonEarned && <div className="ribbon-earned">Your First Ribbon / A keepsake from your welcome meet, displayed on the cottage.</div>}
    <div className="yard-layout"><div className="yard-scene-column"><div className="yard-stage" data-owner-x={ownerPosition.x.toFixed(2)} data-owner-z={ownerPosition.z.toFixed(2)} data-behavior={behavior} data-x={position.x.toFixed(2)} data-z={position.z.toFixed(2)}>
      <ErrorBoundary fallback={<p className="yard-fallback">The yard could not load. Your dog is safe; return to My dogs for care.</p>}><Canvas shadows={!low} dpr={low ? 1 : [1, 1.5]} camera={{ position: YARD_CAMERA.close.position, fov: 45 }} fallback={<p>3D is unavailable on this device. You can still care for your dog in My dogs.</p>}><Suspense fallback={<Html center><div className="yard-label">Preparing your yard...</div></Html>}><World waiting={waiting} cue={cue} onBehavior={setBehavior} onMessage={setMessage} onBusy={setCaring} overview={overview} key={dog.id} spawn={position} ownerSpawn={ownerPosition} dog={dog} destination={destination} preparing={!!pendingStation.current} paused={paused} onArrive={interact} onSend={p=>send(p)} onStation={station=>{if(['inside','supplies'].includes(station.id)||lessonReached(station.id==='food'?'feed':station.id))send(stationApproach(station),station);}} onPosition={setPosition} onOwnerPosition={setOwnerPosition} low={low}/></Suspense></Canvas></ErrorBoundary>
      <div className="yard-status"><strong>{dog.name}</strong><span className="yard-behavior">{behavior}</span><span>Food {Math.round(dog.hunger)}% · Water {Math.round(dog.thirst)}% · Energy {Math.round(dog.energy_stat)}%</span></div>
      <button className="yard-camera-toggle" aria-pressed={overview} onClick={()=>setOverview(!overview)}>{overview ? 'Closer view' : 'Whole yard'}</button>
      <div className="yard-owner-controls"><button disabled={paused} onClick={()=>{setWaiting(false);setDestination(null);pendingStation.current=null;setCue({id:Date.now(),kind:'recall'});setMessage(`Calling ${dog.name} back to you.`);}}>Call {dog.name} back</button><button disabled={paused} aria-pressed={waiting} onClick={()=>{setCue(null);setWaiting(!waiting);setMessage(waiting?`${dog.name} can explore and use prepared bowls again.`:`${dog.name} will stay here until released.`);}}>{waiting ? 'Let them explore' : 'Ask to wait'}</button></div>
      {paused&&<div className="yard-pause"><strong>Your time together is paused</strong><button className="yard-button" onClick={()=>setPaused(false)}>Continue together</button></div>}
    </div><p className="yard-message" role="status">{message}</p>
      <button className="yard-quality" onClick={() => setLow(!low)}>{low ? 'Low' : 'Standard'} graphics</button>
    <p className="yard-instruction">Tap the lawn to walk your handler. Your dog follows when you move away, and explores between cues. Tap Training to choose an exercise, a bowl to prepare it, or Supplies at the gate to visit the shop. Call back brings your dog to you; Wait holds them in place.</p></div>
    <aside className="yard-companion"><span>YOUR COMPANION</span><h2>Time with {dog.name}</h2><p>You provide the care. They find their own rhythm.</p><div className="yard-needs">{[['Food',dog.hunger],['Water',dog.thirst],['Energy',dog.energy_stat]].map(([label,value])=><div key={label}><label>{label} <strong>{Math.round(Number(value))}%</strong></label><meter min="0" max="100" value={Number(value)} aria-label={String(label)}/></div>)}</div><h3>Care & comfort</h3><p>Pantry: {(useGameStore.getState().user?.food_storage??0).toFixed(1)} food units {onShop&&<button className="yard-shop" onClick={()=>{const s=stations.find(s=>s.id==='supplies')!;send(stationApproach(s),s);}}>Buy food</button>}</p><p className="yard-bowl-summary">{dog.name}'s bowls: meal {dog.yard_bowls?.food?'ready':'empty'} / water {dog.yard_bowls?.water?'ready':'empty'}. They eat or drink at {YARD_CARE_THRESHOLD}% or below while exploring. One serving per refill; no automatic pantry spending.</p>{stations.filter(s=>!['inside','supplies'].includes(s.id)).filter(s=>s.id!=='agility'||lessonReached('agility')).filter(s=>s.id!=='rest'||lessonReached('rest')).map(s=><button key={s.id} disabled={paused||caring||((s.id==='food'||s.id==='water')&&!!dog.yard_bowls?.[s.id])} className={`yard-action ${lesson===(s.id==='food'?'feed':s.id)?'tutorial-focus':''}`} onClick={()=>send(stationApproach(s),s)}><strong>{s.name}</strong><span>{s.hint}</span></button>)}<h3>Play & purpose</h3>
    <div className="yard-activity-options">{lesson==='meet'&&journey?.dogId===dog.id&&<button className="tutorial-focus" disabled={paused||caring||!!activityRestriction(dog)} onClick={()=>{setDestination(null);pendingStation.current=null;setWelcomeMeet(true);}}>Enter the free welcome meet</button>}{lessonReached('fetch')&&<button className={lesson==='fetch'?'tutorial-focus':''} disabled={paused || caring || !!bondingRestriction(dog,'fetch')} title={bondingRestriction(dog,'fetch') ?? 'Three throws, three retrieves. Builds bond; costs 20 energy.'} onClick={()=>{setDestination(null);pendingStation.current=null;setFetching(true);}}>Play fetch in the yard</button>}{lessonReached('obedience')&&<button className={lesson==='obedience'?'tutorial-focus':''} disabled={paused || caring || !!activityRestriction(dog)} title={activityRestriction(dog) ?? 'Practice sit, stay and recall. Uses 10 training points.'} onClick={()=>{setDestination(null);pendingStation.current=null;selectDog(dog);setTraining('obedience');}}>Practice sit, stay &amp; recall</button>}</div>
</aside></div><div className="yard-footer"><span>01 / THE KENNEL YARD</span><p>Small daily moments build a lasting partnership. Care here uses your existing supplies and saves with your kennel.</p></div>
  </section>;
}
