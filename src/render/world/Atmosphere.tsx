import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec2 } from '../../core/math';

const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.62, 0.55).normalize();

/** Gradient sky dome with a soft sun glow; late afternoon. */
export function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color('#6fa3d6') },
          uHorizon: { value: new THREE.Color('#f2e2c4') },
          uSun: { value: SUN_DIRECTION },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uSun;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 sky = mix(uHorizon, uTop, pow(h, 0.55));
            float glow = pow(max(dot(vDir, uSun), 0.0), 24.0);
            sky += vec3(1.0, 0.85, 0.6) * glow * 0.55;
            gl_FragColor = vec4(sky, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={material} scale={400} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

/**
 * Sun and sky light. The sun's shadow camera follows the action so shadows
 * stay crisp near the keeper and dog without a huge shadow map.
 */
export function Lighting({ focus }: { focus: () => Vec2 }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  const target = useMemo(() => {
    const t = new THREE.Object3D();
    scene.add(t);
    return t;
  }, [scene]);

  useFrame(() => {
    const light = sun.current;
    if (!light) return;
    const f = focus();
    target.position.set(f.x, 0, f.z);
    light.position.set(
      f.x + SUN_DIRECTION.x * 60,
      SUN_DIRECTION.y * 60,
      f.z + SUN_DIRECTION.z * 60,
    );
    light.target = target;
  });

  return (
    <>
      <hemisphereLight args={['#cfe0f2', '#58703a', 1.1]} />
      <directionalLight
        ref={sun}
        color="#fff0d8"
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <fog attach="fog" args={['#e9e0cb', 70, 300]} />
    </>
  );
}
