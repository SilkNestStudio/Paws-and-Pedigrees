import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import Dog3D from './Dog3D';

interface SprintTraining3DProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

// Ground
function Ground() {
  return (
    <>
      {/* Grass field - extended */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 20]} receiveShadow>
        <planeGeometry args={[100, 200]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>

      {/* Running track - darker path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 20]} receiveShadow>
        <planeGeometry args={[6, 200]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* Track lines */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -40 + i * 5]}>
          <planeGeometry args={[6, 0.1]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </>
  );
}

// Trees for environment - only on the right side to avoid blocking camera view
const treePositions = Array.from({ length: 15 }, (_, i) => ({
  x: 8 + (i * 0.1 - 0.75), // Only right side (positive X)
  z: -40 + i * 10,
}));

function Trees() {
  return (
    <>
      {treePositions.map((pos, i) => (
        <group key={i} position={[pos.x, 1.5, pos.z]}>
          {/* Trunk */}
          <mesh position={[0, -1.5, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 3]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 1, 0]} castShadow>
            <coneGeometry args={[1.5, 3, 8]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </>
  );
}

// Obstacles
function Obstacle({ position, type }: { position: [number, number, number]; type: 'rock' | 'puddle' | 'cone' | 'jump' }) {
  if (type === 'jump') {
    // Full-width jump bar spanning the entire path
    return (
      <group position={position}>
        {/* Left post */}
        <mesh position={[-2.5, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* Right post */}
        <mesh position={[2.5, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* Jump bar - spans full width (5 units) */}
        <mesh position={[0, 0.4, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 5.0]} />
          <meshStandardMaterial color="#FF6600" />
        </mesh>
      </group>
    );
  }

  if (type === 'rock') {
    return (
      <mesh position={position} castShadow>
        <dodecahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#808080" />
      </mesh>
    );
  }

  if (type === 'puddle') {
    return (
      <mesh position={[position[0], 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5]} />
        <meshStandardMaterial color="#4682B4" opacity={0.7} transparent />
      </mesh>
    );
  }

  // cone
  return (
    <mesh position={position} castShadow>
      <coneGeometry args={[0.3, 0.8, 8]} />
      <meshStandardMaterial color="#FF6347" />
    </mesh>
  );
}

// Game Scene
function GameScene({
  dogPosition,
  dogRotation,
  speed,
  obstacles,
  keys,
  onUpdate,
}: {
  dogPosition: Vector3;
  dogRotation: number;
  speed: number;
  obstacles: Array<{ position: [number, number, number]; type: 'rock' | 'puddle' | 'cone' | 'jump'; id: number }>;
  keys: React.MutableRefObject<{
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    ' ': boolean;
    ArrowUp: boolean;
    ArrowLeft: boolean;
    ArrowDown: boolean;
    ArrowRight: boolean;
  }>;
  onUpdate: (updates: {
    position: Vector3;
    rotation: number;
    speed: number;
    stamina: number;
    distance: number;
    score: number;
    hitCount: number;
    finished: boolean;
    time: number;
  }) => void;
}) {
  const cameraRef = useRef<any>();
  const initializedRef = useRef(false);
  const lastUpdateTime = useRef(0); // Throttle HUD updates
  const startTime = useRef<number>(0); // Track start time for accurate time measurement
  const hitObstacles = useRef<Set<number>>(new Set()); // Track which obstacles have been hit
  const gameStateRef = useRef({
    position: new Vector3(0, 0, -10),
    rotation: 0,
    speed: 0,
    stamina: 100,
    distance: 0,
    score: 0,
    hitCount: 0,
    isJumping: false,
    jumpVelocity: 0,
  });

  useFrame((state, delta) => {
    if (!cameraRef.current) return;

    // Initialize game state on first frame
    if (!initializedRef.current) {
      gameStateRef.current.position = dogPosition.clone();
      gameStateRef.current.rotation = dogRotation;
      startTime.current = state.clock.elapsedTime; // Record start time
      initializedRef.current = true;
    }

    // Update camera - side view that follows the dog
    const currentPos = gameStateRef.current.position;
    // Position camera to the side and slightly above, looking at the dog
    const sideOffset = -8; // Distance to the side (right side of the track, negative X)
    const heightOffset = 2; // Height above the dog
    const targetCamPos = new Vector3(
      sideOffset, // Fixed X position to the side
      currentPos.y + heightOffset, // Follow dog's height + offset
      currentPos.z - 3 // Slightly behind the dog
    );
    cameraRef.current.position.lerp(targetCamPos, 0.1);
    cameraRef.current.lookAt(new Vector3(currentPos.x, currentPos.y + 0.5, currentPos.z));

    // Game loop logic - constant forward movement
    const left = keys.current.a || keys.current.ArrowLeft;
    const right = keys.current.d || keys.current.ArrowRight;
    const jump = keys.current[' '];

    // Constant speed - no acceleration/deceleration
    const targetSpeed = 1; // Always moving at full speed
    const newRotation = 0; // Always facing forward

    // Update position - move forward in Z direction at constant speed
    const newPosition = gameStateRef.current.position.clone();
    const moveSpeed = 3.5; // Units per second
    newPosition.z += moveSpeed * delta;

    // Strafe left/right instead of turning
    if (left) {
      newPosition.x += 2.5 * delta; // Strafe left
    }
    if (right) {
      newPosition.x -= 2.5 * delta; // Strafe right
    }

    // Keep dog on track
    newPosition.x = Math.max(-2.5, Math.min(2.5, newPosition.x));

    // Jump physics
    const gravity = -12; // Gravity acceleration
    const jumpStrength = 4; // Initial jump velocity
    const groundLevel = 0; // Ground Y position

    // Start jump
    if (jump && !gameStateRef.current.isJumping && newPosition.y <= groundLevel + 0.01) {
      gameStateRef.current.isJumping = true;
      gameStateRef.current.jumpVelocity = jumpStrength;
    }

    // Update jump
    if (gameStateRef.current.isJumping || newPosition.y > groundLevel) {
      gameStateRef.current.jumpVelocity += gravity * delta;
      newPosition.y += gameStateRef.current.jumpVelocity * delta;

      // Land on ground
      if (newPosition.y <= groundLevel) {
        newPosition.y = groundLevel;
        gameStateRef.current.isJumping = false;
        gameStateRef.current.jumpVelocity = 0;
      }
    }

    // No stamina system - removed

    // Check collisions with jump bars (solid obstacles)
    // Only count each obstacle hit once!
    obstacles.forEach((obs) => {
      if (obs.type === 'jump') {
        // Jump obstacles span full width - only check Z distance
        const distZ = Math.abs(newPosition.z - obs.position[2]);
        const clearanceNeeded = 0.5; // Dog needs to be this high to clear the bar

        if (distZ < 0.3) { // Very close to the bar (within 0.3 units in Z)
          if (newPosition.y < clearanceNeeded) {
            // Hit the jump bar - BLOCK forward movement
            // Stop the dog from moving through the bar
            newPosition.z = gameStateRef.current.position.z;

            // Only count this hit if we haven't hit this obstacle before
            if (!hitObstacles.current.has(obs.id)) {
              hitObstacles.current.add(obs.id);
              gameStateRef.current.hitCount += 1;
            }
          }
        }
      }
    });

    // Update distance and score
    const newDistance = Math.abs(newPosition.z + 10);
    // Accumulate score as decimal, then floor the total (not each increment)
    const newScore = Math.floor(newDistance * 10);

    // Update ref state - preserve jump properties!
    gameStateRef.current = {
      position: newPosition,
      rotation: newRotation,
      speed: targetSpeed,
      stamina: 100, // Always full stamina (not used anymore)
      distance: newDistance,
      score: newScore,
      hitCount: gameStateRef.current.hitCount,
      isJumping: gameStateRef.current.isJumping,
      jumpVelocity: gameStateRef.current.jumpVelocity,
    };

    // Check finish condition
    const finished = newDistance >= 70;

    // Calculate actual elapsed time
    const currentTime = state.clock.elapsedTime;
    const elapsedTime = currentTime - startTime.current;

    // Throttle updates to parent - only update HUD ~10 times per second instead of 60+
    // This prevents React re-render storms that destroy the Canvas
    if (currentTime - lastUpdateTime.current >= 0.1 || finished) {
      lastUpdateTime.current = currentTime;
      // Create a new Vector3 to avoid reference issues
      onUpdate({
        position: new Vector3(newPosition.x, newPosition.y, newPosition.z),
        rotation: newRotation,
        speed: targetSpeed,
        stamina: 100, // Always full
        distance: newDistance,
        score: newScore,
        hitCount: gameStateRef.current.hitCount,
        finished,
        time: elapsedTime,
      });
    }
  });

  return (
    <>
      {/* Background */}
      <color attach="background" args={['#87CEEB']} />

      {/* Lighting */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#8B7355" />

      {/* Ground and environment */}
      <Ground />
      <Trees />

      {/* Obstacles */}
      {obstacles.map((obs) => (
        <Obstacle key={obs.id} position={obs.position} type={obs.type} />
      ))}

      {/* Dog */}
      <Dog3D position={[dogPosition.x, dogPosition.y, dogPosition.z]} rotation={[0, dogRotation, 0]} isRunning={false} speed={speed} />

      {/* Camera */}
      <PerspectiveCamera ref={cameraRef} makeDefault position={[-8, 2, -10]} fov={60} />
    </>
  );
}

export default function SprintTraining3D({ onComplete, dogName }: SprintTraining3DProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'finished'>('intro');
  const [dogPosition, setDogPosition] = useState(new Vector3(0, 0, -10));
  const [dogRotation, setDogRotation] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [, setStamina] = useState(100);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [obstacles, setObstacles] = useState<Array<{ position: [number, number, number]; type: 'rock' | 'puddle' | 'cone' | 'jump'; id: number }>>([]);
  const [score, setScore] = useState(0);
  const [hitCount, setHitCount] = useState(0);

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false, // Spacebar for jump
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  });

  // Keyboard controls - use capture phase to intercept before anything else
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for game controls - do this FIRST
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (e.key in keys.current) {
        keys.current[e.key as keyof typeof keys.current] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Prevent default for game controls - do this FIRST
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (e.key in keys.current) {
        keys.current[e.key as keyof typeof keys.current] = false;
      }
    };

    // Use capture phase to intercept events before they bubble
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [gameState]);

  // Generate obstacles (flyball-style with jumps only)
  useEffect(() => {
    if (gameState === 'playing' && obstacles.length === 0) {
      const newObstacles = [];

      // Create a flyball-style course with only jump bars
      // Start at i=1 to skip first obstacle and give a leadup
      for (let i = 1; i < 10; i++) {
        const zPos = -5 + i * 8; // Start at -5 + 8 = 3, giving ~13 units of leadup

        // All obstacles are jumps spanning the full width
        newObstacles.push({
          position: [0, 0, zPos] as [number, number, number],
          type: 'jump' as const,
          id: i,
        });
      }
      setObstacles(newObstacles);
    }
  }, [gameState, obstacles.length]);

  // Handle game updates from 3D scene
  const handleGameUpdate = (updates: {
    position: Vector3;
    rotation: number;
    speed: number;
    stamina: number;
    distance: number;
    score: number;
    hitCount: number;
    finished: boolean;
    time: number;
  }) => {
    setDogPosition(updates.position);
    setDogRotation(updates.rotation);
    setSpeed(updates.speed);
    setStamina(updates.stamina);
    setDistance(updates.distance);
    setScore(updates.score);
    setHitCount(updates.hitCount);
    setTime(updates.time); // Use actual elapsed time from game scene

    if (updates.finished) {
      setGameState('finished');
    }
  };


  const calculatePerformance = () => {
    const timeBonus = Math.max(0, 1 - time / 60); // Faster = better
    const hitPenalty = hitCount * 0.05;
    const distanceScore = distance / 70;
    return Math.min(1.5, Math.max(0.3, distanceScore + timeBonus - hitPenalty));
  };

  if (gameState === 'intro') {
    return (
      <div className="h-screen bg-gradient-to-b from-blue-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl">
          <h2 className="text-4xl font-bold text-earth-900 mb-4">🏃 Sprint Training</h2>
          <p className="text-earth-600 text-lg mb-6">Take {dogName} for a run through the park!</p>

          <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-blue-900 mb-3 text-xl">🎮 Controls:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-blue-800 mb-2">Keyboard:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>A / ←</strong> - Strafe left</li>
                  <li>• <strong>D / →</strong> - Strafe right</li>
                  <li>• <strong>SPACEBAR</strong> - Jump</li>
                  <li>• Dog runs automatically!</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-green-800 mb-2">Mobile:</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• On-screen controls</li>
                  <li>• Touch to change camera</li>
                  <li>• Jump button available</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 font-semibold mb-2">⚡ Tips:</p>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• <strong>Jump over hurdles</strong> with SPACEBAR - don't hit them!</li>
              <li>• The dog runs automatically at a steady pace</li>
              <li>• Use A/D or ←/→ to strafe left and right</li>
              <li>• Time your jumps carefully!</li>
            </ul>
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all font-bold text-xl shadow-lg"
          >
            🏃 Start Sprint!
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const performance = calculatePerformance();
    return (
      <div className="h-screen bg-gradient-to-b from-blue-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl">
          <h2 className="text-4xl font-bold text-earth-900 mb-4">🏁 Sprint Complete!</h2>

          <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-green-900 mb-4 text-2xl">Results:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Distance</p>
                <p className="text-2xl font-bold text-green-700">{distance.toFixed(1)}m</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Time</p>
                <p className="text-2xl font-bold text-blue-700">{time.toFixed(1)}s</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-2xl font-bold text-purple-700">{score}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Obstacles Hit</p>
                <p className="text-2xl font-bold text-red-700">{hitCount}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onComplete(performance)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all font-bold text-xl shadow-lg"
          >
            Complete Training
          </button>
        </div>
      </div>
    );
  }

  // Playing state - 3D game
  return (
    <div
      className="h-screen w-full relative bg-sky-200"
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, alpha: false, antialias: true }}
        camera={{ position: [0, 5, -10], fov: 60 }}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <GameScene
          dogPosition={dogPosition}
          dogRotation={dogRotation}
          speed={speed}
          obstacles={obstacles}
          keys={keys}
          onUpdate={handleGameUpdate}
        />
      </Canvas>

      {/* HUD - positioned to avoid sidebars */}
      <div className="absolute top-20 left-20 bg-black/60 text-white rounded-lg p-4 space-y-2">
        <div>
          <p className="text-xs text-gray-300">Distance</p>
          <p className="text-2xl font-bold">{distance.toFixed(1)}m / 70m</p>
        </div>
        <div>
          <p className="text-xs text-gray-300">Score</p>
          <p className="text-lg font-bold">{score}</p>
        </div>
      </div>


      {/* Touch controls for mobile */}
      <div className="absolute bottom-4 left-4 flex gap-4">
        {/* Strafe controls */}
        <div className="flex gap-2">
          <button
            onTouchStart={() => (keys.current.a = true)}
            onTouchEnd={() => (keys.current.a = false)}
            onMouseDown={() => (keys.current.a = true)}
            onMouseUp={() => (keys.current.a = false)}
            className="bg-black/60 text-white w-16 h-16 rounded-lg hover:bg-black/80 flex items-center justify-center text-2xl"
          >
            ←
          </button>
          <button
            onTouchStart={() => (keys.current.d = true)}
            onTouchEnd={() => (keys.current.d = false)}
            onMouseDown={() => (keys.current.d = true)}
            onMouseUp={() => (keys.current.d = false)}
            className="bg-black/60 text-white w-16 h-16 rounded-lg hover:bg-black/80 flex items-center justify-center text-2xl"
          >
            →
          </button>
        </div>

        {/* Jump button */}
        <button
          onTouchStart={() => (keys.current[' '] = true)}
          onTouchEnd={() => (keys.current[' '] = false)}
          onMouseDown={() => (keys.current[' '] = true)}
          onMouseUp={() => (keys.current[' '] = false)}
          className="bg-yellow-500/80 text-white w-20 h-16 rounded-lg hover:bg-yellow-600/80 flex items-center justify-center font-bold text-sm"
        >
          JUMP
        </button>
      </div>
    </div>
  );
}
