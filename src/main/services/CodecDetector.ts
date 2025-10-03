/**
 * Codec Detection Service
 * Detects audio/video codecs in media files to determine player compatibility
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface CodecInfo {
  videoCodec: string | null;
  audioCodec: string | null;
  isSupported: boolean;
  requiresExternalPlayer: boolean;
  reason?: string;
}

// Codecs that Chromium/Electron HTML5 video DOES NOT support
const UNSUPPORTED_AUDIO_CODECS = [
  'ac3',      // Dolby Digital
  'eac3',     // Dolby Digital Plus
  'dts',      // DTS
  'dtshd',    // DTS-HD
  'truehd',   // Dolby TrueHD
  'pcm',      // Uncompressed PCM (sometimes)
  'flac',     // FLAC
];

// Codecs that Chromium/Electron HTML5 video DOES support
const SUPPORTED_AUDIO_CODECS = [
  'aac',      // AAC
  'mp3',      // MP3
  'opus',     // Opus
  'vorbis',   // Vorbis
];

export class CodecDetector {
  private ffprobePath: string | null = null;

  constructor() {
    this.findFFprobe();
  }

  /**
   * Find ffprobe executable
   */
  private async findFFprobe(): Promise<void> {
    // Priority order:
    // 1. Bundled ffprobe in vendor directory (packaged with app)
    // 2. ffprobe in system PATH
    // 3. ffprobe next to ffmpeg

    // 1. Check for bundled ffprobe first
    try {
      const isDev = process.env.NODE_ENV === 'development' || !process.resourcesPath;
      
      if (isDev) {
        // Development mode - look in project vendor directory
        const vendorPath = path.join(__dirname, '..', '..', '..', 'vendor', 'ffprobe', 'ffprobe.exe');
        if (require('fs').existsSync(vendorPath)) {
          this.ffprobePath = vendorPath;
          console.log('[CodecDetector] Found bundled ffprobe (dev):', this.ffprobePath);
          return;
        }
      } else {
        // Production mode - look in app resources
        const bundledPath = path.join(process.resourcesPath, 'vendor', 'ffprobe', 'ffprobe.exe');
        if (require('fs').existsSync(bundledPath)) {
          this.ffprobePath = bundledPath;
          console.log('[CodecDetector] Found bundled ffprobe (prod):', this.ffprobePath);
          return;
        }
      }
    } catch (error) {
      console.log('[CodecDetector] Bundled ffprobe not found, checking system PATH...');
    }

    // 2. Try to find ffprobe in PATH
    try {
      const { stdout } = await execAsync('where ffprobe');
      this.ffprobePath = stdout.trim().split('\n')[0];
      console.log('[CodecDetector] Found ffprobe in PATH:', this.ffprobePath);
      return;
    } catch (error) {
      // Not in PATH, continue
    }

    // 3. Try to find ffprobe next to ffmpeg
    try {
      const { stdout } = await execAsync('where ffmpeg');
      const ffmpegPath = stdout.trim().split('\n')[0];
      const ffprobeDir = path.dirname(ffmpegPath);
      this.ffprobePath = path.join(ffprobeDir, 'ffprobe.exe');
      console.log('[CodecDetector] Found ffprobe via ffmpeg:', this.ffprobePath);
      return;
    } catch {
      // ffprobe not found anywhere
    }

    console.warn('[CodecDetector] ⚠️  ffprobe not found. Codec detection will be unavailable.');
    console.warn('[CodecDetector] Videos with unsupported codecs may play without audio.');
    this.ffprobePath = null;
  }

  /**
   * Detect codecs in a video file
   */
  async detectCodecs(filePath: string): Promise<CodecInfo> {
    console.log('[CodecDetector] Detecting codecs for:', filePath);

    // If ffprobe is not available, assume supported (fallback to HTML5)
    if (!this.ffprobePath) {
      console.warn('[CodecDetector] ffprobe not available, assuming supported codecs');
      return {
        videoCodec: null,
        audioCodec: null,
        isSupported: true,
        requiresExternalPlayer: false,
        reason: 'ffprobe not available',
      };
    }

    try {
      // Use ffprobe to get codec information
      const command = `"${this.ffprobePath}" -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.error('[CodecDetector] ffprobe stderr:', stderr);
      }

      const audioCodec = stdout.trim().toLowerCase();
      
      console.log('[CodecDetector] Detected audio codec:', audioCodec || 'none');

      // Also get video codec for logging
      const videoCommand = `"${this.ffprobePath}" -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      const { stdout: videoStdout } = await execAsync(videoCommand);
      const videoCodec = videoStdout.trim().toLowerCase();
      
      console.log('[CodecDetector] Detected video codec:', videoCodec || 'none');

      // Check if audio codec is unsupported by Chromium
      const isUnsupported = UNSUPPORTED_AUDIO_CODECS.some(codec => 
        audioCodec.includes(codec)
      );

      if (isUnsupported) {
        console.log(`[CodecDetector] ❌ Unsupported audio codec: ${audioCodec} - requires external player`);
        return {
          videoCodec: videoCodec || null,
          audioCodec: audioCodec || null,
          isSupported: false,
          requiresExternalPlayer: true,
          reason: `Chromium does not support ${audioCodec} audio codec`,
        };
      }

      console.log(`[CodecDetector] ✅ Supported audio codec: ${audioCodec} - can use HTML5`);
      return {
        videoCodec: videoCodec || null,
        audioCodec: audioCodec || null,
        isSupported: true,
        requiresExternalPlayer: false,
      };

    } catch (error) {
      console.error('[CodecDetector] Error detecting codecs:', error);
      // On error, assume supported (fallback to HTML5, let it fail if needed)
      return {
        videoCodec: null,
        audioCodec: null,
        isSupported: true,
        requiresExternalPlayer: false,
        reason: `Error detecting codecs: ${error}`,
      };
    }
  }

  /**
   * Check if a specific codec is supported by Chromium
   */
  isCodecSupported(codecName: string): boolean {
    const codec = codecName.toLowerCase();
    return SUPPORTED_AUDIO_CODECS.some(supported => codec.includes(supported));
  }
}

// Singleton instance
export const codecDetector = new CodecDetector();
