'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Movie, MovieFile } from '../types';
import { Film, Plus, Edit, Trash, Save, Loader2, ArrowLeft, Search, Zap, Link as LinkIcon } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import { SOURCE_TYPES } from '../constants';
import { toast } from 'sonner';

const API_BASE_URL = '/api';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface MovieFilesSectionProps {
  movie: Movie;
  onBack: () => void;
}

const MovieFilesSection: React.FC<MovieFilesSectionProps> = ({ movie, onBack }) => {
  const [files, setFiles] = useState<MovieFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const [formData, setFormData] = useState<Partial<MovieFile>>({
    video_id: movie.id,
    label: 'Principal',
    order: 1,
    source_type: 'embed',
    file_source: '',
    file_url: '',
    stream_key: generateUUID(),
    conversion_status: 'finished'
  });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; label: string }>({
    isOpen: false,
    id: null,
    label: ''
  });

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/movie_files?video_id=${movie.id}`);
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching movie files:", error);
    } finally {
      setIsLoading(false);
    }
  }, [movie.id]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [movie.id]);

  const handleSaveSingle = async () => {
    if (!formData.file_url) return;
    setIsSaving(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/movie_files/${formData.id}` : `${API_BASE_URL}/movie_files`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          video_id: movie.id,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        })
      });
      if (response.ok) {
        toast.success(isEditing ? "Archivo actualizado correctamente" : "Archivo registrado correctamente");
        fetchFiles();
        setShowModal(false);
        setIsEditing(false);
        setFormData({
          video_id: movie.id,
          label: 'Principal',
          order: files.length + 1,
          source_type: 'embed',
          file_source: 'embed',
          file_url: '',
          stream_key: generateUUID(),
          conversion_status: 'finished'
        });
      } else {
        toast.error("Error al guardar el archivo");
      }
    } catch (error) {
      toast.error("Error de conexión");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkUrls.trim()) return;
    setIsBulkImporting(true);
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u);
    
    try {
      for (let i = 0; i < urls.length; i++) {
        const payload = {
          video_id: movie.id,
          label: formData.label || `Opción ${i + 1}`,
          order: i + 1,
          source_type: formData.source_type || 'embed',
          file_url: urls[i],
          file_source: formData.source_type || 'embed',
          stream_key: generateUUID(),
          conversion_status: 'finished'
        };
        await fetch(`${API_BASE_URL}/movie_files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchFiles();
      toast.success(`${urls.length} archivos importados correctamente`);
      setShowBulkModal(false);
      setBulkUrls('');
    } catch (error) {
      toast.error("Error durante la importación masiva");
      console.error(error);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/movie_files/${confirmDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success("Archivo eliminado correctamente");
        fetchFiles();
      } else {
        toast.error("Error al eliminar el archivo");
      }
    } catch (error) {
      toast.error("Error de conexión");
      console.error(error);
    } finally {
      setConfirmDelete({ isOpen: false, id: null, label: '' });
    }
  };

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

  const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
  const paginatedFiles = files.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold">
          <ArrowLeft className="w-5 h-5" /> Volver a Películas
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowBulkModal(true)}
            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-indigo-500/30"
          >
            <Zap className="w-4 h-4" /> Registro Masivo
          </button>
          <button 
            onClick={() => { 
                setShowModal(true); 
                setIsEditing(false); 
                setFormData({ 
                    video_id: movie.id, 
                    label: 'Principal', 
                    order: files.length + 1, 
                    source_type: 'embed', 
                    file_source: 'embed', 
                    file_url: '', 
                    stream_key: generateUUID(), 
                    conversion_status: 'finished' 
                }); 
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Registro Único
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-gray-800 bg-gray-950/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-24 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-xl relative">
              <Image 
                src={getImageUrlForPreview(movie.thumbnail)} 
                alt={movie.title} 
                fill 
                className="object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{movie.title}</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Gestión de Archivos de Video</p>
            </div>
          </div>
        </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setIsEditing(false); }} 
        title={isEditing ? 'Editar Archivo' : 'Nuevo Archivo'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiqueta (Label)</label>
              <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Fuente</label>
              <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.source_type} onChange={(e) => setFormData({...formData, source_type: e.target.value, file_source: e.target.value})}>
                {SOURCE_TYPES.map(type => <option key={type.value} value={type.value}>{type.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden</label>
              <input type="number" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.order} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">URL del Archivo</label>
              <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all font-mono" value={formData.file_url} onChange={(e) => setFormData({...formData, file_url: e.target.value})} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Formato / Source</label>
              <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.file_source} onChange={(e) => setFormData({...formData, file_source: e.target.value})}>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
                <option value="m3u8">M3U8</option>
                <option value="embed">Embed</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stream Key (Opcional)</label>
              <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all font-mono" value={formData.stream_key} onChange={(e) => setFormData({...formData, stream_key: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => { setShowModal(false); setIsEditing(false); }} className="text-gray-500 hover:text-white font-bold px-4 transition-colors">Cancelar</button>
          <button onClick={handleSaveSingle} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Guardando...' : 'Guardar Archivo'}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        title="Registro Masivo de URLs"
        maxWidth="max-w-lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiqueta (Para todas)</label>
              <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="Ej: Servidor 1" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Fuente (Para todas)</label>
              <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.source_type} onChange={(e) => setFormData({...formData, source_type: e.target.value, file_source: e.target.value})}>
                {SOURCE_TYPES.map(type => <option key={type.value} value={type.value}>{type.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lista de URLs (Una por línea)</label>
            <textarea 
              className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono h-64 resize-none outline-none transition-all" 
              placeholder="https://url1.com&#10;https://url2.com&#10;..."
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-white font-bold px-4 transition-colors">Cancelar</button>
          <button onClick={handleBulkImport} disabled={isBulkImporting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
            {isBulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isBulkImporting ? 'Importando...' : 'Comenzar Importación'}
          </button>
        </div>
      </Modal>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">ORDEN</th>
                <th className="px-6 py-4 font-bold">ETIQUETA</th>
                <th className="px-6 py-4 font-bold">TIPO</th>
                <th className="px-6 py-4 font-bold">URL</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-4">Cargando archivos...</p>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No hay archivos registrados para esta película.</td>
                </tr>
              ) : (
                paginatedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-indigo-400 text-xs">{file.order}</td>
                    <td className="px-6 py-4 font-bold text-white">{file.label}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-[10px] font-black border border-gray-700 uppercase">
                        {file.source_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-500 text-xs font-mono">{file.file_url}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setFormData(file); setIsEditing(true); setShowModal(true); }} className="text-gray-400 hover:text-white p-2 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete({ isOpen: true, id: file.id, label: file.label })} className="text-gray-400 hover:text-red-400 p-2 transition-colors">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="Eliminar Archivo"
        message={`¿Estás seguro de eliminar el archivo "${confirmDelete.label}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, label: '' })}
      />
    </div>
  );
};

export default MovieFilesSection;
