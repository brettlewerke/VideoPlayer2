/**
 * Linux Storage Manager
 * Handles drive detection and monitoring on Linux systems
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, statSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface MountPoint {
  device: string; // e.g., /dev/sda1
  mountPath: string; // e.g., /media/usb
  fsType: string; // e.g., ext4, ntfs, exfat
  label?: string; // Drive label
  uuid?: string; // UUID
  totalSize: number; // Total size in bytes
  usedSize: number; // Used space in bytes
  availableSize: number; // Available space in bytes
  isRemovable: boolean; // Is it a USB/external drive?
  isNetwork: boolean; // Is it a network mount (NFS/SMB)?
}

export class LinuxStorageManager extends EventEmitter {
  private mountPoints: Map<string, MountPoint> = new Map();
  private watchInterval: NodeJS.Timeout | null = null;
  private readonly WATCH_INTERVAL = 5000; // Check every 5 seconds

  constructor() {
    super();
  }

  /**
   * Start monitoring for drive changes
   */
  async startMonitoring(): Promise<void> {
    console.log('[LinuxStorageManager] Starting drive monitoring...');
    
    // Initial scan
    await this.scanMounts();

    // Set up periodic checking (fallback if udev not available)
    this.watchInterval = setInterval(() => {
      this.scanMounts().catch(err => {
        console.error('[LinuxStorageManager] Error during periodic scan:', err);
      });
    }, this.WATCH_INTERVAL);

    // TODO: Add udev monitoring for real-time events if available
    // This would require a native addon or calling udevadm monitor
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    console.log('[LinuxStorageManager] Stopped drive monitoring');
  }

  /**
   * Scan all mounted filesystems
   */
  async scanMounts(): Promise<MountPoint[]> {
    try {
      const newMountPoints = new Map<string, MountPoint>();

      // Parse /proc/mounts for current mounts
      const mounts = await this.parseMounts();

      for (const mount of mounts) {
        // Skip system mounts
        if (this.isSystemMount(mount.mountPath)) {
          continue;
        }

        const mountPoint = await this.getMountDetails(mount);
        if (mountPoint) {
          newMountPoints.set(mountPoint.mountPath, mountPoint);
        }
      }

      // Detect changes
      this.detectChanges(newMountPoints);

      this.mountPoints = newMountPoints;
      return Array.from(this.mountPoints.values());
    } catch (error) {
      console.error('[LinuxStorageManager] Error scanning mounts:', error);
      return [];
    }
  }

  /**
   * Get all current mount points
   */
  getMountPoints(): MountPoint[] {
    return Array.from(this.mountPoints.values());
  }

  /**
   * Get mount point by path
   */
  getMountPoint(mountPath: string): MountPoint | undefined {
    return this.mountPoints.get(mountPath);
  }

  /**
   * Parse /proc/mounts
   */
  private async parseMounts(): Promise<Array<{ device: string; mountPath: string; fsType: string }>> {
    try {
      const content = readFileSync('/proc/mounts', 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      return lines.map(line => {
        const parts = line.split(/\s+/);
        return {
          device: parts[0],
          mountPath: parts[1].replace(/\\040/g, ' '), // Decode \040 (space)
          fsType: parts[2],
        };
      }).filter(mount => {
        // Filter relevant filesystem types
        const validFsTypes = ['ext4', 'ext3', 'ext2', 'ntfs', 'exfat', 'vfat', 'fuseblk', 'nfs', 'cifs', 'smb3'];
        return validFsTypes.includes(mount.fsType);
      });
    } catch (error) {
      console.error('[LinuxStorageManager] Error parsing /proc/mounts:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a mount point
   */
  private async getMountDetails(mount: { device: string; mountPath: string; fsType: string }): Promise<MountPoint | null> {
    try {
      // Get disk space info
      const { stdout } = await execAsync(`df -B1 "${mount.mountPath}" 2>/dev/null || echo ""`);
      const lines = stdout.trim().split('\n');
      
      let totalSize = 0;
      let usedSize = 0;
      let availableSize = 0;

      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        totalSize = parseInt(parts[1]) || 0;
        usedSize = parseInt(parts[2]) || 0;
        availableSize = parseInt(parts[3]) || 0;
      }

      // Get device info
      const label = await this.getDeviceLabel(mount.device);
      const uuid = await this.getDeviceUUID(mount.device);
      const isRemovable = await this.isRemovableDevice(mount.device);
      const isNetwork = this.isNetworkMount(mount.fsType, mount.device);

      return {
        device: mount.device,
        mountPath: mount.mountPath,
        fsType: mount.fsType,
        label,
        uuid,
        totalSize,
        usedSize,
        availableSize,
        isRemovable,
        isNetwork,
      };
    } catch (error) {
      console.error(`[LinuxStorageManager] Error getting details for ${mount.mountPath}:`, error);
      return null;
    }
  }

  /**
   * Get device label
   */
  private async getDeviceLabel(device: string): Promise<string | undefined> {
    try {
      // Check if device exists
      if (!device.startsWith('/dev/')) {
        return undefined;
      }

      const { stdout } = await execAsync(`blkid -s LABEL -o value "${device}" 2>/dev/null || echo ""`);
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get device UUID
   */
  private async getDeviceUUID(device: string): Promise<string | undefined> {
    try {
      if (!device.startsWith('/dev/')) {
        return undefined;
      }

      const { stdout } = await execAsync(`blkid -s UUID -o value "${device}" 2>/dev/null || echo ""`);
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if device is removable (USB, SD card, etc.)
   */
  private async isRemovableDevice(device: string): Promise<boolean> {
    try {
      // Extract device name (e.g., sda1 -> sda)
      const match = device.match(/\/dev\/([a-z]+)/);
      if (!match) {
        return false;
      }

      const deviceName = match[1];
      const removablePath = `/sys/block/${deviceName}/removable`;

      if (existsSync(removablePath)) {
        const removable = readFileSync(removablePath, 'utf-8').trim();
        return removable === '1';
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if mount is a network mount
   */
  private isNetworkMount(fsType: string, device: string): boolean {
    const networkFsTypes = ['nfs', 'nfs4', 'cifs', 'smb', 'smb3'];
    return networkFsTypes.includes(fsType) || device.includes(':') || device.startsWith('//');
  }

  /**
   * Check if path is a system mount (should be ignored)
   */
  private isSystemMount(mountPath: string): boolean {
    const systemMounts = [
      '/',
      '/boot',
      '/dev',
      '/proc',
      '/sys',
      '/run',
      '/tmp',
      '/var',
      '/usr',
      '/home',
      '/root',
      '/etc',
      '/opt',
      '/srv',
      '/snap',
    ];

    // Ignore system mounts
    if (systemMounts.some(sys => mountPath === sys || mountPath.startsWith(sys + '/'))) {
      return true;
    }

    // Ignore pseudo filesystems
    const pseudoMounts = ['/dev/', '/proc/', '/sys/', '/run/'];
    if (pseudoMounts.some(pseudo => mountPath.startsWith(pseudo))) {
      return true;
    }

    return false;
  }

  /**
   * Detect mount/unmount changes and emit events
   */
  private detectChanges(newMountPoints: Map<string, MountPoint>): void {
    // Detect new mounts
    for (const [path, mountPoint] of newMountPoints) {
      if (!this.mountPoints.has(path)) {
        console.log(`[LinuxStorageManager] Drive mounted: ${path} (${mountPoint.label || mountPoint.device})`);
        this.emit('mount', mountPoint);
      }
    }

    // Detect unmounts
    for (const [path, mountPoint] of this.mountPoints) {
      if (!newMountPoints.has(path)) {
        console.log(`[LinuxStorageManager] Drive unmounted: ${path} (${mountPoint.label || mountPoint.device})`);
        this.emit('unmount', mountPoint);
      }
    }
  }

  /**
   * Find common media mount locations
   */
  async findMediaLocations(): Promise<string[]> {
    const locations: string[] = [];

    // Check common mount points
    const commonPaths = [
      '/media',
      '/mnt',
      '/run/media',
    ];

    for (const basePath of commonPaths) {
      if (existsSync(basePath)) {
        try {
          const entries = await readdir(basePath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(basePath, entry.name);
              
              // Check if it's a mount point
              if (this.mountPoints.has(fullPath)) {
                locations.push(fullPath);
              } else {
                // Check subdirectories (e.g., /media/username/drive)
                try {
                  const subEntries = await readdir(fullPath, { withFileTypes: true });
                  for (const subEntry of subEntries) {
                    if (subEntry.isDirectory()) {
                      const subPath = path.join(fullPath, subEntry.name);
                      if (this.mountPoints.has(subPath)) {
                        locations.push(subPath);
                      }
                    }
                  }
                } catch {
                  // Permission denied or not accessible
                }
              }
            }
          }
        } catch (error) {
          console.error(`[LinuxStorageManager] Error scanning ${basePath}:`, error);
        }
      }
    }

    return locations;
  }

  /**
   * Get formatted drive info for UI display
   */
  formatDriveInfo(mountPoint: MountPoint): string {
    const label = mountPoint.label || path.basename(mountPoint.mountPath);
    const totalGB = (mountPoint.totalSize / 1024 / 1024 / 1024).toFixed(1);
    const usedGB = (mountPoint.usedSize / 1024 / 1024 / 1024).toFixed(1);
    const availGB = (mountPoint.availableSize / 1024 / 1024 / 1024).toFixed(1);
    const usedPercent = ((mountPoint.usedSize / mountPoint.totalSize) * 100).toFixed(0);

    return `${label} - ${usedGB}/${totalGB} GB used (${usedPercent}%), ${availGB} GB free`;
  }
}

// Singleton instance
export const linuxStorageManager = new LinuxStorageManager();
