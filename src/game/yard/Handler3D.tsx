import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

/** Shared, lightweight handler silhouette. Local +Z is forward, as on Dog3D. */
export default function Handler3D({ moving = false, tending = false }: { moving?: boolean; tending?: boolean }) {
    const body = useRef<Group>(null), leftLeg = useRef<Group>(null), rightLeg = useRef<Group>(null);
    const leftArm = useRef<Group>(null), rightArm = useRef<Group>(null), time = useRef(0);
    useFrame((_, delta) => {
        time.current += Math.min(delta, .05) * (moving ? 8 : 2);
        const stride = moving ? Math.sin(time.current) * .5 : 0;
        if (leftLeg.current) leftLeg.current.rotation.x = stride;
        if (rightLeg.current) rightLeg.current.rotation.x = -stride;
        if (leftArm.current) leftArm.current.rotation.x = tending ? -.85 : -stride * .7;
        if (rightArm.current) rightArm.current.rotation.x = tending ? -.85 : stride * .7;
        if (body.current) { body.current.rotation.x = tending ? .3 : 0; body.current.position.y = moving ? Math.abs(Math.sin(time.current)) * .035 : 0; }
    });
    return <group ref={body}>
        <mesh castShadow position={[0, 1.18, 0]}><capsuleGeometry args={[.25, .37, 4, 8]}/><meshStandardMaterial color="#344961" roughness={.95}/></mesh>
        <mesh position={[0, 1.62, 0]}><cylinderGeometry args={[.095,.1,.18,8]}/><meshStandardMaterial color="#c38e6b"/></mesh>
        <mesh castShadow position={[0, 1.84, .025]}><sphereGeometry args={[.205,12,10]}/><meshStandardMaterial color="#d6a17a" roughness={.9}/></mesh>
        <mesh castShadow position={[0,1.96,0]}><sphereGeometry args={[.212,12,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#45362e"/></mesh>
        <mesh position={[0,1.84,.218]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color="#c38e6b"/></mesh>
        {[-1,1].map(side=><group key={side} ref={side<0?leftLeg:rightLeg} position={[side*.135,.86,0]}>
            <mesh castShadow position={[0,-.32,0]}><capsuleGeometry args={[.105,.47,4,8]}/><meshStandardMaterial color="#b2a08a"/></mesh>
            <mesh castShadow position={[0,-.72,.075]}><boxGeometry args={[.22,.16,.36]}/><meshStandardMaterial color="#453b34"/></mesh>
        </group>)}
        {[-1,1].map(side=><group key={side} ref={side<0?leftArm:rightArm} position={[side*.3,1.4,0]}>
            <mesh castShadow position={[0,-.16,0]}><capsuleGeometry args={[.09,.23,4,8]}/><meshStandardMaterial color="#344961"/></mesh>
            <mesh castShadow position={[0,-.43,0]}><capsuleGeometry args={[.07,.2,4,8]}/><meshStandardMaterial color="#d6a17a"/></mesh>
        </group>)}
    </group>;
}
