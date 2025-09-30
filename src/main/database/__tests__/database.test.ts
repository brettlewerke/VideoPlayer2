import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Database SQL Validation Tests', () => {
  let testDbPath: string;
  let db: Database.Database;

  beforeEach(() => {
    const testDir = join(tmpdir(), 'h-player-test');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    testDbPath = join(testDir, `test-${Date.now()}.db`);
    db = new Database(testDbPath);
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('CHECK Constraint Validation', () => {
    test('CHECK constraints MUST use single quotes for string literals', () => {
      // This should SUCCEED - single quotes
      const goodSQL = `
        CREATE TABLE "test_good" (
          "id" INTEGER PRIMARY KEY,
          "media_type" TEXT CHECK(media_type IN ('movie', 'episode'))
        )
      `;
      expect(() => db.exec(goodSQL)).not.toThrow();
      db.exec(`INSERT INTO test_good (media_type) VALUES ('movie')`);
      db.exec(`INSERT INTO test_good (media_type) VALUES ('episode')`);

      // Invalid value should fail
      expect(() => {
        db.exec(`INSERT INTO test_good (media_type) VALUES ('invalid')`);
      }).toThrow(/CHECK constraint failed/);
    });

    test('CHECK constraints with double quotes WILL FAIL', () => {
      // This should FAIL - double quotes treat values as column names
      const badSQL = `
        CREATE TABLE "test_bad" (
          "id" INTEGER PRIMARY KEY,
          "media_type" TEXT CHECK(media_type IN ("movie", "episode"))
        )
      `;
      
      // The CREATE might succeed, but INSERT will fail with "no such column"
      expect(() => {
        db.exec(badSQL);
        db.exec(`INSERT INTO test_bad (media_type) VALUES ('movie')`);
      }).toThrow(/no such column/);
    });

    test('settings table type CHECK uses single quotes', () => {
      const sql = `
        CREATE TABLE "settings" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "type" TEXT NOT NULL CHECK(type IN ('string', 'number', 'boolean', 'json'))
        )
      `;

      expect(() => db.exec(sql)).not.toThrow();

      // Test valid values
      db.exec(`INSERT INTO settings ("key", value, type) VALUES ('test', 'value', 'string')`);
      db.exec(`INSERT INTO settings ("key", value, type) VALUES ('count', '42', 'number')`);
      db.exec(`INSERT INTO settings ("key", value, type) VALUES ('flag', 'true', 'boolean')`);
      db.exec(`INSERT INTO settings ("key", value, type) VALUES ('data', '{}', 'json')`);

      // Invalid type should fail
      expect(() => {
        db.exec(`INSERT INTO settings ("key", value, type) VALUES ('bad', 'x', 'invalid')`);
      }).toThrow(/CHECK constraint failed/);
    });
  });

  describe('Column Name Quoting', () => {
    test('should quote column names to avoid reserved word conflicts', () => {
      const sql = `
        CREATE TABLE "test_quotes" (
          "id" INTEGER PRIMARY KEY,
          "key" TEXT,
          "value" TEXT,
          "type" TEXT,
          "index" INTEGER
        )
      `;

      // "key", "value", "type", "index" are all SQLite reserved words
      // Should work fine with quotes
      expect(() => db.exec(sql)).not.toThrow();
      
      db.exec(`INSERT INTO test_quotes ("key", "value", "type", "index") 
               VALUES ('k', 'v', 't', 1)`);
      
      const row = db.prepare('SELECT * FROM test_quotes').get();
      expect(row).toBeDefined();
    });
  });

  describe('Movies Table', () => {
    test('should create movies table with all required columns', () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS "movies" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "title" TEXT NOT NULL,
          "year" INTEGER,
          "file_path" TEXT NOT NULL UNIQUE,
          "file_size" INTEGER,
          "duration" INTEGER,
          "poster_path" TEXT,
          "backdrop_path" TEXT,
          "overview" TEXT,
          "rating" REAL,
          "genres" TEXT,
          "added_at" INTEGER NOT NULL,
          "last_played" INTEGER,
          "play_count" INTEGER DEFAULT 0,
          "drive_letter" TEXT
        )
      `;

      expect(() => db.exec(sql)).not.toThrow();

      const columns = db.pragma('table_info(movies)') as any[];
      expect(columns).toHaveLength(15);
      
      const columnNames = columns.map(col => col.name);
      expect(columnNames).toContain('file_path');
      expect(columnNames).toContain('drive_letter');
    });

    test('should enforce file_path uniqueness', () => {
      db.exec(`
        CREATE TABLE "movies" (
          "id" INTEGER PRIMARY KEY,
          "title" TEXT NOT NULL,
          "file_path" TEXT NOT NULL UNIQUE
        )
      `);

      db.exec(`INSERT INTO movies (title, file_path) VALUES ('Movie 1', '/test.mkv')`);
      
      expect(() => {
        db.exec(`INSERT INTO movies (title, file_path) VALUES ('Movie 2', '/test.mkv')`);
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('TV Shows and Episodes', () => {
    test('should create episodes with foreign key to tv_shows', () => {
      db.exec(`
        CREATE TABLE "tv_shows" ("id" INTEGER PRIMARY KEY, "title" TEXT UNIQUE);
        CREATE TABLE "episodes" (
          "id" INTEGER PRIMARY KEY,
          "tv_show_id" INTEGER NOT NULL,
          "file_path" TEXT UNIQUE,
          FOREIGN KEY("tv_show_id") REFERENCES "tv_shows"("id") ON DELETE CASCADE
        );
      `);

      const foreignKeys = db.pragma('foreign_key_list(episodes)') as any[];
      expect(foreignKeys).toHaveLength(1);
      expect(foreignKeys[0].table).toBe('tv_shows');
    });

    test('should cascade delete episodes when show is deleted', () => {
      db.exec(`
        CREATE TABLE "tv_shows" ("id" INTEGER PRIMARY KEY, "title" TEXT);
        CREATE TABLE "episodes" (
          "id" INTEGER PRIMARY KEY,
          "tv_show_id" INTEGER,
          "file_path" TEXT,
          FOREIGN KEY("tv_show_id") REFERENCES "tv_shows"("id") ON DELETE CASCADE
        );
      `);

      db.exec(`INSERT INTO tv_shows (id, title) VALUES (1, 'Test Show')`);
      db.exec(`INSERT INTO episodes (id, tv_show_id, file_path) VALUES (1, 1, '/test.mkv')`);

      db.exec(`DELETE FROM tv_shows WHERE id = 1`);

      const episodes = db.prepare('SELECT * FROM episodes').all();
      expect(episodes).toHaveLength(0);
    });
  });

  describe('Database Integrity', () => {
    test('should pass integrity check', () => {
      db.exec(`
        CREATE TABLE "test" ("id" INTEGER PRIMARY KEY, "name" TEXT);
        CREATE INDEX "idx_name" ON "test"("name");
      `);

      const result = db.pragma('integrity_check') as any[];
      expect(result[0]).toBe('ok');
    });

    test('should support WAL mode', () => {
      db.pragma('journal_mode = WAL');
      const mode = db.pragma('journal_mode', { simple: true });
      expect(mode).toBe('wal');
    });
  });
});
