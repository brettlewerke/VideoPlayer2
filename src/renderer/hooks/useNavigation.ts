/**
 * Custom hooks for keyboard navigation and remote control support
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';

interface NavigationOptions {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onBack?: () => void;
  onEscape?: () => void;
}

/**
 * Hook for handling keyboard navigation
 */
export function useNavigation(options: NavigationOptions = {}) {
  const { onUp, onDown, onLeft, onRight, onEnter, onBack, onEscape } = options;

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
        event.preventDefault();
        onBack?.();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
    }
  }, [onUp, onDown, onLeft, onRight, onEnter, onBack, onEscape]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
  const [focusedIndex, setFocusedIndex] = useState(0);

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
  const { isPlaying, setIsPlaying } = useAppStore();

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

  return { togglePlayPause, stop, isPlaying };
}