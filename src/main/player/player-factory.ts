/**
 * Player factory for creating backend instances
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { IPlayer, IPlayerFactory, PlayerBackendConfig } from '../../shared/player.js';
import { MpvPlayer } from './mpv-player.js';
import { LibVlcPlayer } from './libvlc-player.js';
import { MockPlayer } from './mock-player.js';

export class MpvPlayerFactory implements IPlayerFactory {
  constructor(private config: PlayerBackendConfig) {}

  createPlayer(): IPlayer {
    return new MpvPlayer(this.config);
  }

  isAvailable(): boolean {
    if (this.config.executablePath) {
      return existsSync(this.config.executablePath);
    }
    
    // Check common system locations
    const commonPaths = process.platform === 'win32' 
      ? ['mpv.exe', 'C:\\Program Files\\mpv\\mpv.exe']
      : process.platform === 'darwin'
      ? ['/usr/local/bin/mpv', '/opt/homebrew/bin/mpv']
      : ['/usr/bin/mpv', '/usr/local/bin/mpv'];
    
    return commonPaths.some(path => existsSync(path));
  }

  getName(): string {
    return 'MPV';
  }
}

export class LibVlcPlayerFactory implements IPlayerFactory {
  constructor(private config: PlayerBackendConfig) {}

  createPlayer(): IPlayer {
    return new LibVlcPlayer(this.config);
  }

  isAvailable(): boolean {
    // TODO: Check system libVLC
    return false;
  }

  getName(): string {
    return 'libVLC';
  }
}

export class MockPlayerFactory implements IPlayerFactory {
  constructor(private config: PlayerBackendConfig) {}

  createPlayer(): IPlayer {
    return new MockPlayer(this.config);
  }

  isAvailable(): boolean {
    return true; // Mock is always available
  }

  getName(): string {
    return 'Mock';
  }
}

/**
 * Main player factory that manages all backends
 */
export class PlayerFactory {
  private factories = new Map<string, IPlayerFactory>();
  private currentBackend = 'mpv';

  constructor() {
    this.registerFactories();
  }

  private registerFactories(): void {
    // Get vendor binary paths from manifest
    const vendorPath = join(process.cwd(), 'vendor');
    const manifestPath = join(vendorPath, 'manifest.json');
    
    let mpvPath: string | undefined;
    let libvlcAvailable = false;
    
    if (existsSync(manifestPath)) {
      try {
        const manifest = require(manifestPath);
        if (manifest.binaries?.mpv?.available && manifest.binaries.mpv.path) {
          mpvPath = join(vendorPath, manifest.binaries.mpv.path);
        }
        // TODO: Check libVLC in manifest
      } catch (error) {
        console.warn('Failed to read vendor manifest:', error);
      }
    }
    
    // Fallback to old logic
    if (!mpvPath) {
      mpvPath = this.getMpvPath(vendorPath);
    }
    
    // Register MPV factory
    this.factories.set('mpv', new MpvPlayerFactory({
      name: 'mpv',
      executablePath: mpvPath,
      timeout: 5000,
    }));
    
    // Register libVLC factory
    this.factories.set('libvlc', new LibVlcPlayerFactory({
      name: 'libvlc',
    }));
    
    // Register Mock factory
    this.factories.set('mock', new MockPlayerFactory({
      name: 'mock',
    }));
  }

  private getMpvPath(vendorPath: string): string | undefined {
    const platform = process.platform;
    const arch = process.arch;
    
    let executable: string;
    let subdir: string;
    
    if (platform === 'win32') {
      executable = 'mpv.exe';
      subdir = arch === 'x64' ? 'win32-x64' : 'win32-ia32';
    } else if (platform === 'darwin') {
      executable = 'mpv';
      subdir = arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
    } else {
      executable = 'mpv';
      subdir = 'linux-x64';
    }
    
    const fullPath = join(vendorPath, 'mpv', subdir, executable);
    
    if (existsSync(fullPath)) {
      return fullPath;
    }
    
    // Fallback to system PATH
    return undefined;
  }

  /**
   * Create a player instance using the best available backend
   */
  createPlayer(): IPlayer {
    // Try MPV first
    const mpvFactory = this.factories.get('mpv');
    if (mpvFactory && mpvFactory.isAvailable()) {
      const config = (mpvFactory as MpvPlayerFactory)['config'];
      console.log(`Player backend: mpv, resolved path: ${config.executablePath || 'system PATH'}`);
      return mpvFactory.createPlayer();
    }
    
    // Try libVLC
    const libvlcFactory = this.factories.get('libvlc');
    if (libvlcFactory && libvlcFactory.isAvailable()) {
      console.log('Player backend: libVLC, resolved path: system');
      return libvlcFactory.createPlayer();
    }
    
    // Fallback to mock
    const mockFactory = this.factories.get('mock');
    if (mockFactory && mockFactory.isAvailable()) {
      console.warn('No real player backend available, falling back to mock player');
      console.log('Player backend: mock');
      return mockFactory.createPlayer();
    }
    
    throw new Error('No player backend available');
  }

  /**
   * Set the current backend
   */
  setBackend(backend: string): void {
    if (!this.factories.has(backend)) {
      throw new Error(`Unknown player backend: ${backend}`);
    }
    
    this.currentBackend = backend;
  }

  /**
   * Get the current backend name
   */
  getCurrentBackend(): string {
    return this.currentBackend;
  }

  /**
   * Get all available backends
   */
  getAvailableBackends(): Array<{ name: string; isAvailable: boolean }> {
    return Array.from(this.factories.entries()).map(([name, factory]) => ({
      name,
      isAvailable: factory.isAvailable(),
    }));
  }

  /**
   * Check if a specific backend is available
   */
  isBackendAvailable(backend: string): boolean {
    const factory = this.factories.get(backend);
    return factory ? factory.isAvailable() : false;
  }
}