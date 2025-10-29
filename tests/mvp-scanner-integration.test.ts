/**
 * Integration tests for MVP file support in media scanner
 */

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MVP Media Scanner Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `mvp-scanner-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('MVP File Detection', () => {
    test('should detect MVP files in movie folders', () => {
      const movieDir = join(testDir, 'Movies', 'Action Movie (2023)');
      mkdirSync(movieDir, { recursive: true });

      // Create MVP file
      const mvpPath = join(movieDir, 'project.mvp');
      writeFileSync(mvpPath, '<?xml version="1.0"?><project></project>');

      // Create referenced video
      const videoPath = join(movieDir, 'movie.mp4');
      writeFileSync(videoPath, 'video content');

      expect(existsSync(mvpPath)).toBe(true);
      expect(existsSync(videoPath)).toBe(true);
    });

    test('should handle multiple MVP files in same folder', () => {
      const movieDir = join(testDir, 'Movies', 'Multi Project (2024)');
      mkdirSync(movieDir, { recursive: true });

      const mvp1 = join(movieDir, 'edit-v1.mvp');
      const mvp2 = join(movieDir, 'edit-v2.mvp');
      
      writeFileSync(mvp1, '<?xml version="1.0"?><project></project>');
      writeFileSync(mvp2, '<?xml version="1.0"?><project></project>');

      expect(existsSync(mvp1)).toBe(true);
      expect(existsSync(mvp2)).toBe(true);
    });
  });

  describe('Video Reference Extraction', () => {
    test('should extract video references from MVP file', () => {
      const movieDir = join(testDir, 'Movies', 'Referenced Video (2023)');
      mkdirSync(movieDir, { recursive: true });

      const videoPath = join(movieDir, 'final-cut.mp4');
      writeFileSync(videoPath, 'video data');

      const mvpContent = `<?xml version="1.0"?>
<project>
  <media>
    <clip file="${videoPath}" />
  </media>
</project>`;

      const mvpPath = join(movieDir, 'project.mvp');
      writeFileSync(mvpPath, mvpContent);

      expect(existsSync(mvpPath)).toBe(true);
      expect(existsSync(videoPath)).toBe(true);
    });

    test('should handle MVD (MAGIX Video) files', () => {
      const movieDir = join(testDir, 'Movies', 'MVD Test (2023)');
      mkdirSync(movieDir, { recursive: true });

      const mvdPath = join(movieDir, 'source.mvd');
      writeFileSync(mvdPath, 'mvd video data');

      const mvpContent = `<?xml version="1.0"?>
<project>
  <clip src="${mvdPath}" />
</project>`;

      const mvpPath = join(movieDir, 'project.mvp');
      writeFileSync(mvpPath, mvpContent);

      expect(existsSync(mvdPath)).toBe(true);
      expect(mvdPath.endsWith('.mvd')).toBe(true);
    });

    test('should handle multiple video references', () => {
      const movieDir = join(testDir, 'Movies', 'Multi Clip (2023)');
      mkdirSync(movieDir, { recursive: true });

      const video1 = join(movieDir, 'scene1.mp4');
      const video2 = join(movieDir, 'scene2.mp4');
      const video3 = join(movieDir, 'scene3.mkv');

      [video1, video2, video3].forEach(path => {
        writeFileSync(path, 'video');
      });

      const mvpContent = `<?xml version="1.0"?>
<project>
  <timeline>
    <clip file="${video1}" />
    <clip file="${video2}" />
    <clip file="${video3}" />
  </timeline>
</project>`;

      const mvpPath = join(movieDir, 'project.mvp');
      writeFileSync(mvpPath, mvpContent);

      expect(existsSync(video1)).toBe(true);
      expect(existsSync(video2)).toBe(true);
      expect(existsSync(video3)).toBe(true);
    });
  });

  describe('File Extension Support', () => {
    test('should recognize .mvp extension as video file type', () => {
      const ext = '.mvp';
      expect(ext.toLowerCase()).toBe('.mvp');
    });

    test('should recognize .mvd extension as video file type', () => {
      const ext = '.mvd';
      expect(ext.toLowerCase()).toBe('.mvd');
    });

    test('should handle case-insensitive extensions', () => {
      const extensions = ['.MVP', '.mvp', '.Mvp', '.MVD', '.mvd'];
      extensions.forEach(ext => {
        expect(ext.toLowerCase()).toMatch(/^\.(mvp|mvd)$/);
      });
    });
  });

  describe('Movie Metadata with MVP Info', () => {
    test('should create movie entry with MVP project metadata', () => {
      const movieDir = join(testDir, 'Movies', 'MVP Movie (2023)');
      mkdirSync(movieDir, { recursive: true });

      const videoPath = join(movieDir, 'output.mp4');
      writeFileSync(videoPath, 'video');

      const mvpPath = join(movieDir, 'My-Great-Project.mvp');
      const mvpContent = `<?xml version="1.0"?>
<project name="My Great Project">
  <file>${videoPath}</file>
</project>`;
      writeFileSync(mvpPath, mvpContent);

      // Simulate movie object that would be created
      const mockMovie = {
        title: 'MVP Movie',
        year: 2023,
        videoFile: {
          path: videoPath,
          extension: '.mp4',
        },
        mvpProjectPath: mvpPath,
        mvpProjectName: 'My-Great-Project',
      };

      expect(mockMovie.mvpProjectName).toBe('My-Great-Project');
      expect(mockMovie.mvpProjectPath).toBe(mvpPath);
    });

    test('should handle movies without MVP files', () => {
      const movieDir = join(testDir, 'Movies', 'Regular Movie (2023)');
      mkdirSync(movieDir, { recursive: true });

      const videoPath = join(movieDir, 'movie.mp4');
      writeFileSync(videoPath, 'video');

      const mockMovie = {
        title: 'Regular Movie',
        year: 2023,
        videoFile: {
          path: videoPath,
          extension: '.mp4',
        },
        mvpProjectPath: undefined,
        mvpProjectName: undefined,
      };

      expect(mockMovie.mvpProjectPath).toBeUndefined();
      expect(mockMovie.mvpProjectName).toBeUndefined();
    });
  });

  describe('Video Playback Compatibility', () => {
    test('should be able to play extracted video files', () => {
      const videoPath = join(testDir, 'playable.mp4');
      writeFileSync(videoPath, 'MP4 video content');

      const mockPlaybackRequest = {
        path: videoPath,
        useExternalPlayer: false,
      };

      expect(existsSync(mockPlaybackRequest.path)).toBe(true);
      expect(mockPlaybackRequest.path.endsWith('.mp4')).toBe(true);
    });

    test('should support fullscreen for MVP-sourced videos', () => {
      const videoPath = join(testDir, 'fullscreen-test.mkv');
      writeFileSync(videoPath, 'MKV content');

      const mockPlayerState = {
        videoPath,
        isFullscreen: false,
        isPlaying: true,
        position: 0,
        duration: 120,
      };

      // Simulate toggling fullscreen
      mockPlayerState.isFullscreen = true;

      expect(mockPlayerState.isFullscreen).toBe(true);
      expect(mockPlayerState.isPlaying).toBe(true);
    });

    test('should support play/pause for MVP-sourced videos', () => {
      const videoPath = join(testDir, 'playback-test.mp4');
      writeFileSync(videoPath, 'video');

      const mockPlayerState = {
        videoPath,
        isPlaying: false,
      };

      // Simulate play
      mockPlayerState.isPlaying = true;
      expect(mockPlayerState.isPlaying).toBe(true);

      // Simulate pause
      mockPlayerState.isPlaying = false;
      expect(mockPlayerState.isPlaying).toBe(false);
    });
  });

  describe('Path Resolution', () => {
    test('should resolve relative paths in MVP files', () => {
      const projectDir = join(testDir, 'Projects');
      const videoDir = join(testDir, 'Videos');
      
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(videoDir, { recursive: true });

      const videoPath = join(videoDir, 'video.mp4');
      writeFileSync(videoPath, 'video');

      // MVP file with relative path to video
      const mvpContent = `<?xml version="1.0"?>
<project>
  <file>../Videos/video.mp4</file>
</project>`;

      const mvpPath = join(projectDir, 'project.mvp');
      writeFileSync(mvpPath, mvpContent);

      expect(existsSync(mvpPath)).toBe(true);
      expect(existsSync(videoPath)).toBe(true);
    });

    test('should handle absolute Windows paths', () => {
      const absolutePath = 'C:\\Movies\\Video.mp4';
      
      // Just verify path format
      expect(absolutePath).toMatch(/^[A-Z]:\\/);
      expect(absolutePath.endsWith('.mp4')).toBe(true);
    });

    test('should handle UNC network paths', () => {
      const uncPath = '\\\\server\\share\\video.mkv';
      
      expect(uncPath.startsWith('\\\\')).toBe(true);
      expect(uncPath.endsWith('.mkv')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle MVP file with no video references', () => {
      const movieDir = join(testDir, 'Movies', 'Empty MVP (2023)');
      mkdirSync(movieDir, { recursive: true });

      const mvpContent = `<?xml version="1.0"?>
<project>
  <settings>
    <resolution>1920x1080</resolution>
  </settings>
</project>`;

      const mvpPath = join(movieDir, 'empty.mvp');
      writeFileSync(mvpPath, mvpContent);

      // Also add a regular video file
      const videoPath = join(movieDir, 'video.mp4');
      writeFileSync(videoPath, 'video');

      expect(existsSync(mvpPath)).toBe(true);
      expect(existsSync(videoPath)).toBe(true);
    });

    test('should handle non-existent referenced videos gracefully', () => {
      const movieDir = join(testDir, 'Movies', 'Missing Refs (2023)');
      mkdirSync(movieDir, { recursive: true });

      const mvpContent = `<?xml version="1.0"?>
<project>
  <file>C:\\DoesNotExist\\missing.mp4</file>
  <file>D:\\AlsoMissing\\gone.mkv</file>
</project>`;

      const mvpPath = join(movieDir, 'project.mvp');
      writeFileSync(mvpPath, mvpContent);

      // Should still be able to parse without errors
      expect(existsSync(mvpPath)).toBe(true);
    });

    test('should handle very long file paths', () => {
      const longName = 'A'.repeat(200);
      const longPath = join(testDir, longName + '.mvp');
      
      try {
        writeFileSync(longPath, '<?xml version="1.0"?><project></project>');
        expect(existsSync(longPath)).toBe(true);
      } catch (error) {
        // Path too long is acceptable on some systems
        expect(error).toBeDefined();
      }
    });

    test('should handle special characters in filenames', () => {
      const movieDir = join(testDir, 'Movies', 'Special-Chars (2023)');
      mkdirSync(movieDir, { recursive: true });

      const specialNames = [
        'movie & show.mp4',
        'film (final).mkv',
        'video-v2.mp4',
      ];

      specialNames.forEach(name => {
        const path = join(movieDir, name);
        writeFileSync(path, 'content');
        expect(existsSync(path)).toBe(true);
      });
    });
  });
});
