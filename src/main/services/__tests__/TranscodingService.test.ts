/**
 * Unit tests for TranscodingService
 */

import { TranscodingService } from '../TranscodingService';
import { existsSync } from 'fs';
import { Server } from 'http';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('ffmpeg-static', () => '/mock/path/to/ffmpeg');

describe('TranscodingService', () => {
  let service: TranscodingService;

  beforeEach(() => {
    service = new TranscodingService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    service.stopAll();
    // Give servers time to fully release ports
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('needsTranscoding', () => {
    it('should return true for AC3 codec', () => {
      expect(service.needsTranscoding('ac3')).toBe(true);
    });

    it('should return true for E-AC3 codec', () => {
      expect(service.needsTranscoding('eac3')).toBe(true);
    });

    it('should return true for DTS codec', () => {
      expect(service.needsTranscoding('dts')).toBe(true);
    });

    it('should return true for TrueHD codec', () => {
      expect(service.needsTranscoding('truehd')).toBe(true);
    });

    it('should return true for FLAC codec', () => {
      expect(service.needsTranscoding('flac')).toBe(true);
    });

    it('should return false for AAC codec', () => {
      expect(service.needsTranscoding('aac')).toBe(false);
    });

    it('should return false for MP3 codec', () => {
      expect(service.needsTranscoding('mp3')).toBe(false);
    });

    it('should return false for Opus codec', () => {
      expect(service.needsTranscoding('opus')).toBe(false);
    });

    it('should return false for null codec', () => {
      expect(service.needsTranscoding(null)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(service.needsTranscoding('AC3')).toBe(true);
      expect(service.needsTranscoding('AAC')).toBe(false);
    });
  });

  describe('startTranscoding', () => {
    it('should throw error for non-existent file', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        service.startTranscoding('/fake/path.mkv', 'ac3')
      ).rejects.toThrow('Video file not found');
    });

    it('should return localhost URL with port', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      // Mock the server creation
      const mockServer = {
        listen: jest.fn((port, callback) => callback()),
        on: jest.fn(),
        close: jest.fn(),
      } as unknown as Server;

      const url = await service.startTranscoding('/valid/path.mkv', 'ac3');

      expect(url).toMatch(/^http:\/\/localhost:\d+\/stream\.mp4$/);
    });

    it('should reuse existing session for same file', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const url1 = await service.startTranscoding('/valid/path.mkv', 'ac3');
      const url2 = await service.startTranscoding('/valid/path.mkv', 'ac3');

      expect(url1).toBe(url2);
    });
  });

  describe('stopSession', () => {
    it('should clean up session properly', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      await service.startTranscoding('/valid/path.mkv', 'ac3');
      service.stopSession('/valid/path.mkv');

      expect(service.getActiveSessionsCount()).toBe(0);
    });

    it('should handle stopping non-existent session gracefully', () => {
      expect(() => {
        service.stopSession('/non-existent.mkv');
      }).not.toThrow();
    });
  });

  describe('stopAll', () => {
    it('should stop all active sessions', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      await service.startTranscoding('/path1.mkv', 'ac3');
      await service.startTranscoding('/path2.mkv', 'dts');

      expect(service.getActiveSessionsCount()).toBe(2);

      service.stopAll();

      expect(service.getActiveSessionsCount()).toBe(0);
    });
  });

  describe('getSessionInfo', () => {
    it('should return empty array when no sessions', () => {
      const info = service.getSessionInfo();
      expect(info).toEqual([]);
    });

    it('should return session information', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      await service.startTranscoding('/path1.mkv', 'ac3');

      const info = service.getSessionInfo();

      expect(info).toHaveLength(1);
      expect(info[0]).toHaveProperty('videoPath', '/path1.mkv');
      expect(info[0]).toHaveProperty('port');
      expect(info[0]).toHaveProperty('clients');
    });
  });
});
