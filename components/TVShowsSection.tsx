'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { TVShow } from '../types';
import { Tv, Plus, Edit, Trash, Save, Loader2, Database, Search } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import { toast } from 'sonner';

const API_BASE_URL = '/api';

interface TVShowsSectionProps {
  tvShows: TVShow[];
  refreshData: () => void;
}

const TVShowsSection: React.FC<TVShowsSectionProps> = ({ tvShows, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; title: string }>({
    isOpen: false,
    id: null,
    title: ''
  });
  const [formData, setFormData] = useState<Partial<TVShow>>({
    title: '',
    tmdb_id: '',
    thumbnail: '{"original_image":""}'
  });

  const getImageUrlForPreview = (input: any) => {
    const placeholder = 'https://via.placeholder.com/342x513?text=No+Poster';
    if (!input || input === "" || input === "null" || input === "[]" || input === "{}") return placeholder;

    let path = "";
    try {
      if (typeof input === 'object' && input !== null) {
        path = input.original_image || input.thumbnail || "";
      } else {
        const str = String(input).trim();
        if (str.startsWith('{')) {
          try {
            const data = JSON.parse(str);
            path = data.original_image || data.thumbnail || "";
          } catch (e) {
            const match = str.match(/"(?:original_image|thumbnail)"\s*:\s*"([^"]+)"/);
            path = match ? match[1] : str;
          }
        } else {
          path = str;
        }
      }
    } catch (error) {
      return placeholder;
    }

    if (!path || path === "null" || path === "") return placeholder;

    path = path.replace(/\\\//g, '/').replace(/\\/g, '');

    if (path.startsWith('/') && !path.startsWith('//')) {
      return `https://image.tmdb.org/t/p/w500${path}`;
    }
    if (path.startsWith('http')) return path;
    
    if (path.includes('uploads/')) {
      const domain = API_BASE_URL.split('/api.php')[0];
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `${domain}/${cleanPath}`;
    }

    return path;
  };

  const handleEdit = (show: TVShow) => {
    let rawThumbnail = show.thumbnail;
    if (typeof rawThumbnail === 'object' && rawThumbnail !== null) {
      rawThumbnail = JSON.stringify(rawThumbnail);
    }
    
    setFormData({
      ...show,
      thumbnail: rawThumbnail || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id: number, title: string) => {
    setConfirmDelete({ isOpen: true, id, title });
  };

  const confirmDeleteAction = async () => {
    if (confirmDelete.id) {
      try {
        const response = await fetch(`${API_BASE_URL}/tv_shows/${confirmDelete.id}`, { 
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          toast.success("Serie eliminada correctamente");
          refreshData();
        } else {
          toast.error("Error al eliminar la serie");
        }
      } catch (error) {
        toast.error("Error de conexión");
        console.error("Error deleting:", error);
      } finally {
        setConfirmDelete({ isOpen: false, id: null, title: '' });
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.tmdb_id) {
      toast.error("Título y TMDB ID son obligatorios.");
      return;
    }
    setIsSaving(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/tv_shows/${formData.id}` : `${API_BASE_URL}/tv_shows`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(isEditing ? "Serie actualizada correctamente" : "Serie creada correctamente");
        refreshData();
        setShowModal(false);
        setFormData({ title: '', tmdb_id: '', thumbnail: '{"original_image":""}' });
      } else {
        toast.error("Error al guardar la serie");
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor");
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredShows = tvShows.filter(show => 
    show.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-900/50">
          <div className="flex items-center gap-6 flex-1 min-w-[300px]">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 whitespace-nowrap">
              <Tv className="w-6 h-6 text-indigo-500" />
              Lista de Series
            </h3>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar series..." 
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={() => { setIsEditing(false); setFormData({ title: '', tmdb_id: '', thumbnail: '{"original_image":""}' }); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Añadir Serie
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">SERIE</th>
                <th className="px-6 py-4 font-bold">TMDB ID</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredShows.map((show) => {
                const previewUrl = getImageUrlForPreview(show.thumbnail);
                const rawThumbnail = typeof show.thumbnail === 'object' ? JSON.stringify(show.thumbnail) : String(show.thumbnail);

                return (
                    <tr key={show.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-20 flex-shrink-0 relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md">
                            <Image 
                              src={previewUrl} 
                              alt={show.title} 
                              width={56}
                              height={80}
                              className="w-full h-full object-cover transition-opacity duration-300" 
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/342x513?text=Error';
                              }}
                            />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{show.title}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">ID: {show.id}</div>
                          
                          <div className="mt-2 p-2 bg-black/40 border border-gray-800 rounded-lg max-w-[350px]">
                              <p className="text-[10px] text-indigo-400 font-mono break-all leading-relaxed flex items-center gap-2" title="Contenido real en la base de datos">
                                <Database className="w-3 h-3 opacity-50" />
                                {rawThumbnail || '{"original_image":""}'}
                              </p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-800 text-indigo-300 px-3 py-1 rounded-full text-[11px] font-black border border-indigo-500/20 shadow-sm">
                        {show.tmdb_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(show)} className="text-gray-400 hover:text-white p-2 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(show.id, show.title)} className="text-gray-400 hover:text-red-400 p-2 transition-colors">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tvShows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">No hay series registradas en la base de datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={isEditing ? 'Editar Serie' : 'Nueva Serie'}
        maxWidth="max-w-md"
      >
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
            <input 
              type="text" 
              className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
              value={formData.title || ''} 
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TMDB ID</label>
            <input 
              type="text" 
              className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
              value={formData.tmdb_id || ''} 
              onChange={(e) => setFormData({...formData, tmdb_id: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thumbnail (JSON)</label>
            <textarea 
              className="w-full bg-gray-800/50 border-2 border-dashed border-indigo-500/30 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none transition-all h-24 resize-none" 
              placeholder='{"original_image":"..."}'
              value={formData.thumbnail || ''} 
              onChange={(e) => setFormData({...formData, thumbnail: e.target.value})} 
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold transition-colors px-4">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </Modal>


      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="Confirmar Eliminación"
        message={`¿Estás SEGURO de eliminar la serie "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, title: '' })}
      />
    </div>
  );
};

export default TVShowsSection;
