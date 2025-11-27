import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface SettingsDropdownProps {
  onSignOut: () => void;
}

export default function SettingsDropdown({ onSignOut }: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resetGame } = useGameStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleResetGameClick = () => {
    setShowResetConfirm(true);
    setResetStep(1);
    setIsOpen(false);
  };

  const handleResetStep1Confirm = () => {
    setResetStep(2);
    setConfirmText('');
  };

  const handleResetStep2Confirm = () => {
    if (confirmText.toLowerCase() === 'reset') {
      // Set a flag to trigger reset on next page load
      // This prevents race conditions with Zustand persist middleware
      localStorage.setItem('reset-pending', 'true');
      // Immediately reload - App.tsx will handle the actual reset
      window.location.href = window.location.origin;
    }
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
    setResetStep(0);
    setConfirmText('');
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Settings Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 md:px-4 py-1.5 md:py-2 bg-kennel-800 hover:bg-kennel-900 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-1 md:gap-2"
          aria-label="Settings"
        >
          <span className="text-lg">⚙️</span>
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
            <div className="py-1">
              {/* Logout Option */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700"
              >
                <span className="text-lg">🚪</span>
                <span className="font-medium">Logout</span>
              </button>

              {/* Divider */}
              <div className="border-t border-slate-200 my-1"></div>

              {/* Reset Game Option */}
              <button
                onClick={handleResetGameClick}
                className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
              >
                <span className="text-lg">🔄</span>
                <span className="font-medium">Reset Game</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 md:p-8">
            {resetStep === 1 && (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-2xl font-bold text-red-600 mb-2">
                    Reset Game?
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    This will permanently delete:
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <ul className="space-y-2 text-sm text-red-800">
                    <li className="flex items-start gap-2">
                      <span>❌</span>
                      <span>All your dogs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>❌</span>
                      <span>All your progress and levels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>❌</span>
                      <span>All your cash and gems</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>❌</span>
                      <span>All competition records</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>❌</span>
                      <span>Everything will be lost forever</span>
                    </li>
                  </ul>
                </div>

                <p className="text-center text-slate-700 font-semibold mb-6">
                  Are you absolutely sure you want to continue?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelReset}
                    className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetStep1Confirm}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Yes, Continue
                  </button>
                </div>
              </>
            )}

            {resetStep === 2 && (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-2xl font-bold text-red-600 mb-2">
                    Final Confirmation
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-slate-700 mb-3 font-medium">
                    Type <span className="font-bold text-red-600">RESET</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type RESET here..."
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 text-lg"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelReset}
                    className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetStep2Confirm}
                    disabled={confirmText.toLowerCase() !== 'reset'}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset Game
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
