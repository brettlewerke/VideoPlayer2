/**
 * IPC channel constants - shared between main and preload
 * This file is bundled into both main and preload outputs
 */

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
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
