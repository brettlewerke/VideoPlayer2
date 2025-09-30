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
  ScanProgress
} from '../../shared/types.js';

// Type guard to check if HPlayerAPI is available
function getAPI() {
  return (window as any).HPlayerAPI;
}

interface AppState {
  // UI State
  currentView: 'home' | 'movies' | 'shows' | 'search' | 'player' | 'settings';
  isLoading: boolean;
  isSidebarOpen: boolean;
  searchQuery: string;
  activeMenu: 'movies' | 'shows' | 'continue' | 'recent';
  status: 'idle' | 'loading' | 'error' | 'no-drives' | 'no-folders';
  errorMessage: string | null;
  
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
  isPlayerLoading: boolean;
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
  setIsPlayerLoading: (loading: boolean) => void;
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
  status: 'idle',
  errorMessage: null,
  
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
  isPlayerLoading: false,
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
      setIsPlayerLoading: (loading) => set({ isPlayerLoading: loading }),
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
      
      // Async Actions
      loadLibrary: async () => {
        const { setLoading, setMovies, setShows, setContinueWatching, setRecentlyAdded, setDrives } = get();
        const api = getAPI();
        
        if (!api) {
          console.error('[Store] HPlayerAPI not available');
          set({ status: 'error', errorMessage: 'Bridge not loaded' });
          return;
        }
        
        try {
          setLoading(true);
          set({ status: 'loading' });
          
          console.log('[Store] Loading library...');
          
          // First check drives
          const drivesRes = await api.drives.list();
          setDrives(drivesRes || []);
          
          if (!drivesRes || drivesRes.length === 0) {
            console.log('[Store] No drives found');
            set({ status: 'no-drives', isLoading: false });
            return;
          }
          
          const [moviesRes, showsRes, continueWatchingRes, recentlyAddedRes] = await Promise.all([
            api.library.getMovies(),
            api.library.getShows(),
            api.library.getRecentlyWatched(),
            api.library.getRecentlyWatched(), // TODO: Add getRecentlyAdded
          ]);
          
          console.log('[Store] API responses:', { moviesRes, showsRes, drivesRes });
          
          setMovies(moviesRes || []);
          setShows(showsRes || []);
          setContinueWatching(continueWatchingRes || []);
          setRecentlyAdded(recentlyAddedRes || []);
          
          // Check if we have any media
          const hasMovies = (moviesRes || []).length > 0;
          const hasShows = (showsRes || []).length > 0;
          
          if (!hasMovies && !hasShows) {
            set({ status: 'no-folders', isLoading: false });
          } else {
            set({ status: 'idle', isLoading: false });
          }
          
          console.log(`[Store] Loaded library: ${(drivesRes || []).length} drives, ${(moviesRes || []).length} movies, ${(showsRes || []).length} shows`);
        } catch (error) {
          console.error('[Store] Failed to load library:', error);
          set({ status: 'error', errorMessage: String(error), isLoading: false });
        }
      },
      
      searchMedia: async (query) => {
        const { setLoading } = get();
        const api = getAPI();
        
        if (!api) {
          console.error('[Store] HPlayerAPI not available');
          return;
        }
        
        try {
          setLoading(true);
          const results = await api.library.searchMedia(query);
          // TODO: Handle search results
          console.log('Search results:', results);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setLoading(false);
        }
      },
      
      playMedia: async (movie, episode) => {
        const { setCurrentMovie, setCurrentEpisode, setCurrentView, setIsPlayerLoading } = get();
        const api = getAPI();
        
        if (!api) {
          console.error('[Store] HPlayerAPI not available');
          return;
        }
        
        try {
          setIsPlayerLoading(true);
          
          let path: string;
          let progress: any = null;
          
          if (movie) {
            setCurrentMovie(movie);
            path = movie.videoFile.path;
            // Get existing progress
            progress = await api.progress.get(movie.id);
          } else if (episode) {
            setCurrentEpisode(episode);
            path = episode.videoFile.path;
            // Get existing progress
            progress = await api.progress.get(episode.id);
          } else {
            throw new Error('No media provided');
          }
          
          setCurrentView('player');
          await api.player.start(path, progress ? { start: progress.position } : undefined);
        } catch (error) {
          console.error('Failed to play media:', error);
        } finally {
          setIsPlayerLoading(false);
        }
      },
      
      scanDrives: async () => {
        const { setIsScanning, loadLibrary } = get();
        const api = getAPI();
        
        if (!api) {
          console.error('[Store] HPlayerAPI not available');
          return;
        }
        
        try {
          setIsScanning(true);
          await api.scanner.scan();
          // Reload library after scan completes
          await loadLibrary();
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