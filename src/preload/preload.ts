/**
 * Preload script - Secure bridge between main and renderer processes
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc.js';
import type {
  Movie,
  Show,
  Season,
  Episode,
  Drive,
  PlaybackProgress,
  ScanProgress,
  LoadMediaRequest,
  DependencyCheckResult,
  RepairResult
} from '../shared/types.js';

// Define the API that will be exposed to the renderer process
interface ElectronAPI {
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

  // Dependency repair (VLC installation)
  repair: {
    checkDependencies: () => Promise<DependencyCheckResult>;
    installVLC: () => Promise<RepairResult>;
    switchToLibVLC: () => Promise<RepairResult>;
    getManualInstructions: () => Promise<string>;
  };

  // Event listeners
  on: (channel: string, listener: (...args: any[]) => void) => void;
  off: (channel: string, listener: (...args: any[]) => void) => void;
  once: (channel: string, listener: (...args: any[]) => void) => void;
}

// Safe IPC wrapper with validation
const electronAPI: ElectronAPI = {
  // Library management
  library: {
    getMovies: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_MOVIES),
    getShows: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_SHOWS),
    getSeasons: (showId: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_SEASONS, showId),
    getEpisodes: (seasonId: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_EPISODES, seasonId),
    searchMedia: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SEARCH, query),
    getRecentlyWatched: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_CONTINUE_WATCHING),
    scanMedia: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVES_SCAN),
    addPath: (path: string) => ipcRenderer.invoke('library:addPath', path),
  },

  // Media playback
  player: {
    load: (request: LoadMediaRequest) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_LOAD, request),
    play: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_PLAY),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_PAUSE),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_STOP),
    seek: (position: number) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SEEK, position),
    setVolume: (volume: number) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_VOLUME, volume),
    setMuted: (muted: boolean) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_MUTED, muted),
    setSubtitleTrack: (trackId: string | null) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_SUBTITLE_TRACK, trackId),
    setAudioTrack: (trackId: string) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_AUDIO_TRACK, trackId),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_GET_STATUS),
  },

  // Playback progress
  progress: {
    get: (mediaId: string) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_PROGRESS, mediaId),
    save: (progress: PlaybackProgress) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SET_PROGRESS, progress),
    delete: (mediaId: string) => ipcRenderer.invoke('progress:delete', mediaId),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    reset: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET),
  },

  // Drive management
  drives: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVES_GET_ALL),
    refresh: () => ipcRenderer.invoke('drives:refresh'),
    eject: (driveId: string) => ipcRenderer.invoke('drives:eject', driveId),
  },

  // Application controls
  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
    toggleFullscreen: () => ipcRenderer.send('app:toggle-fullscreen'),
    showOpenDialog: () => ipcRenderer.invoke('app:show-open-dialog'),
    showSaveDialog: () => ipcRenderer.invoke('app:show-save-dialog'),
    openExternal: (url: string) => ipcRenderer.send('app:open-external', url),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  },

  // Dependency repair (VLC installation)
  repair: {
    checkDependencies: () => ipcRenderer.invoke(IPC_CHANNELS.REPAIR_CHECK_DEPENDENCIES),
    installVLC: () => ipcRenderer.invoke(IPC_CHANNELS.REPAIR_INSTALL_VLC),
    switchToLibVLC: () => ipcRenderer.invoke(IPC_CHANNELS.REPAIR_SWITCH_BACKEND),
    getManualInstructions: () => ipcRenderer.invoke(IPC_CHANNELS.REPAIR_GET_MANUAL_INSTRUCTIONS),
  },

  // Event listeners with safety checks
  on: (channel: string, listener: (...args: any[]) => void) => {
    const validChannels = [
      'player-status-changed',
      'scan-progress',
      'drive-added',
      'drive-removed',
      'drive-changed',
      'window-focus',
      'global-shortcut',
      'menu-action',
      'repair:dependency-check-result',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);
    } else {
      console.warn('Invalid IPC channel:', channel);
    }
  },

  off: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.off(channel, listener);
  },

  once: (channel: string, listener: (...args: any[]) => void) => {
    const validChannels = [
      'player-status-changed',
      'scan-progress',
      'drive-added',
      'drive-removed',
      'drive-changed',
      'window-focus',
      'global-shortcut',
      'menu-action',
      'repair:dependency-check-result',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, listener);
    } else {
      console.warn('Invalid IPC channel:', channel);
    }
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Expose a type-safe interface for development
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Development helpers
if (process.env.NODE_ENV === 'development') {
  console.log('Preload script loaded successfully');
  
  // Expose some debugging functions
  contextBridge.exposeInMainWorld('DEBUG', {
    ipcChannels: IPC_CHANNELS,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromiumVersion: process.versions.chrome,
  });
}

// Error handling for uncaught exceptions in the renderer
window.addEventListener('error', (event) => {
  console.error('Renderer error:', event.error);
  // Could send error reports to main process here
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Could send error reports to main process here
});

console.log('VideoPlayer preload script initialized');