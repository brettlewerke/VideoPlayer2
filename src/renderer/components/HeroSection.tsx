/**
 * Hero section component for featured movie display
 */

import React from 'react';
import { Movie } from '../../shared/types.js';
import { useAppStore } from '../store/useAppStore.js';

interface HeroSectionProps {
  movie: Movie;
}

export function HeroSection({ movie }: HeroSectionProps) {
  const { playMedia } = useAppStore();

  const handlePlay = () => {
    playMedia(movie, null);
  };

  return (
    <div className="relative h-96 mb-8 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative h-full flex items-end">
        <div className="p-8 w-full max-w-2xl">
          {/* Title */}
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            {movie.title}
          </h1>

          {/* Metadata */}
          <div className="flex items-center space-x-4 mb-4 text-slate-300">
            {movie.year && (
              <span className="bg-slate-800/80 px-2 py-1 rounded text-sm">
                {movie.year}
              </span>
            )}
            {movie.duration && (
              <span className="bg-slate-800/80 px-2 py-1 rounded text-sm">
                {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
              </span>
            )}
          </div>

          {/* Description placeholder */}
          <p className="text-slate-200 text-lg mb-6 line-clamp-3 max-w-xl">
            Enjoy this movie from your personal collection.
          </p>

          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePlay}
              className="bg-white text-black font-semibold py-3 px-8 rounded-lg 
                hover:bg-slate-200 transition-all duration-200 flex items-center space-x-2
                focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <span className="text-xl">▶</span>
              <span>Play</span>
            </button>

            <button className="bg-slate-800/80 text-white font-semibold py-3 px-6 rounded-lg 
              hover:bg-slate-700/80 transition-all duration-200 flex items-center space-x-2
              focus:outline-none focus:ring-2 focus:ring-slate-500/50">
              <span className="text-lg">ℹ</span>
              <span>More Info</span>
            </button>
          </div>
        </div>

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
      </div>
    </div>
  );
}