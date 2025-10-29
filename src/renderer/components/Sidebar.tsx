/**
 * Sidebar navigation component with green/black theme
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { Logo } from './Logo.js';

const navItems = [
  { id: 'home', label: 'Home', icon: '🏠', shortcut: 'H' },
  { id: 'movies', label: 'Movies', icon: '🎬', shortcut: 'M' },
  { id: 'shows', label: 'TV Shows', icon: '📺', shortcut: 'T' },
  { id: 'search', label: 'Search', icon: '🔍', shortcut: 'S' },
  { id: 'settings', label: 'Settings', icon: '⚙️', shortcut: 'G' },
] as const;

export function Sidebar() {
  const { currentView, isSidebarOpen, setCurrentView, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Backdrop for mobile/overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-8 h-[calc(100vh-32px)] bg-gradient-to-b from-gray-900 via-black to-gray-900 border-r border-green-800/30 transition-all duration-300 z-20 ${
        isSidebarOpen ? 'w-64' : 'w-16'
      }`}>
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/10 via-transparent to-green-900/5" />
        
        <div className="relative flex flex-col h-full">
          {/* Header with Logo */}
          <div className="p-4 border-b border-green-800/20">
            <div className="flex items-center justify-between">
              <div className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                <Logo size="md" showText={isSidebarOpen} />
              </div>
              
              {/* Collapse/Expand Toggle */}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-green-800/30 text-green-400 hover:text-green-300 transition-all duration-200 border border-green-700/30 hover:border-green-600/50"
                title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <span className="text-sm">
                  {isSidebarOpen ? '◀' : '▶'}
                </span>
              </button>
            </div>
            
            {/* When collapsed, show just the logo */}
            {!isSidebarOpen && (
              <div className="mt-2 flex justify-center">
                <Logo size="sm" showText={false} />
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`w-full group flex items-center px-3 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                  currentView === item.id
                    ? 'bg-gradient-to-r from-green-600/30 to-green-500/20 border border-green-500/40 text-green-300 shadow-lg shadow-green-500/10'
                    : 'hover:bg-gradient-to-r hover:from-green-700/20 hover:to-green-600/10 text-green-100/80 hover:text-green-200 border border-transparent hover:border-green-600/20'
                }`}
                title={`${item.label} (${item.shortcut})`}
              >
                {/* Active indicator */}
                {currentView === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-green-600 rounded-r-full" />
                )}
                
                {/* Icon */}
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                
                {/* Label and shortcut */}
                <div className={`ml-3 transition-all duration-300 ${
                  isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded border border-green-500/30">
                      {item.shortcut}
                    </span>
                  </div>
                </div>
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-green-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-green-800/20">
            <div className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-xs text-green-300/60 space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>System Ready</span>
                </div>
                <div className="text-green-400/40">v1.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}