/**
 * Zustand store for global application state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  Movie, 
  Show, 
  Season, 
  Episode, 
  Drive, 
  PlaybackProgress,
  PlayerStatus,
  ScanProgress,
  RepairResult
} from '../../shared/types.js';

interface AppState {
  // UI State
  currentView: 'home' | 'movies' | 'shows' | 'search' | 'player' | 'settings' | 'repair';
  isLoading: boolean;
  isSidebarOpen: boolean;
  searchQuery: string;
  activeMenu: 'movies' | 'shows' | 'continue' | 'recent';
  
  // Media Library
  movies: Movie[];
  shows: Show[];
  seasons: Season[];
  episodes: Episode[];
  currentMovie: Movie | null;
  currentShow: Show | null;
  currentSeason: Season | null;
  currentEpisode: Episode | null;
  
  // Player State
  playerStatus: PlayerStatus | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  position: number;
  duration: number;
  
  // Progress and Continue Watching
  continueWatching: (Movie | Episode)[];
  recentlyAdded: (Movie | Episode)[];
  
  // Drive and Scanning
  drives: Drive[];
  scanProgress: ScanProgress | null;

  // Repair state
  dependencyCheckResult: any | null;
  isFixing: boolean;
  isSwitchingBackend: boolean;
  isScanning: boolean;
  
  // Settings
  playerBackend: 'mpv' | 'mock';
  autoplay: boolean;
  subtitleEnabled: boolean;
  selectedAudioTrack: string | null;
  selectedSubtitleTrack: string | null;
}

interface AppActions {
  // UI Actions
  setCurrentView: (view: AppState['currentView']) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  setActiveMenu: (menu: AppState['activeMenu']) => void;
  
  // Media Library Actions
  setMovies: (movies: Movie[]) => void;
  setShows: (shows: Show[]) => void;
  setSeasons: (seasons: Season[]) => void;
  setEpisodes: (episodes: Episode[]) => void;
  setCurrentMovie: (movie: Movie | null) => void;
  setCurrentShow: (show: Show | null) => void;
  setCurrentSeason: (season: Season | null) => void;
  setCurrentEpisode: (episode: Episode | null) => void;
  
  // Player Actions
  setPlayerStatus: (status: PlayerStatus | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  
  // Continue Watching Actions
  setContinueWatching: (items: (Movie | Episode)[]) => void;
  setRecentlyAdded: (items: (Movie | Episode)[]) => void;
  
  // Drive and Scanning Actions
  setDrives: (drives: Drive[]) => void;
  setScanProgress: (progress: ScanProgress | null) => void;
  setIsScanning: (scanning: boolean) => void;
  
  // Settings Actions
  setPlayerBackend: (backend: 'mpv' | 'mock') => void;
  setAutoplay: (autoplay: boolean) => void;
  setSubtitleEnabled: (enabled: boolean) => void;
  setSelectedAudioTrack: (track: string | null) => void;
  setSelectedSubtitleTrack: (track: string | null) => void;

  // Repair Actions
  setDependencyCheckResult: (result: any) => void;
  setIsFixing: (fixing: boolean) => void;
  setIsSwitchingBackend: (switching: boolean) => void;
  showRepairScreen: () => void;
  fixFfmpeg: () => Promise<RepairResult>;
  switchToLibVLC: () => Promise<RepairResult>;
  getManualInstructions: () => Promise<string>;

  // Async Actions
  loadLibrary: () => Promise<void>;
  searchMedia: (query: string) => Promise<void>;
  playMedia: (movie: Movie | null, episode: Episode | null) => Promise<void>;
  scanDrives: () => Promise<void>;

  // Utility Actions
  reset: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  // UI State
  currentView: 'home',
  isLoading: false,
  isSidebarOpen: false,
  searchQuery: '',
  activeMenu: 'movies',
  
  // Media Library
  movies: [],
  shows: [],
  seasons: [],
  episodes: [],
  currentMovie: null,
  currentShow: null,
  currentSeason: null,
  currentEpisode: null,
  
  // Player State
  playerStatus: null,
  isPlaying: false,
  isMuted: false,
  volume: 100,
  position: 0,
  duration: 0,
  
  // Progress and Continue Watching
  continueWatching: [],
  recentlyAdded: [],
  
  // Drive and Scanning
  drives: [],
  scanProgress: null,
  isScanning: false,

  // Repair state
  dependencyCheckResult: null,
  isFixing: false,
  isSwitchingBackend: false,

  // Settings
  playerBackend: 'mpv',
  autoplay: true,
  subtitleEnabled: true,
  selectedAudioTrack: null,
  selectedSubtitleTrack: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    devtools(
      (set, get) => ({
      ...initialState,
      
      // UI Actions
      setCurrentView: (view) => set({ currentView: view }),
      setLoading: (loading) => set({ isLoading: loading }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveMenu: (menu) => set({ activeMenu: menu }),
      
      // Media Library Actions
      setMovies: (movies) => set({ movies }),
      setShows: (shows) => set({ shows }),
      setSeasons: (seasons) => set({ seasons }),
      setEpisodes: (episodes) => set({ episodes }),
      setCurrentMovie: (movie) => set({ currentMovie: movie }),
      setCurrentShow: (show) => set({ currentShow: show }),
      setCurrentSeason: (season) => set({ currentSeason: season }),
      setCurrentEpisode: (episode) => set({ currentEpisode: episode }),
      
      // Player Actions
      setPlayerStatus: (status) => set({ playerStatus: status }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMuted: (muted) => set({ isMuted: muted }),
      setVolume: (volume) => set({ volume }),
      setPosition: (position) => set({ position }),
      setDuration: (duration) => set({ duration }),
      
      // Continue Watching Actions
      setContinueWatching: (items) => set({ continueWatching: items }),
      setRecentlyAdded: (items) => set({ recentlyAdded: items }),
      
      // Drive and Scanning Actions
      setDrives: (drives) => set({ drives }),
      setScanProgress: (progress) => set({ scanProgress: progress }),
      setIsScanning: (scanning) => set({ isScanning: scanning }),
      
      // Settings Actions
      setPlayerBackend: (backend) => set({ playerBackend: backend }),
      setAutoplay: (autoplay) => set({ autoplay }),
      setSubtitleEnabled: (enabled) => set({ subtitleEnabled: enabled }),
      setSelectedAudioTrack: (track) => set({ selectedAudioTrack: track }),
      setSelectedSubtitleTrack: (track) => set({ selectedSubtitleTrack: track }),

      // Repair Actions
      setDependencyCheckResult: (result) => set({ dependencyCheckResult: result }),
      setIsFixing: (fixing) => set({ isFixing: fixing }),
      setIsSwitchingBackend: (switching) => set({ isSwitchingBackend: switching }),
      showRepairScreen: () => set({ currentView: 'repair' }),
      fixFfmpeg: async () => {
        const { setIsFixing } = get();
        try {
          setIsFixing(true);
          const result = await window.electronAPI.repair.fixFfmpeg();
          if (result.success) {
            // Success - the main process should restart the app
            console.log('FFmpeg fix successful, app should restart');
          } else {
            console.error('FFmpeg fix failed:', result.message);
          }
          return result;
        } finally {
          setIsFixing(false);
        }
      },
      switchToLibVLC: async () => {
        const { setIsSwitchingBackend } = get();
        try {
          setIsSwitchingBackend(true);
          const result = await window.electronAPI.repair.switchToLibVLC();
          if (result.success) {
            // Success - switch back to home view
            set({ currentView: 'home' });
          }
          return result;
        } finally {
          setIsSwitchingBackend(false);
        }
      },
      getManualInstructions: () => window.electronAPI.repair.getManualInstructions(),

      // Async Actions
      loadLibrary: async () => {
        const { setLoading, setMovies, setShows, setContinueWatching, setRecentlyAdded } = get();
        
        try {
          setLoading(true);
          
          const [movies, shows, continueWatching, recentlyAdded] = await Promise.all([
            window.electronAPI.library.getMovies(),
            window.electronAPI.library.getShows(),
            window.electronAPI.library.getRecentlyWatched(),
            window.electronAPI.library.getRecentlyWatched(), // TODO: Add getRecentlyAdded
          ]);
          
          setMovies(movies);
          setShows(shows);
          setContinueWatching(continueWatching);
          setRecentlyAdded(recentlyAdded);
        } catch (error) {
          console.error('Failed to load library:', error);
        } finally {
          setLoading(false);
        }
      },
      
      searchMedia: async (query) => {
        const { setLoading } = get();
        
        try {
          setLoading(true);
          const results = await window.electronAPI.library.searchMedia(query);
          // TODO: Handle search results
          console.log('Search results:', results);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setLoading(false);
        }
      },
      
      playMedia: async (movie, episode) => {
        const { setCurrentMovie, setCurrentEpisode, setCurrentView } = get();
        
        try {
          if (movie) {
            setCurrentMovie(movie);
            await window.electronAPI.player.load({
              path: movie.videoFile.path,
              // resumePosition can be added here when progress integrated
            });
          } else if (episode) {
            setCurrentEpisode(episode);
            await window.electronAPI.player.load({
              path: episode.videoFile.path,
            });
          }
          
          setCurrentView('player');
          await window.electronAPI.player.play();
        } catch (error) {
          console.error('Failed to play media:', error);
        }
      },
      
      scanDrives: async () => {
        const { setIsScanning } = get();
        
        try {
          setIsScanning(true);
          await window.electronAPI.library.scanMedia();
        } catch (error) {
          console.error('Failed to scan drives:', error);
        } finally {
          setIsScanning(false);
        }
      },
      
      // Utility Actions
      reset: () => set(initialState),
      }),
      { name: 'hplayer-devtools' }
    ),
    { name: 'hplayer-store', partialize: (state) => ({ activeMenu: state.activeMenu }) }
  )
);