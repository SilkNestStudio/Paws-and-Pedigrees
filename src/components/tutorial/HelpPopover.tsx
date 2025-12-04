import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HELP_CONTENT } from '../../data/tutorials/helpContent';
import { useGameStore } from '../../stores/gameStore';

interface HelpPopoverProps {
  helpId: string;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export default function HelpPopover({ helpId, onClose, buttonRef }: HelpPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { startTutorial } = useGameStore();
  const [position, setPosition] = useState({ top: 0, left: 0, transform: 'translateX(-100%)' });

  const helpContent = HELP_CONTENT[helpId];

  // Calculate position based on button
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 320; // max-w-xs is approximately 320px
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640;

      let top = rect.bottom + 8;
      let left = rect.right;
      let transform = 'translateX(-100%)';

      if (isMobile) {
        // On mobile, center the popover horizontally
        left = viewportWidth / 2;
        transform = 'translateX(-50%)';

        // Make sure it doesn't go off the bottom
        const maxTop = window.innerHeight - 300; // Approximate popover height
        top = Math.min(top, maxTop);
      } else {
        // On desktop, check if popover would go off left edge
        if (left - popoverWidth < 8) {
          left = 8;
          transform = 'translateX(0)';
        }
      }

      setPosition({
        top,
        left,
        transform,
      });
    }
  }, [buttonRef]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, buttonRef]);

  if (!helpContent) {
    return createPortal(
      <div
        ref={popoverRef}
        className="fixed bg-white rounded-lg shadow-xl border-2 border-kennel-200 p-4 max-w-xs z-[999999]"
        style={{ top: `${position.top}px`, left: `${position.left}px`, transform: position.transform }}
      >
        <p className="text-sm text-red-600">Help content not found for "{helpId}"</p>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors text-sm font-medium w-full"
        >
          Got it
        </button>
      </div>,
      document.body
    );
  }

  const handleStartTutorial = () => {
    if (helpContent.tutorialId) {
      startTutorial(helpContent.tutorialId);
      onClose();
    }
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed bg-white rounded-lg shadow-xl border-2 border-kennel-200 p-4 max-w-xs z-[999999] animate-fadeIn"
      style={{ top: `${position.top}px`, left: `${position.left}px`, transform: position.transform }}
    >
      <h3 className="text-lg font-bold text-kennel-800 mb-2">{helpContent.title}</h3>
      <p className="text-sm text-earth-700 leading-relaxed whitespace-pre-line">{helpContent.content}</p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-earth-200 text-earth-800 rounded-lg hover:bg-earth-300 transition-colors text-sm font-medium"
        >
          Got it
        </button>
        {helpContent.tutorialId && (
          <button
            onClick={handleStartTutorial}
            className="flex-1 px-4 py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors text-sm font-medium"
          >
            Learn More
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
