import Handler3D from './Handler3D';
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { Group, Mesh, OrthographicCamera } from 'three';
import Dog3D from '../../components/training/3d/Dog3D';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import type { Dog } from '../../types';
import { createActivity, stepActivity, commandActivity, aimActivity, activityPerformance, FETCH_BOUNDS, HOME, MARK, type ActivityMode, type ActivityState } from './activities';
import './activities.css';
interface Props {
    dog: Dog;
    mode?: ActivityMode;
    onComplete: (performance: number) => void;
    onCancel: () => void;
}
function ActivityWorld({ dog, run, paused, onSnapshot, onReady }: {
    dog: Dog;
    run: MutableRefObject<ActivityState>;
    paused: boolean;
    onSnapshot: (s: ActivityState) => void;
    onReady: (v: boolean) => void;
}) {
    const { scene } = useGLTF('/models/kennel_yard.glb');
    const environment = useMemo(() => { const copy = scene.clone(true); copy.traverse(n => { if (n instanceof Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
    } }); return copy; }, [scene]);
    const avatar = useRef<Group>(null), ball = useRef<Mesh>(null), time = useRef(0);
    const [snapshot, setSnapshot] = useState({ ...run.current });
    useEffect(() => onReady(true), [onReady]);
    useFrame(({ camera, size }, dt) => {
        // Fit the full yard inside the play area, leaving the HUD outside it.
        if(camera instanceof OrthographicCamera){const zoom=Math.min(size.width/27,size.height/28);if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}camera.lookAt(0,0,0);}
        else {camera.position.set(...(size.width/size.height<.8?[2,14,19]:[1.5,12,17]) as [number,number,number]);camera.lookAt(1,.3,2);}
        if (!paused)
            stepActivity(run.current, dt);
        const s = run.current;
        if (avatar.current) {
            avatar.current.position.set(s.dog.x, .07, s.dog.z);
            avatar.current.rotation.y = s.heading;
        }
        if (ball.current)
            ball.current.position.set(s.ball.x, s.ball.y + .07, s.ball.z);
        time.current += dt;
        if (time.current > .08) {
            time.current = 0;
            const next = { ...s };
            setSnapshot(next);
            onSnapshot(next);
        }
    });
    const s = snapshot;
    const moving = ['chase', 'return', 'reset'].includes(s.phase);
    return <>
  <color attach="background" args={['#e1d9ca']}/><fog attach="fog" args={['#e1d9ca', 30, 65]}/>
  <hemisphereLight args={['#fff0dd', '#687b65', 1.8]}/><directionalLight position={[-8, 18, 8]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-normalBias={.04}/>
  <primitive object={environment} dispose={null}/>
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .06, 0]} onPointerDown={e => { e.stopPropagation(); if (!paused)
        aimActivity(run.current, { x: e.point.x, z: e.point.z }); }}><planeGeometry args={[22, 22]}/><meshBasicMaterial transparent opacity={0} color="#eacb89" depthWrite={false}/></mesh>
  {s.mode === 'fetch' && <><mesh position={[s.aim.x, .09, s.aim.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.45, .56, 32]}/><meshBasicMaterial color="#b96830"/></mesh><mesh ref={ball} castShadow><sphereGeometry args={[.14, 16, 12]}/><meshStandardMaterial color="#daba46" roughness={.85}/></mesh></>}
  <group position={[HOME.x-.8,.07,HOME.z]} rotation={[0,Math.PI,0]}><Handler3D/></group>
  {s.mode==='obedience'&&[MARK].map((p, i) => <mesh key={i} position={[p.x, .07, p.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.55, .62, 32]}/><meshBasicMaterial color={i ? '#f5e7ce' : '#47768c'}/></mesh>)}
  <group ref={avatar}><Dog3D dog={dog} position={[0, 0, 0]} animation={paused ? 'Idle' : moving ? 'Run' : s.phase === 'pickup' ? 'Eat' : ['stay', 'cue'].includes(s.phase) ? 'Sit' : 'Idle'}/></group>
 </>;
}
export default function YardActivity({ dog, mode = 'fetch', onComplete, onCancel }: Props) {
    const run = useRef(createActivity(mode)), submitted = useRef(false);
    const [snapshot, setSnapshot] = useState({ ...run.current }), [ready, setReady] = useState(false), [started, setStarted] = useState(false), [paused, setPaused] = useState(false);
    const s = snapshot;
    useEffect(() => { const pause = () => setPaused(true); window.addEventListener('blur', pause); document.addEventListener('visibilitychange', pause); return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause); }; }, []);
    const command = (kind: 'throw' | 'sit' | 'recall') => { if (started && !paused) {
        commandActivity(run.current, kind);
        setSnapshot({ ...run.current });
    } };
    const hints: Record<string, string> = { aim: 'Tap any open part of the yard to aim, then throw. The ring marks your chosen landing spot.', flight: 'A good throw! Give your dog a moment to watch the ball.', chase: 'There they go. Let them reach the ball.', pickup: 'Let them pick it up before calling.', recall: 'Ball found! Call your dog back to the handler.', return: 'Encourage them home. A retrieve ends when the ball comes back.', sit: 'Ask for a sit on the practice marker.', stay: 'Hold the stay. Wait for the recall cue before calling.', cue: 'Now call your dog back to you.', reset: 'A short reset before the next repetition.', complete: 'Three good moments together. Finish to save this session.' };
    return createPortal(<section className="yard-activity" aria-label={mode === 'fetch' ? 'Fetch in the yard' : 'Obedience in the yard'} data-mode={mode} data-phase={s.phase} data-aim-x={s.aim.x.toFixed(2)} data-aim-z={s.aim.z.toFixed(2)}>
  <div className="activity-scene"><ErrorBoundary fallback={<div className="activity-load">The activity could not load. Exit to return to your dog.</div>}><Canvas orthographic={mode==='fetch'} shadows dpr={[1, 1.5]} camera={mode==='fetch'?{position:[2,25,20],zoom:25,near:.1,far:150}:{position:[1.5,12,17],fov:48}}><Suspense fallback={<Html center><span className="activity-load">Preparing the yard...</span></Html>}><ActivityWorld dog={dog} run={run} paused={!started || paused} onSnapshot={setSnapshot} onReady={setReady}/></Suspense></Canvas></ErrorBoundary></div>
  <header className="activity-header"><div><small>{mode === 'fetch' ? 'TIME TOGETHER' : 'FOUNDATION TRAINING'}</small><h2>{mode === 'fetch' ? 'One more throw.' : 'Sit. Stay. Come.'}</h2><p>{dog.name} / {s.rounds} of 3 {mode === 'fetch' ? 'retrieves' : 'repetitions'}</p></div><div><button onClick={() => setPaused(true)}>Pause</button><button onClick={onCancel}>Exit activity</button></div></header>
  <div className="activity-instructions" role="status">{s.aimError&&s.phase==='aim'?s.aimError:hints[s.phase]}{s.mistakes > 0 && <small>{s.mistakes} early recall{s.mistakes === 1 ? '' : 's'} - settle and try again.</small>}</div>
  {started && !paused && <div className="activity-actions">
   {s.phase === 'aim' && <><details className="activity-aim-options"><summary>Fine-tune your throw</summary><label>Left / right<input aria-label="Throw direction" type="range" min={FETCH_BOUNDS.min} max={FETCH_BOUNDS.max} step={.1} value={s.aim.x} onChange={e => { aimActivity(run.current, { ...s.aim, x: Number(e.target.value) }); setSnapshot({ ...run.current }); }}/></label><label>Back / front<input aria-label="Throw distance" type="range" min={FETCH_BOUNDS.min} max={FETCH_BOUNDS.max} step={.1} value={s.aim.z} onChange={e => { aimActivity(run.current, { ...s.aim, z: Number(e.target.value) }); setSnapshot({ ...run.current }); }}/></label></details><button disabled={!!s.aimError} onClick={() => command('throw')}>Throw ball</button></>}
   {s.phase === 'sit' && <button onClick={() => command('sit')}>Ask for a sit</button>}
   {['stay', 'cue', 'recall'].includes(s.phase) && <button onClick={() => command('recall')}>{s.phase === 'stay' ? 'Call early (breaks stay)' : 'Call your dog'}</button>}
   {s.phase === 'stay' && <progress aria-label="Stay progress" value={s.elapsed} max={3 + s.rounds}/>}
   {s.phase === 'complete' && <><span>{mode === 'fetch' ? 'Three retrieves together' : `${s.mistakes} early recalls`}</span><button onClick={() => { if (!submitted.current && run.current.phase === 'complete') {
            submitted.current = true;
            onComplete(activityPerformance(run.current));
        } }}>Finish session</button></>}
  </div>}
  {(!started || paused) && <div className="activity-cover"><div><h3>{started ? 'Take a breather.' : mode === 'fetch' ? 'A ball, a dog, and a little time.' : 'Build a reliable recall.'}</h3><p>{mode === 'fetch' ? 'Aim and throw, wait for the pickup, then call your dog home. Complete three retrieves.' : 'Ask for a sit, wait for the cue, then recall your dog. Calling too soon restarts the repetition.'}</p><button disabled={!ready} onClick={() => { setStarted(true); setPaused(false); }}>{!ready ? 'Loading your dog...' : started ? 'Resume activity' : 'Begin activity'}</button><button onClick={onCancel}>Back to your dog</button></div></div>}
 </section>, document.body);
}
