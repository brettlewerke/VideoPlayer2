/**
 * Home page with continue watching, recently added, and quick access
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { MediaGrid } from '../components/MediaGrid.js';
import { HeroSection } from '../components/HeroSection.js';

export function HomePage() {
  const { 
    continueWatching, 
    recentlyAdded, 
    movies, 
    shows, 
    isScanning,
    scanProgress 
  } = useAppStore();

  const featuredMovie = movies[0]; // Use first movie as featured

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero section */}
      {featuredMovie && <HeroSection movie={featuredMovie} />}

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

      {/* Content sections */}
      <div className="px-8 pb-8 space-y-8">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 text-green-100">Continue Watching</h2>
            <MediaGrid items={continueWatching} />
          </section>
        )}

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 text-green-100">Recently Added</h2>
            <MediaGrid items={recentlyAdded} />
          </section>
        )}

        {/* Movies */}
        {movies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-100">Movies</h2>
              <button className="text-green-400 hover:text-green-300 transition-colors">
                View All →
              </button>
            </div>
            <MediaGrid items={movies.slice(0, 10)} />
          </section>
        )}

        {/* TV Shows */}
        {shows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-100">TV Shows</h2>
              <button className="text-green-400 hover:text-green-300 transition-colors">
                View All →
              </button>
            </div>
            <MediaGrid items={shows.slice(0, 10)} />
          </section>
        )}

        {/* Empty state */}
        {movies.length === 0 && shows.length === 0 && !isScanning && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold mb-2 text-green-100">No Media Found</h3>
            <p className="text-green-300/70 mb-6 max-w-md mx-auto">
              Start by scanning your drives for Movies and TV Shows folders, or add a media folder manually.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.electronAPI.library.scanMedia()}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 
                  text-black font-medium py-3 px-6 rounded-lg transition-all duration-200 
                  focus:outline-none focus:ring-2 focus:ring-green-500/50 shadow-lg shadow-green-500/20"
              >
                Scan for Media
              </button>
              <div className="text-sm text-green-400/60">
                or press Ctrl+R to scan drives
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}