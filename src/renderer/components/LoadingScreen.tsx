/**
 * Beautiful loading screen with animations
 */

import React from 'react';

export function LoadingScreen() {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo animation */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-2xl">VP</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          VideoPlayer2
        </h1>

        {/* Loading spinner */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>

        {/* Loading text */}
        <p className="text-slate-400 text-lg">
          Loading your media library...
        </p>

        {/* Progress bar */}
        <div className="w-64 mx-auto mt-6">
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}