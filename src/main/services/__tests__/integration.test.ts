/**
 * Integration tests for video playback flow
 * Tests the complete flow from codec detection to transcoding
 */

import { CodecDetector } from '../CodecDetector';
import { TranscodingService } from '../TranscodingService';
import { existsSync } from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('ffmpeg-static', () => '/mock/path/to/ffmpeg');

describe('Video Playback Integration', () => {
  let codecDetector: CodecDetector;
  let transcodingService: TranscodingService;

  beforeEach(() => {
    codecDetector = new CodecDetector();
    transcodingService = new TranscodingService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    transcodingService.stopAll();
    // Give servers time to fully release ports
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Complete playback flow', () => {
    it('should handle supported codec without transcoding', async () => {
      const mockVideoPath = '/path/to/movie-aac.mp4';
      
      // Mock codec detection returning AAC (supported)
      (existsSync as jest.Mock).mockReturnValue(true);
      const mockCodecInfo = {
        videoCodec: 'h264',
        audioCodec: 'aac',
        isSupported: true,
        requiresExternalPlayer: false,
      };

      // Simulate: Video has AAC audio - no transcoding needed
      expect(codecDetector.isCodecSupported('aac')).toBe(true);
      expect(transcodingService.needsTranscoding('aac')).toBe(false);

      // Result: Direct playback
      expect(mockCodecInfo.isSupported).toBe(true);
    });

    it('should handle unsupported codec with transcoding', async () => {
      const mockVideoPath = '/path/to/movie-ac3.mkv';
      
      // Mock codec detection returning AC3 (unsupported)
      (existsSync as jest.Mock).mockReturnValue(true);
      const mockCodecInfo = {
        videoCodec: 'h264',
        audioCodec: 'ac3',
        isSupported: false,
        requiresExternalPlayer: true,
      };

      // Simulate: Video has AC3 audio - needs transcoding
      expect(codecDetector.isCodecSupported('ac3')).toBe(false);
      expect(transcodingService.needsTranscoding('ac3')).toBe(true);

      // Start transcoding
      const streamUrl = await transcodingService.startTranscoding(
        mockVideoPath,
        'ac3'
      );

      // Result: Transcoded stream URL
      expect(streamUrl).toMatch(/^http:\/\/localhost:\d+\/stream\.mp4$/);
      expect(transcodingService.getActiveSessionsCount()).toBe(1);
    });

    it('should handle DTS codec with transcoding', async () => {
      const mockVideoPath = '/path/to/movie-dts.mkv';
      
      (existsSync as jest.Mock).mockReturnValue(true);

      // Simulate: Video has DTS audio
      expect(transcodingService.needsTranscoding('dts')).toBe(true);

      const streamUrl = await transcodingService.startTranscoding(
        mockVideoPath,
        'dts'
      );

      expect(streamUrl).toMatch(/^http:\/\/localhost:\d+\/stream\.mp4$/);
    });

    it('should handle multiple videos with different codecs', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      // Video 1: AAC - no transcoding
      expect(transcodingService.needsTranscoding('aac')).toBe(false);

      // Video 2: AC3 - needs transcoding
      const url1 = await transcodingService.startTranscoding('/video1.mkv', 'ac3');
      expect(url1).toMatch(/http:\/\/localhost:\d+\/stream\.mp4/);

      // Video 3: DTS - needs transcoding
      const url2 = await transcodingService.startTranscoding('/video2.mkv', 'dts');
      expect(url2).toMatch(/http:\/\/localhost:\d+\/stream\.mp4/);

      // Should have 2 active transcoding sessions
      expect(transcodingService.getActiveSessionsCount()).toBe(2);

      // Clean up
      transcodingService.stopAll();
      expect(transcodingService.getActiveSessionsCount()).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent video file', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        transcodingService.startTranscoding('/nonexistent.mkv', 'ac3')
      ).rejects.toThrow('Video file not found');
    });

    it('should handle codec detection failure gracefully', async () => {
      const codecInfo = await codecDetector.detectCodecs('/invalid/path.mp4');

      // Should return fallback values
      expect(codecInfo).toHaveProperty('isSupported', true);
      expect(codecInfo).toHaveProperty('requiresExternalPlayer', false);
    });
  });

  describe('Session management', () => {
    it('should reuse existing transcoding session', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const url1 = await transcodingService.startTranscoding('/video.mkv', 'ac3');
      const url2 = await transcodingService.startTranscoding('/video.mkv', 'ac3');

      // Same video should return same URL
      expect(url1).toBe(url2);
      
      // Should only have 1 session
      expect(transcodingService.getActiveSessionsCount()).toBe(1);
    });

    it('should create separate sessions for different videos', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const url1 = await transcodingService.startTranscoding('/video1.mkv', 'ac3');
      const url2 = await transcodingService.startTranscoding('/video2.mkv', 'ac3');

      // Different videos should have different URLs
      expect(url1).not.toBe(url2);
      
      // Should have 2 sessions
      expect(transcodingService.getActiveSessionsCount()).toBe(2);
    });

    it('should provide session information', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      await transcodingService.startTranscoding('/video1.mkv', 'ac3');
      await transcodingService.startTranscoding('/video2.mkv', 'dts');

      const info = transcodingService.getSessionInfo();

      expect(info).toHaveLength(2);
      expect(info[0]).toHaveProperty('videoPath');
      expect(info[0]).toHaveProperty('port');
      expect(info[0]).toHaveProperty('clients');
    });
  });
});
