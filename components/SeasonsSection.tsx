'use client';

import React, { useState, useEffect } from 'react';
import { Season, TVShow, Episode } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Layers, Plus, Edit, Trash, Save, Loader2, Wand2, AlertTriangle, Search } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import { toast } from 'sonner';

const API_BASE_URL = '/api';

interface SeasonsSectionProps {
  seasons: Season[];
  tvShows: TVShow[];
  episodes: Episode[];
  refreshData: () => void;
}

type LanguageType = 'LAT' | 'CAST' | 'SUB';

const SeasonsSection: React.FC<SeasonsSectionProps> = ({ seasons, tvShows, episodes, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });
  const [language, setLanguage] = useState<LanguageType>('LAT');
  const [formData, setFormData] = useState<Partial<Season>>({
    season_name: '',
    tv_show_id: '',
    order: 1,
    status: 1
  });

  const getCurrentTimestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

  useEffect(() => {
    if (!isEditing && formData.tv_show_id && formData.order !== undefined) {
      const selectedShow = tvShows.find(s => s.id.toString() === formData.tv_show_id?.toString());
      if (selectedShow) {
        const paddedOrder = formData.order.toString().padStart(2, '0');
        setFormData(prev => ({ ...prev, season_name: `S${paddedOrder} : ${language} : ${selectedShow.title}` }));
      }
    }
  }, [formData.tv_show_id, formData.order, language, tvShows, isEditing]);

  const handleSearchSeasons = async () => {
    if (!formData.tv_show_id) {
      toast.error("Por favor selecciona una serie primero.");
      return;
    }
    const selectedShow = tvShows.find(s => s.id.toString() === formData.tv_show_id);
    if (!selectedShow) return;

    setIsSearching(true);
    try {
      const ai: any = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                season_number: { type: "integer" },
                name: { type: "string" },
                overview: { type: "string" },
                poster_path: { type: "string", nullable: true }
              },
              required: ["season_number", "name"]
            }
          }
        }
      });

      const prompt = `Lista las temporadas reales para la serie con TMDB ID: ${selectedShow.tmdb_id}. Devuelve un JSON array de objetos con: season_number (int), name (string), overview (string), y poster_path (string).`;
      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text() || "[]");
      console.log("Fetched seasons:", data);
      toast.info(`Temporadas encontradas: ${data.length}. Revisa la consola para ver los detalles.`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    if (!formData.tv_show_id || !formData.season_name) return;
    setIsSaving(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/seasons/${formData.id}` : `${API_BASE_URL}/seasons`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          slug: formData.season_name?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
          updated_at: getCurrentTimestamp()
        })
      });
      if (response.ok) {
        toast.success(isEditing ? "Temporada actualizada" : "Temporada creada");
        refreshData();
        setShowModal(false);
      } else {
        toast.error("Error al guardar la temporada");
      }
    } catch (error) { 
      toast.error("Error de conexión");
      console.error(error); 
    } finally { setIsSaving(false); }
  };

  const toggleStatus = async (season: Season) => {
    const showIdMatch = season.tv_show_id?.match(/"(\d+)"/);
    const showId = showIdMatch ? showIdMatch[1] : season.tv_show_id;
    try {
      await fetch(`${API_BASE_URL}/seasons/${season.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...season, tv_show_id: showId, status: Number(season.status) === 1 ? 0 : 1, updated_at: getCurrentTimestamp() })
      });
      refreshData();
    } catch (e) { console.error(e); }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/seasons/${confirmDelete.id}`, { method: 'DELETE' });
      if (res.ok) { 
        toast.success("Temporada eliminada");
        refreshData(); 
      } else {
        toast.error("Error al eliminar la temporada");
      }
    } catch (error) { 
      toast.error("Error de conexión");
      console.error(error); 
    } finally {
      setConfirmDelete({ isOpen: false, id: null, name: '' });
    }
  };

  const filteredSeasons = seasons.filter(s => 
    s.season_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-900/50">
          <div className="flex items-center gap-6 flex-1 min-w-[300px]">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 whitespace-nowrap">
              <Layers className="w-6 h-6 text-indigo-500" /> Gestión de Temporadas
            </h3>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar temporadas..." 
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button onClick={() => { setIsEditing(false); setFormData({ season_name: '', tv_show_id: '', order: 1, status: 1 }); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Temporada
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">SERIE ID</th>
                <th className="px-6 py-4 font-bold">NOMBRE</th>
                <th className="px-6 py-4 font-bold text-center">ORDEN</th>
                <th className="px-6 py-4 font-bold">ESTADO</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredSeasons.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4 font-mono text-indigo-300 text-xs">{s.tv_show_id}</td>
                  <td className="px-6 py-4 font-bold text-white">{s.season_name}</td>
                  <td className="px-6 py-4 text-center text-white font-mono">{s.order}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleStatus(s)} className={`px-3 py-1 rounded-md text-[10px] font-black border ${Number(s.status) === 1 ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-500 border-red-500/30'}`}>
                      {Number(s.status) === 1 ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setIsEditing(true); setFormData(s); setShowModal(true); }} className="text-gray-400 hover:text-indigo-400 p-2"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: s.id, name: s.season_name })} className="text-gray-400 hover:text-red-400 p-2"><Trash className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={isEditing ? 'Editar Temporada' : 'Crear Temporada'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serie</label>
            <div className="flex gap-2">
              <select className="flex-1 bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.tv_show_id ?? ''} onChange={(e) => setFormData({...formData, tv_show_id: e.target.value})}>
                <option value="">Elegir serie...</option>
                {tvShows.map(show => <option key={show.id} value={show.id}>{show.title}</option>)}
              </select>
              {!isEditing && (
                <button onClick={handleSearchSeasons} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white w-12 rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center shadow-lg">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Idioma</label>
            <div className="flex gap-2 p-1 bg-gray-800 rounded-xl border border-gray-700">
              {(['LAT', 'CAST', 'SUB'] as LanguageType[]).map((lang) => (
                <button key={lang} onClick={() => setLanguage(lang)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${language === lang ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                  {lang === 'LAT' ? 'LATINO' : lang === 'CAST' ? 'CASTELLANO' : 'SUBTITULADO'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</label>
            <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.season_name} onChange={(e) => setFormData({...formData, season_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden</label>
              <input type="number" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.order} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</label>
              <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.status ?? 1} onChange={(e) => setFormData({...formData, status: parseInt(e.target.value)})}>
                <option value={1}>ACTIVO</option>
                <option value={0}>INACTIVO</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold px-4">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>


      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="Confirmar Eliminación"
        message={`¿Estás SEGURO de eliminar la temporada "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
      />
    </div>
  );
};

export default SeasonsSection;
