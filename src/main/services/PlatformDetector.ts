/**
 * Platform Detection Service
 * Detects Raspberry Pi and other platform-specific capabilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export interface PlatformInfo {
  isRaspberryPi: boolean;
  isLinux: boolean;
  isWindows: boolean;
  isMac: boolean;
  arch: string;
  model?: string; // Raspberry Pi model (e.g., "Raspberry Pi 4 Model B")
  ramMB: number;
  cpuCores: number;
  hasHardwareAcceleration: boolean;
  gpuInfo?: string;
}

export interface HardwareCapabilities {
  supportsH264: boolean;
  supportsHEVC: boolean;
  supportsVP9: boolean;
  hasOMX: boolean; // OpenMAX hardware acceleration (older Pi models)
  hasV4L2: boolean; // V4L2 M2M hardware acceleration (Pi 4+)
  recommendedPlayer: 'mpv' | 'vlc' | 'omxplayer' | 'html5';
}

export class PlatformDetector {
  private platformInfo: PlatformInfo | null = null;
  private capabilities: HardwareCapabilities | null = null;

  /**
   * Detect platform information
   */
  async detectPlatform(): Promise<PlatformInfo> {
    if (this.platformInfo) {
      return this.platformInfo;
    }

    const platform = os.platform();
    const arch = os.arch();
    
    this.platformInfo = {
      isRaspberryPi: false,
      isLinux: platform === 'linux',
      isWindows: platform === 'win32',
      isMac: platform === 'darwin',
      arch,
      ramMB: Math.round(os.totalmem() / 1024 / 1024),
      cpuCores: os.cpus().length,
      hasHardwareAcceleration: false,
    };

    // Detect Raspberry Pi
    if (this.platformInfo.isLinux) {
      const isRPi = await this.detectRaspberryPi();
      this.platformInfo.isRaspberryPi = isRPi;

      if (isRPi) {
        this.platformInfo.model = await this.getRaspberryPiModel();
        this.platformInfo.hasHardwareAcceleration = await this.detectHardwareAcceleration();
        this.platformInfo.gpuInfo = await this.getGPUInfo();
      }
    }

    console.log('[PlatformDetector] Platform detected:', this.platformInfo);
    return this.platformInfo;
  }

  /**
   * Get hardware capabilities
   */
  async getHardwareCapabilities(): Promise<HardwareCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const platform = await this.detectPlatform();

    this.capabilities = {
      supportsH264: false,
      supportsHEVC: false,
      supportsVP9: false,
      hasOMX: false,
      hasV4L2: false,
      recommendedPlayer: 'html5',
    };

    if (platform.isRaspberryPi) {
      // Check for hardware acceleration support
      this.capabilities.hasOMX = await this.checkOMXSupport();
      this.capabilities.hasV4L2 = await this.checkV4L2Support();

      // Raspberry Pi models generally support H.264 hardware decode
      this.capabilities.supportsH264 = true;

      // Pi 4 and newer support HEVC
      if (platform.model?.includes('Pi 4') || platform.model?.includes('Pi 5')) {
        this.capabilities.supportsHEVC = true;
      }

      // Determine best player
      if (this.capabilities.hasV4L2) {
        this.capabilities.recommendedPlayer = 'mpv'; // MPV with V4L2 M2M
      } else if (this.capabilities.hasOMX) {
        this.capabilities.recommendedPlayer = 'omxplayer'; // Legacy OMX player
      } else {
        this.capabilities.recommendedPlayer = 'vlc'; // Fallback to VLC
      }
    } else if (platform.isLinux) {
      // Generic Linux - assume software decoding
      this.capabilities.supportsH264 = true;
      this.capabilities.supportsHEVC = true;
      this.capabilities.supportsVP9 = true;
      this.capabilities.recommendedPlayer = 'mpv';
    } else {
      // Windows/Mac
      this.capabilities.supportsH264 = true;
      this.capabilities.supportsHEVC = true;
      this.capabilities.supportsVP9 = true;
      this.capabilities.recommendedPlayer = 'mpv';
    }

    console.log('[PlatformDetector] Hardware capabilities:', this.capabilities);
    return this.capabilities;
  }

  /**
   * Detect if running on Raspberry Pi
   */
  private async detectRaspberryPi(): Promise<boolean> {
    try {
      // Method 1: Check /proc/device-tree/model
      if (existsSync('/proc/device-tree/model')) {
        const model = readFileSync('/proc/device-tree/model', 'utf-8');
        if (model.toLowerCase().includes('raspberry pi')) {
          return true;
        }
      }

      // Method 2: Check /proc/cpuinfo
      if (existsSync('/proc/cpuinfo')) {
        const cpuinfo = readFileSync('/proc/cpuinfo', 'utf-8');
        if (cpuinfo.includes('Raspberry Pi') || cpuinfo.includes('BCM')) {
          return true;
        }
      }

      // Method 3: Check for Broadcom GPU
      const { stdout } = await execAsync('lscpu 2>/dev/null || echo ""');
      if (stdout.includes('ARM') || stdout.includes('aarch64')) {
        // Could be RPi, do further checks
        try {
          const { stdout: gpuCheck } = await execAsync('vcgencmd version 2>/dev/null || echo ""');
          if (gpuCheck.length > 0) {
            return true; // vcgencmd is RPi-specific
          }
        } catch {
          // vcgencmd not available
        }
      }

      return false;
    } catch (error) {
      console.error('[PlatformDetector] Error detecting Raspberry Pi:', error);
      return false;
    }
  }

  /**
   * Get Raspberry Pi model
   */
  private async getRaspberryPiModel(): Promise<string | undefined> {
    try {
      if (existsSync('/proc/device-tree/model')) {
        const model = readFileSync('/proc/device-tree/model', 'utf-8').replace(/\0/g, '').trim();
        return model;
      }

      // Fallback: try to extract from cpuinfo
      if (existsSync('/proc/cpuinfo')) {
        const cpuinfo = readFileSync('/proc/cpuinfo', 'utf-8');
        const match = cpuinfo.match(/Model\s*:\s*(.+)/);
        if (match) {
          return match[1].trim();
        }
      }

      return 'Raspberry Pi (Unknown Model)';
    } catch (error) {
      console.error('[PlatformDetector] Error getting Pi model:', error);
      return undefined;
    }
  }

  /**
   * Detect hardware acceleration support
   */
  private async detectHardwareAcceleration(): Promise<boolean> {
    try {
      // Check for GPU device files
      const hasVideoCore = existsSync('/dev/vchiq') || existsSync('/dev/video10');
      const hasV4L2 = existsSync('/dev/video11') || existsSync('/dev/video12');
      
      return hasVideoCore || hasV4L2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get GPU information
   */
  private async getGPUInfo(): Promise<string | undefined> {
    try {
      // Try vcgencmd (RPi-specific tool)
      const { stdout } = await execAsync('vcgencmd get_mem gpu 2>/dev/null || echo ""');
      if (stdout.trim()) {
        return stdout.trim();
      }

      return 'VideoCore GPU';
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check for OpenMAX (OMX) support (legacy, Pi 3 and earlier)
   */
  private async checkOMXSupport(): Promise<boolean> {
    try {
      // Check if omxplayer is installed
      const { stdout } = await execAsync('which omxplayer 2>/dev/null || echo ""');
      if (stdout.trim()) {
        return true;
      }

      // Check for OMX library files
      return existsSync('/opt/vc/lib/libopenmaxil.so');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for V4L2 M2M support (Pi 4 and newer)
   */
  private async checkV4L2Support(): Promise<boolean> {
    try {
      // Check for V4L2 decoder device nodes
      const hasH264Decoder = existsSync('/dev/video10'); // H.264 decoder
      const hasHEVCDecoder = existsSync('/dev/video11'); // HEVC decoder
      
      return hasH264Decoder || hasHEVCDecoder;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get optimal MPV configuration for the platform
   */
  async getMPVConfig(): Promise<string[]> {
    const platform = await this.detectPlatform();
    const capabilities = await this.getHardwareCapabilities();

    const config: string[] = [];

    if (platform.isRaspberryPi) {
      if (capabilities.hasV4L2) {
        // Raspberry Pi 4+ with V4L2 M2M
        config.push('--hwdec=v4l2m2m-copy');
        config.push('--vo=gpu');
        config.push('--gpu-context=drm');
      } else if (capabilities.hasOMX) {
        // Raspberry Pi 3 and earlier with OMX
        config.push('--hwdec=rpi');
        config.push('--vo=gpu');
      } else {
        // Software decoding fallback
        config.push('--hwdec=no');
        config.push('--vo=gpu');
      }

      // Raspberry Pi optimizations
      config.push('--cache=yes');
      config.push('--cache-secs=10');
      config.push('--demuxer-max-bytes=50M');
      config.push('--demuxer-max-back-bytes=20M');
    } else {
      // Desktop/other platforms - use auto detection
      config.push('--hwdec=auto-safe');
      config.push('--vo=gpu');
    }

    return config;
  }

  /**
   * Check if running in kiosk/TV mode environment
   */
  isKioskEnvironment(): boolean {
    // Check for environment variables indicating kiosk mode
    const isKiosk = process.env.HOSER_KIOSK_MODE === 'true' ||
                    process.env.DISPLAY === ':0' ||
                    !process.env.DISPLAY; // Headless

    return isKiosk;
  }

  /**
   * Get recommended database path for the platform
   */
  getDatabasePath(): string {
    const currentPlatform = os.platform();
    
    if (this.platformInfo) {
      if (this.platformInfo.isLinux) {
        // Linux: Use XDG Base Directory specification
        const xdgDataHome = process.env.XDG_DATA_HOME || `${os.homedir()}/.local/share`;
        return `${xdgDataHome}/hoser-video`;
      } else if (this.platformInfo.isWindows) {
        // Windows: Use AppData
        return process.env.APPDATA ? `${process.env.APPDATA}/hoser-video` : '';
      } else {
        // macOS: Use Application Support
        return `${os.homedir()}/Library/Application Support/hoser-video`;
      }
    } else {
      // Fallback when platformInfo is not initialized
      if (currentPlatform === 'linux') {
        const xdgDataHome = process.env.XDG_DATA_HOME || `${os.homedir()}/.local/share`;
        return `${xdgDataHome}/hoser-video`;
      } else if (currentPlatform === 'win32') {
        return process.env.APPDATA ? `${process.env.APPDATA}/hoser-video` : '';
      } else {
        return `${os.homedir()}/Library/Application Support/hoser-video`;
      }
    }
  }
}

// Singleton instance
export const platformDetector = new PlatformDetector();
