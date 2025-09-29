/**
 * Cross-platform drive detection and monitoring
 */

import { EventEmitter } from 'events';
import { existsSync, readdirSync, statSync, watch, FSWatcher } from 'fs';
import { join } from 'path';
import { platform } from 'os';
import { execSync } from 'child_process';
import { DatabaseManager } from '../database/database.js';
import { hashString } from '../../shared/utils.js';
import type { Drive } from '../../shared/types.js';

export class DriveManager extends EventEmitter {
  private watchers: FSWatcher[] = [];
  private detectedDrives = new Map<string, Drive>();
  private isMonitoring = false;
  private readonly platform = platform();

  constructor(private database: DatabaseManager) {
    super();
  }

  async initialize(): Promise<void> {
    try {
      await this.scanForDrives();
      console.log('Drive manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize drive manager:', error);
      throw error;
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    try {
      if (this.platform === 'win32') {
        this.startWindowsMonitoring();
      } else if (this.platform === 'darwin') {
        this.startMacOSMonitoring();
      } else {
        this.startLinuxMonitoring();
      }
      
      console.log('Drive monitoring started');
    } catch (error) {
      console.error('Failed to start drive monitoring:', error);
      this.isMonitoring = false;
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.watchers.forEach(watcher => {
      try {
        watcher.close();
      } catch (error) {
        console.error('Error closing file watcher:', error);
      }
    });
    
    this.watchers = [];
    this.isMonitoring = false;
    
    console.log('Drive monitoring stopped');
  }

  async scanForDrives(): Promise<void> {
    const drives: Drive[] = [];
    
    try {
      if (this.platform === 'win32') {
        drives.push(...await this.scanWindowsDrives());
      } else if (this.platform === 'darwin') {
        drives.push(...await this.scanMacOSDrives());
      } else {
        drives.push(...await this.scanLinuxDrives());
      }

      // Update database with discovered drives
      for (const drive of drives) {
        const existingDrive = this.detectedDrives.get(drive.id);
        
        if (!existingDrive || existingDrive.isConnected !== drive.isConnected) {
          await this.database.insertDrive(drive);
          this.detectedDrives.set(drive.id, drive);
          
          if (drive.isConnected) {
            this.emit('driveConnected', drive);
          } else {
            this.emit('driveDisconnected', drive);
          }
        }
      }

      // Mark drives as disconnected if they're no longer detected
      for (const [driveId, existingDrive] of this.detectedDrives) {
        const stillExists = drives.some(d => d.id === driveId);
        if (!stillExists && existingDrive.isConnected) {
          existingDrive.isConnected = false;
          await this.database.updateDriveConnection(driveId, false);
          this.emit('driveDisconnected', existingDrive);
        }
      }

      console.log(`Detected ${drives.length} drives`);
    } catch (error) {
      console.error('Failed to scan for drives:', error);
    }
  }

  private async scanWindowsDrives(): Promise<Drive[]> {
    const drives: Drive[] = [];
    
    try {
      // Get all drive letters
      const output = execSync('wmic logicaldisk get size,freespace,caption,description,drivetype', { encoding: 'utf8' });
      const lines = output.split('\\n').filter(line => line.trim() && !line.includes('Caption'));
      
      for (const line of lines) {
        const parts = line.trim().split(/\\s+/);
        if (parts.length >= 5) {
          const caption = parts[0]; // C:
          const driveType = parseInt(parts[2]); // 2=removable, 3=fixed, etc.
          
          if (caption && caption.match(/^[A-Z]:$/)) {
            const mountPath = caption + '\\\\';
            
            if (existsSync(mountPath)) {
              const drive: Drive = {
                id: hashString(`win32:${caption}`),
                label: this.getDriveLabel(mountPath) || caption,
                mountPath,
                isRemovable: driveType === 2,
                isConnected: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              drives.push(drive);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scanning Windows drives:', error);
      
      // Fallback: try common drive letters
      for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
        const mountPath = `${letter}:\\\\`;
        if (existsSync(mountPath)) {
          drives.push({
            id: hashString(`win32:${letter}:`),
            label: this.getDriveLabel(mountPath) || `${letter}:`,
            mountPath,
            isRemovable: false, // Can't determine, assume fixed
            isConnected: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
    
    return drives;
  }

  private async scanMacOSDrives(): Promise<Drive[]> {
    const drives: Drive[] = [];
    const volumesPath = '/Volumes';
    
    if (existsSync(volumesPath)) {
      try {
        const entries = readdirSync(volumesPath);
        
        for (const entry of entries) {
          const mountPath = join(volumesPath, entry);
          
          try {
            const stats = statSync(mountPath);
            if (stats.isDirectory()) {
              const drive: Drive = {
                id: hashString(`darwin:${entry}`),
                label: entry,
                mountPath,
                isRemovable: this.isMacOSRemovableDrive(mountPath),
                isConnected: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              drives.push(drive);
            }
          } catch (error) {
            console.warn(`Error checking volume ${entry}:`, error);
          }
        }
      } catch (error) {
        console.error('Error reading /Volumes:', error);
      }
    }
    
    // Also include root filesystem
    drives.push({
      id: hashString('darwin:root'),
      label: 'Root Filesystem',
      mountPath: '/',
      isRemovable: false,
      isConnected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return drives;
  }

  private async scanLinuxDrives(): Promise<Drive[]> {
    const drives: Drive[] = [];
    const mediaPaths = ['/media', '/run/media'];
    
    // Add user-specific media paths
    if (process.env.USER) {
      mediaPaths.push(`/media/${process.env.USER}`, `/run/media/${process.env.USER}`);
    }
    
    for (const mediaPath of mediaPaths) {
      if (existsSync(mediaPath)) {
        try {
          const entries = readdirSync(mediaPath);
          
          for (const entry of entries) {
            const mountPath = join(mediaPath, entry);
            
            try {
              const stats = statSync(mountPath);
              if (stats.isDirectory()) {
                const drive: Drive = {
                  id: hashString(`linux:${mountPath}`),
                  label: entry,
                  mountPath,
                  isRemovable: true, // Media mounts are typically removable
                  isConnected: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                
                drives.push(drive);
              }
            } catch (error) {
              console.warn(`Error checking mount ${entry}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Error reading ${mediaPath}:`, error);
        }
      }
    }
    
    // Also include root filesystem
    drives.push({
      id: hashString('linux:root'),
      label: 'Root Filesystem',
      mountPath: '/',
      isRemovable: false,
      isConnected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return drives;
  }

  private getDriveLabel(mountPath: string): string | null {
    if (this.platform === 'win32') {
      try {
        const output = execSync(`vol ${mountPath.replace('\\\\', '')}`, { encoding: 'utf8' });
        const match = output.match(/Volume in drive [A-Z] is (.+)/);
        return match ? match[1].trim() : null;
      } catch {
        return null;
      }
    }
    
    return null;
  }

  private isMacOSRemovableDrive(mountPath: string): boolean {
    try {
      const output = execSync(`diskutil info "${mountPath}"`, { encoding: 'utf8' });
      return output.includes('Removable Media: Yes') || output.includes('Protocol: USB');
    } catch {
      return false;
    }
  }

  private startWindowsMonitoring(): void {
    // On Windows, we poll for drive changes since monitoring drive letters is complex
    const pollInterval = setInterval(async () => {
      await this.scanForDrives();
    }, 5000); // Poll every 5 seconds
    
    // Store the interval ID in a way that can be cleared
    const watcher = {
      close: () => clearInterval(pollInterval)
    } as any;
    
    this.watchers.push(watcher);
  }

  private startMacOSMonitoring(): void {
    try {
      const watcher = watch('/Volumes', { persistent: false }, async (eventType, filename) => {
        if (filename) {
          console.log(`Volume change detected: ${eventType} ${filename}`);
          // Debounce rapid changes
          setTimeout(async () => {
            await this.scanForDrives();
          }, 1000);
        }
      });
      
      this.watchers.push(watcher);
    } catch (error) {
      console.error('Failed to watch /Volumes:', error);
      this.startPollingFallback();
    }
  }

  private startLinuxMonitoring(): void {
    const mediaPaths = ['/media', '/run/media'];
    
    for (const mediaPath of mediaPaths) {
      if (existsSync(mediaPath)) {
        try {
          const watcher = watch(mediaPath, { persistent: false, recursive: true }, async (eventType, filename) => {
            if (filename) {
              console.log(`Media change detected: ${eventType} ${filename}`);
              // Debounce rapid changes
              setTimeout(async () => {
                await this.scanForDrives();
              }, 1000);
            }
          });
          
          this.watchers.push(watcher);
        } catch (error) {
          console.warn(`Failed to watch ${mediaPath}:`, error);
        }
      }
    }
    
    // Fallback to polling if no watchers were set up
    if (this.watchers.length === 0) {
      this.startPollingFallback();
    }
  }

  private startPollingFallback(): void {
    const pollInterval = setInterval(async () => {
      await this.scanForDrives();
    }, 10000); // Poll every 10 seconds
    
    const watcher = {
      close: () => clearInterval(pollInterval)
    } as any;
    
    this.watchers.push(watcher);
  }

  getDrives(): Drive[] {
    return Array.from(this.detectedDrives.values());
  }

  getDrive(driveId: string): Drive | undefined {
    return this.detectedDrives.get(driveId);
  }
}