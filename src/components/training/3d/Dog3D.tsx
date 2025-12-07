import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

/**
 * Dog 3D Model Component
 *
 * EASILY REPLACEABLE:
 * To use your own dog model:
 * 1. Put your .glb file in: public/models/dog.glb
 * 2. Uncomment the useGLTF section below
 * 3. Comment out the BoxDog component
 *
 * Example with real model:
 * import { useGLTF } from '@react-three/drei';
 * const { scene } = useGLTF('/models/dog.glb');
 * return <primitive object={scene.clone()} {...props} />
 */

interface Dog3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  isRunning?: boolean;
  speed?: number;
}

// Placeholder box dog (temporary)
function BoxDog({ isRunning, speed }: { isRunning?: boolean; speed?: number }) {
  const groupRef = useRef<Group>(null);

  // Simple running animation - bob up and down
  useFrame((state) => {
    if (groupRef.current && isRunning) {
      const bobSpeed = (speed || 1) * 8;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * bobSpeed) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.5, 0.4]} castShadow>
        <boxGeometry args={[0.25, 0.25, 0.3]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.45, 0.65]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.15]} />
        <meshStandardMaterial color="#654321" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.1, 0.65, 0.35]} castShadow>
        <boxGeometry args={[0.1, 0.15, 0.05]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      <mesh position={[0.1, 0.65, 0.35]} castShadow>
        <boxGeometry args={[0.1, 0.15, 0.05]} />
        <meshStandardMaterial color="#654321" />
      </mesh>

      {/* Legs - animated when running */}
      <mesh position={[-0.15, 0.1, 0.2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      <mesh position={[0.15, 0.1, 0.2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      <mesh position={[-0.15, 0.1, -0.2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      <mesh position={[0.15, 0.1, -0.2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>

      {/* Tail */}
      <mesh position={[0, 0.4, -0.4]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.02, 0.3]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
    </group>
  );
}

export default function Dog3D({ position, rotation = [0, 0, 0], isRunning, speed }: Dog3DProps) {
  return (
    <group position={position} rotation={rotation}>
      <BoxDog isRunning={isRunning} speed={speed} />

      {/*
      TO USE YOUR OWN MODEL, REPLACE THE ABOVE WITH:

      import { useGLTF } from '@react-three/drei';

      function RealDog() {
        const { scene } = useGLTF('/models/dog.glb');
        return <primitive object={scene.clone()} scale={0.5} />;
      }

      Then use: <RealDog />
      */}
    </group>
  );
}

// Preload function for when you add a real model
// useGLTF.preload('/models/dog.glb');
