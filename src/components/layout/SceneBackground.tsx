import { memo } from 'react';

interface SceneBackgroundProps {
  scene: 'kennel' | 'dogDetail' | 'office' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop';
  children: React.ReactNode;
}

function SceneBackground({ scene, children }: SceneBackgroundProps) {
  const backgrounds = {
    kennel: '/src/assets/images/backgrounds/kennel-background.png',
    dogDetail: '/src/assets/images/backgrounds/kennel-background.png',
    office: '/src/assets/images/backgrounds/office-background.png',
    training: '/src/assets/images/backgrounds/training-background.png',
    competition: '/src/assets/images/backgrounds/competition-background.png',
    breeding: '/src/assets/images/backgrounds/kennel-background.png',
    jobs: '/src/assets/images/backgrounds/jobs-background.png',
    shop: '/src/assets/images/backgrounds/shop-background.png',
  };

  const backgroundImage = backgrounds[scene] || backgrounds.kennel;

  return (
    <div 
      className="min-h-full bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default memo(SceneBackground);
