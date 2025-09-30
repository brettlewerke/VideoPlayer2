/**
 * MPV player backend implementation
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { createWriteStream, createReadStream, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import net from 'net';
import { IPlayer, PlayerBackendConfig } from '../../shared/player.js';
import { PlayerStatus, PlayerState, MediaTracks } from '../../shared/types.js';

export class MpvPlayer extends EventEmitter implements IPlayer {
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private socketPath: string;
  private isReady = false;
  private currentStatus: PlayerStatus;
  private requestId = 0;
  private pendingRequests = new Map<number, (response: any) => void>();

  constructor(private config: PlayerBackendConfig) {
    super();
    
    this.socketPath = join(tmpdir(), `mpv-socket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
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
      // Validate file path
      if (!absPath || !existsSync(absPath)) {
        throw new Error(`File not found: ${absPath}`);
      }

      // Kill existing process if any
      await this.cleanup();
      
      // Extract directory for sidecar subtitle auto-loading
      const mediaDir = join(absPath, '..');
      
      const args = [
        '--no-terminal',
        '--idle=no',
        '--force-window=yes',
        '--pause=no',
        `--input-ipc-server=${this.socketPath}`,
        '--hwdec=auto-safe',
        '--msg-level=all=v',
        '--sub-auto=fuzzy', // Auto-load sidecar subtitles
        '--audio-file-auto=fuzzy', // Auto-load sidecar audio tracks
      ];
      
      if (options?.start && options.start > 0) {
        args.push(`--start=${options.start}`);
      }
      
      // Add the file path as the last argument (absolute path, no file:// protocol)
      args.push(absPath);
      
      console.log(`[MPV] Starting playback: ${absPath}`);
      console.log(`[MPV] Working directory: ${mediaDir}`);
      console.log(`[MPV] Args: ${args.join(' ')}`);
      
      this.process = spawn(this.config.executablePath!, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        cwd: mediaDir, // Set working directory to media folder for sidecar file auto-load
      });
      
      this.process.stdout?.on('data', (data) => {
        console.log(`[MPV stdout] ${data.toString().trim()}`);
      });
      
      this.process.stderr?.on('data', (data) => {
        console.error(`[MPV stderr] ${data.toString().trim()}`);
      });
      
      this.process.on('error', (error) => {
        console.error('[MPV] Process error:', error);
        this.emit('error', new Error(`Failed to start MPV: ${error.message}`));
      });
      
      this.process.on('exit', (code, signal) => {
        console.log(`[MPV] Process exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.emit('ended');
      });
      
      // Connect to IPC socket
      await this.connectSocket();
      await this.setupEventListeners();
      
      this.isReady = true;
      this.currentStatus.state = 'playing';
      this.emit('statusChanged', this.currentStatus);
      this.emit('stateChanged', 'playing');
      
      // Start polling for progress
      this.startProgressPolling();
    } catch (error) {
      this.emit('error', new Error(`Failed to load media: ${error}`));
      throw error;
    }
  }

  async play(): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      await this.sendCommand({ command: ['set_property', 'pause', false] });
    } catch (error) {
      this.emit('error', new Error(`Failed to play: ${error}`));
    }
  }

  async pause(): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      await this.sendCommand({ command: ['set_property', 'pause', true] });
    } catch (error) {
      this.emit('error', new Error(`Failed to pause: ${error}`));
    }
  }

  async stop(): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      await this.sendCommand({ command: ['stop'] });
    } catch (error) {
      this.emit('error', new Error(`Failed to stop: ${error}`));
    }
  }

  async seek(position: number): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      await this.sendCommand({ command: ['seek', position, 'absolute'] });
    } catch (error) {
      this.emit('error', new Error(`Failed to seek: ${error}`));
    }
  }

  async setVolume(volume: number): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      const volumePercent = Math.max(0, Math.min(100, volume * 100));
      await this.sendCommand({ command: ['set_property', 'volume', volumePercent] });
    } catch (error) {
      this.emit('error', new Error(`Failed to set volume: ${error}`));
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      await this.sendCommand({ command: ['set_property', 'mute', muted] });
    } catch (error) {
      this.emit('error', new Error(`Failed to set muted: ${error}`));
    }
  }

  async setAudioTrack(trackId: number): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      await this.sendCommand({ command: ['set_property', 'aid', trackId] });
    } catch (error) {
      this.emit('error', new Error(`Failed to set audio track: ${error}`));
    }
  }

  async setSubtitleTrack(trackId: number): Promise<void> {
    try {
      if (!this.isReady) throw new Error('Player not ready');
      const sid = trackId === -1 ? false : trackId;
      await this.sendCommand({ command: ['set_property', 'sid', sid] });
    } catch (error) {
      this.emit('error', new Error(`Failed to set subtitle track: ${error}`));
    }
  }

  getStatus(): PlayerStatus {
    return { ...this.currentStatus };
  }

  getTracks(): MediaTracks {
    return { ...this.currentStatus.tracks };
  }

  async cleanup(): Promise<void> {
    try {
      if (this.socket) {
        this.socket.destroy();
        this.socket = null;
      }
      
      if (this.process) {
        this.process.kill('SIGTERM');
        this.process = null;
      }
      
      // Clean up socket file
      if (existsSync(this.socketPath)) {
        try {
          unlinkSync(this.socketPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      
      this.isReady = false;
      this.pendingRequests.clear();
    } catch (error) {
      console.error('Error cleaning up MPV player:', error);
    }
  }

  isAvailable(): boolean {
    return existsSync(this.config.executablePath || 'mpv');
  }

  private async ensureStarted(): Promise<void> {
    if (this.isReady) {
      return;
    }
    
    await this.startMpv();
    await this.connectSocket();
    await this.setupEventListeners();
    
    this.isReady = true;
  }

  private async startMpv(): Promise<void> {
    return new Promise((resolve, reject) => {
      const executable = this.config.executablePath || 'mpv';
      const args = [
        '--no-video', // We'll enable video when needed
        '--idle=yes',
        '--no-terminal',
        '--no-config',
        '--load-scripts=no',
        '--audio-display=no',
        '--force-window=no',
        `--input-ipc-server=${this.socketPath}`,
        '--msg-level=all=v',
        ...(this.config.args || []),
      ];
      
      console.log(`Starting MPV: ${executable} ${args.join(' ')}`);
      
      this.process = spawn(executable, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
      
      this.process.on('error', (error) => {
        reject(new Error(`Failed to start MPV: ${error.message}`));
      });
      
      this.process.on('exit', (code, signal) => {
        console.log(`MPV process exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.emit('error', new Error(`MPV process exited unexpectedly`));
      });
      
      // Give MPV a moment to start and create the socket
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve();
        } else {
          reject(new Error('MPV failed to start'));
        }
      }, 1000);
    });
  }

  private async connectSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryConnect = () => {
        attempts++;
        
        this.socket = net.createConnection(this.socketPath);
        
        this.socket.on('connect', () => {
          console.log('Connected to MPV socket');
          resolve();
        });
        
        this.socket.on('error', (error) => {
          if (attempts < maxAttempts) {
            console.log(`Socket connection attempt ${attempts} failed, retrying...`);
            setTimeout(tryConnect, 200);
          } else {
            reject(new Error(`Failed to connect to MPV socket after ${maxAttempts} attempts: ${error.message}`));
          }
        });
        
        this.socket.on('data', (data) => {
          this.handleSocketData(data);
        });
        
        this.socket.on('close', () => {
          console.log('MPV socket closed');
          this.socket = null;
        });
      };
      
      tryConnect();
    });
  }

  private async setupEventListeners(): Promise<void> {
    // Observe key properties for status updates
    const observeCommands = [
      { command: ['observe_property', 1, 'pause'] },
      { command: ['observe_property', 2, 'time-pos'] },
      { command: ['observe_property', 3, 'duration'] },
      { command: ['observe_property', 4, 'volume'] },
      { command: ['observe_property', 5, 'mute'] },
      { command: ['observe_property', 6, 'track-list'] },
    ];
    
    for (const cmd of observeCommands) {
      await this.sendCommand(cmd);
    }
  }

  private handleSocketData(data: Buffer): void {
    const lines = data.toString().trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse MPV message:', error, line);
      }
    }
  }

  private handleMessage(message: any): void {
    if (message.request_id && this.pendingRequests.has(message.request_id)) {
      const resolver = this.pendingRequests.get(message.request_id);
      this.pendingRequests.delete(message.request_id);
      resolver!(message);
      return;
    }
    
    if (message.event) {
      this.handleEvent(message);
    }
  }

  private handleEvent(event: any): void {
    switch (event.event) {
      case 'property-change':
        this.handlePropertyChange(event);
        break;
      case 'playback-restart':
        this.currentStatus.state = 'playing';
        this.emit('statusChanged', this.currentStatus);
        break;
      case 'end-file':
        this.currentStatus.state = 'idle';
        this.currentStatus.position = 0;
        this.emit('statusChanged', this.currentStatus);
        this.emit('ended');
        break;
      case 'file-loaded':
        this.updateTracks();
        break;
    }
  }

  private handlePropertyChange(event: any): void {
    const { name, data } = event;
    let statusChanged = false;
    
    switch (name) {
      case 'pause':
        const newState: PlayerState = data ? 'paused' : 'playing';
        if (this.currentStatus.state !== newState) {
          this.currentStatus.state = newState;
          statusChanged = true;
        }
        break;
      case 'time-pos':
        if (typeof data === 'number' && data !== this.currentStatus.position) {
          this.currentStatus.position = data;
          statusChanged = true;
        }
        break;
      case 'duration':
        if (typeof data === 'number' && data !== this.currentStatus.duration) {
          this.currentStatus.duration = data;
          statusChanged = true;
        }
        break;
      case 'volume':
        if (typeof data === 'number') {
          const volume = data / 100;
          if (volume !== this.currentStatus.volume) {
            this.currentStatus.volume = volume;
            statusChanged = true;
          }
        }
        break;
      case 'mute':
        if (typeof data === 'boolean' && data !== this.currentStatus.isMuted) {
          this.currentStatus.isMuted = data;
          statusChanged = true;
        }
        break;
      case 'track-list':
        this.updateTracksFromList(data);
        break;
    }
    
    if (statusChanged) {
      this.emit('statusChanged', this.currentStatus);
    }
  }

  private async updateTracks(): Promise<void> {
    try {
      const response = await this.sendCommand({ command: ['get_property', 'track-list'] });
      if (response.data) {
        this.updateTracksFromList(response.data);
      }
    } catch (error) {
      console.error('Failed to update tracks:', error);
    }
  }

  private updateTracksFromList(trackList: any[]): void {
    if (!Array.isArray(trackList)) return;
    
    const audioTracks = trackList
      .filter(track => track.type === 'audio')
      .map(track => ({
        id: track.id,
        title: track.title,
        language: track.lang,
        codec: track.codec,
      }));
    
    const subtitleTracks = trackList
      .filter(track => track.type === 'sub')
      .map(track => ({
        id: track.id,
        title: track.title,
        language: track.lang,
        codec: track.codec,
        isDefault: track.default || false,
        isForced: track.forced || false,
      }));
    
    const tracksChanged = 
      JSON.stringify(this.currentStatus.tracks.audio) !== JSON.stringify(audioTracks) ||
      JSON.stringify(this.currentStatus.tracks.subtitles) !== JSON.stringify(subtitleTracks);
    
    if (tracksChanged) {
      this.currentStatus.tracks = { audio: audioTracks, subtitles: subtitleTracks };
      this.emit('tracksChanged', this.currentStatus.tracks);
      this.emit('statusChanged', this.currentStatus);
    }
  }

  private startProgressPolling(): void {
    const poll = async () => {
      if (!this.isReady) return;
      
      try {
        const [timePos, duration] = await Promise.all([
          this.sendCommand({ command: ['get_property', 'time-pos'] }),
          this.sendCommand({ command: ['get_property', 'duration'] })
        ]);
        
        const position = timePos.data || 0;
        const dur = duration.data || 0;
        
        let statusChanged = false;
        if (this.currentStatus.position !== position) {
          this.currentStatus.position = position;
          statusChanged = true;
        }
        if (this.currentStatus.duration !== dur) {
          this.currentStatus.duration = dur;
          statusChanged = true;
        }
        
        if (statusChanged) {
          this.emit('statusChanged', this.currentStatus);
        }
      } catch (error) {
        // Ignore polling errors
      }
      
      // Poll every 750ms
      setTimeout(poll, 750);
    };
    
    poll();
  }

  private async sendCommand(command: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      
      const requestId = ++this.requestId;
      const message = { ...command, request_id: requestId };
      
      this.pendingRequests.set(requestId, (response: any) => {
        if (response.error && response.error !== 'success') {
          reject(new Error(`MPV command failed: ${response.error}`));
        } else {
          resolve(response);
        }
      });
      
      // Set a timeout for the request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('MPV command timeout'));
        }
      }, this.config.timeout || 5000);
      
      try {
        this.socket.write(JSON.stringify(message) + '\n');
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }
}