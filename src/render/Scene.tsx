import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { damp, distance, wrapAngle, type Vec2 } from '../core/math';
import type { Dog } from '../core/dog/dog';
import { FIXED_DT, setKeeperInput, stepSession, type RetrieveSession } from '../sim/retrieve';
import { stepTraining, type TrainingSession } from '../sim/training';
import { createTrainingField } from '../sim/field';
import { windAt } from '../sim/scent';
import { live, useGame } from '../app/store';
import { cameraState, movementVector } from '../app/input';
import { publishField, publishLesson } from '../app/hud';
import { tapGround } from '../app/actions';
import { DogModel, type DogView } from './dog/DogModel';
import { HELPER_PALETTE, KeeperModel, type KeeperView } from './KeeperModel';
import { Ground, Grass, Hedges, Trees, WindClock, WindFlag } from './world/Field';
import { Kennel } from './world/Kennel';
import { Lighting, Sky } from './world/Atmosphere';
import { heightAt } from './world/terrain';

const FIELD = createTrainingField();
const FLAG_SPOTS: Vec2[] = [
  { x: -7, z: 22 },
  { x: 30, z: -40 },
  { x: -34, z: -76 },
];

/** Steps whichever simulation is live and publishes the interface snapshot. */
function Runner() {
  const acc = useRef(0);
  const hudTimer = useRef(0);
  const finished = useRef<object | null>(null);

  useFrame((_, dt) => {
    const field = live.field;
    const lesson = live.lesson;
    if (field) {
      const { move, running } = movementVector();
      setKeeperInput(field, move, running);
    }
    const paused = useGame.getState().panel !== 'none';
    if (!paused) {
      acc.current += Math.min(dt, 0.1);
      while (acc.current >= FIXED_DT) {
        if (field) stepSession(field, FIXED_DT);
        if (lesson) stepTraining(lesson, FIXED_DT);
        acc.current -= FIXED_DT;
      }
    }
    if (field && field.phase === 'complete' && finished.current !== field) {
      finished.current = field;
      setTimeout(() => useGame.getState().finishField(), 900);
    }
    if (lesson && lesson.phase === 'done' && finished.current !== lesson) {
      finished.current = lesson;
      setTimeout(() => useGame.getState().finishLesson(), 1200);
    }
    hudTimer.current += dt;
    if (hudTimer.current > 0.1) {
      hudTimer.current = 0;
      if (field) publishField(field);
      else if (lesson) publishLesson(lesson);
    }
  });
  return null;
}

/**
 * Third-person camera behind the keeper. When the dog is working far away
 * the camera rises and pulls back so both stay in view; you never lose
 * sight of your dog or where you are sending it.
 */
function CameraRig() {
  const { camera, gl, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 10));
  const pos = useRef(new THREE.Vector3(0, 6, 20));
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean; button: number } | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (pointer.current) return;
      pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, button: e.button };
    };
    const move = (e: PointerEvent) => {
      const p = pointer.current;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.hypot(dx, dy) < 8) return;
      p.moved = true;
      cameraState.yaw -= dx * 0.006;
      cameraState.pitch = Math.min(1.1, Math.max(0.12, cameraState.pitch + dy * 0.004));
      cameraState.manualAt = performance.now() / 1000;
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const p = pointer.current;
      if (!p || p.id !== e.pointerId) return;
      pointer.current = null;
      if (p.moved || p.button !== 0) return;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const ray = raycaster.ray;
      // Intersect the ground, refining once for terrain height.
      let groundY = 0;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(ray.direction.y) < 1e-4) return;
        const t = (groundY - ray.origin.y) / ray.direction.y;
        if (t < 0) return;
        const hit = ray.origin.clone().addScaledVector(ray.direction, t);
        groundY = heightAt(hit.x, hit.z);
        if (i === 2) tapGround({ x: hit.x, z: hit.z });
      }
    };
    const wheel = (e: WheelEvent) => {
      cameraState.zoom = Math.min(2.4, Math.max(0.55, cameraState.zoom * (1 + Math.sign(e.deltaY) * 0.1)));
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: true });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [camera, gl, raycaster]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now() / 1000;
    const portrait = size.height > size.width;
    let target: Vec2;
    let dist = 8.5;
    let pitch = cameraState.pitch;
    let autoYaw: number | null = null;

    const field = live.field;
    const lesson = live.lesson;
    if (field) {
      const k = field.keeper.pos;
      const d = field.dog.pos;
      const away = distance(k, d);
      const working = away > 10 && !(field.dog.mode === 'sit' || field.dog.mode === 'heel');
      const spread = working ? Math.min(1, (away - 10) / 25) : 0;
      target = cameraState.watchDog ? d : { x: k.x + (d.x - k.x) * 0.38 * spread, z: k.z + (d.z - k.z) * 0.38 * spread };
      dist = 8.5 + (working ? Math.min(24, away * 0.5) : 0);
      pitch = cameraState.pitch + spread * 0.25;
      if (working) autoYaw = Math.atan2(d.x - k.x, d.z - k.z);
      else if (field.keeper.speed > 1) autoYaw = field.keeper.heading;
    } else if (lesson) {
      const k = lesson.keeper.pos;
      const d = lesson.dog.pos;
      target = { x: (k.x + d.x) / 2, z: (k.z + d.z) / 2 };
      const span = distance(k, d);
      dist = lesson.lesson === 'sit' ? 4.8 : Math.max(9, span * 0.9 + 6);
      if (lesson.lesson === 'cast') dist = 22;
      pitch = lesson.lesson === 'sit' ? 0.28 : lesson.lesson === 'cast' ? 0.62 : 0.42;
      autoYaw = lesson.lesson === 'sit' ? -Math.PI / 2 + 0.5 : Math.PI;
    } else {
      target = FIELD.line;
    }

    if (autoYaw !== null && now - cameraState.manualAt > 2.5) {
      cameraState.yaw += wrapAngle(autoYaw - cameraState.yaw) * damp(1.4, dt);
    }
    dist *= cameraState.zoom * (portrait ? 1.3 : 1);

    const ty = heightAt(target.x, target.z) + 1.1;
    look.current.lerp(new THREE.Vector3(target.x, ty, target.z), damp(6, dt));
    const back = new THREE.Vector3(-Math.sin(cameraState.yaw), 0, -Math.cos(cameraState.yaw));
    const desired = look.current
      .clone()
      .addScaledVector(back, dist * Math.cos(pitch))
      .add(new THREE.Vector3(0, dist * Math.sin(pitch), 0));
    desired.y = Math.max(desired.y, heightAt(desired.x, desired.z) + 1.2);
    pos.current.lerp(desired, damp(4.5, dt));
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

function itemView(i: { pos: Vec2; y: number }) {
  return { x: i.pos.x, y: heightAt(i.pos.x, i.pos.z) + i.y, z: i.pos.z };
}

/** Dummies and balls lying, flying or delivered; a small fixed pool of meshes. */
function Items() {
  const pool = useMemo(() => {
    const dummyGeo = new THREE.CapsuleGeometry(0.08, 0.32, 4, 10);
    const dummyMat = new THREE.MeshStandardMaterial({ color: '#ece4cf', roughness: 0.8 });
    const bandMat = new THREE.MeshStandardMaterial({ color: '#d5612f', roughness: 0.7 });
    const ballGeo = new THREE.SphereGeometry(0.09, 14, 10);
    const ballMat = new THREE.MeshStandardMaterial({ color: '#f0b429', roughness: 0.6 });
    return Array.from({ length: 14 }, () => {
      const g = new THREE.Group();
      const dummy = new THREE.Mesh(dummyGeo, dummyMat);
      dummy.rotation.z = Math.PI / 2;
      dummy.castShadow = true;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10), bandMat);
      band.rotation.z = Math.PI / 2;
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.castShadow = true;
      g.add(dummy, band, ball);
      g.visible = false;
      return { g, dummy, band, ball };
    });
  }, []);

  useFrame(() => {
    const items = live.field?.items ?? [];
    const lesson = live.lesson;
    pool.forEach((p, i) => {
      const item = items[i];
      if (item && (item.state === 'flying' || item.state === 'lying' || item.state === 'waiting')) {
        const at = itemView(item);
        p.g.position.set(at.x, at.y + 0.08, at.z);
        p.g.rotation.y = i * 1.3;
        p.g.visible = item.state !== 'waiting';
        p.ball.visible = item.kind === 'ball';
        p.dummy.visible = p.band.visible = item.kind !== 'ball';
      } else if (!item && lesson && i === 0 && lesson.scene.ball.visible) {
        const b = lesson.scene.ball;
        p.g.position.set(b.pos.x, heightAt(b.pos.x, b.pos.z) + b.y + 0.08, b.pos.z);
        p.g.visible = true;
        p.ball.visible = lesson.lesson === 'stop';
        p.dummy.visible = p.band.visible = lesson.lesson !== 'stop';
      } else {
        p.g.visible = false;
      }
    });
  });

  return (
    <>
      {pool.map((p, i) => (
        <primitive key={i} object={p.g} />
      ))}
    </>
  );
}

function BlindStakes({ session }: { session: RetrieveSession }) {
  const stakes = session.items.filter((i) => i.kind === 'blind');
  return (
    <>
      {stakes.map((s) => {
        const x = s.pos.x + 1.2;
        const z = s.pos.z;
        return (
          <group key={s.id} position={[x, heightAt(x, z), z]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
              <meshStandardMaterial color="#e2622d" emissive="#e2622d" emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0.18, 1.25, 0]}>
              <boxGeometry args={[0.36, 0.22, 0.02]} />
              <meshStandardMaterial color="#f3a24b" emissive="#f3a24b" emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function Throwers({ session }: { session: RetrieveSession }) {
  return (
    <>
      {session.throwers.map((t, i) => (
        <KeeperModel
          key={i}
          palette={HELPER_PALETTE}
          view={() => ({
            pos: t.pos,
            heading: Math.atan2(session.items[i]!.landing.x - t.pos.x, session.items[i]!.landing.z - t.pos.z),
            speed: 0,
            action: t.throwTime < 1 ? 'throw' : 'none',
            actionTime: t.throwTime,
            signalHeading: 0,
            watch: null,
          })}
        />
      ))}
    </>
  );
}

function LessonProps({ lesson }: { lesson: TrainingSession }) {
  return (
    <>
      {lesson.scene.mound && (
        <mesh position={[lesson.scene.mound.x, heightAt(lesson.scene.mound.x, lesson.scene.mound.z) + 0.02, lesson.scene.mound.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.2, 24]} />
          <meshStandardMaterial color="#c9b98f" />
        </mesh>
      )}
      {lesson.scene.piles.map((p) => (
        <group key={p.id} position={[p.pos.x, heightAt(p.pos.x, p.pos.z), p.pos.z]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[(k - 1) * 0.22, 0.1 + (k === 1 ? 0.12 : 0), 0]} rotation={[0, k * 0.6, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.08, 0.32, 4, 8]} />
              <meshStandardMaterial color="#ece4cf" />
            </mesh>
          ))}
          <mesh position={[0, 0.6, -0.5]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <meshStandardMaterial color="#d9622b" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function fieldDogView(s: RetrieveSession): DogView {
  const carried = s.dog.carrying !== null ? s.items[s.dog.carrying] : undefined;
  return {
    pos: s.dog.pos,
    heading: s.dog.heading,
    speed: s.dog.speed,
    pose: s.dog.pose,
    tell: s.dog.tell,
    lookAt: s.dog.lookAt,
    carrying: carried ? (carried.kind === 'ball' ? 'ball' : 'dummy') : null,
  };
}

function lessonDogView(t: TrainingSession): DogView {
  return {
    pos: t.dog.pos,
    heading: t.dog.heading,
    speed: t.dog.speed,
    pose: t.dog.pose,
    tell: t.dog.tell,
    lookAt: t.dog.lookAt,
    carrying: null,
  };
}

function keeperView(): KeeperView {
  const s = live.field;
  const t = live.lesson;
  const k = s?.keeper ?? t?.keeper;
  const dog = s?.dog ?? t?.dog;
  if (!k) return { pos: FIELD.line, heading: Math.PI, speed: 0, action: 'none', actionTime: 9, signalHeading: 0, watch: null };
  return {
    pos: k.pos,
    heading: k.heading,
    speed: k.speed,
    action: k.action,
    actionTime: k.actionTime,
    signalHeading: k.signalHeading,
    watch: dog && distance(dog.pos, k.pos) > 2.5 ? dog.pos : null,
  };
}

export function Scene() {
  const runId = useGame((s) => s.runId);
  const activeDog: Dog = useGame((s) => s.activeDog());
  const session = live.field;
  const lesson = live.lesson;
  const wind = session ? windAt(session.wind, 0) : { heading: Math.PI, dir: { x: 0, z: -1 } };

  return (
    <>
      <Runner />
      <CameraRig />
      <Sky />
      <Lighting focus={() => live.field?.keeper.pos ?? live.lesson?.keeper.pos ?? FIELD.line} />
      <WindClock heading={wind.heading} strength={session?.wind.strength ?? 0.3} />
      <Ground field={FIELD} />
      <Grass field={FIELD} />
      <Hedges field={FIELD} />
      <Trees field={FIELD} />
      <Kennel />
      {FLAG_SPOTS.map((f, i) => (
        <WindFlag key={i} x={f.x} z={f.z} heading={wind.heading} strength={session?.wind.strength ?? 0.3} />
      ))}
      <Items />
      <KeeperModel view={keeperView} />
      {session && (
        <group key={`f${runId}`}>
          <DogModel dog={activeDog} view={() => fieldDogView(live.field ?? session)} />
          <Throwers session={session} />
          <BlindStakes session={session} />
        </group>
      )}
      {lesson && (
        <group key={`l${runId}`}>
          <DogModel dog={activeDog} view={() => lessonDogView(live.lesson ?? lesson)} />
          <LessonProps lesson={lesson} />
        </group>
      )}
    </>
  );
}
