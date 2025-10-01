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

    const dbPath = join(driveDbDir, 'hoser.db');
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
      
      // Progress table
      `CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        content_key TEXT NOT NULL,
        position_seconds REAL NOT NULL DEFAULT 0,
        duration_seconds REAL NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        last_played_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(content_key)
      )`
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
          return rows.map((row: any) => this.rowToEpisode(row));
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
  async getProgress(contentKey: string): Promise<PlaybackProgress | null> {
    // Find the drive for this content key
    const parsed = this.parseContentKey(contentKey);
    if (!parsed) return null;

    const drivePath = this.getDrivePathFromVolumeKey(parsed.volumeKey);
    if (!drivePath) return null;

    try {
      const db = this.getOrCreateDriveDb(drivePath);
      const stmt = db.prepare('SELECT * FROM progress WHERE content_key = ?');
      const row = stmt.get(contentKey) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        contentKey: row.content_key,
        positionSeconds: row.position_seconds,
        durationSeconds: row.duration_seconds,
        completed: !!row.completed,
        lastPlayedAt: new Date(row.last_played_at),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    } catch (error) {
      console.error('[Database] Error getting progress:', error);
      return null;
    }
  }

  async setProgress(progress: PlaybackProgress): Promise<void> {
    const parsed = this.parseContentKey(progress.contentKey);
    if (!parsed) throw new Error('Invalid content key');

    const drivePath = this.getDrivePathFromVolumeKey(parsed.volumeKey);
    if (!drivePath) throw new Error('Drive not found for content key');

    const db = this.getOrCreateDriveDb(drivePath);
    
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO progress 
      (id, content_key, position_seconds, duration_seconds, completed, last_played_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      progress.id,
      progress.contentKey,
      progress.positionSeconds,
      progress.durationSeconds,
      progress.completed ? 1 : 0,
      progress.lastPlayedAt.getTime(),
      progress.createdAt.getTime(),
      now
    );
  }

  async deleteProgress(contentKey: string): Promise<void> {
    const parsed = this.parseContentKey(contentKey);
    if (!parsed) return;

    const drivePath = this.getDrivePathFromVolumeKey(parsed.volumeKey);
    if (!drivePath) return;

    try {
      const db = this.getOrCreateDriveDb(drivePath);
      const stmt = db.prepare('DELETE FROM progress WHERE content_key = ?');
      stmt.run(contentKey);
    } catch (error) {
      console.error('[Database] Error deleting progress:', error);
    }
  }

  /**
   * Generate content key for progress tracking
   * Format: volumeKey|canonicalAbsPath|size|mtime
   */
  generateContentKey(volumeKey: string, absPath: string, size: number, mtime: number): string {
    // Normalize path to use forward slashes and remove drive letter prefix on Windows
    const normalizedPath = absPath.replace(/\\/g, '/').replace(/^([A-Z]:\/)/i, '/');
    return `${volumeKey}|${normalizedPath}|${size}|${mtime}`;
  }

  /**
   * Parse content key back to components
   */
  parseContentKey(contentKey: string): { volumeKey: string; absPath: string; size: number; mtime: number } | null {
    const parts = contentKey.split('|');
    if (parts.length !== 4) return null;
    
    const [volumeKey, path, sizeStr, mtimeStr] = parts;
    const size = parseInt(sizeStr, 10);
    const mtime = parseInt(mtimeStr, 10);
    
    if (isNaN(size) || isNaN(mtime)) return null;
    
    // Restore drive letter on Windows
    const absPath = process.platform === 'win32' && path.startsWith('/') 
      ? `${volumeKey.split('|')[0]}:${path.replace(/\//g, '\\')}`
      : path;
    
    return { volumeKey, absPath, size, mtime };
  }

  /**
   * Get volume key from drive path
   */
  private getVolumeKeyFromDrivePath(drivePath: string): string {
    // For now, use the drive path as volume key
    // In future, could include UUID/serial
    return drivePath;
  }

  /**
   * Get drive path from volume key
   */
  private getDrivePathFromVolumeKey(volumeKey: string): string | null {
    // For now, volume key is the drive path
    return volumeKey;
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
          SELECT * FROM progress 
          WHERE completed = 0 AND position_seconds > 15
          ORDER BY last_played_at DESC
        `);
        const rows = stmt.all() as any[];
        allProgress.push(...rows.map(row => ({
          id: row.id,
          contentKey: row.content_key,
          positionSeconds: row.position_seconds,
          durationSeconds: row.duration_seconds,
          completed: !!row.completed,
          lastPlayedAt: new Date(row.last_played_at),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })));
      } catch (error) {
        console.error(`[Database] Error getting continue watching from drive ${drive.id}:`, error);
      }
    }

    // Sort by last_played_at and limit
    allProgress.sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
    return allProgress.slice(0, limit);
  }

  async getMediaByPath(path: string): Promise<{ id: string; type: 'movie' | 'episode' } | null> {
    // Search all connected drives for the media
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

  // Delete methods
  async deleteMovie(movieId: string): Promise<void> {
    const drives = await this.getDrives();
    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM movies WHERE id = ?');
        stmt.run(movieId);
      } catch (error) {
        console.error(`[Database] Error deleting movie ${movieId} from drive ${drive.id}:`, error);
      }
    }
  }

  async deleteShow(showId: string): Promise<void> {
    const drives = await this.getDrives();
    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM shows WHERE id = ?');
        stmt.run(showId);
      } catch (error) {
        console.error(`[Database] Error deleting show ${showId} from drive ${drive.id}:`, error);
      }
    }
  }

  async deleteSeason(seasonId: string): Promise<void> {
    const drives = await this.getDrives();
    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM seasons WHERE id = ?');
        stmt.run(seasonId);
      } catch (error) {
        console.error(`[Database] Error deleting season ${seasonId} from drive ${drive.id}:`, error);
      }
    }
  }

  async deleteEpisode(episodeId: string): Promise<void> {
    const drives = await this.getDrives();
    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('DELETE FROM episodes WHERE id = ?');
        stmt.run(episodeId);
      } catch (error) {
        console.error(`[Database] Error deleting episode ${episodeId} from drive ${drive.id}:`, error);
      }
    }
  }

  async getEpisodesBySeason(seasonId: string): Promise<Episode[]> {
    const allEpisodes: Episode[] = [];
    const drives = await this.getDrives();

    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number');
        const rows = stmt.all(seasonId) as any[];
        allEpisodes.push(...rows.map((row: any) => this.rowToEpisode(row)));
      } catch (error) {
        console.error(`[Database] Error reading episodes from drive ${drive.id}:`, error);
      }
    }

    return allEpisodes;
  }

  // Settings methods
  async getAllSettings(): Promise<Record<string, any>> {
    if (!this.settingsDb) throw new Error('Settings database not initialized');
    const stmt = this.settingsDb.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as any[];
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  }

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.settingsDb) throw new Error('Settings database not initialized');
    const stmt = this.settingsDb.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, JSON.stringify(value), Date.now());
  }

  // Media clearing methods
  async clearAllMediaForDrive(driveId: string): Promise<void> {
    const drives = await this.getDrives();
    const drive = drives.find(d => d.id === driveId);
    if (!drive) return;

    const db = this.getOrCreateDriveDb(drive.mountPath);
    
    // Delete in order: episodes, seasons, shows, movies (respecting foreign keys)
    const statements = [
      'DELETE FROM episodes',
      'DELETE FROM seasons', 
      'DELETE FROM shows',
      'DELETE FROM movies'
    ];

    for (const sql of statements) {
      try {
        db.exec(sql);
      } catch (error) {
        console.error(`[Database] Error executing ${sql} on drive ${driveId}:`, error);
      }
    }
  }

  // Poster update methods
  async updateMoviePoster(movieId: string, posterPath: string | null): Promise<void> {
    const drives = await this.getDrives();
    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('UPDATE movies SET poster_path = ?, updated_at = ? WHERE id = ?');
        stmt.run(posterPath, Date.now(), movieId);
      } catch (error) {
        console.error(`[Database] Error updating movie poster for ${movieId} on drive ${drive.id}:`, error);
      }
    }
  }

  async updateShowPoster(showId: string, posterPath: string | null): Promise<void> {
    const drives = await this.getDrives();
    for (const drive of drives) {
      try {
        const db = this.getOrCreateDriveDb(drive.mountPath);
        const stmt = db.prepare('UPDATE shows SET poster_path = ?, updated_at = ? WHERE id = ?');
        stmt.run(posterPath, Date.now(), showId);
      } catch (error) {
        console.error(`[Database] Error updating show poster for ${showId} on drive ${drive.id}:`, error);
      }
    }
  }
}