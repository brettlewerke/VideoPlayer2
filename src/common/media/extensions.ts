/**
 * Centralized media file extensions for consistent validation across the app
 * All extensions are lowercase and include the leading dot
 */

/**
 * Supported video and audio file extensions (case-insensitive)
 * Comprehensive list supporting mpv and libVLC playback backends
 */
export const PLAYABLE_EXTENSIONS = new Set([
  // Common video formats
  '.mp4',
  '.mkv',
  '.m4v',
  '.mov',
  '.avi',
  '.wmv',
  '.flv',
  '.webm',
  
  // MPEG formats
  '.mpg',
  '.mpeg',
  '.mpe',
  '.m2v',
  '.m4p',
  '.m4b',
  
  // MAGIX formats
  '.mvd',  // MAGIX Video file (playable)
  '.mvp',  // MAGIX Video Project (will extract references)
  
  // Transport streams
  '.ts',
  '.mts',
  '.m2ts',
  '.mxf',
  
  // Modern codecs & formats
  '.hevc',
  '.h264',
  '.h265',
  
  // Other video formats
  '.3gp',
  '.3g2',
  '.asf',
  '.divx',
  '.f4v',
  '.ogv',
  '.ogm',
  '.vob',
  '.rm',
  '.rmvb',
  
  // Audio formats (for music library support)
  '.mp3',
  '.m4a',
  '.aac',
  '.flac',
  '.wav',
  '.wma',
  '.ogg',
  '.opus',
  '.ape',
  '.alac',
  '.ac3',
  '.dts',
].map(ext => ext.toLowerCase()));

/**
 * Check if a file extension is playable (case-insensitive)
 */
export function isPlayableExtension(extension: string): boolean {
  return PLAYABLE_EXTENSIONS.has(extension.toLowerCase());
}

/**
 * Check if a file path has a playable extension (case-insensitive)
 */
export function isPlayablePath(path: string): boolean {
  if (!path) return false;
  
  const lastDotIndex = path.lastIndexOf('.');
  if (lastDotIndex === -1) return false;
  
  const extension = path.substring(lastDotIndex);
  return isPlayableExtension(extension);
}

/**
 * Get the file extension from a path (lowercase, with leading dot)
 */
export function getExtension(filePath: string): string | null {
  if (!filePath) return null;
  
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  
  return filePath.substring(lastDotIndex).toLowerCase();
}

/**
 * Export as array for backwards compatibility with shared/constants.ts
 */
export const VIDEO_EXTENSIONS = Array.from(PLAYABLE_EXTENSIONS);