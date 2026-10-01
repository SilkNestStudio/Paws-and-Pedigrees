import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { damp, wrapAngle, type Vec2 } from '../core/math';
import type { KeeperAgent } from '../sim/agents';
import { heightAt } from './world/terrain';

export interface KeeperView {
  pos: Vec2;
  heading: number;
  speed: number;
  action: KeeperAgent['action'];
  actionTime: number;
  signalHeading: number;
  /** The keeper turns to watch the dog when standing still. */
  watch: Vec2 | null;
}

const SKIN = '#e5b994';
const BOOTS = '#3b2a20';

export interface Palette {
  jacket: string;
  trousers: string;
  cap: string;
}

/** The keeper's waxed jacket and flat cap. Helpers in the field wear white coats. */
export const KEEPER_PALETTE: Palette = { jacket: '#55704c', trousers: '#4a4440', cap: '#8a7a5e' };
export const HELPER_PALETTE: Palette = { jacket: '#f1ede4', trousers: '#5d6670', cap: '#d9622b' };

function part(geometry: THREE.BufferGeometry, colour: string, roughness = 0.85) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: colour, roughness }),
  );
  mesh.castShadow = true;
  return mesh;
}

interface Limb {
  upper: THREE.Group;
  lower: THREE.Group;
}

function buildKeeper(palette: Palette) {
  const { jacket: JACKET, trousers: TROUSERS, cap: CAP } = palette;
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  const body = part(new THREE.CapsuleGeometry(0.22, 0.42, 6, 14), JACKET);
  body.position.y = 0.32;
  body.scale.set(1.05, 1, 0.78);
  torso.add(body);
  const collar = part(new THREE.CylinderGeometry(0.12, 0.16, 0.1, 12), '#6c8762');
  collar.position.y = 0.62;
  torso.add(collar);

  const head = new THREE.Group();
  head.position.y = 0.8;
  torso.add(head);
  const face = part(new THREE.SphereGeometry(0.16, 20, 16), SKIN, 0.7);
  face.scale.set(0.95, 1.05, 0.98);
  head.add(face);
  const nose = part(new THREE.SphereGeometry(0.035, 10, 8), '#d9a582', 0.6);
  nose.position.set(0, -0.01, 0.16);
  head.add(nose);
  for (const side of [1, -1]) {
    const eye = part(new THREE.SphereGeometry(0.022, 8, 6), '#2a1d16', 0.3);
    eye.position.set(side * 0.06, 0.04, 0.145);
    head.add(eye);
  }
  const cap = part(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 18), CAP);
  cap.position.set(0, 0.11, -0.01);
  cap.scale.set(1, 1, 1.05);
  head.add(cap);
  const brim = part(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 14), CAP);
  brim.position.set(0, 0.08, 0.15);
  brim.scale.set(1.2, 1, 0.8);
  head.add(brim);

  const arm = (side: 1 | -1): Limb => {
    const upper = new THREE.Group();
    upper.position.set(side * 0.29, 0.56, 0);
    torso.add(upper);
    const u = part(new THREE.CapsuleGeometry(0.065, 0.24, 4, 10), JACKET);
    u.position.y = -0.15;
    upper.add(u);
    const lower = new THREE.Group();
    lower.position.y = -0.3;
    upper.add(lower);
    const l = part(new THREE.CapsuleGeometry(0.055, 0.22, 4, 10), JACKET);
    l.position.y = -0.13;
    lower.add(l);
    const hand = part(new THREE.SphereGeometry(0.06, 10, 8), SKIN, 0.7);
    hand.position.y = -0.3;
    lower.add(hand);
    return { upper, lower };
  };
  const leg = (side: 1 | -1): Limb => {
    const upper = new THREE.Group();
    upper.position.set(side * 0.11, 0, 0);
    hips.add(upper);
    const u = part(new THREE.CapsuleGeometry(0.085, 0.3, 4, 10), TROUSERS);
    u.position.y = -0.22;
    upper.add(u);
    const lower = new THREE.Group();
    lower.position.y = -0.44;
    upper.add(lower);
    const l = part(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), TROUSERS);
    l.position.y = -0.2;
    lower.add(l);
    const boot = part(new THREE.BoxGeometry(0.13, 0.1, 0.26), BOOTS, 0.6);
    boot.position.set(0, -0.43, 0.04);
    lower.add(boot);
    return { upper, lower };
  };

  return {
    root,
    hips,
    torso,
    head,
    arms: { left: arm(1), right: arm(-1) },
    legs: { left: leg(1), right: leg(-1) },
  };
}

export function KeeperModel({
  view,
  palette = KEEPER_PALETTE,
}: {
  view: () => KeeperView;
  palette?: Palette;
}) {
  const rig = useMemo(() => buildKeeper(palette), [palette]);
  const state = useRef({ phase: 0, heading: 0, run: 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = view();
    const s = state.current;
    rig.root.position.set(v.pos.x, heightAt(v.pos.x, v.pos.z), v.pos.z);

    let face = v.heading;
    if (v.speed < 0.2 && v.watch) face = Math.atan2(v.watch.x - v.pos.x, v.watch.z - v.pos.z);
    s.heading += wrapAngle(face - s.heading) * damp(v.speed < 0.2 ? 4 : 12, dt);
    rig.root.rotation.y = s.heading;

    s.run += ((v.speed > 3.6 ? 1 : 0) - s.run) * damp(6, dt);
    const stride = 1.25 + s.run * 0.8;
    s.phase = (s.phase + (v.speed * dt) / stride) % 1;
    const moving = Math.min(1, v.speed / 0.8);
    const t = s.phase * Math.PI * 2;
    const swing = (0.5 + s.run * 0.35) * moving;

    rig.legs.left.upper.rotation.x = Math.sin(t) * swing;
    rig.legs.right.upper.rotation.x = -Math.sin(t) * swing;
    rig.legs.left.lower.rotation.x = Math.max(0, -Math.cos(t)) * swing * 1.4;
    rig.legs.right.lower.rotation.x = Math.max(0, Math.cos(t)) * swing * 1.4;
    rig.hips.position.y = 0.92 + Math.abs(Math.sin(t)) * 0.04 * moving;
    rig.torso.rotation.x = s.run * 0.18 * moving;

    // Arms swing while walking, then actions take over.
    let la = { x: -Math.sin(t) * swing * 0.8, z: 0.08, elbow: -0.25 - s.run * 0.9 * moving };
    let ra = { x: Math.sin(t) * swing * 0.8, z: -0.08, elbow: -0.25 - s.run * 0.9 * moving };
    const p = Math.min(1, v.actionTime / 0.18);
    const hold = v.actionTime < 0.9 ? 1 : Math.max(0, 1 - (v.actionTime - 0.9) / 0.2);
    const w = p * hold;
    const relative = wrapAngle(v.signalHeading - s.heading);
    switch (v.action) {
      case 'whistle':
        ra = { x: -2.3 * w, z: -0.35 * w, elbow: -2.2 * w };
        break;
      case 'castLeft':
      case 'castRight': {
        const arm = relative > 0 ? 'left' : 'right';
        const pose = { x: -0.3 * w, z: (arm === 'left' ? 1.45 : -1.45) * w, elbow: -0.05 };
        if (arm === 'left') la = pose;
        else ra = pose;
        break;
      }
      case 'castBack':
        ra = { x: -2.95 * w, z: -0.1, elbow: -0.05 };
        break;
      case 'send':
        ra = { x: -1.1 * w + Math.min(1, v.actionTime * 3) * 0.6 * w, z: -0.15, elbow: -0.1 };
        break;
      case 'throw': {
        const k = Math.min(1, v.actionTime / 0.35);
        ra = { x: (-2.7 + k * 3.3) * hold, z: -0.2, elbow: -0.6 * (1 - k) };
        break;
      }
      case 'steady':
        ra = { x: -1.35 * w, z: -0.1, elbow: -1.1 * w };
        break;
      case 'call':
        la = { x: -0.4 * w, z: 0.45 * w + Math.sin(v.actionTime * 14) * 0.25 * w, elbow: -0.6 * w };
        break;
      case 'mark':
        ra = { x: -0.7 * w, z: -0.2, elbow: -1.9 * w };
        break;
    }
    rig.arms.left.upper.rotation.set(la.x, 0, la.z);
    rig.arms.left.lower.rotation.x = la.elbow;
    rig.arms.right.upper.rotation.set(ra.x, 0, ra.z);
    rig.arms.right.lower.rotation.x = ra.elbow;
    rig.head.rotation.y =
      v.action === 'castLeft' || v.action === 'castRight' ? relative * 0.3 * w : 0;
  });

  return <primitive object={rig.root} />;
}
