/**
 * Empty state component for when no drives or folders are found
 */

import React from 'react';

interface EmptyStateProps {
  type: 'no-drives' | 'no-folders';
  drives: any[];
  onRescan: () => void;
  isScanning: boolean;
}

export function EmptyState({ type, drives, onRescan, isScanning }: EmptyStateProps) {
  const getDriveMountPoints = () => {
    if (!drives || drives.length === 0) return 'No drives detected';
    return drives.map(d => d.mountPoint || d.letter || d.path).join(', ');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        {/* Icon */}
        <div className="mb-8">
          <svg
            className="mx-auto h-24 w-24 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-white mb-4">
          {type === 'no-drives' ? 'Drive not found' : 'Library folders not found'}
        </h1>

        {/* Description */}
        <div className="text-gray-300 text-lg mb-8 space-y-3">
          {type === 'no-drives' ? (
            <>
              <p>
                This desktop app catalogs Movies and TV Shows from a plugged-in drive and looks for
                two top-level folders named <span className="font-semibold text-green-400">Movies</span> and{' '}
                <span className="font-semibold text-green-400">TV Shows</span>.
              </p>
              <p>
                Please plug in an external drive or USB and click Rescan.
              </p>
            </>
          ) : (
            <>
              <p>
                No library folders found on the connected drive{drives.length > 1 ? 's' : ''}.
              </p>
              <p>
                H Player looks for top-level folders named{' '}
                <span className="font-semibold text-green-400">Movies</span>,{' '}
                <span className="font-semibold text-green-400">Films</span>,{' '}
                <span className="font-semibold text-green-400">TV Shows</span>,{' '}
                <span className="font-semibold text-green-400">TV</span>,{' '}
                <span className="font-semibold text-green-400">Series</span>, or{' '}
                <span className="font-semibold text-green-400">Shows</span>{' '}
                (case-insensitive).
              </p>
              <p className="text-sm text-gray-400">
                Searched on: {getDriveMountPoints()}
              </p>
            </>
          )}
        </div>

        {/* Rescan button */}
        <button
          onClick={onRescan}
          disabled={isScanning}
          className={`
            inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white
            transition-all duration-200 shadow-lg
            ${isScanning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/50'
            }
          `}
        >
          {isScanning ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rescan Drives
            </>
          )}
        </button>

        {/* Diagnostics */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <details className="text-left">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              Diagnostics
            </summary>
            <div className="mt-4 p-4 bg-black/30 rounded-lg text-xs font-mono text-gray-400">
              <div><span className="text-green-400">Drives found:</span> {drives.length}</div>
              {drives.map((drive, i) => (
                <div key={i} className="ml-4">
                  • {drive.letter || drive.mountPoint || drive.path} ({drive.type})
                </div>
              ))}
              {drives.length === 0 && (
                <div className="ml-4 text-red-400">No drives detected</div>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
