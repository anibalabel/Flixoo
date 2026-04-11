'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ViewType } from '../types';
import { Menu, Search, LogOut, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeView: ViewType;
  toggleSidebar: () => void;
  onLogout: () => void;
  refreshData: () => void;
  isRefreshing: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeView, toggleSidebar, onLogout, refreshData, isRefreshing }) => {
  const [userName, setUserName] = useState('Administrator');

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const fullName = `${user.first_name} ${user.last_name}`;
        setTimeout(() => setUserName(fullName), 0);
      } catch (e) {
        console.error('Error parsing user_info', e);
      }
    }
  }, []);

  const getTitle = () => {
    switch (activeView) {
      case 'DASHBOARD': return 'Overview';
      case 'TV_SHOWS': return 'Manage TV Shows';
      case 'SEASONS': return 'Manage Seasons';
      case 'EPISODES': return 'Manage Episodes';
      case 'MOVIES': return 'Manage Movies';
      case 'FEATURED': return 'Featured Content';
      default: return 'Flixoo Admin';
    }
  };

  return (
    <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 z-20 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative group hidden sm:block">
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-gray-800/50 text-gray-200 pl-10 pr-4 py-2.5 rounded-full border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-48 lg:w-80 transition-all placeholder:text-gray-600"
          />
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData}
            disabled={isRefreshing}
            className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-xl text-gray-400 hover:text-indigo-400 hover:bg-gray-700 transition-all border border-gray-700/50 disabled:opacity-50 group"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-indigo-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <div className="text-right hidden xl:block">
            <p className="text-sm font-semibold text-white">{userName}</p>
            <button 
              onClick={onLogout}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase font-black tracking-widest flex items-center gap-1 ml-auto"
            >
              <LogOut className="w-3 h-3" />
              Cerrar Sesión
            </button>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white border-2 border-gray-800 overflow-hidden shadow-lg flex-shrink-0 relative">
             <Image src="https://picsum.photos/100/100" alt="Avatar" fill className="object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
