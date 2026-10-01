import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Dog } from '../../core/dog/dog';
import { bodyOf, coatOf } from '../../core/dog/dog';
import { damp, wrapAngle, type Vec2 } from '../../core/math';
import type { Pose, Tell } from '../../sim/agents';
import { buildDog, NECK_LEAN } from './buildDog';
import { heightAt } from '../world/terrain';

/** What the renderer needs to know about the dog each frame. */
export interface DogView {
  pos: Vec2;
  heading: number;
  speed: number;
  pose: Pose;
  tell: Tell;
  lookAt: Vec2 | null;
  carrying: 'dummy' | 'ball' | null;
  /** Ground height override; defaults to the field terrain. */
  groundY?: number;
}

const TAU = Math.PI * 2;

/** Dogs are drawn a little larger than life so their body language reads at a distance. */
export const DOG_DRAW_SCALE = 1.25;

/** Leg phase offsets for each gait, in the order LF, RF, LH, RH. */
const GAITS = {
  walk: [0, 0.5, 0.75, 0.25],
  trot: [0, 0.5, 0.5, 0],
  gallop: [0.5, 0.62, 0, 0.1],
} as const;

interface AnimState {
  phase: number;
  sit: number;
  down: number;
  crouch: number;
  headYaw: number;
  headPitch: number;
  earLift: number;
  earBack: number;
  tailBase: number;
  tailWag: number;
  tailAmp: number;
  tailRate: number;
  gallop: number;
  trot: number;
  flick: number;
  lastHeading: number;
  lean: number;
}

export function DogModel({ dog, view }: { dog: Dog; view: () => DogView }) {
  // Rebuild only when the genes change, not when skills or bond do.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rig = useMemo(() => buildDog(bodyOf(dog), coatOf(dog)), [dog.genome]);
  useEffect(() => () => rig.dispose(), [rig]);

  const dummy = useMemo(() => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(rig.dims.skull * 0.32, rig.dims.skull * 1.6, 4, 10),
      new THREE.MeshStandardMaterial({ color: '#e9e2d0', roughness: 0.8 }),
    );
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(rig.dims.skull * 0.34, rig.dims.skull * 0.34, rig.dims.skull * 0.25, 12),
      new THREE.MeshStandardMaterial({ color: '#d5612f', roughness: 0.7 }),
    );
    band.rotation.z = Math.PI / 2;
    group.add(body, band);
    group.visible = false;
    rig.mouth.add(group);
    return group;
  }, [rig]);

  const ball = useMemo(() => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(rig.dims.skull * 0.42, 14, 10),
      new THREE.MeshStandardMaterial({ color: '#f0b429', roughness: 0.6 }),
    );
    mesh.visible = false;
    mesh.castShadow = true;
    rig.mouth.add(mesh);
    return mesh;
  }, [rig]);

  const anim = useRef<AnimState>({
    phase: 0,
    sit: 0,
    down: 0,
    crouch: 0,
    headYaw: 0,
    headPitch: 0,
    earLift: 0,
    earBack: 0,
    tailBase: 0,
    tailWag: 0,
    tailAmp: 0.3,
    tailRate: 6,
    gallop: 0,
    trot: 0,
    flick: 0,
    lastHeading: 0,
    lean: 0,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = view();
    const a = anim.current;
    const { dims, root, body, neck, head, ears, tail, legs } = rig;

    // Placement on the terrain.
    root.position.set(v.pos.x, v.groundY ?? heightAt(v.pos.x, v.pos.z), v.pos.z);
    root.rotation.y = v.heading;
    root.scale.setScalar(DOG_DRAW_SCALE);
    const turnRate = wrapAngle(v.heading - a.lastHeading) / Math.max(dt, 1e-3);
    a.lastHeading = v.heading;
    a.lean += (Math.max(-0.25, Math.min(0.25, -turnRate * v.speed * 0.012)) - a.lean) * damp(6, dt);

    // Pose blending: about 0.4 s to settle, which the training lessons rely on.
    const k = damp(7.5, dt);
    a.sit += ((v.pose === 'sit' ? 1 : 0) - a.sit) * k;
    a.down += ((v.pose === 'down' ? 1 : 0) - a.down) * k;
    a.crouch += ((v.pose === 'crouch' ? 1 : 0) - a.crouch) * k;

    // Gait selection by speed relative to the dog's size.
    const relSpeed = v.speed / Math.max(0.3, dims.height * 2);
    a.trot += ((relSpeed > 1.6 ? 1 : 0) - a.trot) * damp(5, dt);
    a.gallop += ((relSpeed > 5.2 ? 1 : 0) - a.gallop) * damp(5, dt);
    const strideLen = dims.stride * (1 + a.trot * 0.35 + a.gallop * 0.9);
    a.phase = (a.phase + (v.speed * dt) / strideLen) % 1;
    const moving = Math.min(1, v.speed / 0.6);

    const gaitOffset = (i: number) => {
      const walk = GAITS.walk[i]!;
      const trot = GAITS.trot[i]!;
      const gallop = GAITS.gallop[i]!;
      return a.gallop > 0.5 ? gallop : a.trot > 0.5 ? trot : walk;
    };
    const swingAmp = (0.32 + a.trot * 0.18 + a.gallop * 0.45) * moving;
    const liftAmp = (0.45 + a.trot * 0.25 + a.gallop * 0.4) * moving;

    legs.forEach((leg, i) => {
      const t = TAU * (a.phase + gaitOffset(i));
      const swing = Math.sin(t) * swingAmp;
      const lift = Math.max(0, Math.cos(t)) * liftAmp;
      let upper = leg.restUpper - swing;
      let lower = leg.restLower + (leg.front ? lift : lift * 0.7);

      // Poses: front legs stay upright in a sit and stretch forward lying down;
      // hind legs fold under with the hocks flat on the ground.
      if (leg.front) {
        upper += a.sit * 0.62 - a.crouch * 0.4 - a.down * 1.5;
        lower += a.crouch * 0.7 - a.down * 0.1;
      } else {
        upper += -a.sit * 0.38 - a.down * 0.9 - a.crouch * 0.25;
        lower += a.sit * 2.25 + a.down * 2.15 + a.crouch * 0.6;
      }
      leg.upper.rotation.x = upper;
      leg.lower.rotation.x = lower;
    });

    // Body: bob with the gait, pitch for poses and galloping, lean into turns.
    const bob =
      moving * (a.gallop > 0.5 ? Math.sin(TAU * a.phase) * 0.06 : Math.abs(Math.sin(TAU * a.phase * 2)) * 0.025) * dims.height;
    body.position.y = dims.jointY - dims.jointY * (a.sit * 0.62 + a.down * 0.66 + a.crouch * 0.18) + bob;
    body.rotation.x = -a.sit * 0.62 + a.crouch * 0.16 + (a.gallop > 0.5 ? Math.cos(TAU * a.phase) * 0.1 * moving : 0);
    body.rotation.z = a.lean;

    // Head: look at targets, nose down when scenting.
    let yaw = 0;
    let pitch = 0;
    if (v.lookAt) {
      const dx = v.lookAt.x - v.pos.x;
      const dz = v.lookAt.z - v.pos.z;
      yaw = Math.max(-1, Math.min(1, wrapAngle(Math.atan2(dx, dz) - v.heading)));
      pitch = -0.15;
    }
    if (v.tell.noseDown) pitch = 0.55;
    if (v.pose === 'sit' && !v.tell.noseDown) pitch -= 0.15;
    a.headYaw += (yaw - a.headYaw) * damp(6, dt);
    a.headPitch += (pitch - a.headPitch) * damp(5, dt);
    neck.rotation.x = NECK_LEAN + a.headPitch * 0.7 + a.sit * 0.45 + a.down * 0.2 + a.gallop * 0.35 * moving;
    neck.rotation.y = a.headYaw * 0.55;
    head.rotation.x = -NECK_LEAN + a.headPitch * 0.4 - a.sit * 0.2 - a.gallop * 0.2 * moving;
    head.rotation.y = a.headYaw * 0.45;

    // Ears follow the tell: forward when interested, back when running or worried.
    const earLift = v.tell.ears === 'forward' ? 1 : v.tell.ears === 'back' ? -0.4 : 0;
    const earBack = v.tell.ears === 'back' ? 1 : 0;
    a.earLift += (earLift - a.earLift) * damp(8, dt);
    a.earBack += (earBack - a.earBack) * damp(8, dt);
    if (v.tell.ears === 'flick') a.flick = 1;
    a.flick = Math.max(0, a.flick - dt * 2.5);
    for (const ear of ears) {
      const side = ear.userData.side as number;
      const rest = ear.userData.rest as number;
      const hanging = dims.earErect <= 0.6;
      const flop = hanging ? Math.sin(TAU * a.phase * 2) * 0.15 * moving : 0;
      const lift = hanging ? a.earLift * 0.35 : a.earLift * 0.12;
      ear.rotation.z = -(rest - side * lift) + side * flop + Math.sin(a.flick * 40) * a.flick * 0.25 * side;
      ear.rotation.x = (hanging ? 0.2 : -0.15) - a.earBack * (hanging ? 0.5 : 0.9);
    }

    // Tail: carriage and wag speed come straight from the tell.
    const curl = (tail[0]!.parent!.userData.baseCurl as number) ?? 0.4;
    const carriage = { high: 0.75, wag: 0.25, low: -0.55, neutral: 0.05 }[v.tell.tail];
    const amp = { high: 0.25, wag: 0.55, low: 0.15, neutral: 0.25 }[v.tell.tail];
    const rate = { high: 11, wag: 7.5, low: 2.5, neutral: 4 }[v.tell.tail];
    const running = Math.min(1, a.trot + a.gallop);
    a.tailBase += (carriage * (1 - running * 0.5) + (curl - 0.4) * 1.1 - (1 - curl) * 0.4 - a.tailBase) * damp(5, dt);
    a.tailAmp += (amp * (1 - running * 0.6) - a.tailAmp) * damp(5, dt);
    a.tailRate += (rate - a.tailRate) * damp(3, dt);
    a.tailWag += dt * a.tailRate;
    tail[0]!.parent!.rotation.x = a.tailBase - a.sit * 0.7;
    tail.forEach((seg, i) => {
      seg.rotation.y = Math.sin(a.tailWag - i * 0.6) * a.tailAmp * (0.4 + i * 0.15);
      seg.rotation.x = i === 0 ? 0 : curl * 0.32 - 0.05;
    });

    dummy.visible = v.carrying === 'dummy';
    ball.visible = v.carrying === 'ball';
  });

  return <primitive object={rig.root} />;
}
