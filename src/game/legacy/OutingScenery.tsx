import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Ground, Sign, Timber } from './PropertyScenery';
import { RABBITS, ROCKS } from './outings';

function Tree({ x, z, i }: { x: number; z: number; i: number }) {
  return <group position={[x, 0, z]}>
    <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[.2, .35, 3, 8]}/><meshToonMaterial color="#79604f"/></mesh>
    {[[-.6, 3.4, 0], [.7, 3.8, .1], [0, 4.5, -.3]].map((p, n) => <mesh key={n} position={p as [number, number, number]} scale={[1.2, 1, 1]} castShadow><icosahedronGeometry args={[1.5, 1]}/><meshToonMaterial color={['#b7bb76', '#d0af68', '#8caa77', '#c78d62'][i % 4]}/></mesh>)}
  </group>;
}
function Rabbit({ x, z, index }: { x: number; z: number; index: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = .12 + Math.max(0, Math.sin(clock.elapsedTime * 2 + index)) * .12; });
  return <group position={[x, 0, z]}><group ref={ref}>
    <mesh scale={[.24, .23, .38]}><sphereGeometry args={[1, 12, 8]}/><meshToonMaterial color="#a79281"/></mesh>
    <mesh position={[0, .18, .25]} scale={[.17, .18, .16]}><sphereGeometry args={[1, 12, 8]}/><meshToonMaterial color="#b7a18a"/></mesh>
    {[-.08, .08].map(n => <mesh key={n} position={[n, .4, .22]} scale={[.055, .22, .06]}><sphereGeometry args={[1, 10, 8]}/><meshToonMaterial color="#b7a18a"/></mesh>)}
  </group></group>;
}
const trees = Array.from({ length: 40 }, (_, i) => ({ x: i < 20 ? (i % 2 ? -22 : 22) + Math.sin(i) * 2 : -20 + (i - 20) * 2.1, z: i < 20 ? 17 - Math.floor(i / 2) * 5 : -31 - i % 3 * 2 }));
function OutingScenery() {
  return <>
    <color attach="background" args={['#e7d9c2']}/><fog attach="fog" args={['#e7d9c2', 32, 85]}/>
    <hemisphereLight args={['#fff1d9', '#a1a47a', 2]}/>
    <directionalLight position={[-16, 24, 8]} color="#ffdfaf" intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={35} shadow-camera-bottom={-25} shadow-normalBias={.04}/>
    <Ground at={[0, -.12, -5]} width={110} depth={110}/>
    <Ground at={[0, -.01, -5]} width={40} depth={48}/>
    <mesh position={[0, .025, -4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[42, 4]}/><meshStandardMaterial color="#74a7b0" roughness={.23} metalness={.15}/></mesh>
    {Array.from({ length: 22 }, (_, i) => <mesh key={i} position={[-20 + i * 1.9, .04, -4 + Math.sin(i * 2) * 1.4]} rotation={[-Math.PI / 2, 0, -.1]}><planeGeometry args={[.8, .025]}/><meshBasicMaterial color="#c2dadd" transparent opacity={.5}/></mesh>)}
    <Ground at={[0, .012, 12]} width={5} depth={10} gravel/>
    <Ground at={[-12, .012, 5]} width={3.6} depth={14} gravel/>
    <Ground at={[12, .012, 5]} width={3.6} depth={14} gravel/>
    <Ground at={[0, .013, 9]} width={25} depth={3} gravel/>
    <Ground at={[0, .012, -9]} width={27} depth={3} gravel/>
    <Ground at={[-10, .012, -17]} width={4} depth={15} gravel/>
    <Ground at={[12, .012, -18]} width={4} depth={16} gravel/>
    {Array.from({ length: 13 }, (_, i) => <Timber key={i} at={[-12, .1, -6.4 + i * .4]} size={[3.8, .16, .33]} color="#9a7854"/>)}
    {[-13.8, -10.2].map(x => <group key={x}><Timber at={[x, .9, -4]} size={[.13, .13, 5.3]}/>{[-6, -4, -2].map(z => <Timber key={z} at={[x, .5, z]} size={[.14, 1.1, .14]}/>)}</group>)}
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[12, .02, -5.8 + i * .85]} scale={[1.8, .15, .55]} receiveShadow><icosahedronGeometry args={[1, 1]}/><meshToonMaterial color="#adae9d"/></mesh>)}
    {ROCKS.map((p, i) => <mesh key={i} position={[p.x, .35, p.z]} scale={[p.r, .9, p.r]} castShadow><icosahedronGeometry args={[1, 1]}/><meshToonMaterial color="#9d9b87"/></mesh>)}
    {trees.map((p, i) => <Tree key={i} {...p} i={i}/>)}
    {[[-16, 11], [-16, 6], [-8, 13], [16, 11], [17, -24], [-17, -23]].map(([x, z], i) => <Tree key={i} x={x} z={z} i={i}/>)}
    <Sign text="ORCHARD" subtitle="WOODEN BRIDGE" at={[-7, 1.5, 9]} width={2.8}/>
    <Sign text="LOOKOUT" subtitle="STEPPING STONES" at={[7, 1.5, 9]} width={2.8}/>
    {[-7, 7].map(x => <Timber key={x} at={[x, .7, 9]} size={[.12, 1.4, .12]}/>)}
    <Sign text="HOME" subtitle="TRAILHEAD" at={[-4, 1.5, 16]} width={2.5}/>
    <Timber at={[-4, .7, 16]} size={[.12, 1.4, .12]}/>
    <Timber at={[-7, .8, -23]} size={[3, .15, 1.4]} color="#947352"/>
    {[-8, -6].map(x => <Timber key={x} at={[x, .4, -23]} size={[.15, .8, 1.2]}/>)}
    <Timber at={[-7, .4, -24]} size={[3.2, .13, .45]}/>
    <Timber at={[14, .6, -25]} size={[3, .12, .8]}/>
    <Timber at={[14, 1.1, -25.5]} size={[3, .7, .12]}/>
    {RABBITS.map((p, i) => <Rabbit key={i} {...p} index={i}/>)}
  </>;
}
export default memo(OutingScenery);
