/**
 * Player factory for creating backend instances - libVLC only (no FFmpeg dependency)
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { IPlayer, IPlayerFactory, PlayerBackendConfig } from '../../shared/player.js';
import { VlcPlayer } from './vlc-player.js';
import { MockPlayer } from './mock-player.js';

export class VlcPlayerFactory implements IPlayerFactory {
  constructor(private config: PlayerBackendConfig) {}

  createPlayer(): IPlayer {
    return new VlcPlayer(this.config);
  }

  isAvailable(): boolean {
    // Check for VLC installation on the system
    const commonPaths = process.platform === 'win32' 
      ? ['vlc.exe', 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe', 'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe']
      : process.platform === 'darwin'
      ? ['/Applications/VLC.app/Contents/MacOS/VLC', '/usr/local/bin/vlc']
      : ['/usr/bin/vlc', '/usr/local/bin/vlc', '/snap/bin/vlc'];
    
    return commonPaths.some(path => existsSync(path)) || true; // Default to true for built-in libVLC
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
 * Main player factory that manages all backends - libVLC focused
 */
export class PlayerFactory {
  private factories = new Map<string, IPlayerFactory>();
  private currentBackend = 'libvlc';

  constructor() {
    this.registerFactories();
  }

  private registerFactories(): void {
    // Register libVLC factory (primary backend)
    this.factories.set('libvlc', new VlcPlayerFactory({
      name: 'libvlc',
      timeout: 5000,
    }));
    
    // Register Mock factory (fallback/testing)
    this.factories.set('mock', new MockPlayerFactory({
      name: 'mock',
    }));
  }

  /**
   * Create a player instance using the current backend
   */
  createPlayer(): IPlayer {
    const factory = this.factories.get(this.currentBackend);
    
    if (!factory) {
      throw new Error(`Unknown player backend: ${this.currentBackend}`);
    }
    
    if (!factory.isAvailable()) {
      // Try to fall back to mock player
      const mockFactory = this.factories.get('mock');
      if (mockFactory && mockFactory.isAvailable()) {
        console.warn(`Backend ${this.currentBackend} not available, falling back to mock player`);
        return mockFactory.createPlayer();
      }
      
      throw new Error(`Player backend ${this.currentBackend} is not available`);
    }
    
    return factory.createPlayer();
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