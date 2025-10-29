/**
 * Home page with continue watching, recently added, and quick access
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { MediaGrid } from '../components/MediaGrid.js';
import { HeroSection } from '../components/HeroSection.js';
import { EmptyState } from '../components/EmptyState.js';

export function HomePage() {
  const { 
    continueWatching, 
    recentlyAdded, 
    movies, 
    shows, 
    isScanning,
    scanProgress,
    activeMenu,
    drives,
    status,
    scanDrives,
    setCurrentView
  } = useAppStore();

  const featuredMovie = movies[0]; // Use first movie as featured

  // Handle empty states
  if (status === 'no-drives' && !isScanning) {
    return <EmptyState type="no-drives" drives={drives} onRescan={scanDrives} isScanning={isScanning} />;
  }

  if (status === 'no-folders' && !isScanning) {
    return <EmptyState type="no-folders" drives={drives} onRescan={scanDrives} isScanning={isScanning} />;
  }

  // Selected collection items
  let contentSection: React.ReactNode = null;
  if (activeMenu === 'movies') {
    // Movies view: Show both movies AND TV shows
    contentSection = (
      <>
        {movies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-100">Movies</h2>
              <button 
                onClick={() => setCurrentView('movies')}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                View All →
              </button>
            </div>
            <MediaGrid items={movies.slice(0, 12)} />
          </section>
        )}
        
        {shows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-100">TV Shows</h2>
              <button 
                onClick={() => setCurrentView('shows')}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                View All →
              </button>
            </div>
            <MediaGrid items={shows.slice(0, 12)} />
          </section>
        )}
      </>
    );
  } else if (activeMenu === 'shows') {
    contentSection = shows.length > 0 ? (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-green-100">TV Shows</h2>
          <button 
            onClick={() => setCurrentView('shows')}
            className="text-green-400 hover:text-green-300 transition-colors"
          >
            View All →
          </button>
        </div>
        <MediaGrid items={shows.slice(0, 12)} />
      </section>
    ) : null;
  } else if (activeMenu === 'continue') {
    contentSection = continueWatching.length > 0 ? (
      <section>
        <h2 className="text-2xl font-bold mb-4 text-green-100">Continue Watching</h2>
        <MediaGrid items={continueWatching} />
      </section>
    ) : <div className="text-green-300/70">Nothing in progress yet.</div>;
  } else if (activeMenu === 'recent') {
    contentSection = recentlyAdded.length > 0 ? (
      <section>
        <h2 className="text-2xl font-bold mb-4 text-green-100">Recently Added</h2>
        <MediaGrid items={recentlyAdded} />
      </section>
    ) : <div className="text-green-300/70">No recent additions.</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero section (only for movies tab for now) */}
      {activeMenu === 'movies' && featuredMovie && <HeroSection movie={featuredMovie} />}

      {/* Scan progress */}
      {isScanning && scanProgress && (
        <div className="mx-8 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-300">
                Scanning: {scanProgress.driveName}
              </span>
              <span className="text-sm text-green-400">
                {scanProgress.processedFiles} / {scanProgress.totalFiles}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, Math.max(0, (scanProgress.processedFiles / scanProgress.totalFiles) * 100))}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-8 pb-8 space-y-8">
        {contentSection}
      </div>
    </div>
  );
}