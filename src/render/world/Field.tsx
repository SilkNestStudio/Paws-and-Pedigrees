import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Field as FieldData } from '../../sim/field';
import { coverAt } from '../../sim/field';
import { heightAt, scatter } from './terrain';

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/** Shared time uniform so grass and flags sway together. */
export const windUniforms = {
  uTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(0, 1) },
  uWindStrength: { value: 0.4 },
};

export function WindClock({ heading, strength }: { heading: number; strength: number }) {
  useFrame((_, dt) => {
    windUniforms.uTime.value += dt;
    windUniforms.uWindDir.value.set(Math.sin(heading), Math.cos(heading));
    windUniforms.uWindStrength.value = strength;
  });
  return null;
}

const GROUND: Record<FieldData['style'], { inside: string; outside: string; yard: string }> = {
  training: { inside: '#7fa64e', outside: '#6f8f45', yard: '#86a855' },
  orchard: { inside: '#78a04a', outside: '#6a8c42', yard: '#78a04a' },
  green: { inside: '#86b052', outside: '#78a04a', yard: '#86b052' },
  shelter: { inside: '#8aa85a', outside: '#7d9a4f', yard: '#8aa85a' },
  trial: { inside: '#82ac50', outside: '#719646', yard: '#82ac50' },
};

const groundCache = new Map<string, THREE.BufferGeometry>();
const grassCache = new Map<string, { short: THREE.InstancedMesh; tall: THREE.InstancedMesh }>();

/** The ground for a place, built once and kept, so travelling back is instant. */
export function groundGeometry(field: FieldData): THREE.BufferGeometry {
  const cached = groundCache.get(field.style);
  if (cached) return cached;
  const built = buildGround(field);
  groundCache.set(field.style, built);
  return built;
}

export function Ground({ field }: { field: FieldData }) {
  const geometry = groundGeometry(field);
  return (
    <mesh geometry={geometry} receiveShadow dispose={null}>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

function buildGround(field: FieldData): THREE.BufferGeometry {
  const size = 300;
  const segments = isTouch ? 110 : 170;
  const g = new THREE.PlaneGeometry(size, size, segments, segments);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -30);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colours = new Float32Array(pos.count * 3);
  const base = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    const inField = x > field.minX && x < field.maxX && z > field.minZ && z < field.maxZ;
    const n = scatter(Math.floor(x * 0.5), Math.floor(z * 0.5));
    const cover = coverAt(field, { x, z });
    const palette = GROUND[field.style];
    // Mown stripes on the training field and green; rougher meadow outside.
    const mown = field.style === 'training' || field.style === 'green' || field.style === 'trial';
    const stripe = inField && mown ? (Math.floor((x + 200) / 6) % 2 === 0 ? 0.03 : -0.02) : 0;
    const yard = field.style === 'training' && z > 43 && Math.abs(x) < 41;
    base.set(yard ? palette.yard : inField ? palette.inside : palette.outside);
    base.offsetHSL(n * 0.02 - 0.01, 0, stripe + (n - 0.5) * 0.05);
    if (cover > 0) base.lerp(new THREE.Color('#8d8a43'), cover * 0.7);
    colours[i * 3] = base.r;
    colours[i * 3 + 1] = base.g;
    colours[i * 3 + 2] = base.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  g.computeVertexNormals();
  return g;
}

/** A tuft geometry: five tapered blades leaning out from a common base. */
function tuftGeometry(height: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const shade = (y: number) => {
    const t = y / height;
    return [0.27 + t * 0.22, 0.42 + t * 0.25, 0.14 + t * 0.05];
  };
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const ox = Math.cos(angle) * 0.04;
    const oz = Math.sin(angle) * 0.04;
    const dx = Math.cos(angle + 1.6) * 0.035;
    const dz = Math.sin(angle + 1.6) * 0.035;
    const h = height * (0.75 + ((i * 37) % 5) * 0.08);
    const tri = [
      [ox - dx, 0, oz - dz],
      [ox + dx, 0, oz + dz],
      [ox * 3.2, h, oz * 3.2],
    ];
    for (const [x, y, z] of tri) {
      positions.push(x!, y!, z!);
      colours.push(...shade(y!));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  g.computeVertexNormals();
  return g;
}

function swayMaterial(tint: string): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    color: tint,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windUniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nuniform vec2 uWindDir;\nuniform float uWindStrength;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float gust = sin(uTime * 1.7 + worldBase.x * 0.21 + worldBase.z * 0.17) * 0.5 + 0.5;
         float bend = position.y * (0.25 + uWindStrength * 0.55) * (0.4 + gust * 0.6);
         transformed.x += uWindDir.x * bend;
         transformed.z += uWindDir.y * bend;`,
      );
  };
  return material;
}

/** Grass for a place, built once and kept. */
export function grassMeshes(field: FieldData) {
  const cached = grassCache.get(field.style);
  if (cached) return cached;
  const built = buildGrass(field);
  grassCache.set(field.style, built);
  return built;
}

export function Grass({ field }: { field: FieldData }) {
  const { short, tall } = grassMeshes(field);
  return (
    <>
      <primitive object={short} />
      <primitive object={tall} />
    </>
  );
}

function buildGrass(field: FieldData) {
  const shortCount = isTouch ? 9000 : 24000;
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  const shortMesh = new THREE.InstancedMesh(tuftGeometry(0.2), swayMaterial('#ffffff'), shortCount);
  for (let i = 0; i < shortCount; i++) {
    const x = field.minX - 20 + scatter(i, 1) * (field.maxX - field.minX + 40);
    const extra = field.style === 'training' ? 44 : 8;
    const z = field.minZ - 20 + scatter(i, 2) * (field.maxZ - field.minZ + 20 + extra);
    p.set(x, heightAt(x, z), z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), scatter(i, 3) * Math.PI);
    const size = 0.65 + scatter(i, 4) * 0.5;
    s.set(size, size * (0.8 + scatter(i, 5) * 0.4), size);
    shortMesh.setMatrixAt(i, matrix.compose(p, q, s));
  }
  shortMesh.instanceMatrix.needsUpdate = true;

  // Tall cover inside the patches the simulation knows about.
  const tallPositions: THREE.Matrix4[] = [];
  for (const patch of field.cover) {
    const count = Math.round(patch.radius * patch.radius * (isTouch ? 5 : 11) * patch.density);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(scatter(i, patch.center.x)) * patch.radius;
      const a = scatter(i, patch.center.z) * Math.PI * 2;
      const x = patch.center.x + Math.cos(a) * r;
      const z = patch.center.z + Math.sin(a) * r;
      const edge = 1 - r / patch.radius;
      p.set(x, heightAt(x, z), z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), scatter(i, 7) * Math.PI);
      const h = (0.9 + edge * 1.1) * (0.8 + scatter(i, 8) * 0.5);
      s.set(1.3, h * 2.6, 1.3);
      tallPositions.push(new THREE.Matrix4().compose(p, q, s));
    }
  }
  const tallMesh = new THREE.InstancedMesh(
    tuftGeometry(0.5),
    swayMaterial('#e6d9a0'),
    tallPositions.length,
  );
  tallPositions.forEach((m, i) => tallMesh.setMatrixAt(i, m));
  tallMesh.instanceMatrix.needsUpdate = true;
  return { short: shortMesh, tall: tallMesh };
}

const leafColours = ['#4f7a35', '#5f8a3c', '#6b9443', '#46703a'];

function Tree({ x, z, scale, seed }: { x: number; z: number; scale: number; seed: number }) {
  const y = heightAt(x, z);
  const blobs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        pos: [
          (scatter(seed, i) - 0.5) * 2.4,
          3.6 + scatter(seed, i + 10) * 1.6,
          (scatter(seed, i + 20) - 0.5) * 2.4,
        ] as [number, number, number],
        r: 1.4 + scatter(seed, i + 30) * 0.9,
        colour: leafColours[Math.floor(scatter(seed, i + 40) * leafColours.length)]!,
      })),
    [seed],
  );
  return (
    <group position={[x, y, z]} scale={scale}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.42, 3.4, 8]} />
        <meshStandardMaterial color="#6b4a33" roughness={0.9} />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <icosahedronGeometry args={[b.r, 1]} />
          <meshStandardMaterial color={b.colour} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** The ring of trees around a field, outside the hedges. */
export function borderTrees(field: FieldData): { x: number; z: number; s: number }[] {
  const out: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const along = scatter(i, 91);
    if (t < 0.36)
      out.push({
        x: field.minX - 6 - along * 10,
        z: field.maxZ - 10 - (t / 0.36) * 125,
        s: 0.9 + along * 0.6,
      });
    else if (t < 0.72)
      out.push({
        x: field.maxX + 6 + along * 10,
        z: field.maxZ - 10 - ((t - 0.36) / 0.36) * 125,
        s: 0.9 + along * 0.6,
      });
    else
      out.push({
        x: field.minX + ((t - 0.72) / 0.28) * (field.maxX - field.minX),
        z: field.minZ - 6 - along * 12,
        s: 1 + along * 0.7,
      });
  }
  return out;
}

export function Trees({ field }: { field: FieldData }) {
  const border = useMemo(() => borderTrees(field), [field]);

  return (
    <>
      {field.trees.map((t, i) => (
        <Tree key={`f${i}`} x={t.pos.x} z={t.pos.z} scale={t.radius / 0.9} seed={i + 1} />
      ))}
      {border.map((t, i) => (
        <Tree key={`b${i}`} x={t.x} z={t.z} scale={t.s} seed={i + 50} />
      ))}
    </>
  );
}

/** Wind flag on a pole; the cloth streams downwind and ripples. */
export function WindFlag({
  x,
  z,
  heading,
  strength,
}: {
  x: number;
  z: number;
  heading: number;
  strength: number;
}) {
  const cloth = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.4, 0.8, 12, 4);
    g.translate(0.7, 0, 0);
    return g;
  }, []);
  const base = useMemo(
    () => Float32Array.from(geometry.getAttribute('position').array),
    [geometry],
  );
  useFrame(() => {
    const mesh = cloth.current;
    if (!mesh) return;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const t = windUniforms.uTime.value;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3]!;
      const wave = Math.sin(bx * 4 - t * (6 + strength * 6)) * 0.12 * (bx / 1.4) * (0.4 + strength);
      pos.setZ(i, wave);
      pos.setY(i, base[i * 3 + 1]! - (1 - strength) * 0.25 * (bx / 1.4) * (bx / 1.4));
    }
    pos.needsUpdate = true;
    mesh.rotation.y = heading - Math.PI / 2;
  });
  const y = heightAt(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 3.6, 6]} />
        <meshStandardMaterial color="#e8e2d4" />
      </mesh>
      <mesh ref={cloth} geometry={geometry} position={[0, 3.2, 0]} castShadow>
        <meshStandardMaterial color="#e2622d" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Hedges({ field }: { field: FieldData }) {
  const pieces = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    const step = 6;
    for (let z = field.maxZ - 8; z > field.minZ; z -= step) {
      out.push({ x: field.minX - 1.5, z, w: 2.2, d: step + 1, h: 1.5 + scatter(z, 3) * 0.6 });
      out.push({ x: field.maxX + 1.5, z, w: 2.2, d: step + 1, h: 1.5 + scatter(z, 4) * 0.6 });
    }
    for (let x = field.minX; x < field.maxX; x += step) {
      out.push({ x, z: field.minZ - 1.5, w: step + 1, d: 2.2, h: 1.6 + scatter(x, 5) * 0.6 });
    }
    return out;
  }, [field]);
  return (
    <>
      {pieces.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, heightAt(p.x, p.z) + p.h / 2 - 0.1, p.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[p.w, p.h, p.d]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#4c6f34' : '#557a39'} roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}
