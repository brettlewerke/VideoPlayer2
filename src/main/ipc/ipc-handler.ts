/**
 * IPC handler for secure communication between main and renderer processes
 */

import { ipcMain, BrowserWindow } from 'electron';
import { DatabaseManager } from '../database/database.js';
import { PlayerFactory } from '../player/player-factory.js';
import { DependencyChecker } from '../services/dependency-checker';
import { IPlayer } from '../../shared/player.js';
import { IPC_CHANNELS, createIpcResponse, validatePath, validateVolume, validatePosition, validateTrackId } from '../../shared/ipc.js';
import type { LoadMediaRequest, PlaybackProgress, DependencyCheckResult, RepairResult } from '../../shared/types.js';

export class IpcHandler {
  private player: IPlayer | null = null;
  private dependencyChecker: DependencyChecker;

  constructor(
    private database: DatabaseManager,
    private playerFactory: PlayerFactory
  ) {
    this.dependencyChecker = new DependencyChecker();
  }

  setupHandlers(): void {
    // Player control handlers
    ipcMain.handle(IPC_CHANNELS.PLAYER_LOAD, this.handlePlayerLoad.bind(this));
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

    // Drive handlers
    ipcMain.handle(IPC_CHANNELS.DRIVES_GET_ALL, this.handleGetDrives.bind(this));

    // Settings handlers
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, this.handleGetSettings.bind(this));
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, this.handleSetSettings.bind(this));

    // App handlers
    ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, this.handleGetVersion.bind(this));
    ipcMain.handle(IPC_CHANNELS.APP_QUIT, this.handleAppQuit.bind(this));
    ipcMain.handle(IPC_CHANNELS.APP_MINIMIZE, this.handleAppMinimize.bind(this));
    ipcMain.handle(IPC_CHANNELS.APP_TOGGLE_FULLSCREEN, this.handleToggleFullscreen.bind(this));

    // Repair handlers (VLC installation)
    ipcMain.handle(IPC_CHANNELS.REPAIR_CHECK_DEPENDENCIES, this.handleCheckDependencies.bind(this));
    ipcMain.handle(IPC_CHANNELS.REPAIR_INSTALL_VLC, this.handleInstallVLC.bind(this));
    ipcMain.handle(IPC_CHANNELS.REPAIR_SWITCH_BACKEND, this.handleSwitchBackend.bind(this));
    ipcMain.handle(IPC_CHANNELS.REPAIR_GET_MANUAL_INSTRUCTIONS, this.handleGetManualInstructions.bind(this));

    console.log('IPC handlers set up successfully');
  }

  cleanup(): void {
    if (this.player) {
      this.player.destroy();
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
  private async handlePlayerLoad(event: Electron.IpcMainInvokeEvent, request: LoadMediaRequest) {
    try {
      if (!validatePath(request.path)) {
        throw new Error('Invalid file path');
      }

      if (!this.player) {
        this.player = this.playerFactory.createPlayer();
        this.setupPlayerEvents();
      }

      await this.player.loadMedia(request);
      return createIpcResponse(event.frameId.toString(), undefined);
    } catch (error) {
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

    this.player.on('statusChanged', (status) => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_STATUS_CHANGED, status);
    });

    this.player.on('tracksChanged', (tracks) => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_TRACKS_CHANGED, tracks);
    });

    this.player.on('ended', () => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_ENDED);
    });

    this.player.on('error', (error) => {
      this.sendToRenderer(IPC_CHANNELS.PLAYER_ERROR, error.message);
    });
  }

  // Library handlers
  private async handleGetMovies(event: Electron.IpcMainInvokeEvent, driveId?: string) {
    try {
      const movies = await this.database.getMovies(driveId);
      return createIpcResponse(event.frameId.toString(), movies);
    } catch (error) {
      return createIpcResponse(event.frameId.toString(), undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleGetShows(event: Electron.IpcMainInvokeEvent, driveId?: string) {
    try {
      const shows = await this.database.getShows(driveId);
      return createIpcResponse(event.frameId.toString(), shows);
    } catch (error) {
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

  // Drive handlers
  private async handleGetDrives(event: Electron.IpcMainInvokeEvent) {
    try {
      const drives = await this.database.getDrives();
      return createIpcResponse(event.frameId.toString(), drives);
    } catch (error) {
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

  // Repair handlers
  private async handleCheckDependencies(event: Electron.IpcMainInvokeEvent): Promise<DependencyCheckResult> {
    try {
      const result = await this.dependencyChecker.checkDependencies();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during dependency check'
      };
    }
  }

  private async handleInstallVLC(event: Electron.IpcMainInvokeEvent): Promise<RepairResult> {
    try {
      const { shell } = require('electron');
      
      // Open VLC download page
      await shell.openExternal('https://www.videolan.org/vlc/');
      
      return {
        success: true,
        message: 'VLC download page opened. Please install VLC and restart H Player.',
        requiresRestart: false
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to open VLC download page',
        requiresRestart: false
      };
    }
  }

  private async handleSwitchBackend(event: Electron.IpcMainInvokeEvent): Promise<RepairResult> {
    try {
      // Check if libVLC is available
      const dependencyResult = await this.dependencyChecker.checkDependencies();
      const isLibVlcAvailable = dependencyResult.success;
      if (!isLibVlcAvailable) {
        return {
          success: false,
          message: 'libVLC backend is not available on this system'
        };
      }

      // Switch to libVLC backend
      this.playerFactory.setBackend('libvlc');

      // Update settings
      await this.database.setSetting('playerBackend', 'libvlc');

      return {
        success: true,
        message: 'Successfully switched to libVLC backend',
        requiresRestart: true
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during backend switch'
      };
    }
  }

  private async handleGetManualInstructions(event: Electron.IpcMainInvokeEvent): Promise<string> {
    // Return manual instructions as a string
    return `
# VLC Media Player Installation Instructions

## Step 1: Download VLC Media Player
Visit the official VLC website:
\`\`\`
https://www.videolan.org/vlc/
\`\`\`
Choose the version that matches your system (32-bit or 64-bit Windows).

## Step 2: Install VLC
1. Run the VLC installer as Administrator
2. Follow the installation wizard
3. Choose default options (recommended)
4. Complete the installation

## Step 3: Restart H Player
After installing VLC, restart H Player to enable full video playback capabilities.

## Alternative Installation Methods
- **Microsoft Store:** Search for "VLC" in the Microsoft Store
- **Package Managers:** Use Chocolatey (choco install vlc) or Winget (winget install vlc)
- **Portable Version:** Download the portable version if you prefer not to install

## Troubleshooting
- Ensure you're using the latest VLC version
- For portable VLC installations, make sure the VLC directory is added to your system PATH
- Restart H Player after VLC installation
`;
  }

}