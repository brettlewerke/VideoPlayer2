/**
 * IPC channel constants and validation schemas
 */

// IPC Channel names
export const IPC_CHANNELS = {
  // Media player controls
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
  
  // Player events
  PLAYER_STATUS_CHANGED: 'player:statusChanged',
  PLAYER_TRACKS_CHANGED: 'player:tracksChanged',
  PLAYER_ENDED: 'player:ended',
  PLAYER_ERROR: 'player:error',
  
  // Library management
  LIBRARY_GET_MOVIES: 'library:getMovies',
  LIBRARY_GET_SHOWS: 'library:getShows',
  LIBRARY_GET_SEASONS: 'library:getSeasons',
  LIBRARY_GET_EPISODES: 'library:getEpisodes',
  LIBRARY_GET_CONTINUE_WATCHING: 'library:getContinueWatching',
  LIBRARY_GET_RECENTLY_ADDED: 'library:getRecentlyAdded',
  LIBRARY_SEARCH: 'library:search',
  LIBRARY_GET_PROGRESS: 'library:getProgress',
  LIBRARY_SET_PROGRESS: 'library:setProgress',
  
  // Drive and scanning
  DRIVES_GET_ALL: 'drives:getAll',
  DRIVES_SCAN: 'drives:scan',
  DRIVES_SCAN_PROGRESS: 'drives:scanProgress',
  
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',
  
  // File system
  FS_GET_THUMBNAIL: 'fs:getThumbnail',
  FS_GET_ARTWORK: 'fs:getArtwork',
  
  // Application
  APP_GET_VERSION: 'app:getVersion',
  APP_QUIT: 'app:quit',
  APP_MINIMIZE: 'app:minimize',
  APP_TOGGLE_FULLSCREEN: 'app:toggleFullscreen',
} as const;

// IPC validation helpers
export function isValidIpcChannel(channel: string): channel is keyof typeof IPC_CHANNELS {
  return Object.values(IPC_CHANNELS).includes(channel as any);
}

export function validatePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) {
    return false;
  }
  
  // Basic path validation - more thorough validation in main process
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters (Windows)
    /^\/dev\//,  // Unix device files
    /^\\\\?\\/,  // UNC paths on Windows
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(path));
}

export function validateVolume(volume: number): boolean {
  return typeof volume === 'number' && volume >= 0 && volume <= 1;
}

export function validatePosition(position: number): boolean {
  return typeof position === 'number' && position >= 0;
}

export function validateTrackId(trackId: number): boolean {
  return typeof trackId === 'number' && trackId >= -1;
}

export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters and limit length
  return query
    .replace(/[<>:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

// IPC payload validation schemas
export interface IpcRequest<T = unknown> {
  id: string;
  channel: string;
  data?: T;
}

export interface IpcResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

export function createIpcRequest<T>(channel: string, data?: T): IpcRequest<T> {
  return {
    id: generateRequestId(),
    channel,
    data,
  };
}

export function createIpcResponse<T>(
  requestId: string,
  data?: T,
  error?: string
): IpcResponse<T> {
  return {
    id: requestId,
    success: !error,
    data,
    error,
  };
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error codes
export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_PATH: 'INVALID_PATH',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PLAYER_ERROR: 'PLAYER_ERROR',
  PLAYER_NOT_AVAILABLE: 'PLAYER_NOT_AVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];