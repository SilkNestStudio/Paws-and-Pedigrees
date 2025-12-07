import { useState } from 'react';
import AgilityObstacleCourse3D from '../training/3d/AgilityObstacleCourse3D';
import SprintTraining3D from '../training/3d/SprintTraining3D';

type DemoType = 'agility' | 'sprint' | null;

export default function Demo3DView() {
  const [showDemo, setShowDemo] = useState<DemoType>(null);

  const handleComplete = (performance: number) => {
    console.log('Demo completed with performance:', performance);
    setShowDemo(null);
  };

  if (showDemo === 'agility') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <button
          onClick={() => setShowDemo(null)}
          className="absolute top-4 right-4 z-[100] bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
        >
          ← Back to Demo Menu
        </button>
        <AgilityObstacleCourse3D
          onComplete={handleComplete}
          dogName="Demo Dog"
        />
      </div>
    );
  }

  if (showDemo === 'sprint') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <button
          onClick={() => setShowDemo(null)}
          className="absolute top-4 right-4 z-[100] bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
        >
          ← Back to Demo Menu
        </button>
        <SprintTraining3D
          onComplete={handleComplete}
          dogName="Demo Dog"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎮 3D Game Demo
          </h1>
          <p className="text-xl text-white/80">
            Proof of Concept - See what's possible with 3D
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">What You'll See:</h2>
          <ul className="space-y-3 text-white/90">
            <li className="flex items-start gap-3">
              <span className="text-2xl">🐕</span>
              <div>
                <strong>3D Dog Model</strong> - Currently made of simple shapes (cubes/cylinders).
                This is just a placeholder - we can replace with proper 3D models later.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">🏃</span>
              <div>
                <strong>Real Movement</strong> - Watch the dog actually navigate through obstacles,
                not just clicking buttons.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <strong>3D Environment</strong> - Jumps, weave poles, tunnels, A-frames.
                All in 3D space you can rotate and explore.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">📹</span>
              <div>
                <strong>Camera Controls</strong> - Rotate, zoom, pan to see from any angle.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">☀️</span>
              <div>
                <strong>Lighting & Shadows</strong> - Real-time shadows and sky rendering.
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-500/20 backdrop-blur-md rounded-2xl p-6 mb-8 border border-yellow-500/30">
          <h3 className="text-xl font-bold text-yellow-200 mb-2">⚠️ This is VERY Basic</h3>
          <p className="text-yellow-100/90">
            The dog is literally made of boxes and cylinders. This is to show the <strong>concept</strong>, not the final product.
            With proper 3D dog models (which we can get or create), this will look professional and modern.
          </p>
        </div>

        <div className="bg-green-500/20 backdrop-blur-md rounded-2xl p-6 mb-8 border border-green-500/30">
          <h3 className="text-xl font-bold text-green-200 mb-3">✨ The Potential:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-100/90">
            <div>
              <p className="font-semibold mb-1">🏞️ For Agility Training:</p>
              <p className="text-sm">Actually guide your dog through obstacles in 3D</p>
            </div>
            <div>
              <p className="font-semibold mb-1">🏃‍♂️ For Sprint Training:</p>
              <p className="text-sm">Run through a park, control speed, watch stamina</p>
            </div>
            <div>
              <p className="font-semibold mb-1">🚶 For Walking:</p>
              <p className="text-sm">Explore neighborhoods, find items, meet other dogs</p>
            </div>
            <div>
              <p className="font-semibold mb-1">💪 For Weight Pull:</p>
              <p className="text-sm">See your DOG pulling a weighted sled (not a human!)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setShowDemo('sprint')}
            className="py-6 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl font-bold text-xl shadow-2xl transform hover:scale-105 transition-all"
          >
            🏃 Sprint Training
          </button>
          <button
            onClick={() => setShowDemo('agility')}
            className="py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-xl shadow-2xl transform hover:scale-105 transition-all"
          >
            🎯 Agility Course
          </button>
        </div>

        <div className="mt-8 text-center text-white/60 text-sm">
          <p>
            This is running on React Three Fiber - the same tech used by professional 3D web experiences.
            <br />
            It works on mobile browsers and can be wrapped as a native app for the Play Store.
          </p>
        </div>
      </div>
    </div>
  );
}
