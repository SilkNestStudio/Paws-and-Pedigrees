import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { distance } from '../core/math';
import { HOME_SPOTS, type SpotId } from '../sim/home';
import { hasFlag } from '../game/state';
import { live, useApp } from '../app/store';
import { heightAt } from './world/terrain';

/**
 * Showing where things can be used at home: a ring on the ground at each
 * spot (bright and pulsing when you are close enough to use it) and a name
 * label above it in the interface.
 */
export interface SpotLabel {
  id: SpotId;
  text: string;
  /** Screen position in percent. */
  x: number;
  y: number;
  ready: boolean;
}

export const useSpotLabels = create<{ list: SpotLabel[] }>(() => ({ list: [] }));

/** Spots worth showing right now (some only matter at certain times). */
function visibleSpots() {
  const game = useApp.getState().game;
  return HOME_SPOTS.filter((s) => {
    if (s.id === 'bowl') return !!game?.dogs.length;
    return true;
  });
}

function labelFor(id: SpotId, fallback: string): string {
  const game = useApp.getState().game;
  if (id === 'scentGarden' && game && hasFlag(game, 'restored:scentGarden')) return 'Scent garden';
  if (id === 'runs' && game && game.dogs.length > 1) return 'Kennel runs: your dogs';
  return fallback;
}

const READY = new THREE.Color('#e2622d');
const IDLE = new THREE.Color('#fff4dc');

export function SpotRings() {
  const rings = useMemo(
    () =>
      HOME_SPOTS.map((spot) => {
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.62, 0.8, 40),
          new THREE.MeshBasicMaterial({
            color: IDLE,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(spot.pos.x, heightAt(spot.pos.x, spot.pos.z) + 0.04, spot.pos.z);
        mesh.renderOrder = 2;
        return { id: spot.id, mesh };
      }),
    [],
  );
  useFrame((state) => {
    const home = live.home;
    const shown = new Set(visibleSpots().map((s) => s.id));
    for (const { id, mesh } of rings) {
      mesh.visible = !!home && shown.has(id);
      if (!mesh.visible) continue;
      const ready = home!.nearSpot === id;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
      mesh.scale.setScalar(ready ? 1.25 * pulse : 1);
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.color.copy(ready ? READY : IDLE);
      m.opacity = ready ? 0.95 : 0.6;
    }
  });
  return (
    <>
      {rings.map((r) => (
        <primitive key={r.id} object={r.mesh} />
      ))}
    </>
  );
}

/** Projects nearby spots to the screen for their name labels. */
export function SpotTracker() {
  const { camera } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const timer = useRef(0);
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 0.08) return;
    timer.current = 0;
    const home = live.home;
    if (!home) {
      if (useSpotLabels.getState().list.length) useSpotLabels.setState({ list: [] });
      return;
    }
    const list: SpotLabel[] = [];
    for (const spot of visibleSpots()) {
      if (distance(spot.pos, home.keeper.pos) > 16) continue;
      v.set(spot.pos.x, heightAt(spot.pos.x, spot.pos.z) + 1.9, spot.pos.z).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.9) continue;
      list.push({
        id: spot.id,
        text: labelFor(spot.id, spot.label),
        x: (v.x * 0.5 + 0.5) * 100,
        y: (1 - (v.y * 0.5 + 0.5)) * 100,
        ready: home.nearSpot === spot.id,
      });
    }
    useSpotLabels.setState({ list });
  });
  return null;
}
