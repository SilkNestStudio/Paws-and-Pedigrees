import { memo, type ReactNode } from 'react';
interface SceneBackgroundProps {
 scene: 'fieldClub' | 'hub' | 'expansion' | 'kennel' | 'dogDetail' | 'office' | 'story' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop' | 'vet' | 'demo3d';
 children: ReactNode; kennelLevel?: number;
}
function SceneBackground({ scene, children }: SceneBackgroundProps) {
 return <div className="club-scene" data-scene={scene}>{children}</div>;
}
export default memo(SceneBackground);
