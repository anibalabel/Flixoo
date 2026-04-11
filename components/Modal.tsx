'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative bg-gray-900 border border-gray-800 rounded-3xl w-full ${maxWidth} overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center shrink-0">
          <h4 className="text-xl font-black text-white tracking-tighter uppercase">{title}</h4>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
