import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CanvasTexture, Group, SRGBColorSpace, Vector3 } from 'three';
import CharacterModel from './CharacterModel';
import { Ground } from './PropertyScenery';
import { RESCUES, type Greeting, type RescueCandidate } from './journey';
import './shelter.css';

type Encounter = { id: number; kind: Greeting };
function ShelterSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 180;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#293f4c'; ctx.fillRect(0, 0, 1024, 180);
    ctx.fillStyle = '#f1ddbc'; ctx.font = '46px Georgia'; ctx.textAlign = 'center'; ctx.fillText('LARCHWOOD RESCUE', 512, 83);
    ctx.font = '22px sans-serif'; ctx.fillText('Every dog deserves a new beginning', 512, 132);
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace; return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 3.5, -3.82]}><planeGeometry args={[7, 1.23]}/><meshBasicMaterial map={texture}/></mesh>;
}
function ShelterWorld({ selected, encounter, onMet, paused }: { selected: number; encounter: Encounter | null; onMet: (kind: Greeting) => void; paused: boolean }) {
  const dog = useRef<Group>(null), ball = useRef<Group>(null), elapsed = useRef(0), completed = useRef(false);
  const [moving, setMoving] = useState(false);
  const candidate = RESCUES[selected], x = (selected - 1) * 4.2;
  const target = useRef(new Vector3(x, .8, 0));
  useEffect(() => { elapsed.current = 0; completed.current = false; setMoving(false); if (dog.current) dog.current.position.set(x, .06, -.8); if (ball.current) ball.current.visible = false; }, [encounter, x]);
  useFrame(({ camera, size }, delta) => {
    target.current.lerp(new Vector3(x, .8, .2), 1 - Math.exp(-3 * delta));
    const portrait = size.width < size.height;
    camera.position.lerp(new Vector3(target.current.x + 2.3, portrait ? 3.6 : 3.4, portrait ? 7 : 6.3), 1 - Math.exp(-3 * delta));
    camera.lookAt(target.current);
    if (paused || !encounter || completed.current || !dog.current) return;
    elapsed.current += Math.min(delta, .07);
    const progress = Math.min(1, elapsed.current / candidate.responseSeconds);
    const approach = Math.max(0, (progress - .25) / .75);
    if (approach > 0 && !moving) setMoving(true);
    dog.current.position.z = -.8 + approach * 2.1;
    dog.current.position.x = x + (encounter.kind === 'toy' ? Math.sin(approach * Math.PI) * .5 : 0);
    dog.current.rotation.y = encounter.kind === 'toy' ? Math.atan2(Math.cos(approach * Math.PI) * .5, 2.1) : -.65;
    if (ball.current) { ball.current.visible = encounter.kind === 'toy'; ball.current.position.set(x + .25, .12 + Math.sin(Math.min(1, progress * 3) * Math.PI) * .65, 2.3 - Math.min(1, progress * 3) * .5); }
    if (progress >= 1) { completed.current = true; setMoving(false); onMet(encounter.kind); }
  });
  return <>
    <color attach="background" args={['#d5e1e5']}/><fog attach="fog" args={['#d5e1e5', 28, 65]}/>
    <hemisphereLight args={['#e6f3ff', '#968975', 2]}/><directionalLight position={[-7, 13, 8]} intensity={2.4} color="#ffe8c7" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-normalBias={.04}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, 100]}/><meshStandardMaterial color="#8c9e83" roughness={1}/></mesh>
    <mesh position={[0, -.06, 1]} receiveShadow><boxGeometry args={[17, .13, 12]}/><meshStandardMaterial color="#cfbd9f" roughness={1}/></mesh>
    <Ground at={[0, .009, 1]} width={17} depth={12} gravel/>
    <mesh position={[0, 2, -4]} castShadow receiveShadow><boxGeometry args={[16, 4, .35]}/><meshStandardMaterial color="#e9dcc5"/></mesh>
    <mesh position={[0, 4.25, -4.4]} rotation={[.12, 0, 0]} castShadow><boxGeometry args={[17, .24, 3.8]}/><meshStandardMaterial color="#374955"/></mesh>
    <ShelterSign/>
    {RESCUES.map((rescue, index) => <group key={rescue.id} position={[(index - 1) * 4.2, 0, 0]}>
      <mesh position={[0, 1.45, -3.76]}><boxGeometry args={[3.65, 2.7, .13]}/><meshStandardMaterial color="#59615d"/></mesh>
      {[-1.4, -.7, 0, .7, 1.4].map(batten => <mesh key={batten} position={[batten, 1.4, -3.66]} castShadow><boxGeometry args={[.045, 2.6, .065]}/><meshStandardMaterial color="#7b8074"/></mesh>)}
      {[-1.85, 1.85].map(side => <group key={side}>
        <mesh position={[side, 1.5, -2]} castShadow><boxGeometry args={[.16, 3, 3.5]}/><meshStandardMaterial color="#ddd0b8"/></mesh>
        <mesh position={[side, 1.5, -.28]} castShadow><boxGeometry args={[.24, 3, .24]}/><meshStandardMaterial color="#6d5440"/></mesh>
      </group>)}
      <mesh position={[0, 2.85, -.28]} castShadow><boxGeometry args={[4, .22, .24]}/><meshStandardMaterial color="#6d5440"/></mesh>
      <mesh position={[-.9, .12, -2.5]} scale={[1, .18, .72]} castShadow><sphereGeometry args={[.65, 24, 12]}/><meshStandardMaterial color={rescue.collar} roughness={1}/></mesh>
      <mesh position={[-.9, .19, -2.5]} scale={[1, .12, .72]} castShadow><sphereGeometry args={[.49, 24, 12]}/><meshStandardMaterial color="#ddcfb7" roughness={1}/></mesh>
      <mesh position={[1.25, 2.18, -3.65]}><boxGeometry args={[.65, .85, .08]}/><meshStandardMaterial color="#cbb38c"/></mesh>
      <mesh position={[1.25, 2.18, -3.59]}><planeGeometry args={[.52, .69]}/><meshStandardMaterial color="#f1ead8"/></mesh>
      <mesh position={[1, .13, -2.1]}><cylinderGeometry args={[.23, .28, .2, 24]}/><meshStandardMaterial color="#788b95" metalness={.6} roughness={.3}/></mesh>
      {selected !== index && <group position={[.15, .06, -.8]} rotation={[0, -.3, 0]}><CharacterModel kind={rescue.build} pose={index === 1 ? 'Sit' : 'Sniff'} collar={rescue.collar} paused={paused}/></group>}
    </group>)}
    <group ref={dog} position={[x, .06, -.8]}><CharacterModel kind={candidate.build} collar={candidate.collar} pose={moving ? 'Walk' : encounter?.kind === 'quiet' ? 'Sit' : encounter?.kind === 'toy' ? 'Sniff' : 'Idle'} paused={paused}/></group>
    <group position={[x - 1.3, .06, 2.4]} rotation={[0, 2.6, 0]}><CharacterModel kind="keeper" paused={paused}/></group>
    <group ref={ball} visible={false}><mesh castShadow><sphereGeometry args={[.12, 18, 12]}/><meshStandardMaterial color="#d9a351"/></mesh></group>
    {[-8, 8].map(side => <group key={side} position={[side, 0, 2]}><mesh position={[0, .45, 0]} castShadow><boxGeometry args={[.9, .9, 2.4]}/><meshStandardMaterial color="#8d7560"/></mesh>{[-.7, 0, .7].map(z => <mesh key={z} position={[0, 1.1, z]} castShadow><sphereGeometry args={[.57, 16, 10]}/><meshStandardMaterial color="#62765b"/></mesh>)}</group>)}
  </>;
}

export default function ShelterVisit({ kennelName, onBack, onAdopt }: { kennelName: string; onBack: () => void; onAdopt: (candidate: RescueCandidate, name: string, observations: Greeting[]) => void }) {
  const [selected, setSelected] = useState(0), [encounter, setEncounter] = useState<Encounter | null>(null), [busy, setBusy] = useState(false);
  const [met, setMet] = useState<Record<string, Greeting[]>>({}), [note, setNote] = useState(''), [naming, setNaming] = useState(false);
  const [name, setName] = useState(''), [error, setError] = useState(''), [paused, setPaused] = useState(false);
  const candidate = RESCUES[selected], observations = met[candidate.id] ?? [];
  useEffect(() => { const changed = () => setPaused(document.hidden); document.addEventListener('visibilitychange', changed); return () => document.removeEventListener('visibilitychange', changed); }, []);
  function select(index: number) { setSelected(index); setEncounter(null); setBusy(false); setNote(''); setNaming(false); setError(''); }
  function greet(kind: Greeting) { setBusy(true); setNote('Give them a moment. Watch how they choose to approach.'); setEncounter({ id: Date.now(), kind }); }
  function finish(kind: Greeting) { setBusy(false); setMet(current => ({ ...current, [candidate.id]: [...new Set([...(current[candidate.id] ?? []), kind])] })); setNote(candidate.observations[kind]); }
  return <main className="shelter-visit" data-candidate={candidate.id} data-met={observations.length > 0}>
    <div className="shelter-scene"><Canvas shadows dpr={[1, 1.5]} camera={{ position: [-2, 3.4, 6.3], fov: 47 }}><Suspense fallback={null}><ShelterWorld selected={selected} encounter={encounter} onMet={finish} paused={paused}/></Suspense></Canvas></div>
    <header className="shelter-header"><div><span className="legacy-eyebrow">Chapter one / A new beginning</span><h1>Larchwood Rescue</h1><p>Your first partner. The beginning of {kennelName}.</p></div><button onClick={onBack}>Back to the kennel</button></header>
    <section className="shelter-card" aria-label="Meet your rescue">
      <nav className="shelter-dogs" aria-label="Rescue dogs">{RESCUES.map((dog, i) => <button key={dog.id} aria-pressed={selected === i} onClick={() => select(i)}><span style={{ background: dog.collar }}/>{dog.name}{met[dog.id]?.length ? <small>Met</small> : null}</button>)}</nav>
      <div className="shelter-details"><span className="legacy-eyebrow">{candidate.sex} · About {candidate.ageMonths < 24 ? '1½' : '2'} years old</span><h2>{candidate.name}</h2><p>{candidate.description}</p><p className="shelter-intake">{candidate.intake}</p>
        {naming ? <form onSubmit={e => { e.preventDefault(); const clean = name.trim(); if (clean.length < 2 || clean.length > 24) { setError('Choose a name with 2 to 24 characters.'); return; } onAdopt(candidate, clean, observations); }}>
          <label htmlFor="rescue-name">What will you call your dog?</label><input autoFocus id="rescue-name" value={name} onChange={e => setName(e.target.value)} maxLength={24} autoComplete="off"/>
          <p>You can keep {candidate.name}’s name or choose a new one. This dog will be the founding companion of {kennelName}.</p>
          <p className="shelter-intake">Your first adoption is covered. A prepared bed and your time are what this dog needs today.</p>
          {error && <p role="alert">{error}</p>}<button className="legacy-primary" type="submit">Adopt and head home</button><button className="shelter-text-button" type="button" onClick={() => setNaming(false)}>Keep getting to know each other</button>
        </form> : <>
          <div className="shelter-actions" aria-label="Spend time together"><button disabled={busy} onClick={() => greet('quiet')}>Wait quietly nearby</button><button disabled={busy} onClick={() => greet('toy')}>Offer a toy</button><button disabled={busy} onClick={() => greet('call')}>Invite closer</button></div>
          <p className="shelter-observation" role="status">{note || 'Take a moment together. There are no scores here—just a chance to notice who they are.'}</p>
          <button className="legacy-primary" disabled={!observations.length || busy} onClick={() => { setName(candidate.name); setNaming(true); }}>Choose {candidate.name}</button>
          <p className="shelter-footnote">Their full potential is still a mystery. Bonding and training will help you discover it.</p>
        </>}
      </div>
    </section>
  </main>;
}
