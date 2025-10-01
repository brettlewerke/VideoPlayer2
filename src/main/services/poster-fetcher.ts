/**
 * Poster Fetcher Service
 * Automatically fetches movie and TV show posters from Rotten Tomatoes
 * Downloads and stores them locally on each drive
 */

import { JSDOM } from 'jsdom';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { get as httpsGet } from 'https';
import { pipeline } from 'stream/promises';
import { IncomingMessage } from 'http';
import { DatabaseManager } from '../database/database.js';
import type { Movie, Show, Season, Episode } from '../../shared/types.js';

interface PosterFetchResult {
  success: boolean;
  posterUrl?: string;
  localPath?: string;
  error?: string;
}

export class PosterFetcher {
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private fetchQueue: Map<string, Promise<PosterFetchResult>> = new Map();

  constructor(private database: DatabaseManager) {}

  /**
   * Make an HTTPS GET request and return the response body as a string
   */
  private async fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      httpsGet(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
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
            this.fetchHtml(redirectUrl).then(resolve).catch(reject);
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
          resolve(data);
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
   */
  async fetchAllMissingPosters(): Promise<void> {
    console.log('[PosterFetcher] Starting to fetch missing posters...');

    try {
      // Get all movies without rotten tomatoes posters
      const movies = await this.database.getMovies();
      const moviesNeedingPosters = movies.filter(m => !m.rottenTomatoesPosterPath);

      console.log(`[PosterFetcher] Found ${moviesNeedingPosters.length} movies needing posters`);

      for (const movie of moviesNeedingPosters) {
        await this.fetchMoviePoster(movie);
        // Small delay to avoid overwhelming Rotten Tomatoes
        await this.delay(1000);
      }

      // Get all shows without posters
      const shows = await this.database.getShows();
      const showsNeedingPosters = shows.filter(s => !s.rottenTomatoesPosterPath);

      console.log(`[PosterFetcher] Found ${showsNeedingPosters.length} shows needing posters`);

      for (const show of showsNeedingPosters) {
        await this.fetchShowPoster(show);
        await this.delay(1000);
      }

      console.log('[PosterFetcher] Finished fetching posters');
    } catch (error) {
      console.error('[PosterFetcher] Error fetching posters:', error);
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
      console.log(`[PosterFetcher] Fetching poster for movie: ${movie.title}${movie.year ? ` (${movie.year})` : ''}`);

      // Search Rotten Tomatoes
      const searchUrl = this.buildRottenTomatoesUrl(movie.title, movie.year);
      const posterUrl = await this.scrapePosterFromPage(searchUrl);

      if (!posterUrl) {
        console.log(`[PosterFetcher] No poster found for: ${movie.title}`);
        return { success: false, error: 'No poster found' };
      }

      // Download and save poster
      const localPath = await this.downloadPoster(posterUrl, movie.driveId, `movie-${movie.id}`);

      if (!localPath) {
        return { success: false, error: 'Failed to download poster' };
      }

      // Update database
      await this.database.updateMoviePoster(movie.id, localPath);

      console.log(`[PosterFetcher] Successfully fetched poster for: ${movie.title}`);
      return { success: true, posterUrl, localPath };
    } catch (error) {
      console.error(`[PosterFetcher] Error fetching poster for ${movie.title}:`, error);
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
      console.log(`[PosterFetcher] Fetching poster for show: ${show.title}`);

      // For TV shows, use /tv/ path instead of /m/
      const searchUrl = this.buildRottenTomatoesTVUrl(show.title);
      const posterUrl = await this.scrapePosterFromPage(searchUrl);

      if (!posterUrl) {
        console.log(`[PosterFetcher] No poster found for: ${show.title}`);
        return { success: false, error: 'No poster found' };
      }

      const localPath = await this.downloadPoster(posterUrl, show.driveId, `show-${show.id}`);

      if (!localPath) {
        return { success: false, error: 'Failed to download poster' };
      }

      await this.database.updateShowPoster(show.id, localPath);

      console.log(`[PosterFetcher] Successfully fetched poster for: ${show.title}`);
      return { success: true, posterUrl, localPath };
    } catch (error) {
      console.error(`[PosterFetcher] Error fetching poster for ${show.title}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Build Rotten Tomatoes URL for a movie
   */
  private buildRottenTomatoesUrl(title: string, year?: number): string {
    // Convert title to Rotten Tomatoes URL format
    // Example: "Interstellar" -> "interstellar"
    // Example: "The Matrix" -> "the_matrix"
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscores

    return `https://www.rottentomatoes.com/m/${slug}`;
  }

  /**
   * Build Rotten Tomatoes URL for a TV show
   */
  private buildRottenTomatoesTVUrl(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    return `https://www.rottentomatoes.com/tv/${slug}`;
  }

  /**
   * Scrape poster URL from Rotten Tomatoes page
   */
  private async scrapePosterFromPage(url: string): Promise<string | null> {
    try {
      console.log(`[PosterFetcher] Scraping: ${url}`);

      const html = await this.fetchHtml(url);
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Look for the poster image in rt-img element
      const posterImg = document.querySelector('rt-img[slot="posterImage"]')?.getAttribute('src');
      
      if (posterImg) {
        console.log(`[PosterFetcher] Found poster via rt-img: ${posterImg}`);
        return posterImg;
      }

      // Fallback: Look for other common poster selectors
      const fallbackSelectors = [
        'img[data-qa="poster-image"]',
        'img.posterImage',
        'img[alt*="poster"]',
        '.poster img',
        '[data-qa="poster"] img',
      ];

      for (const selector of fallbackSelectors) {
        const img = document.querySelector(selector)?.getAttribute('src');
        if (img && img.includes('flixster')) {
          console.log(`[PosterFetcher] Found poster via ${selector}: ${img}`);
          return img;
        }
      }

      console.log(`[PosterFetcher] No poster found on page: ${url}`);
      return null;
    } catch (error: any) {
      if (error.message?.includes('404')) {
        console.log(`[PosterFetcher] Page not found (404): ${url}`);
      } else {
        console.error(`[PosterFetcher] Error scraping ${url}:`, error);
      }
      return null;
    }
  }

  /**
   * Download poster image and save to drive
   */
  private async downloadPoster(
    posterUrl: string,
    driveId: string,
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

      // Create posters directory
      const postersDir = join(drive.mountPath, '.hoser-video', 'posters');
      if (!existsSync(postersDir)) {
        mkdirSync(postersDir, { recursive: true });
      }

      // Determine file extension from URL
      const ext = posterUrl.includes('.jpg') || posterUrl.includes('jpeg') ? '.jpg' : '.png';
      const filePath = join(postersDir, `${filename}${ext}`);

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
   * Delete poster file for a movie
   */
  async deleteMoviePoster(movie: Movie): Promise<void> {
    if (movie.rottenTomatoesPosterPath && existsSync(movie.rottenTomatoesPosterPath)) {
      try {
        unlinkSync(movie.rottenTomatoesPosterPath);
        console.log(`[PosterFetcher] Deleted poster: ${movie.rottenTomatoesPosterPath}`);
      } catch (error) {
        console.error(`[PosterFetcher] Error deleting poster:`, error);
      }
    }
  }

  /**
   * Delete poster file for a show
   */
  async deleteShowPoster(show: Show): Promise<void> {
    if (show.rottenTomatoesPosterPath && existsSync(show.rottenTomatoesPosterPath)) {
      try {
        unlinkSync(show.rottenTomatoesPosterPath);
        console.log(`[PosterFetcher] Deleted poster: ${show.rottenTomatoesPosterPath}`);
      } catch (error) {
        console.error(`[PosterFetcher] Error deleting poster:`, error);
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
