import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { damp, distance, fromHeading, turnToward, wrapAngle, type Vec2 } from '../core/math';
import type { Dog } from '../core/dog/dog';
import { activeDog, hasFlag } from '../game/state';
import { objective, type Landmark } from '../game/story';
import { FIXED_DT, aimTarget, stepSession, type RetrieveSession } from '../sim/retrieve';
import { stepSearch, type SearchSession } from '../sim/search';
import { stepTraining, type TrainingSession } from '../sim/training';
import {
  HOME_SOLIDS,
  HOME_SPOTS,
  PADDOCK,
  routeAround,
  runPosition,
  setHomeInput,
  stepHome,
} from '../sim/home';
import { windAt } from '../sim/scent';
import { live, useApp, type Place } from '../app/store';
import { cameraState } from '../app/input';
import { driveKeeper, framingReach, steerState } from './steer';
import { TargetBeacons, TargetTracker } from './Targets';
import { publish } from '../app/hud';
import { tapGround, walkTarget } from '../app/actions';
import { activityFinished, fieldFor, homeDogAte, MARA_POS } from '../app/flow';
import { type DogView } from './dog/DogModel';
import { AnyDog } from './dog/AnyDog';
import { type KeeperView } from './KeeperModel';
import { LOOKS, PersonModel } from './PersonModel';
import { Ground, Grass, Hedges, Ponds, Trees, WindClock, WindFlag } from './world/Field';
import { Kennel } from './world/Kennel';
import { Yard } from './world/Yard';
import { Orchard, Shelter, VillageGreen, VillageGreenExtras } from './world/Places';
import { GreenWorld, HomeWorld, OrchardWorld, ShelterWorld, TrialWorld } from './world/PropWorld';
import { Lighting, Sky } from './world/Atmosphere';
import { heightAt, waterLevel } from './world/terrain';
import { inWater } from '../sim/field';

/** Where the pointer is on the ground (desktop), for the aim line. */
const aim: { point: Vec2 | null } = { point: null };

function placeOf(screen: ReturnType<typeof useApp.getState>['screen']): Place {
  if (screen.kind === 'retrieve' || screen.kind === 'search') return screen.place;
  if (screen.kind === 'shelter') return 'shelter';
  return 'home';
}

// ---------------------------------------------------------------------------
// Simulation runner
// ---------------------------------------------------------------------------

function Runner() {
  const acc = useRef(0);
  const hudTimer = useRef(0);
  const finished = useRef<object | null>(null);

  useFrame((_, dt) => {
    const app = useApp.getState();
    const paused = app.panel !== null || app.dialog !== null;

    if (live.home) {
      const steered = driveKeeper(live.home.keeper, dt, paused);
      // Click-to-walk: head for the tapped point until close or the keys take over.
      const target = walkTarget.point;
      if (target && !steered && !paused) {
        const dx = target.x - live.home.keeper.pos.x;
        const dz = target.z - live.home.keeper.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.6) walkTarget.point = null;
        else {
          // Walk round buildings rather than into them.
          const next = routeAround(live.home.keeper.pos, target);
          const nx = next.x - live.home.keeper.pos.x;
          const nz = next.z - live.home.keeper.pos.z;
          const nd = Math.hypot(nx, nz) || 1;
          setHomeInput(live.home, { x: nx / nd, z: nz / nd }, d > 6);
        }
      } else if (steered) walkTarget.point = null;
    }
    if (live.field) driveKeeper(live.field.keeper, dt, paused);
    if (live.search) driveKeeper(live.search.keeper, dt, paused);

    if (!paused) {
      acc.current += Math.min(dt, 0.1);
      while (acc.current >= FIXED_DT) {
        if (live.home) stepHome(live.home, FIXED_DT);
        if (live.field) stepSession(live.field, FIXED_DT);
        if (live.search) stepSearch(live.search, FIXED_DT);
        if (live.lesson) stepTraining(live.lesson, FIXED_DT);
        acc.current -= FIXED_DT;
      }
    } else acc.current = 0;

    if (live.home?.ate) {
      live.home.ate = false;
      homeDogAte();
    }
    const done =
      (live.field && live.field.phase === 'complete' && live.field) ||
      (live.search && live.search.phase === 'complete' && live.search) ||
      (live.lesson && live.lesson.phase === 'done' && live.lesson) ||
      null;
    if (done && finished.current !== done) {
      finished.current = done;
      setTimeout(() => activityFinished(), 900);
    }
    hudTimer.current += dt;
    if (hudTimer.current > 0.1) {
      hudTimer.current = 0;
      publish();
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

function groundPoint(
  e: { clientX: number; clientY: number },
  el: HTMLElement,
  camera: THREE.Camera,
  ray: THREE.Raycaster,
): Vec2 | null {
  const rect = el.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  ray.setFromCamera(ndc, camera);
  let groundY = 0;
  let hit: THREE.Vector3 | null = null;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ray.ray.direction.y) < 1e-4) return null;
    const t = (groundY - ray.ray.origin.y) / ray.ray.direction.y;
    if (t < 0) return null;
    hit = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
    groundY = heightAt(hit.x, hit.z);
  }
  return hit ? { x: hit.x, z: hit.z } : null;
}

/** Pulls the camera in toward the target if a building is in the way. */
function keepOutOfBuildings(target: THREE.Vector3, camera: THREE.Vector3): void {
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = target.x + (camera.x - target.x) * t;
    const y = target.y + (camera.y - target.y) * t;
    const z = target.z + (camera.z - target.z) * t;
    const blocked = HOME_SOLIDS.some(
      (b) =>
        x > b.minX - 0.4 &&
        x < b.maxX + 0.4 &&
        z > b.minZ - 0.4 &&
        z < b.maxZ + 0.4 &&
        y < b.height + 0.5,
    );
    if (blocked) {
      const keep = Math.max(0.15, (i - 1.5) / steps);
      camera.set(
        target.x + (camera.x - target.x) * keep,
        Math.max(target.y + 1.5, target.y + (camera.y - target.y) * keep + 1.5),
        target.z + (camera.z - target.z) * keep,
      );
      return;
    }
  }
}

function CameraRig() {
  const { camera, gl, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 70));
  const pos = useRef(new THREE.Vector3(0, 8, 90));
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
    button: number;
  } | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (pointer.current) return;
      pointer.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        button: e.button,
      };
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') aim.point = groundPoint(e, el, camera, raycaster);
      const p = pointer.current;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.hypot(dx, dy) < 10) return;
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
      if (useApp.getState().panel || useApp.getState().dialog) return;
      const point = groundPoint(e, el, camera, raycaster);
      if (point) tapGround(point);
    };
    const wheel = (e: WheelEvent) => {
      cameraState.zoom = Math.min(
        2.4,
        Math.max(0.5, cameraState.zoom * (1 + Math.sign(e.deltaY) * 0.1)),
      );
    };
    const menu = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: true });
    el.addEventListener('contextmenu', menu);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', menu);
    };
  }, [camera, gl, raycaster]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now() / 1000;
    const portrait = size.height > size.width;
    let target: Vec2 = { x: 0, z: 70 };
    let dist = 9;
    let pitch = cameraState.pitch;
    let autoYaw: number | null = null;

    const keeper = live.home?.keeper ?? live.field?.keeper ?? live.search?.keeper ?? null;
    if (keeper) {
      // Behind the keeper, turning with them. Out in the field the camera rises
      // and pulls back so whatever matters (the fall, the stake, the circle,
      // your dog) fits in view in front of you.
      const k = keeper.pos;
      target = k;
      autoYaw = keeper.heading;
      const reach = live.home ? 0 : framingReach(keeper);
      if (reach > 4) {
        // Aim between you and the far point, tilt down, and back off just far
        // enough that you stay in the lower part of the screen; the far point
        // then sits in the upper middle, clear of the messages.
        const half = (reach / 2) * Math.min(1, (reach - 4) / 6);
        const ahead = fromHeading(keeper.heading, half);
        target = { x: k.x + ahead.x, z: k.z + ahead.z };
        pitch = cameraState.pitch + Math.min(1, reach / 60) * 0.5;
        const fit = (half * Math.sin(pitch)) / Math.tan(0.3) + half * Math.cos(pitch);
        dist = Math.min(60, Math.max(8.5, fit));
      } else dist = 8.5;
      if (cameraState.watchDog && (live.field || live.search))
        target = (live.field ?? live.search)!.dog.pos;
    } else if (live.lesson) {
      const t = live.lesson;
      const k = t.keeper.pos;
      const d = t.dog.pos;
      target = { x: (k.x + d.x) / 2, z: (k.z + d.z) / 2 };
      dist =
        t.lesson === 'sit'
          ? 5
          : t.lesson === 'indicate'
            ? 9
            : t.lesson === 'cast'
              ? 22
              : Math.max(9, distance(k, d) * 0.9 + 6);
      pitch =
        t.lesson === 'sit'
          ? 0.3
          : t.lesson === 'cast'
            ? 0.62
            : t.lesson === 'indicate'
              ? 0.55
              : 0.42;
      autoYaw = t.lesson === 'sit' ? -Math.PI / 2 + 0.5 : Math.PI;
    }

    // Dragging looks around for a moment; steering brings the view straight back.
    const looking =
      now - cameraState.manualAt < 1.5 && steerState.lastActive < cameraState.manualAt;
    if (autoYaw !== null && !looking) {
      cameraState.yaw += wrapAngle(autoYaw - cameraState.yaw) * damp(keeper ? 12 : 1.4, dt);
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
    if (live.home) keepOutOfBuildings(look.current, desired);
    pos.current.lerp(desired, damp(4.5, dt));
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

// ---------------------------------------------------------------------------
// Props and markers
// ---------------------------------------------------------------------------

/** Rings spreading on the water round a swimming dog. */
function SwimRipple() {
  const rings = useMemo(
    () =>
      Array.from({ length: 3 }, () => {
        const m = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.68, 32),
          new THREE.MeshBasicMaterial({ color: '#e8f4f6', transparent: true, depthWrite: false }),
        );
        m.rotation.x = -Math.PI / 2;
        m.visible = false;
        return m;
      }),
    [],
  );
  useFrame((state) => {
    const s = live.field;
    const swimming = !!s && s.dog.swimming && inWater(s.field, s.dog.pos);
    const pond = s?.field.ponds?.[0];
    rings.forEach((ring, i) => {
      ring.visible = swimming && !!pond;
      if (!ring.visible || !s || !pond) return;
      const t = (state.clock.elapsedTime * 0.8 + i / rings.length) % 1;
      ring.position.set(s.dog.pos.x, waterLevel(pond) + 0.05, s.dog.pos.z);
      ring.scale.setScalar(1 + t * 2.4);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
    });
  });
  return (
    <>
      {rings.map((r, i) => (
        <primitive key={i} object={r} />
      ))}
    </>
  );
}

/** Dummies and balls; a fixed pool of meshes driven each frame. */
function Items() {
  const pool = useMemo(() => {
    const dummyGeo = new THREE.CapsuleGeometry(0.09, 0.34, 4, 10);
    const dummyMat = new THREE.MeshStandardMaterial({ color: '#f1ead6', roughness: 0.8 });
    const bandMat = new THREE.MeshStandardMaterial({ color: '#d5612f', roughness: 0.7 });
    const ballGeo = new THREE.SphereGeometry(0.1, 14, 10);
    const ballMat = new THREE.MeshStandardMaterial({ color: '#f0b429', roughness: 0.6 });
    return Array.from({ length: 16 }, () => {
      const g = new THREE.Group();
      const dummy = new THREE.Mesh(dummyGeo, dummyMat);
      dummy.rotation.z = Math.PI / 2;
      dummy.castShadow = true;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 10), bandMat);
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
      if (item && (item.state === 'flying' || item.state === 'lying')) {
        p.g.position.set(item.pos.x, heightAt(item.pos.x, item.pos.z) + item.y + 0.09, item.pos.z);
        p.g.rotation.y = i * 1.3;
        p.g.visible = true;
        p.ball.visible = item.kind === 'ball';
        p.dummy.visible = p.band.visible = item.kind !== 'ball';
      } else if (!item && lesson && i === 0 && lesson.scene.ball.visible) {
        const b = lesson.scene.ball;
        p.g.position.set(b.pos.x, heightAt(b.pos.x, b.pos.z) + b.y + 0.09, b.pos.z);
        p.g.visible = true;
        p.ball.visible = lesson.lesson === 'stop';
        p.dummy.visible = p.band.visible = lesson.lesson !== 'stop';
      } else p.g.visible = false;
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

/** A flag where each mark landed, so you know exactly where it fell. */
function FallFlags() {
  const flags = useMemo(
    () =>
      Array.from({ length: 4 }, () => {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6),
          new THREE.MeshStandardMaterial({ color: '#f3ead8' }),
        );
        pole.position.y = 0.8;
        const cloth = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.32),
          new THREE.MeshStandardMaterial({
            color: '#ffffff',
            emissive: '#ffffff',
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide,
          }),
        );
        cloth.position.set(0.25, 1.45, 0);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1.1, 32),
          new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        g.add(pole, cloth, ring);
        g.visible = false;
        return g;
      }),
    [],
  );
  useFrame((state) => {
    const marks = (live.field?.items ?? []).filter((i) => i.kind === 'mark' && i.state === 'lying');
    flags.forEach((g, i) => {
      const m = marks[i];
      if (!m) {
        g.visible = false;
        return;
      }
      g.visible = true;
      g.position.set(m.landing.x, heightAt(m.landing.x, m.landing.z), m.landing.z);
      g.children[1]!.rotation.y = Math.sin(state.clock.elapsedTime * 3 + i) * 0.3;
    });
  });
  return (
    <>
      {flags.map((g, i) => (
        <primitive key={i} object={g} />
      ))}
    </>
  );
}

/** Dotted line from the dog to where a click would send it (desktop hover). */
function AimLine() {
  const dots = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.09, 6, 4),
      new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      40,
    );
    m.count = 0;
    return m;
  }, []);
  const ring = useMemo(() => {
    const r = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.9, 28),
      new THREE.MeshBasicMaterial({ color: '#f3a24b', transparent: true, opacity: 0.9 }),
    );
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    return r;
  }, []);
  const tmp = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const s = live.field;
    const p = aim.point;
    let from: Vec2 | null = null;
    let to: Vec2 | null = null;
    if (s && p && !s.setup.free) {
      const atSide = s.dog.mode === 'sit' || s.dog.mode === 'heel';
      const waiting = s.dog.mode === 'stopped' || s.dog.mode === 'popped';
      if ((atSide && s.phase !== 'throwing') || waiting) {
        from = s.dog.pos;
        const t = atSide ? aimTarget(s, p) : { kind: 'spot' as const, point: p };
        to = t.kind === 'mark' ? t.item.landing : t.point;
      }
    } else if (live.search && p && live.search.phase !== 'complete') {
      from = live.search.dog.pos;
      to = p;
    }
    if (!from || !to) {
      dots.count = 0;
      ring.visible = false;
      return;
    }
    const d = distance(from, to);
    const n = Math.min(40, Math.max(2, Math.floor(d / 1.2)));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
      tmp.makeTranslation(x, heightAt(x, z) + 0.15, z);
      dots.setMatrixAt(i, tmp);
    }
    dots.count = n;
    dots.instanceMatrix.needsUpdate = true;
    ring.visible = true;
    ring.position.set(to.x, heightAt(to.x, to.z) + 0.06, to.z);
  });
  return (
    <>
      <primitive object={dots} />
      <primitive object={ring} />
    </>
  );
}

function BlindStakes({ session }: { session: RetrieveSession }) {
  return (
    <>
      {session.items
        .filter((i) => i.kind === 'blind')
        .map((s) => {
          const x = s.pos.x + 1.2;
          const z = s.pos.z;
          return (
            <group key={s.id} position={[x, heightAt(x, z), z]}>
              <mesh position={[0, 0.9, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, 1.8, 6]} />
                <meshStandardMaterial color="#e2622d" emissive="#e2622d" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0.22, 1.6, 0]}>
                <boxGeometry args={[0.44, 0.28, 0.02]} />
                <meshStandardMaterial color="#f3a24b" emissive="#f3a24b" emissiveIntensity={0.4} />
              </mesh>
            </group>
          );
        })}
    </>
  );
}

function SearchMarkers({ session }: { session: SearchSession }) {
  const c = session.setup.hintCenter;
  const centerRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = centerRef.current;
    const sc = live.search?.searchCenter;
    if (!m) return;
    m.visible = !!sc;
    if (sc) m.position.set(sc.x, heightAt(sc.x, sc.z) + 0.05, sc.z);
  });
  return (
    <>
      <mesh position={[c.x, heightAt(c.x, c.z) + 0.06, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[session.setup.hintRadius - 0.25, session.setup.hintRadius, 64]} />
        <meshBasicMaterial color="#f3a24b" transparent opacity={0.7} />
      </mesh>
      <mesh ref={centerRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.4, 1.65, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
    </>
  );
}

function Throwers({ session }: { session: RetrieveSession }) {
  return (
    <>
      {session.throwers.map((t, i) => (
        <PersonModel
          key={i}
          look={LOOKS.helper}
          view={() => ({
            pos: t.pos,
            heading: Math.atan2(
              session.items[i]!.landing.x - t.pos.x,
              session.items[i]!.landing.z - t.pos.z,
            ),
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
  const tagRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    lesson.scene.boxes.forEach((b, i) => {
      const tag = tagRefs.current[i];
      if (tag) tag.visible = b.hot;
    });
  });
  return (
    <>
      {lesson.scene.mound && (
        <mesh
          position={[
            lesson.scene.mound.x,
            heightAt(lesson.scene.mound.x, lesson.scene.mound.z) + 0.03,
            lesson.scene.mound.z,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[1.2, 24]} />
          <meshStandardMaterial color="#c9b98f" />
        </mesh>
      )}
      {lesson.scene.piles.map((p) => (
        <group key={p.id} position={[p.pos.x, heightAt(p.pos.x, p.pos.z), p.pos.z]}>
          {[0, 1, 2].map((k) => (
            <mesh
              key={k}
              position={[(k - 1) * 0.22, 0.1 + (k === 1 ? 0.12 : 0), 0]}
              rotation={[0, k * 0.6, Math.PI / 2]}
              castShadow
            >
              <capsuleGeometry args={[0.08, 0.32, 4, 8]} />
              <meshStandardMaterial color="#f1ead6" />
            </mesh>
          ))}
          <mesh position={[0, 0.7, -0.5]}>
            <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
            <meshStandardMaterial color="#d9622b" />
          </mesh>
        </group>
      ))}
      {lesson.scene.boxes.map((b, i) => (
        <group key={i} position={[b.pos.x, heightAt(b.pos.x, b.pos.z), b.pos.z]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
            <meshStandardMaterial color="#b88a5a" />
          </mesh>
          <mesh position={[0, 0.51, 0]}>
            <boxGeometry args={[0.36, 0.02, 0.36]} />
            <meshStandardMaterial color="#3a2c22" />
          </mesh>
          <mesh ref={(m) => (tagRefs.current[i] = m)} position={[0, 0.8, 0]} visible={false}>
            <coneGeometry args={[0.16, 0.32, 4]} />
            <meshStandardMaterial color="#e2622d" emissive="#e2622d" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** A floating arrow over the current goal at home. */
function GoalBeacon() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    const game = useApp.getState().game;
    if (!g) return;
    const target = game && live.home ? objective(game).target : null;
    const p = target ? landmarkPos(target) : null;
    g.visible = !!p;
    if (p)
      g.position.set(
        p.x,
        heightAt(p.x, p.z) + 3.2 + Math.sin(state.clock.elapsedTime * 2.5) * 0.25,
        p.z,
      );
    g.rotation.y += 0.02;
  });
  return (
    <group ref={ref} visible={false}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.32, 0.7, 4]} />
        <meshBasicMaterial color="#e2622d" />
      </mesh>
    </group>
  );
}

export function landmarkPos(id: Landmark): Vec2 | null {
  if (id === 'mara') return MARA_POS;
  if (id === 'dog') return live.home?.dog?.pos ?? null;
  return HOME_SPOTS.find((s) => s.id === id)?.pos ?? null;
}

/** A marker over the dog once it is far from you. */
function DogBeacon() {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame((state) => {
    const g = ref.current;
    const s = live.field ?? live.search;
    if (!g) return;
    if (!s) {
      g.visible = false;
      return;
    }
    const d = s.dog.pos;
    const y = heightAt(d.x, d.z);
    const toCamera = camera.position.distanceTo(new THREE.Vector3(d.x, y, d.z));
    g.visible = distance(d, s.keeper.pos) > 12;
    g.position.set(
      d.x,
      y + 1.4 + Math.sin(state.clock.elapsedTime * 3) * 0.08 + toCamera * 0.02,
      d.z,
    );
    g.scale.setScalar(Math.min(3.2, Math.max(0.6, toCamera / 22)));
  });
  return (
    <group ref={ref} visible={false}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.42, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Views of the live characters
// ---------------------------------------------------------------------------

function dogView(): DogView | null {
  if (live.home?.dog) {
    const d = live.home.dog;
    return {
      pos: d.pos,
      heading: d.heading,
      speed: d.speed,
      pose: d.pose,
      tell: d.tell,
      lookAt: d.lookAt,
      carrying: null,
    };
  }
  if (live.field) {
    const s = live.field;
    const carried = s.dog.carrying !== null ? s.items[s.dog.carrying] : undefined;
    const pond = s.dog.swimming ? s.field.ponds?.find(() => true) : undefined;
    return {
      pos: s.dog.pos,
      heading: s.dog.heading,
      speed: s.dog.speed,
      pose: s.dog.swimming ? 'stand' : s.dog.pose,
      tell: s.dog.tell,
      lookAt: s.dog.lookAt,
      carrying: carried ? (carried.kind === 'ball' ? 'ball' : 'dummy') : null,
      // Swimming: only head and back above the surface.
      groundY: pond ? waterLevel(pond) - 0.5 : undefined,
    };
  }
  if (live.search) {
    const d = live.search.dog;
    return {
      pos: d.pos,
      heading: d.heading,
      speed: d.speed,
      pose: d.pose,
      tell: d.tell,
      lookAt: d.lookAt,
      carrying: d.carrying !== null ? 'dummy' : null,
    };
  }
  if (live.lesson) {
    const d = live.lesson.dog;
    return {
      pos: d.pos,
      heading: d.heading,
      speed: d.speed,
      pose: d.pose,
      tell: d.tell,
      lookAt: d.lookAt,
      carrying: null,
    };
  }
  return null;
}

function keeperView(): KeeperView {
  const k = live.home?.keeper ?? live.field?.keeper ?? live.search?.keeper ?? live.lesson?.keeper;
  if (!k)
    return {
      pos: { x: 0, z: 78 },
      heading: Math.PI,
      speed: 0,
      action: 'none',
      actionTime: 9,
      signalHeading: 0,
      watch: null,
    };
  return {
    pos: k.pos,
    heading: k.heading,
    speed: k.speed,
    action: k.action,
    actionTime: k.actionTime,
    signalHeading: k.signalHeading,
    // The keeper's heading already faces what matters, so the model just follows it.
    watch: null,
  };
}

const still = (pos: Vec2, heading: number, pose: DogView['pose'] = 'sit'): DogView => ({
  pos,
  heading,
  speed: 0,
  pose,
  tell: { ears: 'neutral', tail: 'wag', noseDown: false, text: '' },
  lookAt: null,
  carrying: null,
});

/** A dam with young puppies stays in the paddock with them. */
const nursing = (game: NonNullable<ReturnType<typeof useApp.getState>['game']>, id: string) =>
  game.litters.some((l) => l.damId === id && l.puppies.some((p) => p.ageMonths < 3));

interface PupState {
  pos: Vec2;
  heading: number;
  speed: number;
  target: Vec2;
  wait: number;
  pose: 'stand' | 'sit' | 'down';
}

const randomInPaddock = (): Vec2 => ({
  x: PADDOCK.minX + 0.7 + Math.random() * (PADDOCK.maxX - PADDOCK.minX - 1.4),
  z: PADDOCK.minZ + 0.7 + Math.random() * (PADDOCK.maxZ - PADDOCK.minZ - 1.4),
});

/** The litter tumbling about the paddock, with their mother lying in the straw. */
function PaddockPuppies() {
  const game = useApp((s) => s.game);
  const states = useRef(new Map<string, PupState>());
  const pups = useMemo(() => (game ? game.litters.flatMap((l) => l.puppies) : []), [game]);
  const dam = useMemo(
    () => game?.dogs.find((d) => d.id !== game.activeDogId && nursing(game, d.id)) ?? null,
    [game],
  );
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    for (const p of pups) {
      let st = states.current.get(p.id);
      if (!st) {
        st = {
          pos: randomInPaddock(),
          heading: Math.random() * 6.28,
          speed: 0,
          target: randomInPaddock(),
          wait: Math.random() * 2,
          pose: 'stand',
        };
        states.current.set(p.id, st);
      }
      if (st.wait > 0) {
        st.wait -= dt;
        st.speed = Math.max(0, st.speed - dt * 4);
        continue;
      }
      const dx = st.target.x - st.pos.x;
      const dz = st.target.z - st.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.25) {
        st.target = randomInPaddock();
        st.wait = 0.6 + Math.random() * 3;
        const r = Math.random();
        st.pose = r < 0.15 ? 'down' : r < 0.4 ? 'sit' : 'stand';
        continue;
      }
      st.pose = 'stand';
      st.heading = turnToward(st.heading, Math.atan2(dx, dz), 5 * dt);
      st.speed =
        Math.min(1.1, st.speed + dt * 3) *
        Math.max(0.2, Math.cos(wrapAngle(Math.atan2(dx, dz) - st.heading)));
      st.pos = {
        x: st.pos.x + Math.sin(st.heading) * st.speed * dt,
        z: st.pos.z + Math.cos(st.heading) * st.speed * dt,
      };
    }
  });
  return (
    <>
      {dam && <AnyDog dog={dam} view={() => still({ x: 31.2, z: 56.4 }, Math.PI * 1.1, 'down')} />}
      {pups.map((p) => (
        <AnyDog
          key={p.id}
          dog={p}
          view={() => {
            const st = states.current.get(p.id);
            const growth = 0.55 + 0.45 * Math.min(1, p.ageMonths / 12);
            const base = still(st?.pos ?? { x: 31, z: 55 }, st?.heading ?? 0, st?.pose ?? 'stand');
            return { ...base, speed: st?.speed ?? 0, growth };
          }}
        />
      ))}
    </>
  );
}

function Bystanders({ place }: { place: Place }) {
  const game = useApp((s) => s.game);
  const screen = useApp((s) => s.screen);
  const event = useApp((s) => s.event);
  if (!game) return null;
  const maraHere =
    (place === 'home' && game.story === 'meetMara') ||
    (place === 'orchard' && screen.kind === 'search' && screen.job?.id === 'mara-keys') ||
    (place === 'trial' && !!event);
  const maraPos =
    place === 'home' ? MARA_POS : place === 'trial' ? { x: -16, z: 17 } : { x: -20, z: 16 };
  const rivals = event && event.def.place === place ? event.def.rivals : [];
  // Rival handlers wait behind the line with their dogs.
  const spots = [
    { x: -8, z: 16 },
    { x: 9, z: 16 },
    { x: 15, z: 17.5 },
  ];
  return (
    <>
      {maraHere && (
        <PersonModel
          look={LOOKS.mara}
          view={() => ({
            pos: maraPos,
            heading: Math.PI * (place === 'home' ? 0.9 : 0.8),
            speed: 0,
            action: 'none',
            actionTime: 9,
            signalHeading: 0,
            watch: live.home?.keeper.pos ?? null,
          })}
        />
      )}
      {rivals.map((r, i) => {
        const at = spots[i % spots.length]!;
        return (
          <group key={r.id}>
            <PersonModel
              look={LOOKS[r.look]}
              view={() => ({
                pos: at,
                heading: Math.PI,
                speed: 0,
                action: 'none',
                actionTime: 9,
                signalHeading: 0,
                watch: null,
              })}
            />
            <AnyDog
              dog={r.dog}
              view={() =>
                still(
                  { x: at.x + 0.9, z: at.z + 0.2 },
                  Math.PI * (i % 2 ? 0.9 : 1),
                  i % 2 ? 'down' : 'sit',
                )
              }
            />
          </group>
        );
      })}
      {place === 'home' && <PaddockPuppies />}
      {place === 'home' &&
        game.dogs.map((d, i) =>
          d.id === game.activeDogId || nursing(game, d.id) ? null : (
            <AnyDog
              key={d.id}
              dog={d}
              view={() => still(runPosition(i), Math.PI, d.energy < 50 ? 'down' : 'sit')}
            />
          ),
        )}
      {place === 'shelter' &&
        game.shelter.map((d, i) =>
          i === useApp.getState().shelterPick ? null : (
            <AnyDog
              key={d.id}
              dog={d}
              view={() => still({ x: -10 + i * 10, z: -19 }, 0, i % 2 ? 'down' : 'sit')}
            />
          ),
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------

export function Scene() {
  const runId = useApp((s) => s.runId);
  const screen = useApp((s) => s.screen);
  const game = useApp((s) => s.game);
  const place = placeOf(screen);
  const pondRestored = !!game && hasFlag(game, 'restored:duckPond');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const field = useMemo(() => fieldFor(place), [place, pondRestored]);

  const current: Dog | null = useMemo(() => {
    if (!game) return null;
    if (screen.kind === 'shelter') return game.shelter[useApp.getState().shelterPick] ?? null;
    return activeDog(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.activeDogId, game?.shelter.length, screen.kind, runId]);

  const wind = live.field
    ? windAt(live.field.wind, 0)
    : live.search
      ? windAt(live.search.wind, 0)
      : { heading: Math.PI * 1.1 };
  const strength = live.field?.wind.strength ?? live.search?.wind.strength ?? 0.3;

  return (
    <>
      <Runner />
      <CameraRig />
      <Sky />
      <Lighting
        focus={() =>
          live.home?.keeper.pos ??
          live.field?.keeper.pos ??
          live.search?.keeper.pos ??
          live.lesson?.keeper.pos ?? { x: 0, z: 70 }
        }
      />
      <WindClock heading={wind.heading} strength={strength} />
      <group key={place}>
        <Ground field={field} />
        <Grass field={field} />
        <Ponds field={field} />
        {place === 'home' && (
          <>
            <Suspense
              fallback={
                <>
                  <Hedges field={field} />
                  <Trees field={field} />
                  <Kennel />
                  <Yard
                    kennelName={game?.kennelName ?? ''}
                    bowlFilled={!!game?.bowlFilled}
                    gardenRestored={!!game && hasFlag(game, 'restored:scentGarden')}
                  />
                </>
              }
            >
              <HomeWorld
                field={field}
                kennelName={game?.kennelName ?? ''}
                bowlFilled={!!game?.bowlFilled}
                gardenRestored={!!game && hasFlag(game, 'restored:scentGarden')}
                runNames={game?.dogs.map((d) => d.name) ?? []}
                paddock={!!game && hasFlag(game, 'restored:whelpingRoom')}
              />
            </Suspense>
            <WindFlag x={-24} z={8} heading={wind.heading} strength={strength} />
            <WindFlag x={30} z={-40} heading={wind.heading} strength={strength} />
          </>
        )}
        {place === 'orchard' && (
          <>
            <Suspense fallback={<Orchard field={field} />}>
              <OrchardWorld field={field} />
            </Suspense>
            <WindFlag x={30} z={6} heading={wind.heading} strength={strength} />
          </>
        )}
        {place === 'green' && (
          <>
            <Suspense fallback={<VillageGreen field={field} />}>
              <GreenWorld field={field} />
              <VillageGreenExtras />
            </Suspense>
            <WindFlag x={-30} z={10} heading={wind.heading} strength={strength} />
          </>
        )}
        {place === 'shelter' && (
          <Suspense fallback={<Shelter field={field} />}>
            <ShelterWorld field={field} />
          </Suspense>
        )}
        {place === 'trial' && (
          <>
            <Suspense fallback={null}>
              <TrialWorld field={field} />
            </Suspense>
            <WindFlag x={-34} z={10} heading={wind.heading} strength={strength} />
          </>
        )}
      </group>
      <Items />
      <SwimRipple />
      <FallFlags />
      <TargetBeacons />
      <TargetTracker />
      <AimLine />
      <DogBeacon />
      <GoalBeacon />
      <PersonModel view={keeperView} />
      <Bystanders place={place} />
      <group key={`run-${runId}`}>
        {current && dogView() && (
          <AnyDog dog={current} view={() => dogView() ?? still({ x: 0, z: 0 }, 0)} />
        )}
        {live.field && <Throwers session={live.field} />}
        {live.field && <BlindStakes session={live.field} />}
        {live.search && <SearchMarkers session={live.search} />}
        {live.lesson && <LessonProps lesson={live.lesson} />}
      </group>
    </>
  );
}
