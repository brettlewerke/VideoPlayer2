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

  // Log when video path changes
  React.useEffect(() => {
    if (videoPath) {
      console.log('[PlayerPage] 🎬 Video path set:', videoPath);
      console.log('[PlayerPage] 📝 Expected file protocol URL:', `file://${videoPath}`);
      
      // Check codec support
      if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported) {
        console.group('[PlayerPage] 🔍 Codec Support Check');
        const codecs = [
          { name: 'H.264 + AAC', mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' },
          { name: 'H.264 + AC3', mime: 'video/mp4; codecs="avc1.42E01E, ac-3"' },
          { name: 'H.264 + E-AC3', mime: 'video/mp4; codecs="avc1.42E01E, ec-3"' },
          { name: 'AC3 Audio Only', mime: 'audio/mp4; codecs="ac-3"' },
          { name: 'E-AC3 Audio Only', mime: 'audio/mp4; codecs="ec-3"' },
          { name: 'AAC Audio Only', mime: 'audio/mp4; codecs="mp4a.40.2"' },
        ];
        
        codecs.forEach(({ name, mime }) => {
          const supported = MediaSource.isTypeSupported(mime);
          console.log(`${supported ? '✅' : '❌'} ${name}: ${mime}`);
        });
        console.groupEnd();
      }
    }
  }, [videoPath]);

  // HTML5 video ref
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const lastSavedPositionRef = React.useRef<number>(0);
  const codecCheckTimerRef = React.useRef<number | null>(null);
  const hasAttemptedFallbackRef = React.useRef<boolean>(false);
  const [fallbackNotification, setFallbackNotification] = React.useState<string | null>(null);

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

  // Function to fallback to external player
  const fallbackToExternalPlayer = React.useCallback(async (reason: string) => {
    if (hasAttemptedFallbackRef.current || !videoPath || !currentMedia) {
      return;
    }

    console.warn('[PlayerPage] 🔄 Codec issue detected, falling back to external player');
    console.warn('[PlayerPage] Reason:', reason);
    
    hasAttemptedFallbackRef.current = true;

    // Show notification to user
    setFallbackNotification('Codec not supported. Launching external player...');

    try {
      // Stop HTML5 video
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = '';
      }

      // Get current position for resume
      const currentPosition = position || 0;

      console.log('[PlayerPage] Launching external player with position:', currentPosition);
      
      // Call player.start with forceExternal flag
      const result = await (window as any).HPlayerAPI.player.start({
        path: videoPath,
        forceExternal: true,
        startOptions: {
          position: currentPosition,
          autoplay: true
        }
      });

      console.log('[PlayerPage] External player fallback result:', result);

      if (result.success && result.data.useExternalPlayer) {
        // Update store to reflect external player usage
        useAppStore.getState().setUseExternalPlayer(true);
        console.log('[PlayerPage] ✅ Successfully switched to external player');
        setFallbackNotification('Playing in external player');
        setTimeout(() => setFallbackNotification(null), 3000);
      } else {
        console.error('[PlayerPage] ❌ External player fallback failed:', result);
        setFallbackNotification('External player not available. Video may not play correctly.');
        setTimeout(() => setFallbackNotification(null), 5000);
      }
    } catch (error) {
      console.error('[PlayerPage] Failed to fallback to external player:', error);
      setFallbackNotification('Failed to launch external player');
      setTimeout(() => setFallbackNotification(null), 5000);
    }
  }, [videoPath, currentMedia, position]);

  // Detect codec issues and auto-fallback
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || useExternalPlayer || !videoPath || hasAttemptedFallbackRef.current) {
      return;
    }

    // Reset fallback flag when video changes
    hasAttemptedFallbackRef.current = false;

    // Check for codec issues after video starts loading
    const checkCodecIssues = () => {
      if (codecCheckTimerRef.current) {
        window.clearTimeout(codecCheckTimerRef.current);
      }

      codecCheckTimerRef.current = window.setTimeout(() => {
        if (!video || hasAttemptedFallbackRef.current) return;

        const hasVideo = video.videoWidth > 0 && video.videoHeight > 0;
        const webkitAudioDecodedByteCount = (video as any).webkitAudioDecodedByteCount;
        const mozHasAudio = (video as any).mozHasAudio;
        
        // Check if we're trying to play but have issues
        const hasAudio = mozHasAudio !== false && (webkitAudioDecodedByteCount === undefined || webkitAudioDecodedByteCount > 0);
        const hasValidDuration = video.duration && video.duration > 0 && !isNaN(video.duration);

        console.log('[PlayerPage] 🔍 Codec check:', {
          hasVideo,
          hasAudio,
          hasValidDuration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          webkitAudioDecodedByteCount,
          mozHasAudio,
          duration: video.duration,
          readyState: video.readyState,
          networkState: video.networkState
        });

        // Determine if there's a codec issue
        let codecIssue = false;
        let reason = '';

        if (hasValidDuration && video.readyState >= 1) {
          // Video has loaded metadata
          if (!hasVideo) {
            codecIssue = true;
            reason = 'No video stream detected - video codec may not be supported';
          } else if (!hasAudio && webkitAudioDecodedByteCount === 0) {
            codecIssue = true;
            reason = 'No audio stream detected - audio codec may not be supported';
          }
        }

        if (codecIssue) {
          console.warn('[PlayerPage] ⚠️ Codec issue detected:', reason);
          fallbackToExternalPlayer(reason);
        }
      }, 2000); // Wait 2 seconds after canplay event
    };

    // Listen for canplay event to check codecs
    const handleCanPlayCheck = () => {
      console.log('[PlayerPage] 🎬 Can play event - scheduling codec check');
      checkCodecIssues();
    };

    video.addEventListener('canplay', handleCanPlayCheck);

    return () => {
      video.removeEventListener('canplay', handleCanPlayCheck);
      if (codecCheckTimerRef.current) {
        window.clearTimeout(codecCheckTimerRef.current);
      }
    };
  }, [videoPath, useExternalPlayer, fallbackToExternalPlayer]);

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

    // Log audio and video track information
    const logMediaTracks = () => {
      console.group('[PlayerPage] 🎬 Media Track Analysis');
      console.log('Video Path:', videoPath);
      console.log('Video Element:', video);
      
      // Video track info (using any to access videoTracks - not all browsers fully support this API)
      const videoTracks = (video as any).videoTracks;
      console.log('🎥 Video Tracks Count:', videoTracks?.length || 0);
      if (videoTracks && videoTracks.length > 0) {
        for (let i = 0; i < videoTracks.length; i++) {
          const track = videoTracks[i];
          console.log(`  Video Track ${i}:`, {
            id: track.id,
            kind: track.kind,
            label: track.label,
            language: track.language,
            selected: track.selected
          });
        }
      } else {
        console.warn('⚠️ NO VIDEO TRACKS DETECTED (or API not supported)');
      }
      
      // Audio track info
      const audioTracks = (video as any).audioTracks;
      console.log('🔊 Audio Tracks Count:', audioTracks?.length || 0);
      if (audioTracks && audioTracks.length > 0) {
        for (let i = 0; i < audioTracks.length; i++) {
          const track = audioTracks[i];
          console.log(`  Audio Track ${i}:`, {
            id: track.id,
            kind: track.kind,
            label: track.label,
            language: track.language,
            enabled: track.enabled
          });
        }
      } else {
        console.warn('⚠️ NO AUDIO TRACKS DETECTED (or API not supported)');
      }
      
      // Video element properties
      console.log('📊 Video Element Properties:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        networkState: video.networkState,
        currentSrc: video.currentSrc,
        muted: video.muted,
        volume: video.volume,
        paused: video.paused
      });
      
      // Check for actual video/audio rendering
      console.log('🖼️ Video Dimensions:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        hasVideo: video.videoWidth > 0 && video.videoHeight > 0
      });
      
      // Media source info
      if (video.currentSrc) {
        console.log('📁 Media Source:', video.currentSrc);
      }
      
      // Check if video has audio by attempting to read mozHasAudio or webkitAudioDecodedByteCount
      const mozHasAudio = (video as any).mozHasAudio;
      const webkitAudioDecodedByteCount = (video as any).webkitAudioDecodedByteCount;
      if (mozHasAudio !== undefined) {
        console.log('🔊 Has Audio (Mozilla):', mozHasAudio);
      }
      if (webkitAudioDecodedByteCount !== undefined) {
        console.log('🔊 Audio Decoded Bytes (WebKit):', webkitAudioDecodedByteCount);
      }
      
      console.groupEnd();
    };

    const handleLoadedMetadata = () => {
      console.log('[PlayerPage] 📺 Video metadata loaded');
      logMediaTracks();
    };

    const handleLoadedData = () => {
      console.log('[PlayerPage] 📦 Video data loaded (can render first frame)');
      logMediaTracks();
    };

    const handleCanPlay = () => {
      console.log('[PlayerPage] ✅ Video can start playing');
      logMediaTracks();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);

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
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
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
      {/* Fallback Notification */}
      {fallbackNotification && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 
          bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg
          animate-fade-in flex items-center space-x-3">
          <div className="text-2xl">🔄</div>
          <div className="font-semibold">{fallbackNotification}</div>
        </div>
      )}

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