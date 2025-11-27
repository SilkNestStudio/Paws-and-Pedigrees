interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

// Navigation sidebar with emoji icons (restoring visuals)
export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'kennel', label: 'Kennel', icon: "dY?�" },
    { id: 'office', label: 'Office', icon: "dY?@" },
    { id: 'training', label: 'Training', icon: "dYZ_" },
    { id: 'competition', label: 'Compete', icon: "dY?+" },
    { id: 'breeding', label: 'Breeding', icon: "dY?_" },
    { id: 'jobs', label: 'Jobs', icon: "dY'�" },
    { id: 'shop', label: 'Shop', icon: "dY>'" },
  ];

  return (
    <div className="w-20 bg-kennel-800 text-white flex flex-col items-center py-6 space-y-6 shadow-xl">
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
  );
}
