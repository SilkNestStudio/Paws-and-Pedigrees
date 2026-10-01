import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Mesh, Object3D } from 'three';
import { launchVelocity, type YardPlay } from '../playyard/play';

export default function FetchToy({ state }: { state: YardPlay }) {
  const ball = useRef<Mesh>(null), aim = useRef<Mesh>(null), arc = useRef<InstancedMesh>(null), dummy = useRef(new Object3D());
  useFrame(() => {
    ball.current?.position.set(state.ball.x, state.ball.y + .07, state.ball.z);
    if (aim.current) { aim.current.visible = state.phase === 'ready'; aim.current.position.set(state.aim.x, .085, state.aim.z); }
    if (arc.current) {
      arc.current.visible = state.charging;
      const v = launchVelocity(state), flight = (v.vy + Math.sqrt(v.vy ** 2 + 24 * 1.15)) / 12;
      for (let i = 0; i < 24; i++) {
        const t = flight * i / 23;
        dummy.current.position.set(state.keeper.x + v.vx * t, 1.37 + v.vy * t - 6 * t * t, state.keeper.z + v.vz * t);
        dummy.current.scale.setScalar(.065); dummy.current.updateMatrix(); arc.current.setMatrixAt(i, dummy.current.matrix);
      }
      arc.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <>
    <mesh ref={ball} castShadow><sphereGeometry args={[.15, 20, 12]}/><meshToonMaterial color="#ed8665"/></mesh>
    <mesh ref={aim} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.35, .42, 40]}/><meshBasicMaterial color="#fae0aa"/></mesh>
    <instancedMesh ref={arc} args={[undefined, undefined, 24]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]}/><meshBasicMaterial color="#ffdf9e"/></instancedMesh>
  </>;
}
