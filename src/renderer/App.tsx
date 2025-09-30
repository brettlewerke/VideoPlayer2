/**
 * Main App component with routing and layout
 */

import React, { useEffect, useState } from 'react';
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
  const [bridgeReady, setBridgeReady] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  // Check if preload bridge is available
  useEffect(() => {
    const api = (window as any).HPlayerAPI;
    
    if (!api) {
      console.error('[App] HPlayerAPI not available - preload bridge not loaded');
      setBridgeError('Preload bridge not available');
      return;
    }
    
    // Ping the API to confirm it's working
    api.ping()
      .then((result: boolean) => {
        if (result) {
          console.log('[App] HPlayerAPI bridge ready');
          setBridgeReady(true);
        } else {
          console.error('[App] HPlayerAPI ping returned false');
          setBridgeError('Bridge ping failed');
        }
      })
      .catch((error: Error) => {
        console.error('[App] HPlayerAPI ping error:', error);
        setBridgeError(`Bridge ping error: ${error.message}`);
      });
  }, []);

  // Load initial data once bridge is ready
  useEffect(() => {
    if (bridgeReady) {
      loadLibrary();
    }
  }, [bridgeReady, loadLibrary]);

  // Show bridge error if preload failed
  if (bridgeError) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <div className="mb-8">
            <svg className="mx-auto h-24 w-24 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Bridge Error</h1>
          <p className="text-gray-300 text-lg mb-4">
            The preload bridge failed to initialize. This typically happens when the preload script could not be loaded.
          </p>
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <p className="text-sm font-mono text-red-400">{bridgeError}</p>
          </div>
          <p className="text-sm text-gray-400">
            Please check the console for more details and ensure the app was built correctly.
          </p>
        </div>
      </div>
    );
  }

  // Show loading screen while bridge is initializing or app is loading
  if (!bridgeReady || (isLoading && currentView === 'home')) {
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
    <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 text-white overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-green-800/10" />
      
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