import { useState } from 'react';
import HelpPopover from './HelpPopover';

interface HelpButtonProps {
  helpId: string;
  size?: 'small' | 'medium';
  tooltip?: string;
}

export default function HelpButton({ helpId, size = 'small', tooltip }: HelpButtonProps) {
  const [showPopover, setShowPopover] = useState(false);

  const sizeClasses = size === 'small' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`${sizeClasses} bg-kennel-600 text-white rounded-full hover:bg-kennel-700 hover:scale-110 transition-all shadow-md flex items-center justify-center cursor-help`}
        title={tooltip || 'Help'}
        aria-label={tooltip || 'Help'}
      >
        ?
      </button>

      {showPopover && (
        <HelpPopover
          helpId={helpId}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}
