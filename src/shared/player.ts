/**
 * Player interface that abstracts the underlying media player backend
 * This allows swapping between mpv, libVLC, or other backends
 */

import { EventEmitter } from 'events';
import { PlayerStatus, MediaTracks, LoadMediaRequest } from './types.js';

export interface IPlayer extends EventEmitter {
  /**
   * Load a media file for playback
   */
  loadMedia(request: LoadMediaRequest): Promise<void>;

  /**
   * Start or resume playback
   */
  play(): Promise<void>;

  /**
   * Pause playback
   */
  pause(): Promise<void>;

  /**
   * Stop playback and reset position
   */
  stop(): Promise<void>;

  /**
   * Seek to a specific position in seconds
   */
  seek(position: number): Promise<void>;

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): Promise<void>;

  /**
   * Mute or unmute audio
   */
  setMuted(muted: boolean): Promise<void>;

  /**
   * Select an audio track
   */
  setAudioTrack(trackId: number): Promise<void>;

  /**
   * Select a subtitle track (-1 to disable)
   */
  setSubtitleTrack(trackId: number): Promise<void>;

  /**
   * Get current player status
   */
  getStatus(): PlayerStatus;

  /**
   * Get available tracks
   */
  getTracks(): MediaTracks;

  /**
   * Destroy player instance and cleanup resources
   */
  destroy(): Promise<void>;

  /**
   * Check if backend is available
   */
  isAvailable(): boolean;

  // Events:
  // 'statusChanged' - PlayerStatus
  // 'tracksChanged' - MediaTracks
  // 'ended' - void
  // 'error' - Error
}

export interface IPlayerFactory {
  /**
   * Create a player instance
   */
  createPlayer(): IPlayer;

  /**
   * Check if this backend is available
   */
  isAvailable(): boolean;

  /**
   * Get backend name
   */
  getName(): string;
}

/**
 * Player backend configuration
 */
export interface PlayerBackendConfig {
  name: string;
  executablePath?: string;
  args?: string[];
  timeout?: number;
  maxOutputSize?: number;
}