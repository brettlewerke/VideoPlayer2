/**
 * libVLC player backend implementation
 */

import { EventEmitter } from 'events';
import { IPlayer, PlayerBackendConfig } from '../../shared/player.js';
import { PlayerStatus, PlayerState, MediaTracks } from '../../shared/types.js';

export class LibVlcPlayer extends EventEmitter implements IPlayer {
  private currentStatus: PlayerStatus;
  private currentMedia: string | null = null;

  constructor(private config: PlayerBackendConfig) {
    super();

    this.currentStatus = {
      state: 'idle',
      position: 0,
      duration: 0,
      volume: 1.0,
      isMuted: false,
      tracks: { audio: [], subtitles: [] },
    };
  }

  async loadMedia(absPath: string, options?: { start?: number }): Promise<void> {
    // TODO: Implement libVLC integration
    // For now, throw error to indicate not implemented
    throw new Error('libVLC player not yet implemented');
  }

  async play(): Promise<void> {
    if (!this.currentMedia) {
      throw new Error('No media loaded');
    }
    // TODO: Implement
    throw new Error('libVLC play not implemented');
  }

  async pause(): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC pause not implemented');
  }

  async stop(): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC stop not implemented');
  }

  async seek(position: number): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC seek not implemented');
  }

  async setVolume(volume: number): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC setVolume not implemented');
  }

  async setMuted(muted: boolean): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC setMuted not implemented');
  }

  async setAudioTrack(trackId: number): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC setAudioTrack not implemented');
  }

  async setSubtitleTrack(trackId: number): Promise<void> {
    // TODO: Implement
    throw new Error('libVLC setSubtitleTrack not implemented');
  }

  getStatus(): PlayerStatus {
    return { ...this.currentStatus };
  }

  getTracks(): MediaTracks {
    return { ...this.currentStatus.tracks };
  }

  async cleanup(): Promise<void> {
    this.currentMedia = null;
    this.currentStatus.state = 'idle';
    this.currentStatus.position = 0;
  }

  isAvailable(): boolean {
    // TODO: Check if libVLC is available
    return false;
  }
}