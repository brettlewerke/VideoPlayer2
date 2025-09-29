/**
 * Beautiful loading screen with animations
 */

import React from 'react';
import { Logo } from './Logo';

export function LoadingScreen() {
  return (
    <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center relative overflow-hidden">
      
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full 
          animate-pulse blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-green-400/20 rounded-full 
          animate-pulse blur-2xl" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <Logo size="lg" />
        </div>
        
        {/* Loading spinner */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>

        {/* Loading text */}
        <p className="text-green-100 text-lg">
          Loading your media library...
        </p>

        {/* Progress bar */}
        <div className="w-64 mx-auto mt-6">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}