import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { wallsOf, type HerdingSetup, type Segment } from '../../sim/herding';
import { live } from '../../app/store';
import { heightAt } from './terrain';
import { numberTexture } from './Agility';

/**
 * Sheep work, built in code: woolly sheep that trot, bunch and graze, the
 * wooden hurdles of each pair of gates, the pen with its wings, and the
 * handler's post.
 */
const WOOL = '#f1ebdd';
const FACE = '#3a332d';
const WOOD = '#8a6a4d';

function SheepModel({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const phase = useRef(index * 1.7);
  useFrame((_, dt) => {
    const g = group.current;
    const sh = live.herding?.sheep[index];
    if (!g) return;
    g.visible = !!sh;
    if (!sh) return;
    const speed = Math.hypot(sh.vel.x, sh.vel.z);
    phase.current += dt * (2 + speed * 3.4);
    g.position.set(
      sh.pos.x,
      heightAt(sh.pos.x, sh.pos.z) +
        Math.abs(Math.sin(phase.current)) * Math.min(0.06, speed * 0.02),
      sh.pos.z,
    );
    g.rotation.y = sh.heading;
    const swing = Math.min(0.75, speed * 0.28);
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(phase.current + (i % 3 === 0 ? 0 : Math.PI)) * swing;
    });
    // Heads go down to graze when nothing is worrying them.
    if (head.current) {
      const want = sh.alarm < 0.08 && speed < 0.4 ? 0.95 : sh.alarm > 0.5 ? -0.15 : 0.1;
      head.current.rotation.x += (want - head.current.rotation.x) * Math.min(1, dt * 4);
    }
  });
  return (
    <group ref={group} scale={1.3}>
      <mesh position={[0, 0.62, 0]} scale={[0.42, 0.4, 0.62]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={WOOL} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.72, -0.5]} scale={[0.2, 0.2, 0.2]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={WOOL} roughness={1} flatShading />
      </mesh>
      <group ref={head} position={[0, 0.82, 0.5]}>
        <mesh position={[0, 0.02, 0.2]} castShadow>
          <boxGeometry args={[0.2, 0.22, 0.34]} />
          <meshStandardMaterial color={FACE} roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.15, 0.1, 0.08]} rotation={[0, 0, side * 0.5]}>
            <boxGeometry args={[0.14, 0.04, 0.08]} />
            <meshStandardMaterial color={FACE} roughness={0.9} />
          </mesh>
        ))}
      </group>
      {[
        [-0.2, 0.34],
        [0.2, 0.34],
        [-0.2, -0.34],
        [0.2, -0.34],
      ].map(([x, z], i) => (
        <group key={i} ref={(g) => void (legs.current[i] = g)} position={[x!, 0.42, z!]}>
          <mesh position={[0, -0.21, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.04, 0.42, 6]} />
            <meshStandardMaterial color={FACE} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** One wooden hurdle panel along a segment. */
function Hurdle({ seg }: { seg: Segment }) {
  const mx = (seg.a.x + seg.b.x) / 2;
  const mz = (seg.a.z + seg.b.z) / 2;
  const len = Math.hypot(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
  const rot = Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
  return (
    <group position={[mx, heightAt(mx, mz), mz]} rotation={[0, rot, 0]}>
      {[-len / 2, 0, len / 2].map((z) => (
        <mesh key={z} position={[0, 0.55, z]} castShadow>
          <boxGeometry args={[0.09, 1.1, 0.09]} />
          <meshStandardMaterial color={WOOD} roughness={0.9} />
        </mesh>
      ))}
      {[0.3, 0.62, 0.94].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.05, 0.1, len]} />
          <meshStandardMaterial color="#a5835f" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Marker({ x, z, n }: { x: number; z: number; n: number }) {
  const sprite = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => numberTexture(n), [n]);
  useFrame((state) => {
    const s = sprite.current;
    const session = live.herding;
    if (!s) return;
    const now = !!session && session.phase !== 'complete' && session.task === n - 1;
    const done = !!session && session.task > n - 1;
    s.material.color.set(now ? '#ffb347' : done ? '#9fb7a2' : '#ffffff');
    s.material.opacity = done ? 0.55 : 1;
    s.scale.setScalar(1.5 * (now ? 1.2 + Math.sin(state.clock.elapsedTime * 5) * 0.1 : 1));
  });
  return (
    <sprite ref={sprite} position={[x, heightAt(x, z) + 2.4, z]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

export function HerdingView({ setup }: { setup: HerdingSetup }) {
  const walls = useMemo(() => wallsOf(setup), [setup]);
  const pen = setup.pen;
  return (
    <>
      {Array.from({ length: setup.sheep }, (_, i) => (
        <SheepModel key={i} index={i} />
      ))}
      {walls.map((w, i) => (
        <Hurdle key={i} seg={w} />
      ))}
      {setup.gates.map((g, i) => (
        <Marker key={i} x={(g.a.x + g.b.x) / 2} z={(g.a.z + g.b.z) / 2} n={i + 1} />
      ))}
      <Marker x={pen.center.x} z={pen.center.z} n={setup.gates.length + 1} />
      <mesh
        position={[pen.center.x, heightAt(pen.center.x, pen.center.z) + 0.03, pen.center.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[pen.size - 0.2, pen.size - 0.2]} />
        <meshStandardMaterial color="#d8c27a" roughness={1} />
      </mesh>
      <mesh
        position={[setup.post.x + 0.9, heightAt(setup.post.x, setup.post.z) + 0.6, setup.post.z]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.07, 1.2, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
    </>
  );
}
