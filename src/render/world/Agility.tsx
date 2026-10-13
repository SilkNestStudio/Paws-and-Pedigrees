import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec2 } from '../../core/math';
import { OBSTACLE_LENGTH, type AgilityCourse, type Obstacle } from '../../sim/agility';
import { RING_HALF } from '../../sim/courses';
import { live } from '../../app/store';
import { heightAt } from './terrain';

/**
 * Agility equipment, built in code: striped jumps whose bars really fall, a
 * ribbed tunnel, weave poles, and an A-frame with yellow contacts. Each
 * obstacle faces along its direction of travel (local +z).
 */
const RED = '#c8452f';
const BLUE = '#3f6fb5';
const WHITE = '#f6f1e4';
const YELLOW = '#f0c23a';

const numberTextures = new Map<number, THREE.Texture>();
export function numberTexture(n: number): THREE.Texture {
  const cached = numberTextures.get(n);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2f3d33';
  ctx.stroke();
  ctx.fillStyle = '#2f3d33';
  ctx.font = '700 76px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  numberTextures.set(n, texture);
  return texture;
}

function Jump({ index }: { index: number }) {
  const bar = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = bar.current;
    if (!m) return;
    const down = !!live.agility?.knocked.includes(index);
    m.position.set(down ? 0.12 : 0, down ? 0.05 : 0.5, down ? 0.45 : 0);
    m.rotation.y = down ? 0.25 : 0;
  });
  return (
    <>
      {[-0.78, 0.78].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.09, 1.1, 0.09]} />
            <meshStandardMaterial color={WHITE} roughness={0.7} />
          </mesh>
          {[0.25, 0.7].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[0.1, 0.16, 0.1]} />
              <meshStandardMaterial color={index % 2 ? BLUE : RED} roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[Math.sign(x) * 0.22, 0.32, 0]} castShadow>
            <boxGeometry args={[0.4, 0.64, 0.05]} />
            <meshStandardMaterial color={index % 2 ? BLUE : RED} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh ref={bar} position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
        <meshStandardMaterial color={WHITE} roughness={0.6} />
      </mesh>
    </>
  );
}

function Tunnel() {
  const length = OBSTACLE_LENGTH.tunnel;
  const ribs = Math.floor(length / 0.5);
  return (
    <>
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.66, 0.66, length, 20, 1, true]} />
        <meshStandardMaterial color={BLUE} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: ribs + 1 }, (_, i) => (
        <mesh key={i} position={[0, 0.62, -length / 2 + (i * length) / ribs]}>
          <torusGeometry args={[0.67, 0.035, 6, 20]} />
          <meshStandardMaterial color="#2c4f86" roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) =>
        [-1.4, 1.4].map((z) => (
          <mesh key={`${side}${z}`} position={[side * 0.72, 0.09, z]} castShadow>
            <boxGeometry args={[0.3, 0.18, 0.5]} />
            <meshStandardMaterial color="#b9a987" roughness={1} />
          </mesh>
        )),
      )}
    </>
  );
}

function Weave() {
  const count = 12;
  const gap = 0.45;
  const span = (count - 1) * gap;
  return (
    <>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.08, 0.03, span + 0.3]} />
        <meshStandardMaterial color="#7d7f86" roughness={0.6} />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[0, 0.5, -span / 2 + i * gap]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
          <meshStandardMaterial color={i % 2 ? WHITE : RED} roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

function Frame() {
  const half = OBSTACLE_LENGTH.frame / 2;
  const apex = 1.5;
  const plank = Math.hypot(half, apex);
  const tilt = Math.atan2(apex, half);
  return (
    <>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[0, apex / 2, (side * half) / 2]}
          rotation={[side * tilt, 0, 0]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.95, 0.06, plank]} />
            <meshStandardMaterial color={RED} roughness={0.9} />
          </mesh>
          {/* The contact zone at the bottom of each side. */}
          <mesh position={[0, 0.005, side * (plank / 2 - 0.5)]}>
            <boxGeometry args={[0.96, 0.065, 1]} />
            <meshStandardMaterial color={YELLOW} roughness={0.9} />
          </mesh>
          {[-0.6, 0, 0.6].map((z) => (
            <mesh key={z} position={[0, 0.04, z]}>
              <boxGeometry args={[0.9, 0.025, 0.04]} />
              <meshStandardMaterial color="#8c2f20" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function ObstacleView({
  obstacle,
  index,
  numbered,
}: {
  obstacle: Obstacle;
  index: number;
  numbered: boolean;
}) {
  const sprite = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => numberTexture(index + 1), [index]);
  useFrame((state) => {
    const s = sprite.current;
    if (!s) return;
    const session = live.agility;
    const next = !!session && session.phase !== 'complete' && session.next === index;
    const done = !!session && session.next > index;
    s.material.color.set(next ? '#ffb347' : done ? '#9fb7a2' : '#ffffff');
    s.material.opacity = done ? 0.55 : 1;
    const pulse = next ? 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12 : 1;
    s.scale.setScalar(0.72 * pulse * (next ? 1.25 : 1));
  });
  const { pos, heading, kind } = obstacle;
  const back = -(OBSTACLE_LENGTH[kind] / 2 + 0.2);
  return (
    <group position={[pos.x, heightAt(pos.x, pos.z), pos.z]} rotation={[0, heading, 0]}>
      {kind === 'jump' && <Jump index={index} />}
      {kind === 'tunnel' && <Tunnel />}
      {kind === 'weave' && <Weave />}
      {kind === 'frame' && <Frame />}
      {numbered && (
        <sprite
          ref={sprite}
          position={[kind === 'jump' ? 1.25 : 1.05, kind === 'frame' ? 1.1 : 1.75, back]}
        >
          <spriteMaterial map={texture} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}

/**
 * A course standing in its ring. `idle` is the equipment seen from the yard
 * between sessions: no numbers and no start circle, so nothing looks like a
 * place to walk to.
 */
export function AgilityCourseView({
  course,
  idle = false,
}: {
  course: AgilityCourse;
  idle?: boolean;
}) {
  return (
    <>
      {course.obstacles.map((o, i) => (
        <ObstacleView key={`${course.id}-${i}`} obstacle={o} index={i} numbered={!idle} />
      ))}
      {idle ? null : <StartCircle course={course} />}
    </>
  );
}

function StartCircle({ course }: { course: AgilityCourse }) {
  return (
    <>
      <mesh
        position={[course.start.x, heightAt(course.start.x, course.start.z) + 0.04, course.start.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.75, 0.92, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </>
  );
}

/** Posts and a rope round the ring. */
export function AgilityRing({ center }: { center: Vec2 }) {
  const { posts, ropes } = useMemo(() => {
    const hx = RING_HALF.x + 1.5;
    const hz = RING_HALF.z + 1.5;
    const corners: [number, number][] = [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ];
    const posts: Vec2[] = [];
    const ropes: { mid: Vec2; length: number; rot: number }[] = [];
    corners.forEach(([x, z], i) => {
      const [nx, nz] = corners[(i + 1) % 4]!;
      const n = Math.round(Math.hypot(nx - x, nz - z) / 4.8);
      for (let k = 0; k < n; k++) {
        const a = { x: center.x + x + ((nx - x) * k) / n, z: center.z + z + ((nz - z) * k) / n };
        const b = {
          x: center.x + x + ((nx - x) * (k + 1)) / n,
          z: center.z + z + ((nz - z) * (k + 1)) / n,
        };
        posts.push(a);
        ropes.push({
          mid: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
          length: Math.hypot(b.x - a.x, b.z - a.z),
          rot: Math.atan2(b.x - a.x, b.z - a.z),
        });
      }
    });
    return { posts, ropes };
  }, [center]);
  return (
    <>
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, heightAt(p.x, p.z) + 0.45, p.z]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.9, 6]} />
          <meshStandardMaterial color={WHITE} roughness={0.8} />
        </mesh>
      ))}
      {ropes.map((r, i) => (
        <mesh
          key={i}
          position={[r.mid.x, heightAt(r.mid.x, r.mid.z) + 0.78, r.mid.z]}
          rotation={[0, r.rot, 0]}
        >
          <boxGeometry args={[0.025, 0.025, r.length]} />
          <meshStandardMaterial color="#d9622b" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}
