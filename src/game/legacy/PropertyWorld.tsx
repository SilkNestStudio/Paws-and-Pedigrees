import { Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import CharacterModel, { type CharacterPose } from './CharacterModel';
import { YardDog, YardKeeper } from '../playyard/Characters';
import { stepPlay, throwToy } from '../playyard/play';
import { homeGround, yardAim } from './propertyFetch';
import FetchToy from './FetchToy';
import PropertyScenery from './PropertyScenery';
import { canWalk, PLACES, propertyPath, walkStep, type GroundPoint, type PlaceId, type PropertyMotion } from './property';
import { destinationBearing, safeCameraPosition, shortestTurn } from './wayfinding';

export interface WorldSnapshot { keeper: GroundPoint; nearest: PlaceId | null; walking: boolean; dogBehavior: string; fetch?: { phase: string; returns: number; throws: number; charging: boolean; charge: number }; navigation?: ReturnType<typeof destinationBearing> & { place: PlaceId } }
export default function PropertyWorld({ motion, paused, companion, dogBuild, dogCollar, prepared, restored, kennelName, objective, onSnapshot, onReady, onCareComplete, retrieveAbility = 60 }: {
  motion: MutableRefObject<PropertyMotion>; paused: boolean; companion: boolean; prepared: boolean; restored: boolean;
  retrieveAbility?: number; dogBuild: 'companion' | 'stocky'; dogCollar?: string; onCareComplete?: (kind: 'meal' | 'water' | 'rest') => void;
  kennelName: string; objective: PlaceId; onSnapshot: (v: WorldSnapshot) => void; onReady: () => void;
}) {
  const keeper = useRef<Group>(null), dog = useRef<Group>(null), elapsed = useRef(0), publish = useRef(0), roam = useRef(0);
  const cameraTarget = useRef(new Vector3()), cameraPosition = useRef(new Vector3()), cameraStart = useRef(false);
  const [pose, setPose] = useState({ keeper: 'Idle' as CharacterPose, dog: 'Idle' as CharacterPose });
  useEffect(onReady, [onReady]);
  const turn = (model: Group | null, dx: number, dz: number, dt: number) => {
    if (!model || Math.hypot(dx, dz) < .001) return;
    const heading = Math.atan2(dx, dz);
    model.rotation.y += Math.atan2(Math.sin(heading - model.rotation.y), Math.cos(heading - model.rotation.y)) * (1 - Math.exp(-12 * dt));
  };
  useFrame(({ camera, size }, rawDelta) => {
    const dt = Math.min(rawDelta, .04), m = motion.current;
    let walking = false, dogMoving = false, dogFast = false, behavior = m.wait ? 'Waiting for you' : 'Taking in the courtyard';
    if (!paused) {
      elapsed.current += dt;
      if (m.keys.has('KeyQ')) { m.yaw += dt * 1.2; m.facing = null; }
      if (m.keys.has('KeyE')) { m.yaw -= dt * 1.2; m.facing = null; }
      const x = Number(m.keys.has('KeyD') || m.keys.has('ArrowRight')) - Number(m.keys.has('KeyA') || m.keys.has('ArrowLeft')) + m.stick.x;
      const z = Number(m.keys.has('KeyS') || m.keys.has('ArrowDown')) - Number(m.keys.has('KeyW') || m.keys.has('ArrowUp')) + m.stick.z;
      const before = { ...m.keeper };
      if (x || z) {
        m.route = []; const length = Math.max(1, Math.hypot(x, z)), speed = m.keys.has('ShiftLeft') || m.keys.has('ShiftRight') ? 4.3 : 2.8;
        walkStep(m.keeper, (x * Math.cos(m.yaw) + z * Math.sin(m.yaw)) / length * speed * dt, (-x * Math.sin(m.yaw) + z * Math.cos(m.yaw)) / length * speed * dt);
      } else if (m.route.length) {
        const target = m.route[0], dx = target.x - m.keeper.x, dz = target.z - m.keeper.z, distance = Math.hypot(dx, dz), step = Math.min(distance, 2.8 * dt);
        if (distance > .02) walkStep(m.keeper, dx / distance * step, dz / distance * step);
        if (distance <= step + .03) m.route.shift();
      }
      walking = Math.hypot(before.x - m.keeper.x, before.z - m.keeper.z) > .001;
      turn(keeper.current, m.keeper.x - before.x, m.keeper.z - before.z, dt);
      if (companion && m.playing) {
        const s = m.play; s.keeper = m.keeper; s.dog = m.dog;
        const angle = keeper.current?.rotation.y ?? s.keeperAngle;
        stepPlay(s, dt, { x: 0, z: 0 }, { ...homeGround, speed: 3.6 + retrieveAbility / 40 });
        s.keeperMoving = walking; if (!s.charging) s.keeperAngle = angle;
        if (s.charging && keeper.current) keeper.current.rotation.y = s.keeperAngle;
        if (dog.current) dog.current.rotation.y = s.dogAngle;
        behavior = s.charging ? 'Release to throw. Keep walking while your dog retrieves.' : s.feedback;
      } else if (companion) {
        if (m.care) {
          const target = m.dogRoute[0];
          if (target) {
            const dx = target.x - m.dog.x, dz = target.z - m.dog.z, distance = Math.hypot(dx, dz), step = Math.min(distance, 2.2 * dt);
            if (distance > .02) { walkStep(m.dog, dx / distance * step, dz / distance * step); turn(dog.current, dx, dz, dt); dogMoving = true; }
            if (distance <= step + .03) m.dogRoute.shift();
            behavior = 'Heading to the run';
          } else {
            if (dog.current) dog.current.rotation.y = Math.PI;
            behavior = m.care.kind === 'meal' ? 'Enjoying a meal' : m.care.kind === 'water' ? 'Having a drink' : 'Taking a quiet rest';
            m.care.remaining -= dt;
            if (m.care.remaining <= 0) { const kind = m.care.kind; m.care = null; roam.current = 5; onCareComplete?.(kind); }
          }
        } else {
        roam.current -= dt;
        const gap = Math.hypot(m.keeper.x - m.dog.x, m.keeper.z - m.dog.z);
        dogFast = gap > 4 || m.recall;
        if (!m.wait && (m.recall || gap > 3.6) && roam.current < .1) {
          m.dogRoute = propertyPath(m.dog, m.keeper); roam.current = .65;
        } else if (!m.wait && !m.recall && !m.dogRoute.length && roam.current <= 0) {
          const angle = elapsed.current * .73, target = { x: m.keeper.x + Math.cos(angle) * 2.5, z: m.keeper.z + Math.sin(angle) * 2.5 };
          if (canWalk(target)) m.dogRoute = propertyPath(m.dog, target);
          roam.current = 4.5;
        }
        if (m.recall && gap < 1.3) { m.recall = false; m.dogRoute = []; roam.current = 5; }
        const dogDestination = m.dogRoute[m.dogRoute.length - 1];
        if (gap < 1.5 && dogDestination && Math.hypot(dogDestination.x - m.keeper.x, dogDestination.z - m.keeper.z) < 1) {
          m.dogRoute = []; m.recall = false; roam.current = 4;
        }
        if (!m.wait && m.dogRoute.length) {
          const target = m.dogRoute[0], dx = target.x - m.dog.x, dz = target.z - m.dog.z, distance = Math.hypot(dx, dz), step = Math.min(distance, (gap > 4 || m.recall ? 3.6 : 1.3) * dt);
          if (distance > .02) { walkStep(m.dog, dx / distance * step, dz / distance * step); turn(dog.current, dx, dz, dt); dogMoving = true; }
          if (distance <= step + .03) m.dogRoute.shift();
        }
        behavior = m.wait ? 'Waiting for you' : m.recall ? 'Coming back to you' : dogMoving ? gap > 3.6 ? 'Keeping you company' : 'Exploring nearby' : 'Sniffing something interesting';
        }
      }
    }
    keeper.current?.position.set(m.keeper.x, .07, m.keeper.z);
    dog.current?.position.set(m.dog.x, .07, m.dog.z);
    // A requested camera turn also works while an objective panel is closing.
    if (m.facing !== null) {
      const difference = shortestTurn(m.yaw, m.facing);
      m.yaw += difference * (1 - Math.exp(-4 * dt));
      if (Math.abs(difference) < .005) { m.yaw = m.facing; m.facing = null; }
    }
    const portrait = size.width < size.height;
    const distance = m.overview ? 24 : portrait ? 12 : 10.5;
    const focus = new Vector3(m.keeper.x, 1.2, m.keeper.z);
    if (m.overview) focus.set(0, 0, 3);
    const desired = new Vector3(focus.x + Math.sin(m.yaw) * distance, focus.y + (m.overview ? 22 : 4.7), focus.z + Math.cos(m.yaw) * distance);
    const safe = m.overview ? desired : safeCameraPosition(focus, desired);
    desired.set(safe.x, safe.y, safe.z);
    if (!cameraStart.current) { cameraTarget.current.copy(focus); cameraPosition.current.copy(desired); cameraStart.current = true; }
    cameraPosition.current.lerp(desired, 1 - Math.exp(-5 * dt)); cameraTarget.current.lerp(focus, 1 - Math.exp(-7 * dt));
    // Recheck the smoothed path, so orbiting cannot cut through a wall between safe endpoints.
    const corrected = m.overview ? cameraPosition.current : safeCameraPosition(cameraTarget.current, cameraPosition.current);
    camera.position.set(corrected.x, corrected.y, corrected.z); camera.lookAt(cameraTarget.current);
    publish.current += rawDelta;
    if (publish.current > .1) {
      publish.current = 0;
      const nearby = PLACES.map(p => ({ ...p, distance: Math.hypot(p.point.x - m.keeper.x, p.point.z - m.keeper.z) })).sort((a, b) => a.distance - b.distance)[0];
      setPose({ keeper: walking ? m.keys.has('ShiftLeft') || m.keys.has('ShiftRight') ? 'Run' : 'Walk' : 'Idle', dog: m.care?.kind === 'rest' && !dogMoving ? 'Sit' : m.wait ? 'Sit' : dogMoving ? dogFast ? 'Run' : 'Walk' : 'Sniff' });
      const destination = PLACES.find(p => p.id === (m.destination ?? objective))!;
      const viewYaw = Math.atan2(camera.position.x - cameraTarget.current.x, camera.position.z - cameraTarget.current.z);
      const bearing = destinationBearing(m.keeper, destination.lookAt, viewYaw);
      onSnapshot({ keeper: { ...m.keeper }, nearest: nearby.distance < 2.5 ? nearby.id : null, walking, dogBehavior: behavior, fetch: m.playing ? { phase: m.play.phase, returns: m.play.returns, throws: m.play.throws, charging: m.play.charging, charge: m.play.charge } : undefined,
        navigation: { ...bearing, distance: Math.hypot(m.keeper.x-destination.point.x, m.keeper.z-destination.point.z), place: destination.id } });
    }
  });
  function groundClick(e: ThreeEvent<MouseEvent>) {
    if (paused || motion.current.playing || e.delta > 5) return;
    e.stopPropagation(); motion.current.route = propertyPath(motion.current.keeper, { x: e.point.x, z: e.point.z });
  }
  const target = PLACES.find(p => p.id === (motion.current.destination ?? objective))!.point;
  return <>
    <color attach="background" args={['#c9d9e2']}/><fog attach="fog" args={['#c9d9e2', 30, 85]}/>
    <hemisphereLight args={['#e4eef8', '#829080', 1.6]}/>
    <directionalLight position={[-15, 23, 12]} color="#fff0d7" intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-far={85} shadow-normalBias={.035}/>
    <PropertyScenery kennelName={kennelName} prepared={prepared} restored={restored}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .065, 8]} onClick={groundClick}
      onPointerDown={e => { const m = motion.current; if (paused || !m.playing || m.play.phase !== 'ready' || m.play.charging || e.button !== 0) return; e.stopPropagation(); m.route = []; m.play.aim = yardAim(e.point); m.play.charging = true; m.play.charge = 0; (e.target as Element).setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const m = motion.current; if (!paused && m.playing && m.play.phase === 'ready') m.play.aim = yardAim(e.point); }}
      onPointerUp={e => { const m = motion.current; if (!m.play.charging) return; e.stopPropagation(); m.play.aim = yardAim(e.point); if (!paused && m.playing) throwToy(m.play); else m.play.charging = false; (e.target as Element).releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { motion.current.play.charging = false; motion.current.play.charge = 0; }}><planeGeometry args={[32, 22]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <Suspense fallback={null}><group ref={keeper} rotation={[0, Math.PI, 0]}>{!motion.current.playing && <CharacterModel kind="keeper" pose={pose.keeper} paused={paused}/>}</group></Suspense>
    {companion && <Suspense fallback={null}><group ref={dog}>{!motion.current.playing && <CharacterModel kind={dogBuild} collar={dogCollar} pose={pose.dog} paused={paused}/>}</group></Suspense>}
    {companion && motion.current.playing && <><YardKeeper state={motion.current.play} paused={paused}/><YardDog state={motion.current.play} paused={paused} build={dogBuild} collar={dogCollar}/><FetchToy state={motion.current.play}/></>}
    <mesh position={[target.x, .083, target.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.55, .59, 48]}/><meshBasicMaterial color="#f7d49a" transparent opacity={.85}/></mesh>
  </>;
}
