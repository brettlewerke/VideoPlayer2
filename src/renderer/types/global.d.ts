/**
 * Global type declarations for renderer process
 */

import type {
  Movie,
  Show,
  Season,
  Episode,
  Drive,
  PlaybackProgress,
  LoadMediaRequest
} from '../../shared/types.js';

declare global {
  interface Window {
    HPlayerAPI?: {
      ping: () => Promise<boolean>;
      
      // Library management
      library: {
        list: () => Promise<{ movies: Movie[]; shows: Show[] }>;
        getMovies: () => Promise<Movie[]>;
        getShows: () => Promise<Show[]>;
        getSeasons: (showId: string) => Promise<Season[]>;
        getEpisodes: (seasonId: string) => Promise<Episode[]>;
        searchMedia: (query: string) => Promise<(Movie | Episode)[]>;
        getRecentlyWatched: () => Promise<(Movie | Episode)[]>;
        scanMedia: () => Promise<void>;
        addPath: (path: string) => Promise<void>;
        deleteMovie: (movieId: string) => Promise<void>;
        deleteShow: (showId: string) => Promise<void>;
        deleteSeason: (seasonId: string) => Promise<void>;
        deleteEpisode: (episodeId: string) => Promise<void>;
      };
      
      // Media scanning
      scanner: {
        scan: () => Promise<void>;
      };
      
      // Media playback
      player: {
        start: (path: string, options?: { start?: number }) => Promise<any>;
        restart: (path: string) => Promise<void>;
        play: () => Promise<void>;
        pause: () => Promise<void>;
        stop: () => Promise<void>;
        seek: (position: number) => Promise<void>;
        setVolume: (volume: number) => Promise<void>;
        setMuted: (muted: boolean) => Promise<void>;
        setSubtitleTrack: (trackId: string | null) => Promise<void>;
        setAudioTrack: (trackId: string) => Promise<void>;
        getStatus: () => Promise<any>;
      };
      
      // Playback progress
      progress: {
        get: (mediaId: string) => Promise<PlaybackProgress | null>;
        save: (progress: PlaybackProgress) => Promise<void>;
        delete: (mediaId: string) => Promise<void>;
      };
      
      // Settings
      settings: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        getAll: () => Promise<Record<string, any>>;
        reset: () => Promise<void>;
        open: () => void;
      };
      
      // Drive management
      drives: {
        list: () => Promise<Drive[]>;
        getAll: () => Promise<Drive[]>;
        refresh: () => Promise<void>;
        eject: (driveId: string) => Promise<void>;
      };
      
      // Application controls
      app: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        toggleFullscreen: () => void;
        showOpenDialog: () => Promise<string[] | null>;
        showSaveDialog: () => Promise<string | null>;
        openExternal: (url: string) => void;
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<string>;
      };
      
      // Window controls
      windowControl: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
      
      // Event listeners
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      once: (channel: string, listener: (...args: any[]) => void) => void;
    };
    
    // Alias for new brand name - points to same API object
    HoserVideoAPI?: typeof Window.prototype.HPlayerAPI;
    
    // Development helpers (only in development)
    DEBUG?: {
      ipcChannels: any;
      nodeVersion: string;
      electronVersion: string;
      chromiumVersion: string;
    };
  }
}

// Export types for use in components
export type HPlayerAPI = NonNullable<Window['HPlayerAPI']>;
export type ElectronAPI = HPlayerAPI;