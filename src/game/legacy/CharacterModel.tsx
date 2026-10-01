import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { YardDog, YardKeeper } from '../playyard/Characters';
import { newPlay } from '../playyard/play';

export type CharacterPose = 'Idle' | 'Walk' | 'Run' | 'Sniff' | 'Sit';
/** Shared cartoon characters; the scene owns position and behavior. */
export default function CharacterModel({ kind, pose = 'Idle', paused = false, pace = 1, collar }: {
  kind: 'keeper' | 'companion' | 'stocky'; pose?: CharacterPose; paused?: boolean; pace?: number; collar?: string;
}) {
  const state = useRef(newPlay(kind === 'stocky' ? 'june' : 'pip'));
  useFrame((_, dt) => {
    const s = state.current;
    s.keeper = s.dog = { x: 0, z: 0 }; s.keeperAngle = s.dogAngle = 0;
    if (!paused) s.time += Math.min(dt, .04) * pace;
    s.keeperMoving = s.dogMoving = pose === 'Walk' || pose === 'Run';
    s.phase = pose === 'Run' ? 'chase' : 'ready';
    s.recalled = pose !== 'Sniff';
  });
  return kind === 'keeper' ? <YardKeeper state={state.current} paused={paused}/> : <YardDog state={state.current} paused={paused} build={kind} collar={collar} sitting={pose === 'Sit'}/>;
}
