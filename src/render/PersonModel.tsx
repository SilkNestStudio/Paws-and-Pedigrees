import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { damp, wrapAngle } from '../core/math';
import { KeeperModel, type KeeperView, type Palette } from './KeeperModel';
import { heightAt } from './world/terrain';

/**
 * The Blender-made person (public/models/person.glb), dressed per character
 * and animated from the same view the code-built keeper used: walking and
 * running by speed, plus the handler's whistle, arm signals, throws and calls.
 */
export const PERSON_URL = '/models/person.glb';
useGLTF.preload(PERSON_URL);

export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long';
  jacket: string;
  shirt: string;
  trousers: string;
  boots: string;
  /** Flat cap colour, or null for no cap. */
  cap: string | null;
  /** The long white helper's coat. */
  coat: boolean;
}

export const LOOKS = {
  keeper: {
    skin: '#e9bf9d',
    hair: '#6b4630',
    hairStyle: 'short',
    jacket: '#5f7d55',
    shirt: '#eae4d6',
    trousers: '#b7a37f',
    boots: '#6e4a30',
    cap: '#a8916b',
    coat: false,
  },
  mara: {
    skin: '#efc8ab',
    hair: '#cfcfcf',
    hairStyle: 'long',
    jacket: '#5d8cc4',
    shirt: '#f1ede4',
    trousers: '#6c6e72',
    boots: '#6e4a30',
    cap: null,
    coat: false,
  },
  victor: {
    skin: '#c99872',
    hair: '#2b2622',
    hairStyle: 'short',
    jacket: '#28385a',
    shirt: '#e7e7ea',
    trousers: '#3a3c42',
    boots: '#22201e',
    cap: null,
    coat: false,
  },
  billy: {
    skin: '#f0caa8',
    hair: '#c8823c',
    hairStyle: 'short',
    jacket: '#d9622b',
    shirt: '#f4d35e',
    trousers: '#4a5a8a',
    boots: '#5a3c26',
    cap: '#f4d35e',
    coat: false,
  },
  helper: {
    skin: '#e2b896',
    hair: '#5a4130',
    hairStyle: 'short',
    jacket: '#7b8a6a',
    shirt: '#eae4d6',
    trousers: '#5d6670',
    boots: '#3b2a20',
    cap: '#d9622b',
    coat: true,
  },
} satisfies Record<string, Look>;

/** Colours for the simple stand-in while the model loads. */
const fallbackPalette = (look: Look): Palette => ({
  jacket: look.coat ? '#f1ede4' : look.jacket,
  trousers: look.trousers,
  cap: look.cap ?? look.hair,
});

type Clip =
  | 'Idle'
  | 'Walk'
  | 'Run'
  | 'Whistle'
  | 'CastLeft'
  | 'CastRight'
  | 'CastBack'
  | 'Send'
  | 'Throw'
  | 'Call'
  | 'Point'
  | 'Clap';

const ACTION_CLIP: Partial<Record<KeeperView['action'], Clip>> = {
  whistle: 'Whistle',
  castBack: 'CastBack',
  send: 'Send',
  throw: 'Throw',
  call: 'Call',
  steady: 'Point',
  mark: 'Clap',
};

function buildPerson(
  gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] },
  look: Look,
) {
  const root = cloneSkinned(gltf.scene);
  const colours: Record<string, string> = {
    Skin: look.skin,
    Hair: look.hair,
    Jacket: look.jacket,
    Shirt: look.shirt,
    Trousers: look.trousers,
    Boots: look.boots,
    Cap: look.cap ?? look.hair,
  };
  const disposables: THREE.Material[] = [];
  const cloned = new Map<THREE.Material, THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    const source = mesh.material as THREE.MeshStandardMaterial;
    const colour = colours[source.name];
    if (colour) {
      let m = cloned.get(source);
      if (!m) {
        const c = source.clone();
        c.color.set(colour);
        cloned.set(source, c);
        disposables.push(c);
        m = c;
      }
      mesh.material = m;
    }
    if (mesh.name === 'Hair_Short') mesh.visible = look.hairStyle === 'short';
    if (mesh.name === 'Hair_Long') mesh.visible = look.hairStyle === 'long';
    if (mesh.name === 'Cap_Flat') mesh.visible = look.cap !== null;
    if (mesh.name === 'Coat_Long') mesh.visible = look.coat;
  });
  const mixer = new THREE.AnimationMixer(root);
  const actions: Partial<Record<Clip, THREE.AnimationAction>> = {};
  for (const clip of gltf.animations) actions[clip.name as Clip] = mixer.clipAction(clip);
  actions.Idle?.play();
  return { root, mixer, actions, dispose: () => disposables.forEach((m) => m.dispose()) };
}

function GlbPerson({ view, look }: { view: () => KeeperView; look: Look }) {
  const gltf = useGLTF(PERSON_URL) as unknown as {
    scene: THREE.Object3D;
    animations: THREE.AnimationClip[];
  };
  const rig = useMemo(() => buildPerson(gltf, look), [gltf, look]);
  useEffect(() => () => rig.dispose(), [rig]);
  const state = useRef({
    heading: 0,
    base: 'Idle' as Clip,
    action: null as Clip | null,
    actionStarted: -1,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = view();
    const s = state.current;
    const { root, actions, mixer } = rig;
    root.position.set(v.pos.x, heightAt(v.pos.x, v.pos.z), v.pos.z);
    let face = v.heading;
    if (v.speed < 0.2 && v.watch) face = Math.atan2(v.watch.x - v.pos.x, v.watch.z - v.pos.z);
    s.heading += wrapAngle(face - s.heading) * damp(v.speed < 0.2 ? 4 : 12, dt);
    root.rotation.y = s.heading;

    // Walking and running.
    const base: Clip = v.speed < 0.2 ? 'Idle' : v.speed < 3.4 ? 'Walk' : 'Run';
    if (base !== s.base) {
      actions[base]?.reset().fadeIn(0.25).play();
      actions[s.base]?.fadeOut(0.25);
      s.base = base;
    }
    const baseAction = actions[base];
    if (baseAction)
      baseAction.timeScale =
        base === 'Walk'
          ? Math.min(3, Math.max(0.7, v.speed / 0.875 / 1.6))
          : base === 'Run'
            ? Math.min(2, Math.max(0.7, v.speed / 3.25))
            : 1;

    // Handler actions play over the top, then fade back.
    let wanted: Clip | null = null;
    if (v.action !== 'none' && v.actionTime < 1.2) {
      if (v.action === 'castLeft' || v.action === 'castRight') {
        wanted = wrapAngle(v.signalHeading - s.heading) > 0 ? 'CastLeft' : 'CastRight';
      } else wanted = ACTION_CLIP[v.action] ?? null;
    }
    const restarted = wanted && v.actionTime < s.actionStarted;
    if (wanted !== s.action || restarted) {
      if (s.action) actions[s.action]?.fadeOut(0.2);
      if (wanted) {
        const a = actions[wanted];
        if (a) {
          a.reset();
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          a.fadeIn(0.15).play();
        }
        baseAction?.fadeOut(0.15);
      } else baseAction?.reset().fadeIn(0.3).play();
      s.action = wanted;
    }
    s.actionStarted = v.actionTime;
    mixer.update(dt);
  });

  return <primitive object={rig.root} />;
}

/** A person, with the simple code-built figure standing in while the model loads. */
export function PersonModel({
  view,
  look = LOOKS.keeper,
}: {
  view: () => KeeperView;
  look?: Look;
}) {
  const palette = useMemo(() => fallbackPalette(look), [look]);
  return (
    <Suspense fallback={<KeeperModel view={view} palette={palette} />}>
      <GlbPerson view={view} look={look} />
    </Suspense>
  );
}
