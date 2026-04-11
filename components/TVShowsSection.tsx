'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { TVShow } from '../types';
import { Tv, Edit, Trash, Trash2, Save, Loader2, Database, Search } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; title: string }>({
    isOpen: false,
    id: null,
    title: ''
  });
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [formData, setFormData] = useState<Partial<TVShow>>({
    title: '',
    tmdb_id: '',
    thumbnail: '{"original_image":""}'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

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

  const totalPages = Math.ceil(filteredShows.length / ITEMS_PER_PAGE);
  const paginatedShows = filteredShows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const selectedCount = selectedIds.length;
  const visibleIds = useMemo(() => paginatedShows.map((s) => s.id), [paginatedShows]);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    const available = new Set(tvShows.map((s) => s.id));
    setSelectedIds((prev) => prev.filter((id) => available.has(id)));
  }, [tvShows]);

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (isAllVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      const merged = new Set(prev);
      for (const id of visibleIds) merged.add(id);
      return Array.from(merged);
    });
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirmBulkDeleteAction = async () => {
    if (selectedIds.length === 0) {
      setConfirmBulkDelete(false);
      return;
    }

    const idsToDelete = [...selectedIds];
    setConfirmBulkDelete(false);
    const toastId = toast.loading(`Eliminando ${idsToDelete.length} series...`);
    try {
      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          fetch(`${API_BASE_URL}/tv_shows/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      await refreshData();
      setSelectedIds([]);

      if (failed.length > 0) {
        toast.error(`Se eliminaron ${idsToDelete.length - failed.length} de ${idsToDelete.length}.`, { id: toastId });
      } else {
        toast.success(`Se eliminaron ${idsToDelete.length} series correctamente.`, { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar las series seleccionadas.", { id: toastId });
    }
  };

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
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            disabled={selectedCount === 0}
            className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-red-600"
            title="Eliminar seleccionadas"
          >
            <Trash2 className="w-4 h-4" /> Eliminar ({selectedCount})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                    checked={isAllVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleccionar todas"
                  />
                </th>
                <th className="px-6 py-4 font-bold">SERIE</th>
                <th className="px-6 py-4 font-bold">TMDB ID</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedShows.map((show) => {
                const previewUrl = getImageUrlForPreview(show.thumbnail);
                const rawThumbnail = typeof show.thumbnail === 'object' ? JSON.stringify(show.thumbnail) : String(show.thumbnail);

                return (
                    <tr key={show.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(show.id)}
                        onChange={() => toggleSelectOne(show.id)}
                        aria-label={`Seleccionar ${show.title}`}
                      />
                    </td>
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
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">No hay series registradas en la base de datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex justify-center items-center gap-4 bg-gray-900/50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors text-sm font-bold"
            >
              Anterior
            </button>
            <span className="text-gray-400 text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors text-sm font-bold"
            >
              Siguiente
            </button>
          </div>
        )}
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

      <ConfirmModal
        isOpen={confirmBulkDelete}
        title="Confirmar Eliminación"
        message={`¿Estás SEGURO de eliminar ${selectedCount} series seleccionadas? Esta acción no se puede deshacer.`}
        onConfirm={confirmBulkDeleteAction}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
};

export default TVShowsSection;
