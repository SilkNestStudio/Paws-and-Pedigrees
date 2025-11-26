interface SceneBackgroundProps {
  scene: 'kennel' | 'training' | 'competition' | 'jobs' | 'shop';
  children: React.ReactNode;
}

export default function SceneBackground({ scene, children }: SceneBackgroundProps) {
  const backgrounds = {
    kennel: '/src/assets/images/backgrounds/kennel-background.png',
    training: '/src/assets/images/backgrounds/training-background.png',
    competition: '/src/assets/images/backgrounds/competition-background.png',
    jobs: '/src/assets/images/backgrounds/jobs-background.png',
    shop: '/src/assets/images/backgrounds/shop-background.png',
  };

  return (
    <div 
      className="min-h-full bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${backgrounds[scene]})` }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}