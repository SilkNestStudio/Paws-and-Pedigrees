import { RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import { BEDS } from './play';

function SoftBox({ at, size, color, radius = .12, rotation = [0, 0, 0] }: { at: [number, number, number]; size: [number, number, number]; color: string; radius?: number; rotation?: [number, number, number] }) {
  return <RoundedBox position={at} args={size} radius={radius} smoothness={3} rotation={rotation} castShadow receiveShadow><meshToonMaterial color={color}/></RoundedBox>;
}
function Tree({ at, scale = 1, color }: { at: [number, number, number]; scale?: number; color: string }) {
  return <group position={at} scale={scale}><mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[.16, .28, 3, 12]}/><meshToonMaterial color="#bb8a68"/></mesh>{[[0, 3.1, 0, 1.25], [-.7, 2.7, .2, .9], [.65, 3, .1, 1]].map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]} scale={[1, 1.12, 1]} castShadow><sphereGeometry args={[r, 24, 16]}/><meshToonMaterial color={color}/></mesh>)}</group>;
}
export default function Scenery() {
  const flowers = useMemo(() => Array.from({ length: 65 }, (_, i) => ({ x: Math.sin(i * 13.7) * 9.8, z: i % 2 ? -8.35 : 10.3, color: ['#fff4c9', '#f5a0aa', '#d1a7e6'][i % 3] })), []);
  return <>
    <color attach="background" args={['#c6e9ed']}/><fog attach="fog" args={['#d8e9ed', 30, 70]}/>
    <hemisphereLight args={['#fff5e5', '#b9b888', 2.3]}/><directionalLight position={[-10, 18, 6]} color="#fff0d0" intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={17} shadow-camera-bottom={-17} shadow-normalBias={.045}/>
    <SoftBox at={[0, -.55, 1]} size={[23, 1, 21]} color="#d0c397" radius={.45}/><SoftBox at={[0, -.11, 1]} size={[22.6, .24, 20.6]} color="#bdd582" radius={.11}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.03, 1]} scale={[1.55, 1, 1]} receiveShadow><circleGeometry args={[6.4, 64]}/><meshToonMaterial color="#c9df91"/></mesh>
    <mesh position={[0, -1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 200]}/><meshToonMaterial color="#bedac0"/></mesh>
    {[-10.3, 10.3].map(x => <group key={x}>{Array.from({ length: 23 }, (_, i) => <SoftBox key={i} at={[x, .62, -8 + i * .8]} size={[.18, 1.15, .38]} color="#fff4da" radius={.07}/>)}<SoftBox at={[x, .72, .8]} size={[.14, .14, 18.4]} color="#efe0c2" radius={.04}/></group>)}
    {[-8.3, 10.3].map(z => <group key={z}>{Array.from({ length: 25 }, (_, i) => <SoftBox key={i} at={[-9.8 + i * .8, .6, z]} size={[.38, 1.1, .18]} color="#fff4da" radius={.07}/>)}<SoftBox at={[0, .72, z]} size={[20, .14, .14]} color="#efe0c2" radius={.04}/></group>)}
    <group position={[-1, 0, -11]}>
      <SoftBox at={[0, 1.65, 0]} size={[6.3, 3.3, 3.5]} color="#ffe2b6" radius={.23}/>
      {[-1, 1].map(side => <SoftBox key={side} at={[0, 3.76, side * .95]} size={[7.1, .25, 2.55]} color="#78aaa5" radius={.1} rotation={[-side * .5, 0, 0]}/>)}
      <SoftBox at={[0, 1.1, 1.82]} size={[1.25, 2.2, .18]} color="#dd8267" radius={.28}/><SoftBox at={[0, .1, 2.15]} size={[1.9, .2, .7]} color="#e5c9aa"/>
      {[-2, 2].map(x => <group key={x} position={[x, 1.9, 1.83]}><mesh><torusGeometry args={[.52, .085, 12, 36]}/><meshToonMaterial color="#fcf2d9"/></mesh><mesh><circleGeometry args={[.48, 32]}/><meshToonMaterial color="#78afc1"/></mesh><SoftBox at={[0, -.72, .18]} size={[1.25, .25, .5]} color="#b998ce" radius={.08}/></group>)}
    </group>
    {BEDS.map((b, i) => <group key={i} position={[b.x, 0, b.z]}><mesh position={[0, .2, 0]} castShadow><cylinderGeometry args={[b.r, b.r + .07, .4, 32]}/><meshToonMaterial color="#d49b7c"/></mesh><mesh position={[0, .41, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[b.r - .1, 32]}/><meshToonMaterial color="#a17d69"/></mesh>{Array.from({ length: 7 }, (_, n) => <group key={n} position={[Math.cos(n * 2.4) * b.r * .6, .44, Math.sin(n * 2.4) * b.r * .6]}><mesh position={[0, .22, 0]}><capsuleGeometry args={[.045, .35, 4, 8]}/><meshToonMaterial color="#84ac72"/></mesh><mesh position={[0, .47, 0]} castShadow><sphereGeometry args={[.19, 16, 12]}/><meshToonMaterial color={['#f1a2b3', '#f3ce75', '#c1a0dc'][i]}/></mesh></group>)}</group>)}
    {flowers.map((f, i) => <mesh key={i} position={[f.x, .17, f.z]} scale={[1, .65, 1]}><sphereGeometry args={[.14, 8, 6]}/><meshToonMaterial color={f.color}/></mesh>)}
    <Tree at={[-13, -.3, -5]} color="#97c9a6" scale={1.5}/><Tree at={[12.5, -.3, -7]} color="#e6b3bd" scale={1.4}/><Tree at={[-7, -.3, -15]} color="#c5b8df" scale={1.7}/><Tree at={[9, -.3, 7]} color="#8bb9a0"/>
    {[-22, 17, 30].map((x, i) => <mesh key={x} position={[x, -1, -25 - i * 3]} scale={[15, 6 + i, 9]}><sphereGeometry args={[1, 24, 16]}/><meshToonMaterial color={i % 2 ? '#bac9df' : '#a8ccba'}/></mesh>)}
    {[[-7, 9, -19], [8, 11, -24]].map(([x, y, z], i) => <group key={i} position={[x, y, z]}>{[-1, 0, 1].map(n => <mesh key={n} position={[n * 1.2, n === 0 ? .3 : 0, 0]} scale={[1.6, .6, .7]}><sphereGeometry args={[1, 20, 12]}/><meshBasicMaterial color="#fff2e5"/></mesh>)}</group>)}
  </>;
}
