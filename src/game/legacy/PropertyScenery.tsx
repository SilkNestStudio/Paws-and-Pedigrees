import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Color, Group, InstancedMesh, Object3D, RepeatWrapping, SRGBColorSpace } from 'three';

type Triple = [number, number, number];
export function Ground({ at, width, depth, gravel = false }: { at: Triple; width: number; depth: number; gravel?: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = gravel ? '#bcb09b' : '#859578'; ctx.fillRect(0, 0, 256, 256);
    const random = (n: number) => { const value = Math.sin(n * 78.233) * 43758.5453; return value - Math.floor(value); };
    for (let i = 0; i < 5500; i++) {
      ctx.fillStyle = gravel ? ['#dacdb8', '#a89981', '#b2a894'][i % 3] : ['#a0a883', '#7c8b70', '#a0a183'][i % 3];
      ctx.globalAlpha = .35 + random(i + 31) * .3;
      ctx.fillRect(random(i + 1) * 256, random(i + 13) * 256, 1 + random(i + 8) * 3, 1 + random(i + 27) * 3);
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.wrapS = map.wrapT = RepeatWrapping; map.repeat.set(width / 4, depth / 4); map.anisotropy = 4; return map;
  }, [width, depth, gravel]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={at} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[width, depth]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>;
}
export function Timber({ at, size, color = '#705440', turn = [0, 0, 0] }: { at: Triple; size: Triple; color?: string; turn?: Triple }) {
  return <mesh position={at} rotation={turn} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.92}/></mesh>;
}
export function Sign({ text, subtitle, at, width = 3.5 }: { text: string; subtitle: string; at: Triple; width?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#26333e'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#bd9b68'; ctx.lineWidth = 3; ctx.strokeRect(16, 16, 992, 224);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f4e6cf'; ctx.font = `${text.length > 24 ? 43 : 58}px Georgia`;
    ctx.fillText(text, 512, 112, 940); ctx.font = '25px sans-serif'; ctx.fillStyle = '#c5aa80'; ctx.fillText(subtitle, 512, 180, 940);
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace; return result;
  }, [text, subtitle]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={at}><planeGeometry args={[width, width / 4]}/><meshStandardMaterial map={texture} roughness={.8}/></mesh>;
}
function Window({ x, z = -5.13 }: { x: number; z?: number }) {
  return <group><Timber at={[x, 2.05, z]} size={[1.6, 1.65, .12]} color="#efe0c4"/><Timber at={[x, 2.05, z + .08]} size={[1.36, 1.43, .05]} color="#324753"/>
    <Timber at={[x, 2.05, z + .12]} size={[.065, 1.45, .05]} color="#c5b493"/><Timber at={[x, 2.05, z + .12]} size={[1.4, .07, .05]} color="#c5b493"/>
    <Timber at={[x, 1.15, z + .22]} size={[1.85, .14, .48]} color="#a4a090"/>
  </group>;
}
function Roof({ x = 0, z, width, depth, base }: { x?: number; z: number; width: number; depth: number; base: number }) {
  const rise = depth * .25, slope = Math.atan2(rise, depth / 2), length = Math.hypot(depth / 2 + .45, rise);
  return <group>
    {[-1, 1].map(side => <group key={side}>
      <Timber at={[x, base + rise / 2, z + side * depth / 4]} size={[width + 1, .16, length]} color="#39454d" turn={[side * slope, 0, 0]}/>
      {Array.from({ length: Math.ceil(width * 1.4) }, (_, i) => <Timber key={i} at={[x - width / 2 + i * .72, base + rise / 2 + .105, z + side * depth / 4]} size={[.035, .035, length]} color="#596169" turn={[side * slope, 0, 0]}/>)}
      <Timber at={[x, base - .05, z + side * (depth / 2 + .2)]} size={[width + 1, .22, .15]} color="#7c6650"/>
    </group>)}
    <Timber at={[x, base + rise + .03, z]} size={[width + 1, .16, .2]} color="#69717a"/>
    {[-1, 1].map(side => <mesh key={side} position={[x + side * width / 2, base, z]} rotation={[0, Math.PI / 2, 0]}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-depth / 2, 0, 0, depth / 2, 0, 0, 0, rise, 0]), 3]}/></bufferGeometry><meshStandardMaterial color="#b9ac92" side={2} flatShading/></mesh>)}
  </group>;
}
function Fence({ x, z, length, angle = 0 }: { x: number; z: number; length: number; angle?: number }) {
  const n = Math.ceil(length / 2);
  return <group position={[x, 0, z]} rotation={[0, angle, 0]}>
    {[.5, 1.05].map(y => <Timber key={y} at={[0, y, 0]} size={[length, .16, .12]} color="#9b8b70"/>)}
    {Array.from({ length: n + 1 }, (_, i) => <Timber key={i} at={[-length / 2 + length * i / n, .73, 0]} size={[.18, 1.46, .18]} color="#81725c"/>)}
  </group>;
}
function Entrance() {
  const arch = useRef<Group>(null);
  // The close follow camera can sit outside the entrance. Hide the sign's back
  // while it would cover the keeper; it remains visible when facing the gate.
  useFrame(({ camera }) => { if (arch.current) arch.current.visible = camera.position.z < 18.5; });
  return <group position={[0, 0, 18.55]}>
    {[-2.8, 2.8].map(x => <group key={x}>
      <Timber at={[x, 1.05, 0]} size={[.5, 2.1, .5]} color="#85867d"/>
      <Timber at={[x, 2.14, 0]} size={[.65, .17, .65]} color="#b6b1a0"/>
      <Timber at={[x, 2.56, 0]} size={[.16, .9, .16]} color="#46545b"/>
    </group>)}
    <group ref={arch}><Timber at={[0, 3, 0]} size={[6, 1.43, .16]} color="#26333e"/>
      <group rotation={[0, Math.PI, 0]}><Sign text="FRONT GATE" subtitle="TOWN & RESCUE" at={[0, 3, .091]} width={5.4}/></group>
    </group>
    {[-1, 1].map(side => <group key={side} position={[side*2.75, 0, .1]} rotation={[0, side * -1.05, 0]}>
      {[.3, 1.25].map(y => <Timber key={y} at={[-side*1.2, y, 0]} size={[2.4, .12, .12]} color="#7a8179"/>)}
      {Array.from({ length: 7 }, (_, i) => <Timber key={i} at={[-side*(.18+i*.34), .83, 0]} size={[.08, 1.36, .09]} color="#56636a"/>)}
    </group>)}
  </group>;
}
function CourtyardSigns() {
  return <group position={[-3.2, 0, 4.5]}>
    <Timber at={[0, 1.3, 0]} size={[.16, 2.6, .16]} color="#705440"/>
    {[{ y: 2.55, text: 'KENNEL & RUNS  ↑', subtitle: "GRANDPA'S WORKBENCH" }, { y: 1.9, text: 'FRONT GATE  ↓', subtitle: 'TOWN & RESCUE' }, { y: 1.25, text: '←  TRAINING   |   NURSERY  →', subtitle: 'YOUR NEXT CHAPTERS' }].map(s => <group key={s.y}>
      <Timber at={[0, s.y, .07]} size={[2.6, .63, .11]} color="#283941"/>
      <Sign text={s.text} subtitle={s.subtitle} at={[0, s.y, .135]} width={2.5}/>
    </group>)}
  </group>;
}
function Planting() {
  const trunks = useRef<InstancedMesh>(null), leaves = useRef<InstancedMesh>(null), grass = useRef<InstancedMesh>(null);
  useEffect(() => {
    const object = new Object3D();
    for (let i = 0; i < 54; i++) {
      const side = i % 2 ? -1 : 1, x = i < 30 ? side * (20 + (i % 4) * 2.7) : -26 + ((i - 30) % 12) * 4.7;
      const z = i < 30 ? -23 + Math.floor(i / 2) * 3.9 : i < 42 ? -20 : 38, height = 3.8 + (i % 5) * .6;
      object.position.set(x, height / 2, z); object.scale.set(.35, height, .35); object.rotation.set(0, i, 0); object.updateMatrix(); trunks.current?.setMatrixAt(i, object.matrix);
      for (let j = 0; j < 3; j++) {
        object.position.set(x + (j - 1) * 1.15, height + .3 + (j % 2), z + (j % 2) * .8); object.scale.set(2.1, 2.3, 2.1); object.updateMatrix();
        leaves.current?.setMatrixAt(i * 3 + j, object.matrix); leaves.current?.setColorAt(i * 3 + j, new Color(['#7e8b69', '#9ba078', '#b4a476', '#8a9771'][i % 4]));
      }
    }
    for (let i = 0; i < 500; i++) {
      const r = (n: number) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
      const x = (r(i + 2) - .5) * 37, z = r(i + 709) * 36 - 14;
      const path = Math.abs(x) < 2.6 || z < 0 || (Math.abs(z - 3) < 1.2) || (x > 6.7 && x < 10 && z > 6 && z < 11);
      object.position.set(x, path ? -1 : .15, z); object.scale.set(.06, .2 + r(i + 8) * .2, .06); object.rotation.set(0, i, -.15 + r(i + 31) * .3); object.updateMatrix(); grass.current?.setMatrixAt(i, object.matrix);
      grass.current?.setColorAt(i, new Color(i % 5 ? '#9ba176' : '#c7b48a'));
    }
    for (const ref of [trunks, leaves, grass]) if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
      ref.current.computeBoundingBox();
    }
  }, []);
  return <><instancedMesh ref={trunks} args={[undefined, undefined, 54]} castShadow><cylinderGeometry args={[.7, 1, 1, 7]}/><meshStandardMaterial color="#665646"/></instancedMesh>
    <instancedMesh ref={leaves} args={[undefined, undefined, 162]} castShadow><icosahedronGeometry args={[1, 1]}/><meshStandardMaterial roughness={1}/></instancedMesh>
    <instancedMesh ref={grass} args={[undefined, undefined, 500]}><coneGeometry args={[1, 1, 3]}/><meshStandardMaterial roughness={1}/></instancedMesh></>;
}
function PropertyScenery({ kennelName, prepared, restored }: { kennelName: string; prepared: boolean; restored: boolean }) {
  return <group>
    <Ground at={[0, -.03, 0]} width={110} depth={110}/>
    <Ground at={[0, .01, 10]} width={4.8} depth={27} gravel/>
    <Ground at={[0, .008, 36]} width={3.8} depth={29} gravel/>
    <Ground at={[0, .035, 2.8]} width={29} depth={2.2} gravel/>
    <Timber at={[0, .015, -2.5]} size={[18, .04, 5.4]} color="#b6ac98"/>
    {Array.from({ length: 17 }, (_, i) => <Timber key={i} at={[-8 + i, .04, -1]} size={[.94, .035, 3.8]} color={i % 3 ? '#bcb29e' : '#c8bda6'}/>)}
    <Timber at={[0, 1.67, -8.7]} size={[17, 3.35, 7]} color={restored ? '#e2d5b9' : '#c9c0a9'}/>
    <Timber at={[0, .35, -5.13]} size={[17, .7, .22]} color="#929186"/>
    {[-8.3, -5.7, -.9, .9, 5.7, 8.3].map(x => <Timber key={x} at={[x, 1.9, -5]} size={[.16, 3, .23]}/>)}
    <Roof z={-8.7} width={17} depth={7} base={3.45}/>
    <Timber at={[-6, 4.5, -9.8]} size={[.8, 2.1, .8]} color="#8c796c"/><Timber at={[-6, 5.6, -9.8]} size={[1, .16, 1]} color="#aaa18e"/>
    {[-6.7, -3.7, 3.7, 6.7].map(x => <Window key={x} x={x}/>)}
    <Timber at={[0, 1.3, -5.05]} size={[1.7, 2.6, .2]} color="#344a59"/>
    {[-.6, -.3, 0, .3, .6].map(x => <Timber key={x} at={[x, 1.3, -4.92]} size={[.035, 2.5, .04]} color="#576777"/>)}
    <mesh position={[.55, 1.2, -4.8]}><sphereGeometry args={[.065, 10, 8]}/><meshStandardMaterial color="#c5a46e" metalness={.65} roughness={.35}/></mesh>
    <Sign text={kennelName || 'A place to begin again'} subtitle="KENNEL & TRAINING GROUNDS" at={[0, 3.03, -4.82]} width={5.2}/>
    {/* A covered open work area brings the first interactions into the courtyard. */}
    <Timber at={[-4.4, .82, -4.05]} size={[2.7, .17, 1]} color="#947357"/>
    {[-5.5, -3.3].map(x => <Timber key={x} at={[x, .4, -4.05]} size={[.12, .8, .8]}/>)}
    <Timber at={[-4.25, .95, -3.95]} size={[.6, .11, .46]} color="#293d51"/>
    <Timber at={[-4.25, 1.015, -3.94]} size={[.43, .012, .34]} color="#e9d8b7"/>
    <Timber at={[-5.2, 1.23, -4.2]} size={[.5, .65, .08]} color="#7e6046"/>
    <Timber at={[-5.2, 1.23, -4.14]} size={[.4, .53, .02]} color="#ae9b7c"/>
    <mesh position={[-3.4, 1.18, -4.1]}><cylinderGeometry args={[.15, .065, .3, 14]}/><meshStandardMaterial color="#b99a5b" metalness={.6} roughness={.45}/></mesh>
    <Timber at={[-3.4, .98, -4.1]} size={[.27, .08, .25]} color="#4a3930"/>
    {/* Run: a visible before/after, not an economy shortcut. */}
    <Timber at={[4, .13, -4]} size={[2.8, .22, 1.5]} color="#786957"/>
    <Timber at={[4, .28, -4]} size={[2.35, .18, 1.2]} color={prepared ? '#ac7554' : '#948c7b'}/>
    {prepared && <Timber at={[4, .395, -4]} size={[1.7, .045, .9]} color="#d0b68d"/>}
    {[2.4, 5.6].map(x => <Fence key={x} x={x} z={-4.1} length={1.7} angle={Math.PI / 2}/>)}
    {[2.5, 3.15].map((x, i) => <mesh key={x} position={[x, .16, -3.4]}><cylinderGeometry args={[.24, .17, .25, 20, 1, true]}/><meshStandardMaterial color={i ? '#768d93' : '#9b8060'} side={2} metalness={.3} roughness={.5}/></mesh>)}
    <Timber at={[-7.2, .43, -3.8]} size={[.62, .86, .5]} color="#bda47c"/>
    <Sign text="FOOD" subtitle="STARTER SUPPLIES" at={[-7.2, .49, -3.54]} width={.5}/>
    <Timber at={[11.8, 1.35, -7.5]} size={[5, 2.7, 6]} color={restored ? '#c3b99f' : '#a79e87'}/>
    <Roof x={11.8} z={-7.5} width={5} depth={6} base={2.8}/>
    <Timber at={[11.8, 1.25, -4.44]} size={[1.55, 2.5, .15]} color="#7f7462"/>
    {!restored && <Timber at={[11.8, 1.4, -4.3]} size={[1.95, .18, .1]} color="#b3a184" turn={[0, 0, -.35]}/>}
    <Sign text="The nursery" subtitle={restored ? 'ROOM FOR A NEW GENERATION' : 'WAITING FOR ITS NEXT CHAPTER'} at={[11.8, 2.75, -4.25]} width={3.8}/>
    <Fence x={-17} z={7} length={23} angle={Math.PI / 2}/><Fence x={17} z={7} length={23} angle={Math.PI / 2}/>
    <Fence x={-10} z={19.6} length={13}/><Fence x={10} z={19.6} length={13}/>
    <Entrance/><CourtyardSigns/>
    <Fence x={-13} z={-2} length={7}/>
    <Sign text="Training meadow" subtitle={restored ? 'A LITTLE BETTER, EVERY DAY' : 'START WITH WHAT YOU HAVE'} at={[-12.5, 1.9, -1.85]} width={3}/>
    {/* Training equipment remains scenery in this first movement prototype. */}
    {[0, 1, 2].map(i => <group key={i} position={[-24 + i * 3, 0, -3]}><Timber at={[-.8, .5, 0]} size={[.12, 1, .12]} color="#d8cfb5"/><Timber at={[.8, .5, 0]} size={[.12, 1, .12]} color="#d8cfb5"/><Timber at={[0, restored ? .7 : .3, 0]} size={[1.8, .09, .1]} color="#697e88"/></group>)}
    <Timber at={[8.4, .18, 8.5]} size={[1.6, .36, 2.7]} color="#9a927d"/>
    <mesh position={[8.4, 2.2, 8.5]} castShadow><cylinderGeometry args={[.2, .3, 4.3, 9]}/><meshStandardMaterial color="#73604c"/></mesh>
    {[[-.9, 4.2, 0], [.9, 4.6, .3], [0, 5.2, -.3]].map((p, i) => <mesh key={i} position={[8.4 + p[0], p[1], 8.5 + p[2]]} castShadow><icosahedronGeometry args={[1.65, 2]}/><meshStandardMaterial color={['#c0a06c', '#ac9569', '#b9a575'][i]} roughness={1}/></mesh>)}
    <Timber at={[-9.6, .2, 3]} size={[.9, .4, 3.2]} color="#96907e"/>
    {[1.8, 2.5, 3.2, 3.9].map(z => <mesh key={z} position={[-9.6, .6, z]}><icosahedronGeometry args={[.49, 1]}/><meshStandardMaterial color="#808c71"/></mesh>)}
    <Planting/>
    {[-2, -1, 0, 1, 2].map(i => <mesh key={i} position={[i * 23, -2, -44 - (i % 2) * 5]} scale={[25, 10 + (i % 2) * 3, 16]}><sphereGeometry args={[1, 20, 12]}/><meshStandardMaterial color="#9ba899" roughness={1}/></mesh>)}
    {[-1, 0, 1].map(i => <mesh key={i} position={[i * 30, -2, 58]} scale={[30, 9, 15]}><sphereGeometry args={[1, 20, 12]}/><meshStandardMaterial color="#9ba899" roughness={1}/></mesh>)}
  </group>;
}
export default memo(PropertyScenery);
