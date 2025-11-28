import { useState, useRef } from 'react';
import HelpPopover from './HelpPopover';
import { useGameStore } from '../../stores/gameStore';

interface HelpButtonProps {
  helpId: string;
  size?: 'small' | 'medium';
  tooltip?: string;
}

export default function HelpButton({ helpId, size = 'small', tooltip }: HelpButtonProps) {
  const [showPopover, setShowPopover] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { tutorialProgress } = useGameStore();

  const sizeClasses = size === 'small' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  // Don't render if help icons are hidden
  if (!tutorialProgress.showHelpIcons) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setShowPopover(!showPopover)}
        className={`${sizeClasses} bg-kennel-600 text-white rounded-full hover:bg-kennel-700 hover:scale-110 transition-all shadow-md flex items-center justify-center cursor-help`}
        title={tooltip || 'Help'}
        aria-label={tooltip || 'Help'}
      >
        ?
      </button>

      {showPopover && buttonRef.current && (
        <HelpPopover
          helpId={helpId}
          onClose={() => setShowPopover(false)}
          buttonRef={buttonRef}
        />
      )}
    </div>
  );
}
