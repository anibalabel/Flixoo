export interface TVShow {
  id: number;
  title: string;
  tmdb_id: string;
  thumbnail: string; // Formato JSON: {"original_image":"..."}
}

export interface Season {
  id: number;
  tv_show_id: string; // Stored as '["1"]'
  slug: string;
  season_name: string;
  order: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface Episode {
  id: number;
  season_id: number;
  series_id: number;
  episode_name: string;
  slug: string;
  description: string;
  file_source: string;
  source_type: string;
  file_url: string;
  order: number;
  runtime: string;
  poster: string; // Formato JSON: {"original_image":"..."}
  total_view: number;
  created_at?: string;
  updated_at?: string;
}

export interface Movie {
  id: number;
  title: string;
  thumbnail: string; // Formato JSON: {"original_image":"..."}
  is_featured: number; // 0 o 1
}

export interface MovieFile {
  id: number;
  stream_key: string;
  video_id: number;
  file_source: string;
  source_type: string;
  file_url: string;
  label: string;
  order: number;
  conversion_status: string;
  created_at?: string;
  updated_at?: string;
}

export type ViewType = 'DASHBOARD' | 'TV_SHOWS' | 'SEASONS' | 'EPISODES' | 'MOVIES' | 'FEATURED' | 'PROFILE' | 'MOVIE_FILES';
