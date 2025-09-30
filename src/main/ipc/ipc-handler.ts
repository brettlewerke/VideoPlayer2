/**
 * IPC handler for secure communication between main and renderer processes
 */

import { ipcMain, BrowserWindow } from 'electron';
import { DatabaseManager } from '../database/database.js';
import { PlayerFactory } from '../player/player-factory.js';
import { DriveManager } from '../services/drive-manager.js';
import { MediaScanner } from '../services/media-scanner.js';
import { IPlayer } from '../../shared/player.js';
import { IPC_CHANNELS, createIpcResponse, validatePath, validateVolume, validatePosition, validateTrackId } from '../../shared/ipc.js';
import type { PlaybackProgress } from '../../shared/types.js';
import { isPlayablePath } from '../../common/media/extensions.js';

export class IpcHandler {
  private player: IPlayer | null = null;
  private currentMediaId: string | null = null;
  private currentMediaType: 'movie' | 'episode' | null = null;

  constructor(
    private database: DatabaseManager,
    private playerFactory: PlayerFactory,
    private driveManager: DriveManager,
    private mediaScanner: MediaScanner
  ) {}

  setupHandlers(): void {
    // Player control handlers
    ipcMain.handle(IPC_CHANNELS.PLAYER_START, this.handlePlayerStart.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_PLAY, this.handlePlayerPlay.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_PAUSE, this.handlePlayerPause.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_STOP, this.handlePlayerStop.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_SEEK, this.handlePlayerSeek.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_SET_VOLUME, this.handlePlayerSetVolume.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_SET_MUTED, this.handlePlayerSetMuted.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_SET_AUDIO_TRACK, this.handlePlayerSetAudioTrack.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_SET_SUBTITLE_TRACK, this.handlePlayerSetSubtitleTrack.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_GET_STATUS, this.handlePlayerGetStatus.bind(this));
    ipcMain.handle(IPC_CHANNELS.PLAYER_GET_TRACKS, this.handlePlayerGetTracks.bind(this));

    // Library handlers
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_MOVIES, this.handleGetMovies.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_SHOWS, this.handleGetShows.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_SEASONS, this.handleGetSeasons.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_EPISODES, this.handleGetEpisodes.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_CONTINUE_WATCHING, this.handleGetContinueWatching.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_RECENTLY_ADDED, this.handleGetRecentlyAdded.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_SEARCH, this.handleLibrarySearch.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_GET_PROGRESS, this.handleGetProgress.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_SET_PROGRESS, this.handleSetProgress.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_DELETE_PROGRESS, this.handleDeleteProgress.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_DELETE_MOVIE, this.handleDeleteMovie.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_DELETE_SHOW, this.handleDeleteShow.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_DELETE_SEASON, this.handleDeleteSeason.bind(this));
    ipcMain.handle(IPC_CHANNELS.LIBRARY_DELETE_EPISODE, this.handleDeleteEpisode.bind(this));

    // Drive handlers
    ipcMain.handle(IPC_CHANNELS.DRIVES_GET_ALL, this.handleGetDrives.bind(this));
    ipcMain.handle(IPC_CHANNELS.DRIVES_SCAN, this.handleDrivesScan.bind(this));

    // Settings handlers
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, this.handleGetSettings.bind(this));
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, this.handleSetSettings.bind(this));

    // App handlers
    ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, this.handleGetVersion.bind(this));
    ipcMain.handle(IPC_CHANNELS.APP_QUIT, this.handleAppQuit.bind(this));
    ipcMain.handle(IPC_CHANNELS.APP_MINIMIZE, this.handleAppMinimize.bind(this));
    ipcMain.handle(IPC_CHANNELS.APP_TOGGLE_FULLSCREEN, this.handleToggleFullscreen.bind(this));

    console.log('IPC handlers set up successfully');
  }

  cleanup(): void {
    if (this.player) {
      this.player.cleanup();
      this.player = null;
    }
    
    // Remove all listeners (Electron does this automatically on app quit)
    ipcMain.removeAllListeners();
  }

  sendToRenderer(channel: string, data?: any): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }

  // Player handlers
  private async handlePlayerStart(event: Electron.IpcMainInvokeEvent, payload: { path: string; start?: number }) {
    try {
      console.log('[IPC] Player start requested:', payload.path);
      
      if (!validatePath(payload.path)) {
        console.error('[IPC] Invalid file path:', payload.path);
        throw new Error('Invalid file path');
      }

      if (!isPlayablePath(payload.path)) {
        console.error('[IPC] Unsupported file format:', payload.path);
        throw new Error('Unsupported file format');
      }

      // Find media ID for progress tracking
      console.log('[IPC] Looking up media in database:', payload.path);
      const media = await this.database.getMediaByPath(payload.path);
      this.currentMediaId = media?.id || null;
      this.currentMediaType = media?.type || null;
      console.log('[IPC] Media lookup result:', media);

      try {
        // Try to create external player first
        if (this.player) {
          console.log('[IPC] Cleaning up existing player');
          await this.player.cleanup();
        }
        
        console.log('[IPC] Creating new player instance');
        this.player = this.playerFactory.createPlayer();
        
        console.log('[IPC] Setting up player events');
        this.setupPlayerEvents();

        console.log('[IPC] Loading media into player');
        await this.player.loadMedia(payload.path, { start: payload.start });
        console.log('[IPC] Player started successfully');
        
        return createIpcResponse(event.frameId.toString(), { useExternalPlayer: true });
      } catch (playerError) {
        // External player not available, fall back to HTML5 video
        const errorMessage = playerError instanceof Error ? playerError.message : 'Unknown player error';
        console.log('[IPC] External player not available, using HTML5 video:', errorMessage);
        
        // Send the video path to renderer for HTML5 playback
        const videoData = {
          useExternalPlayer: false,
          videoPath: payload.path,
          startTime: payload.start || 0,
          mediaId: this.currentMediaId,
          mediaType: this.currentMediaType
        };
        
        return createIpcResponse(event.frameId.toString(), videoData);
      }
    } catch (error) {
      console.error('[IPC] Player start failed:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerPlay(event: Electron.IpcMainInvokeEvent) {
    try {
      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.play();
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerPause(event: Electron.IpcMainInvokeEvent) {
    try {
      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.pause();
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerStop(event: Electron.IpcMainInvokeEvent) {
    try {
      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.stop();
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerSeek(event: Electron.IpcMainInvokeEvent, position: number) {
    try {
      if (!validatePosition(position)) {
        throw new Error('Invalid seek position');
      }

      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.seek(position);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerSetVolume(event: Electron.IpcMainInvokeEvent, volume: number) {
    try {
      if (!validateVolume(volume)) {
        throw new Error('Invalid volume level');
      }

      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.setVolume(volume);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerSetMuted(event: Electron.IpcMainInvokeEvent, muted: boolean) {
    try {
      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.setMuted(muted);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerSetAudioTrack(event: Electron.IpcMainInvokeEvent, trackId: number) {
    try {
      if (!validateTrackId(trackId)) {
        throw new Error('Invalid track ID');
      }

      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.setAudioTrack(trackId);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerSetSubtitleTrack(event: Electron.IpcMainInvokeEvent, trackId: number) {
    try {
      if (!validateTrackId(trackId)) {
        throw new Error('Invalid track ID');
      }

      if (!this.player) {
        throw new Error('No player available');
      }

      await this.player.setSubtitleTrack(trackId);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerGetStatus(event: Electron.IpcMainInvokeEvent) {
    try {
      if (!this.player) {
        throw new Error('No player available');
      }

      const status = this.player.getStatus();
      return createIpcResponse(event.frameId.toString(), status);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handlePlayerGetTracks(event: Electron.IpcMainInvokeEvent) {
    try {
      if (!this.player) {
        throw new Error('No player available');
      }

      const tracks = this.player.getTracks();
      return createIpcResponse(event.frameId.toString(), tracks);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private setupPlayerEvents(): void {
    if (!this.player) return;

    let lastProgressSave = 0;
    let lastStatus: any = null;

    this.player.on('statusChanged', async (status) => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_STATUS_CHANGED, status);
      lastStatus = status;
      
      // Save progress every 5-10 seconds if playing
      const now = Date.now();
      if (status.state === 'playing' && this.currentMediaId && this.currentMediaType && now - lastProgressSave > 5000) {
        await this.saveProgress(status);
        lastProgressSave = now;
      }
    });

    this.player.on('tracksChanged', (tracks) => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_TRACKS_CHANGED, tracks);
    });

    this.player.on('ended', async () => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_ENDED);
      // Mark as completed
      if (this.currentMediaId && this.currentMediaType && lastStatus) {
        await this.saveProgress(lastStatus, true);
      }
    });

    this.player.on('error', (error) => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_ERROR, error.message);
    });
  }

  private async saveProgress(status: any, isCompleted = false): Promise<void> {
    if (!this.currentMediaId || !this.currentMediaType) return;

    try {
      const progress: PlaybackProgress = {
        id: `${this.currentMediaType}_${this.currentMediaId}`,
        mediaId: this.currentMediaId,
        mediaType: this.currentMediaType,
        position: status.position || 0,
        duration: status.duration || 0,
        percentage: status.duration > 0 ? (status.position / status.duration) : 0,
        isCompleted,
        lastWatched: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.database.setProgress(progress);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  // Library handlers
  private async handleGetMovies(event: Electron.IpcMainInvokeEvent, driveId?: string) {
    try {
      const movies = await this.database.getMovies(driveId);
      console.log(`[IPC] getMovies returned ${movies.length} movies`);
      return createIpcResponse(event.frameId.toString(), movies);
    } catch (error) {
      console.error('[IPC] getMovies error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetShows(event: Electron.IpcMainInvokeEvent, driveId?: string) {
    try {
      const shows = await this.database.getShows(driveId);
      console.log(`[IPC] getShows returned ${shows.length} shows`);
      return createIpcResponse(event.frameId.toString(), shows);
    } catch (error) {
      console.error('[IPC] getShows error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetSeasons(event: Electron.IpcMainInvokeEvent, showId: string) {
    try {
      const seasons = await this.database.getSeasons(showId);
      return createIpcResponse(event.frameId.toString(), seasons);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetEpisodes(event: Electron.IpcMainInvokeEvent, seasonId: string) {
    try {
      const episodes = await this.database.getEpisodes(seasonId);
      return createIpcResponse(event.frameId.toString(), episodes);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetContinueWatching(event: Electron.IpcMainInvokeEvent) {
    try {
      const progress = await this.database.getContinueWatching();
      return createIpcResponse(event.frameId.toString(), progress);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetRecentlyAdded(event: Electron.IpcMainInvokeEvent) {
    try {
      const movies = await this.database.getRecentMovies(5);
      const episodes = await this.database.getRecentEpisodes(5);
      return createIpcResponse(event.frameId.toString(), { movies, episodes });
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleLibrarySearch(event: Electron.IpcMainInvokeEvent, query: string) {
    try {
      const movies = await this.database.searchMovies(query);
      const shows = await this.database.searchShows(query);
      return createIpcResponse(event.frameId.toString(), { movies, shows });
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetProgress(event: Electron.IpcMainInvokeEvent, mediaId: string) {
    try {
      const progress = await this.database.getProgress(mediaId);
      return createIpcResponse(event.frameId.toString(), progress);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleSetProgress(event: Electron.IpcMainInvokeEvent, progress: PlaybackProgress) {
    try {
      await this.database.setProgress(progress);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleDeleteProgress(event: Electron.IpcMainInvokeEvent, mediaId: string) {
    try {
      await this.database.deleteProgress(mediaId);
      return createIpcResponse(event.frameId.toString(), { success: true });
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleDeleteMovie(event: Electron.IpcMainInvokeEvent, movieId: string) {
    try {
      console.log(`[IPC] Deleting movie: ${movieId}`);
      await this.database.deleteMovie(movieId);
      // Also delete any progress for this movie
      await this.database.deleteProgress(movieId);
      return createIpcResponse(event.frameId.toString(), { success: true });
    } catch (error) {
      console.error('[IPC] Delete movie error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleDeleteShow(event: Electron.IpcMainInvokeEvent, showId: string) {
    try {
      console.log(`[IPC] Deleting show: ${showId}`);
      
      // Get all episodes for this show to delete their progress
      const episodes = await this.database.getEpisodes(showId);
      for (const episode of episodes) {
        await this.database.deleteProgress(episode.id);
      }
      
      // Delete the show (this will cascade to seasons and episodes)
      await this.database.deleteShow(showId);
      
      return createIpcResponse(event.frameId.toString(), { success: true });
    } catch (error) {
      console.error('[IPC] Delete show error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleDeleteSeason(event: Electron.IpcMainInvokeEvent, seasonId: string) {
    try {
      console.log(`[IPC] Deleting season: ${seasonId}`);
      
      // Get all episodes for this season to delete their progress
      const episodes = await this.database.getEpisodesBySeason(seasonId);
      for (const episode of episodes) {
        await this.database.deleteProgress(episode.id);
      }
      
      // Delete the season (this will cascade to episodes)
      await this.database.deleteSeason(seasonId);
      
      return createIpcResponse(event.frameId.toString(), { success: true });
    } catch (error) {
      console.error('[IPC] Delete season error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleDeleteEpisode(event: Electron.IpcMainInvokeEvent, episodeId: string) {
    try {
      console.log(`[IPC] Deleting episode: ${episodeId}`);
      
      // Delete episode progress
      await this.database.deleteProgress(episodeId);
      
      // Delete the episode
      await this.database.deleteEpisode(episodeId);
      
      return createIpcResponse(event.frameId.toString(), { success: true });
    } catch (error) {
      console.error('[IPC] Delete episode error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Drive handlers
  private async handleGetDrives(event: Electron.IpcMainInvokeEvent) {
    try {
      const drives = await this.database.getDrives();
      console.log(`[IPC] getDrives returned ${drives.length} drives:`, drives.map(d => `${d.label} (${d.mountPath})`));
      return createIpcResponse(event.frameId.toString(), drives);
    } catch (error) {
      console.error('[IPC] getDrives error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleDrivesScan(event: Electron.IpcMainInvokeEvent) {
    try {
      console.log('[IPC] Starting drive scan...');
      
      // First, scan for drives
      await this.driveManager.scanForDrives();
      
      // Then scan all detected drives for media
      await this.mediaScanner.scanAllDrives();
      
      // Notify renderer to refresh
      this.sendToRenderer('library:refresh');
      
      console.log('[IPC] Drive scan completed');
      return createIpcResponse(event.frameId.toString(), { success: true });
    } catch (error) {
      console.error('[IPC] Drive scan error:', error);
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Settings handlers
  private async handleGetSettings(event: Electron.IpcMainInvokeEvent) {
    try {
      const settings = await this.database.getAllSettings();
      return createIpcResponse(event.frameId.toString(), settings);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleSetSettings(event: Electron.IpcMainInvokeEvent, key: string, value: any) {
    try {
      await this.database.setSetting(key, value);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // App handlers
  private async handleGetVersion(event: Electron.IpcMainInvokeEvent) {
    try {
      const { app } = await import('electron');
      const version = app.getVersion();
      return createIpcResponse(event.frameId.toString(), version);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleAppQuit(event: Electron.IpcMainInvokeEvent) {
    try {
      const { app } = await import('electron');
      app.quit();
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleAppMinimize(event: Electron.IpcMainInvokeEvent) {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.minimize();
      }
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleToggleFullscreen(event: Electron.IpcMainInvokeEvent) {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setFullScreen(!window.isFullScreen());
      }
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}