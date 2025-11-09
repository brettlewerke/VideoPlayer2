/**
 * Simple unit test example for media extensions
 */

import { isPlayableExtension, isPlayablePath } from '../extensions';

describe('Media Extensions', () => {
  describe('isPlayableExtension', () => {
    it('should return true for MP4', () => {
      expect(isPlayableExtension('.mp4')).toBe(true);
    });

    it('should return true for MKV', () => {
      expect(isPlayableExtension('.mkv')).toBe(true);
    });

    it('should return true for AVI', () => {
      expect(isPlayableExtension('.avi')).toBe(true);
    });

    it('should return false for TXT', () => {
      expect(isPlayableExtension('.txt')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isPlayableExtension('.MP4')).toBe(true);
      expect(isPlayableExtension('.MKV')).toBe(true);
    });

    it('should handle extensions without dot', () => {
      expect(isPlayableExtension('mp4')).toBe(false); // Expects dot
    });
  });

  describe('isPlayablePath', () => {
    it('should return true for valid video path', () => {
      expect(isPlayablePath('/path/to/video.mp4')).toBe(true);
    });

    it('should return true for MKV path', () => {
      expect(isPlayablePath('C:\\Movies\\movie.mkv')).toBe(true);
    });

    it('should return false for text file', () => {
      expect(isPlayablePath('/path/to/file.txt')).toBe(false);
    });

    it('should handle paths with spaces', () => {
      expect(isPlayablePath('/path/to/my movie.mp4')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isPlayablePath('/PATH/TO/VIDEO.MP4')).toBe(true);
    });

    it('should handle Windows paths', () => {
      expect(isPlayablePath('C:\\Users\\User\\Videos\\movie.mp4')).toBe(true);
    });

    it('should handle UNC paths', () => {
      expect(isPlayablePath('\\\\server\\share\\video.mkv')).toBe(true);
    });

    it('should return false for path without extension', () => {
      expect(isPlayablePath('/path/to/file')).toBe(false);
    });
  });
});
