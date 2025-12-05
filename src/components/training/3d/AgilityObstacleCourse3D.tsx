import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sky } from '@react-three/drei';
import { useState, useRef } from 'react';
import { Vector3 } from 'three';

interface AgilityObstacleCourse3DProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

// Simple 3D Dog placeholder - we'll replace this with a proper model later
function Dog({ position }: { position: Vector3 }) {
  return (
    <group position={position}>
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
      {/* Legs */}
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

// Ground
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#90EE90" />
    </mesh>
  );
}

// Fence around the course
function Fence() {
  const fences = [];

  // Back fence
  for (let i = -10; i <= 10; i += 2) {
    fences.push(
      <mesh key={`back-${i}`} position={[i, 0.5, -10]} castShadow>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    );
  }

  // Front fence
  for (let i = -10; i <= 10; i += 2) {
    fences.push(
      <mesh key={`front-${i}`} position={[i, 0.5, 10]} castShadow>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    );
  }

  // Left fence
  for (let i = -10; i <= 10; i += 2) {
    fences.push(
      <mesh key={`left-${i}`} position={[-10, 0.5, i]} castShadow>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    );
  }

  // Right fence
  for (let i = -10; i <= 10; i += 2) {
    fences.push(
      <mesh key={`right-${i}`} position={[10, 0.5, i]} castShadow>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    );
  }

  return <group>{fences}</group>;
}

// Jump obstacle
function JumpObstacle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left post */}
      <mesh position={[-0.5, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.8]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Right post */}
      <mesh position={[0.5, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.8]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Bar */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.0]} />
        <meshStandardMaterial color="#FF6347" />
      </mesh>
    </group>
  );
}

// Weave poles
function WeavePoles({ position }: { position: [number, number, number] }) {
  const poles = [];
  for (let i = 0; i < 6; i++) {
    poles.push(
      <mesh key={i} position={[i * 0.3, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.6]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    );
  }
  return <group position={position}>{poles}</group>;
}

// Tunnel
function Tunnel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tunnel body - using torus for curved effect */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 2, 16, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#1E90FF" side={2} />
      </mesh>
      {/* Support rings */}
      <mesh position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.4, 0.02, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#104E8B" />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.4, 0.02, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#104E8B" />
      </mesh>
      <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.4, 0.02, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#104E8B" />
      </mesh>
    </group>
  );
}

// A-Frame obstacle
function AFrame({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left ramp */}
      <mesh position={[-0.5, 0.5, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Right ramp */}
      <mesh position={[0.5, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[1.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
}

// Full 3D Scene
function Scene({ dogPosition }: { dogPosition: Vector3 }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Sky */}
      <Sky sunPosition={[100, 20, 100]} />

      {/* Ground */}
      <Ground />

      {/* Fence */}
      <Fence />

      {/* Obstacles */}
      <JumpObstacle position={[0, 0, -5]} />
      <WeavePoles position={[-2, 0, -2]} />
      <Tunnel position={[3, 0.4, 0]} />
      <AFrame position={[0, 0, 3]} />
      <JumpObstacle position={[-4, 0, 5]} />

      {/* Dog */}
      <Dog position={dogPosition} />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
      />

      <PerspectiveCamera makeDefault position={[8, 6, 8]} />
    </>
  );
}

export default function AgilityObstacleCourse3D({ onComplete, dogName }: AgilityObstacleCourse3DProps) {
  const [dogPosition, setDogPosition] = useState(new Vector3(0, 0, -8));
  const [isRunning, setIsRunning] = useState(false);
  const [currentObstacle, setCurrentObstacle] = useState(0);

  const obstacles = [
    new Vector3(0, 0, -5),      // Jump 1
    new Vector3(-0.5, 0, -2),   // Weave poles
    new Vector3(3, 0, 0),       // Tunnel
    new Vector3(0, 0, 3),       // A-Frame
    new Vector3(-4, 0, 5),      // Jump 2
  ];

  const handleStart = () => {
    setIsRunning(true);
    runCourse();
  };

  const runCourse = async () => {
    // Animate dog through the course
    for (let i = 0; i < obstacles.length; i++) {
      setCurrentObstacle(i);
      await animateDogTo(obstacles[i]);
      await new Promise(resolve => setTimeout(resolve, 500)); // Pause at each obstacle
    }

    // Return to start
    await animateDogTo(new Vector3(0, 0, -8));

    setIsRunning(false);
    setTimeout(() => {
      onComplete(1.2); // Good performance for proof of concept
    }, 1000);
  };

  const animateDogTo = async (target: Vector3) => {
    return new Promise<void>((resolve) => {
      const steps = 60;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / steps;

        setDogPosition(prev => {
          return new Vector3(
            prev.x + (target.x - prev.x) * 0.05,
            prev.y + (target.y - prev.y) * 0.05,
            prev.z + (target.z - prev.z) * 0.05
          );
        });

        if (step >= steps) {
          clearInterval(interval);
          setDogPosition(target);
          resolve();
        }
      }, 16); // ~60fps
    });
  };

  if (!isRunning) {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-blue-200 to-green-100">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-xl max-w-2xl">
          <h2 className="text-3xl font-bold text-earth-900 mb-2">3D Agility Course</h2>
          <p className="text-earth-600 mb-4">Watch {dogName} navigate a real 3D obstacle course!</p>

          <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 mb-2">
              <strong>🎮 Controls:</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Left Click + Drag:</strong> Rotate camera</li>
              <li>• <strong>Right Click + Drag:</strong> Pan camera</li>
              <li>• <strong>Scroll:</strong> Zoom in/out</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-900">
              <strong>⚠️ Proof of Concept:</strong> This is a basic 3D placeholder.
              The dog is made of simple shapes. With proper 3D models, this will look professional!
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all font-bold text-lg shadow-lg"
          >
            🏃‍♂️ Start 3D Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* 3D Canvas */}
      <Canvas shadows>
        <Scene dogPosition={dogPosition} />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h3 className="font-bold text-earth-900 mb-2">{dogName}'s Progress</h3>
        <p className="text-sm text-earth-700">
          Obstacle: {currentObstacle + 1} / {obstacles.length}
        </p>
        <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${((currentObstacle + 1) / obstacles.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-black/60 text-white rounded-lg p-3 text-xs">
        <p>🖱️ Drag to rotate • Right-click to pan • Scroll to zoom</p>
      </div>
    </div>
  );
}
