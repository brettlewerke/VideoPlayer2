/**
 * Settings page component
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore.js';

export function SettingsPage() {
  const { playerBackend, setPlayerBackend } = useAppStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-8">
          {/* Player Settings */}
          <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Player</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Video Player Backend
                </label>
                <select
                  value={playerBackend}
                  onChange={(e) => setPlayerBackend(e.target.value as 'mpv' | 'mock')}
                  title="Select video player backend"
                  className="bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  <option value="mpv">MPV (Recommended)</option>
                  <option value="mock">Mock Player (Testing)</option>
                </select>
                <p className="text-sm text-slate-400 mt-1">
                  MPV provides the best video playback experience. Mock player is for testing only.
                </p>
              </div>
            </div>
          </section>

          {/* Library Settings */}
          <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Library</h2>
            
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => window.electronAPI.library.scanMedia()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 
                    text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Scan for Media
                </button>
                <p className="text-sm text-slate-400 mt-1">
                  Scan all drives for Movies and TV Shows folders.
                </p>
              </div>

              <div>
                <button
                  onClick={() => {
                    // TODO: Implement add custom path
                    console.log('Add custom path');
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg 
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                >
                  Add Custom Path
                </button>
                <p className="text-sm text-slate-400 mt-1">
                  Manually add a folder containing your movies or TV shows.
                </p>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Keyboard Shortcuts</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h3 className="font-medium text-slate-300 mb-2">Navigation</h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">Arrow Keys</span>
                  <span className="text-white">Navigate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Enter</span>
                  <span className="text-white">Select</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Escape</span>
                  <span className="text-white">Back</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-slate-300 mb-2">Player</h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">Space</span>
                  <span className="text-white">Play/Pause</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">M</span>
                  <span className="text-white">Mute</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">←/→</span>
                  <span className="text-white">Seek ±10s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">↑/↓</span>
                  <span className="text-white">Volume ±5</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-slate-300 mb-2">Quick Actions</h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ctrl+R</span>
                  <span className="text-white">Scan Media</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ctrl+F</span>
                  <span className="text-white">Search</span>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">About</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Video Player</span>
                <span className="text-white">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Electron</span>
                <span className="text-white">27.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">React</span>
                <span className="text-white">18.2.0</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}