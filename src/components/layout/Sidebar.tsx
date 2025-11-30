import { memo } from 'react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

// Navigation sidebar (desktop) / bottom nav (mobile)
function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'office', label: 'Office', icon: '📋' },
    { id: 'story', label: 'Story', icon: '📖' },
    { id: 'kennel', label: 'Kennel', icon: '🏠' },
    { id: 'training', label: 'Training', icon: '🎯' },
    { id: 'competition', label: 'Compete', icon: '🏆' },
    { id: 'breeding', label: 'Breeding', icon: '🤰' },
    { id: 'vet', label: 'Vet Clinic', icon: '🏥' },
    { id: 'jobs', label: 'Jobs', icon: '💼' },
    { id: 'shop', label: 'Shop', icon: '🛍️' },
  ];

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-kennel-800 text-white flex-col items-center py-6 space-y-6 shadow-xl z-20 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center gap-1 w-16 py-3 rounded-lg transition-all ${
              currentView === item.id
                ? 'bg-kennel-600 shadow-lg scale-110'
                : 'hover:bg-kennel-700 opacity-70 hover:opacity-100'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-kennel-800 text-white shadow-2xl z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center px-2 py-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 ${
                currentView === item.id
                  ? 'bg-kennel-600 shadow-lg'
                  : 'opacity-70'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default memo(Sidebar);
