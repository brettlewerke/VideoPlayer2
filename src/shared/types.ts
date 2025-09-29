/**
 * Shared types and interfaces used across main and renderer processes
 */

// Media types
export interface MediaFile {
  id: string;
  path: string;
  filename: string;
  size: number;
  lastModified: number;
  extension: string;
}

export interface Movie {
  id: string;
  title: string;
  year?: number;
  path: string;
  driveId: string;
  videoFile: MediaFile;
  posterPath?: string;
  backdropPath?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Show {
  id: string;
  title: string;
  path: string;
  driveId: string;
  posterPath?: string;
  backdropPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Season {
  id: string;
  showId: string;
  seasonNumber: number;
  title: string;
  path: string;
  posterPath?: string;
  episodeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  showId: string;
  seasonId: string;
  episodeNumber: number;
  seasonNumber: number;
  title?: string;
  path: string;
  videoFile: MediaFile;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Drive {
  id: string;
  label: string;
  mountPath: string;
  uuid?: string;
  isRemovable: boolean;
  isConnected: boolean;
  lastScanned?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaybackProgress {
  id: string;
  mediaId: string;
  mediaType: 'movie' | 'episode';
  position: number;
  duration: number;
  percentage: number;
  isCompleted: boolean;
  lastWatched: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Player types
export interface AudioTrack {
  id: number;
  title?: string;
  language?: string;
  codec?: string;
}

export interface SubtitleTrack {
  id: number;
  title?: string;
  language?: string;
  codec?: string;
  isDefault?: boolean;
  isForced?: boolean;
}

export interface MediaTracks {
  audio: AudioTrack[];
  subtitles: SubtitleTrack[];
}

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export interface PlayerStatus {
  state: PlayerState;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  currentAudioTrack?: number;
  currentSubtitleTrack?: number;
  tracks: MediaTracks;
}

// IPC types
export interface LoadMediaRequest {
  path: string;
  resumePosition?: number;
}

export interface SeekRequest {
  position: number;
}

export interface VolumeRequest {
  volume: number;
}

export interface TrackSelectionRequest {
  trackId: number;
}

// Scanning types
export interface ScanProgress {
  driveId: string;
  driveName: string;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  isComplete: boolean;
  error?: string;
}

export interface ScanResult {
  movies: Movie[];
  shows: Show[];
  seasons: Season[];
  episodes: Episode[];
  errors: string[];
}

// Settings types
export interface AppSettings {
  playerBackend: 'mpv' | 'libvlc';
  autoPlay: boolean;
  autoPlayNext: boolean;
  seekInterval: number; // seconds
  volumeStep: number; // percentage
  completionThreshold: number; // percentage
  enableThumbnails: boolean;
  enableSubtitles: boolean;
  defaultAudioLanguage?: string;
  defaultSubtitleLanguage?: string;
  scanIntervalMinutes: number;
  includeSamples: boolean;
  includeTrailers: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Application state types
export interface AppState {
  isLoading: boolean;
  currentView: 'home' | 'details' | 'player' | 'search' | 'settings';
  selectedMovie?: Movie;
  selectedShow?: Show;
  selectedSeason?: Season;
  selectedEpisode?: Episode;
  searchQuery: string;
  playerStatus: PlayerStatus;
  scanProgress?: ScanProgress;
  drives: Drive[];
  settings: AppSettings;
}

// Error types
export class MediaPlayerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MediaPlayerError';
  }
}

// Utility types
export type MediaItem = Movie | Episode;
export type MediaWithProgress = MediaItem & { progress?: PlaybackProgress };
export type SortField = 'title' | 'year' | 'dateAdded' | 'lastWatched';
export type SortDirection = 'asc' | 'desc';

// Repair types (Windows dependency issues)
export interface DependencyCheckResult {
  success: boolean;
  error?: string;
  missingDlls?: string[];
  mpvPath?: string;
  mpvVersion?: string;
}

export interface RepairOptions {
  action: 'fix-now' | 'switch-libvlc' | 'manual';
}

export interface RepairResult {
  success: boolean;
  message: string;
  requiresRestart?: boolean;
}