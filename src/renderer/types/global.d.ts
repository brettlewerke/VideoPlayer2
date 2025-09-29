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
  LoadMediaRequest,
  DependencyCheckResult,
  RepairResult
} from '../../shared/types.js';

// Extend the global Window interface with our ElectronAPI
declare global {
  interface Window {
    electronAPI: {
      // Library management
      library: {
        getMovies: () => Promise<Movie[]>;
        getShows: () => Promise<Show[]>;
        getSeasons: (showId: string) => Promise<Season[]>;
        getEpisodes: (seasonId: string) => Promise<Episode[]>;
        searchMedia: (query: string) => Promise<(Movie | Episode)[]>;
        getRecentlyWatched: () => Promise<(Movie | Episode)[]>;
        scanMedia: () => Promise<void>;
        addPath: (path: string) => Promise<void>;
      };

      // Media playback
      player: {
        load: (request: LoadMediaRequest) => Promise<void>;
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
      };

      // Drive management
      drives: {
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

      // Dependency repair (Windows)
      repair: {
        checkDependencies: () => Promise<DependencyCheckResult>;
        fixFfmpeg: () => Promise<RepairResult>;
        switchToLibVLC: () => Promise<RepairResult>;
        getManualInstructions: () => Promise<string>;
      };

      // Event listeners
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      once: (channel: string, listener: (...args: any[]) => void) => void;
    };

    // Development helpers (only in development)
    DEBUG?: {
      ipcChannels: any;
      nodeVersion: string;
      electronVersion: string;
      chromiumVersion: string;
    };
  }
}

// Also export as a type for use in components
export type ElectronAPI = Window['electronAPI'];