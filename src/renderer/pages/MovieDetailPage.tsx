/**
 * Movie detail page with Resume/Restart/Delete options
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import type { Movie } from '../../shared/types.js';

export function MovieDetailPage() {
  const { 
    currentMovie, 
    setCurrentView,
    playMedia,
  } = useAppStore();
  
  const [progress, setProgress] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load progress when page opens
  useEffect(() => {
    if (currentMovie) {
      loadProgress();
    }
  }, [currentMovie]);

  const loadProgress = async () => {
    if (!currentMovie) return;
    try {
      const prog = await (window as any).HPlayerAPI.progress.get(currentMovie.id);
      setProgress(prog);
    } catch (error) {
      console.error('Failed to load progress:', error);
      setProgress(null);
    }
  };

  const handleResume = async () => {
    if (!currentMovie) return;
    await playMedia(currentMovie, null);
  };

  const handleRestart = async () => {
    if (!currentMovie) return;
    // Clear progress first, then play
    try {
      await (window as any).HPlayerAPI.progress.delete(currentMovie.id);
      await playMedia(currentMovie, null);
    } catch (error) {
      console.error('Failed to restart:', error);
    }
  };

  const handleDelete = async () => {
    if (!currentMovie) return;
    setIsDeleting(true);
    try {
      await (window as any).HPlayerAPI.library.deleteMovie(currentMovie.id);
      setShowDeleteConfirm(false);
      // Go back to home and reload library
      setCurrentView('home');
      const store = useAppStore.getState();
      await store.loadLibrary();
    } catch (error) {
      console.error('Failed to delete movie:', error);
      alert('Failed to delete movie: ' + (error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    setCurrentView('home');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (!currentMovie) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold mb-2">No Movie Selected</h2>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasProgress = progress && progress.position > 0;
  const progressPercentage = progress ? Math.round(progress.percentage) : 0;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-red-500/30">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete Movie?</h3>
              <p className="text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-white">"{currentMovie.title}"</span>?
              </p>
              <p className="text-slate-400 text-sm mt-2">
                This will remove all database entries and playback progress. The video file will NOT be deleted from disk.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-semibold"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-10 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm text-white rounded-lg transition-all border border-slate-600/50 flex items-center gap-2"
      >
        <span>←</span>
        <span>Back</span>
      </button>

      {/* Hero Section */}
      <div className="relative h-96">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-black">
          {currentMovie.backdropPath && (
            <img
              src={`file://${currentMovie.backdropPath}`}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Content */}
        <div className="relative h-full flex items-end p-8">
          <div className="flex gap-6 w-full max-w-6xl">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="w-48 aspect-[2/3] bg-slate-700 rounded-lg overflow-hidden shadow-2xl">
                {currentMovie.posterPath ? (
                  <img
                    src={`file://${currentMovie.posterPath}`}
                    alt={currentMovie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎬</div>
                      <div className="text-xs">No Poster</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-white mb-4">{currentMovie.title}</h1>
              
              <div className="flex items-center gap-4 mb-4 text-slate-300">
                {currentMovie.year && (
                  <span className="bg-slate-800/80 px-3 py-1 rounded text-sm font-medium">
                    {currentMovie.year}
                  </span>
                )}
                {currentMovie.duration && (
                  <span className="bg-slate-800/80 px-3 py-1 rounded text-sm font-medium">
                    {formatTime(currentMovie.duration)}
                  </span>
                )}
                <span className="bg-slate-800/80 px-3 py-1 rounded text-sm font-medium">
                  {currentMovie.videoFile.extension.toUpperCase()}
                </span>
                <span className="bg-slate-800/80 px-3 py-1 rounded text-sm font-medium">
                  {formatFileSize(currentMovie.videoFile.size)}
                </span>
              </div>

              {/* Progress Bar */}
              {hasProgress && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>{progressPercentage}% complete</span>
                    <span>{formatTime(progress.position)} / {formatTime(progress.duration)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Resume Button */}
          <button
            onClick={handleResume}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-6 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/50 hover:scale-105"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">▶️</span>
              <div className="text-left">
                <div className="text-lg">{hasProgress ? 'Resume' : 'Play'}</div>
                {hasProgress && (
                  <div className="text-xs opacity-80">From {formatTime(progress.position)}</div>
                )}
              </div>
            </div>
          </button>

          {/* Restart Button */}
          <button
            onClick={handleRestart}
            className="group relative overflow-hidden bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-semibold py-6 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-slate-500/30 hover:scale-105"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">🔄</span>
              <div className="text-left">
                <div className="text-lg">Restart</div>
                <div className="text-xs opacity-80">From beginning</div>
              </div>
            </div>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-red-600/80 to-red-500/80 hover:from-red-600 hover:to-red-500 text-white font-semibold py-6 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-500/30 hover:scale-105"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">🗑️</span>
              <div className="text-left">
                <div className="text-lg">Delete</div>
                <div className="text-xs opacity-80">Remove from library</div>
              </div>
            </div>
          </button>
        </div>

        {/* File Details */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">File Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">File Name</div>
              <div className="text-white font-mono text-xs break-all">{currentMovie.videoFile.filename}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">File Path</div>
              <div className="text-white font-mono text-xs break-all">{currentMovie.videoFile.path}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">File Size</div>
              <div className="text-white">{formatFileSize(currentMovie.videoFile.size)}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Format</div>
              <div className="text-white">{currentMovie.videoFile.extension.toUpperCase().replace('.', '')}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Last Modified</div>
              <div className="text-white">{new Date(currentMovie.videoFile.lastModified).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Drive</div>
              <div className="text-white font-mono">{currentMovie.driveId}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
