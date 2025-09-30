/**
 * libVLC dependency verification service 
 * Checks for libVLC availability and provides fallback options
 */

import { existsSync } from 'fs';
import { platform } from 'os';

export interface DependencyCheckResult {
  success: boolean;
  error?: string;
  libvlcAvailable?: boolean;
  fallbackToMock?: boolean;
}

export interface RepairOptions {
  action: 'install-vlc' | 'continue-mock' | 'manual';
}

export class DependencyChecker {
  constructor() {
    // libVLC checker doesn't need complex initialization
  }

  /**
   * Check if libVLC is available for media playback
   */
  async checkDependencies(): Promise<DependencyCheckResult> {
    try {
      const libvlcAvailable = this.checkLibVlcAvailability();
      
      return {
        success: true,
        libvlcAvailable,
        fallbackToMock: !libvlcAvailable
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown dependency check error',
        libvlcAvailable: false,
        fallbackToMock: true
      };
    }
  }

  /**
   * Check if libVLC is available on the system
   */
  private checkLibVlcAvailability(): boolean {
    // On Windows, check for VLC installation
    if (platform() === 'win32') {
      const commonPaths = [
        'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
        'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
      ];
      
      return commonPaths.some(path => existsSync(path));
    }
    
    // On other platforms, assume libVLC is available through package managers or bundled
    return true;
  }

  /**
   * Get recommendations for libVLC installation
   */
  getInstallationRecommendations(): {
    windows: string;
    mac: string;
    linux: string;
  } {
    return {
      windows: 'Download and install VLC Media Player from https://www.videolan.org/vlc/',
      mac: 'Install VLC from the App Store or download from https://www.videolan.org/vlc/',
      linux: 'Install VLC using your package manager: sudo apt install vlc (Ubuntu/Debian) or sudo dnf install vlc (Fedora)'
    };
  }

  /**
   * Check if mock player fallback is needed
   */
  shouldUseMockPlayer(): boolean {
    return !this.checkLibVlcAvailability();
  }
}