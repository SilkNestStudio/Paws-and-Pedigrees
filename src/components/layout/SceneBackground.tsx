import { memo } from 'react';
// import { getKennelBackground } from '../../utils/kennelUpgrades'; // Disabled until level-specific backgrounds are added

// Import static background images so Vite can process them for production
import kennelBg from '../../assets/images/backgrounds/kennel-background.png';
import officeBg from '../../assets/images/backgrounds/office-background.png';
import trainingBg from '../../assets/images/backgrounds/training-background.png';
import competitionBg from '../../assets/images/backgrounds/competition-background.png';
import jobsBg from '../../assets/images/backgrounds/jobs-background.png';
import shopBg from '../../assets/images/backgrounds/shop-background.png';

interface SceneBackgroundProps {
  scene: 'kennel' | 'dogDetail' | 'office' | 'story' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop' | 'vet' | 'demo3d';
  children: React.ReactNode;
  kennelLevel?: number; // Used for kennel-related scenes to show level-specific backgrounds
}

function SceneBackground({ scene, children, kennelLevel: _kennelLevel = 1 }: SceneBackgroundProps) {
  // Note: Level-specific kennel backgrounds are disabled until images are added
  // To enable: uncomment the useEffect below and add images to /public/assets/kennel/levelX/background.jpg
  // kennelLevel is preserved for future use (prefixed with _ to avoid unused variable warning)

  // const [kennelBgImage, setKennelBgImage] = useState<string>(kennelBg);
  // useEffect(() => {
  //   const isKennelScene = ['kennel', 'dogDetail', 'breeding'].includes(scene);
  //   if (isKennelScene && kennelLevel) {
  //     const levelBgPath = getKennelBackground(kennelLevel);
  //     const img = new Image();
  //     img.onload = () => setKennelBgImage(levelBgPath);
  //     img.onerror = () => setKennelBgImage(kennelBg);
  //     img.src = levelBgPath;
  //   }
  // }, [scene, kennelLevel]);

  const backgrounds: Record<SceneBackgroundProps['scene'], string> = {
    kennel: kennelBg,
    dogDetail: kennelBg,
    breeding: kennelBg,
    office: officeBg,
    story: officeBg, // Story mode uses office background
    training: trainingBg,
    competition: competitionBg,
    jobs: jobsBg,
    shop: shopBg,
    vet: kennelBg, // Vet clinic uses generic kennel background
    demo3d: trainingBg, // 3D demo uses training background
  };

  const backgroundImage = backgrounds[scene] || backgrounds.kennel;

  return (
    <div className="min-h-screen relative z-0">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="fixed inset-0 bg-black/10 z-0 pointer-events-none" />
      <div className="relative min-h-screen z-10">
        {children}
      </div>
    </div>
  );
}

export default memo(SceneBackground);
