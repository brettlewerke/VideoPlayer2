/// <reference lib="dom" />
/**
 * Preload script - Secure bridge between main and renderer processes
 * Bundled as a single self-contained file for app.asar compatibility
 */

import { contextBridge, ipcRenderer } from 'electron';

// Inline IPC channel constants to avoid cross-tree imports
const IPC_CHANNELS = {
  PLAYER_LOAD: 'player:load',
  PLAYER_PLAY: 'player:play',
  PLAYER_PAUSE: 'player:pause',
  PLAYER_STOP: 'player:stop',
  PLAYER_SEEK: 'player:seek',
  PLAYER_SET_VOLUME: 'player:setVolume',
  PLAYER_SET_MUTED: 'player:setMuted',
  PLAYER_SET_AUDIO_TRACK: 'player:setAudioTrack',
  PLAYER_SET_SUBTITLE_TRACK: 'player:setSubtitleTrack',
  PLAYER_GET_STATUS: 'player:getStatus',
  PLAYER_GET_TRACKS: 'player:getTracks',
  PLAYER_STATUS_CHANGED: 'player:statusChanged',
  PLAYER_TRACKS_CHANGED: 'player:tracksChanged',
  PLAYER_ENDED: 'player:ended',
  PLAYER_ERROR: 'player:error',
  LIBRARY_GET_MOVIES: 'library:getMovies',
  LIBRARY_GET_SHOWS: 'library:getShows',
  LIBRARY_GET_SEASONS: 'library:getSeasons',
  LIBRARY_GET_EPISODES: 'library:getEpisodes',
  LIBRARY_GET_CONTINUE_WATCHING: 'library:getContinueWatching',
  LIBRARY_GET_RECENTLY_ADDED: 'library:getRecentlyAdded',
  LIBRARY_SEARCH: 'library:search',
  LIBRARY_GET_PROGRESS: 'library:getProgress',
  LIBRARY_SET_PROGRESS: 'library:setProgress',
  DRIVES_GET_ALL: 'drives:getAll',
  DRIVES_SCAN: 'drives:scan',
  DRIVES_SCAN_PROGRESS: 'drives:scanProgress',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',
  FS_GET_THUMBNAIL: 'fs:getThumbnail',
  FS_GET_ARTWORK: 'fs:getArtwork',
} as const;

const IS_DEV = process.env.NODE_ENV === 'development';

const hplayerAPI = {
  ping: async () => {
    if (IS_DEV) console.log('[Preload] ping() called');
    return true;
  },
  
  library: {
    list: async () => {
      try {
        const [moviesRes, showsRes] = await Promise.all([
          ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_MOVIES),
          ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_SHOWS),
        ]);
        // IPC handlers wrap responses in { success, data, error }
        const movies = moviesRes?.data || [];
        const shows = showsRes?.data || [];
        return { movies, shows };
      } catch (error) {
        console.error('[Preload] library.list() error:', error);
        return { movies: [], shows: [] };
      }
    },
    getMovies: async () => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_MOVIES).catch(() => null);
      return res?.data || [];
    },
    getShows: async () => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_SHOWS).catch(() => null);
      return res?.data || [];
    },
    getSeasons: async (showId: string) => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_SEASONS, showId).catch(() => null);
      return res?.data || [];
    },
    getEpisodes: async (seasonId: string) => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_EPISODES, seasonId).catch(() => null);
      return res?.data || [];
    },
    searchMedia: async (query: string) => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SEARCH, query).catch(() => null);
      return res?.data || [];
    },
    getRecentlyWatched: async () => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_CONTINUE_WATCHING).catch(() => null);
      return res?.data || [];
    },
    scanMedia: () => ipcRenderer.invoke(IPC_CHANNELS.DRIVES_SCAN).catch(() => {}),
    addPath: (path: string) => ipcRenderer.invoke('library:addPath', path).catch(() => {}),
  },

  scanner: {
    scan: async () => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.DRIVES_SCAN).catch(() => null);
      return res?.data;
    },
  },

  player: {
    load: (request: any) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_LOAD, request).catch(() => {}),
    play: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_PLAY).catch(() => {}),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_PAUSE).catch(() => {}),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_STOP).catch(() => {}),
    seek: (position: number) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SEEK, position).catch(() => {}),
    setVolume: (volume: number) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_VOLUME, volume).catch(() => {}),
    setMuted: (muted: boolean) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_MUTED, muted).catch(() => {}),
    setSubtitleTrack: (trackId: string | null) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_SUBTITLE_TRACK, trackId).catch(() => {}),
    setAudioTrack: (trackId: string) => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_SET_AUDIO_TRACK, trackId).catch(() => {}),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.PLAYER_GET_STATUS).catch(() => null),
  },

  progress: {
    get: async (mediaId: string) => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_GET_PROGRESS, mediaId).catch(() => null);
      return res?.data || null;
    },
    save: (progress: any) => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_SET_PROGRESS, progress).catch(() => {}),
    delete: (mediaId: string) => ipcRenderer.invoke('progress:delete', mediaId).catch(() => {}),
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key).catch(() => null),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value).catch(() => {}),
    getAll: () => ipcRenderer.invoke('settings:getAll').catch(() => ({})),
    reset: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET).catch(() => {}),
    open: () => ipcRenderer.send('settings:open'),
  },

  drives: {
    list: async () => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.DRIVES_GET_ALL).catch(() => null);
      return res?.data || [];
    },
    getAll: async () => {
      const res = await ipcRenderer.invoke(IPC_CHANNELS.DRIVES_GET_ALL).catch(() => null);
      return res?.data || [];
    },
    refresh: () => ipcRenderer.invoke('drives:refresh').catch(() => {}),
    eject: (driveId: string) => ipcRenderer.invoke('drives:eject', driveId).catch(() => {}),
  },

  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
    toggleFullscreen: () => ipcRenderer.send('app:toggle-fullscreen'),
    showOpenDialog: () => ipcRenderer.invoke('app:show-open-dialog').catch(() => null),
    showSaveDialog: () => ipcRenderer.invoke('app:show-save-dialog').catch(() => null),
    openExternal: (url: string) => ipcRenderer.send('app:open-external', url),
    getVersion: () => ipcRenderer.invoke('app:get-version').catch(() => '0.0.0'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform').catch(() => 'unknown'),
  },

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
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);
    } else {
      console.warn('[Preload] Invalid IPC channel:', channel);
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
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, listener);
    } else {
      console.warn('[Preload] Invalid IPC channel:', channel);
    }
  },
};

// Expose the API under both old and new names for backward compatibility
contextBridge.exposeInMainWorld('HPlayerAPI', hplayerAPI);
contextBridge.exposeInMainWorld('HoserVideoAPI', hplayerAPI);

if (IS_DEV) {
  console.log('[Preload] bridge ready (HPlayerAPI + HoserVideoAPI)');
  contextBridge.exposeInMainWorld('DEBUG', {
    ipcChannels: IPC_CHANNELS,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromiumVersion: process.versions.chrome,
  });
}

window.addEventListener('error', (event) => {
  console.error('[Preload] Renderer error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Preload] Unhandled promise rejection:', event.reason);
});

if (IS_DEV) {
  console.log('[Preload] exposeInMainWorld initialized');
}
