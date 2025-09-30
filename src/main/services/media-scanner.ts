/**
 * Media scanner for discovering and indexing video files
 */

import { EventEmitter } from 'events';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, basename, dirname, extname } from 'path';
import { DatabaseManager } from '../database/database.js';
import { 
  isVideoFile, 
  shouldIgnore, 
  isMoviesFolder, 
  isTVShowsFolder, 
  parseMovieTitle, 
  parseEpisodeInfo, 
  parseSeasonNumber, 
  generateMediaId,
  findPrimaryVideoFile,
  findSubtitleFiles,
  findArtworkFiles,
  normalizePath
} from '../../shared/utils.js';
import type { 
  Movie, 
  Show, 
  Season, 
  Episode, 
  Drive, 
  MediaFile, 
  ScanProgress, 
  ScanResult 
} from '../../shared/types.js';

export class MediaScanner extends EventEmitter {
  private isScanning = false;
  private currentScanProgress: ScanProgress | null = null;

  constructor(private database: DatabaseManager) {
    super();
  }

  async initialize(): Promise<void> {
    console.log('Media scanner initializing...');
    
    // Automatically scan all detected drives on startup
    try {
      await this.scanAllDrives();
      console.log('Media scanner initialized and initial scan completed');
    } catch (error) {
      console.error('Error during initial media scan:', error);
      // Don't throw - app should still start even if scan fails
    }
  }

  async scanAllDrives(): Promise<void> {
    if (this.isScanning) {
      console.warn('Scan already in progress');
      return;
    }

    try {
      const drives = await this.database.getDrives();
      const connectedDrives = drives.filter(drive => drive.isConnected);
      
      console.log(`Starting scan of ${connectedDrives.length} connected drives`);
      
      for (const drive of connectedDrives) {
        await this.scanDrive(drive);
      }
      
      console.log('Scan of all drives completed');
    } catch (error) {
      console.error('Failed to scan drives:', error);
      throw error;
    }
  }

  async scanDrive(drive: Drive): Promise<ScanResult> {
    if (this.isScanning) {
      throw new Error('Scanner is already running');
    }

    this.isScanning = true;
    
    try {
      console.log(`Scanning drive: ${drive.label} (${drive.mountPath})`);
      
      const result = await this.performScan(drive);
      
      // Update drive's last scanned timestamp (use updateDriveLastScanned to avoid CASCADE DELETE)
      await this.database.updateDriveLastScanned(drive.id, new Date());
      
      console.log(`Scan completed for drive ${drive.label}:`, {
        movies: result.movies.length,
        shows: result.shows.length,
        seasons: result.seasons.length,
        episodes: result.episodes.length,
        errors: result.errors.length,
      });
      
      return result;
    } finally {
      this.isScanning = false;
      this.currentScanProgress = null;
    }
  }

  async scanPath(path: string): Promise<void> {
    if (!existsSync(path)) {
      throw new Error(`Path does not exist: ${path}`);
    }

    console.log(`Scanning path: ${path}`);
    
    // Create a temporary drive entry for this path
    const tempDrive: Drive = {
      id: generateMediaId('temp', path, 0, Date.now()),
      label: basename(path),
      mountPath: path,
      isRemovable: false,
      isConnected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.scanDrive(tempDrive);
  }

  private async performScan(drive: Drive): Promise<ScanResult> {
    const result: ScanResult = {
      movies: [],
      shows: [],
      seasons: [],
      episodes: [],
      errors: [],
    };

    try {
      // Initialize progress tracking
      this.currentScanProgress = {
        driveId: drive.id,
        driveName: drive.label,
        totalFiles: 0,
        processedFiles: 0,
        isComplete: false,
      };

      // Look for Movies and TV Shows folders at ROOT LEVEL ONLY
      console.log(`=== Scanning drive: ${drive.label} at ${drive.mountPath} ===`);
      const rootEntries = this.getDirectoryEntries(drive.mountPath);
      console.log(`Found ${rootEntries.length} entries at root:`, rootEntries);
      
      for (const entry of rootEntries) {
        const entryPath = join(drive.mountPath, entry);
        
        if (!this.isDirectory(entryPath)) {
          console.log(`  Skipping "${entry}" - not a directory`);
          continue;
        }

        console.log(`  Checking directory: "${entry}"`);
        const isMovies = isMoviesFolder(entry);
        const isTVShows = isTVShowsFolder(entry);
        console.log(`    isMoviesFolder("${entry}") = ${isMovies}`);
        console.log(`    isTVShowsFolder("${entry}") = ${isTVShows}`);

        if (isMovies) {
          console.log(`✓ Found Movies folder: ${entryPath}`);
          const movies = await this.scanMoviesFolder(entryPath, drive);
          result.movies.push(...movies);
        } else if (isTVShows) {
          console.log(`✓ Found TV Shows folder: ${entryPath}`);
          const scanResult = await this.scanTVShowsFolder(entryPath, drive);
          result.shows.push(...scanResult.shows);
          result.seasons.push(...scanResult.seasons);
          result.episodes.push(...scanResult.episodes);
        }
      }

      // Save results to database
      await this.saveResults(result);
      
      this.currentScanProgress.isComplete = true;
      this.emit('scanProgress', this.currentScanProgress);
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('Scan error:', error);
    }

    return result;
  }

  private async scanMoviesFolder(moviesPath: string, drive: Drive): Promise<Movie[]> {
    const movies: Movie[] = [];
    
    try {
      const movieFolders = this.getDirectoryEntries(moviesPath);
      
      for (const folderName of movieFolders) {
        const folderPath = join(moviesPath, folderName);
        
        if (!this.isDirectory(folderPath) || shouldIgnore(folderName)) {
          continue;
        }

        try {
          const movie = await this.scanMovieFolder(folderPath, folderName, drive);
          if (movie) {
            movies.push(movie);
          }
        } catch (error) {
          console.error(`Error scanning movie folder ${folderName}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error scanning movies folder ${moviesPath}:`, error);
    }
    
    return movies;
  }

  private async scanMovieFolder(
    folderPath: string, 
    folderName: string, 
    drive: Drive
  ): Promise<Movie | null> {
    // Get files directly from this folder only
    const filesInFolder = this.getFilesInDirectory(folderPath);
    const videoFiles = filesInFolder.filter(isVideoFile);
    
    if (videoFiles.length === 0) {
      return null;
    }

    // Find the primary video file (largest one)
    const primaryVideoPath = findPrimaryVideoFile(videoFiles);
    if (!primaryVideoPath) {
      return null;
    }

    const { title, year } = parseMovieTitle(folderName);
    const artwork = findArtworkFiles(folderPath, filesInFolder);
    
    try {
      const stats = statSync(primaryVideoPath);
      const videoFile: MediaFile = {
        id: generateMediaId(drive.id, primaryVideoPath, stats.size, stats.mtimeMs),
        path: normalizePath(primaryVideoPath),
        filename: basename(primaryVideoPath),
        size: stats.size,
        lastModified: stats.mtimeMs,
        extension: extname(primaryVideoPath),
      };

      const movie: Movie = {
        id: generateMediaId(drive.id, folderPath, stats.size, stats.mtimeMs),
        title,
        year,
        path: normalizePath(folderPath),
        driveId: drive.id,
        videoFile,
        posterPath: artwork.poster ? normalizePath(artwork.poster) : undefined,
        backdropPath: artwork.backdrop ? normalizePath(artwork.backdrop) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return movie;
    } catch (error) {
      console.error(`Error creating movie entry for ${folderName}:`, error);
      return null;
    }
  }

  private async scanTVShowsFolder(
    tvShowsPath: string, 
    drive: Drive
  ): Promise<{ shows: Show[]; seasons: Season[]; episodes: Episode[] }> {
    const shows: Show[] = [];
    const seasons: Season[] = [];
    const episodes: Episode[] = [];
    
    try {
      const showFolders = this.getDirectoryEntries(tvShowsPath);
      
      for (const showFolderName of showFolders) {
        const showFolderPath = join(tvShowsPath, showFolderName);
        
        if (!this.isDirectory(showFolderPath) || shouldIgnore(showFolderName)) {
          continue;
        }

        try {
          const scanResult = await this.scanShowFolder(showFolderPath, showFolderName, drive);
          if (scanResult.show) {
            shows.push(scanResult.show);
            seasons.push(...scanResult.seasons);
            episodes.push(...scanResult.episodes);
          }
        } catch (error) {
          console.error(`Error scanning show folder ${showFolderName}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error scanning TV shows folder ${tvShowsPath}:`, error);
    }
    
    return { shows, seasons, episodes };
  }

  private async scanShowFolder(
    showFolderPath: string,
    showFolderName: string,
    drive: Drive
  ): Promise<{ show: Show | null; seasons: Season[]; episodes: Episode[] }> {
    const seasons: Season[] = [];
    const episodes: Episode[] = [];
    
    // Get files from show folder for artwork
    const showFiles = this.getFilesInDirectory(showFolderPath);
    const artwork = findArtworkFiles(showFolderPath, showFiles);
    
    const show: Show = {
      id: generateMediaId(drive.id, showFolderPath, 0, Date.now()),
      title: showFolderName,
      path: normalizePath(showFolderPath),
      driveId: drive.id,
      posterPath: artwork.poster ? normalizePath(artwork.poster) : undefined,
      backdropPath: artwork.backdrop ? normalizePath(artwork.backdrop) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Look for season folders or loose episodes
    const entries = this.getDirectoryEntries(showFolderPath);
    const seasonFolders: Array<{ name: string; path: string; number: number }> = [];
    const looseVideoFiles: string[] = [];
    
    for (const entry of entries) {
      const entryPath = join(showFolderPath, entry);
      
      if (this.isDirectory(entryPath)) {
        const seasonNumber = parseSeasonNumber(entry);
        if (seasonNumber !== null) {
          seasonFolders.push({
            name: entry,
            path: entryPath,
            number: seasonNumber,
          });
        }
      } else if (isVideoFile(entry)) {
        looseVideoFiles.push(entryPath);
      }
    }

    // Process season folders
    for (const seasonFolder of seasonFolders) {
      const seasonResult = await this.scanSeasonFolder(
        seasonFolder.path,
        seasonFolder.name,
        seasonFolder.number,
        show,
        drive
      );
      
      if (seasonResult.season) {
        seasons.push(seasonResult.season);
        episodes.push(...seasonResult.episodes);
      }
    }

    // Process loose video files as Season 1
    if (looseVideoFiles.length > 0) {
      const defaultSeasonPath = showFolderPath;
      const defaultSeason: Season = {
        id: generateMediaId(drive.id, defaultSeasonPath + '/season1', 0, Date.now()),
        showId: show.id,
        seasonNumber: 1,
        title: 'Season 1',
        path: normalizePath(defaultSeasonPath),
        episodeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const seasonEpisodes = await this.scanEpisodesInFolder(
        defaultSeasonPath,
        1,
        defaultSeason,
        show,
        drive
      );

      if (seasonEpisodes.length > 0) {
        defaultSeason.episodeCount = seasonEpisodes.length;
        seasons.push(defaultSeason);
        episodes.push(...seasonEpisodes);
      }
    }

    return { show, seasons, episodes };
  }

  private async scanSeasonFolder(
    seasonPath: string,
    seasonName: string,
    seasonNumber: number,
    show: Show,
    drive: Drive
  ): Promise<{ season: Season | null; episodes: Episode[] }> {
    const seasonFiles = this.getFilesInDirectory(seasonPath);
    const artwork = findArtworkFiles(seasonPath, seasonFiles);
    
    const season: Season = {
      id: generateMediaId(drive.id, seasonPath, 0, Date.now()),
      showId: show.id,
      seasonNumber,
      title: seasonName,
      path: normalizePath(seasonPath),
      posterPath: artwork.poster ? normalizePath(artwork.poster) : undefined,
      episodeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const episodes = await this.scanEpisodesInFolder(
      seasonPath,
      seasonNumber,
      season,
      show,
      drive
    );

    season.episodeCount = episodes.length;

    return { season: episodes.length > 0 ? season : null, episodes };
  }

  private async scanEpisodesInFolder(
    folderPath: string,
    seasonNumber: number,
    season: Season,
    show: Show,
    drive: Drive
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const filesInFolder = this.getFilesInDirectory(folderPath);
    const videoFiles = filesInFolder.filter(isVideoFile);
    
    for (const videoFile of videoFiles) {
      const filename = basename(videoFile);
      
      if (shouldIgnore(filename)) {
        continue;
      }

      const episodeInfo = parseEpisodeInfo(filename, seasonNumber);
      if (!episodeInfo) {
        continue;
      }

      try {
        const stats = statSync(videoFile);
        const mediaFile: MediaFile = {
          id: generateMediaId(drive.id, videoFile, stats.size, stats.mtimeMs),
          path: normalizePath(videoFile),
          filename,
          size: stats.size,
          lastModified: stats.mtimeMs,
          extension: extname(videoFile),
        };

        const episode: Episode = {
          id: generateMediaId(drive.id, videoFile, stats.size, stats.mtimeMs),
          showId: show.id,
          seasonId: season.id,
          episodeNumber: episodeInfo.episodeNumber,
          seasonNumber: episodeInfo.seasonNumber,
          title: episodeInfo.title,
          path: normalizePath(videoFile),
          videoFile: mediaFile,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        episodes.push(episode);

        // Handle multi-episode files
        if (episodeInfo.additionalEpisodes) {
          for (const additionalEpisodeNumber of episodeInfo.additionalEpisodes) {
            const additionalEpisode: Episode = {
              ...episode,
              id: generateMediaId(drive.id, videoFile + '_' + additionalEpisodeNumber, stats.size, stats.mtimeMs),
              episodeNumber: additionalEpisodeNumber,
            };
            episodes.push(additionalEpisode);
          }
        }
      } catch (error) {
        console.error(`Error processing episode file ${filename}:`, error);
      }
    }

    return episodes;
  }

  private async saveResults(result: ScanResult): Promise<void> {
    try {
      // Save results (each insert goes to the correct per-drive database)
      // No need for transaction since data is on separate drive databases
      
      // Save movies
      for (const movie of result.movies) {
        this.database.insertMovie(movie);
      }

      // Save shows
      for (const show of result.shows) {
        this.database.insertShow(show);
      }

      // Save seasons
      for (const season of result.seasons) {
        this.database.insertSeason(season);
      }

      // Save episodes
      for (const episode of result.episodes) {
        this.database.insertEpisode(episode);
      }

      console.log('Scan results saved to database successfully');
      
      // Verify the data was saved
      const savedMovies = await this.database.getMovies();
      const savedShows = await this.database.getShows();
      console.log(`[Scanner] Verification: ${savedMovies.length} movies, ${savedShows.length} shows in database`);
    } catch (error) {
      console.error('Failed to save scan results:', error);
      throw error;
    }
  }

  private getAllFiles(rootPath: string): string[] {
    const files: string[] = [];
    
    const scanDirectory = (dirPath: string) => {
      try {
        const entries = readdirSync(dirPath);
        
        for (const entry of entries) {
          if (shouldIgnore(entry)) {
            continue;
          }

          const fullPath = join(dirPath, entry);
          
          try {
            const stats = statSync(fullPath);
            
            if (stats.isDirectory()) {
              scanDirectory(fullPath);
            } else if (stats.isFile()) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files we can't read
            console.warn(`Cannot access ${fullPath}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Cannot read directory ${dirPath}:`, error);
      }
    };

    scanDirectory(rootPath);
    return files;
  }

  private getDirectoryEntries(dirPath: string): string[] {
    try {
      return readdirSync(dirPath);
    } catch (error) {
      console.warn(`Cannot read directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Get all files (not directories) in a specific directory (non-recursive)
   * This is much faster than getAllFiles() which recursively scans everything
   */
  private getFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        try {
          const stats = statSync(fullPath);
          if (stats.isFile()) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
    } catch (error) {
      console.warn(`Cannot read directory ${dirPath}:`, error);
    }
    return files;
  }

  private isDirectory(path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }

  getScanningState(): boolean {
    return this.isScanning;
  }

  getCurrentProgress(): ScanProgress | null {
    return this.currentScanProgress;
  }
}