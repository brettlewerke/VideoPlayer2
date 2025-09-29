/**
 * Custom hooks for keyboard navigation and remote control support
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';

interface NavigationOptions {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onBack?: () => void;
  onEscape?: () => void;
  onHome?: () => void;
  onMenu?: () => void;
}

/**
 * Hook for handling keyboard and remote control navigation
 */
export function useNavigation(options: NavigationOptions = {}) {
  const {
    onUp,
    onDown,
    onLeft,
    onRight,
    onEnter,
    onBack,
    onEscape,
    onHome,
    onMenu,
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        onUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        onDown?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onLeft?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        onRight?.();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onEnter?.();
        break;
      case 'Backspace':
      case 'MediaTrackPrevious':
        event.preventDefault();
        onBack?.();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
      case 'Home':
        event.preventDefault();
        onHome?.();
        break;
      case 'Menu':
      case 'ContextMenu':
        event.preventDefault();
        onMenu?.();
        break;
    }
  }, [onUp, onDown, onLeft, onRight, onEnter, onBack, onEscape, onHome, onMenu]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for managing focus navigation in grid layouts
 */
export function useGridNavigation(
  itemCount: number,
  columns: number,
  onSelect?: (index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setFocusedIndex(currentIndex => {
      const currentRow = Math.floor(currentIndex / columns);
      const currentCol = currentIndex % columns;

      switch (direction) {
        case 'up':
          if (currentRow > 0) {
            return (currentRow - 1) * columns + currentCol;
          }
          break;
        case 'down':
          const maxRow = Math.floor((itemCount - 1) / columns);
          if (currentRow < maxRow) {
            const newIndex = (currentRow + 1) * columns + currentCol;
            return Math.min(newIndex, itemCount - 1);
          }
          break;
        case 'left':
          if (currentCol > 0) {
            return currentIndex - 1;
          }
          break;
        case 'right':
          if (currentCol < columns - 1 && currentIndex < itemCount - 1) {
            return currentIndex + 1;
          }
          break;
      }
      return currentIndex;
    });
  }, [itemCount, columns]);

  useNavigation({
    onUp: () => navigate('up'),
    onDown: () => navigate('down'),
    onLeft: () => navigate('left'),
    onRight: () => navigate('right'),
    onEnter: () => onSelect?.(focusedIndex),
  });

  return { focusedIndex, setFocusedIndex };
}

/**
 * Hook for player controls
 */
export function usePlayerControls() {
  const {
    isPlaying,
    isMuted,
    volume,
    position,
    duration,
    setIsPlaying,
    setIsMuted,
    setVolume,
    setPosition,
  } = useAppStore();

  const togglePlayPause = useCallback(async () => {
    try {
      if (isPlaying) {
        await window.electronAPI.player.pause();
        setIsPlaying(false);
      } else {
        await window.electronAPI.player.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
    }
  }, [isPlaying, setIsPlaying]);

  const stop = useCallback(async () => {
    try {
      await window.electronAPI.player.stop();
      setIsPlaying(false);
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }, [setIsPlaying]);

  const seek = useCallback(async (newPosition: number) => {
    try {
      await window.electronAPI.player.seek(newPosition);
      setPosition(newPosition);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }, [setPosition]);

  const seekRelative = useCallback(async (seconds: number) => {
    const newPosition = Math.max(0, Math.min(duration, position + seconds));
    await seek(newPosition);
  }, [position, duration, seek]);

  const changeVolume = useCallback(async (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    try {
      await window.electronAPI.player.setVolume(clampedVolume);
      setVolume(clampedVolume);
    } catch (error) {
      console.error('Failed to change volume:', error);
    }
  }, [setVolume]);

  const toggleMute = useCallback(async () => {
    try {
      await window.electronAPI.player.setMuted(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  }, [isMuted, setIsMuted]);

  // Set up global player keyboard shortcuts
  useNavigation({
    onEnter: togglePlayPause,
    onEscape: stop,
    onLeft: () => seekRelative(-10),
    onRight: () => seekRelative(10),
    onUp: () => changeVolume(volume + 5),
    onDown: () => changeVolume(volume - 5),
  });

  return {
    togglePlayPause,
    stop,
    seek,
    seekRelative,
    changeVolume,
    toggleMute,
    isPlaying,
    isMuted,
    volume,
    position,
    duration,
  };
}

/**
 * Hook for handling IPC events from main process
 */
export function useIPCEvents() {
  const {
    setPlayerStatus,
    setScanProgress,
    setDrives,
    loadLibrary,
  } = useAppStore();

  useEffect(() => {
    // Player status updates
    const handlePlayerStatusChanged = (event: any, status: any) => {
      setPlayerStatus(status);
    };

    // Scan progress updates
    const handleScanProgress = (event: any, progress: any) => {
      setScanProgress(progress);
    };

    // Drive events
    const handleDriveAdded = (event: any, drive: any) => {
      console.log('Drive added:', drive);
      // Refresh drives list
      window.electronAPI.drives.getAll().then(setDrives);
    };

    const handleDriveRemoved = (event: any, drive: any) => {
      console.log('Drive removed:', drive);
      // Refresh drives list
      window.electronAPI.drives.getAll().then(setDrives);
    };

    // Global shortcuts
    const handleGlobalShortcut = (event: any, data: any) => {
      console.log('Global shortcut:', data);
      // Handle global media key shortcuts
    };

    // Menu actions
    const handleMenuAction = (event: any, data: any) => {
      console.log('Menu action:', data);
      switch (data.action) {
        case 'scanMedia':
          window.electronAPI.library.scanMedia();
          break;
        case 'addFolder':
          window.electronAPI.app.showOpenDialog();
          break;
        // Add more menu actions as needed
      }
    };

    // Register event listeners
    window.electronAPI.on('player-status-changed', handlePlayerStatusChanged);
    window.electronAPI.on('scan-progress', handleScanProgress);
    window.electronAPI.on('drive-added', handleDriveAdded);
    window.electronAPI.on('drive-removed', handleDriveRemoved);
    window.electronAPI.on('global-shortcut', handleGlobalShortcut);
    window.electronAPI.on('menu-action', handleMenuAction);

    // Cleanup
    return () => {
      window.electronAPI.off('player-status-changed', handlePlayerStatusChanged);
      window.electronAPI.off('scan-progress', handleScanProgress);
      window.electronAPI.off('drive-added', handleDriveAdded);
      window.electronAPI.off('drive-removed', handleDriveRemoved);
      window.electronAPI.off('global-shortcut', handleGlobalShortcut);
      window.electronAPI.off('menu-action', handleMenuAction);
    };
  }, [setPlayerStatus, setScanProgress, setDrives, loadLibrary]);
}