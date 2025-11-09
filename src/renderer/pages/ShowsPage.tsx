/**
 * TV Shows page component
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { MediaGrid } from '../components/MediaGrid.js';

export function ShowsPage() {
  const { shows, isLoading } = useAppStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading shows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">TV Shows</h1>
          <div className="text-slate-400">
            {shows.length} {shows.length === 1 ? 'show' : 'shows'}
          </div>
        </div>

        {shows.length > 0 ? (
          <MediaGrid items={shows} />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-2xl font-bold mb-2 text-white">No TV Shows Found</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              We couldn't find any TV shows in your library. Try scanning for media or check your folder structure.
            </p>
            <button 
              onClick={() => window.electronAPI?.library.scanMedia()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 
                text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 
                focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Scan for TV Shows
            </button>
          </div>
        )}
      </div>
    </div>
  );
}