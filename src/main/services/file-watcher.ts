/**
 * File system watcher for monitoring media folder changes
 * Automatically rescans when files are added, removed, or modified
 */

import { EventEmitter } from 'events';
import { FSWatcher, watch, existsSync } from 'fs';
import { join } from 'path';
import { isMoviesFolder, isTVShowsFolder } from '../../shared/utils.js';
import type { Drive } from '../../shared/types.js';

interface WatchedFolder {
  path: string;
  driveId: string;
  type: 'movies' | 'tvshows';
  watcher: FSWatcher;
}

export class FileWatcher extends EventEmitter {
  private watchedFolders = new Map<string, WatchedFolder>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 2000; // 2 seconds to batch multiple changes

  constructor() {
    super();
  }

  /**
   * Start watching media folders on all connected drives
   */
  startWatching(drives: Drive[]): void {
    console.log('[FileWatcher] Starting file system monitoring...');
    
    for (const drive of drives) {
      if (!drive.isConnected) {
        continue;
      }

      this.watchDrive(drive);
    }

    console.log(`[FileWatcher] Monitoring ${this.watchedFolders.size} folders`);
  }

  /**
   * Watch media folders on a specific drive
   */
  private watchDrive(drive: Drive): void {
    const drivePath = drive.mountPath;

    if (!existsSync(drivePath)) {
      console.warn(`[FileWatcher] Drive path does not exist: ${drivePath}`);
      return;
    }

    // Get root entries
    try {
      const fs = require('fs');
      const entries = fs.readdirSync(drivePath);

      for (const entry of entries) {
        const fullPath = join(drivePath, entry);

        try {
          const stats = fs.statSync(fullPath);
          if (!stats.isDirectory()) continue;

          // Check if this is a Movies or TV Shows folder
          if (isMoviesFolder(entry)) {
            this.watchFolder(fullPath, drive.id, 'movies');
          } else if (isTVShowsFolder(entry)) {
            this.watchFolder(fullPath, drive.id, 'tvshows');
          }
        } catch (err) {
          // Skip folders we can't access
        }
      }
    } catch (error) {
      console.error(`[FileWatcher] Error reading drive ${drivePath}:`, error);
    }
  }

  /**
   * Watch a specific folder for changes
   */
  private watchFolder(folderPath: string, driveId: string, type: 'movies' | 'tvshows'): void {
    if (this.watchedFolders.has(folderPath)) {
      console.log(`[FileWatcher] Already watching: ${folderPath}`);
      return;
    }

    try {
      console.log(`[FileWatcher] Starting watch on ${type}: ${folderPath}`);

      const watcher = watch(folderPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Ignore hidden files and system files
        if (filename.startsWith('.') || filename.includes('$RECYCLE')) {
          return;
        }

        console.log(`[FileWatcher] Change detected in ${folderPath}: ${eventType} - ${filename}`);
        
        // Debounce: wait for changes to settle before triggering rescan
        this.debounceRescan(driveId, type);
      });

      this.watchedFolders.set(folderPath, {
        path: folderPath,
        driveId,
        type,
        watcher,
      });

      console.log(`[FileWatcher] Successfully watching: ${folderPath}`);
    } catch (error) {
      console.error(`[FileWatcher] Failed to watch ${folderPath}:`, error);
    }
  }

  /**
   * Debounce rescan requests to avoid excessive scanning
   */
  private debounceRescan(driveId: string, type: 'movies' | 'tvshows'): void {
    const key = `${driveId}-${type}`;

    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      console.log(`[FileWatcher] Triggering rescan for drive ${driveId} (${type})`);
      this.emit('rescan-needed', { driveId, type });
      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Add watch for a newly connected drive
   */
  addDrive(drive: Drive): void {
    if (!drive.isConnected) return;
    
    console.log(`[FileWatcher] Adding watch for drive: ${drive.label}`);
    this.watchDrive(drive);
  }

  /**
   * Remove watch for a disconnected drive
   */
  removeDrive(driveId: string): void {
    console.log(`[FileWatcher] Removing watch for drive: ${driveId}`);

    // Find and close all watchers for this drive
    const foldersToRemove: string[] = [];
    
    for (const [path, watched] of this.watchedFolders.entries()) {
      if (watched.driveId === driveId) {
        watched.watcher.close();
        foldersToRemove.push(path);
      }
    }

    // Remove from map
    for (const path of foldersToRemove) {
      this.watchedFolders.delete(path);
    }

    // Clear any pending debounce timers
    const timersToRemove: string[] = [];
    for (const key of this.debounceTimers.keys()) {
      if (key.startsWith(driveId)) {
        clearTimeout(this.debounceTimers.get(key)!);
        timersToRemove.push(key);
      }
    }
    for (const key of timersToRemove) {
      this.debounceTimers.delete(key);
    }

    console.log(`[FileWatcher] Removed ${foldersToRemove.length} watchers for drive`);
  }

  /**
   * Stop all file watching
   */
  stopAll(): void {
    console.log('[FileWatcher] Stopping all file system monitoring...');

    // Close all watchers
    for (const watched of this.watchedFolders.values()) {
      watched.watcher.close();
    }

    this.watchedFolders.clear();

    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.debounceTimers.clear();

    console.log('[FileWatcher] All watchers stopped');
  }

  /**
   * Get current watch status
   */
  getStatus(): { watching: number; folders: string[] } {
    return {
      watching: this.watchedFolders.size,
      folders: Array.from(this.watchedFolders.values()).map(w => w.path),
    };
  }
}
