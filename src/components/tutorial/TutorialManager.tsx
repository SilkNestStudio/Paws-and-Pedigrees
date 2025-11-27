import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import TutorialOverlay from './TutorialOverlay';

export default function TutorialManager() {
  const {
    hasAdoptedFirstDog,
    tutorialProgress,
    activeTutorial,
    startTutorial
  } = useGameStore();

  // Auto-trigger kennel-basics tutorial when first dog is adopted
  useEffect(() => {
    if (
      hasAdoptedFirstDog &&
      !tutorialProgress.completedTutorials.includes('kennel-basics') &&
      !tutorialProgress.skippedTutorials.includes('kennel-basics') &&
      !activeTutorial
    ) {
      // Delay tutorial slightly to let user see their new dog first
      const timer = setTimeout(() => {
        startTutorial('kennel-basics');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasAdoptedFirstDog, tutorialProgress, activeTutorial, startTutorial]);

  // Render active tutorial
  if (activeTutorial) {
    return <TutorialOverlay tutorialId={activeTutorial} />;
  }

  return null;
}
