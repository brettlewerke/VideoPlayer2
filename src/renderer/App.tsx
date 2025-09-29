/**
 * Main App component with routing and layout
 */

import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore.js';
import { HomePage } from './pages/HomePage.js';
import { MoviesPage } from './pages/MoviesPage.js';
import { ShowsPage } from './pages/ShowsPage.js';
import { PlayerPage } from './pages/PlayerPage.js';
import { SearchPage } from './pages/SearchPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { Sidebar } from './components/Sidebar.js';
import { LoadingScreen } from './components/LoadingScreen.js';

export function App() {
  const { currentView, isLoading, isSidebarOpen, loadLibrary } = useAppStore();

  // Load initial data
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Show loading screen while app initializes
  if (isLoading && currentView === 'home') {
    return <LoadingScreen />;
  }

  const renderCurrentPage = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'movies':
        return <MoviesPage />;
      case 'shows':
        return <ShowsPage />;
      case 'search':
        return <SearchPage />;
      case 'player':
        return <PlayerPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="h-screen bg-slate-900 text-white overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Main layout */}
      <div className="relative z-10 flex h-full">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content area */}
        <main 
          className={`flex-1 transition-all duration-300 ${
            isSidebarOpen ? 'ml-64' : 'ml-16'
          }`}
        >
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}