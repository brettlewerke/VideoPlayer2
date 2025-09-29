/**
 * Windows dependency verification and repair service
 * Checks for required DLLs and provides repair options for MPV/ffmpeg issues
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { platform, arch } from 'os';
import { spawn } from 'child_process';
import { app } from 'electron';

export interface DependencyCheckResult {
  success: boolean;
  error?: string;
  missingDlls?: string[];
  mpvPath?: string;
  mpvVersion?: string;
}

export interface RepairOptions {
  action: 'fix-now' | 'switch-libvlc' | 'manual';
}

export class DependencyChecker {
  private manifestPath: string;
  private vendorDir: string;

  constructor() {
    // In packaged app, resources are in app.asar or resources folder
    const isPackaged = app.isPackaged;
    this.vendorDir = isPackaged
      ? join(process.resourcesPath, 'vendor')
      : join(__dirname, '..', '..', '..', 'vendor');

    this.manifestPath = join(this.vendorDir, 'manifest.json');
  }

  /**
   * Check if all required dependencies are present and loadable
   */
  async checkDependencies(): Promise<DependencyCheckResult> {
    // Only perform checks on Windows
    if (platform() !== 'win32') {
      return { success: true };
    }

    try {
      // Load manifest
      const manifest = this.loadManifest();
      if (!manifest.binaries.mpv.available) {
        return {
          success: false,
          error: 'MPV binary not available in manifest'
        };
      }

      // Get MPV executable path
      const mpvPath = join(this.vendorDir, manifest.binaries.mpv.path);
      if (!existsSync(mpvPath)) {
        return {
          success: false,
          error: `MPV executable not found at ${mpvPath}`
        };
      }

      // Try to load MPV and check for missing dependencies
      const checkResult = await this.testMpvLoadability(mpvPath);

      return {
        success: checkResult.success,
        error: checkResult.error,
        missingDlls: checkResult.missingDlls,
        mpvPath,
        mpvVersion: manifest.binaries.mpv.version
      };

    } catch (error) {
      return {
        success: false,
        error: `Dependency check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Load the vendor manifest
   */
  private loadManifest(): any {
    if (!existsSync(this.manifestPath)) {
      throw new Error('Vendor manifest not found');
    }

    const manifestData = readFileSync(this.manifestPath, 'utf-8');
    return JSON.parse(manifestData);
  }

  /**
   * Test if MPV can be loaded by attempting to run it with --version
   * This will fail if required DLLs are missing
   */
  private async testMpvLoadability(mpvPath: string): Promise<{success: boolean, error?: string, missingDlls?: string[]}> {
    return new Promise((resolve) => {
      const child = spawn(mpvPath, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // MPV loaded successfully
          resolve({ success: true });
        } else {
          // Check stderr for specific DLL errors
          const errorOutput = stderr.toLowerCase();
          if (errorOutput.includes('ffmpeg.dll') || errorOutput.includes('dll was not found')) {
            const missingDlls = this.extractMissingDlls(stderr);
            resolve({
              success: false,
              error: 'The code execution cannot proceed because ffmpeg.dll was not found. The issue is that the ffmpeg.dll file is missing from your MPV installation. MPV typically comes bundled with FFmpeg, but in your case, it seems like the FFmpeg DLL is not present.',
              missingDlls
            });
          } else {
            resolve({
              success: false,
              error: `MPV failed to start: ${stderr || 'Unknown error'}`
            });
          }
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to execute MPV: ${error.message}`
        });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          error: 'MPV test timed out'
        });
      }, 10000);
    });
  }

  /**
   * Extract missing DLL names from error output
   */
  private extractMissingDlls(errorOutput: string): string[] {
    const dllPattern = /(\w+\.dll)/gi;
    const matches = errorOutput.match(dllPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Get expected FFmpeg DLLs for the current MPV version
   */
  getExpectedFfmpegDlls(): string[] {
    // Common FFmpeg DLLs that MPV might need
    return [
      'ffmpeg.dll',
      'avcodec-*.dll',
      'avformat-*.dll',
      'avutil-*.dll',
      'avfilter-*.dll',
      'avdevice-*.dll',
      'swresample-*.dll',
      'swscale-*.dll'
    ];
  }

  /**
   * Check if libVLC is available as an alternative backend
   */
  async isLibVlcAvailable(): Promise<boolean> {
    try {
      const manifest = this.loadManifest();
      return manifest.binaries.libvlc?.available === true;
    } catch {
      return false;
    }
  }

  /**
   * Get the vendor directory path
   */
  getVendorDir(): string {
    return this.vendorDir;
  }

  /**
   * Get the platform/architecture string for downloads
   */
  getPlatformArch(): string {
    return `${platform()}-${arch()}`;
  }
}