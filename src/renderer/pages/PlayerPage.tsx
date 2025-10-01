/**
 * Video player page component
 */

import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';

export function PlayerPage() {
  const { 
    playerStatus, 
    isPlaying, 
    isPlayerLoading,
    isMuted, 
    volume, 
    position, 
    duration,
    currentMovie,
    currentEpisode,
    useExternalPlayer,
    videoPath,
    setIsPlaying,
    setPosition,
    setDuration,
    setVolume,
    setIsMuted
  } = useAppStore();

  const currentMedia = currentMovie || currentEpisode;

  console.log('[PlayerPage] Render:', { 
    currentMedia: currentMedia?.title, 
    useExternalPlayer, 
    videoPath,
    isPlayerLoading 
  });

  // HTML5 video ref
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const lastSavedPositionRef = React.useRef<number>(0);

  // Helper function to save progress
  const saveProgress = React.useCallback(async (currentPosition: number, totalDuration: number) => {
    if (!currentMedia || !currentPosition || !totalDuration) return;
    
    // Don't save if position hasn't changed much (less than 2 seconds)
    if (Math.abs(currentPosition - lastSavedPositionRef.current) < 2) {
      return;
    }

    const percentage = (currentPosition / totalDuration) * 100;
    const isCompleted = percentage >= 90; // Consider completed if 90% or more watched

    const progressData = {
      id: currentMedia.id, // Use media ID as progress ID
      mediaId: currentMedia.id,
      mediaType: currentMovie ? 'movie' : 'episode' as 'movie' | 'episode',
      position: currentPosition,
      duration: totalDuration,
      percentage,
      isCompleted,
      lastWatched: new Date().toISOString(),
    };

    console.log('[PlayerPage] Saving progress:', progressData);
    
    try {
      await (window as any).HPlayerAPI.progress.save(progressData);
      lastSavedPositionRef.current = currentPosition;
      console.log('[PlayerPage] Progress saved successfully');
    } catch (error) {
      console.error('[PlayerPage] Failed to save progress:', error);
    }
  }, [currentMedia, currentMovie]);

  // Separate effect to handle initial seek to resume position
  const hasSeenRef = React.useRef(false);
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || useExternalPlayer || !videoPath) return;
    
    // Reset the flag when videoPath changes (new video loaded)
    hasSeenRef.current = false;
    
    // Wait for video to be loaded before seeking
    const handleLoadedMetadata = () => {
      if (position > 0 && Math.abs(video.currentTime - position) > 1 && !hasSeenRef.current) {
        console.log('[PlayerPage] Seeking to resume position:', position);
        video.currentTime = position;
        hasSeenRef.current = true;
      }
    };
    
    if (video.readyState >= 1) {
      // Metadata already loaded
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [useExternalPlayer, videoPath, position]);

  // Handle HTML5 video events
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || useExternalPlayer || !videoPath) {
      console.log('[PlayerPage] Skipping HTML5 setup:', { video: !!video, useExternalPlayer, videoPath });
      return;
    }

    console.log('[PlayerPage] Setting up HTML5 video:', videoPath);

    const handlePlay = () => {
      console.log('[PlayerPage] HTML5 video playing');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('[PlayerPage] HTML5 video paused');
      setIsPlaying(false);
      // Save progress when video pauses
      if (video.currentTime > 0 && video.duration) {
        saveProgress(video.currentTime, video.duration);
      }
    };
    
    const handleTimeUpdate = () => {
      setPosition(video.currentTime);
    };
    
    const handleDurationChange = () => {
      console.log('[PlayerPage] HTML5 duration changed:', video.duration);
      setDuration(video.duration);
    };
    
    const handleVolumeChange = () => {
      setVolume(video.volume * 100);
      setIsMuted(video.muted);
    };
    
    const handleError = (e: Event) => {
      console.error('[PlayerPage] HTML5 video error:', (e.target as HTMLVideoElement).error);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    // Auto-play
    video.play().catch(err => console.error('[PlayerPage] Auto-play failed:', err));

    return () => {
      // Save progress when unmounting (navigating away)
      if (video.currentTime > 0 && video.duration) {
        console.log('[PlayerPage] Saving progress on unmount');
        saveProgress(video.currentTime, video.duration);
      }
      
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
    };
  }, [useExternalPlayer, videoPath, setIsPlaying, setPosition, setDuration, setVolume, setIsMuted, saveProgress]);

  // Periodic progress saving (every 5 seconds during playback)
  React.useEffect(() => {
    if (!isPlaying || !duration || !currentMedia) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        if (currentTime > 0) {
          saveProgress(currentTime, duration);
        }
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, duration, currentMedia, saveProgress]);

  // Helper functions for controls
  const handlePlayPause = () => {
    if (useExternalPlayer) {
      // Use external player API
      if (isPlaying) {
        (window as any).HPlayerAPI.player.pause();
      } else {
        (window as any).HPlayerAPI.player.play();
      }
    } else {
      // Use HTML5 video
      const video = videoRef.current;
      if (video) {
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
      }
    }
  };

  const handleSeek = (newPosition: number) => {
    if (useExternalPlayer) {
      (window as any).HPlayerAPI.player.seek(newPosition);
    } else {
      const video = videoRef.current;
      if (video) {
        video.currentTime = newPosition;
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (useExternalPlayer) {
      (window as any).HPlayerAPI.player.setVolume(newVolume);
    } else {
      const video = videoRef.current;
      if (video) {
        video.volume = newVolume / 100;
      }
    }
  };

  const handleMuteToggle = () => {
    if (useExternalPlayer) {
      (window as any).HPlayerAPI.player.setMuted(!isMuted);
    } else {
      const video = videoRef.current;
      if (video) {
        video.muted = !video.muted;
      }
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'KeyM':
          handleMuteToggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, position - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(position + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(100, volume + 5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [position, volume, isPlaying, isMuted]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (!playerStatus) return 'No Status';
    if (playerStatus.state === 'playing') return 'Now Playing';
    if (playerStatus.state === 'paused') return 'Paused';
    if (playerStatus.state === 'loading') return 'Loading...';
    return 'Stopped';
  };

  if (!currentMedia) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold mb-2">No Media Playing</h2>
          <p className="text-slate-400">Select a movie or episode to start watching</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black relative group">
      {/* Loading Overlay */}
      {isPlayerLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold">Starting playback...</h3>
            <p className="text-slate-400 mt-2">Please wait while we load your video</p>
          </div>
        </div>
      )}
      
      {/* Video Player Area */}
      <div className="h-full flex items-center justify-center">
        {!useExternalPlayer && videoPath ? (
          /* HTML5 Video Element */
          <video
            ref={videoRef}
            src={`file://${videoPath}`}
            className="w-full h-full object-contain"
            controls={false}
            autoPlay
          />
        ) : (
          /* Fallback display for external player or no video */
          <div className="text-center text-white">
            <div className="text-8xl mb-4">
              {isPlaying ? '▶️' : '⏸️'}
            </div>
            <h2 className="text-3xl font-bold mb-2">{currentMedia?.title}</h2>
            <p className="text-slate-400 text-lg">
              {getStatusText()}
            </p>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6">
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div 
            className="w-full h-2 bg-slate-600 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newPosition = (clickX / rect.width) * duration;
              handleSeek(newPosition);
            }}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-200" 
              style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-slate-300 mt-1">
            <span>{formatTime(position)}</span>
            <span>{duration ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-blue-400 transition-colors text-2xl
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleMuteToggle}
                className="text-white hover:text-blue-400 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
              >
                {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
              </button>
              <div 
                className="w-20 h-1 bg-slate-600 rounded-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newVolume = (clickX / rect.width) * 100;
                  handleVolumeChange(newVolume);
                }}
              >
                <div 
                  className="h-full bg-white rounded-full" 
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                />
              </div>
              <span className="text-sm text-slate-300 w-8">{Math.round(isMuted ? 0 : volume)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Back button */}
            <button 
              onClick={() => useAppStore.getState().setCurrentView('home')}
              className="text-white hover:text-blue-400 transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-3 py-1"
            >
              ← Back
            </button>

            {/* Settings placeholder */}
            <button className="text-white hover:text-blue-400 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-3 py-1">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="absolute top-4 right-4 text-slate-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/60 rounded-lg p-3 space-y-1">
          <div>Space: Play/Pause</div>
          <div>M: Mute</div>
          <div>←/→: Seek ±10s</div>
          <div>↑/↓: Volume ±5</div>
        </div>
      </div>
    </div>
  );
}