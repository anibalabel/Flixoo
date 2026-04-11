'use client';

import React, { useState } from 'react';
import { Play, Mail, Lock, CircleAlert, CircleCheck, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('is_authenticated', 'true');
        localStorage.setItem('user_info', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(data.error || 'Credenciales incorrectas. Verifique su acceso.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md animate-scaleIn relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-2xl shadow-indigo-600/40 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Play className="w-10 h-10 fill-current" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Flixoo Admin</h1>
          <p className="text-gray-500 mt-2 font-medium">Panel de Gestión de Contenidos</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-black/50 backdrop-blur-sm bg-gray-900/90">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Correo Electrónico</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-12 py-4 text-white text-sm outline-none transition-all placeholder:text-gray-600" 
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contraseña</label>
              <div className="relative">
                <input 
                  type={isPasswordVisible ? 'text' : 'password'} 
                  required
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-12 py-4 text-white text-sm outline-none transition-all placeholder:text-gray-600" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                  aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {isPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fadeIn">
                <CircleAlert className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Acceder al Panel <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-[10px] mt-8 uppercase font-bold tracking-widest">
          © 2026 Flixoo Management System
        </p>
      </div>
    </div>
  );
};

export default Login;
