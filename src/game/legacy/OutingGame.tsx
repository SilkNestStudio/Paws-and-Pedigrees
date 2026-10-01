import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Mesh, Object3D, Vector3 } from 'three';
import { YardDog, YardKeeper } from '../playyard/Characters';
import { newPlay } from '../playyard/play';
import { RESCUES, type Journey } from './journey';
import { apart, collectBag, createOuting, JOBS, outingQuality, searchTarget, sendSearch, START, stepOuting, whistle, workRecord, type JobId, type Outing } from './outings';
import OutingScenery from './OutingScenery';
import './outing.css';

interface Controls { keys: Set<string>; x: number; z: number; yaw: number; map: boolean }
function TrailWorld({ state: s, controls: c, paused, journey, publish }: { state: Outing; controls: Controls; paused: boolean; journey: Journey; publish: (s: Outing) => void }) {
  const tick = useRef(0), cameraReady = useRef(false), visuals = useRef(newPlay()), scent = useRef<InstancedMesh>(null), dummy = useRef(new Object3D()), bag = useRef<Group>(null), glow = useRef<Mesh>(null);
  const rescue = RESCUES.find(r => r.id === journey.dog!.rescueId)!;
  const job = JOBS.find(j => j.id === s.id)!;
  useFrame(({ camera, size }, dt) => {
    if (!paused) {
      if (c.keys.has('KeyQ')) c.yaw += dt; if (c.keys.has('KeyE')) c.yaw -= dt;
      const x = Number(c.keys.has('KeyD') || c.keys.has('ArrowRight')) - Number(c.keys.has('KeyA') || c.keys.has('ArrowLeft')) + c.x;
      const z = Number(c.keys.has('KeyS') || c.keys.has('ArrowDown')) - Number(c.keys.has('KeyW') || c.keys.has('ArrowUp')) + c.z;
      stepOuting(s, dt, { x: x * Math.cos(c.yaw) + z * Math.sin(c.yaw), z: -x * Math.sin(c.yaw) + z * Math.cos(c.yaw) });
    }
    const v = visuals.current; v.keeper = s.keeper; v.dog = s.dog; v.time = s.time; v.keeperMoving = s.keeperMoving; v.dogMoving = s.dogMoving; v.keeperAngle = s.keeperAngle; v.dogAngle = s.dogAngle; v.recalled = !s.detecting; v.phase = s.dogMoving ? 'chase' : 'ready'; v.personality = rescue.build === 'stocky' ? 'june' : 'pip';
    const distance = size.width < size.height ? 13 : 11;
    const focus = new Vector3(s.keeper.x, .7, s.keeper.z - 1);
    const desired = new Vector3(focus.x + Math.sin(c.yaw) * distance, 7.5, focus.z + Math.cos(c.yaw) * distance);
    if (!cameraReady.current) { camera.position.copy(desired); cameraReady.current = true; }
    camera.position.lerp(desired, 1 - Math.exp(-5 * dt)); camera.lookAt(focus);
    const target = searchTarget(s);
    if (scent.current) {
      scent.current.visible = s.detecting && !s.found && s.distraction <= 0;
      for (let i = 0; i < 18; i++) {
        const t = ((i / 18 + s.time * .15) % 1);
        dummy.current.position.set(s.dog.x + (target.x - s.dog.x) * t, .28 + Math.sin(t * Math.PI) * .5, s.dog.z + (target.z - s.dog.z) * t);
        dummy.current.scale.setScalar(.035 + Math.sin(t * Math.PI) * .04); dummy.current.updateMatrix(); scent.current.setMatrixAt(i, dummy.current.matrix);
      }
      scent.current.instanceMatrix.needsUpdate = true;
    }
    if (bag.current) {
      bag.current.visible = s.found || apart(s.keeper, job.bag) < 5;
      bag.current.position.set(s.carrying ? s.dog.x + Math.sin(s.dogAngle) * .7 : job.bag.x, s.carrying ? .65 : .2, s.carrying ? s.dog.z + Math.cos(s.dogAngle) * .7 : job.bag.z);
      bag.current.rotation.y = s.carrying ? s.dogAngle : -.5;
    }
    if (glow.current) { glow.current.visible = s.carrying; glow.current.scale.setScalar(1 + Math.sin(s.time * 2) * .05); }
    tick.current += dt; if (tick.current > .1) { tick.current = 0; publish({ ...s }); }
  });
  return <>
    <OutingScenery/>
    <mesh position={[0, .045, -5]} rotation={[-Math.PI / 2, 0, 0]} onClick={e => { if (paused || e.delta > 6) return; e.stopPropagation(); sendSearch(s, { x: e.point.x, z: e.point.z }); }}><planeGeometry args={[38, 46]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {job.clues.map((p, i) => <group key={i} position={[p.x, .09, p.z]}>
      <mesh rotation={[-Math.PI / 2, 0, .4]}><planeGeometry args={[i === 0 ? .6 : .3, i === 0 ? .14 : .4]}/><meshToonMaterial color={i === 0 ? '#759fc0' : '#e8d6aa'}/></mesh>
      {s.clues > i && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .01, 0]}><ringGeometry args={[.35, .39, 24]}/><meshBasicMaterial color="#d8ce98"/></mesh>}
    </group>)}
    <group ref={bag}><mesh castShadow><boxGeometry args={[.52, .38, .19]}/><meshToonMaterial color={job.color}/></mesh><mesh position={[0, .1, .11]}><boxGeometry args={[.42, .13, .025]}/><meshToonMaterial color="#e1c390"/></mesh><mesh position={[0, .26, 0]}><torusGeometry args={[.13, .025, 6, 14]}/><meshToonMaterial color="#644e40"/></mesh></group>
    <instancedMesh ref={scent} args={[undefined, undefined, 18]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]}/><meshBasicMaterial color="#f8d69b" transparent opacity={.8}/></instancedMesh>
    <mesh ref={glow} position={[START.x, .07, START.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.7, 1.8, 48]}/><meshBasicMaterial color="#ffe2ad"/></mesh>
    <group position={[3, 0, 14]} rotation={[0, -1.2, 0]}><Neighbor/></group>
    <YardKeeper state={visuals.current} paused={paused}/><YardDog state={visuals.current} paused={paused} collar={rescue.collar} build={rescue.build}/>
  </>;
}
function Neighbor() {
  const s = useRef(newPlay()); s.current.keeper = { x: 0, z: 0 }; s.current.keeperAngle = 0;
  return <YardKeeper state={s.current} paused/>;
}
function TrailMap({ state: s }: { state: Outing }) {
  const x = (n: number) => n + 21, z = (n: number) => n + 30;
  return <aside className="outing-map" aria-label="Trail map"><strong>The orchard loop</strong><svg viewBox="0 0 42 52" role="img" aria-label="Orchard and bridge west, lookout and stepping stones east. Trailhead is south.">
    <rect x="0" y="0" width="42" height="52" rx="3" fill="#dfd5b7"/><path d="M0 26H42" stroke="#88b1b8" strokeWidth="4"/>
    <path d="M21 45V39H9V21H33V39H21M9 21V7M33 21V7" fill="none" stroke="#c0a982" strokeWidth="2"/>
    <path d="M9 23V29M33 23V29" stroke="#7e654f" strokeWidth="2"/>
    <text x="2" y="36">Orchard</text><text x="27" y="17">Lookout</text><text x="12" y="49">Trailhead</text><text x="2" y="5">Picnic clearing</text>
    <circle cx={x(s.keeper.x)} cy={z(s.keeper.z)} r="1" fill="#684961"/><circle cx={x(s.dog.x)} cy={z(s.dog.z)} r=".7" fill="#bf794e"/>
  </svg><small>You are purple. Your dog is amber. Hidden items are not marked.</small></aside>;
}
export default function OutingGame({ journey, id, onBack, onComplete }: { journey: Journey; id: JobId; onBack: () => void; onComplete: (quality: number) => void }) {
  const simulation = useRef(createOuting(journey, id)), controls = useRef<Controls>({ keys: new Set(), x: 0, z: 0, yaw: 0, map: false });
  const [view, setView] = useState({ ...simulation.current }), [panel, setPanel] = useState<'intro' | 'pause' | null>('intro'), [map, setMap] = useState(false), [stick, setStick] = useState({ x: 0, z: 0 });
  const dialog = useRef<HTMLDialogElement>(null), submitted = useRef(false);
  const job = JOBS.find(j => j.id === id)!, repeat = workRecord(journey).completed.includes(id), paused = !!panel || view.complete;
  useEffect(() => { if (paused) dialog.current?.showModal(); else dialog.current?.close(); }, [paused]);
  useEffect(() => {
    const c = controls.current;
    const stop = () => { c.keys.clear(); c.x = c.z = 0; };
    const blur = () => { stop(); setPanel(p => p ?? 'pause'); };
    const hidden = () => { if (document.hidden) blur(); };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); if (!view.complete) setPanel(p => p ? null : 'pause'); return; }
      if (paused || e.target instanceof HTMLElement && e.target.closest('input,textarea,select')) return;
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE'].includes(e.code)) { e.preventDefault(); c.keys.add(e.code); }
      if (e.repeat) return;
      if (e.code === 'KeyR') whistle(simulation.current);
      if (e.code === 'KeyF') collectBag(simulation.current);
      if (e.code === 'KeyC') simulation.current.listening = !simulation.current.listening;
      if (e.code === 'KeyM') setMap(m => !m);
    };
    const up = (e: KeyboardEvent) => c.keys.delete(e.code);
    if (paused) stop();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); };
  }, [paused, view.complete]);
  function joystick(e: React.PointerEvent<HTMLDivElement>) {
    if (paused) return; const b = e.currentTarget.getBoundingClientRect(), x = (e.clientX - b.x - b.width / 2) / 38, z = (e.clientY - b.y - b.height / 2) / 38, n = Math.max(1, Math.hypot(x, z));
    controls.current.x = x / n; controls.current.z = z / n; setStick({ x: x / n, z: z / n });
  }
  const task = view.carrying ? 'Return to the trailhead' : view.found ? 'Bring your partner’s find home' : view.clues === 0 ? id === 'ellis' ? 'Search the eastern path' : 'Search the orchard to the west' : view.clues === 1 ? id === 'ellis' ? 'Cross the stepping stones' : 'Cross the wooden bridge' : id === 'mara' ? 'Search the picnic clearing' : 'Search the eastern lookout';
  return <main className="outing-game" data-clues={view.clues} data-found={view.found} data-carrying={view.carrying} data-complete={view.complete} data-x={view.keeper.x.toFixed(2)} data-z={view.keeper.z.toFixed(2)} data-dog-x={view.dog.x.toFixed(2)} data-dog-z={view.dog.z.toFixed(2)}>
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 48, near: .1, far: 120 }}><Suspense fallback={null}><TrailWorld state={simulation.current} controls={controls.current} paused={paused} journey={journey} publish={setView}/></Suspense></Canvas>
    <header className="outing-header"><div><span>A NEIGHBORHOOD REQUEST</span><h1>{job.title}</h1><p>{task}</p></div><button onClick={() => setPanel('pause')}>Pause / leave</button></header>
    <div className="outing-tools"><button onClick={() => setMap(m => !m)} aria-pressed={map}>Trail map <small>M</small></button><button aria-label="Turn view left" onClick={() => { controls.current.yaw += .6; }}>↶</button><button aria-label="Turn view right" onClick={() => { controls.current.yaw -= .6; }}>↷</button></div>
    {map && <TrailMap state={view}/>}
    <section className="outing-feedback" aria-label="Dog observations"><div><strong>{journey.dog!.name}</strong><span>{view.carrying ? 'Carrying the find' : view.distraction > 0 ? 'Distracted by a rabbit' : view.sniff > 0 ? 'Checking a scent…' : view.detecting ? 'On a scent — follow your dog' : 'Searching with you'}</span></div><div className="outing-scent" aria-label="Scent strength"><i style={{ width: `${view.signal * 100}%` }}/></div><p>{view.message}</p></section>
    <footer className="outing-controls"><div className="outing-stick" role="group" aria-label="Move keeper" onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); joystick(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) joystick(e); }} onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)} onLostPointerCapture={() => { controls.current.x = controls.current.z = 0; setStick({ x: 0, z: 0 }); }}><i style={{ transform: `translate(${paused ? 0 : stick.x * 27}px,${paused ? 0 : stick.z * 27}px)` }}/></div>
      <p className="outing-keyboard">WASD to walk · Q/E turn<br/>Click nearby ground to send your dog searching.</p>
      <div className="outing-actions"><button aria-pressed={view.listening} onClick={() => { simulation.current.listening = !simulation.current.listening; }}>{view.listening ? 'Nose down · careful pace' : 'Jogging · weaker scent'} <small>C</small></button><button onClick={() => whistle(simulation.current)}>Whistle <small>R</small></button>{view.found && !view.carrying && <button className="outing-primary" disabled={apart(view.keeper, view.dog) > 3} onClick={() => collectBag(simulation.current)}>Bring it <small>F</small></button>}</div>
    </footer>
    <dialog ref={dialog} className="outing-dialog" onCancel={e => { e.preventDefault(); if (!view.complete) setPanel(null); }}>
      {view.complete ? <><span>YOUR KENNEL DID SOMETHING THAT MATTERED</span><h2>“Your grandpa would have loved this.”</h2><p>{job.person} has their {job.item} back. You and {journey.dog!.name} followed the trail, recovered it, and returned together.</p><div className="outing-result"><strong>{outingQuality(view)}<small>partnership / 100</small></strong><p>{view.distractions ? `${view.distractions} rabbit distraction${view.distractions > 1 ? 's' : ''}. Your dog recovered and finished the job.` : 'Your partner stayed with the job.'}<br/>{Math.round(view.distance)} meters explored together.</p></div><p>{repeat ? 'This was a replay. Your first completion reward is already saved.' : 'Mara’s neighbors leave two meals for your pantry. You gain 8 keeper experience, 10 search experience and 4 bond. The outing uses 15 energy, 12 water and 8 food.'}</p>{id === 'mara' && <p>Ellis and Rowan have requests of their own. Both are now available at the kennel’s front gate.</p>}<button className="outing-primary" onClick={() => { if (!submitted.current) { submitted.current = true; onComplete(outingQuality(view)); } }}>Return home together</button></>
      : panel === 'intro' ? <><span>{job.person.toUpperCase()} · AT THE TRAILHEAD</span><h2>{job.title}</h2><p>“{job.story}”</p><div className="outing-lesson"><strong>Let your dog do the finding.</strong><p>Walk toward the area your neighbor described. Your dog will pick up nearby scent and lead you to clues. Gold motes show what they can smell.</p><p>Stay at a careful pace to search. Jog to cover known ground. Whistle if rabbits distract them. The trail map shows both creek crossings.</p></div><p className="outing-note">No countdown. You can leave at any time. {repeat ? 'Replay: no additional rewards or care costs.' : 'Finish and return together to earn supplies. Leaving early changes no saved stats.'}</p><button className="outing-primary" onClick={() => { simulation.current.message = id === 'ellis' ? 'Start on the eastern path, toward the stepping stones.' : 'Start in the orchard to the west. Watch where your dog turns.'; setPanel(null); }}>Let’s find it</button><button onClick={onBack}>Back to the kennel</button></>
      : <><span>TAKE YOUR TIME</span><h2>The trail can wait.</h2><p>Continue where you are, or return to the kennel. Leaving now will end this outing without rewards or care costs.</p><button className="outing-primary" onClick={() => setPanel(null)}>Continue searching</button><button onClick={onBack}>Return to the kennel</button></>}
    </dialog>
  </main>;
}
