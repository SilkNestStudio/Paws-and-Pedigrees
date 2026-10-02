import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from './render/Scene';
import { Hud } from './ui/Hud';
import { Panels } from './ui/Panels';
import { Story } from './ui/Story';
import { cameraState, input } from './app/input';
import { useApp } from './app/store';
import { advanceDialog, boot } from './app/flow';
import * as act from './app/actions';

const PREVENT = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (PREVENT.has(e.code)) e.preventDefault();
      const app = useApp.getState();
      if (app.dialog) {
        if (['Space', 'Enter', 'KeyE', 'KeyF'].includes(e.code) && !e.repeat) advanceDialog();
        return;
      }
      if (e.code === 'Escape') {
        useApp.setState({ panel: app.panel ? null : 'menu' });
        return;
      }
      if (app.panel) return;
      input.keys.add(e.code);
      if (e.repeat) return;
      const kind = app.screen.kind;
      if (e.code === 'KeyQ' || (e.code === 'KeyE' && kind !== 'home')) {
        cameraState.yaw += e.code === 'KeyQ' ? 0.35 : -0.35;
        cameraState.manualAt = performance.now() / 1000;
      }
      switch (kind) {
        case 'home':
          if (e.code === 'KeyE' || e.code === 'Enter') act.interact();
          if (e.code === 'KeyF') act.pat();
          if (e.code === 'KeyR' || e.code === 'Space') act.recall();
          break;
        case 'retrieve':
        case 'shelter':
          if (e.code === 'Space') act.whistle();
          if (e.code === 'KeyR') act.recall();
          if (e.code === 'KeyF') act.steady();
          if (e.code === 'KeyT') act.throwsPlease();
          if (e.code === 'KeyV') cameraState.watchDog = !cameraState.watchDog;
          break;
        case 'search':
          if (e.code === 'Space') act.showMe();
          if (e.code === 'KeyX') act.searchOn();
          if (e.code === 'KeyR') act.recall();
          break;
        case 'lesson':
          if (e.code === 'Space') act.yes();
          if (e.code === 'KeyF') act.lessonCue('full');
          if (e.code === 'KeyG') act.lessonCue('gentle');
          if (e.code === 'Digit1') act.lessonCue('left');
          if (e.code === 'Digit2') act.lessonCue('back');
          if (e.code === 'Digit3') act.lessonCue('right');
          break;
      }
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}

export default function App() {
  useKeyboard();
  useEffect(() => {
    void boot();
  }, []);
  return (
    <div className="app">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.75]}
        camera={{ fov: 50, near: 0.1, far: 900, position: [0, 8, 90] }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Scene />
      </Canvas>
      <Hud />
      <Panels />
      <Story />
    </div>
  );
}
