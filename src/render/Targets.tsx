import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { distance, type Vec2 } from '../core/math';
import { live } from '../app/store';
import { heightAt } from './world/terrain';

/**
 * Making the important places in a field easy to see: a tall light beam and
 * marker over each fall, the blind stake and the search area, plus on-screen
 * labels (or edge arrows when off screen) with distances.
 */
export interface Target {
  id: string;
  label: string;
  pos: Vec2;
  colour: string;
}

export interface Indicator extends Target {
  /** Screen position in percent (0-100). */
  x: number;
  y: number;
  onScreen: boolean;
  /** Angle for the edge arrow, radians (0 = up). */
  angle: number;
  metres: number;
}

export const useIndicators = create<{ list: Indicator[] }>(() => ({ list: [] }));

/** The things worth pointing out right now. */
export function currentTargets(): Target[] {
  const out: Target[] = [];
  const f = live.field;
  if (f && !f.setup.free) {
    f.items.forEach((i) => {
      if (i.kind === 'mark' && i.state === 'lying')
        out.push({ id: `m${i.id}`, label: 'Fall', pos: i.landing, colour: '#ffffff' });
      if (i.kind === 'blind' && i.state === 'lying')
        out.push({
          id: `b${i.id}`,
          label: 'Blind',
          pos: { x: i.pos.x + 1.2, z: i.pos.z },
          colour: '#f3a24b',
        });
    });
    if (distance(f.dog.pos, f.keeper.pos) > 12)
      out.push({ id: 'dog', label: f.dogName, pos: f.dog.pos, colour: '#e2622d' });
  }
  const s = live.search;
  if (s && s.phase !== 'complete' && s.phase !== 'returning') {
    out.push({ id: 'area', label: 'Search area', pos: s.setup.hintCenter, colour: '#f3c14b' });
    if (distance(s.dog.pos, s.keeper.pos) > 12)
      out.push({ id: 'dog', label: s.dogName, pos: s.dog.pos, colour: '#e2622d' });
  }
  return out;
}

const BEAM_COUNT = 6;

/** Beams and floating markers over the current targets (not the dog; it has its own). */
export function TargetBeacons() {
  const { camera } = useThree();
  const beacons = useMemo(
    () =>
      Array.from({ length: BEAM_COUNT }, () => {
        const g = new THREE.Group();
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.35, 16, 12, 1, true),
          new THREE.MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        beam.position.y = 8;
        const marker = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.35, 0),
          new THREE.MeshBasicMaterial({ color: '#ffffff' }),
        );
        marker.name = 'marker';
        g.add(beam, marker);
        g.visible = false;
        return g;
      }),
    [],
  );
  useFrame((state) => {
    const targets = currentTargets().filter((t) => t.id !== 'dog');
    beacons.forEach((g, i) => {
      const t = targets[i];
      if (!t) {
        g.visible = false;
        return;
      }
      const y = heightAt(t.pos.x, t.pos.z);
      g.visible = true;
      g.position.set(t.pos.x, y, t.pos.z);
      const toCamera = camera.position.distanceTo(new THREE.Vector3(t.pos.x, y, t.pos.z));
      const s = Math.min(4, Math.max(1, toCamera / 18));
      const beam = g.children[0] as THREE.Mesh;
      beam.scale.set(s, 1, s);
      (beam.material as THREE.MeshBasicMaterial).color.set(t.colour);
      const marker = g.children[1] as THREE.Mesh;
      marker.position.y = 2.6 + s * 0.6 + Math.sin(state.clock.elapsedTime * 2.4 + i) * 0.2;
      marker.scale.setScalar(s);
      marker.rotation.y += 0.03;
      (marker.material as THREE.MeshBasicMaterial).color.set(t.colour);
    });
  });
  return (
    <>
      {beacons.map((b, i) => (
        <primitive key={i} object={b} />
      ))}
    </>
  );
}

/** Projects targets to the screen and publishes them for the interface. */
export function TargetTracker() {
  const { camera } = useThree();
  const timer = useRef(0);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 0.08) return;
    timer.current = 0;
    const keeper = live.field?.keeper.pos ?? live.search?.keeper.pos;
    const list: Indicator[] = [];
    for (const t of currentTargets()) {
      v.set(t.pos.x, heightAt(t.pos.x, t.pos.z) + 1.2, t.pos.z).project(camera);
      const behind = v.z > 1;
      let nx = behind ? -v.x : v.x;
      let ny = behind ? -v.y : v.y;
      const onScreen = !behind && Math.abs(nx) < 0.9 && Math.abs(ny) < 0.82;
      const angle = Math.atan2(nx, ny);
      if (!onScreen) {
        const k = 0.86 / Math.max(Math.abs(nx), Math.abs(ny) / 0.9, 1e-3);
        nx *= k;
        ny *= k;
      }
      list.push({
        ...t,
        x: (nx * 0.5 + 0.5) * 100,
        y: (1 - (ny * 0.5 + 0.5)) * 100,
        onScreen,
        angle,
        metres: keeper ? Math.round(distance(keeper, t.pos)) : 0,
      });
    }
    // Keep labels from sitting on top of each other.
    const shown = list.filter((t) => t.onScreen).sort((a, b) => a.y - b.y);
    for (let i = 1; i < shown.length; i++) {
      const prev = shown[i - 1]!;
      const cur = shown[i]!;
      if (Math.abs(cur.x - prev.x) < 12 && cur.y - prev.y < 4) cur.y = prev.y + 4;
    }
    useIndicators.setState({ list });
  });
  return null;
}
