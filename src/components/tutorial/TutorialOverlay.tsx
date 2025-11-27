import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { TUTORIALS } from '../../data/tutorials/tutorialSteps';

interface TutorialOverlayProps {
  tutorialId: string;
}

export default function TutorialOverlay({ tutorialId }: TutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { completeTutorial, skipTutorial } = useGameStore();

  const tutorial = TUTORIALS[tutorialId];

  useEffect(() => {
    // Reset to first step when tutorial changes
    setCurrentStepIndex(0);
  }, [tutorialId]);

  if (!tutorial) {
    return null;
  }

  const currentStep = tutorial.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tutorial.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial(tutorialId);
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    skipTutorial(tutorialId);
  };

  // Determine position classes based on step position
  const getPositionClasses = () => {
    if (!currentStep.position || currentStep.position === 'center') {
      return 'items-center justify-center';
    }
    // For other positions, we'll center for now (spotlight implementation will handle positioning)
    return 'items-center justify-center';
  };

  return (
    <div className={`fixed inset-0 bg-black/60 flex ${getPositionClasses()} z-50 p-4 animate-fadeIn`}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-kennel-600 to-kennel-700 p-6 rounded-t-2xl text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-1">{tutorial.name}</h2>
          <p className="text-sm text-kennel-200">
            Step {currentStepIndex + 1} of {tutorial.steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h3 className="text-xl md:text-2xl font-bold text-kennel-800 mb-4">
            {currentStep.title}
          </h3>
          <p className="text-base md:text-lg text-earth-700 leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-earth-50 p-4 md:p-6 rounded-b-2xl">
          <div className="flex justify-between items-center gap-4">
            {/* Skip button */}
            {currentStep.canSkip && (
              <button
                onClick={handleSkip}
                className="text-sm text-earth-600 hover:text-earth-800 transition-colors underline"
              >
                Skip Tutorial
              </button>
            )}

            {/* Spacer if can't skip */}
            {!currentStep.canSkip && <div></div>}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={handleBack}
                  className="px-4 md:px-6 py-2 md:py-3 bg-earth-200 text-earth-800 rounded-lg hover:bg-earth-300 transition-colors font-semibold text-sm md:text-base"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 md:px-8 py-2 md:py-3 bg-gradient-to-r from-kennel-600 to-kennel-700 hover:from-kennel-700 hover:to-kennel-800 text-white rounded-lg transition-all font-bold text-sm md:text-base shadow-lg transform hover:scale-105"
              >
                {isLastStep ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {tutorial.steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStepIndex
                    ? 'bg-kennel-600 w-8'
                    : index < currentStepIndex
                    ? 'bg-kennel-400 w-2'
                    : 'bg-earth-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
