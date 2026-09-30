import Handler3D from '../yard/Handler3D';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import { Html } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import Dog3D, { type DogAppearance } from '../../components/training/3d/Dog3D';
import { COURSE, GATES, FINISH_Z, type CourseObstacle } from './course';
import { createRun, runPerformance, seesawAngle, stepRun, type Controls, type RunState } from './simulation';

type Phase = 'ready' | 'countdown' | 'running' | 'paused' | 'finished';
interface Props { handlerView?: boolean; dog?: DogAppearance; onComplete: (performance: number) => void; onCancel?: () => void; dogName: string; agility?: number; mode?: 'training' | 'competition' | 'welcome' }

function Obstacle({ obstacle: o, index, active, run }: {
  obstacle: CourseObstacle; index: number; active: boolean; run: MutableRefObject<RunState>;
}) {
  const plank = useRef<Group>(null);
  useFrame(() => { if (plank.current) plank.current.rotation.x = seesawAngle(run.current.z, run.current.x); });
  const color = active ? '#fbbf24' : '#e2e8f0';
  return <group position={[o.x, 0, o.z]}>
    <Html position={[-2, 2, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
      <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg ${active ? 'bg-amber-300 text-slate-950' : 'bg-white text-slate-700'}`}>{index + 1}</div>
    </Html>
    {o.kind === 'jump' && <>
      {[-1.8, 1.8].map(x => <mesh key={x} position={[x, 0.8, 0]} castShadow><boxGeometry args={[0.2, 1.6, 0.35]} /><meshStandardMaterial color={color} /></mesh>)}
      <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[3.6, 0.12, 0.12]} /><meshStandardMaterial color="#e87959" /></mesh>
    </>}
    {o.kind === 'tunnel' && <>
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1.35, 1.35, 6, 20, 1, true]} /><meshStandardMaterial color="#0891b2" side={2} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, 0.8, -3 + i * 0.75]}><torusGeometry args={[1.35, 0.045, 5, 24]} /><meshStandardMaterial color={color} /></mesh>)}
    </>}
    {o.kind === 'weave' && Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 0.85, 4 - i * 1.6]} castShadow><cylinderGeometry args={[0.065, 0.065, 1.7, 8]} /><meshStandardMaterial color={i % 2 ? '#e87959' : color} /></mesh>)}
    {o.kind === 'seesaw' && <>
      <mesh position={[0, 0.5, 0]} castShadow><coneGeometry args={[0.8, 1, 3]} /><meshStandardMaterial color="#164e63" /></mesh>
      <group ref={plank} position={[0, 0.94, 0]}>
        <mesh castShadow receiveShadow><boxGeometry args={[1.8, 0.12, 8]} /><meshStandardMaterial color="#0891b2" /></mesh>
        {[-3, 3].map(z => <mesh key={z} position={[0, 0.065, z]}><boxGeometry args={[1.8, 0.02, 2]} /><meshStandardMaterial color="#fbbf24" /></mesh>)}
      </group>
    </>}
  </group>;
}

function Scene({ run, controls, phase, maxSpeed, onSnapshot, appearance, onReady, handlerView = false }: {
  handlerView?: boolean; run: MutableRefObject<RunState>; controls: MutableRefObject<Controls>;
  onReady: (ready: boolean) => void; appearance?: DogAppearance; phase: Phase; maxSpeed: number; onSnapshot: (run: RunState) => void;
}) {
  useEffect(() => { onReady(true); }, [onReady]);
  const dog = useRef<Group>(null), marker = useRef<Group>(null), handler = useRef<Group>(null);
  const destination = useRef<{x:number;z:number}|null>(null);
  useEffect(()=>{if(phase!=='running')destination.current=null;},[phase]);
  const cameraTarget = useRef(new Vector3()), lookTarget = useRef(new Vector3());
  const hudTime = useRef(0);
  const [activeObstacle, setActiveObstacle] = useState(0);
  useFrame(({ camera }, delta) => {
    if (phase === 'running') {
      let input = controls.current;
      if (input.x || input.z) destination.current = null;
      if (destination.current) {
        const dx=destination.current.x-run.current.x,dz=destination.current.z-run.current.z,d=Math.hypot(dx,dz);
        if(d<.25)destination.current=null;else input={x:dx/d,z:dz/d,jump:input.jump};
      }
      stepRun(run.current, input, delta, maxSpeed);
    }
    const r = run.current;
    if(handler.current){handler.current.position.set(r.x+2.3,0,r.z+2);handler.current.rotation.y=r.heading;}
    if (dog.current) { dog.current.position.set(r.x, r.y, r.z); dog.current.rotation.y = r.heading; }
    cameraTarget.current.set(r.x * 0.7, r.y + 7, r.z + 10);
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-5 * Math.min(delta, 0.1)));
    lookTarget.current.set(r.x * 0.9, 0.5, r.z - 4); camera.lookAt(lookTarget.current);
    const gate = GATES[r.gate];
    if (marker.current) marker.current.position.set(gate?.x ?? 0, 0.1, gate?.z ?? FINISH_Z);
    hudTime.current += delta;
    if (hudTime.current > 0.1 || (r.finished && phase === 'running')) {
      hudTime.current = 0; onSnapshot({ ...r }); setActiveObstacle(gate?.obstacle ?? COURSE.length);
    }
  });
  return <>
    <color attach="background" args={['#cce4eb']} /><fog attach="fog" args={['#cce4eb', 35, 100]} />
    <ambientLight intensity={0.7} /><hemisphereLight intensity={0.8} groundColor="#607c43" />
    <directionalLight position={[15, 30, 15]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={30} shadow-camera-bottom={-75} shadow-camera-far={140} shadow-bias={-0.001} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -26]} receiveShadow><planeGeometry args={[100, 150]} /><meshStandardMaterial color="#769e62" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -26]} receiveShadow><planeGeometry args={[26, 92]} /><meshStandardMaterial color="#92b47b" roughness={1} /></mesh>
    {[-14, 14].map(x => <group key={x}>
      {[0.45, 1.1].map(y => <mesh key={y} position={[x, y, -26]} castShadow><boxGeometry args={[0.12, 0.12, 94]} /><meshStandardMaterial color="#f4eee0" /></mesh>)}
      {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[x, 0.7, 20 - i * 4.8]} castShadow><boxGeometry args={[0.18, 1.4, 0.18]} /><meshStandardMaterial color="#f4eee0" /></mesh>)}
    </group>)}
    {[16, FINISH_Z].map(z => <mesh key={z} position={[0, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 0.35]} /><meshStandardMaterial color="#fff7ed" /></mesh>)}
    {COURSE.map((o, index) => <Obstacle key={o.id} obstacle={o} index={index} active={index === activeObstacle} run={run} />)}
    <group ref={marker}><mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.35, 0.6, 24]} /><meshBasicMaterial color="#ffed94" /></mesh></group>
    {handlerView&&<><mesh position={[0,.035,-26]} rotation={[-Math.PI/2,0,0]} onPointerDown={e=>{e.stopPropagation();if(phase==='running')destination.current={x:e.point.x,z:e.point.z};}}><planeGeometry args={[26,92]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh><group ref={handler}><Handler3D moving={phase==='running' && Math.hypot(run.current.vx,run.current.vz)>.2}/></group></>}
    <group ref={dog}><group scale={0.85}><Dog3D dog={appearance} position={[0, 0, 0]} isRunning={phase === 'running' && Math.hypot(run.current.vx, run.current.vz) > 0.2} speed={1.2} /></group></group>
  </>;
}

export default function AgilityGame({ onComplete, onCancel, dogName, dog, agility = 50, mode = 'training', handlerView = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready'), [countdown, setCountdown] = useState(3);
  const run = useRef(createRun()), controls = useRef<Controls>({ x: 0, z: 0, jump: false });
  const keyboard = useRef(new Set<string>()), touch = useRef(new Set<string>());
  const [hud, setHud] = useState(createRun), [quality, setQuality] = useState<'standard' | 'low'>('standard');
  const nextGate = GATES[hud.gate];
  const nextObstacle = nextGate ? COURSE[nextGate.obstacle] : undefined;
  const coaching = !nextObstacle ? 'All obstacles cleared. Cross the finish line ahead.'
    : nextObstacle.kind === 'jump' ? (hud.z > nextGate.z && hud.z < nextGate.z + 2.3 ? 'Jump now: Space or the Jump button.' : 'Line up with the marker. Jump just before the bar; back up if you touch it.')
    : nextObstacle.kind === 'tunnel' ? 'Stay on the ground. Follow the marker through both ends of the tunnel.'
    : nextObstacle.kind === 'weave' ? `Stay on the ground and pass ${nextGate.x > nextObstacle.x ? 'right' : 'left'} of the next pole, toward the marker.`
    : 'Stay centered on the seesaw. Move across the plank without jumping.';
  const submitted = useRef(false);
  const clearInput = () => { keyboard.current.clear(); touch.current.clear(); controls.current = { x: 0, z: 0, jump: false }; };
  const updateControls = () => {
    const has = (...keys: string[]) => keys.some(k => keyboard.current.has(k) || touch.current.has(k));
    controls.current = { x: Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft')),
      z: Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp')), jump: has('Space') };
  };
  useEffect(() => {
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !e.repeat) { clearInput(); setPhase(p => p === 'running' ? 'paused' : p === 'paused' ? 'running' : p); }
      if (!keys.includes(e.code) || phase !== 'running') return;
      e.preventDefault(); keyboard.current.add(e.code); updateControls();
    };
    const up = (e: KeyboardEvent) => { keyboard.current.delete(e.code); updateControls(); };
    const blur = () => { clearInput(); setPhase(p => p === 'running' || p === 'countdown' ? 'paused' : p); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { clearInput(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); };
  }, [phase]);
  useEffect(() => {
    if (phase !== 'countdown') return;
    const timer = setTimeout(() => { if (countdown <= 1) setPhase('running'); else setCountdown(countdown - 1); }, 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);
  const start = () => { clearInput(); run.current = createRun(); setHud(createRun()); submitted.current = false; setCountdown(3); setPhase('countdown'); };
  const snapshot = (next: RunState) => { setHud(next); if (next.finished && phase === 'running') { clearInput(); setPhase('finished'); } };
  const pad = (label: string, code: string) => <button aria-label={label} className="inline-button agility-pad rounded-xl bg-slate-950/75 text-white font-bold border border-white/20 touch-none select-none"
    onPointerDown={e => { if (phase !== 'running') return; e.currentTarget.setPointerCapture(e.pointerId); touch.current.add(code); updateControls(); }}
    onPointerUp={() => { touch.current.delete(code); updateControls(); }} onPointerCancel={() => { touch.current.delete(code); updateControls(); }}
    onLostPointerCapture={() => { touch.current.delete(code); updateControls(); }}>{label}</button>;
  return createPortal(<div className="agility-game fixed inset-0 z-[100] bg-slate-950 text-white" role="region" aria-label="Agility training course">
    <Canvas shadows={quality === 'standard'} dpr={quality === 'low' ? 1 : [1, 1.5]} camera={{ position: [0, 7, 24], fov: 55 }} gl={{ antialias: true, alpha: false }}
      fallback={<div className="p-8">This device cannot display the 3D course. Please use a browser with WebGL support.</div>}>
      <Scene handlerView={handlerView} onReady={setLoaded} appearance={dog} run={run} controls={controls} phase={phase} maxSpeed={5.5 + Math.min(100, Math.max(0, agility)) / 100} onSnapshot={snapshot} />
    </Canvas>
    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3 pointer-events-none">
      <div className="rounded-2xl bg-slate-950/85 px-4 py-3 shadow-xl max-w-[65%]">
        <p className="text-xs uppercase tracking-widest text-amber-200">Meadow agility · {dogName}</p>
        <div className="flex gap-5 mt-1 font-bold"><span>{hud.time.toFixed(1)}s</span><span>{hud.faults} faults</span><span>{GATES[hud.gate]?.obstacle ?? COURSE.length}/{COURSE.length}</span></div>
        <p className="text-xs text-slate-200 mt-1">{hud.feedback}</p>
        {phase === 'running' && <p className="text-xs text-amber-200 mt-2 max-w-sm">{coaching}</p>}
      </div>
      <div className="flex gap-2 pointer-events-auto">
        {phase === 'running' && <button className="inline-button rounded-xl bg-slate-950/85 p-3" onClick={() => { clearInput(); setPhase('paused'); }}>Pause</button>}
        {onCancel && <button className="inline-button rounded-xl bg-slate-950/85 p-3" onClick={onCancel}>Exit</button>}
      </div>
    </div>
    {phase === 'running' && <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between"><div className="agility-dpad"><span />{pad('↑', 'KeyW')}<span />{pad('←', 'KeyA')}{pad('↓', 'KeyS')}{pad('→', 'KeyD')}</div>{pad('Jump', 'Space')}</div>}
    {phase === 'countdown' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-8xl font-black drop-shadow-lg" aria-live="polite">{countdown}</div>}
    {(phase === 'ready' || phase === 'paused' || phase === 'finished') && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 p-4 overflow-auto">
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-white/10">
        <p className="text-xs uppercase tracking-widest text-amber-300 mb-2">Train together. Grow together.</p>
        <h2 className="text-3xl font-bold">{phase === 'finished' ? 'A run to build on' : phase === 'paused' ? 'Taking a breather' : mode === 'welcome' ? `${dogName}'s welcome meet` : `${dogName}'s agility ${mode === 'competition' ? 'trial' : 'session'}`}</h2>
        {phase === 'finished' ? <>
          <div className="agility-results-grid gap-3 my-6 text-center"><div><p className="text-2xl font-bold">{hud.time.toFixed(1)}s</p><p className="text-sm text-slate-300">Time</p></div><div><p className="text-2xl font-bold">{hud.faults}</p><p className="text-sm text-slate-300">Faults</p></div><div><p className="text-2xl font-bold">{runPerformance(hud).toFixed(2)}×</p><p className="text-sm text-slate-300">{mode !== 'training' || handlerView ? 'Run quality' : 'Training gain'}</p></div></div>
          <button className="w-full rounded-xl bg-amber-300 text-slate-950 p-3 font-bold" onClick={() => { if (!submitted.current) { submitted.current = true; onComplete(runPerformance(run.current)); } }}>{handlerView ? 'Save round & continue' : mode === 'competition' ? 'View standings' : mode === 'welcome' ? 'Finish welcome meet' : 'Finish session'}</button>
          {mode === 'training' && <button className="w-full mt-2 p-3 rounded-xl border border-white/20" onClick={start}>Practice again before finishing</button>}
        </> : <>
          {mode==='welcome'&&<p className="my-4 text-amber-200">Free, unranked welcome meet. Finish every gate to earn your participation ribbon. No entry fee, no training-point cost, and no championship points.</p>}
          <p className="my-4 text-slate-200">Follow six numbered obstacles and the golden marker. Clear the bars, run through the tunnel, alternate sides of the weave poles, and walk across the seesaw.</p>
          <p className="text-sm text-slate-300">{handlerView ? 'Tap the course to direct your dog, or use WASD / arrows' : 'WASD / arrows to move'} · Space to jump · Escape to pause. Touch controls are also available. A missed gate adds one fault; return and complete it.</p>
          <label className="flex items-center justify-between my-5 text-sm">Graphics<select className="bg-slate-800 rounded-lg p-2" value={quality} onChange={e => setQuality(e.target.value as 'standard' | 'low')}><option value="standard">Standard</option><option value="low">Low</option></select></label>
          <button className="w-full rounded-xl bg-amber-300 text-slate-950 p-3 font-bold" disabled={!loaded} onClick={phase === 'paused' ? () => setPhase('running') : start}>{!loaded ? 'Loading your dog...' : phase === 'paused' ? 'Continue session' : 'Start session'}</button>
          {phase === 'paused' && mode === 'training' && <button className="w-full mt-2 p-2" onClick={start}>Restart course</button>}
        </>}
        {onCancel && <button className="w-full mt-2 p-2 text-slate-300" onClick={onCancel}>{handlerView ? 'Return to Field Club' : 'Return to kennel'}</button>}
      </div>
    </div>}
  </div>, document.body);
}
