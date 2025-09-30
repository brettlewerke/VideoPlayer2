/**
 * Repair screen for libVLC setup and fallback options
 * Provides options for VLC installation or using mock player
 */

import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo.js';
import type { RepairResult } from '../../shared/types.js';

interface RepairScreenProps {
  error: string;
  onInstallVLC: () => Promise<RepairResult>;
  onUseMockPlayer: () => Promise<RepairResult>;
  onShowManualInstructions: () => void;
  isInstalling?: boolean;
  isSwitching?: boolean;
}

export function RepairScreen({
  error,
  onInstallVLC,
  onUseMockPlayer,
  onShowManualInstructions,
  isInstalling = false,
  isSwitching = false
}: RepairScreenProps) {
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const handleManualInstructions = () => {
    setShowManualInstructions(true);
    onShowManualInstructions();
  };

  if (showManualInstructions) {
    return <ManualInstructionsScreen onBack={() => setShowManualInstructions(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold text-green-100 mb-2">H Player</h1>
          <p className="text-green-400 text-lg">Dependency Repair Required</p>
        </div>

        {/* Error Message */}
        <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-orange-100 mb-4">Media Player Setup</h2>
          <div className="text-orange-200 leading-relaxed">
            <p className="mb-4">
              <strong>libVLC is not available</strong> on your system for optimal video playback.
            </p>
            <p className="mb-4">
              H Player uses libVLC (from VLC Media Player) for the best video experience. Without it, we'll use a basic fallback player for testing.
            </p>
            <p>
              Choose your preferred solution:
            </p>
          </div>
        </div>

        {/* Repair Options */}
        <div className="space-y-4">
          {/* Install VLC Button */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-100 mb-3">Solution 1: Install VLC Media Player</h3>
            <p className="text-gray-300 mb-4">
              Download and install VLC Media Player to enable full video playback capabilities.
            </p>
            <button
              onClick={onInstallVLC}
              disabled={isInstalling}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Opening VLC Download...
                </>
              ) : (
                'Install VLC Media Player'
              )}
            </button>
          </div>

          {/* Use Mock Player */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-100 mb-3">Solution 2: Continue with Basic Player</h3>
            <p className="text-gray-300 mb-4">
              Use the built-in basic player for now. You can install VLC later for better performance.
            </p>
            <button
              onClick={onUseMockPlayer}
              disabled={isSwitching}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isSwitching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Switching to Basic Player...
                </>
              ) : (
                'Continue with Basic Player'
              )}
            </button>
          </div>

          {/* Manual Instructions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-100 mb-3">Solution 3: Manual Installation Guide</h3>
            <p className="text-gray-300 mb-4">
              View detailed instructions for manually installing VLC Media Player.
            </p>
            <button
              onClick={handleManualInstructions}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Manual fix instructions
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>H Player will automatically restart after a successful repair.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Manual instructions screen
 */
function ManualInstructionsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="text-green-400 hover:text-green-300 transition-colors flex items-center"
          >
            ← Back to Setup Options
          </button>
          <div className="flex items-center">
            <Logo className="w-8 h-8 mr-3" />
            <h1 className="text-2xl font-bold text-green-100">VLC Installation Guide</h1>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 1: Download VLC Media Player</h2>
            <p className="text-gray-300 mb-4">
              Visit the official VLC website to download the latest version:
            </p>
            <div className="bg-gray-900/50 rounded p-4 font-mono text-sm text-gray-300">
              https://www.videolan.org/vlc/
            </div>
            <p className="text-gray-300 mt-2">
              Choose the version that matches your system (32-bit or 64-bit Windows).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 2: Install VLC</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
              <li>Run the VLC installer as Administrator</li>
              <li>Follow the installation wizard</li>
              <li>Choose default options (recommended)</li>
              <li>Complete the installation</li>
            </ol>
            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4 mt-4">
              <p className="text-blue-200">
                <strong>Tip:</strong> You don't need to set VLC as your default media player. H Player will use VLC's libraries in the background.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 3: Restart H Player</h2>
            <p className="text-gray-300 mb-4">
              After installing VLC, restart H Player to enable full video playback capabilities.
            </p>
            <div className="bg-gray-900/50 rounded p-4">
              <p className="text-gray-300 font-medium mb-2">Alternative Installation Methods:</p>
              <ul className="text-gray-300 space-y-1">
                <li>• <strong>Microsoft Store:</strong> Search for "VLC" in the Microsoft Store</li>
                <li>• <strong>Package Managers:</strong> Use Chocolatey (choco install vlc) or Winget (winget install vlc)</li>
                <li>• <strong>Portable Version:</strong> Download the portable version if you prefer not to install</li>
              </ul>
            </div>
          </section>

          <div className="bg-green-900/20 border border-green-700/50 rounded p-4">
            <p className="text-green-200">
              <strong>Troubleshooting:</strong> If VLC installation doesn't resolve the issue, ensure you're using the latest version and try reinstalling. For portable VLC installations, make sure the VLC directory is added to your system PATH.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={onBack}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Return to Setup Options
          </button>
        </div>
      </div>
    </div>
  );
}

export { RepairScreen as RepairPage };