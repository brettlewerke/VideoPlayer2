import React, { useEffect, useState } from 'react';

interface DependencyCheckResult {
  success: boolean;
  error?: string;
  missingDlls?: string[];
  mpvPath?: string;
  mpvVersion?: string;
}

export const RepairPage: React.FC = () => {
  const [dependencyCheck, setDependencyCheck] = useState<DependencyCheckResult | null>(null);

  useEffect(() => {
    // Listen for dependency check results from main process
    const handleDependencyCheck = (_event: any, result: DependencyCheckResult) => {
      setDependencyCheck(result);
    };

    window.electronAPI?.on('repair:dependency-check-result', handleDependencyCheck);

    return () => {
      window.electronAPI?.off('repair:dependency-check-result', handleDependencyCheck);
    };
  }, []);

  const handleRetry = () => {
    // Reload the app to re-check dependencies
    window.location.reload();
  };

  const handleQuit = () => {
    window.electronAPI?.app.quit();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-gray-800 rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-4">H Player - Dependency Repair</h1>
          <div className="w-16 h-1 bg-green-400 mx-auto"></div>
        </div>

        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Dependency Issue Detected</h2>

          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200 font-medium mb-2">I am getting this error:</p>
            <p className="text-red-100 font-mono text-sm bg-red-800 p-3 rounded">
              The code execution cannot proceed because ffmpeg.dll was not found.
            </p>
          </div>

          <div className="text-gray-300 space-y-4">
            <p>
              The issue is that the <strong className="text-red-400">ffmpeg.dll</strong> file is missing from your MPV installation.
              MPV typically comes bundled with FFmpeg, but in your case, it seems like the FFmpeg DLL is not present.
            </p>

            <p>Here are several solutions to fix this:</p>

            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li><strong>Reinstall MPV with FFmpeg support:</strong> Download the latest MPV build that includes FFmpeg from the official website.</li>
              <li><strong>Download FFmpeg separately:</strong> Get the FFmpeg DLLs and place them in the same directory as mpv.exe.</li>
              <li><strong>Use a different MPV build:</strong> Some MPV builds come with all dependencies included.</li>
              <li><strong>Check your antivirus:</strong> Some antivirus software may quarantine or delete DLL files.</li>
            </ol>
          </div>
        </div>

        {dependencyCheck && (
          <div className="bg-gray-700 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Diagnostic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">MPV Path:</span>
                <span className="text-gray-200 font-mono">{dependencyCheck.mpvPath || 'Not found'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MPV Version:</span>
                <span className="text-gray-200">{dependencyCheck.mpvVersion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Missing DLLs:</span>
                <span className="text-red-400">{dependencyCheck.missingDlls?.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={handleRetry}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Retry Check
          </button>
          <button
            onClick={handleQuit}
            className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Quit Application
          </button>
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>H Player requires MPV with FFmpeg support for video playback</p>
        </div>
      </div>
    </div>
  );
};