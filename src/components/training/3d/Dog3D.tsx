import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AnimationMixer, Mesh, MeshStandardMaterial } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
export interface DogAppearance {
    breed_id: number;
    coat_color?: string;
}
interface Props {
    position: [
        number,
        number,
        number
    ];
    rotation?: [
        number,
        number,
        number
    ];
    isRunning?: boolean;
    speed?: number;
    dog?: DogAppearance;
    animation?: 'Idle' | 'Walk' | 'Run' | 'Eat' | 'Sit' | 'Sniff';
}
export default function Dog3D({ position, rotation = [0, 0, 0], isRunning, speed = 1, dog, animation }: Props) {
    const style = [1, 7].includes(dog?.breed_id ?? 0) ? 'stocky' : 'athletic';
    const { scene, animations } = useGLTF(`/models/${style}_dog.glb`);
    const model = useMemo(() => {
        const copy = clone(scene);
        copy.traverse(node => {
            if (node instanceof Mesh) {
                node.castShadow = true;
                node.frustumCulled = false;
                const multiple = Array.isArray(node.material);
                const materials = (multiple ? node.material as MeshStandardMaterial[] : [node.material as MeshStandardMaterial]).map(material => {
                    const mat = material.clone() as MeshStandardMaterial;
                    const color = dog?.coat_color?.toLowerCase() ?? '';
                    if (mat.name.startsWith('Coat')) {
                        if (/black/.test(color))
                            mat.color.set('#333a40');
                        else if (/cream|white/.test(color))
                            mat.color.set('#d6c8ad');
                        else if (/gold|yellow|tan/.test(color))
                            mat.color.set('#b78a50');
                        else if (/brown|chocolate|red/.test(color))
                            mat.color.set('#815133');
                    }
                    return mat;
                });
                node.material = multiple ? materials : materials[0];
            }
        });
        return copy;
    }, [scene, dog?.coat_color]);
    const mixer = useMemo(() => new AnimationMixer(model), [model]);
    const sniffTime = useRef(0);
    const head = useMemo(() => model.getObjectByName('Head'), [model]);
    const clipName = animation === 'Sniff' ? 'Eat' : animation ?? (isRunning ? 'Run' : 'Idle');
    useEffect(() => {
        const clip = animations.find(a => a.name === clipName);
        if (!clip)
            return;
        const action = mixer.clipAction(clip).reset().fadeIn(.2).play();
        return () => { action.fadeOut(.2); };
    }, [animations, clipName, mixer]);
    useEffect(() => () => { mixer.stopAllAction(); mixer.uncacheRoot(model); model.traverse(node => { if (node instanceof Mesh)
        (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose()); }); }, [mixer, model]);
    useFrame((_, dt) => {
        const step = Math.min(dt, .1);
        mixer.update(step * speed * (animation === 'Sniff' ? .6 : 1));
        if (animation === 'Sniff' && head) {
            sniffTime.current += step;
            // The lowered-head pose is supplied by the rig; add a gentle scent-search sweep.
            head.rotateX(.25);
            head.rotateY(Math.sin(sniffTime.current * 2.4) * .2);
        } else sniffTime.current = 0;
    });
    return <group position={position} rotation={rotation}><primitive object={model} rotation={[0, Math.PI, 0]} dispose={null}/></group>;
}
