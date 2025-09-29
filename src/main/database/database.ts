/**
 * Database manager for SQLite operations with migrations
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { SCHEMA_V1, MIGRATIONS, generateSchemaSQL } from './schema.js';
import { DATABASE } from '../../shared/constants.js';
import type { 
  Movie, 
  Show, 
  Season, 
  Episode, 
  Drive, 
  PlaybackProgress,
  AppSettings 
} from '../../shared/types.js';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbDir = join(userDataPath, 'database');
    
    // Ensure directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    this.dbPath = join(dbDir, DATABASE.FILENAME);
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    try {
      const isNewDatabase = !existsSync(this.dbPath);
      
      this.db = new Database(this.dbPath);
      
      // Configure SQLite
      this.db.pragma('journal_mode = WAL');
      this.db.pragma(`busy_timeout = ${DATABASE.BUSY_TIMEOUT}`);
      this.db.pragma(`cache_size = ${DATABASE.CACHE_SIZE}`);
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('temp_store = MEMORY');
      
      if (isNewDatabase) {
        await this.createSchema();
      } else {
        await this.runMigrations();
      }
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create initial schema
   */
  private async createSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const statements = generateSchemaSQL(SCHEMA_V1);
    
    const transaction = this.db.transaction(() => {
      for (const statement of statements) {
        this.db!.exec(statement);
      }
    });
    
    transaction();
  }

  /**
   * Run pending migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const currentVersion = this.getCurrentSchemaVersion();
    const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      return;
    }
    
    console.log(`Running ${pendingMigrations.length} migrations...`);
    
    const transaction = this.db.transaction(() => {
      for (const migration of pendingMigrations) {
        console.log(`Applying migration ${migration.version}`);
        
        for (const statement of migration.up) {
          this.db!.exec(statement);
        }
        
        this.db!.prepare(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
        ).run(migration.version, Date.now());
      }
    });
    
    transaction();
  }

  /**
   * Get current schema version
   */
  private getCurrentSchemaVersion(): number {
    if (!this.db) return 0;

    try {
      const result = this.db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
      return result?.version || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Execute a transaction
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  // Drive operations
  async insertDrive(drive: Omit<Drive, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO drives 
      (id, label, mount_path, uuid, is_removable, is_connected, last_scanned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      drive.id,
      drive.label,
      drive.mountPath,
      drive.uuid,
      drive.isRemovable ? 1 : 0,
      drive.isConnected ? 1 : 0,
      drive.lastScanned?.getTime(),
      now,
      now
    );
  }

  async getDrives(): Promise<Drive[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM drives ORDER BY label');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      label: row.label,
      mountPath: row.mount_path,
      uuid: row.uuid,
      isRemovable: !!row.is_removable,
      isConnected: !!row.is_connected,
      lastScanned: row.last_scanned ? new Date(row.last_scanned) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async updateDriveConnection(driveId: string, isConnected: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('UPDATE drives SET is_connected = ?, updated_at = ? WHERE id = ?');
    stmt.run(isConnected ? 1 : 0, Date.now(), driveId);
  }

  // Movie operations
  async insertMovie(movie: Omit<Movie, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO movies 
      (id, title, year, path, drive_id, video_file_path, video_file_size, video_file_modified, 
       poster_path, backdrop_path, duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      movie.id,
      movie.title,
      movie.year,
      movie.path,
      movie.driveId,
      movie.videoFile.path,
      movie.videoFile.size,
      movie.videoFile.lastModified,
      movie.posterPath,
      movie.backdropPath,
      movie.duration,
      now,
      now
    );
  }

  async getMovies(driveId?: string): Promise<Movie[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM movies';
    const params: any[] = [];
    
    if (driveId) {
      query += ' WHERE drive_id = ?';
      params.push(driveId);
    }
    
    query += ' ORDER BY title';
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => this.rowToMovie(row));
  }

  async getRecentMovies(limit = 10): Promise<Movie[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM movies ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => this.rowToMovie(row));
  }

  async searchMovies(query: string): Promise<Movie[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM movies WHERE title LIKE ? ORDER BY title');
    const rows = stmt.all(`%${query}%`) as any[];
    
    return rows.map(row => this.rowToMovie(row));
  }

  private rowToMovie(row: any): Movie {
    return {
      id: row.id,
      title: row.title,
      year: row.year,
      path: row.path,
      driveId: row.drive_id,
      videoFile: {
        id: row.id,
        path: row.video_file_path,
        filename: row.video_file_path.split('/').pop() || '',
        size: row.video_file_size,
        lastModified: row.video_file_modified,
        extension: row.video_file_path.split('.').pop() || '',
      },
      posterPath: row.poster_path,
      backdropPath: row.backdrop_path,
      duration: row.duration,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Show operations
  async insertShow(show: Omit<Show, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shows 
      (id, title, path, drive_id, poster_path, backdrop_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      show.id,
      show.title,
      show.path,
      show.driveId,
      show.posterPath,
      show.backdropPath,
      now,
      now
    );
  }

  async getShows(driveId?: string): Promise<Show[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM shows';
    const params: any[] = [];
    
    if (driveId) {
      query += ' WHERE drive_id = ?';
      params.push(driveId);
    }
    
    query += ' ORDER BY title';
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      path: row.path,
      driveId: row.drive_id,
      posterPath: row.poster_path,
      backdropPath: row.backdrop_path,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async searchShows(query: string): Promise<Show[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM shows WHERE title LIKE ? ORDER BY title');
    const rows = stmt.all(`%${query}%`) as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      path: row.path,
      driveId: row.drive_id,
      posterPath: row.poster_path,
      backdropPath: row.backdrop_path,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  // Season operations
  async insertSeason(season: Omit<Season, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO seasons 
      (id, show_id, season_number, title, path, poster_path, episode_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      season.id,
      season.showId,
      season.seasonNumber,
      season.title,
      season.path,
      season.posterPath,
      season.episodeCount,
      now,
      now
    );
  }

  async getSeasons(showId: string): Promise<Season[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM seasons WHERE show_id = ? ORDER BY season_number');
    const rows = stmt.all(showId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      showId: row.show_id,
      seasonNumber: row.season_number,
      title: row.title,
      path: row.path,
      posterPath: row.poster_path,
      episodeCount: row.episode_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  // Episode operations
  async insertEpisode(episode: Omit<Episode, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO episodes 
      (id, show_id, season_id, episode_number, season_number, title, path, 
       video_file_path, video_file_size, video_file_modified, duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      episode.id,
      episode.showId,
      episode.seasonId,
      episode.episodeNumber,
      episode.seasonNumber,
      episode.title,
      episode.path,
      episode.videoFile.path,
      episode.videoFile.size,
      episode.videoFile.lastModified,
      episode.duration,
      now,
      now
    );
  }

  async getEpisodes(seasonId: string): Promise<Episode[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number');
    const rows = stmt.all(seasonId) as any[];
    
    return rows.map(row => this.rowToEpisode(row));
  }

  async getRecentEpisodes(limit = 10): Promise<Episode[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM episodes ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => this.rowToEpisode(row));
  }

  private rowToEpisode(row: any): Episode {
    return {
      id: row.id,
      showId: row.show_id,
      seasonId: row.season_id,
      episodeNumber: row.episode_number,
      seasonNumber: row.season_number,
      title: row.title,
      path: row.path,
      videoFile: {
        id: row.id,
        path: row.video_file_path,
        filename: row.video_file_path.split('/').pop() || '',
        size: row.video_file_size,
        lastModified: row.video_file_modified,
        extension: row.video_file_path.split('.').pop() || '',
      },
      duration: row.duration,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Progress operations
  async setProgress(progress: Omit<PlaybackProgress, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO playback_progress 
      (id, media_id, media_type, position, duration, percentage, is_completed, last_watched, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      progress.id,
      progress.mediaId,
      progress.mediaType,
      progress.position,
      progress.duration,
      progress.percentage,
      progress.isCompleted ? 1 : 0,
      progress.lastWatched.getTime(),
      now,
      now
    );
  }

  async getProgress(mediaId: string): Promise<PlaybackProgress | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM playback_progress WHERE media_id = ?');
    const row = stmt.get(mediaId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      mediaId: row.media_id,
      mediaType: row.media_type,
      position: row.position,
      duration: row.duration,
      percentage: row.percentage,
      isCompleted: !!row.is_completed,
      lastWatched: new Date(row.last_watched),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getContinueWatching(limit = 10): Promise<PlaybackProgress[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM playback_progress 
      WHERE is_completed = 0 AND percentage > 0.05
      ORDER BY last_watched DESC 
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      mediaId: row.media_id,
      mediaType: row.media_type,
      position: row.position,
      duration: row.duration,
      percentage: row.percentage,
      isCompleted: !!row.is_completed,
      lastWatched: new Date(row.last_watched),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  // Settings operations
  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    let type: string;
    let stringValue: string;
    
    switch (typeof value) {
      case 'string':
        type = 'string';
        stringValue = value;
        break;
      case 'number':
        type = 'number';
        stringValue = value.toString();
        break;
      case 'boolean':
        type = 'boolean';
        stringValue = value.toString();
        break;
      default:
        type = 'json';
        stringValue = JSON.stringify(value);
        break;
    }
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, type, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(key, stringValue, type, Date.now());
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM settings WHERE key = ?');
    const row = stmt.get(key) as any;
    
    if (!row) return undefined;
    
    switch (row.type) {
      case 'string':
        return row.value;
      case 'number':
        return parseFloat(row.value);
      case 'boolean':
        return row.value === 'true';
      case 'json':
        return JSON.parse(row.value);
      default:
        return row.value;
    }
  }

  async getAllSettings(): Promise<Record<string, any>> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM settings');
    const rows = stmt.all() as any[];
    
    const settings: Record<string, any> = {};
    
    for (const row of rows) {
      switch (row.type) {
        case 'string':
          settings[row.key] = row.value;
          break;
        case 'number':
          settings[row.key] = parseFloat(row.value);
          break;
        case 'boolean':
          settings[row.key] = row.value === 'true';
          break;
        case 'json':
          settings[row.key] = JSON.parse(row.value);
          break;
        default:
          settings[row.key] = row.value;
          break;
      }
    }
    
    return settings;
  }

  /**
   * Clear all media data for a drive (useful when drive is disconnected)
   */
  async clearDriveData(driveId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(() => {
      this.db!.prepare('DELETE FROM episodes WHERE show_id IN (SELECT id FROM shows WHERE drive_id = ?)').run(driveId);
      this.db!.prepare('DELETE FROM seasons WHERE show_id IN (SELECT id FROM shows WHERE drive_id = ?)').run(driveId);
      this.db!.prepare('DELETE FROM shows WHERE drive_id = ?').run(driveId);
      this.db!.prepare('DELETE FROM movies WHERE drive_id = ?').run(driveId);
    });
    
    transaction();
  }
}