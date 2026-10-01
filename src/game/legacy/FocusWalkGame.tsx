import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import CharacterModel from './CharacterModel';
import { Ground, Timber } from './PropertyScenery';
import { createFocusWalk, cueFocus, DISTRACTIONS, focusQuality, gap, praiseFocus, stepFocusWalk, WALK_MARKERS, type FocusWalk } from './focusWalk';
import { RESCUES, type Journey } from './journey';
import { trainingGain } from './routine';
import './focusWalk.css';

function Meadow({ simulation, controls, paused, journey, publish }: { simulation: FocusWalk; controls: { keys: Set<string>; x: number; z: number }; paused: boolean; journey: Journey; publish: (state: FocusWalk) => void }) {
  const keeper = useRef<Group>(null), dog = useRef<Group>(null), time = useRef(0), started = useRef(false);
  const [poses, setPoses] = useState({ keeper: false, dog: false, sniff: false });
  const rescue = RESCUES.find(r => r.id === journey.dog!.rescueId)!;
  useFrame(({ camera }, dt) => {
    const s = simulation, previousDog = { ...s.dog }, previousKeeper = { ...s.keeper };
    if (!paused) stepFocusWalk(s, dt, { x: Number(controls.keys.has('KeyD') || controls.keys.has('ArrowRight')) - Number(controls.keys.has('KeyA') || controls.keys.has('ArrowLeft')) + controls.x, z: Number(controls.keys.has('KeyS') || controls.keys.has('ArrowDown')) - Number(controls.keys.has('KeyW') || controls.keys.has('ArrowUp')) + controls.z });
    for (const [ref, point, before] of [[keeper, s.keeper, previousKeeper], [dog, s.dog, previousDog]] as const) {
      if (!ref.current) continue;
      ref.current.position.set(point.x, .04, point.z);
      if (gap(point, before) > .001) { const angle = Math.atan2(point.x - before.x, point.z - before.z); ref.current.rotation.y += Math.atan2(Math.sin(angle - ref.current.rotation.y), Math.cos(angle - ref.current.rotation.y)) * Math.min(1, dt * 12); }
    }
    const desired = new Vector3(s.keeper.x, 5.1, s.keeper.z + 8.8);
    if (!started.current) { camera.position.copy(desired); started.current = true; }
    camera.position.lerp(desired, 1 - Math.exp(-5 * dt)); camera.lookAt(s.keeper.x, .5, s.keeper.z - 1.5);
    time.current += dt;
    if (time.current > .1) { time.current = 0; publish({ ...s }); setPoses({ keeper: s.keeperMoving, dog: s.dogMoving, sniff: !!s.distraction }); }
  });
  function direct(e: ThreeEvent<MouseEvent>) { if (paused || e.delta > 5) return; e.stopPropagation(); simulation.target = { x: Math.max(-7.5, Math.min(7.5, e.point.x)), z: Math.max(-7.5, Math.min(7.5, e.point.z)) }; }
  return <>
    <color attach="background" args={['#c9dee9']}/><fog attach="fog" args={['#c9dee9', 30, 65]}/><hemisphereLight args={['#e9f3ff', '#87996d', 1.8]}/>
    <directionalLight position={[-9, 16, 10]} intensity={2} color="#fff0d5" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-normalBias={.04}/>
    <Ground at={[0, -.01, 0]} width={90} depth={90}/><Ground at={[0, 0, 0]} width={18} depth={18}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]} onClick={direct}><planeGeometry args={[18, 18]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {[-9, 9].map(x => <group key={x}>{[-8, -4, 0, 4, 8].map(z => <Timber key={z} at={[x, .65, z]} size={[.15, 1.3, .15]}/>)}<Timber at={[x, .85, 0]} size={[.1, .12, 18]}/><Timber at={[x, .4, 0]} size={[.1, .12, 18]}/></group>)}
    {[-9, 9].map(z => <group key={z}><Timber at={[0, .85, z]} size={[18, .12, .1]}/><Timber at={[0, .4, z]} size={[18, .12, .1]}/></group>)}
    {WALK_MARKERS.map((p, i) => <group key={i} position={[p.x, .06, p.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.8, .88, 48]}/><meshBasicMaterial color={i < simulation.marker ? '#89b9b1' : i === simulation.marker ? '#ffe1a0' : '#ced5c4'} transparent opacity={i === simulation.marker ? 1 : .45}/></mesh>
      {[-1.1, 1.1].map(x => <mesh key={x} position={[x, .2, 0]} castShadow><coneGeometry args={[.14, .4, 12]}/><meshStandardMaterial color={i === simulation.marker ? '#d8a465' : '#aebeb8'}/></mesh>)}
      {i === simulation.marker && <mesh position={[0, 1.65, 0]}><octahedronGeometry args={[.17]}/><meshBasicMaterial color="#ffe1a0"/></mesh>}
    </group>)}
    {DISTRACTIONS.map((p, i) => <group key={i} position={[p.x, .08, p.z]}><mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.65, 24]}/><meshStandardMaterial color="#7d885e"/></mesh>{[0, 1, 2].map(n => <mesh key={n} position={[Math.cos(n * 2) * .28, .13, Math.sin(n * 2) * .28]} castShadow><sphereGeometry args={[.2, 12, 8]}/><meshStandardMaterial color={i % 2 ? '#9c7d63' : '#c0b88b'}/></mesh>)}</group>)}
    {[-16, -12, 12, 16].map((x, i) => <group key={x} position={[x, 0, -12 - i % 2 * 4]}><Timber at={[0, 2, 0]} size={[.5, 4, .5]}/><mesh position={[0, 4, 0]} castShadow><sphereGeometry args={[2.5, 18, 12]}/><meshStandardMaterial color="#657d67"/></mesh></group>)}
    <group ref={keeper}><CharacterModel kind="keeper" pose={poses.keeper ? 'Walk' : 'Idle'} paused={paused}/></group><group ref={dog}><CharacterModel kind={rescue.build} collar={rescue.collar} pose={poses.dog ? 'Walk' : poses.sniff ? 'Sniff' : 'Idle'} paused={paused}/></group>
  </>;
}

export default function FocusWalkGame({ journey, onBack, onComplete }: { journey: Journey; onBack: () => void; onComplete: (quality: number) => void }) {
  const simulation = useRef(createFocusWalk(journey.dog!.aptitude.focus, journey.routine.focus, journey.routine.keeperXp));
  const controls = useRef({ keys: new Set<string>(), x: 0, z: 0 });
  const [view, setView] = useState<FocusWalk>({ ...simulation.current }), [panel, setPanel] = useState<'intro' | 'pause' | null>('intro'), [message, setMessage] = useState('');
  const submitted = useRef(false), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, [panel, view.completed]);
  const paused = !!panel || view.completed;
  useEffect(() => {
    const c = controls.current;
    const stop = () => { c.keys.clear(); c.x = 0; c.z = 0; simulation.current.target = null; };
    const blur = () => { stop(); setPanel(p => p ?? 'pause'); };
    const hide = () => { if (document.hidden) blur(); };
    const down = (e: KeyboardEvent) => { if (e.code === 'Escape') { e.preventDefault(); setPanel(p => p === 'pause' ? null : 'pause'); return; } if (paused) return; if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); c.keys.add(e.code); } };
    const up = (e: KeyboardEvent) => c.keys.delete(e.code);
    if (paused) stop();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hide); };
  }, [paused]);
  const target = WALK_MARKERS[Math.min(view.marker, WALK_MARKERS.length - 1)], bearing = Math.atan2(target.x - view.keeper.x, -(target.z - view.keeper.z)) * 180 / Math.PI;
  const behavior = view.distraction ? 'An interesting smell caught their attention. Slow down or call them back.' : gap(view.dog, view.keeper) > 2.3 ? 'Your dog is falling behind. Ease your pace and give them room to catch up.' : 'Together. This is a good moment to praise your dog.';
  return <main className="focus-game" data-marker={view.marker} data-complete={view.completed} data-keeper-x={view.keeper.x.toFixed(2)} data-keeper-z={view.keeper.z.toFixed(2)}>
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5.1, 15.8], fov: 50 }}><Suspense fallback={null}><Meadow simulation={simulation.current} controls={controls.current} paused={paused} journey={journey} publish={setView}/></Suspense></Canvas>
    <header className="focus-header"><div><span className="legacy-eyebrow">Learning together / Foundation lesson</span><h1>A walk with {journey.dog!.name}</h1><p>Reach each gold marker together. Choose your route around the scent patches.</p></div><button onClick={() => setPanel('pause')}>Pause / leave</button></header>
    <section className="focus-feedback" aria-label="Training guidance"><strong><span style={{ display: 'inline-block', transform: `rotate(${bearing}deg)` }} aria-hidden="true">↑</span> Marker {Math.min(view.marker + 1, 5)} of 5 · {Math.round(gap(view.keeper, target))} m</strong><p>{behavior}</p>{message && <small role="status">{message}</small>}</section>
    <div className="focus-controls"><div className="focus-pad" role="group" aria-label="Walk controls">{[{ name: 'Walk forward', text: '↑', x: 0, z: -1 }, { name: 'Walk left', text: '←', x: -1, z: 0 }, { name: 'Walk backward', text: '↓', x: 0, z: 1 }, { name: 'Walk right', text: '→', x: 1, z: 0 }].map(b => <button key={b.name} aria-label={b.name} onPointerDown={e => { if (paused) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controls.current.x = b.x; controls.current.z = b.z; }} onPointerUp={() => { controls.current.x = controls.current.z = 0; }} onLostPointerCapture={() => { controls.current.x = controls.current.z = 0; }}>{b.text}</button>)}</div>
      <div className="focus-actions"><div className="focus-paces">{(['easy', 'brisk'] as const).map(pace => <button key={pace} aria-pressed={view.pace === pace} onClick={() => { simulation.current.pace = pace; }}>{pace === 'easy' ? 'Easy walk' : 'Brisk walk'}</button>)}</div><button disabled={paused || view.cueCooldown > 0} onClick={() => { if (cueFocus(simulation.current)) setMessage('A clear invitation. Give your dog a moment to respond.'); }}>Call close{view.cueCooldown > 0 ? ` (${Math.ceil(view.cueCooldown)})` : ''}</button><button disabled={paused || view.praised === view.marker || !!view.distraction || gap(view.keeper, view.dog) > 2.3} onClick={() => { if (praiseFocus(simulation.current)) setMessage('Good timing. You rewarded staying together.'); }}>Praise</button></div>
    </div><span className="focus-help">WASD / arrows to walk · Or tap the meadow · Escape to pause</span>
    {(panel || view.completed) && <dialog ref={dialog} className="focus-overlay" aria-labelledby="focus-title" onCancel={e => { e.preventDefault(); setPanel('pause'); }}><section>
      <span className="legacy-eyebrow">{view.completed ? 'A lesson worth remembering' : 'Foundation / Focus walk'}</span><h2 id="focus-title">{view.completed ? 'Better together.' : panel === 'intro' ? 'Lead the way. Keep the connection.' : 'Take a breath.'}</h2>
      {view.completed ? <><p>You stayed close for {Math.round(100 * view.together / Math.max(1, view.active))}% of the lesson. Well-timed praise: {view.praise}. Calls for help: {view.cues}.</p><p className="focus-result">Lesson quality {focusQuality(view)} / 100<br/>Focus +{Math.min(100 - journey.routine.focus, trainingGain(focusQuality(view)))} · Keeper experience +{5 + Math.round(focusQuality(view) / 20)}</p><p>Better focus helps your dog resist distractions. You will use that partnership in later activities and competitions.</p><button className="legacy-primary" onClick={() => { if (submitted.current) return; submitted.current = true; onComplete(focusQuality(view)); }}>Keep the lesson and return home</button></> : <><p>Walk through five markers with your dog close by. Scent patches can draw them away. Choose a wider path, ease your pace, or call them back before carrying on.</p><p>Praise while your dog is beside you. There is no countdown. How you handle the walk affects what you both learn.</p><button className="legacy-primary" onClick={() => setPanel(null)}>{panel === 'intro' ? 'Start our walk' : 'Continue the lesson'}</button><button className="focus-leave" onClick={onBack}>Back to the kennel · leave this lesson</button><small>Only a completed lesson uses energy and records training.</small></>}
    </section></dialog>}
  </main>;
}
