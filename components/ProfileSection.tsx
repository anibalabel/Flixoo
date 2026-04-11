'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Shield, LogOut, BadgeCheck, Type } from 'lucide-react';

interface ProfileSectionProps {
  onLogout: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        setTimeout(() => setUser(parsed), 0);
      } catch (e) {
        console.error('Error parsing user_info', e);
      }
    }
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="px-8 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="w-32 h-32 rounded-[2.5rem] bg-gray-900 border-4 border-gray-950 overflow-hidden shadow-2xl flex-shrink-0">
              <img src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=6366f1&color=fff&size=128`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                  {user.first_name} {user.last_name}
                </h2>
                <BadgeCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-indigo-400 font-bold uppercase text-xs tracking-widest mt-1">Administrador del Sistema</p>
            </div>
            <button 
              onClick={onLogout}
              className="mb-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-500/20 flex items-center gap-2 shadow-xl"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <User className="w-5 h-5 text-indigo-500" /> Información Personal
          </h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre Completo</p>
                <p className="text-white font-bold">{user.first_name} {user.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Correo Electrónico</p>
                <p className="text-white font-bold">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-500" /> Detalles de Cuenta
          </h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo de Usuario</p>
                <p className="text-white font-bold uppercase">{user.user_type || 'Admin'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID de Rol</p>
                <p className="text-white font-bold">{user.role_id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
