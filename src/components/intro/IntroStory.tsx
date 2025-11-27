import { useState } from 'react';

interface IntroStoryProps {
  onComplete: () => void;
}

export default function IntroStory({ onComplete }: IntroStoryProps) {
  const [currentScene, setCurrentScene] = useState(0);

  const scenes = [
    {
      background: 'from-slate-800 to-slate-900',
      content: (
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 animate-fade-in">
            A Letter From Grandpa
          </h1>
          <div className="bg-amber-50 p-8 rounded-lg shadow-2xl transform rotate-1">
            <p className="text-lg md:text-xl text-slate-800 italic font-serif leading-relaxed">
              "My dear grandchild,
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              If you're reading this, I've moved on to chase squirrels in a better place.
              But before I go, I have one final wish...
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              All my life, I've worked with dogs. Trained them, loved them, watched them
              bring joy to countless families. But there's one thing that always broke my heart—
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              The dogs left behind at the pound, waiting for someone to see their potential.
            </p>
          </div>
        </div>
      ),
    },
    {
      background: 'from-amber-900 to-orange-900',
      content: (
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="bg-amber-50 p-8 rounded-lg shadow-2xl transform -rotate-1">
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed">
              I'm leaving you my old kennel on the edge of town. It's not much—
              one small run and a whole lot of memories.
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              I'm also leaving you <span className="font-bold text-green-700">$500</span>.
              Not a fortune, but enough to get started.
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              Here's my final wish: Go to the pound. Choose one dog that nobody else wants.
              See the champion in them that others can't.
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              Train them. Love them. Show the world what rescue dogs can become.
            </p>
          </div>
        </div>
      ),
    },
    {
      background: 'from-kennel-700 to-kennel-900',
      content: (
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <div className="bg-amber-50 p-8 rounded-lg shadow-2xl">
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed">
              Build something beautiful. Not just for the dogs you save,
              but for every person who ever doubted what a rescue could be.
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-4">
              Make them champions. Prove that every dog deserves a second chance.
            </p>
            <p className="text-2xl md:text-3xl text-slate-800 font-serif leading-relaxed mt-6 italic">
              That's how you honor my memory.
            </p>
            <p className="text-lg md:text-xl text-slate-800 font-serif leading-relaxed mt-6">
              All my love,
            </p>
            <p className="text-xl md:text-2xl text-slate-800 font-serif font-bold mt-2">
              — Grandpa
            </p>
          </div>
          <div className="pt-6">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Your journey begins now...
            </p>
            <button
              onClick={onComplete}
              className="px-8 py-4 bg-white text-kennel-800 rounded-lg hover:bg-amber-100 transition-all font-bold text-lg shadow-xl transform hover:scale-105"
            >
              Visit The Pound
            </button>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene(currentScene + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${scenes[currentScene].background} flex items-center justify-center p-4 md:p-8 transition-all duration-1000`}>
      <div className="w-full">
        {scenes[currentScene].content}

        {/* Navigation */}
        <div className="mt-8 md:mt-12 flex justify-center gap-4">
          {currentScene < scenes.length - 1 && (
            <>
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                Skip Story
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all font-semibold backdrop-blur-sm"
              >
                Continue →
              </button>
            </>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {scenes.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentScene
                  ? 'bg-white w-8'
                  : index < currentScene
                  ? 'bg-white/50'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
