import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Group, InstancedMesh, Mesh, Object3D, Vector3 } from 'three';
import { YardDog, YardKeeper } from './Characters';
import Scenery from './Scenery';
import { callPlayDog, clampPoint, DOGS, launchVelocity, movingTarget, newPlay, stepPlay, throwToy, type DogId, type YardPlay } from './play';
import './playyard.css';

interface Controls { keys: Set<string>; x: number; z: number; yaw: number; wide: boolean }
function World({ state, controls, paused, onSnapshot }: { state: YardPlay; controls: Controls; paused: boolean; onSnapshot: (s: YardPlay) => void }) {
  const ball = useRef<Mesh>(null), aim = useRef<Mesh>(null), target = useRef<Group>(null), arc = useRef<InstancedMesh>(null);
  const tick = useRef(0), boot = useRef(false), dummy = useRef(new Object3D());
  useFrame(({ camera, size }, dt) => {
    if (!paused) {
      if (controls.keys.has('KeyQ')) controls.yaw += dt;
      if (controls.keys.has('KeyE')) controls.yaw -= dt;
      const x = Number(controls.keys.has('KeyD') || controls.keys.has('ArrowRight')) - Number(controls.keys.has('KeyA') || controls.keys.has('ArrowLeft')) + controls.x;
      const z = Number(controls.keys.has('KeyS') || controls.keys.has('ArrowDown')) - Number(controls.keys.has('KeyW') || controls.keys.has('ArrowUp')) + controls.z;
      stepPlay(state, dt, { x: x * Math.cos(controls.yaw) + z * Math.sin(controls.yaw), z: -x * Math.sin(controls.yaw) + z * Math.cos(controls.yaw) });
    }
    const distance = controls.wide ? 23 : size.width < size.height ? 14.5 : 12;
    const focus = controls.wide ? new Vector3(0, 0, 1) : new Vector3(state.keeper.x * .75, .7, state.keeper.z - 1.5);
    const desired = new Vector3(focus.x + Math.sin(controls.yaw) * distance, controls.wide ? 18 : 7, focus.z + Math.cos(controls.yaw) * distance);
    if (!boot.current) { camera.position.copy(desired); boot.current = true; }
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt)); camera.lookAt(focus);
    ball.current?.position.set(state.ball.x, state.ball.y, state.ball.z);
    if (ball.current && !paused) ball.current.rotation.x += dt * 6;
    if (aim.current) { aim.current.visible = state.phase === 'ready'; aim.current.position.set(state.aim.x, .07, state.aim.z); aim.current.scale.setScalar(state.charging ? 1 + state.charge * .4 : 1); }
    const patch = movingTarget(state.time); target.current?.position.set(patch.x, .065, patch.z);
    if (arc.current) {
      arc.current.visible = state.phase === 'ready';
      const velocity = launchVelocity(state), flight = (velocity.vy + Math.sqrt(velocity.vy ** 2 + 2 * 12 * 1.15)) / 12;
      for (let i = 0; i < 24; i++) { const t = flight * i / 23; dummy.current.position.set(state.keeper.x + velocity.vx * t, 1.3 + velocity.vy * t - 6 * t * t, state.keeper.z + velocity.vz * t); dummy.current.scale.setScalar(.045 + i / 23 * .015); dummy.current.updateMatrix(); arc.current.setMatrixAt(i, dummy.current.matrix); }
      arc.current.instanceMatrix.needsUpdate = true;
    }
    tick.current += dt; if (tick.current > .08) { tick.current = 0; onSnapshot({ ...state }); }
  });
  function point(e: ThreeEvent<PointerEvent>) { state.aim = clampPoint({ x: e.point.x, z: e.point.z }); }
  return <>
    <Scenery/>
    <mesh position={[0, .025, 1]} rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={e => { if (paused || state.phase !== 'ready' || e.button !== 0) return; e.stopPropagation(); point(e); state.charging = true; state.charge = 0; (e.target as Element).setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (!paused && state.phase === 'ready') point(e); }}
      onPointerUp={e => { if (!state.charging) return; e.stopPropagation(); point(e); if (!paused) throwToy(state); (e.target as Element).releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { state.charging = false; state.charge = 0; }}><planeGeometry args={[20, 18]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <YardKeeper state={state} paused={paused}/><YardDog state={state} paused={paused}/>
    <mesh ref={ball} castShadow><sphereGeometry args={[.15, 24, 16]}/><meshToonMaterial color="#f17f71"/></mesh>
    <mesh ref={aim} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.35, .4, 48]}/><meshBasicMaterial color="#fff9e4" transparent opacity={.9}/></mesh>
    <instancedMesh ref={arc} args={[undefined, undefined, 24]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]}/><meshBasicMaterial color="#fff9e4" transparent opacity={.8}/></instancedMesh>
    <group ref={target}><mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.05, 48]}/><meshToonMaterial color="#d2a6dd"/></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .008, 0]}><ringGeometry args={[.78, .85, 48]}/><meshBasicMaterial color="#fff3e2"/></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .01, 0]}><circleGeometry args={[.17, 24]}/><meshBasicMaterial color="#fff3e2"/></mesh></group>
  </>;
}

export default function PlayYard() {
  const state = useRef(newPlay()), controls = useRef<Controls>({ keys: new Set(), x: 0, z: 0, yaw: 0, wide: false });
  const [view, setView] = useState({ ...state.current }), [paused, setPaused] = useState(false), [help, setHelp] = useState(false), [wide, setWide] = useState(false), [stick, setStick] = useState({ x: 0, z: 0 });
  const dialog = useRef<HTMLDialogElement>(null);
  const stop = () => { controls.current.keys.clear(); controls.current.x = controls.current.z = 0; state.current.charging = false; state.current.charge = 0; setStick({ x: 0, z: 0 }); };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); setPaused(p => !p); return; }
      if (paused || e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(e.code)) { e.preventDefault(); controls.current.keys.add(e.code); }
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLElement && e.target.closest('button, a'))) { e.preventDefault(); callPlayDog(state.current); }
    };
    const up = (e: KeyboardEvent) => controls.current.keys.delete(e.code);
    const blur = () => { stop(); setPaused(true); };
    const hidden = () => { if (document.hidden) blur(); };
    if (paused) { stop(); dialog.current?.showModal(); } else dialog.current?.close();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); };
  }, [paused]);
  function changeDog(id: DogId) { stop(); state.current = newPlay(id); setView({ ...state.current }); }
  function joystick(e: React.PointerEvent<HTMLDivElement>) { if (paused) return; const b = e.currentTarget.getBoundingClientRect(), dx = (e.clientX - b.x - b.width / 2) / 40, dz = (e.clientY - b.y - b.height / 2) / 40, length = Math.max(1, Math.hypot(dx, dz)); controls.current.x = dx / length; controls.current.z = dz / length; setStick({ x: dx / length, z: dz / length }); }
  return <main className="play-yard" data-phase={view.phase} data-returns={view.returns} data-throws={view.throws} data-keeper-x={view.keeper.x.toFixed(2)} data-keeper-z={view.keeper.z.toFixed(2)}>
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 48, near: .1, far: 110 }}><Suspense fallback={null}><World state={state.current} controls={controls.current} paused={paused} onSnapshot={setView}/></Suspense></Canvas>
    <header className="play-yard-header"><div><span className="play-yard-kicker">PAWS & PEDIGREES · A NEW PLAYTEST</span><h1>A little room to play.</h1></div><button onClick={() => setPaused(true)} aria-label="Pause yard">Ⅱ</button></header>
    <div className="play-yard-dog"><span className="play-yard-paw" aria-hidden="true">●</span><div><strong>{DOGS[view.personality].name}</strong><span>{view.personality === 'pip' ? 'The enthusiastic one' : 'A little encouragement goes a long way'}</span></div><button onClick={() => changeDog(view.personality === 'pip' ? 'june' : 'pip')}>Meet {view.personality === 'pip' ? 'June' : 'Pip'}</button></div>
    <div className="play-yard-moments"><span><strong>{view.returns}</strong> happy returns</span><span><strong>{view.targetHits}</strong> patch hits</span></div>
    <div className="play-yard-camera"><button aria-label="Turn view left" onClick={() => { controls.current.yaw += .55; }}>↶</button><button onClick={() => { controls.current.wide = !wide; setWide(!wide); }}>{wide ? 'Closer view' : 'See the whole yard'}</button><button aria-label="Turn view right" onClick={() => { controls.current.yaw -= .55; }}>↷</button></div>
    <div className="play-yard-story" aria-live="polite"><span className="play-yard-label">{view.phase === 'ready' ? view.charging ? 'YOUR THROW' : 'YOUR MOMENT' : 'WATCH YOUR DOG'}</span><p>{view.charging ? 'Release to throw. A longer hold gives the ball a higher arc.' : view.feedback}</p>{view.charging && <div className="play-yard-charge"><i style={{ width: `${view.charge * 100}%` }}/></div>}</div>
    <div className="play-yard-bottom"><div className="play-yard-joystick" role="group" aria-label="Move keeper joystick" onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); joystick(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) joystick(e); }} onPointerUp={e => { e.currentTarget.releasePointerCapture(e.pointerId); controls.current.x = controls.current.z = 0; setStick({ x: 0, z: 0 }); }} onLostPointerCapture={() => { controls.current.x = controls.current.z = 0; setStick({ x: 0, z: 0 }); }}><span style={{ transform: `translate(${stick.x * 30}px,${stick.z * 30}px)` }}/></div>
      <p className="play-yard-keys"><b>WASD</b> move · <b>Q / E</b> turn<br/>Hold & release on the lawn to throw</p>
      <button className="play-yard-call" onClick={e => { callPlayDog(state.current); e.currentTarget.blur(); }}>{view.phase === 'hesitate' ? 'You can do it!' : view.phase === 'parade' ? 'Bring it here!' : `Call ${DOGS[view.personality].name}`}<small>SPACE</small></button>
    </div>
    <button className="play-yard-help-toggle" onClick={() => setHelp(v => !v)}>{help ? 'Got it' : 'Things to try'}</button>
    {help && <aside className="play-yard-help"><strong>No checklist. Try something.</strong><p>Throw short, then long. Move to meet the return. Try landing on the moving purple patch, or bounce the toy beside a planter.</p><p>{DOGS[view.personality].description} After three returns, long throws become more familiar.</p><small>This yard uses temporary playtest companions. Changing dogs starts a fresh play session. Your saved kennel is untouched.</small></aside>}
    <dialog ref={dialog} className="play-yard-pause" onCancel={e => { e.preventDefault(); setPaused(false); }}><span className="play-yard-kicker">STAY A LITTLE LONGER</span><h2>There’s no hurry.</h2><p>This is a standalone playtest of movement, throwing and dog behavior. No scores or progress are written to your kennel.</p><button onClick={() => setPaused(false)}>Back to playing</button><a href="/?preview=legacy">Return to Homecoming</a><a href="/">Return to the original game</a></dialog>
  </main>;
}
