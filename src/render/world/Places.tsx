import { useMemo } from 'react';
import * as THREE from 'three';
import type { Field } from '../../sim/field';
import { heightAt, scatter } from './terrain';
import { useSignTexture } from './Yard';

/** Mara's orchard, the village green and Larchwood Rescue. */

const at = (x: number, z: number, lift = 0): [number, number, number] => [
  x,
  heightAt(x, z) + lift,
  z,
];

function AppleTree({ x, z, seed }: { x: number; z: number; seed: number }) {
  const apples = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        p: [
          (scatter(seed, i) - 0.5) * 2.6,
          2.4 + scatter(seed, i + 9) * 1.2,
          (scatter(seed, i + 19) - 0.5) * 2.6,
        ] as [number, number, number],
      })),
    [seed],
  );
  return (
    <group position={at(x, z)}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.8, 7]} />
        <meshStandardMaterial color="#6e4b34" />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial color={seed % 2 ? '#5d8c3f' : '#679846'} flatShading />
      </mesh>
      {apples.map((a, i) => (
        <mesh key={i} position={a.p}>
          <sphereGeometry args={[0.11, 8, 6]} />
          <meshStandardMaterial color={i % 3 ? '#c8413a' : '#e2b23a'} />
        </mesh>
      ))}
    </group>
  );
}

function Cottage({ x, z, name }: { x: number; z: number; name: string }) {
  const sign = useSignTexture([name], { bg: '#5b6e4e' });
  return (
    <group position={at(x, z)}>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 3.2, 5.5]} />
        <meshStandardMaterial color="#e8dcc2" roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.9, 0]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 1]} castShadow>
        <boxGeometry args={[3.2, 3.2, 6]} />
        <meshStandardMaterial color="#8c4a3a" />
      </mesh>
      <mesh position={[0, 1, -2.78]}>
        <boxGeometry args={[1.1, 2, 0.05]} />
        <meshStandardMaterial color="#38546b" />
      </mesh>
      <mesh position={[0, 2.6, -2.8]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshStandardMaterial map={sign} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Hedge({ fromX, toX, z }: { fromX: number; toX: number; z: number }) {
  const pieces = [];
  for (let x = fromX; x < toX; x += 5) pieces.push(x);
  return (
    <>
      {pieces.map((x, i) => (
        <mesh key={i} position={at(x + 2.5, z, 0.8)} castShadow receiveShadow>
          <boxGeometry args={[5.4, 1.8 + scatter(x, z) * 0.5, 2]} />
          <meshStandardMaterial color={i % 2 ? '#4c6f34' : '#557a39'} roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

export function Orchard({ field }: { field: Field }) {
  return (
    <>
      {field.trees.map((t, i) => (
        <AppleTree key={i} x={t.pos.x} z={t.pos.z} seed={i + 3} />
      ))}
      <Hedge fromX={field.minX} toX={field.maxX} z={field.minZ - 1} />
      <Cottage x={-24} z={22} name="Orchard Cottage" />
      <mesh position={at(18, 20, 1)} castShadow>
        <boxGeometry args={[2.2, 2, 4.6]} />
        <meshStandardMaterial color="#3f6e8c" />
      </mesh>
    </>
  );
}

function Tent({ x, z, colour }: { x: number; z: number; colour: string }) {
  return (
    <group position={at(x, z)}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[4, 2.2, 3]} />
        <meshStandardMaterial color="#f6f1e6" />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[3, 1.4, 4]} />
        <meshStandardMaterial color={colour} />
      </mesh>
    </group>
  );
}

function Bunting({ from, to }: { from: [number, number]; to: [number, number] }) {
  const flags = useMemo(() => {
    const out: { x: number; z: number; c: string }[] = [];
    const colours = ['#d9622b', '#f4d35e', '#5b86a6', '#e8a0b4', '#3f8a4f'];
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({
        x: from[0] + (to[0] - from[0]) * t,
        z: from[1] + (to[1] - from[1]) * t,
        c: colours[i % colours.length]!,
      });
    }
    return out;
  }, [from, to]);
  return (
    <>
      {[from, to].map(([x, z], i) => (
        <mesh key={i} position={at(x, z, 1.75)} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3.5, 6]} />
          <meshStandardMaterial color="#e8e2d4" />
        </mesh>
      ))}
      {flags.map((f, i) => (
        <mesh
          key={i}
          position={at(f.x, f.z, 3.1 - Math.sin((i / (flags.length - 1)) * Math.PI) * 0.6)}
          rotation={[0, Math.atan2(to[0] - from[0], to[1] - from[1]), 0]}
        >
          <coneGeometry args={[0.18, 0.4, 3]} />
          <meshStandardMaterial color={f.c} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Spectators() {
  const people = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: -30 + i * 2.9 + (scatter(i, 4) - 0.5),
        z: 21 + scatter(i, 5) * 1.5,
        c: ['#5b86a6', '#c0583a', '#3f8a4f', '#8a6aa8', '#d9a03a', '#6b6b6b'][i % 6]!,
        h: 1.5 + scatter(i, 6) * 0.3,
      })),
    [],
  );
  return (
    <>
      {people.map((p, i) => (
        <group key={i} position={at(p.x, p.z)}>
          <mesh position={[0, p.h * 0.45, 0]} castShadow>
            <capsuleGeometry args={[0.22, p.h * 0.5, 4, 8]} />
            <meshStandardMaterial color={p.c} />
          </mesh>
          <mesh position={[0, p.h * 0.92, 0]} castShadow>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color="#e5b994" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Bunting, spectators and the banner; shared by both versions of the green. */
export function VillageGreenExtras() {
  const banner = useSignTexture(['Village Fun Day', 'marks · search · blind'], { bg: '#3f6e8c' });
  return (
    <>
      <Bunting from={[-40, 18]} to={[-4, 18]} />
      <Bunting from={[4, 18]} to={[40, 18]} />
      <Spectators />
      <mesh position={at(0, 24, 3.4)}>
        <planeGeometry args={[6, 1.6]} />
        <meshStandardMaterial map={banner} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

export function VillageGreen({ field }: { field: Field }) {
  return (
    <>
      <Tent x={-26} z={26} colour="#d9622b" />
      <Tent x={22} z={27} colour="#5b86a6" />
      <Tent x={-6} z={30} colour="#3f8a4f" />
      <VillageGreenExtras />
      {field.trees.map((t, i) => (
        <group key={i} position={at(t.pos.x, t.pos.z)}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.45, 3.2, 8]} />
            <meshStandardMaterial color="#6b4a33" />
          </mesh>
          <mesh position={[0, 4.4, 0]} castShadow>
            <icosahedronGeometry args={[2.6, 1]} />
            <meshStandardMaterial color="#5f8a3c" flatShading />
          </mesh>
        </group>
      ))}
      <Hedge fromX={field.minX} toX={field.maxX} z={field.minZ - 1} />
    </>
  );
}

export function Shelter({ field }: { field: Field }) {
  const sign = useSignTexture(['Larchwood Rescue', 'every dog deserves a home'], { bg: '#5b6e4e' });
  const fence = [];
  for (let x = field.minX; x <= field.maxX; x += 2) fence.push({ x, z: field.minZ });
  for (let z = field.minZ; z <= field.maxZ; z += 2)
    fence.push({ x: field.minX, z }, { x: field.maxX, z });
  return (
    <>
      <group position={at(0, field.minZ - 6)}>
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[22, 4, 7]} />
          <meshStandardMaterial color="#d8cdb6" />
        </mesh>
        <mesh position={[0, 4.4, 0]} castShadow>
          <boxGeometry args={[23, 0.6, 8]} />
          <meshStandardMaterial color="#5b6e4e" />
        </mesh>
        <mesh position={[0, 3, 3.56]}>
          <planeGeometry args={[7, 1.6]} />
          <meshStandardMaterial map={sign} />
        </mesh>
      </group>
      {fence.map((p, i) => (
        <mesh key={i} position={at(p.x, p.z, 0.6)} castShadow>
          <boxGeometry args={[0.12, 1.2, 0.12]} />
          <meshStandardMaterial color="#8a6a4d" />
        </mesh>
      ))}
      <mesh position={at(6, -2, 0.02)} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 16]} />
        <meshStandardMaterial color="#c9b98f" />
      </mesh>
    </>
  );
}
