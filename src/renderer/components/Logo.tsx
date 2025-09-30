/**
 * Logo component with dragon mark design
 * TODO: Replace placeholder with actual dragon-logo.svg when available
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Dragon Logo with glow effect */}
      <div className={`${sizeClasses[size]} relative group`}>
        {/* Glow background */}
        <div className="absolute inset-0 bg-green-500/30 rounded-xl blur-md group-hover:bg-green-400/40 transition-all duration-300" />
        
        {/* Main logo - PLACEHOLDER: Will be replaced with dragon SVG */}
        <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center h-full shadow-lg group-hover:from-green-300 group-hover:to-green-500 transition-all duration-300">
          {/* Temporary placeholder - replace with dragon mark SVG */}
          <span className="font-bold text-black text-2xl leading-none select-none">🐉</span>
        </div>
        
        {/* Accent highlight */}
        <div className="absolute top-1 left-1 w-3 h-3 bg-green-200/60 rounded-full blur-sm" />
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-green-400 to-green-200 bg-clip-text text-transparent`}>
            Hoser Video
          </span>
          <span className="text-xs text-green-300/70 font-medium">
            Media Player
          </span>
        </div>
      )}
    </div>
  );
}