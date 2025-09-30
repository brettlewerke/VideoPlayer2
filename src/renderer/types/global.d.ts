/**/**/**

 * Global type declarations for renderer process

 */ * Global type declarations for renderer process * Global type declarations for renderer process



import type {  */ */

  Movie, 

  Show, 

  Season, 

  Episode, import type { import type { 

  Drive, 

  PlaybackProgress,   Movie,   Movie, 

  LoadMediaRequest 

} from '../../shared/types.js';  Show,   Show, 



declare global {  Season,   Season, 

  interface Window {

    HPlayerAPI?: {  Episode,   Episode, 

      ping: () => Promise<boolean>;

      library: {  Drive,   Drive, 

        list: () => Promise<{ movies: Movie[]; shows: Show[] }>;

        getMovies: () => Promise<Movie[]>;  PlaybackProgress,   PlaybackProgress, 

        getShows: () => Promise<Show[]>;

        getSeasons: (showId: string) => Promise<Season[]>;  LoadMediaRequest   LoadMediaRequest 

        getEpisodes: (seasonId: string) => Promise<Episode[]>;

        searchMedia: (query: string) => Promise<(Movie | Episode)[]>;} from '../../shared/types.js';} from '../../shared/types.js';

        getRecentlyWatched: () => Promise<(Movie | Episode)[]>;

        scanMedia: () => Promise<void>;

        addPath: (path: string) => Promise<void>;

      };declare global {// Extend the global Window interface with our ElectronAPI

      scanner: {

        scan: () => Promise<void>;  interface Window {declare global {

      };

      player: {    HPlayerAPI?: {  interface Window {

        load: (request: LoadMediaRequest) => Promise<void>;

        play: () => Promise<void>;      ping: () => Promise<boolean>;    electronAPI: {

        pause: () => Promise<void>;

        stop: () => Promise<void>;      library: {      // Library management

        seek: (position: number) => Promise<void>;

        setVolume: (volume: number) => Promise<void>;        list: () => Promise<{ movies: Movie[]; shows: Show[] }>;      library: {

        setMuted: (muted: boolean) => Promise<void>;

        setSubtitleTrack: (trackId: string | null) => Promise<void>;        getMovies: () => Promise<Movie[]>;        getMovies: () => Promise<Movie[]>;

        setAudioTrack: (trackId: string) => Promise<void>;

        getStatus: () => Promise<any>;        getShows: () => Promise<Show[]>;        getShows: () => Promise<Show[]>;

      };

      progress: {        getSeasons: (showId: string) => Promise<Season[]>;        getSeasons: (showId: string) => Promise<Season[]>;

        get: (mediaId: string) => Promise<PlaybackProgress | null>;

        save: (progress: PlaybackProgress) => Promise<void>;        getEpisodes: (seasonId: string) => Promise<Episode[]>;        getEpisodes: (seasonId: string) => Promise<Episode[]>;

        delete: (mediaId: string) => Promise<void>;

      };        searchMedia: (query: string) => Promise<(Movie | Episode)[]>;        searchMedia: (query: string) => Promise<(Movie | Episode)[]>;

      settings: {

        get: () => Promise<any>;        getRecentlyWatched: () => Promise<(Movie | Episode)[]>;        getRecentlyWatched: () => Promise<(Movie | Episode)[]>;

        set: (settings: any) => Promise<void>;

        reset: () => Promise<void>;        scanMedia: () => Promise<void>;        scanMedia: () => Promise<void>;

      };

      drives: {        addPath: (path: string) => Promise<void>;        addPath: (path: string) => Promise<void>;

        getAll: () => Promise<Drive[]>;

        scan: () => Promise<void>;      };      };

        onScanProgress: (callback: (progress: any) => void) => () => void;

      };      scanner: {

      fs: {

        getThumbnail: (path: string) => Promise<string | null>;        scan: () => Promise<void>;      // Media playback

        getArtwork: (path: string, type: string) => Promise<string | null>;

      };      };      player: {

      ipc: {

        send: (channel: string, ...args: any[]) => void;      player: {        load: (request: LoadMediaRequest) => Promise<void>;

        on: (channel: string, callback: (...args: any[]) => void) => () => void;

      };        load: (request: LoadMediaRequest) => Promise<void>;        play: () => Promise<void>;

    };

            play: () => Promise<void>;        pause: () => Promise<void>;

    // Alias for new brand name - points to same API object

    HoserVideoAPI?: typeof Window.prototype.HPlayerAPI;        pause: () => Promise<void>;        stop: () => Promise<void>;

    

    DEBUG?: {        stop: () => Promise<void>;        seek: (position: number) => Promise<void>;

      ipcChannels: Record<string, string>;

      nodeVersion: string;        seek: (position: number) => Promise<void>;        setVolume: (volume: number) => Promise<void>;

      electronVersion: string;

      chromiumVersion: string;        setVolume: (volume: number) => Promise<void>;        setMuted: (muted: boolean) => Promise<void>;

    };

  }        setMuted: (muted: boolean) => Promise<void>;        setSubtitleTrack: (trackId: string | null) => Promise<void>;

}

        setSubtitleTrack: (trackId: string | null) => Promise<void>;        setAudioTrack: (trackId: string) => Promise<void>;

export {};

        setAudioTrack: (trackId: string) => Promise<void>;        getStatus: () => Promise<any>;

        getStatus: () => Promise<any>;      };

      };

      progress: {      // Playback progress

        get: (mediaId: string) => Promise<PlaybackProgress | null>;      progress: {

        save: (progress: PlaybackProgress) => Promise<void>;        get: (mediaId: string) => Promise<PlaybackProgress | null>;

        delete: (mediaId: string) => Promise<void>;        save: (progress: PlaybackProgress) => Promise<void>;

      };        delete: (mediaId: string) => Promise<void>;

      settings: {      };

        get: (key: string) => Promise<any>;

        set: (key: string, value: any) => Promise<void>;      // Settings

        getAll: () => Promise<Record<string, any>>;      settings: {

        reset: () => Promise<void>;        get: (key: string) => Promise<any>;

        open: () => void;        set: (key: string, value: any) => Promise<void>;

      };        getAll: () => Promise<Record<string, any>>;

      drives: {        reset: () => Promise<void>;

        list: () => Promise<Drive[]>;      };

        getAll: () => Promise<Drive[]>;

        refresh: () => Promise<void>;      // Drive management

        eject: (driveId: string) => Promise<void>;      drives: {

      };        getAll: () => Promise<Drive[]>;

      app: {        refresh: () => Promise<void>;

        minimize: () => void;        eject: (driveId: string) => Promise<void>;

        maximize: () => void;      };

        close: () => void;

        toggleFullscreen: () => void;      // Application controls

        showOpenDialog: () => Promise<string[] | null>;      app: {

        showSaveDialog: () => Promise<string | null>;        minimize: () => void;

        openExternal: (url: string) => void;        maximize: () => void;

        getVersion: () => Promise<string>;        close: () => void;

        getPlatform: () => Promise<string>;        toggleFullscreen: () => void;

      };        showOpenDialog: () => Promise<string[] | null>;

      on: (channel: string, listener: (...args: any[]) => void) => void;        showSaveDialog: () => Promise<string | null>;

      off: (channel: string, listener: (...args: any[]) => void) => void;        openExternal: (url: string) => void;

      once: (channel: string, listener: (...args: any[]) => void) => void;        getVersion: () => Promise<string>;

    };        getPlatform: () => Promise<string>;

    electronAPI?: Window['HPlayerAPI'];      };

    DEBUG?: {

      ipcChannels: any;      // Event listeners

      nodeVersion: string;      on: (channel: string, listener: (...args: any[]) => void) => void;

      electronVersion: string;      off: (channel: string, listener: (...args: any[]) => void) => void;

      chromiumVersion: string;      once: (channel: string, listener: (...args: any[]) => void) => void;

    };    };

  }

}    // Development helpers (only in development)

    DEBUG?: {

export type HPlayerAPI = NonNullable<Window['HPlayerAPI']>;      ipcChannels: any;

export type ElectronAPI = HPlayerAPI;      nodeVersion: string;

      electronVersion: string;
      chromiumVersion: string;
    };
  }
}

// Also export as a type for use in components
export type ElectronAPI = Window['electronAPI'];