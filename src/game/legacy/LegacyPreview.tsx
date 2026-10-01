import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import PropertyWorld, { type WorldSnapshot } from './PropertyWorld';
import { canWalk, newMotion, PLACES, propertyPath, type PlaceId } from './property';
import { faceDestination } from './wayfinding';
import HomecomingStory from './HomecomingStory';
import ShelterVisit from './ShelterVisit';
import { adoptRescue, canAdopt, newJourney, RESCUES, type Greeting, type RescueCandidate } from './journey';
import { useJourney } from './useJourney';
import CarePanel from './CarePanel';
import FocusWalkGame from './FocusWalkGame';
import { careBlocked, finishCare, finishFocusWalk, trainingBlocked, type CareAction } from './routine';
import { callPlayDog, newPlay } from '../playyard/play';
import { JOBS, jobBlocked, finishOuting, workRecord, type JobId } from './outings';
import { yardAim } from './propertyFetch';
import './legacy.css';
import '../playyard/playyard.css';

const OutingGame = lazy(() => import('./OutingGame'));

type Panel = 'arrival' | 'journal' | 'tools' | 'pause' | 'welcome' | 'reset' | PlaceId | null;
export default function LegacyPreview() {
  const save = useJourney();
  if (!save.journey) return <main className="legacy-loading"><h1>Homecoming</h1><p role="status">{save.error || save.status}</p>{save.error && <button onClick={() => window.location.reload()}>Try opening the save again</button>}</main>;
  return <LegacyExperience save={save}/>;
}
function LegacyExperience({ save }: { save: ReturnType<typeof useJourney> }) {
  const journey = save.journey!;
  const updateJourney = save.update;
  const { readLedger, prepared, kennelName } = journey;
  const named = !!kennelName;
  const rescue = RESCUES.find(d => d.id === journey.dog?.rescueId);
  const dogName = journey.dog?.name ?? 'Scout';
  const [visitingShelter, setVisitingShelter] = useState(false);
  const [outing, setOuting] = useState<JobId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recallHint, setRecallHint] = useState('');
  const [training, setTraining] = useState(false), [careBusy, setCareBusy] = useState(false), [careMessage, setCareMessage] = useState('');
  const careNeeded = !journey.routine.fed || !journey.routine.watered;
  const needsRecovery = journey.routine.food < 40 || journey.routine.water < 40 || journey.routine.energy < 30;
  const recallAttempt = useRef(false);
  const setReadLedger = (value: boolean) => save.update(j => ({ ...j, readLedger: value }));
  const setPrepared = (value: boolean) => save.update(j => ({ ...j, prepared: value }));
  const motion = useRef(newMotion());
  const [panel, setPanel] = useState<Panel>(journey.introSeen ? null : 'arrival'), [ready, setReady] = useState(false);
  const [draftName, setDraftName] = useState(kennelName), [error, setError] = useState('');
  const [testCompanion, setCompanion] = useState(false), [restored, setRestored] = useState(false), [overview, setOverview] = useState(false), [waiting, setWaiting] = useState(false);
  const companion = !!journey.dog || testCompanion;
  const [dogBuild, setDogBuild] = useState<'companion' | 'stocky'>('companion');
  const [snapshot, setSnapshot] = useState<WorldSnapshot>({ keeper: { x: 0, z: 11 }, nearest: null, walking: false, dogBehavior: '' });
  const dialog = useRef<HTMLDialogElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const readyCallback = useCallback(() => setReady(true), []);
  const nextJob = JOBS.find(job => !workRecord(journey).completed.includes(job.id));
  const workReady = !!journey.dog && journey.settled && !!nextJob && !jobBlocked(journey, nextJob.id);
  const objective: PlaceId = workReady ? 'gate' : !readLedger ? 'ledger' : !prepared ? 'run' : !named ? 'ledger' : journey.dog ? !journey.settled ? 'run' : !journey.firstRecall ? 'field' : careNeeded || needsRecovery ? 'run' : journey.routine.sessions && !journey.routine.invitationRead ? 'gate' : 'field' : 'gate';
  const objectiveTitle = workReady ? workRecord(journey).completed.length ? 'The neighbors know your name' : 'Your first job together' : !readLedger ? "Find Grandpa's ledger" : !prepared ? 'Make room for your first dog' : !named ? 'Give your kennel a name' : !journey.dog ? 'A companion is waiting' : !journey.settled ? `Welcome ${dogName} home` : !journey.firstRecall ? 'Your first lesson together' : careNeeded ? 'A meal and fresh water' : needsRecovery ? 'Time to recharge' : !journey.routine.sessions ? 'Learn to stay together' : !journey.routine.invitationRead ? 'An invitation from the club' : 'Keep building your partnership';
  const objectiveText = workReady ? workRecord(journey).completed.length ? 'Ellis and Rowan heard about your good nose. Visit the front gate for another request.' : 'Mara lost her satchel on the orchard trail. Visit the front gate, help her find it, and earn supplies for your kennel.' : !readLedger ? 'His workbench is outside the main kennel.' : !prepared ? 'A clean bed and a place to feel safe. Start with the run beside the door.' : !named ? 'Return to the ledger. This next chapter belongs to you.' : !journey.dog ? 'Head to the front gate. Your next stop is the rescue.' : !journey.settled ? 'Walk to the prepared run and help your new companion settle in.' : !journey.firstRecall ? 'Visit the training grounds to learn your first recall together.' : careNeeded ? 'Visit the dog run. Offer your companion a meal and fresh water before the next lesson.' : needsRecovery ? 'Visit the run for the food, water or rest your dog needs.' : !journey.routine.sessions ? 'Head to the training grounds for a focus walk through the meadow.' : !journey.routine.invitationRead ? 'A message is waiting at the front gate. Someone noticed your new beginning.' : 'Practice in the meadow and look after your dog. Your invitation marks the next chapter.';
  const nearest = PLACES.find(p => p.id === snapshot.nearest);
  const waypoint = PLACES.find(p => p.id === (snapshot.navigation?.place ?? objective))!;
  const openInteraction = useCallback(() => { if (snapshot.nearest) { motion.current.destination = null; setPanel(snapshot.nearest); } }, [snapshot.nearest]);
  useEffect(() => { motion.current.destination = null; }, [objective]);
  useEffect(() => {
    if (visitingShelter || training || outing) return;
    const m = motion.current;
    const stop = () => { m.play.charging = false; m.play.charge = 0; m.keys.clear(); m.stick = { x: 0, z: 0 }; m.route = []; };
    const blur = () => { stop(); setPanel(p => p ?? 'pause'); };
    const hidden = () => { if (document.hidden) blur(); };
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (e.code === 'Escape') { e.preventDefault(); if (panel === 'arrival') updateJourney(j => ({ ...j, introSeen: true })); setPanel(p => p ? null : 'pause'); return; }
      if (panel) return;
      if (e.code === 'KeyF' && !e.repeat) { e.preventDefault(); openInteraction(); return; }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE'].includes(e.code)) { e.preventDefault(); m.keys.add(e.code); }
    };
    const up = (e: KeyboardEvent) => m.keys.delete(e.code);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hidden);
    if (panel) stop();
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); };
  }, [panel, openInteraction, visitingShelter, training, outing, updateJourney]);
  useEffect(() => {
    const node = dialog.current;
    if (panel && node && !node.open) { previousFocus.current = document.activeElement as HTMLElement; node.showModal(); }
    if (!panel && node?.open) { node.close(); previousFocus.current?.focus(); previousFocus.current?.blur(); }
  }, [panel]);
  const walkTo = (id: PlaceId) => { endFetch(); setPanel(null); const place = PLACES.find(p => p.id === id)!; motion.current.destination = id; motion.current.route = propertyPath(motion.current.keeper, place.point); };
  function faceWaypoint() {
    motion.current.facing = faceDestination(motion.current.keeper, waypoint.lookAt);
    motion.current.overview = false; setOverview(false);
  }
  function saveName() {
    const name = draftName.trim(); if (name.length < 2 || name.length > 36) { setError('Choose a name with 2 to 36 characters.'); return; }
    save.update(j => ({ ...j, kennelName: name })); setError(''); setPanel(null);
  }
  function reset() {
    endFetch();
    save.update(() => newJourney()); motion.current = newMotion(); setDraftName(''); setCompanion(false); setRestored(false); setOverview(false); setWaiting(false); setDogBuild('companion'); setPanel('arrival'); setRecallHint(''); recallAttempt.current = false; setCareBusy(false); setCareMessage('');
  }
  function adopt(candidate: RescueCandidate, name: string, observations: Greeting[]) {
    if (!canAdopt(journey)) return;
    const next = adoptRescue(journey, candidate.id, name, observations, crypto.randomUUID(), new Date().toISOString());
    save.update(() => next); setCompanion(false); setVisitingShelter(false); motion.current = newMotion(); setWaiting(false); setPanel('welcome');
  }
  function callDog() {
    const m = motion.current;
    if (m.playing) { callPlayDog(m.play); return; }
    const gap = Math.hypot(m.dog.x - m.keeper.x, m.dog.z - m.keeper.z);
    if (journey.dog && journey.settled && !journey.firstRecall) {
      recallAttempt.current = gap >= 3;
      setRecallHint(gap >= 3 ? 'Stay still and give your dog time to reach you.' : 'Ask your dog to wait, walk at least three meters away, then call again.');
    }
    m.wait = false; m.recall = true; m.dogRoute = propertyPath(m.dog, m.keeper); setWaiting(false);
  }
  const publishSnapshot = useCallback((value: WorldSnapshot) => {
    setSnapshot(value);
    const m = motion.current;
    if (recallAttempt.current && !m.recall && Math.hypot(m.dog.x - m.keeper.x, m.dog.z - m.keeper.z) < 1.6) {
      recallAttempt.current = false;
      updateJourney(j => j.dog && j.settled && !j.firstRecall ? { ...j, firstRecall: true, dog: { ...j.dog, bond: Math.min(100, j.dog.bond + 5) } } : j);
      setRecallHint('They came back to you. A small success, and the beginning of trust.');
    }
  }, [updateJourney]);
  function endFetch() {
    const m = motion.current; m.playing = false; m.play.charging = false; m.dogRoute = []; m.recall = false;
    setPlaying(false);
  }
  function toggleFetch() {
    if (playing) { endFetch(); return; }
    if (!companion || careBusy) return;
    const m = motion.current;
    m.play = newPlay((rescue?.build ?? dogBuild) === 'stocky' ? 'june' : 'pip');
    m.play.keeper = m.keeper; m.play.dog = m.dog;
    const aptitude = journey.dog?.aptitude ?? { retrieve: 60, focus: 60 };
    m.play.handling = { hesitates: aptitude.retrieve < 70, parades: aptitude.focus < 60, familiar: journey.routine.focus >= 20 };
    m.play.aim = yardAim({ x: m.keeper.x, z: m.keeper.z - 5 });
    m.playing = true; m.wait = false; m.recall = false; m.route = []; m.dogRoute = [];
    recallAttempt.current = false; setRecallHint(''); setCareMessage(''); setWaiting(false); setPlaying(true);
  }
  function startCare(kind: CareAction) {
    if (careBusy || careBlocked(journey, kind)) return;
    endFetch();
    const m = motion.current;
    m.wait = false; m.recall = false; recallAttempt.current = false; setWaiting(false);
    m.care = { kind, remaining: kind === 'rest' ? 6 : 3.5 };
    m.dogRoute = propertyPath(m.dog, { x: kind === 'meal' ? 2.5 : kind === 'water' ? 3.15 : 4.1, z: -2.65 });
    setCareBusy(true); setCareMessage(kind === 'meal' ? 'A meal is ready. Your dog is heading to the bowl.' : kind === 'water' ? 'Fresh water is ready.' : 'A quiet break beside their bed.'); setPanel(null);
  }
  const careComplete = useCallback((kind: CareAction) => {
    updateJourney(j => finishCare(j, kind)); setCareBusy(false);
    setCareMessage(kind === 'meal' ? 'Meal finished. Your dog is comfortably fed.' : kind === 'water' ? 'Refreshed and ready for a little more exploring.' : 'Rested. A break is part of good training, too.');
  }, [updateJourney]);
  function toggleCompanion(enabled: boolean) {
    const m = motion.current;
    endFetch(); setCompanion(enabled);
    m.dog = [[1.7, 0], [-1.7, 0], [0, -1.7], [0, 1.7]].map(([x, z]) => ({ x: m.keeper.x + x, z: m.keeper.z + z })).find(canWalk) ?? { ...m.keeper };
    m.dogRoute = []; m.wait = false; m.recall = false; setWaiting(false);
  }
  if (outing) return <Suspense fallback={<main className="legacy-loading"><h1>Opening the orchard trail...</h1></main>}><OutingGame journey={journey} id={outing} onBack={() => { setOuting(null); setPanel('gate'); }} onComplete={quality => { updateJourney(j => finishOuting(j, outing, quality)); setOuting(null); setPanel('gate'); }}/></Suspense>;
  if (training) return <FocusWalkGame journey={journey} onBack={() => { setTraining(false); setPanel('field'); }} onComplete={quality => { updateJourney(j => finishFocusWalk(j, quality)); setTraining(false); setPanel('field'); }}/>
  if (visitingShelter) return <ShelterVisit kennelName={kennelName} onBack={() => { setVisitingShelter(false); setPanel(null); }} onAdopt={adopt}/>;
  return <main className="legacy-preview" data-playing={playing} data-fetch-phase={snapshot.fetch?.phase ?? ""} data-fetch-throws={snapshot.fetch?.throws ?? 0} data-fetch-returns={snapshot.fetch?.returns ?? 0} data-dog-name={journey.dog?.name ?? ''} data-settled={journey.settled} data-first-recall={journey.firstRecall} data-training-sessions={journey.routine.sessions} data-care-busy={careBusy} data-ready={ready} data-x={snapshot.keeper.x.toFixed(2)} data-z={snapshot.keeper.z.toFixed(2)} data-nearest={snapshot.nearest ?? ''} data-prepared={prepared} data-companion={companion}>
    <div className="legacy-world"><Canvas shadows dpr={[1, 1.5]} camera={{ position: [2, 7, 20], fov: 48, near: .1, far: 150 }} gl={{ antialias: true }}>
      <Suspense fallback={null}><PropertyWorld motion={motion} paused={panel !== null} companion={companion} dogBuild={rescue?.build ?? dogBuild} dogCollar={rescue?.collar} prepared={prepared} restored={restored} kennelName={kennelName} objective={objective} onSnapshot={publishSnapshot} onReady={readyCallback} onCareComplete={careComplete} retrieveAbility={journey.dog?.aptitude.retrieve}/></Suspense>
    </Canvas></div>
    <div className="legacy-vignette" aria-hidden="true"/>
    <header className="legacy-header"><div><span className="legacy-eyebrow">Paws & Pedigrees <i/> Homecoming</span><h1>{kennelName || "Grandpa's kennel"}</h1><p>Late afternoon <span>·</span> A new beginning</p></div>
      <nav aria-label="Preview controls"><a className="legacy-play-yard-link" href="/?preview=yard">Yard experiment</a><button onClick={() => setPanel('journal')}>Journal</button><button onClick={() => setPanel('tools')}>Test tools</button><button aria-label="Pause" onClick={() => setPanel('pause')}>Ⅱ</button></nav>
    </header>
    {journey.dog && <div className="legacy-care-status" aria-label="Dog condition"><span>Food <strong>{journey.routine.food}</strong></span><span>Water <strong>{journey.routine.water}</strong></span><span>Energy <strong>{journey.routine.energy}</strong></span><span>Meals <strong>{journey.routine.meals}</strong></span></div>}
    {careMessage && <div className="legacy-care-message" role="status">{careMessage}</div>}
    <aside hidden={playing} className="legacy-objective" aria-label="Current objective"><span className="legacy-eyebrow">Chapter one <span> / </span> The inheritance</span><h2>{objectiveTitle}</h2><p>{objectiveText}</p><button onClick={() => walkTo(objective)}>Walk there <span aria-hidden="true">↗</span></button></aside>
    <div className="legacy-camera"><button aria-label="Turn camera left" onClick={() => { motion.current.yaw += .6; motion.current.facing = null; }}>↶</button><button onClick={() => { const value = !overview; motion.current.overview = value; setOverview(value); }}>{overview ? 'Follow view' : 'Look around'}</button><button aria-label="Turn camera right" onClick={() => { motion.current.yaw -= .6; motion.current.facing = null; }}>↷</button></div>
    <div hidden={playing} className="legacy-wayfinder" role="region" aria-label="Destination directions" data-destination={waypoint.id} data-direction={snapshot.navigation?.direction}>
      <span className="legacy-bearing" aria-hidden="true"><svg viewBox="0 0 32 32" style={{ transform: `rotate(${snapshot.navigation?.angle ?? 0}deg)` }}><path d="M16 4 26 26 16 21 6 26Z" fill="currentColor"/></svg></span>
      <div><strong>{waypoint.id === 'gate' ? 'Front gate · Rescue road' : waypoint.name}</strong><span>{(snapshot.navigation?.distance ?? 0) < 2.5 ? 'You’re here' : `${snapshot.navigation?.direction ?? 'Ahead'} · ${Math.ceil(snapshot.navigation?.distance ?? 0)} m`}</span></div>
      <button onClick={faceWaypoint} aria-label="Face destination">Face <span aria-hidden="true">↗</span></button>
    </div>
    {companion && <div className="legacy-companion"><span className="legacy-eyebrow">{dogName} · {journey.dog ? 'Founding companion' : 'test companion'}</span><p>{snapshot.dogBehavior || 'Taking in the courtyard'}</p><button disabled={careBusy} onClick={callDog}>Call {dogName}</button><button disabled={careBusy || playing} onClick={() => { motion.current.wait = !waiting; motion.current.dogRoute = []; setWaiting(!waiting); }}>{waiting ? 'Release' : 'Wait here'}</button><button disabled={careBusy} aria-pressed={playing} onClick={toggleFetch}>{playing ? 'Put toy away' : 'Play fetch'}</button>{playing && <p className="legacy-fetch-help">Hold on the ground, aim and release. Move with WASD or the direction pad.<br/>{snapshot.fetch?.returns ?? 0} returns this visit{snapshot.fetch?.charging && <progress aria-label="Throw height" value={snapshot.fetch.charge} max={1}/>}</p>}{recallHint && <p className="legacy-recall-help" role="status">{recallHint}</p>}</div>}
    <div className="legacy-controls">
      <div className="legacy-dpad" role="group" aria-label="Walk controls">
        {[{ text: '↑', label: 'Walk forward', x: 0, z: -1, area: 'up' }, { text: '←', label: 'Walk left', x: -1, z: 0, area: 'left' }, { text: '↓', label: 'Walk backward', x: 0, z: 1, area: 'down' }, { text: '→', label: 'Walk right', x: 1, z: 0, area: 'right' }].map(b => <button key={b.area} style={{ gridArea: b.area }} aria-label={b.label} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); motion.current.stick = { x: b.x, z: b.z }; }} onPointerUp={() => { motion.current.stick = { x: 0, z: 0 }; }} onPointerCancel={() => { motion.current.stick = { x: 0, z: 0 }; }} onLostPointerCapture={() => { motion.current.stick = { x: 0, z: 0 }; }}>{b.text}</button>)}
      </div>
      <p className="legacy-keyboard"><kbd>W A S D</kbd> walk <span>·</span> <kbd>Shift</kbd> jog <span>·</span> <kbd>F</kbd> interact<br/>{playing ? 'Hold and release on the ground to throw.' : 'Click the ground to walk.'} <kbd>Q / E</kbd> turn the camera.</p>
      <div className="legacy-interaction">{nearest ? <button className="legacy-primary" onClick={openInteraction}><span className="legacy-key-hint">F</span>{nearest.id === 'run' ? prepared ? 'Visit the prepared run' : 'Prepare the first run' : nearest.id === 'ledger' ? "Open Grandpa's ledger" : nearest.id === 'gate' ? 'At the front gate' : `Explore ${nearest.name.toLowerCase()}`}<span aria-hidden="true">→</span></button> : <span>Walk closer to explore</span>}</div>
    </div>
    <span className="legacy-preview-label">Homecoming · {save.status}</span>
    {save.error && <aside className="legacy-save-error" role="alert">{save.error}<div><button onClick={save.retrySave}>Retry save</button><button onClick={save.backup}>Download backup</button></div></aside>}
    <dialog ref={dialog} className={`legacy-dialog ${panel === 'arrival' ? 'legacy-arrival' : ''}`} aria-labelledby="legacy-panel-title" onCancel={e => { e.preventDefault(); if (panel === 'arrival') updateJourney(j => ({ ...j, introSeen: true })); setPanel(null); }}>
      {panel !== 'arrival' && <button className="legacy-close" aria-label="Close panel" onClick={() => setPanel(null)}>×</button>}
      {panel === 'arrival' && <HomecomingStory ready={ready} onFinish={() => { save.update(j => ({ ...j, introSeen: true })); setPanel(null); }}/>}
      {panel === 'welcome' && <><span className="legacy-eyebrow">The founding companion</span><h2 id="legacy-panel-title">Welcome home, {dogName}.</h2><p>Your kennel has its first dog. This is the companion who will help you discover what {kennelName} can become.</p><p>For today, keep things simple. Show them their bed, walk together, and learn to call them back to you.</p><button className="legacy-primary" onClick={() => walkTo('run')}>Show them their new home</button></>}
      {panel === 'reset' && <><span className="legacy-eyebrow">Homecoming test save</span><h2 id="legacy-panel-title">Start a new beginning?</h2><p>This resets the Homecoming story, kennel name and adopted dog on this browser. Your original game is separate.</p><button className="legacy-secondary" onClick={save.backup}>Download this journey first</button><button className="legacy-primary" onClick={reset}>Reset Homecoming</button><button className="legacy-secondary" onClick={() => setPanel('tools')}>Keep this journey</button></>}
      {panel === 'ledger' && <><span className="legacy-eyebrow">From Grandpa’s workbench</span><h2 id="legacy-panel-title">Every name has a story.</h2><p>The pages hold years of pairings, training notes, and competition results. Beside each champion are the dogs who came before them.</p><blockquote>“Start by knowing the dog in front of you.”</blockquote><p>There’s space at the back for a new kennel name. Your first entry can begin with a rescue.</p>{!readLedger ? <button className="legacy-primary" onClick={() => { setReadLedger(true); setPanel(null); }}>Keep the ledger. Prepare a home.</button> : prepared ? <form onSubmit={e => { e.preventDefault(); saveName(); }}><label htmlFor="legacy-name">Your kennel’s new name</label><input id="legacy-name" value={draftName} maxLength={36} onChange={e => setDraftName(e.target.value)} placeholder="Give your legacy a name" autoComplete="off"/>{error && <p role="alert">{error}</p>}<button className="legacy-primary" type="submit">Write the first page</button></form> : <><p className="legacy-note">First, make the run beside the door ready for a dog.</p><button className="legacy-primary" onClick={() => walkTo('run')}>Walk to the first run</button></>}</>}
      {panel === 'run' && journey.dog && journey.settled && <CarePanel journey={journey} busy={careBusy} onCare={startCare} onParcel={() => updateJourney(j => j.routine.meals === 0 ? { ...j, routine: { ...j.routine, meals: 1 } } : j)} onBack={() => setPanel(null)}/>}
      {panel === 'run' && (!journey.dog || !journey.settled) && <><span className="legacy-eyebrow">One place to call home</span><h2 id="legacy-panel-title">{journey.dog ? `${dogName}'s first home.` : prepared ? 'Ready for someone new.' : 'A small beginning.'}</h2><p>{journey.dog ? `${dogName} follows you to the clean bed. Keep this first afternoon gentle: a familiar voice, a safe place, and time to explore.` : prepared ? 'A clean bed, two bowls, and enough food to start. The rest of the kennel can wait.' : 'The old bed needs a fresh blanket. There are clean bowls and a little food left in the cupboard.'}</p>{!prepared ? <button className="legacy-primary" onClick={() => { setPrepared(true); setPanel(null); }}>Lay out the blanket and bowls</button> : journey.dog && !journey.settled ? <button className="legacy-primary" onClick={() => { save.update(j => ({ ...j, settled: true })); setPanel(null); }}>Let them settle in</button> : <><p className="legacy-note">{journey.dog ? 'Next, learn to call your dog back to you at the training grounds. You can walk together around the courtyard at any time.' : 'Your first companion will have a place here.'}</p><button className="legacy-primary" onClick={() => setPanel(null)}>Back to the courtyard</button></>}</>}
      {panel === 'nursery' && <><span className="legacy-eyebrow">A future generation</span><h2 id="legacy-panel-title">The smallest pawprints.</h2><p>Faded names run along the nursery door. Some belong to the champions in Grandpa’s ledger.</p><p>One day, you’ll choose pairings, raise a litter here, and discover which puppies will carry your kennel forward.</p><div className="legacy-note">Breeding belongs later in your journey. This first preview establishes its place in your home.</div><button className="legacy-primary" onClick={() => setPanel(null)}>Back to the courtyard</button></>}
      {panel === 'field' && !journey.firstRecall && <><span className="legacy-eyebrow">The first thing to learn</span><h2 id="legacy-panel-title">{journey.dog ? 'Come back to me.' : 'Room to learn together.'}</h2>{journey.dog ? <><p>A reliable recall starts with a quiet place and a short distance. Today, you and {dogName} are learning how to work together.</p><div className="legacy-note">Ask your dog to <strong>Wait here</strong>. Walk a few steps away (at least three meters), then use <strong>Call {dogName}</strong>. Stay still while your dog comes back.</div><p>{journey.firstRecall ? 'Your first recall is recorded. You can keep practicing and exploring together. The full training and competition journey is the next part of this rebuild.' : !journey.settled ? 'First, help your dog settle into the prepared run. Then come back for this lesson.' : 'This first success builds trust. Later exercises will develop commands, handling and individual strengths.'}</p><button className="legacy-primary" disabled={!journey.settled} onClick={() => { motion.current.wait = true; motion.current.dogRoute = []; setWaiting(true); setPanel(null); setRecallHint('Your dog is waiting. Walk a few steps away, then call them back.'); }}>Try a short recall</button></> : <><p>The equipment has seen better days. First, bring home a rescue companion. This is where you will learn to train together.</p><button className="legacy-primary" onClick={() => setPanel(null)}>Back to the courtyard</button></>}</>}
      {panel === 'field' && journey.firstRecall && <><span className="legacy-eyebrow">Foundation lesson / Focus walk</span><h2 id="legacy-panel-title">Stay with me.</h2><p>Lead {dogName} through the meadow. Choose a route around scent patches, adjust your pace, and reward moments of attention. Your dog does the following; you do the handling.</p><div className="legacy-note">Learned focus: {journey.routine.focus} / 100. Keeper experience: {journey.routine.keeperXp}. Completed lessons: {journey.routine.sessions}.{journey.routine.sessions > 0 && <> Last quality: {journey.routine.lastQuality} / 100.</>}</div><p>{trainingBlocked(journey) || 'A completed lesson uses 18 energy, 8 food and 12 water. Good handling improves what you both learn. Leaving early records no lesson.'}</p><button className="legacy-primary" disabled={!!trainingBlocked(journey) || careBusy} onClick={() => { endFetch(); setPanel(null); setTraining(true); setCareMessage(''); }}>Enter the training meadow</button>{trainingBlocked(journey) && <button className="legacy-secondary" onClick={() => walkTo('run')}>Back to the dog run</button>}<button className="legacy-secondary" onClick={() => setPanel(null)}>Back to the courtyard</button></>}
      {panel === 'gate' && !journey.settled && !journey.routine.sessions && <><span className="legacy-eyebrow">The road ahead</span><h2 id="legacy-panel-title">{journey.dog ? 'Your first partner is home.' : canAdopt(journey) ? 'A home needs a dog.' : 'Before you head out.'}</h2><p>{journey.dog ? `You and ${dogName} have a new beginning. Your first run is full now; build this partnership before growing the kennel.` : canAdopt(journey) ? `${kennelName} has its first place ready. The shelter team is waiting to introduce you to three dogs looking for a home.` : "Find Grandpa's ledger, prepare the first run, and choose your kennel's name before visiting the rescue."}</p>{canAdopt(journey) && <button className="legacy-primary" onClick={() => { setPanel(null); setVisitingShelter(true); }}>Visit Larchwood Rescue</button>}<button className="legacy-secondary" onClick={() => setPanel(null)}>Keep exploring</button></>}
      {panel === 'gate' && journey.settled && <><span className="legacy-eyebrow">Beyond the kennel / Neighborhood requests</span><h2 id="legacy-panel-title">A good dog opens doors.</h2><p>Grandpa built this kennel's reputation by helping people. Your first partner can start doing the same.</p><div className="legacy-work-list">{JOBS.map(job => {
        const completed = workRecord(journey).completed.includes(job.id), blocked = jobBlocked(journey, job.id);
        return <section key={job.id}><span className="legacy-eyebrow">{job.person}{completed ? ' / Completed' : ' / Needs a hand'}</span><h3>{job.title}</h3><p>{job.story}</p><small>{blocked || (completed ? 'Replay for fun. No repeat payout or care cost.' : 'First completion: 2 meals, 8 keeper experience, 10 search experience, 4 bond. Uses 15 energy, 12 water and 8 food.')}</small><button className="legacy-primary" disabled={!!blocked || careBusy} onClick={() => { endFetch(); setPanel(null); setOuting(job.id); }}>{completed ? 'Revisit the trail' : `Help ${job.person}`}</button></section>;
      })}</div><p className="legacy-note">{workRecord(journey).completed.length} of 3 requests completed. Search experience: {workRecord(journey).searchXp}. This is the beginning of useful work, not the competition circuit.</p>{journey.routine.sessions > 0 && !journey.routine.invitationRead && <><p>The club also sent a newcomers' invitation after your focus lesson. The actual meet is still being built.</p><button className="legacy-secondary" onClick={() => updateJourney(j => ({ ...j, routine: { ...j.routine, invitationRead: true } }))}>Keep the club invitation</button></>}<button className="legacy-secondary" onClick={() => setPanel(null)}>Back to the courtyard</button></>}
      {panel === 'journal' && <><span className="legacy-eyebrow">Your first afternoon</span><h2 id="legacy-panel-title">A legacy, one day at a time.</h2><p>{objectiveText}</p><div className="legacy-journal-list">{PLACES.map(p => <button key={p.id} onClick={() => walkTo(p.id)}><span>{p.name}</span><span aria-hidden="true">↗</span></button>)}</div>{journey.dog && <section className="legacy-dog-record"><h3>{dogName} / Founding rescue</h3><p>{rescue?.description}</p><p>{journey.firstRecall ? 'First recall learned together.' : 'A new partnership, with much still to discover.'} Bond: {journey.dog.bond} / 100.</p>{journey.dog.observations.map(kind => <p key={kind}>{rescue?.observations[kind]}</p>)}<small>Learned focus: {journey.routine.focus}/100. Keeper experience: {journey.routine.keeperXp}. Full potential is still undiscovered. These are observations from your first meeting, not a complete assessment.</small></section>}<p className="legacy-note">Know your dogs. Develop their strengths. Build your team. Raise the next generation.</p><button className="legacy-secondary" onClick={() => setPanel('arrival')}>Revisit Grandpa’s story</button></>}
      {panel === 'pause' && <><span className="legacy-eyebrow">Take your time</span><h2 id="legacy-panel-title">The kennel will wait.</h2><button className="legacy-primary" onClick={() => setPanel(null)}>Continue exploring</button><button className="legacy-secondary" onClick={() => setPanel('tools')}>Open test tools</button><a className="legacy-back" href="/">Return to the current game</a></>}
      {panel === 'tools' && <><span className="legacy-eyebrow">Environment testing only</span><h2 id="legacy-panel-title">Try the feel of the place.</h2><p>These controls affect this preview only. Your existing kennel save is separate.</p><label className="legacy-toggle"><input type="checkbox" disabled={!!journey.dog} checked={companion} onChange={e => toggleCompanion(e.target.checked)}/>Add Scout, a test companion</label><label className="legacy-toggle"><input type="checkbox" checked={restored} onChange={e => setRestored(e.target.checked)}/>Preview restored finishes</label><label htmlFor="legacy-dog-build">Test companion build</label><select id="legacy-dog-build" disabled={!!journey.dog} value={rescue?.build ?? dogBuild} onChange={e => setDogBuild(e.target.value as 'companion' | 'stocky')}><option value="companion">Athletic companion</option><option value="stocky">Stocky companion</option></select><p className="legacy-note">These are temporary visual scenarios. The full level, stats, genetics, and story editor will be built alongside those systems.</p><button className="legacy-primary" onClick={() => setPanel(null)}>Return to the property</button><button className="legacy-secondary" onClick={() => setPanel('reset')}>Restart this preview</button><a className="legacy-back" href="/">Return to the current game</a></>}
    </dialog>
  </main>;
}
