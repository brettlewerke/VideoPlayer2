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
import { RepairPage } from './pages/RepairPage.js';
import { Sidebar } from './components/Sidebar.js';
import { LoadingScreen } from './components/LoadingScreen.js';

export function App() {
  const { 
    currentView, 
    isLoading, 
    isSidebarOpen, 
    loadLibrary,
    dependencyCheckResult,
    isFixing,
    isSwitchingBackend,
    fixFfmpeg,
    switchToLibVLC,
    getManualInstructions,
    setDependencyCheckResult,
    showRepairScreen
  } = useAppStore();

  // Load initial data
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Listen for dependency check results from main process
  useEffect(() => {
    const handleDependencyCheckResult = (result: any) => {
      setDependencyCheckResult(result);
      showRepairScreen();
    };

    window.electronAPI.on('repair:dependency-check-result', handleDependencyCheckResult);

    return () => {
      window.electronAPI.off('repair:dependency-check-result', handleDependencyCheckResult);
    };
  }, [setDependencyCheckResult, showRepairScreen]);

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
      case 'repair':
        return dependencyCheckResult ? (
          <RepairPage
            error={dependencyCheckResult.error || 'Unknown dependency error'}
            onFixNow={fixFfmpeg}
            onSwitchToLibVLC={switchToLibVLC}
            onShowManualInstructions={() => getManualInstructions()}
            isFixing={isFixing}
            isSwitching={isSwitchingBackend}
          />
        ) : (
          <div>Loading repair screen...</div>
        );
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