'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  isDanger = true
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fadeIn">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
        <div className="p-6 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-xl font-black text-white tracking-tighter uppercase">{title}</h4>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-gray-300 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-6 bg-gray-950/50 flex justify-end gap-3 border-t border-gray-800">
          <button 
            onClick={onCancel} 
            className="text-gray-400 hover:text-white font-bold transition-colors px-6 py-3 rounded-xl hover:bg-gray-800"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
