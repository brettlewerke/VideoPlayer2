/**
 * Database manager for SQLite operations with migrations
 * Supports per-drive databases stored on swappable drives
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { join, parse as parsePath } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
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

/**
 * Database manager with per-drive database support
 * - Settings database in app userData
 * - Media databases on each drive in .hoser-video folder
 */
export class DatabaseManager {
  // Settings database (always in app userData)
  private settingsDb: Database.Database | null = null;
  private readonly settingsDbPath: string;
  
  // Per-drive databases (media content)
  private driveDbMap = new Map<string, Database.Database>();
  private drivePathMap = new Map<string, string>(); // Maps drive mount paths to drive IDs

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbDir = join(userDataPath, 'database');
    
    // Ensure directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    this.settingsDbPath = join(dbDir, 'settings.db');
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    try {
      // Initialize settings database
      const isNewDatabase = !existsSync(this.settingsDbPath);
      
      this.settingsDb = new Database(this.settingsDbPath);
      
      // Configure SQLite for settings database
      this.configureSQLite(this.settingsDb);
      
      if (isNewDatabase) {
        await this.createSettingsSchema();
      } else {
        await this.runMigrations(this.settingsDb, 'settings');
      }
      
      console.log('Settings database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Configure SQLite pragmas for optimal performance
   */
  private configureSQLite(db: Database.Database): void {
    db.pragma('journal_mode = WAL');
    db.pragma(`busy_timeout = ${DATABASE.BUSY_TIMEOUT}`);
    db.pragma(`cache_size = ${DATABASE.CACHE_SIZE}`);
    db.pragma('foreign_keys = ON');
    db.pragma('temp_store = MEMORY');
  }

  /**
   * Get or create database for a specific drive
   */
  private getOrCreateDriveDb(drivePath: string): Database.Database {
    // Check if we already have this database open
    let db = this.driveDbMap.get(drivePath);
    if (db) {
      return db;
    }

    // Create .hoser-video folder on the drive
    const driveDbDir = join(drivePath, '.hoser-video');
    if (!existsSync(driveDbDir)) {
      mkdirSync(driveDbDir, { recursive: true });
    }

    const dbPath = join(driveDbDir, 'media.db');
    const isNewDatabase = !existsSync(dbPath);

    db = new Database(dbPath);
    this.configureSQLite(db);

    if (isNewDatabase) {
      this.createMediaSchema(db);
    }

    this.driveDbMap.set(drivePath, db);
    console.log(`[Database] Opened database for drive: ${drivePath}`);

    return db;
  }

  /**
   * Get database for a file path by detecting its drive
   */
  private getDbForFilePath(filePath: string): Database.Database {
    // Extract drive path from file path
    const drivePath = this.getDrivePathFromFilePath(filePath);
    return this.getOrCreateDriveDb(drivePath);
  }

  /**
   * Extract drive path from a file path
   * Windows: C:\ from C:\path\to\file or C:/path/to/file
   * macOS/Linux: /Volumes/DriveName from /Volumes/DriveName/path/to/file
   */
  private getDrivePathFromFilePath(filePath: string): string {
    if (process.platform === 'win32') {
      // Windows: Extract drive letter (e.g., "C:\")
      // Handle both backslashes and forward slashes
      const match = filePath.match(/^([A-Z]:)[\\\/]/i);
      if (match) {
        return match[1] + '\\'; // Always return with backslash
      }
    } else if (process.platform === 'darwin') {
      // macOS: /Volumes/DriveName or / for root
      if (filePath.startsWith('/Volumes/')) {
        const parts = filePath.split('/');
        return `/${parts[1]}/${parts[2]}`; // /Volumes/DriveName
      }
      return '/'; // Root drive
    } else {
      // Linux: Similar to macOS
      const parts = filePath.split('/');
      if (parts.length >= 3 && (parts[1] === 'media' || parts[1] === 'mnt')) {
        return `/${parts[1]}/${parts[2]}`; // /media/drivename or /mnt/drivename
      }
      return '/'; // Root drive
    }
    
    throw new Error(`Cannot determine drive path from: ${filePath}`);
  }

  /**
   * Register a drive for future database lookups
   */
  registerDrive(driveId: string, mountPath: string): void {
    this.drivePathMap.set(mountPath, driveId);
    console.log(`[Database] Registered drive ${driveId} at ${mountPath}`);
  }

  /**
   * Close database for a specific drive
   */
  closeDriveDb(drivePath: string): void {
    const db = this.driveDbMap.get(drivePath);
    if (db) {
      db.close();
      this.driveDbMap.delete(drivePath);
      console.log(`[Database] Closed database for drive: ${drivePath}`);
    }
  }

  /**
   * Create settings schema (drives, settings, schema_migrations)
   */
  private async createSettingsSchema(): Promise<void> {
    if (!this.settingsDb) throw new Error('Settings database not initialized');

    const statements = [
      // Drives table
      `CREATE TABLE IF NOT EXISTS drives (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        mount_path TEXT NOT NULL UNIQUE,
        uuid TEXT,
        is_removable INTEGER NOT NULL DEFAULT 0,
        is_connected INTEGER NOT NULL DEFAULT 1,
        last_scanned INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      
      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      
      // Schema migrations table
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )`
    ];
    
    const transaction = this.settingsDb.transaction(() => {
      for (const statement of statements) {
        this.settingsDb!.exec(statement);
      }
    });
    
    transaction();
  }

  /**
   * Create media schema (movies, shows, seasons, episodes, progress)
   */
  private createMediaSchema(db: Database.Database): void {
    const statements = [
      // Movies table
      `CREATE TABLE IF NOT EXISTS movies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        year INTEGER,
        path TEXT NOT NULL,
        drive_id TEXT NOT NULL,
        video_file_path TEXT NOT NULL,
        video_file_size INTEGER,
        video_file_modified INTEGER,
        poster_path TEXT,
        backdrop_path TEXT,
        rotten_tomatoes_poster_path TEXT,
        duration INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      
      // Shows table
      `CREATE TABLE IF NOT EXISTS shows (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        year INTEGER,
        path TEXT NOT NULL,
        drive_id TEXT NOT NULL,
        poster_path TEXT,
        backdrop_path TEXT,
        rotten_tomatoes_poster_path TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      
      // Seasons table
      `CREATE TABLE IF NOT EXISTS seasons (
        id TEXT PRIMARY KEY,
        show_id TEXT NOT NULL,
        season_number INTEGER NOT NULL,
        title TEXT,
        path TEXT,
        poster_path TEXT,
        episode_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
      )`,
      
      // Episodes table
      `CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        show_id TEXT NOT NULL,
        season_id TEXT NOT NULL,
        season_number INTEGER NOT NULL,
        episode_number INTEGER NOT NULL,
        title TEXT,
        path TEXT NOT NULL,
        video_file_path TEXT NOT NULL,
        video_file_size INTEGER,
        video_file_modified INTEGER,
        still_path TEXT,
        duration INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
      )`,
      
      // Playback progress table with content_key for persistent resume
      `CREATE TABLE IF NOT EXISTS playback_progress (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        content_key TEXT NOT NULL,
        position_seconds REAL NOT NULL DEFAULT 0,
        duration_seconds REAL NOT NULL DEFAULT 0,
        percentage REAL NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        last_played_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(content_key)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_progress_media_id ON playback_progress(media_id)`,
      `CREATE INDEX IF NOT EXISTS idx_progress_last_played ON playback_progress(last_played_at)`
    ];
    
    const transaction = db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement);
      }
    });
    
    transaction();
  }

  /**
   * Run pending migrations on a specific database
   */
  private async runMigrations(db: Database.Database, dbType: string): Promise<void> {
    const currentVersion = this.getCurrentSchemaVersion(db);
    const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      return;
    }
    
    console.log(`Running ${pendingMigrations.length} migrations on ${dbType} database...`);
    
    const transaction = db.transaction(() => {
      for (const migration of pendingMigrations) {
        console.log(`Applying migration ${migration.version}`);
        
        for (const statement of migration.up) {
          db.exec(statement);
        }
        
        db.prepare(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
        ).run(migration.version, Date.now());
      }
    });
    
    transaction();
  }

  /**
   * Get current schema version from a specific database
   */
  private getCurrentSchemaVersion(db: Database.Database): number {
    try {
      const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
      return result?.version || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Close all database connections
   */
  close(): void {
    // Close settings database
    if (this.settingsDb) {
      this.settingsDb.close();
      this.settingsDb = null;
    }
    
    // Close all drive databases
    for (const [drivePath, db] of this.driveDbMap.entries()) {
      db.close();
      console.log(`[Database] Closed database for drive: ${drivePath}`);
    }
    this.driveDbMap.clear();
    this.drivePathMap.clear();
  }

  /**
   * Close and delete all database files
   * This forces a fresh scan on next startup
   */
  closeAndDelete(): void {
    // Close all connections first
    this.close();
    
    // Delete settings database files
    try {
      if (existsSync(this.settingsDbPath)) {
        unlinkSync(this.settingsDbPath);
        console.log('Deleted settings database file:', this.settingsDbPath);
      }
      
      const walPath = `${this.settingsDbPath}-wal`;
      const shmPath = `${this.settingsDbPath}-shm`;
      
      if (existsSync(walPath)) {
        unlinkSync(walPath);
      }
      
      if (existsSync(shmPath)) {
        unlinkSync(shmPath);
      }
      
      console.log('Database cleanup completed - fresh scan will occur on next startup');
    } catch (error) {
      console.error('Error deleting database files:', error);
    }
  }

  /**
   * Execute a transaction on a specific database
   */
  transaction<T>(fn: (db: Database.Database) => T, db: Database.Database): T {
    console.log('[Database] Starting transaction...');
    const transaction = db.transaction(fn);
    const result = transaction(db);
    console.log('[Database] Transaction completed');
    
    // Force WAL checkpoint to ensure data is visible
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log('[Database] WAL checkpoint completed');
    
    return result;
  }

  // Drive operations (stored in settings database)
  async insertDrive(drive: Omit<Drive, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.settingsDb) throw new Error('Database not initialized');

    const now = Date.now();
    const stmt = this.settingsDb.prepare(`
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
    
    // Register drive for database lookups
    this.registerDrive(drive.id, drive.mountPath);
  }

  async getDrives(): Promise<Drive[]> {
    if (!this.settingsDb) throw new Error('Database not initialized');

    const stmt = this.settingsDb.prepare('SELECT * FROM drives ORDER BY label');
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
    if (!this.settingsDb) throw new Error('Database not initialized');

    const stmt = this.settingsDb.prepare('UPDATE drives SET is_connected = ?, updated_at = ? WHERE id = ?');
    stmt.run(isConnected ? 1 : 0, Date.now(), driveId);
  }

  async updateDriveLastScanned(driveId: string, lastScanned: Date): Promise<void> {
    if (!this.settingsDb) throw new Error('Database not initialized');

    const stmt = this.settingsDb.prepare('UPDATE drives SET last_scanned = ?, updated_at = ? WHERE id = ?');
    stmt.run(lastScanned.getTime(), Date.now(), driveId);
    console.log(`[Database] Updated last_scanned for drive ${driveId}`);
  }

  // Movie operations (stored on per-drive databases)
  insertMovie(movie: Omit<Movie, 'createdAt' | 'updatedAt'>): void {
    const db = this.getDbForFilePath(movie.videoFile.path);

    const now = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO movies 
      (id, title, year, path, drive_id, video_file_path, video_file_size, video_file_modified, 
       poster_path, backdrop_path, rotten_tomatoes_poster_path, duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      movie.rottenTomatoesPosterPath,
      movie.duration,
      now,
      now
    );
    console.log(`[Database] Inserted movie: ${movie.title}`);
  }

  async getMovies(driveId?: string): Promise<Movie[]> {
    const allMovies: Movie[] = [];

    if (driveId) {
      // Get movies from specific drive
      const drive = await this.getDriveById(driveId);
      if (!drive || !drive.isConnected) {
        console.log(`[Database] Drive ${driveId} not found or not connected`);
        return [];
      }

      const db = this.getOrCreateDriveDb(drive.mountPath);
      const stmt = db.prepare('SELECT * FROM movies WHERE drive_id = ? ORDER BY title');
      const rows = stmt.all(driveId) as any[];
      return rows.map(row => this.rowToMovie(row));
    }

    // Get movies from all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM movies ORDER BY title');
        const rows = stmt.all() as any[];
        allMovies.push(...rows.map(row => this.rowToMovie(row)));
      } catch (error) {
        console.error(`[Database] Error reading movies from drive ${drive.id}:`, error);
      }
    }

    console.log(`[Database] getMovies found ${allMovies.length} total movies`);
    return allMovies;
  }

  async getRecentMovies(limit = 10): Promise<Movie[]> {
    const allMovies: Movie[] = [];

    // Get movies from all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM movies ORDER BY created_at DESC');
        const rows = stmt.all() as any[];
        allMovies.push(...rows.map(row => this.rowToMovie(row)));
      } catch (error) {
        console.error(`[Database] Error reading movies from drive ${drive.id}:`, error);
      }
    }

    // Sort by created_at and limit
    allMovies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return allMovies.slice(0, limit);
  }

  async searchMovies(query: string): Promise<Movie[]> {
    const allMovies: Movie[] = [];

    // Search across all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM movies WHERE title LIKE ? ORDER BY title');
        const rows = stmt.all(`%${query}%`) as any[];
        allMovies.push(...rows.map(row => this.rowToMovie(row)));
      } catch (error) {
        console.error(`[Database] Error searching movies on drive ${drive.id}:`, error);
      }
    }

    return allMovies;
  }

  private async getDriveById(driveId: string): Promise<Drive | null> {
    const drives = await this.getDrives();
    return drives.find(d => d.id === driveId) || null;
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
      rottenTomatoesPosterPath: row.rotten_tomatoes_poster_path,
      duration: row.duration,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Show operations (stored on per-drive databases)
  insertShow(show: Omit<Show, 'createdAt' | 'updatedAt'>): void {
    const db = this.getDbForFilePath(show.path);

    const now = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO shows 
      (id, title, path, drive_id, poster_path, backdrop_path, rotten_tomatoes_poster_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      show.id,
      show.title,
      show.path,
      show.driveId,
      show.posterPath,
      show.backdropPath,
      show.rottenTomatoesPosterPath,
      now,
      now
    );
    console.log(`[Database] Inserted show: ${show.title}`);
  }

  async getShows(driveId?: string): Promise<Show[]> {
    const allShows: Show[] = [];

    if (driveId) {
      // Get shows from specific drive
      const drive = await this.getDriveById(driveId);
      if (!drive || !drive.isConnected) {
        console.log(`[Database] Drive ${driveId} not found or not connected`);
        return [];
      }

      const db = this.getOrCreateDriveDb(drive.mountPath);
      const stmt = db.prepare('SELECT * FROM shows WHERE drive_id = ? ORDER BY title');
      const rows = stmt.all(driveId) as any[];
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        path: row.path,
        driveId: row.drive_id,
        posterPath: row.poster_path,
        backdropPath: row.backdrop_path,
        rottenTomatoesPosterPath: row.rotten_tomatoes_poster_path,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    }

    // Get shows from all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM shows ORDER BY title');
        const rows = stmt.all() as any[];
        allShows.push(...rows.map(row => ({
          id: row.id,
          title: row.title,
          path: row.path,
          driveId: row.drive_id,
          posterPath: row.poster_path,
          backdropPath: row.backdrop_path,
          rottenTomatoesPosterPath: row.rotten_tomatoes_poster_path,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })));
      } catch (error) {
        console.error(`[Database] Error reading shows from drive ${drive.id}:`, error);
      }
    }

    console.log(`[Database] getShows found ${allShows.length} total shows`);
    return allShows;
  }

  async searchShows(query: string): Promise<Show[]> {
    const allShows: Show[] = [];

    // Search across all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM shows WHERE title LIKE ? ORDER BY title');
        const rows = stmt.all(`%${query}%`) as any[];
        allShows.push(...rows.map(row => ({
          id: row.id,
          title: row.title,
          path: row.path,
          driveId: row.drive_id,
          posterPath: row.poster_path,
          backdropPath: row.backdrop_path,
          rottenTomatoesPosterPath: row.rotten_tomatoes_poster_path,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })));
      } catch (error) {
        console.error(`[Database] Error searching shows on drive ${drive.id}:`, error);
      }
    }

    return allShows;
  }

  // Season operations (stored on per-drive databases)
  insertSeason(season: Omit<Season, 'createdAt' | 'updatedAt'>): void {
    const db = this.getDbForFilePath(season.path);

    const now = Date.now();
    const stmt = db.prepare(`
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
    // Find which drive the show is on by querying all drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const checkStmt = db.prepare('SELECT id FROM shows WHERE id = ?');
        const showExists = checkStmt.get(showId);
        
        if (showExists) {
          const stmt = db.prepare('SELECT * FROM seasons WHERE show_id = ? ORDER BY season_number');
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
      } catch (error) {
        console.error(`[Database] Error reading seasons from drive ${drive.id}:`, error);
      }
    }

    return [];
  }

  // Episode operations (stored on per-drive databases)
  insertEpisode(episode: Omit<Episode, 'createdAt' | 'updatedAt'>): void {
    const db = this.getDbForFilePath(episode.videoFile.path);

    const now = Date.now();
    const stmt = db.prepare(`
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
    // Find which drive the season is on by querying all drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const checkStmt = db.prepare('SELECT id FROM seasons WHERE id = ?');
        const seasonExists = checkStmt.get(seasonId);
        
        if (seasonExists) {
          const stmt = db.prepare('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number');
          const rows = stmt.all(seasonId) as any[];
          return rows.map(row => this.rowToEpisode(row));
        }
      } catch (error) {
        console.error(`[Database] Error reading episodes from drive ${drive.id}:`, error);
      }
    }

    return [];
  }

  async getRecentEpisodes(limit = 10): Promise<Episode[]> {
    const allEpisodes: Episode[] = [];

    // Get episodes from all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM episodes ORDER BY created_at DESC');
        const rows = stmt.all() as any[];
        allEpisodes.push(...rows.map(row => this.rowToEpisode(row)));
      } catch (error) {
        console.error(`[Database] Error reading episodes from drive ${drive.id}:`, error);
      }
    }

    // Sort by created_at and limit
    allEpisodes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return allEpisodes.slice(0, limit);
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

  // Progress operations (stored on per-drive databases)
  /**
   * Generate a content_key for persistent resume tracking
   * Format: volumeId|absPath|size|mtime
   */
  private generateContentKey(filePath: string, size: number, mtime: number): string {
    const drivePath = this.getDrivePathFromFilePath(filePath);
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize to forward slashes
    return `${drivePath}|${normalizedPath}|${size}|${mtime}`;
  }

  async setProgress(progress: Omit<PlaybackProgress, 'createdAt' | 'updatedAt'>, filePath: string, fileSize: number, fileMtime: number): Promise<void> {
    try {
      const db = this.getDbForFilePath(filePath);
      const contentKey = this.generateContentKey(filePath, fileSize, fileMtime);
      const now = Date.now();
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO playback_progress 
        (id, media_id, media_type, content_key, position_seconds, duration_seconds, percentage, completed, last_played_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Convert lastWatched to timestamp if it's a Date object
      const lastPlayedAt = typeof progress.lastWatched === 'string' 
        ? new Date(progress.lastWatched).getTime() 
        : progress.lastWatched.getTime();
      
      stmt.run(
        progress.id,
        progress.mediaId,
        progress.mediaType,
        contentKey,
        progress.position,
        progress.duration,
        progress.percentage,
        progress.isCompleted ? 1 : 0,
        lastPlayedAt,
        now,
        now
      );
      
      console.log(`[Database] Saved progress for ${contentKey}: ${progress.position}s / ${progress.duration}s`);
    } catch (error) {
      console.error(`[Database] Error setting progress:`, error);
      throw error;
    }
  }

  async getProgress(mediaId: string): Promise<PlaybackProgress | null> {
    // Search for progress across all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM playback_progress WHERE media_id = ?');
        const row = stmt.get(mediaId) as any;
        
        if (row) {
          return {
            id: row.id,
            mediaId: row.media_id,
            mediaType: row.media_type,
            position: row.position_seconds || row.position, // Support both old and new schema
            duration: row.duration_seconds || row.duration,
            percentage: row.percentage,
            isCompleted: !!row.completed || !!row.is_completed,
            lastWatched: new Date(row.last_played_at || row.last_watched),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          };
        }
      } catch (error) {
        console.error(`[Database] Error getting progress from drive ${drive.id}:`, error);
      }
    }

    return null;
  }

  /**
   * Get progress by content key for persistent resume
   */
  async getProgressByContentKey(filePath: string, fileSize: number, fileMtime: number): Promise<PlaybackProgress | null> {
    try {
      const db = this.getDbForFilePath(filePath);
      const contentKey = this.generateContentKey(filePath, fileSize, fileMtime);
      
      const stmt = db.prepare('SELECT * FROM playback_progress WHERE content_key = ?');
      const row = stmt.get(contentKey) as any;
      
      if (row) {
        return {
          id: row.id,
          mediaId: row.media_id,
          mediaType: row.media_type,
          position: row.position_seconds,
          duration: row.duration_seconds,
          percentage: row.percentage,
          isCompleted: !!row.completed,
          lastWatched: new Date(row.last_played_at),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
      }
    } catch (error) {
      console.error(`[Database] Error getting progress by content key:`, error);
    }

    return null;
  }

  async deleteProgress(mediaId: string): Promise<void> {
    // Delete progress from all drives (in case it exists on multiple)
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM playback_progress WHERE media_id = ?');
        stmt.run(mediaId);
        console.log(`[Database] Deleted progress for ${mediaId} from drive ${drive.id}`);
      } catch (error) {
        console.error(`[Database] Error deleting progress from drive ${drive.id}:`, error);
      }
    }
  }

  async updateMoviePoster(movieId: string, posterPath: string): Promise<void> {
    // Find which drive has this movie and update its poster path
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('UPDATE movies SET rotten_tomatoes_poster_path = ?, updated_at = ? WHERE id = ?');
        const result = stmt.run(posterPath, new Date().toISOString(), movieId);
        
        if (result.changes > 0) {
          console.log(`[Database] Updated poster for movie ${movieId} on drive ${drive.id}`);
          return;
        }
      } catch (error) {
        console.error(`[Database] Error updating movie poster on drive ${drive.id}:`, error);
      }
    }
  }

  async updateShowPoster(showId: string, posterPath: string): Promise<void> {
    // Find which drive has this show and update its poster path
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('UPDATE shows SET rotten_tomatoes_poster_path = ?, updated_at = ? WHERE id = ?');
        const result = stmt.run(posterPath, new Date().toISOString(), showId);
        
        if (result.changes > 0) {
          console.log(`[Database] Updated poster for show ${showId} on drive ${drive.id}`);
          return;
        }
      } catch (error) {
        console.error(`[Database] Error updating show poster on drive ${drive.id}:`, error);
      }
    }
  }

  async deleteMovie(movieId: string): Promise<void> {
    // Find which drive has this movie
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM movies WHERE id = ?');
        const result = stmt.run(movieId);
        
        if (result.changes > 0) {
          console.log(`[Database] Deleted movie ${movieId} from drive ${drive.id}`);
          return;
        }
      } catch (error) {
        console.error(`[Database] Error deleting movie from drive ${drive.id}:`, error);
      }
    }
  }

  async deleteShow(showId: string): Promise<void> {
    // Find which drive has this show and delete it along with all seasons and episodes
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        
        // Foreign key constraints will cascade delete seasons and episodes
        const stmt = db.prepare('DELETE FROM shows WHERE id = ?');
        const result = stmt.run(showId);
        
        if (result.changes > 0) {
          console.log(`[Database] Deleted show ${showId} (and all seasons/episodes) from drive ${drive.id}`);
          return;
        }
      } catch (error) {
        console.error(`[Database] Error deleting show from drive ${drive.id}:`, error);
      }
    }
  }

  async deleteSeason(seasonId: string): Promise<void> {
    // Find which drive has this season and delete it along with all episodes
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        
        // Foreign key constraints will cascade delete episodes
        const stmt = db.prepare('DELETE FROM seasons WHERE id = ?');
        const result = stmt.run(seasonId);
        
        if (result.changes > 0) {
          console.log(`[Database] Deleted season ${seasonId} (and all episodes) from drive ${drive.id}`);
          return;
        }
      } catch (error) {
        console.error(`[Database] Error deleting season from drive ${drive.id}:`, error);
      }
    }
  }

  async deleteEpisode(episodeId: string): Promise<void> {
    // Find which drive has this episode and delete it
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM episodes WHERE id = ?');
        const result = stmt.run(episodeId);
        
        if (result.changes > 0) {
          console.log(`[Database] Deleted episode ${episodeId} from drive ${drive.id}`);
          return;
        }
      } catch (error) {
        console.error(`[Database] Error deleting episode from drive ${drive.id}:`, error);
      }
    }
  }

  /**
   * Clear all media (movies, shows, seasons, episodes) for a specific drive before rescanning.
   * This ensures we don't accumulate duplicate entries on each scan.
   */
  async clearAllMediaForDrive(driveId: string): Promise<void> {
    const drives = await this.getDrives();
    const drive = drives.find(d => d.id === driveId);
    
    if (!drive || !drive.isConnected) {
      console.warn(`[Database] Cannot clear media for disconnected drive ${driveId}`);
      return;
    }

    try {
      const db = this.getOrCreateDriveDb(drive.mountPath);
      
      // Delete in reverse order to respect foreign keys (even though CASCADE is enabled)
      // Episodes first, then seasons, then shows, then movies
      db.prepare('DELETE FROM episodes').run();
      db.prepare('DELETE FROM seasons').run();
      db.prepare('DELETE FROM shows').run();
      db.prepare('DELETE FROM movies').run();
      
      console.log(`[Database] Cleared all media for drive ${driveId}`);
    } catch (error) {
      console.error(`[Database] Error clearing media for drive ${driveId}:`, error);
      throw error;
    }
  }

  async getEpisodesBySeason(seasonId: string): Promise<Episode[]> {
    // Search for episodes for this season across all drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC');
        const rows = stmt.all(seasonId) as any[];
        
        if (rows.length > 0) {
          return rows.map(row => ({
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
              filename: row.video_file_filename,
              size: row.video_file_size,
              lastModified: row.video_file_modified,
              extension: row.video_file_extension,
            },
            duration: row.duration,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
          }));
        }
      } catch (error) {
        console.error(`[Database] Error getting episodes from drive ${drive.id}:`, error);
      }
    }

    return [];
  }

  async getMediaByPath(path: string): Promise<{ id: string; type: 'movie' | 'episode' } | null> {
    // Search for media file across all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        
        // Check movies first
        const movieStmt = db.prepare('SELECT id FROM movies WHERE video_file_path = ?');
        const movieRow = movieStmt.get(path) as any;
        if (movieRow) {
          return { id: movieRow.id, type: 'movie' };
        }

        // Check episodes
        const episodeStmt = db.prepare('SELECT id FROM episodes WHERE video_file_path = ?');
        const episodeRow = episodeStmt.get(path) as any;
        if (episodeRow) {
          return { id: episodeRow.id, type: 'episode' };
        }
      } catch (error) {
        console.error(`[Database] Error searching media on drive ${drive.id}:`, error);
      }
    }

    return null;
  }

  async getContinueWatching(limit = 10): Promise<PlaybackProgress[]> {
    const allProgress: PlaybackProgress[] = [];

    // Get progress from all connected drives
    const drives = await this.getDrives();
    for (const drive of drives) {
      if (!drive.isConnected) continue;

      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare(`
          SELECT * FROM playback_progress 
          WHERE (completed = 0 OR is_completed = 0) AND percentage > 0.05
          ORDER BY last_played_at DESC, last_watched DESC
        `);
        const rows = stmt.all() as any[];
        allProgress.push(...rows.map(row => ({
          id: row.id,
          mediaId: row.media_id,
          mediaType: row.media_type,
          position: row.position_seconds || row.position,
          duration: row.duration_seconds || row.duration,
          percentage: row.percentage,
          isCompleted: !!row.completed || !!row.is_completed,
          lastWatched: new Date(row.last_played_at || row.last_watched),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })));
      } catch (error) {
        console.error(`[Database] Error getting continue watching from drive ${drive.id}:`, error);
      }
    }

    // Sort by last_watched and limit
    allProgress.sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime());
    return allProgress.slice(0, limit);
  }

  // Settings operations (stored in settings database)
  async setSetting(key: string, value: any): Promise<void> {
    if (!this.settingsDb) throw new Error('Database not initialized');

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
    
    const stmt = this.settingsDb.prepare(`
      INSERT OR REPLACE INTO settings (key, value, type, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(key, stringValue, type, Date.now());
  }

  async getSetting(key: string): Promise<any> {
    if (!this.settingsDb) throw new Error('Database not initialized');

    const stmt = this.settingsDb.prepare('SELECT * FROM settings WHERE key = ?');
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
    if (!this.settingsDb) throw new Error('Database not initialized');

    const stmt = this.settingsDb.prepare('SELECT * FROM settings');
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
    // Find the drive to get its mount path
    const drive = await this.getDriveById(driveId);
    if (!drive) {
      console.log(`[Database] Drive ${driveId} not found`);
      return;
    }

    // Close the drive's database
    this.closeDriveDb(drive.mountPath);
    
    console.log(`[Database] Cleared data for drive ${driveId}`);
  }
}