'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Movie } from '../types';
import { Film, Edit, Trash, Trash2, Save, Loader2, Star, Search, Link as LinkIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { toast } from 'sonner';

const API_BASE_URL = '/api';

interface MoviesSectionProps {
  movies: Movie[];
  refreshData: () => void;
  onManageFiles: (movie: Movie) => void;
}

const MoviesSection: React.FC<MoviesSectionProps> = ({ movies, refreshData, onManageFiles }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkMovieFilesCount, setBulkMovieFilesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; title: string; movieFilesCount: number }>({
    isOpen: false,
    id: null,
    title: '',
    movieFilesCount: 0
  });
  const [formData, setFormData] = useState<Partial<Movie>>({
    title: '',
    thumbnail: '{"original_image":""}',
    is_featured: 0
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
    if (path.startsWith('/') && !path.startsWith('//')) return `https://image.tmdb.org/t/p/w500${path}`;
    if (path.startsWith('http')) return path;
    return path;
  };

  const handleEdit = (movie: Movie) => {
    let rawThumbnail = movie.thumbnail;
    if (typeof rawThumbnail === 'object' && rawThumbnail !== null) {
      rawThumbnail = JSON.stringify(rawThumbnail);
    }
    setFormData({ ...movie, thumbnail: rawThumbnail || '' });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: number, title: string) => {
    const toastId = toast.loading('Calculando videos asociados...');
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${id}`, { headers: { Accept: 'application/json' } });
      const summary = await response.json();
      if (!response.ok) {
        toast.error('No se pudo calcular el conteo de videos asociados.', { id: toastId });
        return;
      }
      const movieFilesCount = Number(summary?.movieFilesCount ?? 0);
      setConfirmDelete({ isOpen: true, id, title, movieFilesCount });
      toast.dismiss(toastId);
    } catch (error) {
      console.error(error);
      toast.error('Error al calcular el conteo de videos asociados.', { id: toastId });
    }
  };

  const confirmDeleteAction = async () => {
    if (confirmDelete.id) {
      try {
        const response = await fetch(`${API_BASE_URL}/movies/${confirmDelete.id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success("Película eliminada correctamente");
          refreshData();
        } else {
          toast.error("Error al eliminar la película");
        }
      } catch (error) {
        toast.error("Error de conexión");
        console.error(error);
      } finally {
        setConfirmDelete({ isOpen: false, id: null, title: '', movieFilesCount: 0 });
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title) return;
    setIsSaving(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/movies/${formData.id}` : `${API_BASE_URL}/movies`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(isEditing ? "Película actualizada correctamente" : "Película creada correctamente");
        refreshData();
        setShowModal(false);
      } else {
        toast.error("Error al guardar la película");
      }
    } catch (error) {
      toast.error("Error de conexión");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMovies = movies.filter(movie => 
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMovies.length / ITEMS_PER_PAGE);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const selectedCount = selectedIds.length;
  const visibleIds = React.useMemo(() => paginatedMovies.map((s) => s.id), [paginatedMovies]);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  React.useEffect(() => {
    const available = new Set(movies.map((s) => s.id));
    setSelectedIds((prev) => prev.filter((id) => available.has(id)));
  }, [movies]);

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
    const toastId = toast.loading(`Eliminando ${idsToDelete.length} películas...`);
    try {
      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          fetch(`${API_BASE_URL}/movies/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      await refreshData();
      setSelectedIds([]);

      if (failed.length > 0) {
        toast.error(`Se eliminaron ${idsToDelete.length - failed.length} de ${idsToDelete.length}.`, { id: toastId });
      } else {
        toast.success(`Se eliminaron ${idsToDelete.length} películas correctamente.`, { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar las películas seleccionadas.", { id: toastId });
    }
  };

  const openBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    const toastId = toast.loading('Calculando videos asociados...');
    try {
      const summaries = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${API_BASE_URL}/movies/${id}`, { headers: { Accept: 'application/json' } });
          const body = await res.json();
          if (!res.ok) throw new Error('summary_failed');
          return Number(body?.movieFilesCount ?? 0);
        })
      );
      const total = summaries.reduce((acc, n) => acc + n, 0);
      setBulkMovieFilesCount(total);
      setConfirmBulkDelete(true);
      toast.dismiss(toastId);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo calcular el conteo de videos asociados.', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-900/50">
          <div className="flex items-center gap-6 flex-1 min-w-[300px]">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 whitespace-nowrap">
              <Film className="w-6 h-6 text-indigo-500" />
              Lista de Películas
            </h3>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar películas..." 
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={openBulkDeleteConfirm}
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
                <th className="px-6 py-4 font-bold">PELÍCULA</th>
                <th className="px-6 py-4 font-bold">DESTACADO</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedMovies.map((movie) => (
                <tr key={movie.id} className={`hover:bg-gray-800/30 transition-colors group ${selectedIds.includes(movie.id) ? 'bg-indigo-900/20' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedIds.includes(movie.id)}
                      onChange={() => toggleSelectOne(movie.id)}
                      aria-label={`Seleccionar ${movie.title}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 bg-gray-800 rounded overflow-hidden border border-gray-700 relative">
                        <Image 
                          src={getImageUrlForPreview(movie.thumbnail)} 
                          alt={movie.title} 
                          fill 
                          className="object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="font-bold text-white">{movie.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {Number(movie.is_featured) === 1 ? (
                      <span className="bg-indigo-900/30 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-500/20 flex items-center gap-1 w-fit">
                        <Star className="w-3 h-3 fill-current" /> DESTACADO
                      </span>
                    ) : (
                      <span className="text-gray-600 text-[10px] font-bold uppercase">Normal</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onManageFiles(movie)} className="text-gray-400 hover:text-indigo-400 p-2 transition-colors" title="Gestionar Archivos">
                        <LinkIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(movie)} className="text-gray-400 hover:text-white p-2 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(movie.id, movie.title)} className="text-gray-400 hover:text-red-400 p-2 transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-8 border-b border-gray-800 bg-gray-950/50">
              <h4 className="text-2xl font-black text-white tracking-tighter uppercase">{isEditing ? 'Editar Película' : 'Nueva Película'}</h4>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
                <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thumbnail (JSON)</label>
                <textarea className="w-full bg-gray-800/50 border-2 border-dashed border-indigo-500/30 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none transition-all h-24 resize-none" value={formData.thumbnail || ''} onChange={(e) => setFormData({...formData, thumbnail: e.target.value})} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_featured" checked={Number(formData.is_featured) === 1} onChange={(e) => setFormData({...formData, is_featured: e.target.checked ? 1 : 0})} className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="is_featured" className="text-sm text-gray-300 font-bold">Marcar como destacado</label>
              </div>
            </div>
            <div className="p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold transition-colors px-4">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="Eliminar Película"
        message={`¿Estás SEGURO de eliminar la película "${confirmDelete.title}"? También se eliminarán ${confirmDelete.movieFilesCount} videos asociados. Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, title: '', movieFilesCount: 0 })}
        confirmText="Eliminar"
      />

      <ConfirmModal
        isOpen={confirmBulkDelete}
        title="Eliminar Películas Seleccionadas"
        message={`¿Estás seguro de que deseas eliminar las ${selectedCount} películas seleccionadas? Además se eliminarán ${bulkMovieFilesCount} videos asociados. Esta acción no se puede deshacer.`}
        onConfirm={confirmBulkDeleteAction}
        onCancel={() => setConfirmBulkDelete(false)}
        confirmText="Eliminar"
      />
    </div>
  );
};

export default MoviesSection;
