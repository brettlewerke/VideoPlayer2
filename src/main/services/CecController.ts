/**
 * HDMI-CEC Controller
 * Handles TV remote control input via HDMI-CEC
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export type CECKey =
  | 'SELECT'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'BACK'
  | 'EXIT'
  | 'PLAY'
  | 'PAUSE'
  | 'STOP'
  | 'FAST_FORWARD'
  | 'REWIND'
  | 'NUMBER_0'
  | 'NUMBER_1'
  | 'NUMBER_2'
  | 'NUMBER_3'
  | 'NUMBER_4'
  | 'NUMBER_5'
  | 'NUMBER_6'
  | 'NUMBER_7'
  | 'NUMBER_8'
  | 'NUMBER_9'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'MUTE'
  | 'POWER'
  | 'ROOT_MENU'
  | 'SETUP_MENU'
  | 'CONTENTS_MENU'
  | 'FAVORITE_MENU';

export interface CECDevice {
  address: number;
  name: string;
  vendor: string;
  active: boolean;
  isTV: boolean;
}

export class CecController extends EventEmitter {
  private cecProcess: ChildProcess | null = null;
  private isConnected = false;
  private devices: Map<number, CECDevice> = new Map();
  private cecClientPath = 'cec-client';

  constructor() {
    super();
  }

  /**
   * Initialize CEC connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if cec-client is available
      const hasCecClient = await this.checkCecClient();
      if (!hasCecClient) {
        console.log('[CecController] cec-client not found. Install libcec-utils: sudo apt-get install cec-utils');
        return false;
      }

      // Check for CEC adapter
      const hasAdapter = await this.checkCecAdapter();
      if (!hasAdapter) {
        console.log('[CecController] No CEC adapter found. HDMI-CEC may not be available on this device.');
        return false;
      }

      // Start cec-client process
      await this.startCecClient();

      console.log('[CecController] CEC initialized successfully');
      return true;
    } catch (error) {
      console.error('[CecController] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Check if cec-client is installed
   */
  private async checkCecClient(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('which cec-client 2>/dev/null || echo ""');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check for CEC adapter
   */
  private async checkCecAdapter(): Promise<boolean> {
    try {
      // Check for Raspberry Pi CEC device
      if (existsSync('/dev/cec0')) {
        return true;
      }

      // Try to detect via cec-client
      const { stdout } = await execAsync('echo "quit" | cec-client -s -d 1 2>&1');
      return stdout.includes('detected') || stdout.includes('adapter');
    } catch {
      return false;
    }
  }

  /**
   * Start cec-client process
   */
  private async startCecClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Start cec-client in monitoring mode
        // -d 8 = debug level 8 (show key presses)
        // -t p = set device type to Playback device
        this.cecProcess = spawn('cec-client', ['-d', '8', '-t', 'p']);

        this.cecProcess.stdout?.on('data', (data) => {
          this.handleCecOutput(data.toString());
        });

        this.cecProcess.stderr?.on('data', (data) => {
          console.error('[CecController] Error:', data.toString());
        });

        this.cecProcess.on('close', (code) => {
          console.log(`[CecController] cec-client process exited with code ${code}`);
          this.isConnected = false;
          this.emit('disconnected');
        });

        this.cecProcess.on('error', (error) => {
          console.error('[CecController] Process error:', error);
          reject(error);
        });

        // Wait a bit for connection to establish
        setTimeout(() => {
          if (this.cecProcess && !this.cecProcess.killed) {
            this.isConnected = true;
            this.emit('connected');
            resolve();
          } else {
            reject(new Error('Failed to start cec-client'));
          }
        }, 2000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle output from cec-client
   */
  private handleCecOutput(output: string): void {
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse key press events
      // Example: "key pressed: select (0)"
      const keyMatch = line.match(/key pressed:\s+([a-z_\-0-9]+)/i);
      if (keyMatch) {
        const key = this.mapCecKey(keyMatch[1]);
        if (key) {
          this.emit('key', key);
        }
        continue;
      }

      // Parse device detection
      // Example: "device #0: TV"
      const deviceMatch = line.match(/device #(\d+):\s+(.+)/i);
      if (deviceMatch) {
        const address = parseInt(deviceMatch[1]);
        const name = deviceMatch[2].trim();
        
        this.devices.set(address, {
          address,
          name,
          vendor: '',
          active: true,
          isTV: name.toLowerCase().includes('tv'),
        });
        
        this.emit('device-detected', this.devices.get(address));
      }
    }
  }

  /**
   * Map CEC key names to our key enum
   */
  private mapCecKey(cecKey: string): CECKey | null {
    const keyMap: Record<string, CECKey> = {
      'select': 'SELECT',
      'ok': 'SELECT',
      'enter': 'SELECT',
      'up': 'UP',
      'down': 'DOWN',
      'left': 'LEFT',
      'right': 'RIGHT',
      'back': 'BACK',
      'return': 'BACK',
      'exit': 'EXIT',
      'play': 'PLAY',
      'pause': 'PAUSE',
      'stop': 'STOP',
      'fast-forward': 'FAST_FORWARD',
      'forward': 'FAST_FORWARD',
      'rewind': 'REWIND',
      'backward': 'REWIND',
      '0': 'NUMBER_0',
      '1': 'NUMBER_1',
      '2': 'NUMBER_2',
      '3': 'NUMBER_3',
      '4': 'NUMBER_4',
      '5': 'NUMBER_5',
      '6': 'NUMBER_6',
      '7': 'NUMBER_7',
      '8': 'NUMBER_8',
      '9': 'NUMBER_9',
      'volume-up': 'VOLUME_UP',
      'volume-down': 'VOLUME_DOWN',
      'mute': 'MUTE',
      'power': 'POWER',
      'root-menu': 'ROOT_MENU',
      'home': 'ROOT_MENU',
      'setup-menu': 'SETUP_MENU',
      'contents-menu': 'CONTENTS_MENU',
      'favorite-menu': 'FAVORITE_MENU',
    };

    const normalizedKey = cecKey.toLowerCase().replace(/_/g, '-');
    return keyMap[normalizedKey] || null;
  }

  /**
   * Send a command to the TV
   */
  async sendCommand(command: string): Promise<boolean> {
    if (!this.isConnected || !this.cecProcess) {
      console.error('[CecController] Not connected to CEC');
      return false;
    }

    try {
      this.cecProcess.stdin?.write(`${command}\n`);
      return true;
    } catch (error) {
      console.error('[CecController] Error sending command:', error);
      return false;
    }
  }

  /**
   * Turn TV on
   */
  async turnOnTV(): Promise<boolean> {
    console.log('[CecController] Turning TV on...');
    return this.sendCommand('on 0'); // Send power on to TV (address 0)
  }

  /**
   * Turn TV off (standby)
   */
  async turnOffTV(): Promise<boolean> {
    console.log('[CecController] Turning TV off...');
    return this.sendCommand('standby 0');
  }

  /**
   * Set active source to this device
   */
  async setActiveSource(): Promise<boolean> {
    console.log('[CecController] Setting this device as active source...');
    return this.sendCommand('as'); // "as" = active source
  }

  /**
   * Get list of detected devices
   */
  getDevices(): CECDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Check if connected to CEC
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    if (this.cecProcess) {
      this.cecProcess.kill();
      this.cecProcess = null;
    }
    this.isConnected = false;
    this.devices.clear();
    console.log('[CecController] CEC cleanup complete');
  }
}

/**
 * Keyboard fallback for when CEC is not available
 * Maps keyboard keys to CEC keys for testing/development
 */
export class KeyboardCecFallback extends EventEmitter {
  private keyMap: Map<string, CECKey> = new Map([
    ['Enter', 'SELECT'],
    ['ArrowUp', 'UP'],
    ['ArrowDown', 'DOWN'],
    ['ArrowLeft', 'LEFT'],
    ['ArrowRight', 'RIGHT'],
    ['Escape', 'BACK'],
    ['Backspace', 'BACK'],
    [' ', 'PAUSE'], // Spacebar
    ['p', 'PLAY'],
    ['s', 'STOP'],
    ['f', 'FAST_FORWARD'],
    ['r', 'REWIND'],
    ['0', 'NUMBER_0'],
    ['1', 'NUMBER_1'],
    ['2', 'NUMBER_2'],
    ['3', 'NUMBER_3'],
    ['4', 'NUMBER_4'],
    ['5', 'NUMBER_5'],
    ['6', 'NUMBER_6'],
    ['7', 'NUMBER_7'],
    ['8', 'NUMBER_8'],
    ['9', 'NUMBER_9'],
    ['m', 'ROOT_MENU'],
  ]);

  handleKeyPress(key: string): CECKey | null {
    const cecKey = this.keyMap.get(key);
    if (cecKey) {
      this.emit('key', cecKey);
      return cecKey;
    }
    return null;
  }

  getKeyMappings(): Map<string, CECKey> {
    return new Map(this.keyMap);
  }
}

// Singleton instances
export const cecController = new CecController();
export const keyboardFallback = new KeyboardCecFallback();
