import React, {
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Vector3Tuple = [number, number, number];

const GROUND_Y = 0;
const DOG_HEIGHT = 1;

// ------------------------
// Dog context (for seesaw)
// ------------------------
interface DogContextValue {
  dogRef: React.RefObject<THREE.Mesh> | null;
}
const DogContext = createContext<DogContextValue>({ dogRef: null });

// ------------------------
// Dog (player) controller
// ------------------------
interface DogPlayerProps {
  externalRef: React.RefObject<THREE.Mesh>;
}

const DogPlayer: React.FC<DogPlayerProps> = ({ externalRef }) => {
  const dogRef = externalRef;
  const velocityY = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const isGroundedRef = useRef(true);
  const { camera } = useThree();

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;

      if (e.code === "Space" && isGroundedRef.current) {
        velocityY.current = 9; // jump strength
        isGroundedRef.current = false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!dogRef.current) return;

    const position = dogRef.current.position;
    const moveSpeed = 10;
    const turnSpeed = 5;

    // Movement input
    const forward =
      keys.current["KeyW"] || keys.current["ArrowUp"] ? 1 : 0;
    const backward =
      keys.current["KeyS"] || keys.current["ArrowDown"] ? 1 : 0;
    const left =
      keys.current["KeyA"] || keys.current["ArrowLeft"] ? 1 : 0;
    const right =
      keys.current["KeyD"] || keys.current["ArrowRight"] ? 1 : 0;

    const dirZ = forward - backward;
    const dirX = right - left;

    if (dirZ !== 0 || dirX !== 0) {
      const moveVec = new THREE.Vector3(dirX, 0, -dirZ).normalize();
      position.addScaledVector(moveVec, moveSpeed * delta);

      // Rotate dog to face movement direction
      const targetRotation = Math.atan2(moveVec.x, moveVec.z);
      const currentY = dogRef.current.rotation.y;
      dogRef.current.rotation.y = THREE.MathUtils.lerp(
        currentY,
        targetRotation,
        turnSpeed * delta
      );
    }

    // Gravity + jumping
    velocityY.current -= 24 * delta; // gravity
    position.y += velocityY.current * delta;

    const minY = GROUND_Y + DOG_HEIGHT / 2;
    if (position.y <= minY) {
      position.y = minY;
      velocityY.current = 0;

      if (!isGroundedRef.current) {
        isGroundedRef.current = true;
      }
    } else {
      if (isGroundedRef.current) {
        isGroundedRef.current = false;
      }
    }

    // Follow camera
    const camOffset = new THREE.Vector3(8, 6, 14); // slightly further back
    const targetCamPos = new THREE.Vector3().copy(position).add(camOffset);
    camera.position.lerp(targetCamPos, 3 * delta);
    camera.lookAt(position);
  });

  // Slightly more dog-like low-poly shape
  return (
    <mesh
      ref={dogRef}
      castShadow
      position={[0, GROUND_Y + DOG_HEIGHT / 2, 5]} // start forward from origin
    >
      {/* Body */}
      <boxGeometry args={[1.6, 0.8, 1.8]} />
      <meshStandardMaterial color="#c58a4a" />
      {/* Chest */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[1.4, 0.75, 0.8]} />
        <meshStandardMaterial color="#d49b63" />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.35, 0.9]}>
        <boxGeometry args={[0.5, 0.6, 0.5]} />
        <meshStandardMaterial color="#c58a4a" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.75, 1.25]}>
        <boxGeometry args={[0.7, 0.6, 0.8]} />
        <meshStandardMaterial color="#c58a4a" />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 0.6, 1.7]}>
        <boxGeometry args={[0.4, 0.3, 0.5]} />
        <meshStandardMaterial color="#80502b" />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.25, 1.05, 1.0]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#6d4326" />
      </mesh>
      <mesh position={[0.25, 1.05, 1.0]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#6d4326" />
      </mesh>
      {/* Legs */}
      {/* Front left */}
      <mesh position={[-0.45, -0.4, 0.5]}>
        <boxGeometry args={[0.25, 0.8, 0.25]} />
        <meshStandardMaterial color="#c58a4a" />
      </mesh>
      {/* Front right */}
      <mesh position={[0.45, -0.4, 0.5]}>
        <boxGeometry args={[0.25, 0.8, 0.25]} />
        <meshStandardMaterial color="#c58a4a" />
      </mesh>
      {/* Back left */}
      <mesh position={[-0.45, -0.4, -0.6]}>
        <boxGeometry args={[0.28, 0.85, 0.28]} />
        <meshStandardMaterial color="#b1763d" />
      </mesh>
      {/* Back right */}
      <mesh position={[0.45, -0.4, -0.6]}>
        <boxGeometry args={[0.28, 0.85, 0.28]} />
        <meshStandardMaterial color="#b1763d" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.1, -1.0]} rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.9]} />
        <meshStandardMaterial color="#6d4326" />
      </mesh>
    </mesh>
  );
};

// ------------------------
// Obstacles
// ------------------------
interface JumpObstacleProps {
  position: Vector3Tuple;
  rotationY?: number;
}

const JumpObstacle: React.FC<JumpObstacleProps> = ({
  position,
  rotationY = 0,
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Left post */}
      <mesh castShadow position={[-1, 1, 0]}>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Right post */}
      <mesh castShadow position={[1, 1, 0]}>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Bar */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[2, 0.1, 0.2]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
    </group>
  );
};

interface TunnelObstacleProps {
  position: Vector3Tuple;
  length?: number;
  rotationY?: number;
}

const TunnelObstacle: React.FC<TunnelObstacleProps> = ({
  position,
  length = 6,
  rotationY = 0,
}) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[1.1, 1.1, length, 24, 1, true]} />
        <meshStandardMaterial
          color="#ffa500"
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
};

interface WeavePolesProps {
  position: Vector3Tuple;
  count?: number;
  spacing?: number;
  rotationY?: number;
}

const WeavePoles: React.FC<WeavePolesProps> = ({
  position,
  count = 8,
  spacing = 1,
  rotationY = 0,
}) => {
  const poles = Array.from({ length: count }, (_, i) => i);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {poles.map((i) => (
        <mesh
          key={i}
          castShadow
          position={[i * spacing - ((count - 1) * spacing) / 2, 1, 0]}
        >
          <cylinderGeometry args={[0.07, 0.07, 2, 12]} />
          <meshStandardMaterial color="#00bfff" />
        </mesh>
      ))}
    </group>
  );
};

// ------------------------
// Seesaw (tilting plank)
// ------------------------
interface SeeSawProps {
  position: Vector3Tuple;
  length?: number;
}

const SeeSaw: React.FC<SeeSawProps> = ({ position, length = 10 }) => {
  const baseHeight = 0.7;
  const plankRef = useRef<THREE.Mesh | null>(null);
  const tiltRef = useRef(0);
  const { dogRef } = useContext(DogContext);

  useFrame((_, delta) => {
    if (!plankRef.current || !dogRef?.current) return;

    const plank = plankRef.current;

    // Get dog position in plank's local space
    const dogWorldPos = dogRef.current.position.clone();
    const localDogPos = plank.worldToLocal(dogWorldPos);

    const halfLength = length / 2;
    const withinZ =
      localDogPos.z >= -halfLength && localDogPos.z <= halfLength;
    const withinX = Math.abs(localDogPos.x) < 1.0; // width of plank

    let targetTilt = 0;

    if (withinZ && withinX && localDogPos.y > -0.5 && localDogPos.y < 2) {
      // Negative z = "far" side (course direction), positive z = near side
      const norm = THREE.MathUtils.clamp(localDogPos.z / halfLength, -1, 1);
      // Tilt toward the side the dog is on
      targetTilt = THREE.MathUtils.degToRad(norm * -18); // about ±18 degrees
    }

    // Smooth tilt (spring-ish)
    tiltRef.current = THREE.MathUtils.lerp(
      tiltRef.current,
      targetTilt,
      6 * delta
    );
    plank.rotation.x = tiltRef.current;
  });

  return (
    <group position={position}>
      {/* Base stand */}
      <mesh castShadow position={[0, baseHeight / 2, 0]}>
        <boxGeometry args={[1.2, baseHeight, 1.2]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Plank */}
      <mesh
        ref={plankRef}
        castShadow
        position={[0, baseHeight + 0.3, 0]}
        rotation={[0, 0, 0]}
      >
        <boxGeometry args={[1, 0.2, length]} />
        <meshStandardMaterial color="#f4d03f" />
      </mesh>
    </group>
  );
};

// ------------------------
// Ground & environment
// ------------------------
const Ground: React.FC = () => {
  return (
    <mesh
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GROUND_Y, 0]}
    >
      <planeGeometry args={[140, 80]} />
      <meshStandardMaterial color="#2e8b57" />
    </mesh>
  );
};

const Fencing: React.FC = () => {
  const length = 140;
  const width = 80;
  const fenceHeight = 1.2;

  const fenceMaterial = (
    <meshStandardMaterial color="#dddddd" metalness={0.1} roughness={0.8} />
  );

  return (
    <group>
      {/* Front fence */}
      <mesh castShadow position={[0, fenceHeight / 2, -length / 2 + 3]}>
        <boxGeometry args={[width, fenceHeight, 0.2]} />
        {fenceMaterial}
      </mesh>
      {/* Back fence */}
      <mesh castShadow position={[0, fenceHeight / 2, length / 2 - 3]}>
        <boxGeometry args={[width, fenceHeight, 0.2]} />
        {fenceMaterial}
      </mesh>
      {/* Left fence */}
      <mesh castShadow position={[-width / 2 + 3, fenceHeight / 2, 0]}>
        <boxGeometry args={[0.2, fenceHeight, length]} />
        {fenceMaterial}
      </mesh>
      {/* Right fence */}
      <mesh castShadow position={[width / 2 - 3, fenceHeight / 2, 0]}>
        <boxGeometry args={[0.2, fenceHeight, length]} />
        {fenceMaterial}
      </mesh>
    </group>
  );
};

// ------------------------
// Main scene
// ------------------------
const AgilityCourseScene: React.FC = () => {
  const dogRef = useRef<THREE.Mesh | null>(null);

  return (
    <DogContext.Provider value={{ dogRef }}>
      {/* Lights */}
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[25, 35, 15]}
        intensity={1.1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight
        intensity={0.3}
        color={"#ffffff"}
        groundColor={"#88cc88"}
      />

      <Ground />
      <Fencing />

      {/* Rough "competition-style" sequence down -Z:
          Start → 2 jumps → tunnel → offset jump → weave poles → seesaw → final jump
      */}
      {/* Start markers */}
      <mesh position={[0, 0.05, 8]}>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Jump 1 straight */}
      <JumpObstacle position={[0, 0, 0]} />
      {/* Jump 2 slight left */}
      <JumpObstacle position={[-4, 0, -10]} rotationY={Math.PI / 10} />
      {/* Tunnel angled right */}
      <TunnelObstacle position={[3, 0.6, -22]} rotationY={-Math.PI / 4} />
      {/* Jump 3 after tunnel, back to center */}
      <JumpObstacle position={[0, 0, -34]} />
      {/* Weave poles diagonal */}
      <WeavePoles position={[2, 0, -48]} rotationY={-Math.PI / 6} />
      {/* Seesaw straight ahead */}
      <SeeSaw position={[0, 0, -64]} />
      {/* Final jump */}
      <JumpObstacle position={[0, 0, -80]} />

      <DogPlayer externalRef={dogRef} />
    </DogContext.Provider>
  );
};

// ------------------------
// Top-level game component
// ------------------------
interface AgilityObstacleCourse3DProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function AgilityObstacleCourse3D({ onComplete: _onComplete, dogName }: AgilityObstacleCourse3DProps) {
  return (
    <div style={{ width: "100%", height: "100vh", background: "#000", position: "relative" }}>
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg z-10 max-w-md">
        <h3 className="font-bold text-lg mb-2">🎯 Agility Course - {dogName}</h3>
        <div className="text-sm space-y-1">
          <p><strong>Controls:</strong></p>
          <p>• WASD or Arrow Keys - Move</p>
          <p>• SPACEBAR - Jump</p>
          <p>• Mouse - Rotate camera (drag)</p>
          <p>• Scroll - Zoom</p>
        </div>
        <p className="text-xs mt-2 text-gray-300">Navigate through all obstacles to complete the course!</p>
      </div>

      <Canvas shadows camera={{ position: [12, 10, 20], fov: 50 }}>
        <color attach="background" args={["#87ceeb"]} />
        <OrbitControls enablePan={false} enableZoom={true} />
        <AgilityCourseScene />
      </Canvas>
    </div>
  );
}

// Also export as named export for compatibility
export const AgilityCourseGame = AgilityObstacleCourse3D;
