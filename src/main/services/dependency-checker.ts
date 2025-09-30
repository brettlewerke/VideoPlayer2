/**
 * Dependency checker for Windows FFmpeg/libVLC dependencies
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { platform } from 'os';
import { app } from 'electron';
import type { DependencyCheckResult } from '../../shared/types.js';

export class DependencyChecker {
  private static readonly REQUIRED_DLLS = [
    'ffmpeg.dll',
    'libEGL.dll',
    'libGLESv2.dll',
    'd3dcompiler_47.dll'
  ];

  /**
   * Verify Windows playback dependencies and return detailed diagnostic info
   */
  async verifyWindowsPlaybackDeps(): Promise<DependencyCheckResult> {
    // Only check dependencies on Windows
    if (platform() !== 'win32') {
      return { success: true };
    }

    try {
      // Check if we're in development or packaged
      const isDev = !app.isPackaged;
      const appPath = isDev ? process.cwd() : process.resourcesPath;

      // Find MPV executable
      const mpvPath = await this.findMpvExecutable(appPath);
      if (!mpvPath) {
        return {
          success: false,
          error: 'MPV executable not found. Please install MPV player.',
          mpvPath: undefined,
          missingDlls: DependencyChecker.REQUIRED_DLLS
        };
      }

      // Check for required DLLs next to MPV executable
      const mpvDir = join(mpvPath, '..');
      const missingDlls: string[] = [];

      for (const dll of DependencyChecker.REQUIRED_DLLS) {
        const dllPath = join(mpvDir, dll);
        if (!existsSync(dllPath)) {
          missingDlls.push(dll);
        }
      }

      // Get MPV version for diagnostics
      const mpvVersion = await this.getMpvVersion(mpvPath);

      if (missingDlls.length > 0) {
        const error = `Missing required DLLs next to MPV executable: ${missingDlls.join(', ')}. MPV executable found at: ${mpvPath}`;
        return {
          success: false,
          error,
          mpvPath,
          mpvVersion,
          missingDlls
        };
      }

      return {
        success: true,
        mpvPath,
        mpvVersion
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during dependency verification'
      };
    }
  }

  async checkDependencies(): Promise<DependencyCheckResult> {
    // Only check dependencies on Windows
    if (platform() !== 'win32') {
      return { success: true };
    }

    try {
      // Check if we're in development or packaged
      const isDev = !app.isPackaged;
      const appPath = isDev ? process.cwd() : process.resourcesPath;

      // Check for required DLLs in application directory
      const missingDlls: string[] = [];
      for (const dll of DependencyChecker.REQUIRED_DLLS) {
        const dllPath = join(appPath, dll);
        if (!existsSync(dllPath)) {
          missingDlls.push(dll);
        }
      }

      // Check for MPV executable
      const mpvPath = await this.findMpvExecutable(appPath);
      let mpvVersion: string | undefined;

      if (mpvPath) {
        mpvVersion = await this.getMpvVersion(mpvPath);
      }

      // Determine if setup is successful
      const success = missingDlls.length === 0 && mpvPath !== null;

      if (!success) {
        let error = 'Missing required dependencies for video playback. ';
        if (missingDlls.length > 0) {
          error += `Missing DLLs: ${missingDlls.join(', ')}. `;
        }
        if (!mpvPath) {
          error += 'MPV executable not found. ';
        }
        error += 'Please install the required dependencies or use the repair option.';

        return {
          success: false,
          error,
          missingDlls,
          mpvPath: mpvPath || undefined,
          mpvVersion
        };
      }

      return {
        success: true,
        mpvPath: mpvPath || undefined,
        mpvVersion
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during dependency check'
      };
    }
  }

  private async findMpvExecutable(basePath: string): Promise<string | null> {
    // Common locations for MPV executable
    const possiblePaths = [
      join(basePath, 'vendor', 'win32', 'mpv.exe'),
      join(basePath, 'vendor', 'win32-x64', 'mpv.exe'),
      join(basePath, 'resources', 'vendor', 'win32', 'mpv.exe'),
      join(basePath, 'resources', 'vendor', 'win32-x64', 'mpv.exe'),
      'mpv.exe' // Check system PATH
    ];

    for (const path of possiblePaths) {
      if (path === 'mpv.exe') {
        // Check if mpv is in system PATH
        const hasSystemMpv = await this.checkSystemMpv();
        if (hasSystemMpv) {
          return 'mpv.exe';
        }
      } else if (existsSync(path)) {
        return path;
      }
    }

    return null;
  }

  private async checkSystemMpv(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('where', ['mpv.exe'], {
        shell: true,
        stdio: 'pipe'
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  private async getMpvVersion(mpvPath: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const child = spawn(mpvPath, ['--version'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Extract version from output (e.g., "mpv 0.35.1")
          const match = output.match(/mpv\s+(\d+\.\d+\.\d+)/);
          resolve(match ? match[1] : undefined);
        } else {
          resolve(undefined);
        }
      });

      child.on('error', () => {
        resolve(undefined);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        child.kill();
        resolve(undefined);
      }, 5000);
    });
  }
}