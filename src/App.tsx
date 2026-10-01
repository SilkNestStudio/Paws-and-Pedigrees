import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from './render/Scene';
import { Hud } from './ui/Hud';
import { Panels } from './ui/Panels';
import { cameraState, input } from './app/input';
import { useGame } from './app/store';
import * as act from './app/actions';

const PREVENT = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (PREVENT.has(e.code)) e.preventDefault();
      const game = useGame.getState();
      if (e.code === 'Escape') {
        game.setPanel(game.panel === 'none' ? 'book' : game.welcomed ? 'none' : game.panel);
        return;
      }
      if (e.code === 'KeyB' || e.code === 'Tab') {
        act.openBook();
        return;
      }
      if (game.panel !== 'none') return;
      input.keys.add(e.code);
      if (e.repeat) return;
      const lesson = game.screen.kind === 'lesson';
      switch (e.code) {
        case 'Space':
          if (lesson) act.yes();
          else act.whistle();
          break;
        case 'KeyF':
          if (lesson) act.lessonCue('full');
          else act.steady();
          break;
        case 'KeyG':
          if (lesson) act.lessonCue('gentle');
          break;
        case 'KeyR':
          act.recall();
          break;
        case 'KeyT':
          act.throwsPlease();
          break;
        case 'Digit1':
          act.lessonCue('left');
          break;
        case 'Digit2':
          act.lessonCue('back');
          break;
        case 'Digit3':
          act.lessonCue('right');
          break;
        case 'KeyQ':
          cameraState.yaw += 0.35;
          cameraState.manualAt = performance.now() / 1000;
          break;
        case 'KeyE':
          cameraState.yaw -= 0.35;
          cameraState.manualAt = performance.now() / 1000;
          break;
        case 'KeyV':
          cameraState.watchDog = !cameraState.watchDog;
          break;
        case 'KeyN':
          game.restart();
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
  return (
    <div className="app">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.75]}
        camera={{ fov: 50, near: 0.1, far: 900, position: [0, 6, 28] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <Scene />
      </Canvas>
      <Hud />
      <Panels />
    </div>
  );
}
