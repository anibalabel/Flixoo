'use client';

import React from 'react';
import { ViewType } from '../types';
import { 
  LayoutDashboard, 
  Tv, 
  Layers, 
  Clapperboard, 
  Film, 
  Star, 
  Play, 
  X,
  User,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, onClose, onLogout }) => {
  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'TV_SHOWS', label: 'TV Shows', icon: Tv },
    { id: 'SEASONS', label: 'Seasons', icon: Layers },
    { id: 'EPISODES', label: 'Episodes', icon: Clapperboard },
    { id: 'MOVIES', label: 'Movies', icon: Film },
    { id: 'FEATURED', label: 'Featured', icon: Star },
    { id: 'PROFILE', label: 'My Profile', icon: User },
  ];

  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        setUser(parsed);
      } catch (e) {
        console.error('Error parsing user_info', e);
      }
    }
  }, []);

  return (
    <aside className={`
      fixed inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full z-40 transition-transform duration-300 ease-in-out
      md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      <div className="p-6 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
            <Play className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Flixoo</h1>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-2 py-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id as ViewType); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeView === item.id || (activeView === 'MOVIE_FILES' && item.id === 'MOVIES')
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-4">
        <div className="px-4 py-2">
          <p className="text-base font-bold text-white truncate">
            {user ? `${user.first_name} ${user.last_name}` : 'Administrator'}
          </p>
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">
            {user?.user_type || 'ADMIN'}
          </p>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span className="font-bold uppercase text-xs tracking-widest">Cerrar Sesión</span>
        </button>

        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Connected Database</p>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            plusmovie_flixoo
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
