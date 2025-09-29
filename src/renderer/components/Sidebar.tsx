/**
 * Navigation sidebar with beautiful animations and TV-friendly navigation
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useNavigation } from '../hooks/useNavigation.js';

const navItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'movies', label: 'Movies', icon: '🎬' },
  { id: 'shows', label: 'TV Shows', icon: '📺' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const;

export function Sidebar() {
  const { currentView, isSidebarOpen, setCurrentView, toggleSidebar } = useAppStore();

  useNavigation({
    onBack: () => {
      if (isSidebarOpen) {
        toggleSidebar();
      }
    },
  });

  return (
    <>
      {/* Backdrop for mobile/overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full bg-slate-800/95 backdrop-blur-lg border-r border-slate-700/50 z-50
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-16'}
      `}>
        {/* Logo/Brand */}
        <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            {isSidebarOpen && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                VideoPlayer2
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={`
                w-full flex items-center px-3 py-3 rounded-lg text-left
                transition-all duration-200 ease-in-out
                hover:bg-slate-700/50 hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                ${currentView === item.id 
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30' 
                  : 'border border-transparent'
                }
              `}
            >
              <span className={`
                text-2xl transition-transform duration-200
                ${currentView === item.id ? 'scale-110' : ''}
              `}>
                {item.icon}
              </span>
              {isSidebarOpen && (
                <span className={`
                  ml-3 font-medium transition-colors duration-200
                  ${currentView === item.id ? 'text-blue-300' : 'text-slate-300'}
                `}>
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar toggle button */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg
              bg-slate-700/50 hover:bg-slate-600/50 transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <span className="text-xl">
              {isSidebarOpen ? '‹' : '›'}
            </span>
          </button>
        </div>

        {/* Status indicator */}
        <div className="absolute top-4 right-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
      </aside>
    </>
  );
}