/**
 * Utility functions for file path parsing, media detection, and string manipulation
 */

import { 
  VIDEO_EXTENSIONS, 
  SUBTITLE_EXTENSIONS, 
  IMAGE_EXTENSIONS,
  EPISODE_PATTERNS,
  FOLDER_NAMES,
  ARTWORK_FILENAMES,
  IGNORE_PATTERNS 
} from './constants.js';
import { isPlayablePath } from '../common/media/extensions.js';

/**
 * Cross-platform path utilities (no Node.js dependencies)
 */
function getExtname(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot);
}

function getBasename(filename: string, ext?: string): string {
  const base = filename.replace(/[/\\]*$/, '').split(/[/\\]/).pop() || '';
  if (ext && base.endsWith(ext)) {
    return base.slice(0, -ext.length);
  }
  return base;
}

function getDirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '.' : normalized.slice(0, lastSlash) || '/';
}

function normalizePathString(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if a file has a video extension (uses centralized playable extensions)
 */
export function isVideoFile(filename: string): boolean {
  return isPlayablePath(filename);
}

/**
 * Check if a file has a subtitle extension
 */
export function isSubtitleFile(filename: string): boolean {
  const ext = getExtname(filename).toLowerCase();
  return SUBTITLE_EXTENSIONS.includes(ext as any);
}

/**
 * Check if a file has an image extension
 */
export function isImageFile(filename: string): boolean {
  const ext = getExtname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext as any);
}

/**
 * Check if a file or folder should be ignored during scanning
 */
export function shouldIgnore(name: string, includesSamples = false, includesTrailers = false): boolean {
  const lowerName = name.toLowerCase();
  
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(lowerName)) {
      // Allow samples/trailers if explicitly enabled
      if (!includesSamples && (lowerName.includes('sample') || lowerName.includes('samples'))) {
        return true;
      }
      if (!includesTrailers && (lowerName.includes('trailer') || lowerName.includes('trailers'))) {
        return true;
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Parse movie title and year from folder name
 */
export function parseMovieTitle(folderName: string): { title: string; year?: number } {
  const yearMatch = folderName.match(/\((\d{4})\)$/);
  
  if (yearMatch) {
    const title = folderName.replace(/\s*\(\d{4}\)$/, '').trim();
    const year = parseInt(yearMatch[1], 10);
    return { title, year };
  }
  
  return { title: folderName.trim() };
}

/**
 * Parse episode information from filename
 */
export interface EpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  additionalEpisodes?: number[];
  title?: string;
}

export function parseEpisodeInfo(filename: string, defaultSeason = 1): EpisodeInfo | null {
  const baseName = getBasename(filename, getExtname(filename));
  
  for (const pattern of EPISODE_PATTERNS) {
    const match = baseName.match(pattern);
    
    if (match) {
      if (pattern === EPISODE_PATTERNS[0] || pattern === EPISODE_PATTERNS[1]) {
        // S01E01 or 1x01 format
        const seasonNumber = parseInt(match[1], 10);
        const episodeNumber = parseInt(match[2], 10);
        return { seasonNumber, episodeNumber };
      } else if (pattern === EPISODE_PATTERNS[2]) {
        // 101 format (season + episode)
        const seasonNumber = parseInt(match[1], 10);
        const episodeNumber = parseInt(match[2], 10);
        return { seasonNumber, episodeNumber };
      } else if (pattern === EPISODE_PATTERNS[3]) {
        // Episode 1 format
        const episodeNumber = parseInt(match[1], 10);
        return { seasonNumber: defaultSeason, episodeNumber };
      } else if (pattern === EPISODE_PATTERNS[4]) {
        // Multi-episode format S01E01E02
        const seasonNumber = parseInt(match[1], 10);
        const episodeNumber = parseInt(match[2], 10);
        const additionalEpisodes = match[3] ? [parseInt(match[3], 10)] : undefined;
        return { seasonNumber, episodeNumber, additionalEpisodes };
      }
    }
  }
  
  return null;
}

/**
 * Parse season number from folder name
 */
export function parseSeasonNumber(folderName: string): number | null {
  const match = folderName.match(FOLDER_NAMES.SEASON);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // Check for "Specials" folder (season 0)
  if (FOLDER_NAMES.SPECIALS.some(name => 
    folderName.toLowerCase() === name.toLowerCase()
  )) {
    return 0;
  }
  
  return null;
}

/**
 * Check if folder name indicates it contains movies
 */
export function isMoviesFolder(folderName: string): boolean {
  const lowerName = folderName.toLowerCase();
  return FOLDER_NAMES.MOVIES.some(name => lowerName === name);
}

/**
 * Check if folder name indicates it contains TV shows
 */
export function isTVShowsFolder(folderName: string): boolean {
  const lowerName = folderName.toLowerCase();
  return FOLDER_NAMES.TV_SHOWS.some(name => lowerName === name);
}

/**
 * Normalize path for cross-platform compatibility
 */
export function normalizePath(filePath: string): string {
  return normalizePathString(filePath);
}

/**
 * Generate a stable ID for media items based on path, size, and timestamp
 */
export function generateMediaId(
  volumeId: string,
  filePath: string,
  size: number,
  lastModified: number
): string {
  const normalizedPath = normalizePath(filePath);
  const components = [volumeId, normalizedPath, size.toString(), lastModified.toString()];
  return hashString(components.join('|'));
}

/**
 * Simple hash function for generating IDs
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Find the primary video file in a directory (for movies)
 * Returns the first video file found (simple heuristic)
 */
export function findPrimaryVideoFile(files: string[]): string | null {
  const videoFiles = files.filter(isVideoFile);
  
  if (videoFiles.length === 0) {
    return null;
  }
  
  // Simple heuristic: prefer files that don't contain "sample" or "trailer"
  const mainFiles = videoFiles.filter(file => {
    const lowerFile = file.toLowerCase();
    return !lowerFile.includes('sample') && !lowerFile.includes('trailer');
  });
  
  return mainFiles.length > 0 ? mainFiles[0] : videoFiles[0];
}

/**
 * Find subtitle files for a video file
 */
export function findSubtitleFiles(videoPath: string, allFiles: string[]): string[] {
  const videoBaseName = getBasename(videoPath, getExtname(videoPath));
  const videoDir = getDirname(videoPath);
  
  return allFiles.filter(file => {
    if (!isSubtitleFile(file)) {
      return false;
    }
    
    const fileDir = getDirname(file);
    if (fileDir !== videoDir) {
      return false;
    }
    
    const fileBaseName = getBasename(file, getExtname(file));
    return fileBaseName.startsWith(videoBaseName);
  });
}

/**
 * Find artwork files in a directory
 */
export function findArtworkFiles(directory: string, allFiles: string[]): {
  poster?: string;
  backdrop?: string;
} {
  const result: { poster?: string; backdrop?: string } = {};
  
  const filesInDir = allFiles.filter(file => 
    getDirname(file) === directory && isImageFile(file)
  );
  
  // Look for poster
  for (const posterName of ARTWORK_FILENAMES.POSTER) {
    const found = filesInDir.find(file => 
      getBasename(file).toLowerCase() === posterName.toLowerCase()
    );
    if (found) {
      result.poster = found;
      break;
    }
  }
  
  // Look for backdrop
  for (const backdropName of ARTWORK_FILENAMES.BACKDROP) {
    const found = filesInDir.find(file => 
      getBasename(file).toLowerCase() === backdropName.toLowerCase()
    );
    if (found) {
      result.backdrop = found;
      break;
    }
  }
  
  return result;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Format file size in bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Debounce function for limiting rapid function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Generate content key for progress tracking
 * Format: volumeKey|canonicalAbsPath|size|mtime
 */
export function generateContentKey(volumeKey: string, absPath: string, size: number, mtime: number): string {
  // Normalize path to use forward slashes and remove drive letter prefix on Windows
  const normalizedPath = absPath.replace(/\\/g, '/').replace(/^([A-Z]:\/)/i, '/');
  return `${volumeKey}|${normalizedPath}|${size}|${mtime}`;
}