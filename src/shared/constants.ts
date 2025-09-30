/**
 * Application constants and configuration
 */

// Supported video file extensions (case-insensitive)
export const VIDEO_EXTENSIONS = [
  '.mkv',
  '.mp4',
  '.m4v',
  '.mov',
  '.avi',
  '.ts',
  '.mts',
  '.m2ts',
  '.wmv',
  '.flv',
  '.webm',
  '.hevc',
] as const;

// Supported subtitle file extensions (case-insensitive)
export const SUBTITLE_EXTENSIONS = [
  '.srt',
  '.ass',
  '.ssa',
  '.vtt',
] as const;

// Supported image file extensions for artwork (case-insensitive)
export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

// Artwork file names to look for (case-insensitive)
export const ARTWORK_FILENAMES = {
  POSTER: ['poster.jpg', 'poster.png', 'cover.jpg', 'cover.png', 'folder.jpg'],
  BACKDROP: ['backdrop.jpg', 'backdrop.png', 'fanart.jpg', 'fanart.png'],
  SEASON: (season: number) => [`season${season.toString().padStart(2, '0')}.jpg`, `season${season}.jpg`],
} as const;

// Folder names to look for (case-insensitive matching)
export const FOLDER_NAMES = {
  MOVIES: ['movies', 'films'],
  TV_SHOWS: ['tv shows', 'tv', 'series', 'shows'],
  SEASON: /^season\s*(\d+)$/i,
  SPECIALS: ['specials', 'extras'],
} as const;

// Episode filename patterns
export const EPISODE_PATTERNS = [
  // S01E01, S1E1 format
  /s(\d{1,2})e(\d{1,3})/i,
  // 1x01 format
  /(\d{1,2})x(\d{1,3})/i,
  // 101, 1001 format (season + episode)
  /^(\d{1,2})(\d{2})(?:\D|$)/,
  // Episode 1, Ep 01 format
  /(?:episode|ep)\.?\s*(\d{1,3})/i,
  // Multi-episode: S01E01E02
  /s(\d{1,2})e(\d{1,3})(?:e(\d{1,3}))+/i,
] as const;

// Files and folders to ignore during scanning
export const IGNORE_PATTERNS = [
  // Hidden files and folders
  /^\./,
  // Temporary files
  /~$/,
  /\.tmp$/i,
  // System folders
  /^system volume information$/i,
  /^\$recycle\.bin$/i,
  /^recycler$/i,
  // Common junk files/folders
  /^sample$/i,
  /^samples$/i,
  /^trailer$/i,
  /^trailers$/i,
  /^extras$/i,
  /^bonus$/i,
  /^deleted scenes$/i,
  /^behind the scenes$/i,
  // Video format folders
  /^bdmv$/i,
  /^video_ts$/i,
  /^audio_ts$/i,
] as const;

// Database configuration
export const DATABASE = {
  FILENAME: 'videoplayer.db',
  VERSION: 1,
  WAL_MODE: true,
  BUSY_TIMEOUT: 30000,
  CACHE_SIZE: 10000,
} as const;

// Player configuration
export const PLAYER_CONFIG = {
  DEFAULT_BACKEND: 'libvlc' as const,
  SEEK_INTERVAL: 10, // seconds
  VOLUME_STEP: 0.05, // 5%
  COMPLETION_THRESHOLD: 0.9, // 90%
  PROGRESS_SAVE_INTERVAL: 5000, // milliseconds
  THUMBNAIL_SIZE: { width: 320, height: 180 },
  POSTER_SIZES: {
    SMALL: { width: 150, height: 225 },
    MEDIUM: { width: 200, height: 300 },
    LARGE: { width: 300, height: 450 },
  },
} as const;

// Application paths
export const APP_PATHS = {
  USER_DATA: 'userData',
  CACHE: 'cache',
  THUMBNAILS: 'thumbnails',
  LOGS: 'logs',
  TEMP: 'temp',
  VENDOR: 'vendor',
} as const;

// Default application settings
export const DEFAULT_SETTINGS = {
  // Player backend: libVLC provides video playback without FFmpeg dependency
  playerBackend: 'libvlc' as const,
  autoPlay: true,
  autoPlayNext: true,
  seekInterval: 10,
  volumeStep: 5,
  completionThreshold: 90,
  enableThumbnails: true,
  enableSubtitles: true,
  defaultAudioLanguage: undefined,
  defaultSubtitleLanguage: undefined,
  scanIntervalMinutes: 60,
  includeSamples: false,
  includeTrailers: false,
  logLevel: 'info' as const,
} as const;

// UI configuration
export const UI_CONFIG = {
  CAROUSEL_ITEM_WIDTH: 200,
  CAROUSEL_ITEM_HEIGHT: 300,
  BACKDROP_ASPECT_RATIO: 16 / 9,
  POSTER_ASPECT_RATIO: 2 / 3,
  FADE_DURATION: 300,
  CAROUSEL_SCROLL_ITEMS: 5,
  SEARCH_DEBOUNCE: 300,
  THUMBNAIL_QUALITY: 0.8,
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: 'Space',
  SEEK_FORWARD: 'ArrowRight',
  SEEK_BACKWARD: 'ArrowLeft',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  NEXT_EPISODE: 'KeyN',
  PREVIOUS_EPISODE: 'KeyP',
  TOGGLE_FULLSCREEN: 'KeyF',
  EXIT_PLAYER: 'Escape',
  TOGGLE_SUBTITLES: 'KeyS',
  TOGGLE_MUTE: 'KeyM',
} as const;

// Logging configuration
export const LOG_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  DATE_PATTERN: 'YYYY-MM-DD',
  LEVELS: ['error', 'warn', 'info', 'debug'] as const,
} as const;