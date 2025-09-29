/**
 * Home page with continue watching, recently added, and quick access
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
// import { useNavigation } from '../hooks/useNavigation.js';
import { MediaGrid } from '../components/MediaGrid.js';
import { HeroSection } from '../components/HeroSection.js';

export function HomePage() {
  const { 
    continueWatching, 
    recentlyAdded, 
    movies, 
    shows, 
    isScanning,
    scanProgress,
    activeMenu,
    drives
  } = useAppStore();

  const featuredMovie = movies[0]; // Use first movie as featured

  const missingMovies = drives.length > 0 && movies.length === 0;
  const missingShows = drives.length > 0 && shows.length === 0;
  const noDrive = drives.length === 0;

  const showDriveNotFound = !isScanning && (noDrive || (missingMovies && missingShows));

  // Selected collection items
  let contentSection: React.ReactNode = null;
  if (activeMenu === 'movies') {
    contentSection = movies.length > 0 ? (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-green-100">Movies</h2>
          <button className="text-green-400 hover:text-green-300 transition-colors">View All →</button>
        </div>
        <MediaGrid items={movies.slice(0, 12)} />
      </section>
    ) : null;
  } else if (activeMenu === 'shows') {
    contentSection = shows.length > 0 ? (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-green-100">TV Shows</h2>
          <button className="text-green-400 hover:text-green-300 transition-colors">View All →</button>
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
        {showDriveNotFound ? (
          <div className="text-center py-24 max-w-3xl mx-auto">
            <div className="mb-6">
              <div className="mx-auto w-28 h-28 rounded-2xl flex items-center justify-center bg-surface-2 shadow-brand-glow">
                <span className="text-4xl font-bold text-brand">H</span>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold mb-4 text-text-primary">Drive not found</h1>
            <p className="text-text-secondary mb-6 leading-relaxed">
              This desktop app catalogs Movies and TV Shows from a plugged-in drive. At the root of the drive, create two folders named <span className="text-brand font-semibold">Movies</span> and <span className="text-brand font-semibold">TV Shows</span>. Once attached, H Player will scan them locally and display your library—no network required.
            </p>
            <div className="mb-4 text-sm text-text-muted">
              Inspected mount points: {drives.length === 0 ? 'none detected yet' : drives.map(d=>d.mountPath).join(', ')}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.electronAPI.library.scanMedia()}
                className="px-6 py-3 rounded-lg bg-brand hover:bg-brand-hover text-text-inverted font-semibold shadow-brand-glow focus-visible:outline-none focus-visible:shadow-focus-brand transition"
              >Rescan</button>
              <button
                onClick={() => useAppStore.getState().setCurrentView('settings')}
                className="px-6 py-3 rounded-lg bg-surface-2 hover:bg-surface-3 border border-surface-border text-text-primary font-medium focus-visible:outline-none focus-visible:shadow-focus-brand transition"
              >Settings</button>
            </div>
          </div>
        ) : contentSection}
      </div>
    </div>
  );
}