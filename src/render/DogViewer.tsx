import { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { createRng } from '../core/rng';
import { breedDescription, coatOf, generateShelterTrio, type Dog } from '../core/dog/dog';
import type { Pose, Tell } from '../sim/agents';
import { DogModel, type DogView } from './dog/DogModel';
import { KeeperModel } from './KeeperModel';

/**
 * Development page for looking at dogs up close: /?view=dogs&seed=3
 * Shows a few generated dogs in each pose so the model and coat shader can
 * be checked and tuned. Not part of the game.
 */
const POSES: { label: string; pose: Pose; speed: number; tell: Tell }[] = [
  { label: 'Stand', pose: 'stand', speed: 0, tell: { ears: 'forward', tail: 'wag', noseDown: false, text: '' } },
  { label: 'Sit', pose: 'sit', speed: 0, tell: { ears: 'neutral', tail: 'wag', noseDown: false, text: '' } },
  { label: 'Down', pose: 'down', speed: 0, tell: { ears: 'neutral', tail: 'low', noseDown: false, text: '' } },
  { label: 'Walk', pose: 'stand', speed: 1.2, tell: { ears: 'neutral', tail: 'wag', noseDown: false, text: '' } },
  { label: 'Trot', pose: 'stand', speed: 3.5, tell: { ears: 'neutral', tail: 'neutral', noseDown: false, text: '' } },
  { label: 'Gallop', pose: 'stand', speed: 8, tell: { ears: 'back', tail: 'neutral', noseDown: false, text: '' } },
  { label: 'Sniff', pose: 'stand', speed: 0.6, tell: { ears: 'forward', tail: 'high', noseDown: true, text: '' } },
  { label: 'Creep', pose: 'crouch', speed: 0, tell: { ears: 'forward', tail: 'high', noseDown: false, text: '' } },
];

function ViewerDog({ dog, x, poseIndex }: { dog: Dog; x: number; poseIndex: number }) {
  const p = POSES[poseIndex]!;
  const view = useMemo(() => {
    const v: DogView = { pos: { x, z: 0 }, heading: Math.PI / 2, speed: p.speed, pose: p.pose, tell: p.tell, lookAt: null, carrying: null, groundY: 0 };
    return v;
  }, [x, p]);
  return <DogModel dog={dog} view={() => view} />;
}

function Turntable({ children, spin }: { children: React.ReactNode; spin: boolean }) {
  const group = useMemo(() => new THREE.Group(), []);
  useFrame((_, dt) => {
    if (spin) group.rotation.y += dt * 0.4;
  });
  return <primitive object={group}>{children}</primitive>;
}

export default function DogViewer() {
  const params = new URLSearchParams(location.search);
  const [seed, setSeed] = useState(Number(params.get('seed') ?? 1));
  const [poseIndex, setPoseIndex] = useState(Number(params.get('pose') ?? 0));
  const [spin, setSpin] = useState(false);
  const dogs = useMemo(() => generateShelterTrio(createRng(seed)), [seed]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#dfe7d8' }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: params.get('cam') === 'close' ? [0.9, 0.55, 1.3] : [0, 1.4, 4.2], fov: 40 }}
      >
        <color attach="background" args={['#e9efe2']} />
        <hemisphereLight args={['#dfeaf5', '#6d7f52', 1.2]} />
        <directionalLight position={[3, 6, 4]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[8, 48]} />
          <meshStandardMaterial color="#9bbd73" />
        </mesh>
        <Turntable spin={spin}>
          {dogs.map((dog, i) => (
            <ViewerDog key={`${seed}-${i}`} dog={dog} x={(i - 1) * 1.4} poseIndex={poseIndex} />
          ))}
          {params.get('keeper') && (
            <KeeperModel view={() => ({ pos: { x: 2.4, z: 0 }, heading: 0, speed: 0, action: 'none', actionTime: 9, signalHeading: 0, watch: null })} />
          )}
        </Turntable>
        <OrbitControls target={params.get('cam') === 'close' ? [0, 0.35, 0] : [0, 0.4, 0]} />
      </Canvas>
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap', fontFamily: 'system-ui' }}>
        {POSES.map((p, i) => (
          <button key={p.label} onClick={() => setPoseIndex(i)} style={{ fontWeight: i === poseIndex ? 800 : 400 }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setSeed((s) => s + 1)}>Next dogs</button>
        <button onClick={() => setSpin((s) => !s)}>Spin</button>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10, fontFamily: 'system-ui', fontSize: 13, background: '#fffc', padding: 8, borderRadius: 8 }}>
        seed {seed}:{' '}
        {dogs.map((d) => `${d.name} — ${coatOf(d).name} (${breedDescription(d)})`).join(' · ')}
      </div>
    </div>
  );
}
