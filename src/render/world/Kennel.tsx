import { useMemo } from 'react';
import * as THREE from 'three';
import { heightAt } from './terrain';

/**
 * Grandpa's kennel behind the starting line: the farmhouse, the old kennel
 * block with its empty runs, and the gate into the training field. Kept
 * simple and readable; it frames the field and reminds you whose place this is.
 */
function Roof({ width, depth, height, colour }: { width: number; depth: number; height: number; colour: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 - 0.4, 0);
    shape.lineTo(width / 2 + 0.4, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: depth + 0.8, bevelEnabled: false });
    g.translate(0, 0, -(depth + 0.8) / 2);
    return g;
  }, [width, depth, height]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={colour} roughness={0.8} />
    </mesh>
  );
}

function Window({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[1.1, 1.2, 0.08]} />
        <meshStandardMaterial color="#f3ead8" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.9, 1, 0.05]} />
        <meshStandardMaterial color="#2c3b45" roughness={0.2} metalness={0.2} />
      </mesh>
    </group>
  );
}

function Farmhouse() {
  const x = -15;
  const z = 44;
  return (
    <group position={[x, heightAt(x, z), z]} rotation={[0, 0.08, 0]}>
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[11, 5.2, 7]} />
        <meshStandardMaterial color="#d6c9ae" roughness={0.95} />
      </mesh>
      <group position={[0, 5.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Roof width={7} depth={11} height={3} colour="#4b4f57" />
      </group>
      <mesh position={[3.2, 7.4, 1]} castShadow>
        <boxGeometry args={[0.9, 2.4, 0.9]} />
        <meshStandardMaterial color="#9c8a74" />
      </mesh>
      <mesh position={[0, 1.15, -3.52]}>
        <boxGeometry args={[1.3, 2.3, 0.1]} />
        <meshStandardMaterial color="#3f5a46" />
      </mesh>
      <Window position={[-3, 1.6, -3.53]} />
      <Window position={[3, 1.6, -3.53]} />
      <Window position={[-3, 3.9, -3.53]} />
      <Window position={[3, 3.9, -3.53]} />
    </group>
  );
}

function KennelBlock() {
  const x = 13;
  const z = 42;
  const runs = 6;
  return (
    <group position={[x, heightAt(x, z), z]} rotation={[0, -0.05, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[15, 3, 4.5]} />
        <meshStandardMaterial color="#8b5e3f" roughness={0.9} />
      </mesh>
      <group position={[0, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Roof width={4.5} depth={15} height={1.6} colour="#6e3f33" />
      </group>
      {Array.from({ length: runs }, (_, i) => {
        const rx = -7.5 + 1.25 + i * 2.5;
        return (
          <group key={i} position={[rx, 0, -2.25]}>
            <mesh position={[0, 0.9, -0.01]}>
              <boxGeometry args={[0.9, 1.6, 0.05]} />
              <meshStandardMaterial color="#3a2a20" />
            </mesh>
            {[-1.2, 1.2].map((dx) => (
              <mesh key={dx} position={[dx, 0.75, -1.6]} castShadow>
                <boxGeometry args={[0.08, 1.5, 3.2]} />
                <meshStandardMaterial color="#9aa1a6" metalness={0.4} roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[0, 0.75, -3.2]}>
              <boxGeometry args={[2.4, 1.5, 0.05]} />
              <meshStandardMaterial color="#b5bcc1" transparent opacity={0.35} metalness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Gate() {
  const z = 26;
  return (
    <group position={[0, heightAt(0, z), z]}>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.2, 0]} castShadow>
          <boxGeometry args={[0.7, 2.4, 0.7]} />
          <meshStandardMaterial color="#b4aa96" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[5.9, 0.7, 0.18]} />
        <meshStandardMaterial color="#2f3d33" />
      </mesh>
      {[-26, 26].map((side) =>
        Array.from({ length: 9 }, (_, i) => {
          const x = Math.sign(side) * (3.4 + i * 2.8);
          return (
            <group key={`${side}${i}`} position={[x, 0, 0]}>
              <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[0.15, 1.2, 0.15]} />
                <meshStandardMaterial color="#7a5a40" />
              </mesh>
              <mesh position={[Math.sign(side) * 1.4, 0.85, 0]} castShadow>
                <boxGeometry args={[2.8, 0.12, 0.08]} />
                <meshStandardMaterial color="#8a6a4d" />
              </mesh>
              <mesh position={[Math.sign(side) * 1.4, 0.45, 0]}>
                <boxGeometry args={[2.8, 0.12, 0.08]} />
                <meshStandardMaterial color="#8a6a4d" />
              </mesh>
            </group>
          );
        }),
      )}
    </group>
  );
}

export function Kennel() {
  return (
    <>
      <Farmhouse />
      <KennelBlock />
      <Gate />
    </>
  );
}
