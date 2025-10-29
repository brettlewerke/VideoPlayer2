/**
 * Poster Fetcher Service
 * Automatically fetches movie and TV show posters from OMDb API
 * Downloads and stores them locally on each drive in individual folders per movie/show
 */

import { createWriteStream, existsSync, mkdirSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { get as httpsGet } from 'https';
import { pipeline } from 'stream/promises';
import { IncomingMessage } from 'http';
import { BrowserWindow } from 'electron';
import { DatabaseManager } from '../database/database.js';
import { IPC_CHANNELS } from '../../common/ipc-channels.js';
import type { Movie, Show, Season, Episode } from '../../shared/types.js';

interface PosterFetchResult {
  success: boolean;
  posterUrl?: string;
  localPath?: string;
  error?: string;
}

interface OMDbResponse {
  Title: string;
  Year: string;
  Poster: string;
  Response: string;
  Error?: string;
}

export class PosterFetcher {
  private readonly OMDB_API_KEY = '9eb1750b';
  private readonly OMDB_BASE_URL = 'https://www.omdbapi.com/';
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private readonly MAX_CONCURRENT_DOWNLOADS = 3; // Limit concurrent API calls
  private readonly RETRY_DELAY_MS = 1000; // Delay between batches
  private fetchQueue: Map<string, Promise<PosterFetchResult>> = new Map();
  private isRunning: boolean = false;
  private mainWindow: BrowserWindow | null = null;

  constructor(private database: DatabaseManager) {}
  
  /**
   * Set the main window reference for sending events
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Sanitize a string for use in a filename
   */
  private sanitizeFilename(name: string): string {
    // Remove or replace invalid filename characters
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/__+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50); // Limit length
  }

  /**
   * Make an HTTPS GET request and return the response body as JSON
   */
  private async fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      httpsGet(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
        }
      }, (response: IncomingMessage) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          let redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Handle relative URLs
            if (redirectUrl.startsWith('/')) {
              const urlObj = new URL(url);
              redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
            }
            this.fetchJson(redirectUrl).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Failed to parse JSON response'));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Download a file from a URL to a local path
   */
  private async downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      httpsGet(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
        }
      }, (response: IncomingMessage) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          let redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Handle relative URLs
            if (redirectUrl.startsWith('/')) {
              const urlObj = new URL(url);
              redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
            }
            this.downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const fileStream = createWriteStream(destPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        
        fileStream.on('error', (err) => {
          unlinkSync(destPath);
          reject(err);
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch posters for all media that doesn't have one yet
   * Runs in background with concurrency control - does not block
   */
  async fetchAllMissingPosters(): Promise<void> {
    if (this.isRunning) {
      console.log('[PosterFetcher] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('[PosterFetcher] Starting background poster fetch...');

    try {
      // Get all movies without posters
      const movies = await this.database.getMovies();
      const moviesNeedingPosters = movies.filter(m => !m.rottenTomatoesPosterPath);

      console.log(`[PosterFetcher] Found ${moviesNeedingPosters.length} movies needing posters`);

      // Process movies in batches with concurrency control
      await this.processBatch(
        moviesNeedingPosters,
        (movie) => this.fetchMoviePoster(movie)
      );

      // Get all shows without posters
      const shows = await this.database.getShows();
      const showsNeedingPosters = shows.filter(s => !s.rottenTomatoesPosterPath);

      console.log(`[PosterFetcher] Found ${showsNeedingPosters.length} shows needing posters`);

      // Process shows in batches with concurrency control
      await this.processBatch(
        showsNeedingPosters,
        (show) => this.fetchShowPoster(show)
      );

      console.log('[PosterFetcher] Background poster fetch completed');
    } catch (error) {
      // Silent fail - log but don't throw
      console.error('[PosterFetcher] Error during background poster fetch:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process items in batches with concurrency control
   */
  private async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<PosterFetchResult>
  ): Promise<void> {
    for (let i = 0; i < items.length; i += this.MAX_CONCURRENT_DOWNLOADS) {
      const batch = items.slice(i, i + this.MAX_CONCURRENT_DOWNLOADS);
      
      // Process batch concurrently
      await Promise.allSettled(
        batch.map(item => processor(item))
      );

      // Small delay between batches to respect API rate limits
      if (i + this.MAX_CONCURRENT_DOWNLOADS < items.length) {
        await this.delay(this.RETRY_DELAY_MS);
      }
    }
  }

  /**
   * Fetch poster for a specific movie
   */
  async fetchMoviePoster(movie: Movie): Promise<PosterFetchResult> {
    const cacheKey = `movie-${movie.id}`;
    
    // Check if already fetching
    if (this.fetchQueue.has(cacheKey)) {
      return this.fetchQueue.get(cacheKey)!;
    }

    const fetchPromise = this.doFetchMoviePoster(movie);
    this.fetchQueue.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      this.fetchQueue.delete(cacheKey);
    }
  }

  private async doFetchMoviePoster(movie: Movie): Promise<PosterFetchResult> {
    try {
      // Query OMDb API (silently fail on network errors)
      const posterUrl = await this.fetchPosterFromOMDb(movie.title, movie.year, 'movie');

      if (!posterUrl) {
        // Silent fail - no logging for missing posters
        return { success: false, error: 'No poster found' };
      }

      // Download and save poster in movie-specific folder
      const sanitizedTitle = this.sanitizeFilename(movie.title);
      const folderName = movie.year ? `${sanitizedTitle}_${movie.year}` : sanitizedTitle;
      const localPath = await this.downloadPoster(posterUrl, movie.driveId, folderName, 'poster');

      if (!localPath) {
        return { success: false, error: 'Failed to download poster' };
      }

      // Update database
      await this.database.updateMoviePoster(movie.id, localPath);

      console.log(`[PosterFetcher] ✓ Downloaded poster: ${movie.title}`);
      
      // Notify renderer that poster was updated
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.LIBRARY_POSTER_UPDATED, {
          type: 'movie',
          id: movie.id,
          posterPath: localPath
        });
      }
      
      return { success: true, posterUrl, localPath };
    } catch (error) {
      // Silent fail - only log in debug mode
      // console.error(`[PosterFetcher] Error fetching poster for ${movie.title}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Fetch poster for a TV show
   */
  async fetchShowPoster(show: Show): Promise<PosterFetchResult> {
    const cacheKey = `show-${show.id}`;
    
    if (this.fetchQueue.has(cacheKey)) {
      return this.fetchQueue.get(cacheKey)!;
    }

    const fetchPromise = this.doFetchShowPoster(show);
    this.fetchQueue.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      this.fetchQueue.delete(cacheKey);
    }
  }

  private async doFetchShowPoster(show: Show): Promise<PosterFetchResult> {
    try {
      // Query OMDb API for TV series (silently fail on network errors)
      const posterUrl = await this.fetchPosterFromOMDb(show.title, undefined, 'series');

      if (!posterUrl) {
        // Silent fail - no logging for missing posters
        return { success: false, error: 'No poster found' };
      }

      // Download and save poster in show-specific folder
      const sanitizedTitle = this.sanitizeFilename(show.title);
      const folderName = sanitizedTitle;
      const localPath = await this.downloadPoster(posterUrl, show.driveId, folderName, 'poster');

      if (!localPath) {
        return { success: false, error: 'Failed to download poster' };
      }

      await this.database.updateShowPoster(show.id, localPath);

      console.log(`[PosterFetcher] ✓ Downloaded poster: ${show.title}`);
      
      // Notify renderer that poster was updated
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.LIBRARY_POSTER_UPDATED, {
          type: 'show',
          id: show.id,
          posterPath: localPath
        });
      }
      
      return { success: true, posterUrl, localPath };
    } catch (error) {
      // Silent fail - only log in debug mode
      // console.error(`[PosterFetcher] Error fetching poster for ${show.title}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Fetch poster URL from OMDb API
   */
  private async fetchPosterFromOMDb(title: string, year?: number, type?: 'movie' | 'series'): Promise<string | null> {
    try {
      // Build OMDb API URL
      let apiUrl = `${this.OMDB_BASE_URL}?apikey=${this.OMDB_API_KEY}&t=${encodeURIComponent(title)}`;
      
      if (year) {
        apiUrl += `&y=${year}`;
      }
      
      if (type) {
        apiUrl += `&type=${type}`;
      }

      console.log(`[PosterFetcher] Querying OMDb API for: ${title}`);

      const response = await this.fetchJson(apiUrl) as OMDbResponse;

      if (response.Response === 'False') {
        console.log(`[PosterFetcher] OMDb API error: ${response.Error || 'Unknown error'}`);
        return null;
      }

      if (!response.Poster || response.Poster === 'N/A') {
        console.log(`[PosterFetcher] No poster available for: ${title}`);
        return null;
      }

      console.log(`[PosterFetcher] Found poster via OMDb API: ${response.Poster}`);
      return response.Poster;
    } catch (error: any) {
      console.error(`[PosterFetcher] Error fetching from OMDb API:`, error);
      return null;
    }
  }

  /**
   * Download poster image and save to drive in a dedicated folder
   */
  private async downloadPoster(
    posterUrl: string,
    driveId: string,
    folderName: string,
    filename: string
  ): Promise<string | null> {
    try {
      // Get drive mount path
      const drives = await this.database.getDrives();
      const drive = drives.find(d => d.id === driveId);

      if (!drive) {
        console.error(`[PosterFetcher] Drive not found: ${driveId}`);
        return null;
      }

      // Create movie/show-specific directory inside .hoser-video/posters/
      const posterDir = join(drive.mountPath, '.hoser-video', 'posters', folderName);
      if (!existsSync(posterDir)) {
        mkdirSync(posterDir, { recursive: true });
      }

      // Determine file extension from URL
      const ext = posterUrl.includes('.jpg') || posterUrl.includes('jpeg') ? '.jpg' : '.png';
      const filePath = join(posterDir, `${filename}${ext}`);

      console.log(`[PosterFetcher] Downloading poster to: ${filePath}`);

      // Download image using our custom download function
      await this.downloadFile(posterUrl, filePath);

      console.log(`[PosterFetcher] Poster downloaded successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`[PosterFetcher] Error downloading poster:`, error);
      return null;
    }
  }

  /**
   * Delete poster folder for a movie
   */
  async deleteMoviePoster(movie: Movie): Promise<void> {
    if (movie.rottenTomatoesPosterPath && existsSync(movie.rottenTomatoesPosterPath)) {
      try {
        // Get the parent folder (the movie-specific folder)
        const posterFolder = join(movie.rottenTomatoesPosterPath, '..');
        
        // Delete the entire folder
        if (existsSync(posterFolder)) {
          const files = readdirSync(posterFolder);
          for (const file of files) {
            unlinkSync(join(posterFolder, file));
          }
          rmdirSync(posterFolder);
          console.log(`[PosterFetcher] Deleted poster folder: ${posterFolder}`);
        }
      } catch (error) {
        console.error(`[PosterFetcher] Error deleting poster folder:`, error);
      }
    }
  }

  /**
   * Delete poster folder for a show
   */
  async deleteShowPoster(show: Show): Promise<void> {
    if (show.rottenTomatoesPosterPath && existsSync(show.rottenTomatoesPosterPath)) {
      try {
        // Get the parent folder (the show-specific folder)
        const posterFolder = join(show.rottenTomatoesPosterPath, '..');
        
        // Delete the entire folder
        if (existsSync(posterFolder)) {
          const files = readdirSync(posterFolder);
          for (const file of files) {
            unlinkSync(join(posterFolder, file));
          }
          rmdirSync(posterFolder);
          console.log(`[PosterFetcher] Deleted poster folder: ${posterFolder}`);
        }
      } catch (error) {
        console.error(`[PosterFetcher] Error deleting poster folder:`, error);
      }
    }
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
