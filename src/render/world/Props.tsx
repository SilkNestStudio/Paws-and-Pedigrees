import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { heightAt } from './terrain';

/**
 * The Blender-made environment (public/models/props.glb, built by
 * tools/blender/build_props.py). Each prop is a top-level node with its origin
 * on the ground at the middle of its footprint, front facing +Z.
 *
 * Single buildings are cloned; anything repeated (trees, hedges, fences,
 * flowers) is drawn as one instanced mesh per part so it stays cheap on phones.
 */
const PROPS_URL = '/models/props.glb';
useGLTF.preload(PROPS_URL);

export type PropName =
  | 'Farmhouse'
  | 'KennelBlock'
  | 'PantryShed'
  | 'Van'
  | 'Noticeboard'
  | 'GateSign'
  | 'FieldGate'
  | 'FenceSection'
  | 'HedgeSection'
  | 'TreeOak'
  | 'TreeOak2'
  | 'TreeApple'
  | 'TreePine'
  | 'Bush'
  | 'FlowerClump'
  | 'Rock'
  | 'TallGrassClump'
  | 'Cottage'
  | 'RescueBuilding'
  | 'Tent'
  | 'Bench'
  | 'Dummy'
  | 'ScentBox'
  | 'FoodBowl'
  | 'WaterBowl'
  | 'Bales';

interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** The part's transform relative to the prop's own origin. */
  matrix: THREE.Matrix4;
}

function useLibrary() {
  const gltf = useGLTF(PROPS_URL) as unknown as { scene: THREE.Group };
  return useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const parts = new Map<string, Part[]>();
    return {
      node(name: PropName): THREE.Object3D {
        const node = gltf.scene.getObjectByName(name);
        if (!node) throw new Error(`props.glb has no ${name}`);
        return node;
      },
      parts(name: PropName): Part[] {
        const cached = parts.get(name);
        if (cached) return cached;
        const top = this.node(name);
        const inverse = top.matrixWorld.clone().invert();
        const list: Part[] = [];
        top.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          list.push({
            geometry: mesh.geometry,
            material: mesh.material as THREE.Material,
            matrix: inverse.clone().multiply(mesh.matrixWorld),
          });
        });
        parts.set(name, list);
        return list;
      },
    };
  }, [gltf]);
}

export interface Placement {
  x: number;
  z: number;
  /** Turn about the vertical, radians. */
  rot?: number;
  scale?: number;
  /** Raise or sink from the ground, metres. */
  lift?: number;
}

/** One prop standing on the ground. `signs` paints sign faces by material name. */
export function Prop({
  name,
  at,
  signs,
  shadows = true,
}: {
  name: PropName;
  at: Placement;
  signs?: Record<string, THREE.Texture>;
  shadows?: boolean;
}) {
  const lib = useLibrary();
  const object = useMemo(() => {
    const clone = lib.node(name).clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const painted = signs?.[material.name];
      if (painted) {
        const own = material.clone();
        own.map = painted;
        own.color.set('#ffffff');
        own.needsUpdate = true;
        mesh.material = own;
      }
    });
    return clone;
  }, [lib, name, signs, shadows]);
  const s = at.scale ?? 1;
  return (
    <primitive
      object={object}
      position={[at.x, heightAt(at.x, at.z) + (at.lift ?? 0), at.z]}
      rotation={[0, at.rot ?? 0, 0]}
      scale={[s, s, s]}
      dispose={null}
    />
  );
}

/** Many copies of one prop, drawn as instanced meshes. */
export function Props({
  name,
  items,
  shadows = true,
}: {
  name: PropName;
  items: Placement[];
  shadows?: boolean;
}) {
  const lib = useLibrary();
  const meshes = useMemo(() => {
    if (!items.length) return [];
    const place = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const placed = items.map((it) => {
      const s = it.scale ?? 1;
      pos.set(it.x, heightAt(it.x, it.z) + (it.lift ?? 0), it.z);
      q.setFromAxisAngle(up, it.rot ?? 0);
      scale.set(s, s, s);
      return place.compose(pos, q, scale).clone();
    });
    return lib.parts(name).map((part) => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, items.length);
      placed.forEach((m, i) => mesh.setMatrixAt(i, m.clone().multiply(part.matrix)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      return mesh;
    });
  }, [lib, name, items, shadows]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} dispose={null} />
      ))}
    </>
  );
}

/** Fence or hedge pieces laid end to end along a straight line. */
export function along(
  from: [number, number],
  to: [number, number],
  pitch: number,
  extra: Partial<Placement> = {},
): Placement[] {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(length / pitch));
  const rot = Math.atan2(dz, dx) * -1; // prop's long side runs along x
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    return { x: from[0] + dx * t, z: from[1] + dz * t, rot, ...extra };
  });
}
