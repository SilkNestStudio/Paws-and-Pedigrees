import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { YardPlay } from './play';
import { DOGS } from './play';

function Blob({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={at} scale={size} castShadow receiveShadow><sphereGeometry args={[1, 24, 16]}/><meshToonMaterial color={color}/></mesh>;
}
export function YardDog({ state, paused, collar, build = 'companion', sitting = false }: { state: YardPlay; paused: boolean; collar?: string; build?: 'companion' | 'stocky'; sitting?: boolean }) {
  const root = useRef<Group>(null), body = useRef<Group>(null), tail = useRef<Group>(null), head = useRef<Group>(null), legs = useRef<(Group | null)[]>([]);
  useFrame(() => {
    if (!root.current) return;
    root.current.position.set(state.dog.x, .05, state.dog.z);
    root.current.rotation.y += Math.atan2(Math.sin(state.dogAngle - root.current.rotation.y), Math.cos(state.dogAngle - root.current.rotation.y)) * .2;
    if (paused) return;
    const gait = state.time * (state.phase === 'ready' ? 9 : 17);
    if (body.current) body.current.position.y = state.dogMoving ? Math.sin(gait * 2) * .035 : Math.sin(state.time * 2) * .01;
    legs.current.forEach((leg, i) => { if (leg) leg.rotation.x = state.dogMoving ? Math.sin(gait + (i === 0 || i === 3 ? 0 : Math.PI)) * .55 : 0; });
    if (tail.current) tail.current.rotation.z = Math.sin(state.time * (state.phase === 'ready' ? 8 : 13)) * .4;
    if (head.current) { head.current.rotation.z = state.phase === 'hesitate' ? .22 : Math.sin(state.time * 2) * .025; head.current.rotation.x = state.phase === 'ready' && !state.charging && !state.recalled ? .15 : 0; }
  });
  const coat = DOGS[state.personality].color, dark = state.personality === 'pip' ? '#82442a' : '#976e59';
  return <group ref={root} scale={build === 'stocky' ? [1.18, .88, 1.05] : [1, 1, 1]}><group ref={body} rotation={[sitting ? -.18 : 0, 0, 0]}>
    <Blob at={[0, .59, -.14]} size={[.34, .34, .62]} color={coat}/><Blob at={[0, .59, .24]} size={[.29, .32, .27]} color="#fff0d4"/>
    {[[.23, .28], [-.23, .28], [.23, -.48], [-.23, -.48]].map(([x, z], i) => <group key={i} ref={g => { legs.current[i] = g; }} position={[x, .49, z]}><Blob at={[0, -.16, 0]} size={[.115, .25, .12]} color={coat}/><Blob at={[0, -.38, .035]} size={[.14, .1, .18]} color={i < 2 ? '#fff0d4' : coat}/></group>)}
    <group ref={head} position={[0, .93, .37]}>
      <Blob at={[0, .06, 0]} size={[.37, .34, .34]} color={coat}/><Blob at={[0, -.08, .28]} size={[.235, .175, .25]} color="#fff0d4"/>
      <Blob at={[0, -.025, .49]} size={[.1, .07, .06]} color="#3c2940"/>
      {[-1, 1].map(side => <group key={side}><Blob at={[side * .19, .11, .25]} size={[.095, .12, .065]} color="#fffaf0"/><Blob at={[side * .19, .1, .304]} size={[.052, .075, .026]} color="#3c2940"/><Blob at={[side * .18, .133, .325]} size={[.018, .022, .009]} color="#ffffff"/><group position={[side * .32, .13, -.04]} rotation={[.12, 0, side * .22]}><Blob at={[0, -.1, 0]} size={[.13, .3, .18]} color={dark}/></group><Blob at={[side * .2, .28, .2]} size={[.11, .026, .045]} color={dark}/></group>)}
      <Blob at={[0, -.215, .29]} size={[.08, .065, .11]} color="#ed929b"/>
    </group>
    <mesh position={[0, .79, .25]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.255, .044, 8, 30]}/><meshToonMaterial color={collar ?? (state.personality === 'pip' ? '#8d66be' : '#ed8665')}/></mesh>
    <Blob at={[0, .56, .45]} size={[.06, .075, .025]} color="#ffd169"/>
    <group ref={tail} position={[0, .78, -.69]} rotation={[-.6, 0, 0]}><Blob at={[0, .15, -.14]} size={[.1, .24, .12]} color={coat}/><Blob at={[0, .34, -.24]} size={[.08, .17, .1]} color="#fff0d4"/></group>
  </group></group>;
}
export function YardKeeper({ state, paused }: { state: YardPlay; paused: boolean }) {
  const root = useRef<Group>(null), left = useRef<Group>(null), right = useRef<Group>(null), arm = useRef<Group>(null);
  useFrame(() => {
    if (!root.current) return;
    root.current.position.set(state.keeper.x, .05, state.keeper.z);
    root.current.rotation.y += Math.atan2(Math.sin(state.keeperAngle - root.current.rotation.y), Math.cos(state.keeperAngle - root.current.rotation.y)) * .25;
    if (paused) return;
    if (left.current) left.current.rotation.x = state.keeperMoving ? Math.sin(state.time * 10) * .5 : 0;
    if (right.current) right.current.rotation.x = state.keeperMoving ? -Math.sin(state.time * 10) * .5 : 0;
    if (arm.current) arm.current.rotation.x = state.charging ? -1.5 - state.charge * .6 : state.phase !== 'ready' && state.phaseTime < .35 ? -1.2 + state.phaseTime * 3 : 0;
  });
  return <group ref={root}>
    {[[-.15, left], [.15, right]].map(([x, ref], i) => <group key={i} ref={ref as typeof left} position={[x as number, .86, 0]}><Blob at={[0, -.28, 0]} size={[.14, .36, .15]} color="#8272ad"/><Blob at={[0, -.7, .085]} size={[.16, .12, .24]} color="#b8624c"/></group>)}
    <Blob at={[0, 1.12, 0]} size={[.31, .4, .22]} color="#fff0cd"/><Blob at={[0, 1.02, .16]} size={[.24, .27, .09]} color="#db8265"/>
    <group position={[-.34, 1.3, 0]}><Blob at={[0, -.19, 0]} size={[.11, .27, .12]} color="#fff0cd"/><Blob at={[0, -.46, .02]} size={[.085, .11, .095]} color="#dca47c"/></group>
    <group ref={arm} position={[.34, 1.3, 0]}><Blob at={[0, -.19, 0]} size={[.11, .27, .12]} color="#fff0cd"/><Blob at={[0, -.46, .02]} size={[.085, .11, .095]} color="#dca47c"/></group>
    <Blob at={[0, 1.75, 0]} size={[.25, .3, .24]} color="#e4ad87"/><Blob at={[0, 1.92, -.03]} size={[.27, .2, .245]} color="#66444a"/><Blob at={[-.16, 1.83, .11]} size={[.13, .13, .16]} color="#66444a"/>
    {[-.085, .085].map(x => <Blob key={x} at={[x, 1.75, .219]} size={[.024, .038, .017]} color="#413347"/>)}<Blob at={[0, 1.68, .24]} size={[.045, .045, .05]} color="#d79674"/>
  </group>;
}
