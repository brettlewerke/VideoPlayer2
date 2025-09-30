/**
 * Database schema definitions and migrations
 */

export interface DatabaseSchema {
  version: number;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  constraints?: string[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: string | number | boolean;
  primaryKey?: boolean;
  unique?: boolean;
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
}

export const SCHEMA_V1: DatabaseSchema = {
  version: 1,
  tables: [
    {
      name: 'drives',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'label', type: 'TEXT', nullable: false },
        { name: 'mount_path', type: 'TEXT', nullable: false },
        { name: 'uuid', type: 'TEXT', nullable: true },
        { name: 'is_removable', type: 'INTEGER', nullable: false, defaultValue: 0 },
        { name: 'is_connected', type: 'INTEGER', nullable: false, defaultValue: 1 },
        { name: 'last_scanned', type: 'INTEGER', nullable: true },
        { name: 'created_at', type: 'INTEGER', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: ['UNIQUE(mount_path)'],
    },
    {
      name: 'movies',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'title', type: 'TEXT', nullable: false },
        { name: 'year', type: 'INTEGER', nullable: true },
        { name: 'path', type: 'TEXT', nullable: false },
        { name: 'drive_id', type: 'TEXT', nullable: false },
        { name: 'video_file_path', type: 'TEXT', nullable: false },
        { name: 'video_file_size', type: 'INTEGER', nullable: false },
        { name: 'video_file_modified', type: 'INTEGER', nullable: false },
        { name: 'poster_path', type: 'TEXT', nullable: true },
        { name: 'backdrop_path', type: 'TEXT', nullable: true },
        { name: 'duration', type: 'INTEGER', nullable: true },
        { name: 'created_at', type: 'INTEGER', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: [
        'FOREIGN KEY(drive_id) REFERENCES drives(id) ON DELETE CASCADE',
        'UNIQUE(drive_id, path)',
      ],
    },
    {
      name: 'shows',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'title', type: 'TEXT', nullable: false },
        { name: 'path', type: 'TEXT', nullable: false },
        { name: 'drive_id', type: 'TEXT', nullable: false },
        { name: 'poster_path', type: 'TEXT', nullable: true },
        { name: 'backdrop_path', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'INTEGER', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: [
        'FOREIGN KEY(drive_id) REFERENCES drives(id) ON DELETE CASCADE',
        'UNIQUE(drive_id, path)',
      ],
    },
    {
      name: 'seasons',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'show_id', type: 'TEXT', nullable: false },
        { name: 'season_number', type: 'INTEGER', nullable: false },
        { name: 'title', type: 'TEXT', nullable: false },
        { name: 'path', type: 'TEXT', nullable: false },
        { name: 'poster_path', type: 'TEXT', nullable: true },
        { name: 'episode_count', type: 'INTEGER', nullable: false, defaultValue: 0 },
        { name: 'created_at', type: 'INTEGER', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: [
        'FOREIGN KEY(show_id) REFERENCES shows(id) ON DELETE CASCADE',
        'UNIQUE(show_id, season_number)',
      ],
    },
    {
      name: 'episodes',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'show_id', type: 'TEXT', nullable: false },
        { name: 'season_id', type: 'TEXT', nullable: false },
        { name: 'episode_number', type: 'INTEGER', nullable: false },
        { name: 'season_number', type: 'INTEGER', nullable: false },
        { name: 'title', type: 'TEXT', nullable: true },
        { name: 'path', type: 'TEXT', nullable: false },
        { name: 'video_file_path', type: 'TEXT', nullable: false },
        { name: 'video_file_size', type: 'INTEGER', nullable: false },
        { name: 'video_file_modified', type: 'INTEGER', nullable: false },
        { name: 'duration', type: 'INTEGER', nullable: true },
        { name: 'created_at', type: 'INTEGER', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: [
        'FOREIGN KEY(show_id) REFERENCES shows(id) ON DELETE CASCADE',
        'FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE',
        'UNIQUE(season_id, episode_number)',
      ],
    },
    {
      name: 'playback_progress',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'media_id', type: 'TEXT', nullable: false },
        { name: 'media_type', type: 'TEXT', nullable: false },
        { name: 'position', type: 'INTEGER', nullable: false, defaultValue: 0 },
        { name: 'duration', type: 'INTEGER', nullable: false, defaultValue: 0 },
        { name: 'percentage', type: 'REAL', nullable: false, defaultValue: 0 },
        { name: 'is_completed', type: 'INTEGER', nullable: false, defaultValue: 0 },
        { name: 'last_watched', type: 'INTEGER', nullable: false },
        { name: 'created_at', type: 'INTEGER', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: [
        'UNIQUE(media_id)',
        'CHECK(media_type IN (\'movie\', \'episode\'))',
        'CHECK(percentage >= 0 AND percentage <= 1)',
      ],
    },
    {
      name: 'settings',
      columns: [
        { name: 'key', type: 'TEXT', primaryKey: true },
        { name: 'value', type: 'TEXT', nullable: false },
        { name: 'type', type: 'TEXT', nullable: false },
        { name: 'updated_at', type: 'INTEGER', nullable: false },
      ],
      constraints: ["CHECK(type IN ('string', 'number', 'boolean', 'json'))"],
    },
    {
      name: 'schema_migrations',
      columns: [
        { name: 'version', type: 'INTEGER', primaryKey: true },
        { name: 'applied_at', type: 'INTEGER', nullable: false },
      ],
    },
  ],
  indexes: [
    { name: 'idx_movies_title', table: 'movies', columns: ['title'] },
    { name: 'idx_movies_year', table: 'movies', columns: ['year'] },
    { name: 'idx_movies_drive', table: 'movies', columns: ['drive_id'] },
    { name: 'idx_movies_created', table: 'movies', columns: ['created_at'] },
    
    { name: 'idx_shows_title', table: 'shows', columns: ['title'] },
    { name: 'idx_shows_drive', table: 'shows', columns: ['drive_id'] },
    { name: 'idx_shows_created', table: 'shows', columns: ['created_at'] },
    
    { name: 'idx_seasons_show', table: 'seasons', columns: ['show_id'] },
    { name: 'idx_seasons_number', table: 'seasons', columns: ['season_number'] },
    
    { name: 'idx_episodes_show', table: 'episodes', columns: ['show_id'] },
    { name: 'idx_episodes_season', table: 'episodes', columns: ['season_id'] },
    { name: 'idx_episodes_number', table: 'episodes', columns: ['season_number', 'episode_number'] },
    { name: 'idx_episodes_created', table: 'episodes', columns: ['created_at'] },
    
    { name: 'idx_progress_media', table: 'playback_progress', columns: ['media_id'] },
    { name: 'idx_progress_type', table: 'playback_progress', columns: ['media_type'] },
    { name: 'idx_progress_watched', table: 'playback_progress', columns: ['last_watched'] },
    { name: 'idx_progress_completed', table: 'playback_progress', columns: ['is_completed'] },
    
    { name: 'idx_drives_connected', table: 'drives', columns: ['is_connected'] },
    { name: 'idx_drives_removable', table: 'drives', columns: ['is_removable'] },
  ],
};

/**
 * Generate SQL to create a table
 */
export function generateCreateTableSQL(table: TableDefinition): string {
  const columns = table.columns.map(col => {
    let sql = `"${col.name}" ${col.type}`;
    
    if (col.primaryKey) {
      sql += ' PRIMARY KEY';
    }
    
    if (!col.nullable) {
      sql += ' NOT NULL';
    }
    
    if (col.unique) {
      sql += ' UNIQUE';
    }
    
    if (col.defaultValue !== undefined) {
      if (typeof col.defaultValue === 'string') {
        sql += ` DEFAULT '${col.defaultValue}'`;
      } else {
        sql += ` DEFAULT ${col.defaultValue}`;
      }
    }
    
    return sql;
  });
  
  const allConstraints = [...columns];
  if (table.constraints) {
    allConstraints.push(...table.constraints);
  }
  
  return `CREATE TABLE "${table.name}" (\n  ${allConstraints.join(',\n  ')}\n)`;
}

/**
 * Generate SQL to create an index
 */
export function generateCreateIndexSQL(index: IndexDefinition): string {
  const uniqueClause = index.unique ? 'UNIQUE ' : '';
  const columns = index.columns.map(c => `"${c}"`).join(', ');
  return `CREATE ${uniqueClause}INDEX "${index.name}" ON "${index.table}" (${columns})`;
}

/**
 * Generate SQL for schema initialization
 */
export function generateSchemaSQL(schema: DatabaseSchema): string[] {
  const statements: string[] = [];
  
  // Enable foreign keys
  statements.push('PRAGMA foreign_keys = ON');
  
  // Create tables
  for (const table of schema.tables) {
    statements.push(generateCreateTableSQL(table));
  }
  
  // Create indexes
  for (const index of schema.indexes) {
    statements.push(generateCreateIndexSQL(index));
  }
  
  // Record schema version
  statements.push(
    `INSERT INTO schema_migrations (version, applied_at) VALUES (${schema.version}, ${Date.now()})`
  );
  
  return statements;
}

/**
 * Migration interface
 */
export interface Migration {
  version: number;
  up: string[];
  down: string[];
}

/**
 * Future migrations would be added here
 */
export const MIGRATIONS: Migration[] = [
  // Example migration for version 2
  // {
  //   version: 2,
  //   up: [
  //     'ALTER TABLE movies ADD COLUMN imdb_id TEXT',
  //     'CREATE INDEX idx_movies_imdb ON movies (imdb_id)',
  //   ],
  //   down: [
  //     'DROP INDEX IF EXISTS idx_movies_imdb',
  //     'ALTER TABLE movies DROP COLUMN imdb_id',
  //   ],
  // },
];