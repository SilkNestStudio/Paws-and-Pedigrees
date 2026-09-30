import { Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, OrthographicCamera } from 'three';
import Dog3D from '../../components/training/3d/Dog3D';
import Handler3D from '../yard/Handler3D';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import type { Dog } from '../../types';
import { DISCIPLINE_INFO, type FieldDiscipline } from './model';
import { createField, sendField, recallField, inspectField, behindSheep, stepField, fieldScore, SEARCH_STATIONS, SHORE, type FieldState, type Point } from './simulation';
import './club.css';

const snapshot = (s: FieldState): FieldState => ({ ...s, dog: { ...s.dog }, target: { ...s.target }, found: [...s.found], checked: [...s.checked], sheep: s.sheep.map(v => ({ ...v })) });
function Box({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.85}/></mesh>;
}
function Tree({ x, z }: Point) {
  return <group position={[x, 0, z]}><mesh position={[0, .8, 0]} castShadow><cylinderGeometry args={[.15, .24, 1.6, 7]}/><meshStandardMaterial color="#756047"/></mesh><mesh position={[0, 2.1, 0]} castShadow><icosahedronGeometry args={[1.25, 1]}/><meshStandardMaterial color="#ad9464" flatShading/></mesh><mesh position={[.6, 1.8, .3]} castShadow><icosahedronGeometry args={[.8, 1]}/><meshStandardMaterial color="#b9a274" flatShading/></mesh></group>;
}
function SheepModel({ x, z, penned, panic }: FieldState['sheep'][number]) {
  return <group position={[x, .35, z]} rotation={[0, penned ? .3 : Math.PI, 0]}>
    <mesh position={[0, .32, 0]} scale={[.4, .38, .63]} castShadow><sphereGeometry args={[1, 12, 8]}/><meshStandardMaterial color={panic ? '#eed6b4' : '#f7f0dd'}/></mesh>
    <mesh position={[0, .3, .56]} scale={[.2, .23, .26]} castShadow><sphereGeometry args={[1, 10, 8]}/><meshStandardMaterial color="#544b43"/></mesh>
    {[-.24, .24].flatMap(dx => [-.32, .32].map(dz => <Box key={`${dx}:${dz}`} at={[dx, -.07, dz]} size={[.09, .4, .1]} color="#655a4a"/>))}
  </group>;
}
function World({ run, dog, paused, onSnapshot, onReady }: { run: MutableRefObject<FieldState>; dog: Dog; paused: boolean; onSnapshot: (s: FieldState) => void; onReady: (ready: boolean) => void }) {
  const avatar = useRef<Group>(null), timer = useRef(0), [s, setS] = useState(snapshot(run.current));
  useEffect(() => { onReady(true); }, [onReady]);
  useFrame(({ camera, size }, dt) => {
    if (camera instanceof OrthographicCamera) { const zoom = Math.min(size.width / 21.5, size.height / 19); if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); } camera.lookAt(0, 0, 0); }
    if (!paused) stepField(run.current, dt);
    const state = run.current;
    avatar.current?.position.set(state.dog.x, state.mode === 'water' && state.dog.z < 3.6 ? -.27 : .1, state.dog.z);
    if (avatar.current) avatar.current.rotation.y = state.heading;
    timer.current += dt;
    if (timer.current > .08) { timer.current = 0; const next = snapshot(state); setS(next); onSnapshot(next); }
  });
  const info = DISCIPLINE_INFO[s.mode];
  return <>
    <color attach="background" args={['#ded5c4']}/><hemisphereLight args={['#fff7e5', '#8f8069', 2]}/><directionalLight position={[-7, 18, 8]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-normalBias={.04}/>
    <Box at={[0, -.3, 0]} size={[19, .5, 17]} color="#b29d7a"/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.03, 0]} receiveShadow><planeGeometry args={[18, 16]}/><meshStandardMaterial color={s.mode === 'search' ? '#cfbb94' : s.mode === 'herding' ? '#a8ac81' : '#d1bf98'}/></mesh>
    {[-9, 9].map(x => <group key={x}>{[-7, -3, 1, 5, 8].map(z => <Box key={z} at={[x, .6, z]} size={[.16, 1.2, .16]} color="#efe0c3"/>)}<Box at={[x, .75, .5]} size={[.13, .14, 15]} color="#efe0c3"/></group>)}
    <Box at={[0, .65, -7.6]} size={[18, .16, .15]} color="#eee0c5"/>
    <group position={[7.9, 0, 6.6]}><Box at={[0, .7, 0]} size={[1.1, 1.4, .12]} color="#293e50"/><Html position={[0, 1.1, 0]} center zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}><span className="field-sign">FIELD<br/>CLUB</span></Html></group>
    <group position={[-1, .05, 6.7]} rotation={[0, Math.PI, 0]}><Handler3D/></group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SHORE.x, .05, SHORE.z]}><ringGeometry args={[.6, .72, 28]}/><meshBasicMaterial color="#fff4df"/></mesh>
    {s.mode === 'search' && <>
      {[-7, 7].flatMap(x => [-5, -.5, 4].map(z => <Tree key={`${x}:${z}`} x={x} z={z}/>))}
      {SEARCH_STATIONS.map((p, i) => <group key={i} position={[p.x, .05, p.z]}>
        <Box at={[0, .3, 0]} size={[.85, .6, .7]} color={s.found.includes(i) ? '#b77a45' : s.checked.includes(i) ? '#8b877e' : '#e9ddc1'}/>
        <Html position={[0, 1, 0]} center zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}><span className={'field-number ' + (s.found.includes(i) ? 'is-found' : '')}>{i + 1}</span></Html>
        {s.found.includes(i) && <mesh position={[0, .8, 0]}><sphereGeometry args={[.17, 12, 8]}/><meshStandardMaterial color="#c68b4b"/></mesh>}
      </group>)}
    </>}
    {s.mode === 'herding' && <>
      <mesh position={[0, .02, -6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4.4, 2.5]}/><meshStandardMaterial color="#e4cc94"/></mesh>
      {[-2.4, 2.4].map(x => <group key={x}><Box at={[x, .65, -6]} size={[.12, 1.2, 2.7]} color="#e8d7b4"/></group>)}
      <Html position={[0, 1, -6.4]} center zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}><span className="field-sign">HOME PEN · {s.sheep.filter(v => v.penned).length}/3</span></Html>
      {s.sheep.map((sheep, i) => <group key={i}><SheepModel {...sheep}/>{!sheep.penned && <Html position={[sheep.x, 1.4, sheep.z]} center zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}><span className="field-number">{i + 1}</span></Html>}</group>)}
      <Tree x={-7} z={-5}/><Tree x={7} z={-4}/>
    </>}
    {s.mode === 'water' && <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, -1.7]}><planeGeometry args={[17.5, 10.6]}/><meshStandardMaterial color="#6496aa" transparent opacity={.9} roughness={.3} metalness={.1}/></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .055, -2.25]}><planeGeometry args={[3.6, 6.5]}/><meshBasicMaterial color="#315f7d" transparent opacity={.3}/></mesh>
      {[-5, -3, -1, .5].map(z => <mesh key={z} position={[0, .08, z]} rotation={[-Math.PI / 2, 0, .4]}><planeGeometry args={[1.5, .04]}/><meshBasicMaterial color="#d4eced"/></mesh>)}
      <Box at={[-3, .2, 4.5]} size={[2.2, .25, 3]} color="#b1946c"/>
      <Html position={[0, .3, -5.7]} center zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}><span className="field-current">STRONG CURRENT</span></Html>
      {s.dummies.map((p, i) => !s.found.includes(i) && !(s.carrying && i === s.found.length) && <group key={i} position={[p.x, .2, p.z]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.13, .13, .65, 10]}/><meshStandardMaterial color={i === s.found.length ? '#f3c261' : '#dae2dc'}/></mesh><Html position={[0, .7, 0]} center zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}><span className="field-number">{i + 1}</span></Html></group>)}
      <Tree x={-7.5} z={5.4}/><Tree x={7.5} z={4.8}/>
    </>}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .1, 0]} onPointerDown={e => { e.stopPropagation(); if (!paused) sendField(run.current, { x: e.point.x, z: e.point.z }); }}><planeGeometry args={[17, 14]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s.target.x, .14, s.target.z]}><ringGeometry args={[.28, .36, 28]}/><meshBasicMaterial color="#fff1c9"/></mesh>
    <group ref={avatar}><Dog3D dog={dog} position={[0,0,0]} animation={s.moving && !paused ? 'Run' : s.inspecting !== null ? 'Eat' : 'Idle'}/>{s.carrying && <Box at={[0, .78, .82]} size={[.5, .14, .14]} color="#efbb5d"/>}</group>
    <Html position={[-7, .8, 7]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}><span className="field-place" style={{ color: info.color }}>{info.short}</span></Html>
  </>;
}
export default function FieldGame({ dog, discipline, ability, seed, onComplete, onCancel }: { dog: Dog; discipline: FieldDiscipline; ability: number; seed: number; onComplete: (score: number) => void; onCancel: () => void }) {
  const run = useRef(createField(discipline, ability, seed)), submitted = useRef(false);
  const [s, setS] = useState(snapshot(run.current)), [started, setStarted] = useState(false), [paused, setPaused] = useState(false), [ready, setReady] = useState(false);
  const info = DISCIPLINE_INFO[discipline];
  useEffect(() => {
    const pause = () => setPaused(true), visibility = () => { if (document.hidden) pause(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setPaused(v => !v); } };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', key); };
  }, []);
  const command = (action: () => void) => { if (started && !paused && run.current.phase === 'playing') { action(); setS(snapshot(run.current)); } };
  const finished = s.phase === 'finished', count = discipline === 'herding' ? s.sheep.filter(v => v.penned).length : s.found.length;
  return createPortal(<section className="field-game" aria-label={`${info.name} activity`} data-phase={s.phase} data-count={count} data-x={s.dog.x.toFixed(2)} data-z={s.dog.z.toFixed(2)} data-carrying={s.carrying}>
    <header className="field-header"><div><small>{info.short} / {dog.name}</small><h1>{info.name}</h1><p>{count}/3 complete · {Math.ceil(Math.max(0, 180 - s.time))}s remaining</p></div><div><button onClick={() => setPaused(true)}>Pause</button><button onClick={onCancel}>Exit round</button></div></header>
    <div className="field-stage"><ErrorBoundary fallback={<p className="field-load">The scene could not load. Use Exit round to return safely.</p>}><Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [1, 18, 14], zoom: 28, near: .1, far: 100 }} fallback={<p>3D is unavailable on this device. Exit to return to the club.</p>}><Suspense fallback={<Html center><span className="field-load">Opening the grounds…</span></Html>}><World dog={dog} run={run} paused={!started || paused || finished} onReady={setReady} onSnapshot={setS}/></Suspense></Canvas></ErrorBoundary></div>
    <div className="field-feedback" role="status">{s.feedback}</div>
    <div className="field-controls"><p>Tap the ground to send your dog. You are the handler at the near-side marker.</p>
      {discipline === 'search' && <><label className="field-meter">Scent signal <meter min={0} max={1} value={s.signal}/><strong>{s.signal > .8 ? 'Right here' : s.signal > .4 ? 'Getting warmer' : s.signal > 0 ? 'Faint trail' : 'No scent yet'}</strong></label><div className="field-targets">{SEARCH_STATIONS.map((p, i) => <button key={i} aria-label={`Send to station ${i + 1}`} disabled={!started || paused || finished || s.checked.includes(i)} onClick={() => command(() => sendField(run.current, p))}>{s.found.includes(i) ? 'Found' : 'Station'} {i + 1}</button>)}</div><button className="field-main-action" disabled={!started || paused || finished || s.inspecting !== null} onClick={() => command(() => inspectField(run.current))}>{s.inspecting !== null ? 'Investigating…' : 'Investigate scent'}</button></>}
      {discipline === 'herding' && <><div className="field-targets">{s.sheep.map((v, i) => <button key={i} disabled={!started || paused || finished || v.penned} onClick={() => command(() => sendField(run.current, behindSheep(run.current, i)))}>{v.penned ? 'Penned' : 'Position behind sheep'} {i + 1}</button>)}</div><button className="field-main-action" disabled={!started || paused || finished} aria-pressed={s.gentle} onClick={() => command(() => { run.current.gentle = !run.current.gentle; })}>{s.gentle ? 'Steady handling' : 'Brisk handling'}</button><span>Follow behind as the sheep moves. Getting too close scatters it.</span></>}
      {discipline === 'water' && <><label className="field-meter">Swimming stamina <meter min={0} max={100} value={s.stamina}/><strong>{Math.round(s.stamina)}%</strong></label><div className="field-targets">{s.dummies.map((p, i) => <button key={i} disabled={!started || paused || finished || s.carrying || i !== s.found.length} onClick={() => command(() => sendField(run.current, p))}>Retrieve dummy {i + 1}</button>)}<button disabled={!started || paused || finished} onClick={() => command(() => sendField(run.current, { x: -4, z: 2 }))}>Left shore waypoint</button><button disabled={!started || paused || finished} onClick={() => command(() => sendField(run.current, { x: 4, z: 2 }))}>Right shore waypoint</button></div><button className="field-main-action" disabled={!started || paused || finished} onClick={() => command(() => recallField(run.current))}>Call back to shore</button></>}
    </div>
    {(!started || paused || finished) && <div className="field-cover"><div className="field-brief"><small>{finished ? 'ROUND COMPLETE' : paused && started ? 'PAUSED' : 'YOUR NEXT CHALLENGE'}</small><h2>{finished ? `${fieldScore(s)} / 100` : info.verb}</h2><p>{finished ? `${count} of 3 completed · ${s.mistakes} handling mistakes. Your score reflects completed work, time, and control.` : info.detail}</p><p>{finished ? 'Save this round to develop your dog and continue your visit.' : `Your dog's ${info.effect.toLowerCase()} improve with aptitude and practice. Use the ground or the named controls below the scene.`}</p>
      <button className="journey-primary" disabled={!ready} onClick={() => { if (finished) { if (!submitted.current) { submitted.current = true; onComplete(fieldScore(run.current)); } } else { setStarted(true); setPaused(false); } }}>{!ready ? 'Preparing your dog…' : finished ? 'Save round & continue' : started ? 'Resume round' : 'Begin round'}</button><button className="journey-text-button" onClick={onCancel}>Return to Field Club</button>
    </div></div>}
  </section>, document.body);
}
