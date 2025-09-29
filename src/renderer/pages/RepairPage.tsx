/**
 * Repair screen for Windows dependency issues
 * Provides options to fix missing ffmpeg.dll and other MPV dependencies
 */

import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo.js';
import type { RepairResult } from '../../shared/types.js';

interface RepairScreenProps {
  error: string;
  onFixNow: () => Promise<RepairResult>;
  onSwitchToLibVLC: () => Promise<RepairResult>;
  onShowManualInstructions: () => void;
  isFixing?: boolean;
  isSwitching?: boolean;
}

export function RepairScreen({
  error,
  onFixNow,
  onSwitchToLibVLC,
  onShowManualInstructions,
  isFixing = false,
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
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-100 mb-4">Issue Detected</h2>
          <div className="text-red-200 leading-relaxed">
            <p className="mb-4">
              I am getting this error: <strong>The code execution cannot proceed because ffmpeg.dll was not found.</strong>
            </p>
            <p className="mb-4">
              The issue is that the ffmpeg.dll file is missing from your MPV installation. MPV typically comes bundled with FFmpeg, but in your case, it seems like the FFmpeg DLL is not present.
            </p>
            <p>
              Here are several solutions to fix this:
            </p>
          </div>
        </div>

        {/* Repair Options */}
        <div className="space-y-4">
          {/* Fix Now Button */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-100 mb-3">Solution 1: Download the missing ffmpeg.dll</h3>
            <p className="text-gray-300 mb-4">
              The easiest solution is to download the ffmpeg.dll file that matches your MPV version.
            </p>
            <button
              onClick={onFixNow}
              disabled={isFixing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isFixing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Downloading and Installing...
                </>
              ) : (
                'Fix now'
              )}
            </button>
          </div>

          {/* Switch to libVLC */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-100 mb-3">Solution 2: Switch to libVLC Player</h3>
            <p className="text-gray-300 mb-4">
              Use VLC's media libraries instead of MPV. This option doesn't require downloading additional files.
            </p>
            <button
              onClick={onSwitchToLibVLC}
              disabled={isSwitching}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isSwitching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Switching Backend...
                </>
              ) : (
                'Switch to libVLC'
              )}
            </button>
          </div>

          {/* Manual Instructions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-100 mb-3">Solution 3: Manual Fix Instructions</h3>
            <p className="text-gray-300 mb-4">
              Follow step-by-step instructions to manually download and install the required DLLs.
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
            ← Back to Repair Options
          </button>
          <div className="flex items-center">
            <Logo className="w-8 h-8 mr-3" />
            <h1 className="text-2xl font-bold text-green-100">Manual Fix Instructions</h1>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 1: Identify Your MPV Version</h2>
            <div className="bg-gray-900/50 rounded p-4 font-mono text-sm text-gray-300">
              mpv.exe --version
            </div>
            <p className="text-gray-300 mt-2">
              Note the version number (e.g., mpv 0.37.0) and whether it's 32-bit or 64-bit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 2: Download Compatible FFmpeg DLLs</h2>
            <p className="text-gray-300 mb-4">
              Visit one of these trusted sources to download FFmpeg DLLs that match your MPV version:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Gyan.dev FFmpeg:</strong> Download the "essentials" or "shared" build</li>
              <li><strong>FFmpeg.org:</strong> Download the shared library build</li>
              <li><strong>Zeranoe FFmpeg:</strong> Choose the build that matches your MPV architecture</li>
            </ul>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-4 mt-4">
              <p className="text-yellow-200">
                <strong>Important:</strong> Ensure you download the correct architecture (32-bit vs 64-bit) and build type (MinGW vs MSVC) that matches your MPV installation.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 3: Extract and Place DLLs</h2>
            <p className="text-gray-300 mb-4">
              Extract the downloaded FFmpeg archive and copy these DLLs to your MPV directory:
            </p>
            <div className="bg-gray-900/50 rounded p-4">
              <p className="text-gray-300 font-medium mb-2">Required DLLs:</p>
              <ul className="font-mono text-sm text-gray-300 space-y-1">
                <li>• ffmpeg.dll</li>
                <li>• avcodec-*.dll (e.g., avcodec-60.dll)</li>
                <li>• avformat-*.dll (e.g., avformat-60.dll)</li>
                <li>• avutil-*.dll (e.g., avutil-58.dll)</li>
                <li>• avfilter-*.dll (e.g., avfilter-9.dll)</li>
                <li>• avdevice-*.dll (e.g., avdevice-60.dll)</li>
                <li>• swresample-*.dll (e.g., swresample-4.dll)</li>
                <li>• swscale-*.dll (e.g., swscale-7.dll)</li>
              </ul>
            </div>
            <p className="text-gray-300 mt-4">
              Copy these files to the same directory where <code className="bg-gray-900 px-1 rounded">mpv.exe</code> is located.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 4: Verify Installation</h2>
            <p className="text-gray-300 mb-4">
              Test that MPV can now load the FFmpeg libraries:
            </p>
            <div className="bg-gray-900/50 rounded p-4 font-mono text-sm text-gray-300">
              mpv.exe --version
            </div>
            <p className="text-gray-300 mt-2">
              If this command succeeds without errors, the installation is complete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-100 mb-4">Step 5: Restart H Player</h2>
            <p className="text-gray-300">
              Close and restart H Player. The dependency issue should now be resolved.
            </p>
          </section>

          <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4">
            <p className="text-blue-200">
              <strong>Troubleshooting:</strong> If you continue to have issues, try using a different FFmpeg build or check that all DLLs are from the same FFmpeg version. You can also use tools like Dependency Walker (depends.exe) to verify DLL dependencies.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={onBack}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Return to Repair Options
          </button>
        </div>
      </div>
    </div>
  );
}

export { RepairScreen as RepairPage };