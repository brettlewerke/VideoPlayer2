/**
 * Supported media file extensions
 */

export const PLAYABLE_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.m4v',
  '.mov',
  '.avi',
  '.ts',
  '.mts',
  '.m2ts',
  '.wmv',
  '.flv',
  '.webm',
  '.hevc'
].map(ext => ext.toLowerCase()));

export function isPlayableExtension(extension: string): boolean {
  return PLAYABLE_EXTENSIONS.has(extension.toLowerCase());
}

export function isPlayablePath(path: string): boolean {
  const extension = path.substring(path.lastIndexOf('.'));
  return isPlayableExtension(extension);
}