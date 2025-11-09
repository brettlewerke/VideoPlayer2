/**
 * Unit tests for PlayerFactory
 */

import { PlayerFactory, MpvPlayerFactory, MockPlayerFactory } from '../player-factory';
import { existsSync } from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => '/mock/app/path'),
  },
}));

describe('PlayerFactory', () => {
  let factory: PlayerFactory;

  beforeEach(() => {
    factory = new PlayerFactory();
    jest.clearAllMocks();
  });

  describe('MpvPlayerFactory', () => {
    it('should detect available MPV binary', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      
      const mpvFactory = new MpvPlayerFactory({
        name: 'mpv',
        executablePath: '/usr/bin/mpv',
      });

      expect(mpvFactory.isAvailable()).toBe(true);
    });

    it('should return false when MPV binary not found', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      
      const mpvFactory = new MpvPlayerFactory({
        name: 'mpv',
        executablePath: '/nonexistent/mpv',
      });

      expect(mpvFactory.isAvailable()).toBe(false);
    });

    it('should create MPV player instance', () => {
      const mpvFactory = new MpvPlayerFactory({
        name: 'mpv',
        executablePath: '/usr/bin/mpv',
      });

      const player = mpvFactory.createPlayer();
      expect(player).toBeDefined();
      expect(player.isAvailable).toBeDefined();
    });
  });

  describe('MockPlayerFactory', () => {
    it('should always be available', () => {
      const mockFactory = new MockPlayerFactory({
        name: 'mock',
      });

      expect(mockFactory.isAvailable()).toBe(true);
    });

    it('should create mock player instance', () => {
      const mockFactory = new MockPlayerFactory({
        name: 'mock',
      });

      const player = mockFactory.createPlayer();
      expect(player).toBeDefined();
      expect(player.isAvailable()).toBe(true);
    });
  });

  describe('PlayerFactory', () => {
    it('should throw error when no player backend available', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      expect(() => {
        factory.createPlayer();
      }).toThrow('No external video player available');
    });

    it('should create player when MPV is available', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const player = factory.createPlayer();
      expect(player).toBeDefined();
    });

    it('should return available backends', () => {
      const backends = factory.getAvailableBackends();
      
      expect(backends).toBeInstanceOf(Array);
      expect(backends.length).toBeGreaterThan(0);
      expect(backends[0]).toHaveProperty('name');
      expect(backends[0]).toHaveProperty('isAvailable');
    });

    it('should check if specific backend is available', () => {
      const isMockAvailable = factory.isBackendAvailable('mock');
      expect(isMockAvailable).toBe(true);
    });

    it('should get current backend name', () => {
      const backend = factory.getCurrentBackend();
      expect(backend).toBe('mpv');
    });

    it('should set backend', () => {
      factory.setBackend('mock');
      expect(factory.getCurrentBackend()).toBe('mock');
    });

    it('should throw error when setting unknown backend', () => {
      expect(() => {
        factory.setBackend('unknown-backend');
      }).toThrow('Unknown player backend');
    });
  });
});
