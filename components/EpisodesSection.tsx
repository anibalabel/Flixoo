'use client';

import React, { useState, useEffect } from 'react';
import { Episode, Season, TVShow } from '../types';
import { SOURCE_TYPES } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { 
  Clapperboard, 
  Plus, 
  Edit, 
  Trash, 
  Save, 
  Loader2, 
  Wand2, 
  DownloadCloud, 
  Zap, 
  ListOrdered, 
  X,
  Database,
  Search,
  AlertTriangle
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import { toast } from 'sonner';

const API_BASE_URL = '/api';

interface EpisodesSectionProps {
  episodes: Episode[];
  seasons: Season[];
  tvShows: TVShow[];
  refreshData: () => void;
}

const EpisodesSection: React.FC<EpisodesSectionProps> = ({ episodes, seasons, tvShows, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkStartEpisode, setBulkStartEpisode] = useState(1);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTMDBModal, setShowTMDBModal] = useState(false);
  const [isTMDBLoading, setIsTMDBLoading] = useState(false);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<any[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });
  
  const [selectedSeriesId, setSelectedSeriesId] = useState<number>(0);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number>(0);
  
  const [formData, setFormData] = useState<Partial<Episode>>({
    episode_name: '',
    season_id: 0,
    series_id: 0,
    file_source: '',
    source_type: 'embed',
    file_url: '',
    order: 1,
    runtime: '00:00',
    poster: '{"original_image":""}',
    description: ''
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

  const handleEdit = (episode: Episode) => {
    let rawPoster = episode.poster;
    if (typeof rawPoster === 'object' && rawPoster !== null) {
      rawPoster = JSON.stringify(rawPoster);
    }
    setFormData({ ...episode, poster: rawPoster || '' });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (id: number, name: string) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  const confirmDeleteAction = async () => {
    if (confirmDelete.id) {
      try {
        const response = await fetch(`${API_BASE_URL}/episodes/${confirmDelete.id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success("Episodio eliminado");
          refreshData();
        } else {
          toast.error("Error al eliminar el episodio");
        }
      } catch (error) {
        toast.error("Error de conexión");
        console.error(error);
      } finally {
        setConfirmDelete({ isOpen: false, id: null, name: '' });
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/episodes/${formData.id}` : `${API_BASE_URL}/episodes`;
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(isEditing ? "Episodio actualizado" : "Episodio creado");
        refreshData();
        setShowModal(false);
      } else {
        toast.error("Error al guardar el episodio");
      }
    } catch (error) {
      toast.error("Error de conexión");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkUrls.trim() || !formData.season_id || !formData.series_id) {
      toast.error("URLs, Serie y Temporada son obligatorios.");
      return;
    }
    setIsBulkImporting(true);
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u);
    
    try {
      let updatedCount = 0;
      for (let i = 0; i < urls.length; i++) {
        const episodeNumber = bulkStartEpisode + i;
        
        // Buscar episodio existente por serie, temporada y orden
        const existingEpisode = episodes.find(ep => 
          Number(ep.series_id) === Number(formData.series_id) && 
          Number(ep.season_id) === Number(formData.season_id) && 
          Number(ep.order) === episodeNumber
        );

        if (existingEpisode) {
          const payload = {
            ...existingEpisode,
            file_url: urls[i],
            source_type: formData.source_type,
            file_source: formData.source_type
          };
          await fetch(`${API_BASE_URL}/episodes/${existingEpisode.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          updatedCount++;
        }
      }
      refreshData();
      setShowBulkModal(false);
      setBulkUrls('');
      toast.success(`Se han actualizado ${updatedCount} episodios correctamente.`);
    } catch (error) {
      console.error(error);
      toast.error("Error durante la actualización masiva.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleTMDBSeasonImport = async () => {
    if (!formData.series_id || !formData.season_id) {
      toast.error("Selecciona Serie y Temporada primero.");
      return;
    }

    const show = tvShows.find(s => s.id === Number(formData.series_id));
    const season = seasons.find(s => s.id === Number(formData.season_id));

    if (!show || !season) return;

    setIsTMDBLoading(true);
    const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxNTU5ZjFmMGE4ODZhYTdlOTNmMjJlMDljNDdiOWM5ZSIsIm5iZiI6MTU4MzcwMDU0Mi44NCwic3ViIjoiNWU2NTVhM2U0NTlhZDYwMDExNTkzYzcwIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.ZOWuTVPOngZqSEgrSfBKN8AXpK77ADFwIvJibc3-ycI';

    try {
      const response = await fetch(`https://api.themoviedb.org/3/tv/${show.tmdb_id}/season/${season.order}?language=es-ES`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${TMDB_TOKEN}`
        }
      });

      const data = await response.json();
      
      if (data.episodes && Array.isArray(data.episodes)) {
        setTmdbEpisodes(data.episodes);
        setSelectedEpisodes(data.episodes.map((ep: any) => ep.episode_number));
      } else {
        toast.warning("No se encontraron episodios para esta temporada en TMDB.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al conectar con TMDB.");
    } finally {
      setIsTMDBLoading(false);
    }
  };

  const handleConfirmTMDBImport = async () => {
    if (selectedEpisodes.length === 0) {
      toast.error("Selecciona al menos un episodio para importar.");
      return;
    }

    const show = tvShows.find(s => s.id === Number(formData.series_id));
    const season = seasons.find(s => s.id === Number(formData.season_id));
    if (!show || !season) return;

    setIsTMDBLoading(true);
    try {
      const episodesToImport = tmdbEpisodes.filter(ep => selectedEpisodes.includes(ep.episode_number));
      
      for (const ep of episodesToImport) {
        const payload = {
          series_id: show.id,
          season_id: season.id,
          episode_name: ep.name,
          description: ep.overview || '',
          order: ep.episode_number,
          runtime: ep.runtime ? String(ep.runtime) : '0',
          poster: JSON.stringify({ original_image: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : "" }),
          file_source: 'embed',
          source_type: 'embed',
          file_url: '',
          slug: ep.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now()
        };

        await fetch(`${API_BASE_URL}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      refreshData();
      setShowTMDBModal(false);
      setTmdbEpisodes([]);
      setSelectedEpisodes([]);
      toast.success(`Se han importado ${episodesToImport.length} episodios correctamente.`);
    } catch (error) {
      console.error(error);
      toast.error("Error durante la importación.");
    } finally {
      setIsTMDBLoading(false);
    }
  };

  const toggleEpisodeSelection = (episodeNumber: number) => {
    setSelectedEpisodes(prev => 
      prev.includes(episodeNumber) 
        ? prev.filter(id => id !== episodeNumber)
        : [...prev, episodeNumber]
    );
  };

  const selectAllEpisodes = () => {
    setSelectedEpisodes(tmdbEpisodes.map(ep => ep.episode_number));
  };

  const deselectAllEpisodes = () => {
    setSelectedEpisodes([]);
  };

  const handleFetchTMDB = async () => {
    if (!formData.series_id || !formData.order) return;
    const show = tvShows.find(s => s.id === Number(formData.series_id));
    if (!show) return;

    setIsSearching(true);
    try {
      const ai: any = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              overview: { type: "string" },
              still_path: { type: "string", nullable: true },
              runtime: { type: "string" }
            }
          }
        }
      });

      const prompt = `Obtén detalles del episodio ${formData.order} de la serie con TMDB ID ${show.tmdb_id}. Devuelve JSON con name, overview, still_path y runtime (formato HH:MM).`;
      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text());
      
      setFormData(prev => ({
        ...prev,
        episode_name: data.name,
        description: data.overview,
        poster: JSON.stringify({ original_image: data.still_path || "" }),
        runtime: data.runtime || "00:00",
        slug: data.name.toLowerCase().replace(/ /g, '-')
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredEpisodes = episodes.filter(ep => {
    const matchesSearch = ep.episode_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeries = selectedSeriesId === 0 || Number(ep.series_id) === selectedSeriesId;
    const matchesSeason = selectedSeasonId === 0 || Number(ep.season_id) === selectedSeasonId;
    return matchesSearch && matchesSeries && matchesSeason;
  });

  const getSeasonsForSeries = (seriesId: number) => {
    return seasons.filter(s => {
      try {
        // Handle cases where tv_show_id might be a JSON string like '["1"]' or just '1'
        const rawId = s.tv_show_id;
        if (typeof rawId === 'string' && rawId.startsWith('[')) {
          const parsed = JSON.parse(rawId);
          return Array.isArray(parsed) && parsed.map(Number).includes(seriesId);
        }
        return Number(rawId) === seriesId;
      } catch (e) {
        return Number(s.tv_show_id) === seriesId;
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-900/50">
          <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[300px]">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 whitespace-nowrap">
              <Clapperboard className="w-6 h-6 text-indigo-500" />
              Gestión de Episodios
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Buscar episodios..." 
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all min-w-[150px]"
                value={selectedSeriesId}
                onChange={(e) => {
                  setSelectedSeriesId(Number(e.target.value));
                  setSelectedSeasonId(0); // Reset season when series changes
                }}
              >
                <option value={0}>Todas las Series</option>
                {tvShows.map(show => (
                  <option key={show.id} value={show.id}>{show.title}</option>
                ))}
              </select>

              <select 
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all min-w-[150px]"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                disabled={selectedSeriesId === 0}
              >
                <option value={0}>Todas las Temporadas</option>
                {getSeasonsForSeries(selectedSeriesId).map(season => (
                  <option key={season.id} value={season.id}>{season.season_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowTMDBModal(true)}
              className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-indigo-500/30 shadow-lg"
            >
              <Wand2 className="w-4 h-4" /> Importar TMDB
            </button>
            <button 
              onClick={() => setShowBulkModal(true)}
              className="bg-gray-800 hover:bg-gray-700 text-indigo-400 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-gray-700"
            >
              <DownloadCloud className="w-4 h-4" /> Importar URLs
            </button>
            <button 
              onClick={() => { setIsEditing(false); setFormData({ episode_name: '', season_id: 0, series_id: 0, file_source: '', source_type: 'embed', file_url: '', order: 1, runtime: '00:00', poster: '{"original_image":""}', description: '' }); setShowModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Episodio
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">EPISODIO</th>
                <th className="px-6 py-4 font-bold">SERIE / TEMP</th>
                <th className="px-6 py-4 font-bold">FUENTE</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredEpisodes.length > 0 ? (
                filteredEpisodes.map((ep) => (
                  <tr key={ep.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-gray-800 rounded overflow-hidden border border-gray-700">
                          <img src={getImageUrlForPreview(ep.poster)} alt={ep.episode_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{ep.episode_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">ORDEN: {ep.order} | {ep.runtime}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                          <div className="text-xs text-indigo-400 font-bold">
                            {tvShows.find(s => Number(s.id) === Number(ep.series_id))?.title || `Serie ID: ${ep.series_id}`}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {seasons.find(s => Number(s.id) === Number(ep.season_id))?.season_name || `Temp ID: ${ep.season_id}`}
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-[10px] font-mono border border-gray-700">
                        {(ep.file_source || 'N/A').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(ep)} className="text-gray-400 hover:text-white p-2 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(ep.id, ep.episode_name)} className="text-gray-400 hover:text-red-400 p-2 transition-colors">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">No se encontraron episodios para los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={isEditing ? 'Editar Episodio' : 'Nuevo Episodio'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serie</label>
              <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.series_id ?? 0} onChange={(e) => setFormData({...formData, series_id: Number(e.target.value)})}>
                <option value={0}>Seleccionar Serie</option>
                {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporada</label>
              <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.season_id ?? 0} onChange={(e) => setFormData({...formData, season_id: Number(e.target.value)})}>
                <option value={0}>Seleccionar Temporada</option>
                {seasons.filter(s => {
                    const showIdMatch = s.tv_show_id?.match(/"(\d+)"/);
                    const showId = showIdMatch ? Number(showIdMatch[1]) : Number(s.tv_show_id);
                    return showId === formData.series_id;
                }).map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden</label>
                    <div className="flex gap-2">
                        <input type="number" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.order} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})} />
                        <button onClick={handleFetchTMDB} className="bg-indigo-600 hover:bg-indigo-500 text-white w-12 rounded-xl flex items-center justify-center transition-all">
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duración</label>
                    <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.runtime} onChange={(e) => setFormData({...formData, runtime: e.target.value})} />
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Episodio</label>
              <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.episode_name} onChange={(e) => setFormData({...formData, episode_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">URL del Video</label>
              <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-mono" value={formData.file_url} onChange={(e) => setFormData({...formData, file_url: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Fuente</label>
                <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.source_type ?? ''} onChange={(e) => setFormData({...formData, source_type: e.target.value, file_source: e.target.value})}>
                  {SOURCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Formato</label>
                <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.file_source ?? ''} onChange={(e) => setFormData({...formData, file_source: e.target.value})}>
                  <option value="">Seleccionar Formato</option>
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                  <option value="m3u8">M3U8</option>
                  <option value="embed">Embed</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Poster (JSON)</label>
              <textarea className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono h-20 resize-none" value={formData.poster} onChange={(e) => setFormData({...formData, poster: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold px-4">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Guardando...' : 'Guardar Episodio'}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={showTMDBModal} 
        onClose={() => { setShowTMDBModal(false); setTmdbEpisodes([]); }} 
        title="Importar Temporada TMDB"
      >
        <div className="space-y-6">
            {tmdbEpisodes.length === 0 ? (
              <>
                <p className="text-sm text-gray-400">Selecciona la serie y temporada para traer automáticamente todos los episodios desde TMDB.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serie</label>
                      <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.series_id ?? 0} onChange={(e) => setFormData({...formData, series_id: Number(e.target.value)})}>
                        <option value={0}>Seleccionar Serie</option>
                        {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporada</label>
                      <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.season_id ?? 0} onChange={(e) => setFormData({...formData, season_id: Number(e.target.value)})}>
                        <option value={0}>Seleccionar Temporada</option>
                        {seasons.filter(s => {
                            const showIdMatch = s.tv_show_id?.match(/"(\d+)"/);
                            const showId = showIdMatch ? Number(showIdMatch[1]) : Number(s.tv_show_id);
                            return showId === formData.series_id;
                        }).map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
                      </select>
                    </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">Selecciona los episodios que deseas importar:</p>
                  <div className="flex gap-2">
                    <button onClick={selectAllEpisodes} className="text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-300">Seleccionar Todo</button>
                    <span className="text-gray-700">|</span>
                    <button onClick={deselectAllEpisodes} className="text-[10px] font-black text-gray-500 uppercase hover:text-gray-400">Deseleccionar Todo</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {tmdbEpisodes.map(ep => (
                    <div 
                      key={ep.episode_number} 
                      onClick={() => toggleEpisodeSelection(ep.episode_number)}
                      className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedEpisodes.includes(ep.episode_number) 
                          ? 'bg-indigo-600/10 border-indigo-500/50' 
                          : 'bg-gray-800/50 border-transparent hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                        selectedEpisodes.includes(ep.episode_number)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-700'
                      }`}>
                        {selectedEpisodes.includes(ep.episode_number) && <Zap className="w-3 h-3 fill-current" />}
                      </div>
                      <div className="w-16 h-10 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                        <img src={ep.still_path ? `https://image.tmdb.org/t/p/w185${ep.still_path}` : 'https://via.placeholder.com/185x104'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">E{ep.episode_number}: {ep.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{ep.overview || 'Sin descripción'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => { setShowTMDBModal(false); setTmdbEpisodes([]); }} className="text-gray-500 hover:text-white font-bold px-4">Cancelar</button>
          {tmdbEpisodes.length === 0 ? (
            <button onClick={handleTMDBSeasonImport} disabled={isTMDBLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
              {isTMDBLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isTMDBLoading ? 'Buscando...' : 'Buscar Episodios'}
            </button>
          ) : (
            <button onClick={handleConfirmTMDBImport} disabled={isTMDBLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
              {isTMDBLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              {isTMDBLoading ? 'Importando...' : `Importar ${selectedEpisodes.length} Episodios`}
            </button>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        title="Actualización Masiva de URLs"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
            <p className="text-xs text-gray-400">Esta herramienta actualizará el <b>Tipo de Fuente</b> y la <b>URL</b> de los episodios que ya existen en la base de datos.</p>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serie</label>
                    <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.series_id ?? 0} onChange={(e) => setFormData({...formData, series_id: Number(e.target.value)})}>
                        <option value={0}>Elegir Serie</option>
                        {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporada</label>
                    <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.season_id ?? 0} onChange={(e) => setFormData({...formData, season_id: Number(e.target.value)})}>
                        <option value={0}>Elegir Temporada</option>
                        {seasons.filter(s => {
                            const showIdMatch = s.tv_show_id?.match(/"(\d+)"/);
                            const showId = showIdMatch ? Number(showIdMatch[1]) : Number(s.tv_show_id);
                            return showId === formData.series_id;
                        }).map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Fuente</label>
                    <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={formData.source_type ?? ''} onChange={(e) => setFormData({...formData, source_type: e.target.value, file_source: e.target.value})}>
                        {SOURCE_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empezar desde Episodio</label>
                    <input 
                        type="number" 
                        className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" 
                        value={bulkStartEpisode} 
                        onChange={(e) => setBulkStartEpisode(Number(e.target.value))}
                        min={1}
                    />
                </div>
            </div>
            <textarea 
                className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono h-64 resize-none" 
                placeholder="Pega aquí una lista de URLs (una por línea)..."
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
            />
            <p className="text-[10px] text-gray-500 italic">Se actualizarán los episodios secuenciales (Episodio {bulkStartEpisode}, {bulkStartEpisode + 1}, {bulkStartEpisode + 2}...) que ya existan.</p>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-white font-bold px-4">Cancelar</button>
          <button onClick={handleBulkImport} disabled={isBulkImporting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2">
            {isBulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isBulkImporting ? 'Actualizando...' : 'Comenzar Actualización'}
          </button>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="Confirmar Eliminación"
        message={`¿Estás SEGURO de eliminar el episodio "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
      />
    </div>
  );
};

export default EpisodesSection;
