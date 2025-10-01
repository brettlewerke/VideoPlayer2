/**
 * Media grid component for displaying movies and shows
 */

import React from 'react';
import { Movie, Show, Episode } from '../../shared/types.js';
import { useAppStore } from '../store/useAppStore.js';

interface MediaGridProps {
  items: (Movie | Show | Episode)[];
  className?: string;
}

export function MediaGrid({ items, className = '' }: MediaGridProps) {
  const { setCurrentMovie, setCurrentShow, setCurrentView } = useAppStore();

  const handleItemClick = (item: Movie | Show | Episode) => {
    if ('videoFile' in item) {
      // It's a Movie or Episode
      if ('seasonId' in item) {
        // It's an Episode - this shouldn't happen in grid, but handle it
        console.log('Episode clicked:', item.title);
      } else {
        // It's a Movie - navigate to detail page
        const movie = item as Movie;
        setCurrentMovie(movie);
        setCurrentView('movie-detail');
      }
    } else {
      // It's a Show - navigate to detail page
      setCurrentShow(item as Show);
      setCurrentView('show-detail');
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}>
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onClick={() => handleItemClick(item)}
        />
      ))}
    </div>
  );
}

interface MediaCardProps {
  item: Movie | Show | Episode;
  onClick: () => void;
}

function MediaCard({ item, onClick }: MediaCardProps) {
  const isMovie = 'videoFile' in item && !('seasonId' in item);
  const isShow = !('videoFile' in item) && !('seasonId' in item);
  const isEpisode = 'seasonId' in item;

  const getTitle = () => {
    if (isEpisode) {
      const episode = item as Episode;
      return `S${episode.seasonNumber}E${episode.episodeNumber}: ${episode.title}`;
    }
    return item.title;
  };

  const getSubtitle = () => {
    if (isMovie) {
      const movie = item as Movie;
      return movie.year ? movie.year.toString() : '';
    }
    if (isEpisode) {
      const episode = item as Episode;
      return episode.duration ? `${Math.floor(episode.duration / 60)}m` : '';
    }
    return '';
  };

  // Get the poster path, prioritizing Rotten Tomatoes poster
  const getPosterPath = () => {
    const rtPoster = ('rottenTomatoesPosterPath' in item && item.rottenTomatoesPosterPath);
    const regularPoster = ('posterPath' in item && item.posterPath);
    const posterPath = rtPoster || regularPoster;
    
    if (!posterPath) {
      return null;
    }
    
    // Use custom poster:// protocol for local file access
    // Convert Windows backslashes to forward slashes for URL
    const normalizedPath = posterPath.replace(/\\/g, '/');
    const finalUrl = `poster:///${normalizedPath}`;
    
    console.log(`[MediaGrid] ${item.title}:`, {
      rtPoster,
      regularPoster,
      posterPath,
      normalizedPath,
      finalUrl
    });
    
    return finalUrl;
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transform transition-all duration-200 hover:scale-105 focus:scale-105 
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg"
      tabIndex={0}
      role="button"
      aria-label={`${isMovie ? 'Play' : isShow ? 'Browse' : 'Play'} ${item.title}`}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden mb-2">
        {getPosterPath() ? (
          <img
            src={getPosterPath()!}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Hide broken image and show placeholder
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {isMovie ? '🎬' : isShow ? '📺' : '🎞️'}
              </div>
              <div className="text-sm font-medium">No Poster</div>
            </div>
          </div>
        )}

        {/* Play overlay */}
        {(isMovie || isEpisode) && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 
            flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 rounded-full p-3">
              <span className="text-black text-2xl">▶</span>
            </div>
          </div>
        )}

        {/* Progress bar for continue watching */}
        {isMovie && (item as any).watchProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/50">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, (item as any).watchProgress * 100))}%` }}
            />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-medium text-sm line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">
        {getTitle()}
      </h3>

      {/* Subtitle */}
      {getSubtitle() && (
        <p className="text-slate-400 text-xs">
          {getSubtitle()}
        </p>
      )}
    </div>
  );
}