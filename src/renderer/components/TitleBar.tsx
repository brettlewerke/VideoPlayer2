/**
 * Custom title bar for frameless window
 * Provides window controls and draggable region
 */

import React from 'react';

interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'Hoser Video' }: TitleBarProps) {
  const handleMinimize = () => {
    (window as any).HPlayerAPI?.windowControl?.minimize();
  };

  const handleMaximize = () => {
    (window as any).HPlayerAPI?.windowControl?.maximize();
  };

  const handleClose = () => {
    (window as any).HPlayerAPI?.windowControl?.close();
  };

  return (
    <div className="title-bar">
      {/* Draggable region */}
      <div className="title-bar-draggable">
        <span className="title-bar-title">{title}</span>
      </div>

      {/* Window controls */}
      <div className="title-bar-controls">
        <button
          onClick={handleMinimize}
          className="title-bar-button hover:bg-white/10"
          aria-label="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M0 6h12" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="title-bar-button hover:bg-white/10"
          aria-label="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </button>

        <button
          onClick={handleClose}
          className="title-bar-button hover:bg-red-600"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
