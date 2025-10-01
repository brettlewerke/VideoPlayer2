/**
 * Search page component
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { MediaGrid } from '../components/MediaGrid.js';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { isLoading } = useAppStore();

  const searchMedia = async (searchQuery: string) => {
    try {
      const results = await window.electronAPI?.library.search(searchQuery);
      if (results) {
        setSearchResults([...results.movies, ...results.shows]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query.trim()) {
        searchMedia(query);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, searchMedia]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Search</h1>
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies and TV shows..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 pr-12
                text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                focus:border-blue-500/50 transition-all duration-200"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>
        </div>

        {/* Search Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Searching...</p>
            </div>
          </div>
        ) : query.trim() && searchResults.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Search Results ({searchResults.length})
            </h2>
            <MediaGrid items={searchResults} />
          </div>
        ) : query.trim() && searchResults.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold mb-2 text-white">No Results Found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              We couldn't find any movies or TV shows matching "{query}". Try a different search term.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold mb-2 text-white">Start Searching</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Enter a movie or TV show title to search your library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}