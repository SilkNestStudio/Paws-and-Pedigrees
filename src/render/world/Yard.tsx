import { useMemo } from 'react';
import * as THREE from 'three';
import { heightAt, scatter } from './terrain';

/**
 * Grandpa's yard: everything you walk up to at home. Positions match the
 * interaction spots in src/sim/home.ts.
 */

/** A canvas texture with painted lettering, for signs. */
export function useSignTexture(
  lines: string[],
  options: { bg?: string; fg?: string; width?: number; height?: number } = {},
) {
  const { bg = '#2f3d33', fg = '#f3ead8', width = 512, height = 256 } = options;
  const key = lines.join('|');
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.globalAlpha = 1;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = lines.length > 1 ? height * 0.24 : height * 0.32;
    lines.forEach((line, i) => {
      ctx.font = `${i === 0 ? 700 : 500} ${i === 0 ? size : size * 0.7}px Georgia, serif`;
      const y = height / 2 + (i - (lines.length - 1) / 2) * size * 1.15;
      ctx.fillText(line, width / 2, y, width - 40);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bg, fg, width, height]);
}

function Sign({
  lines,
  position,
  rotation = 0,
  width = 2.4,
  height = 1.2,
  post = 1.4,
}: {
  lines: string[];
  position: [number, number, number];
  rotation?: number;
  width?: number;
  height?: number;
  post?: number;
}) {
  const texture = useSignTexture(lines);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-width * 0.38, width * 0.38].map((x) => (
        <mesh key={x} position={[x, post / 2, 0]} castShadow>
          <boxGeometry args={[0.12, post + height * 0.5, 0.12]} />
          <meshStandardMaterial color="#6d4c35" />
        </mesh>
      ))}
      <mesh position={[0, post + height / 2, 0.07]} castShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial color="#2f3d33" />
      </mesh>
      {[0.12, -0.12].map((z) => (
        <mesh key={z} position={[0, post + height / 2, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[width * 0.96, height * 0.92]} />
          <meshStandardMaterial map={texture} />
        </mesh>
      ))}
    </group>
  );
}

const at = (x: number, z: number, lift = 0): [number, number, number] => [
  x,
  heightAt(x, z) + lift,
  z,
];

function PantryShed() {
  return (
    <group position={at(22.5, 60)}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.4, 4]} />
        <meshStandardMaterial color="#9a6b48" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[0, 0, 0.12]} castShadow>
        <boxGeometry args={[3.6, 0.15, 4.6]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
      <mesh position={[0, 0.95, -2.02]}>
        <boxGeometry args={[1.2, 1.9, 0.06]} />
        <meshStandardMaterial color="#4b6447" />
      </mesh>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x - 0.2, 0.35, -2.6]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.7, 10]} />
          <meshStandardMaterial color="#c9a46b" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Van() {
  return (
    <group position={at(26, 72.5)} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.5, 4.6]} />
        <meshStandardMaterial color="#3f6e8c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.95, 0.6]} castShadow>
        <boxGeometry args={[2.1, 0.6, 3]} />
        <meshStandardMaterial color="#3f6e8c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.9, 2.15]}>
        <boxGeometry args={[1.9, 0.6, 0.05]} />
        <meshStandardMaterial color="#26333d" roughness={0.2} />
      </mesh>
      {[
        [-1.1, 1.6],
        [1.1, 1.6],
        [-1.1, -1.6],
        [1.1, -1.6],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.42, z!]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.3, 14]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      <mesh position={[1.12, 1.1, -0.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 0.5]} />
        <meshStandardMaterial color="#f3ead8" />
      </mesh>
    </group>
  );
}

function Noticeboard() {
  const texture = useSignTexture(['NOTICES', 'jobs · lost & found'], { bg: '#6d4c35' });
  return (
    <group position={at(5, 46.6)} rotation={[0, Math.PI, 0]}>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 1, 0]} castShadow>
          <boxGeometry args={[0.12, 2, 0.12]} />
          <meshStandardMaterial color="#5a3e2b" />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[2, 1.1, 0.1]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      {[-0.55, 0.05, 0.55].map((x, i) => (
        <mesh
          key={x}
          position={[x, 1.35 - (i % 2) * 0.1, -0.06]}
          rotation={[0, Math.PI, (i - 1) * 0.08]}
        >
          <planeGeometry args={[0.38, 0.48]} />
          <meshStandardMaterial color={['#fdf6e3', '#f3e2bd', '#fff'][i]} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function FoodBowl({ filled }: { filled: boolean }) {
  return (
    <group position={at(13.5, 53.4)}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.24, 0.16, 18]} />
        <meshStandardMaterial color="#c0583a" roughness={0.5} />
      </mesh>
      {filled && (
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.05, 16]} />
          <meshStandardMaterial color="#8a5a35" roughness={1} />
        </mesh>
      )}
      <mesh position={[0.9, 0.08, 0.1]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.16, 18]} />
        <meshStandardMaterial color="#5b86a6" roughness={0.5} />
      </mesh>
      <mesh position={[0.9, 0.15, 0.1]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 16]} />
        <meshStandardMaterial color="#9fd0ea" roughness={0.1} />
      </mesh>
      <mesh position={[-2.6, 0.04, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.8, 20]} />
        <meshStandardMaterial color="#b98e5f" />
      </mesh>
    </group>
  );
}

function ScentGarden({ restored }: { restored: boolean }) {
  const weeds = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        x: -30 + (scatter(i, 1) - 0.5) * 9,
        z: 49 + (scatter(i, 2) - 0.5) * 7,
        s: 0.6 + scatter(i, 3) * 0.9,
      })),
    [],
  );
  return (
    <group>
      {!restored &&
        weeds.map((w, i) => (
          <mesh key={i} position={at(w.x, w.z, w.s * 0.4)} castShadow>
            <coneGeometry args={[0.35 * w.s, 0.9 * w.s, 5]} />
            <meshStandardMaterial color={i % 3 ? '#6d7f3a' : '#87914a'} flatShading />
          </mesh>
        ))}
      {Array.from({ length: 4 }, (_, i) => (
        <group
          key={i}
          position={at(-33 + i * 2, 49 + (i % 2) * 1.2)}
          rotation={[0, restored ? 0 : (i - 1.5) * 0.5, restored ? 0 : 0.3]}
        >
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
            <meshStandardMaterial color={restored ? '#b88a5a' : '#7a6650'} />
          </mesh>
          {restored && (
            <mesh position={[0, 0.51, 0]}>
              <boxGeometry args={[0.4, 0.02, 0.4]} />
              <meshStandardMaterial color="#3a2c22" />
            </mesh>
          )}
        </group>
      ))}
      {[-35, -25].map((x) => (
        <mesh
          key={x}
          position={at(x, 45.5, 0.5)}
          rotation={[0, 0, restored ? 0 : x === -35 ? 0.4 : -0.2]}
          castShadow
        >
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#6d4c35" />
        </mesh>
      ))}
    </group>
  );
}

function Paths() {
  const pieces: { x: number; z: number; w: number; d: number }[] = [
    { x: 0, z: 66, w: 4, d: 32 }, // the drive
    { x: -8, z: 55.5, w: 18, d: 3 }, // to the house
    { x: 9, z: 55.5, w: 16, d: 3 }, // to the runs
    { x: 0, z: 47, w: 4, d: 4 }, // to the field gate
    { x: 14, z: 69, w: 24, d: 3.5 }, // to the van
  ];
  return (
    <>
      {pieces.map((p, i) => (
        <mesh key={i} position={at(p.x, p.z, 0.03)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial color="#cbb894" roughness={1} />
        </mesh>
      ))}
    </>
  );
}

function YardFence() {
  const posts = useMemo(() => {
    const out: { x: number; z: number; along: 'x' | 'z' }[] = [];
    for (let z = 46; z <= 82; z += 3) {
      out.push({ x: -40, z, along: 'z' }, { x: 40, z, along: 'z' });
    }
    for (let x = -40; x <= 40; x += 3) if (Math.abs(x) > 3) out.push({ x, z: 83, along: 'x' });
    return out;
  }, []);
  return (
    <>
      {posts.map((p, i) => (
        <group key={i} position={at(p.x, p.z)}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.15, 1.2, 0.15]} />
            <meshStandardMaterial color="#7a5a40" />
          </mesh>
          <mesh position={p.along === 'x' ? [1.5, 0.85, 0] : [0, 0.85, 1.5]} castShadow>
            <boxGeometry args={p.along === 'x' ? [3, 0.1, 0.08] : [0.08, 0.1, 3]} />
            <meshStandardMaterial color="#8a6a4d" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Flowers() {
  const colours = ['#e8a0b4', '#f4d35e', '#ffffff', '#b8a1e3', '#f08a5d'];
  const items = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => {
        const bed = i % 3;
        const base =
          bed === 0 ? { x: -16, z: 57 } : bed === 1 ? { x: 14, z: 63.5 } : { x: -3, z: 79 };
        return {
          x: base.x + (scatter(i, 11) - 0.5) * (bed === 2 ? 4 : 10),
          z: base.z + (scatter(i, 12) - 0.5) * 1.2,
          c: colours[i % colours.length]!,
        };
      }),
    [],
  );
  return (
    <>
      {items.map((f, i) => (
        <group key={i} position={at(f.x, f.z)}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.24, 4]} />
            <meshStandardMaterial color="#4f7a35" />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.045, 6, 4]} />
            <meshStandardMaterial color={f.c} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function Yard({
  kennelName,
  bowlFilled,
  gardenRestored,
}: {
  kennelName: string;
  bowlFilled: boolean;
  gardenRestored: boolean;
}) {
  return (
    <>
      <Paths />
      <YardFence />
      <PantryShed />
      <Van />
      <Noticeboard />
      <FoodBowl filled={bowlFilled} />
      <ScentGarden restored={gardenRestored} />
      <Flowers />
      <Sign
        lines={
          kennelName
            ? [`${kennelName} Kennels`, 'est. by Grandpa · new hands']
            : ['Kennels', 'the name has worn away']
        }
        position={at(2.2, 80.5)}
        rotation={Math.PI}
        width={3.2}
        height={1.1}
      />
      <Sign
        lines={['Training field', 'mind the gate']}
        position={at(-3.2, 45.2)}
        rotation={Math.PI}
        width={1.8}
        height={0.8}
        post={1.1}
      />
    </>
  );
}
