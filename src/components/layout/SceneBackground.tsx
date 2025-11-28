import { memo, useState, useEffect } from 'react';
import { getKennelBackground } from '../../utils/kennelUpgrades';

// Import static background images so Vite can process them for production
import kennelBg from '../../assets/images/backgrounds/kennel-background.png';
import officeBg from '../../assets/images/backgrounds/office-background.png';
import trainingBg from '../../assets/images/backgrounds/training-background.png';
import competitionBg from '../../assets/images/backgrounds/competition-background.png';
import jobsBg from '../../assets/images/backgrounds/jobs-background.png';
import shopBg from '../../assets/images/backgrounds/shop-background.png';

interface SceneBackgroundProps {
  scene: 'kennel' | 'dogDetail' | 'office' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop' | 'vet';
  children: React.ReactNode;
  kennelLevel?: number; // Used for kennel-related scenes to show level-specific backgrounds
}

function SceneBackground({ scene, children, kennelLevel = 1 }: SceneBackgroundProps) {
  const [kennelBgImage, setKennelBgImage] = useState<string>(kennelBg);

  // Load kennel-level-specific background for kennel-related scenes
  useEffect(() => {
    // Only load dynamic backgrounds for kennel-related scenes
    const isKennelScene = ['kennel', 'dogDetail', 'breeding'].includes(scene);

    if (isKennelScene && kennelLevel) {
      const levelBgPath = getKennelBackground(kennelLevel);

      // Try to load the level-specific background
      // If it doesn't exist, fall back to generic kennel background
      const img = new Image();
      img.onload = () => {
        setKennelBgImage(levelBgPath);
      };
      img.onerror = () => {
        // Fallback to generic kennel background if level-specific doesn't exist
        setKennelBgImage(kennelBg);
      };
      img.src = levelBgPath;
    }
  }, [scene, kennelLevel]);

  const backgrounds = {
    kennel: kennelBgImage,
    dogDetail: kennelBgImage,
    breeding: kennelBgImage,
    office: officeBg,
    training: trainingBg,
    competition: competitionBg,
    jobs: jobsBg,
    shop: shopBg,
    vet: kennelBg, // Vet clinic uses generic kennel background
  };

  const backgroundImage = backgrounds[scene] || backgrounds.kennel;

  return (
    <div
      className="min-h-full bg-cover bg-center bg-no-repeat relative transition-all duration-500"
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
