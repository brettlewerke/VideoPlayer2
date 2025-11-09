/**
 * Transcoding Service
 * Provides on-the-fly audio transcoding for unsupported codecs
 * Converts AC3, DTS, and other unsupported audio formats to AAC for HTML5 playback
 */

import { spawn, ChildProcess } from 'child_process';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { existsSync } from 'fs';
import { join } from 'path';
import ffmpegStatic from 'ffmpeg-static';

interface TranscodingSession {
  videoPath: string;
  ffmpegProcess: ChildProcess;
  port: number;
  server: Server;
  clients: Set<ServerResponse>;
}

export class TranscodingService {
  private sessions = new Map<string, TranscodingSession>();
  private basePort = 9000; // Start from port 9000 for transcoding servers
  private ffmpegPath: string;

  constructor() {
    // Use bundled ffmpeg
    this.ffmpegPath = ffmpegStatic || 'ffmpeg';
    console.log('[TranscodingService] Using ffmpeg at:', this.ffmpegPath);
  }

  /**
   * Start transcoding a video file and return a local HTTP URL to stream from
   * This transcodes only the audio (AC3/DTS -> AAC) while copying the video stream
   */
  async startTranscoding(videoPath: string, audioCodec: string): Promise<string> {
    if (!existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Check if we already have a session for this file
    const existingSession = this.sessions.get(videoPath);
    if (existingSession) {
      console.log('[TranscodingService] Reusing existing transcoding session:', videoPath);
      return `http://localhost:${existingSession.port}/stream.mp4`;
    }

    // Find an available port
    const port = await this.findAvailablePort(this.basePort);
    
    console.log(`[TranscodingService] Starting transcoding for: ${videoPath}`);
    console.log(`[TranscodingService] Audio codec: ${audioCodec} -> AAC`);
    console.log(`[TranscodingService] Streaming on port: ${port}`);

    // Create HTTP server for streaming
    const server = createServer((req, res) => this.handleStreamRequest(req, res, videoPath));
    
    await new Promise<void>((resolve, reject) => {
      server.listen(port, () => {
        console.log(`[TranscodingService] HTTP server listening on port ${port}`);
        resolve();
      });
      server.on('error', reject);
    });

    // Create session
    const session: TranscodingSession = {
      videoPath,
      ffmpegProcess: null as any, // Will be set when first client connects
      port,
      server,
      clients: new Set(),
    };

    this.sessions.set(videoPath, session);

    return `http://localhost:${port}/stream.mp4`;
  }

  /**
   * Handle HTTP streaming request
   */
  private handleStreamRequest(req: IncomingMessage, res: ServerResponse, videoPath: string): void {
    const session = this.sessions.get(videoPath);
    if (!session) {
      res.writeHead(404);
      res.end('Session not found');
      return;
    }

    console.log(`[TranscodingService] Stream request for: ${videoPath}`);

    // Set response headers for video streaming
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Transfer-Encoding': 'chunked',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Add client to session
    session.clients.add(res);

    // Start ffmpeg process if not already running
    if (!session.ffmpegProcess || session.ffmpegProcess.killed) {
      this.startFFmpegProcess(session, videoPath);
    }

    // Handle client disconnect
    req.on('close', () => {
      console.log('[TranscodingService] Client disconnected');
      session.clients.delete(res);
      
      // If no more clients, stop ffmpeg after a delay
      if (session.clients.size === 0) {
        setTimeout(() => {
          if (session.clients.size === 0) {
            console.log('[TranscodingService] No clients, stopping transcoding');
            this.stopSession(videoPath);
          }
        }, 5000); // 5 second grace period
      }
    });
  }

  /**
   * Start the ffmpeg transcoding process
   */
  private startFFmpegProcess(session: TranscodingSession, videoPath: string): void {
    console.log('[TranscodingService] Starting ffmpeg process...');

    // FFmpeg command to transcode audio while copying video
    // -i input: input file
    // -c:v copy: copy video stream without re-encoding (fast)
    // -c:a aac: transcode audio to AAC
    // -b:a 192k: audio bitrate 192kbps
    // -movflags frag_keyframe+empty_moov: enable streaming for MP4
    // -f mp4: output format
    // pipe:1: output to stdout
    const args = [
      '-i', videoPath,
      '-c:v', 'copy',           // Copy video stream (no re-encoding)
      '-c:a', 'aac',            // Transcode audio to AAC
      '-b:a', '192k',           // Audio bitrate
      '-ac', '2',               // Stereo output
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof', // Enable streaming
      '-f', 'mp4',              // Output format
      'pipe:1'                   // Output to stdout
    ];

    console.log('[TranscodingService] FFmpeg command:', this.ffmpegPath, args.join(' '));

    const ffmpeg = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'], // stdin, stdout, stderr
    });

    session.ffmpegProcess = ffmpeg;

    // Pipe ffmpeg output to all connected clients
    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      session.clients.forEach((client) => {
        try {
          client.write(chunk);
        } catch (error) {
          console.error('[TranscodingService] Error writing to client:', error);
          session.clients.delete(client);
        }
      });
    });

    // Log ffmpeg stderr for debugging
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      if (message.includes('error') || message.includes('Error')) {
        console.error('[TranscodingService] FFmpeg error:', message);
      } else {
        // Log progress occasionally (every 100th message to avoid spam)
        if (Math.random() < 0.01) {
          console.log('[TranscodingService] FFmpeg progress:', message.trim());
        }
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(`[TranscodingService] FFmpeg process exited with code ${code}`);
      
      // Close all client connections
      session.clients.forEach((client) => {
        try {
          client.end();
        } catch (error) {
          console.error('[TranscodingService] Error closing client:', error);
        }
      });
      session.clients.clear();
    });

    ffmpeg.on('error', (error) => {
      console.error('[TranscodingService] FFmpeg process error:', error);
    });
  }

  /**
   * Stop a transcoding session
   */
  stopSession(videoPath: string): void {
    const session = this.sessions.get(videoPath);
    if (!session) return;

    console.log('[TranscodingService] Stopping session for:', videoPath);

    // Kill ffmpeg process
    if (session.ffmpegProcess && !session.ffmpegProcess.killed) {
      session.ffmpegProcess.kill('SIGTERM');
      setTimeout(() => {
        if (session.ffmpegProcess && !session.ffmpegProcess.killed) {
          session.ffmpegProcess.kill('SIGKILL');
        }
      }, 2000);
    }

    // Close HTTP server
    session.server.close(() => {
      console.log('[TranscodingService] HTTP server closed');
    });

    // Close all client connections
    session.clients.forEach((client) => {
      try {
        client.end();
      } catch (error) {
        console.error('[TranscodingService] Error closing client:', error);
      }
    });

    this.sessions.delete(videoPath);
  }

  /**
   * Stop all transcoding sessions
   */
  stopAll(): void {
    console.log('[TranscodingService] Stopping all transcoding sessions');
    this.sessions.forEach((_, videoPath) => {
      this.stopSession(videoPath);
    });
  }

  /**
   * Find an available port starting from the given port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      
      server.listen(startPort, () => {
        const port = (server.address() as any).port;
        server.close(() => resolve(port));
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Port is in use, try next one
          resolve(this.findAvailablePort(startPort + 1));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Check if a video needs transcoding
   */
  needsTranscoding(audioCodec: string | null): boolean {
    if (!audioCodec) return false;
    
    const unsupportedCodecs = ['ac3', 'eac3', 'dts', 'dtshd', 'truehd', 'pcm', 'flac'];
    return unsupportedCodecs.some(codec => audioCodec.toLowerCase().includes(codec));
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo(): Array<{ videoPath: string; port: number; clients: number }> {
    return Array.from(this.sessions.entries()).map(([videoPath, session]) => ({
      videoPath,
      port: session.port,
      clients: session.clients.size,
    }));
  }
}

// Singleton instance
export const transcodingService = new TranscodingService();
