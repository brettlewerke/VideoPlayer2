/**
 * Mock player implementation for testing
 */

import { EventEmitter } from 'events';
import { IPlayer, PlayerBackendConfig } from '../../shared/player.js';
import { PlayerStatus, PlayerState, MediaTracks } from '../../shared/types.js';

export class MockPlayer extends EventEmitter implements IPlayer {
  private currentStatus: PlayerStatus;
  private currentMedia: string | null = null;
  private playbackTimer: ReturnType<typeof setInterval> | null = null;

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
    try {
      this.currentMedia = absPath;
      this.currentStatus.state = 'loading';
      this.currentStatus.position = options?.start || 0;
      this.currentStatus.duration = 3600; // Mock 1 hour duration
      
      // Simulate mock tracks
      this.currentStatus.tracks = {
        audio: [
          { id: 1, title: 'English', language: 'en', codec: 'aac' },
          { id: 2, title: 'Spanish', language: 'es', codec: 'aac' },
        ],
        subtitles: [
          { id: 1, title: 'English', language: 'en', codec: 'srt', isDefault: true },
          { id: 2, title: 'Spanish', language: 'es', codec: 'srt' },
        ],
      };
      
      this.emit('statusChanged', this.currentStatus);
      
      // Simulate loading delay
      setTimeout(() => {
        this.currentStatus.state = 'playing';
        this.emit('statusChanged', this.currentStatus);
        
        // Start mock playback timer
        this.playbackTimer = setInterval(() => {
          if (this.currentStatus.state === 'playing') {
            this.currentStatus.position += 1;
            if (this.currentStatus.position >= this.currentStatus.duration) {
              this.currentStatus.position = this.currentStatus.duration;
              this.currentStatus.state = 'idle';
              this.emit('ended');
              this.emit('statusChanged', this.currentStatus);
              if (this.playbackTimer) {
                clearInterval(this.playbackTimer);
                this.playbackTimer = null;
              }
            } else {
              this.emit('statusChanged', this.currentStatus);
            }
          }
        }, 1000);
      }, 500);
    } catch (error) {
      this.emit('error', new Error(`Failed to load media: ${error}`));
    }
  }

  async play(): Promise<void> {
    if (!this.currentMedia) {
      throw new Error('No media loaded');
    }
    
    this.currentStatus.state = 'playing';
    this.emit('statusChanged', this.currentStatus);
    
    // Start playback simulation
    this.startPlaybackTimer();
  }

  async pause(): Promise<void> {
    this.currentStatus.state = 'paused';
    this.emit('statusChanged', this.currentStatus);
    this.stopPlaybackTimer();
  }

  async stop(): Promise<void> {
    this.currentStatus.state = 'stopped';
    this.currentStatus.position = 0;
    this.emit('statusChanged', this.currentStatus);
    this.stopPlaybackTimer();
  }

  async seek(position: number): Promise<void> {
    this.currentStatus.position = Math.max(0, Math.min(position, this.currentStatus.duration));
    this.emit('statusChanged', this.currentStatus);
  }

  async setVolume(volume: number): Promise<void> {
    this.currentStatus.volume = Math.max(0, Math.min(1, volume));
    this.emit('statusChanged', this.currentStatus);
  }

  async setMuted(muted: boolean): Promise<void> {
    this.currentStatus.isMuted = muted;
    this.emit('statusChanged', this.currentStatus);
  }

  async setAudioTrack(trackId: number): Promise<void> {
    this.currentStatus.currentAudioTrack = trackId;
    this.emit('statusChanged', this.currentStatus);
  }

  async setSubtitleTrack(trackId: number): Promise<void> {
    this.currentStatus.currentSubtitleTrack = trackId === -1 ? undefined : trackId;
    this.emit('statusChanged', this.currentStatus);
  }

  getStatus(): PlayerStatus {
    return { ...this.currentStatus };
  }

  getTracks(): MediaTracks {
    return { ...this.currentStatus.tracks };
  }

  async destroy(): Promise<void> {
    this.stopPlaybackTimer();
    this.currentMedia = null;
    this.currentStatus.state = 'idle';
    this.removeAllListeners();
  }

  isAvailable(): boolean {
    return true; // Mock is always available
  }

  private startPlaybackTimer(): void {
    this.stopPlaybackTimer();
    
    this.playbackTimer = setInterval(() => {
      if (this.currentStatus.state === 'playing') {
        this.currentStatus.position += 1;
        
        if (this.currentStatus.position >= this.currentStatus.duration) {
          this.currentStatus.state = 'idle';
          this.currentStatus.position = 0;
          this.stopPlaybackTimer();
          this.emit('ended');
        }
        
        this.emit('statusChanged', this.currentStatus);
      }
    }, 1000);
  }

  private stopPlaybackTimer(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  async cleanup(): Promise<void> {
    this.stopPlaybackTimer();
    this.currentMedia = null;
    this.currentStatus.state = 'idle';
    this.currentStatus.position = 0;
  }
}