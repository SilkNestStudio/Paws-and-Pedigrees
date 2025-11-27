import { memo } from 'react';

// Import background images so Vite can process them for production
import kennelBg from '../../assets/images/backgrounds/kennel-background.png';
import officeBg from '../../assets/images/backgrounds/office-background.png';
import trainingBg from '../../assets/images/backgrounds/training-background.png';
import competitionBg from '../../assets/images/backgrounds/competition-background.png';
import jobsBg from '../../assets/images/backgrounds/jobs-background.png';
import shopBg from '../../assets/images/backgrounds/shop-background.png';

interface SceneBackgroundProps {
  scene: 'kennel' | 'dogDetail' | 'office' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop';
  children: React.ReactNode;
}

function SceneBackground({ scene, children }: SceneBackgroundProps) {
  const backgrounds = {
    kennel: kennelBg,
    dogDetail: kennelBg,
    office: officeBg,
    training: trainingBg,
    competition: competitionBg,
    breeding: kennelBg,
    jobs: jobsBg,
    shop: shopBg,
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
