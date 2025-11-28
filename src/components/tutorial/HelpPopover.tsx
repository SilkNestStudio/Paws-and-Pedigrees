import { useEffect, useRef, useState } from 'react';
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
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const helpContent = HELP_CONTENT[helpId];

  // Calculate position based on button
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.right,
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
    return (
      <div
        ref={popoverRef}
        className="fixed bg-white rounded-lg shadow-xl border-2 border-kennel-200 p-4 max-w-xs z-[99999]"
        style={{ top: `${position.top}px`, left: `${position.left}px`, transform: 'translateX(-100%)' }}
      >
        <p className="text-sm text-red-600">Help content not found for "{helpId}"</p>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors text-sm font-medium w-full"
        >
          Got it
        </button>
      </div>
    );
  }

  const handleStartTutorial = () => {
    if (helpContent.tutorialId) {
      startTutorial(helpContent.tutorialId);
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white rounded-lg shadow-xl border-2 border-kennel-200 p-4 max-w-xs z-[99999] animate-fadeIn"
      style={{ top: `${position.top}px`, left: `${position.left}px`, transform: 'translateX(-100%)' }}
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
    </div>
  );
}
