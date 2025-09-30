/**
 * Logo component with dragon mark design
 */

import React from 'react';
import dragonLogo from '../../../assets/brand/dragon-logo.svg';

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
      {/* Dragon Logo */}
      <div className={`${sizeClasses[size]} relative group`}>
        {/* Glow background */}
        <div className="absolute inset-0 bg-green-500/20 rounded-lg blur-md group-hover:bg-green-400/30 transition-all duration-300" />
        
        {/* Dragon mark SVG */}
        <div className="relative h-full w-full flex items-center justify-center">
          <img 
            src={dragonLogo} 
            alt="Hoser Video Dragon Logo" 
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
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