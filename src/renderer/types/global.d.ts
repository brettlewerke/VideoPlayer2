/**
 * Global type declarations for renderer process
 */

import type {
  Movie,
  Show,
  Season,
  Episode,
  PlaybackProgress,
  LoadMediaRequest,
} from '../../shared/types.js';

declare global {
  interface Window {
    HPlayerAPI?: {
      ping: () => Promise<boolean>;
      library: {
        getMovies: () => Promise<Movie[]>;
        getShows: () => Promise<Show[]>;
        getSeasons: (showId: string) => Promise<Season[]>;
        getEpisodes: (seasonId: string) => Promise<Episode[]>;
        getContinueWatching: () => Promise<PlaybackProgress[]>;
        getRecentlyAdded: () => Promise<{ movies: Movie[]; episodes: Episode[] }>;
        search: (query: string) => Promise<{ movies: Movie[]; shows: Show[] }>;
        addPath: (path: string) => Promise<void>;
        deleteMovie: (movieId: string) => Promise<any>;
        deleteShow: (showId: string) => Promise<any>;
        deleteSeason: (seasonId: string) => Promise<any>;
        deleteEpisode: (episodeId: string) => Promise<any>;
      };
      scanner: {
        scan: () => Promise<any>;
      };
      player: {
        start: (path: string, options?: { start?: number }) => Promise<any>;
        play: () => Promise<void>;
        pause: () => Promise<void>;
        stop: () => Promise<void>;
        seek: (position: number) => Promise<void>;
        setVolume: (volume: number) => Promise<void>;
        setMuted: (muted: boolean) => Promise<void>;
        setAudioTrack: (trackId: number) => Promise<void>;
        setSubtitleTrack: (trackId: number | null) => Promise<void>;
      };
      progress: {
        get: (contentKey: string) => Promise<PlaybackProgress | null>;
        save: (progress: PlaybackProgress) => Promise<void>;
        delete: (contentKey: string) => Promise<void>;
      };
      settings: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
      };
      drives: {
        getAll: () => Promise<any[]>;
      };
      app: {
        quit: () => Promise<void>;
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        toggleFullscreen: () => Promise<void>;
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<string>;
      };
      fs: {
        getThumbnail: (path: string) => Promise<string | null>;
        getArtwork: (path: string) => Promise<string | null>;
      };
    };

    electronAPI?: typeof Window.prototype.HPlayerAPI;

    DEBUG?: {
      ipcChannels: any;
      nodeVersion: string;
      electronVersion: string;
      chromiumVersion: string;
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      once: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}

export type HPlayerAPI = NonNullable<Window['HPlayerAPI']>;
export type ElectronAPI = HPlayerAPI;
