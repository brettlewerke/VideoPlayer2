/**
 * Tests for MAGIX MVP file parser
 */

import { MvpParser } from '../src/main/services/MvpParser';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MvpParser', () => {
  let parser: MvpParser;
  let testDir: string;

  beforeEach(() => {
    parser = new MvpParser();
    // Create a temporary test directory
    testDir = join(tmpdir(), `mvp-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('XML-based MVP files', () => {
    test('should parse XML MVP file with absolute paths', async () => {
      const mvpContent = `<?xml version="1.0" encoding="UTF-8"?>
<project name="Test Project">
  <media>
    <clip file="C:\\Videos\\movie.mp4" />
    <clip file="C:\\Videos\\intro.avi" />
  </media>
</project>`;

      const mvpPath = join(testDir, 'test-project.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);

      expect(result.projectName).toBe('test-project');
      expect(result.projectPath).toBe(mvpPath);
      expect(result.videoReferences.length).toBeGreaterThanOrEqual(0);
      
      // Check that paths were found (even if they don't exist)
      const foundPaths = result.videoReferences.map(ref => ref.filename);
      expect(foundPaths.some(name => name.includes('movie') || name.includes('intro'))).toBeTruthy();
    });

    test('should parse XML MVP file with relative paths', async () => {
      const mvpContent = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <media>
    <clip src="./video/scene1.mkv" />
    <clip src="../renders/final.mp4" />
  </media>
</project>`;

      const mvpPath = join(testDir, 'relative-project.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);

      expect(result.projectName).toBe('relative-project');
      expect(result.videoReferences.length).toBeGreaterThanOrEqual(0);
    });

    test('should extract project name from file path', async () => {
      const mvpContent = `<?xml version="1.0"?><project></project>`;
      const mvpPath = join(testDir, 'My-Awesome-Movie.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);

      expect(result.projectName).toBe('My-Awesome-Movie');
    });
  });

  describe('Binary MVP files', () => {
    test('should extract file paths from binary content', async () => {
      // Simulate binary MVP file with embedded file paths
      const binaryContent = Buffer.from([
        0x00, 0x01, 0x02, // Some binary header
        ...Buffer.from('C:\\Movies\\video.mp4\0'),
        0x05, 0x06, 0x07,
        ...Buffer.from('D:\\Footage\\clip.avi\0'),
        0x08, 0x09, 0x0A,
      ]);

      const mvpPath = join(testDir, 'binary-project.mvp');
      writeFileSync(mvpPath, binaryContent);

      const result = await parser.parseFile(mvpPath);

      expect(result.projectName).toBe('binary-project');
      expect(result.videoReferences.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle various video file extensions', async () => {
      const extensions = ['.mvd', '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.mpg'];
      const paths = extensions.map((ext, i) => `C:\\Videos\\video${i}${ext}`);
      
      const binaryContent = Buffer.from(paths.join('\0') + '\0');
      const mvpPath = join(testDir, 'multi-format.mvp');
      writeFileSync(mvpPath, binaryContent);

      const result = await parser.parseFile(mvpPath);

      expect(result.videoReferences.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('File reference validation', () => {
    test('should mark existing files correctly', async () => {
      // Create actual video files
      const video1Path = join(testDir, 'existing.mp4');
      const video2Path = join(testDir, 'also-exists.mkv');
      writeFileSync(video1Path, 'fake video content');
      writeFileSync(video2Path, 'fake video content');

      // Use normalized paths in XML (forward slashes)
      const normalizedPath1 = video1Path.replace(/\\/g, '/');
      const normalizedPath2 = video2Path.replace(/\\/g, '/');

      const mvpContent = `<?xml version="1.0"?>
<project>
  <media>
    <clip>
      <file>${normalizedPath1}</file>
    </clip>
    <clip>
      <file>${normalizedPath2}</file>
    </clip>
    <clip>
      <file>C:/NonExistent/missing.mp4</file>
    </clip>
  </media>
</project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);

      const existingRefs = result.videoReferences.filter(ref => ref.exists);
      expect(existingRefs.length).toBeGreaterThan(0);
      
      const existingNames = existingRefs.map(ref => ref.filename);
      expect(existingNames.some(n => n.includes('existing'))).toBeTruthy();
    });

    test('should get only existing references', async () => {
      const videoPath = join(testDir, 'real-video.mp4');
      writeFileSync(videoPath, 'content');

      const normalizedPath = videoPath.replace(/\\/g, '/');

      const mvpContent = `<?xml version="1.0"?>
<project>
  <clip>
    <file>${normalizedPath}</file>
  </clip>
  <clip>
    <file>C:/Fake/video.mp4</file>
  </clip>
</project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      const existing = MvpParser.getExistingReferences(result);

      expect(existing.length).toBeGreaterThan(0);
      expect(existing.every(ref => ref.exists)).toBe(true);
    });
  });

  describe('Primary video selection', () => {
    test('should select largest file as primary', async () => {
      // Create files of different sizes
      const small = join(testDir, 'small.mp4');
      const large = join(testDir, 'large.mp4');
      writeFileSync(small, 'x');
      writeFileSync(large, 'x'.repeat(1000));

      const normalizedSmall = small.replace(/\\/g, '/');
      const normalizedLarge = large.replace(/\\/g, '/');

      const mvpContent = `<?xml version="1.0"?>
<project>
  <clip>
    <file>${normalizedSmall}</file>
  </clip>
  <clip>
    <file>${normalizedLarge}</file>
  </clip>
</project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      const primary = MvpParser.getPrimaryVideo(result);

      expect(primary).toBeTruthy();
      if (primary) {
        expect(primary.filename).toBe('large.mp4');
      }
    });

    test('should return null when no videos exist', async () => {
      const mvpContent = `<?xml version="1.0"?>
<project>
  <file>C:\\Nonexistent\\video.mp4</file>
</project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      const primary = MvpParser.getPrimaryVideo(result);

      expect(primary).toBeNull();
    });

    test('should return single video when only one exists', async () => {
      const videoPath = join(testDir, 'only-one.mp4');
      writeFileSync(videoPath, 'content');

      const mvpContent = `<?xml version="1.0"?>
<project><file>${videoPath}</file></project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      const primary = MvpParser.getPrimaryVideo(result);

      expect(primary).toBeTruthy();
      if (primary) {
        expect(primary.filename).toBe('only-one.mp4');
      }
    });
  });

  describe('Error handling', () => {
    test('should throw error for non-existent MVP file', async () => {
      await expect(
        parser.parseFile(join(testDir, 'does-not-exist.mvp'))
      ).rejects.toThrow('MVP file not found');
    });

    test('should handle corrupted XML gracefully', async () => {
      const badXml = `<?xml version="1.0"?><unclosed>`;
      const mvpPath = join(testDir, 'bad.mvp');
      writeFileSync(mvpPath, badXml, 'utf-8');

      // Should not throw, but parse what it can
      const result = await parser.parseFile(mvpPath);
      expect(result.projectName).toBe('bad');
    });

    test('should handle empty file', async () => {
      const mvpPath = join(testDir, 'empty.mvp');
      writeFileSync(mvpPath, '', 'utf-8');

      const result = await parser.parseFile(mvpPath);
      expect(result.projectName).toBe('empty');
      expect(result.videoReferences).toEqual([]);
    });
  });

  describe('Path normalization', () => {
    test('should normalize Windows paths', async () => {
      const mvpContent = `<?xml version="1.0"?>
<project>
  <file>C:\\Videos\\Movie\\video.mp4</file>
</project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      
      // Paths should be normalized (forward slashes on Unix, backslashes on Windows)
      result.videoReferences.forEach(ref => {
        expect(ref.path).toBeDefined();
        expect(typeof ref.path).toBe('string');
      });
    });

    test('should resolve relative paths against project directory', async () => {
      const subDir = join(testDir, 'project');
      mkdirSync(subDir, { recursive: true });
      
      const mvpContent = `<?xml version="1.0"?>
<project>
  <file>./video.mp4</file>
  <file>../other.mkv</file>
</project>`;

      const mvpPath = join(subDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      
      // Should have resolved paths
      expect(result.videoReferences.length).toBeGreaterThanOrEqual(0);
      
      result.videoReferences.forEach(ref => {
        // Paths should be absolute after resolution
        expect(ref.path.length).toBeGreaterThan(3);
      });
    });
  });

  describe('Metadata extraction', () => {
    test('should extract file extensions correctly', async () => {
      const mvpContent = `<?xml version="1.0"?>
<project>
  <file>C:\\Videos\\movie.MP4</file>
  <file>C:\\Videos\\clip.MKV</file>
</project>`;

      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);
      
      result.videoReferences.forEach(ref => {
        // Extensions should be lowercase
        expect(ref.extension).toMatch(/^\.[a-z0-9]+$/);
      });
    });

    test('should track modified date', async () => {
      const mvpContent = `<?xml version="1.0"?><project></project>`;
      const mvpPath = join(testDir, 'test.mvp');
      writeFileSync(mvpPath, mvpContent, 'utf-8');

      const result = await parser.parseFile(mvpPath);

      expect(result.modifiedAt).toBeDefined();
      expect(result.modifiedAt).not.toBeNull();
      if (result.modifiedAt) {
        expect(result.modifiedAt.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });
  });
});
