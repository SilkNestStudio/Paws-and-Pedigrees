import { useState, useEffect } from 'react';

/**
 * Landscape Prompt - Suggests users rotate to landscape on mobile
 * Only shows on portrait mobile devices, hides in landscape
 */
export default function LandscapePrompt() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Only show on mobile devices (< 768px width) in portrait mode
      const isMobile = window.innerWidth < 768;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && isPortraitMode);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-6">
      <div className="text-center text-white max-w-md">
        {/* Rotating Phone Animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {/* Phone Icon */}
            <div className="text-8xl animate-bounce">📱</div>
            {/* Rotation Arrow */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-4xl animate-spin-slow">
              🔄
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold mb-3">Better in Landscape!</h2>
        <p className="text-lg mb-2 opacity-90">
          Please rotate your device for the best experience
        </p>
        <p className="text-sm opacity-70">
          This game is optimized for landscape mode
        </p>

        {/* Optional: Dismiss Button */}
        <button
          onClick={() => setIsPortrait(false)}
          className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all"
        >
          Continue in Portrait
        </button>
      </div>
    </div>
  );
}
