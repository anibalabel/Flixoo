'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Login from '../components/Login';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Toaster, toast } from 'sonner';
import Dashboard from '../components/Dashboard';
import TVShowsSection from '../components/TVShowsSection';
import SeasonsSection from '../components/SeasonsSection';
import EpisodesSection from '../components/EpisodesSection';
import MoviesSection from '../components/MoviesSection';
import MovieFilesSection from '../components/MovieFilesSection';
import FeaturedSection from '../components/FeaturedSection';
import ProfileSection from '../components/ProfileSection';
import { Episode, Movie, Season, TVShow, ViewType } from '../types';
import { Film } from 'lucide-react';

const API_BASE_URL = '/api';

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('DASHBOARD');
  const [selectedMovieForFiles, setSelectedMovieForFiles] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [tvShows, setTvShows] = useState<TVShow[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const toastId = toast.loading("Actualizando datos...");
    try {
      const [tvRes, seasonRes, epRes, movieRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tv_shows`),
        fetch(`${API_BASE_URL}/seasons`),
        fetch(`${API_BASE_URL}/episodes`),
        fetch(`${API_BASE_URL}/movies`)
      ]);

      const [tvData, seasonData, epData, movieData] = await Promise.all([
        tvRes.json(),
        seasonRes.json(),
        epRes.json(),
        movieRes.json()
      ]);

      setTvShows(Array.isArray(tvData) ? tvData : []);
      setSeasons(Array.isArray(seasonData) ? seasonData : []);
      setEpisodes(Array.isArray(epData) ? epData : []);
      setMovies(Array.isArray(movieData) ? movieData : []);
      toast.success("Datos actualizados", { id: toastId });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al actualizar datos", { id: toastId });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const authStatus = localStorage.getItem('is_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [fetchData]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('is_authenticated', 'true');
    fetchData();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('user_info');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-400 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Flixoo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'DASHBOARD':
        return <Dashboard tvShows={tvShows} seasons={seasons} episodes={episodes} movies={movies} />;
      case 'TV_SHOWS':
        return <TVShowsSection tvShows={tvShows} refreshData={fetchData} />;
      case 'SEASONS':
        return <SeasonsSection tvShows={tvShows} seasons={seasons} episodes={episodes} refreshData={fetchData} />;
      case 'EPISODES':
        return <EpisodesSection tvShows={tvShows} seasons={seasons} episodes={episodes} refreshData={fetchData} />;
      case 'MOVIES':
        return <MoviesSection movies={movies} refreshData={fetchData} onManageFiles={(movie) => {
          setSelectedMovieForFiles(movie);
          setActiveView('MOVIE_FILES');
        }} />;
      case 'FEATURED':
        return <FeaturedSection movies={movies} refreshData={fetchData} />;
      case 'MOVIE_FILES':
        if (!selectedMovieForFiles) {
          return (
            <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800 animate-fadeIn">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Film className="w-10 h-10 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Selecciona una película</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Para gestionar los archivos de video, primero debes seleccionar una película desde el listado general.</p>
              <button 
                onClick={() => setActiveView('MOVIES')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all"
              >
                Ir a Películas
              </button>
            </div>
          );
        }
        return <MovieFilesSection movie={selectedMovieForFiles} onBack={() => setActiveView('MOVIES')} />;
      case 'PROFILE':
        return <ProfileSection onLogout={handleLogout} />;
      default:
        return <Dashboard tvShows={tvShows} seasons={seasons} episodes={episodes} movies={movies} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          activeView={activeView} 
          toggleSidebar={toggleSidebar} 
          onLogout={handleLogout}
          refreshData={fetchData}
          isRefreshing={isRefreshing}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
