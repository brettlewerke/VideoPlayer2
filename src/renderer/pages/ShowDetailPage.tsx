/**
 * TV Show detail page with hierarchical Season → Episode structure
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import type { Show, Season, Episode } from '../../shared/types.js';

export function ShowDetailPage() {
  const { 
    currentShow,
    seasons,
    episodes,
    setCurrentView,
    setCurrentEpisode,
    playMedia,
  } = useAppStore();
  
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'show' | 'season' | 'episode', id: string, title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [episodeProgress, setEpisodeProgress] = useState<Map<string, any>>(new Map());

  // Get seasons for this show
  const showSeasons = seasons
    .filter(s => s.showId === currentShow?.id)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  useEffect(() => {
    if (currentShow) {
      loadEpisodeProgress();
      // Auto-expand first season
      if (showSeasons.length > 0) {
        setExpandedSeasons(new Set([showSeasons[0].id]));
      }
    }
  }, [currentShow]);

  const loadEpisodeProgress = async () => {
    if (!currentShow) return;
    const showEpisodes = episodes.filter(e => e.showId === currentShow.id);
    const progressMap = new Map();
    
    for (const episode of showEpisodes) {
      try {
        const prog = await (window as any).HPlayerAPI.progress.get(episode.id);
        if (prog) {
          progressMap.set(episode.id, prog);
        }
      } catch (error) {
        // No progress for this episode
      }
    }
    
    setEpisodeProgress(progressMap);
  };

  const toggleSeason = (seasonId: string) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonId)) {
      newExpanded.delete(seasonId);
    } else {
      newExpanded.add(seasonId);
    }
    setExpandedSeasons(newExpanded);
  };

  const getSeasonEpisodes = (seasonId: string) => {
    return episodes
      .filter(e => e.seasonId === seasonId)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  };

  const handlePlayEpisode = async (episode: Episode, restart = false) => {
    const api = (window as any).HPlayerAPI;
    const { setCurrentView, setCurrentEpisode } = useAppStore.getState();
    
    try {
      if (restart) {
        // Clear progress when restarting
        await api.progress.delete(episode.id);
      }
      
      setCurrentEpisode(episode);
      setCurrentView('player');
      
      const path = episode.videoFile.path;
      
      if (restart) {
        // Start from beginning
        await api.player.start(path, { start: 0 });
      } else {
        // Resume from saved position
        const prog = await api.progress.get(episode.id);
        await api.player.start(path, prog ? { start: prog.position } : undefined);
      }
    } catch (error) {
      console.error('Failed to play episode:', error);
    }
  };

  const handleDeleteClick = (type: 'show' | 'season' | 'episode', id: string, title: string) => {
    setDeleteTarget({ type, id, title });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    
    try {
      const api = (window as any).HPlayerAPI.library;
      
      switch (deleteTarget.type) {
        case 'show':
          await api.deleteShow(deleteTarget.id);
          setCurrentView('home');
          break;
        case 'season':
          await api.deleteSeason(deleteTarget.id);
          break;
        case 'episode':
          await api.deleteEpisode(deleteTarget.id);
          break;
      }
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      
      // Reload library
      const store = useAppStore.getState();
      await store.loadLibrary();
      
      if (deleteTarget.type !== 'show') {
        // Reload progress
        await loadEpisodeProgress();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete: ' + (error as Error).message);
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
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (!currentShow) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-2xl font-bold mb-2">No Show Selected</h2>
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

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-red-500/30">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete {deleteTarget.type}?</h3>
              <p className="text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>?
              </p>
              <p className="text-slate-400 text-sm mt-2">
                {deleteTarget.type === 'show' && 'This will remove all seasons, episodes, and progress data.'}
                {deleteTarget.type === 'season' && 'This will remove all episodes in this season and their progress data.'}
                {deleteTarget.type === 'episode' && 'This will remove this episode and its progress data.'}
                <br />
                Video files will NOT be deleted from disk.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
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
        className="fixed top-10 left-[268px] z-10 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm text-white rounded-lg transition-all border border-slate-600/50 flex items-center gap-2"
      >
        <span>←</span>
        <span>Back</span>
      </button>

      {/* Hero Section */}
      <div className="relative h-72">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-black">
          {currentShow.backdropPath && (
            <img
              src={`file://${currentShow.backdropPath}`}
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
              <div className="w-40 aspect-[2/3] bg-slate-700 rounded-lg overflow-hidden shadow-2xl">
                {(() => {
                  const posterPath = currentShow.rottenTomatoesPosterPath || currentShow.posterPath;
                  return posterPath ? (
                    <img
                      src={`poster:///${posterPath.replace(/\\/g, '/')}`}
                      alt={currentShow.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📺</div>
                        <div className="text-xs">No Poster</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-4">{currentShow.title}</h1>
              
              <div className="flex items-center gap-4 mb-4 text-slate-300">
                <span className="bg-slate-800/80 px-3 py-1 rounded text-sm font-medium">
                  {showSeasons.length} Season{showSeasons.length !== 1 ? 's' : ''}
                </span>
                <span className="bg-slate-800/80 px-3 py-1 rounded text-sm font-medium">
                  {episodes.filter(e => e.showId === currentShow.id).length} Episodes
                </span>
              </div>

              {/* Delete Show Button */}
              <button
                onClick={() => handleDeleteClick('show', currentShow.id, currentShow.title)}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                🗑️ Delete Show
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seasons and Episodes */}
      <div className="p-8 max-w-6xl space-y-4">
        {showSeasons.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-4">📺</div>
            <p>No seasons found for this show</p>
          </div>
        ) : (
          showSeasons.map(season => {
            const seasonEpisodes = getSeasonEpisodes(season.id);
            const isExpanded = expandedSeasons.has(season.id);
            
            return (
              <div key={season.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
                {/* Season Header */}
                <button
                  onClick={() => toggleSeason(season.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{isExpanded ? '▼' : '▶'}</span>
                    <div className="text-left">
                      <h3 className="text-xl font-semibold text-white">
                        Season {season.seasonNumber}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {seasonEpisodes.length} Episode{seasonEpisodes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick('season', season.id, `Season ${season.seasonNumber}`);
                    }}
                    className="px-3 py-1.5 bg-red-600/60 hover:bg-red-600 text-white rounded text-sm transition-colors"
                  >
                    🗑️ Delete Season
                  </button>
                </button>

                {/* Episode List */}
                {isExpanded && (
                  <div className="border-t border-slate-700/50">
                    {seasonEpisodes.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <p>No episodes found in this season</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700/50">
                        {seasonEpisodes.map(episode => {
                          const progress = episodeProgress.get(episode.id);
                          const hasProgress = progress && progress.position > 0;
                          const progressPercentage = progress ? Math.round(progress.percentage) : 0;
                          
                          return (
                            <div key={episode.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                              <div className="flex items-start gap-4">
                                {/* Episode Number */}
                                <div className="flex-shrink-0 w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold">
                                  {episode.episodeNumber}
                                </div>

                                {/* Episode Info */}
                                <div className="flex-1">
                                  <h4 className="text-white font-medium mb-1">
                                    {episode.title || `Episode ${episode.episodeNumber}`}
                                  </h4>
                                  
                                  <div className="flex items-center gap-3 text-sm text-slate-400 mb-2">
                                    {episode.duration && (
                                      <span>{formatTime(episode.duration)}</span>
                                    )}
                                    <span>{episode.videoFile.extension.toUpperCase()}</span>
                                    <span>{formatFileSize(episode.videoFile.size)}</span>
                                  </div>

                                  {/* Progress Bar */}
                                  {hasProgress && (
                                    <div className="mb-2">
                                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500 rounded-full transition-all"
                                          style={{ width: `${progressPercentage}%` }}
                                        />
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">
                                        {progressPercentage}% complete
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handlePlayEpisode(episode)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                                    >
                                      ▶️ {hasProgress ? 'Resume' : 'Play'}
                                    </button>
                                    
                                    {hasProgress && (
                                      <button
                                        onClick={() => handlePlayEpisode(episode, true)}
                                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                                      >
                                        🔄 Restart
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => handleDeleteClick('episode', episode.id, episode.title || `Episode ${episode.episodeNumber}`)}
                                      className="px-3 py-1.5 bg-red-600/60 hover:bg-red-600 text-white rounded text-sm transition-colors"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
