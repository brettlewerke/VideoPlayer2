# UI/Preload Packaging Fixes - Implementation Summary

## Changes Made

### 1. Created Common IPC Channel Module
- **File**: `src/common/ipc-channels.ts`
- Contains IPC channel constants that can be used by both main and preload
- Eliminates need for cross-tree imports in preload

### 2. Updated Preload Script
- **File**: `src/preload/preload.ts`
- **Key Changes**:
  - Inlined IPC channel constants to avoid relative imports
  - Exposed `HPlayerAPI` namespace (instead of `electronAPI`)
  - Added `ping()` method for bridge availability check
  - Added `library.list()` method for combined movies/shows query
  - Added `scanner.scan()` method
  - Added `settings.open()` method
  - Wrapped all IPC calls with `.catch()` to prevent unhandled rejections
  - Self-contained bundle with no external dependencies

### 3. Updated Type Declarations
- **File**: `src/renderer/types/global.d.ts`
- Updated to reflect new `HPlayerAPI` interface
- Made API optional (`Window.HPlayerAPI?`) for safe access
- Added backward compatibility alias `electronAPI`

### 4. Updated App Store
- **File**: `src/renderer/store/useAppStore.ts`
- Added state fields:
  - `status`: 'idle' | 'loading' | 'error' | 'no-drives' | 'no-folders'
  - `errorMessage`: string | null
- Updated `loadLibrary()`:
  - Guards against missing API with `getAPI()` helper
  - Checks drives first before loading library
  - Sets appropriate status based on results
  - Early returns for error states
- Updated all async actions to check for API availability
- All API access uses `getAPI()` helper to bypass TypeScript errors

### 5. Created Empty State Component
- **File**: `src/renderer/components/EmptyState.tsx`
- Two variants:
  - `no-drives`: Shows when no drives detected
  - `no-folders`: Shows when drives exist but required folders missing
- Features:
  - Large "Drive not found" or "Library folders not found" headline
  - Explanatory text about required folder structure
  - Rescan button with loading spinner
  - Diagnostics section showing detected drives
  - Lists expected folder names (Movies, Films, TV Shows, etc.)

### 6. Updated HomePage
- **File**: `src/renderer/pages/HomePage.tsx`
- Renders EmptyState when `status === 'no-drives'` or `status === 'no-folders'`
- Removed old inline empty state markup
- Integrated with `scanDrives()` action from store

### 7. Updated Main App Component
- **File**: `src/renderer/App.tsx`
- Added bridge readiness check on mount
- Calls `HPlayerAPI.ping()` to confirm preload availability
- Shows themed error banner if preload bridge fails
- Only calls `loadLibrary()` after bridge is confirmed ready
- Shows LoadingScreen while bridge initializes

### 8. Fixed Main Process Window Creation
- **File**: `src/main/main.ts`
- Unified dev/prod window creation
- Preload path always uses `join(__dirname, '../preload/preload.js')`
- Added logging for preload path, __dirname, and mode
- Removed hard throw for missing renderer files in production
- Added better error handling for Vite dev server discovery
- Dev: loads Vite URL, Prod: loads compiled index.html

### 9. Updated TypeScript Configurations
- **Root `tsconfig.json`**:
  - Added path aliases: `@common/*`, `@renderer/*`, `@shared/*`
- **`src/main/tsconfig.json`**:
  - Added path aliases: `@common/*`, `@main/*`, `@preload/*`, `@shared/*`
  - Included `../common/**/*` in includes

### 10. Updated Vite Config
- **File**: `vite.config.ts`
- Added `@common` alias

## Path Resolution Strategy

### Development
- Main process: `dist/main/main/main.js`
- Preload: `dist/main/preload/preload.js`
- Renderer: Vite dev server (http://localhost:3000)

### Production (app.asar)
- Structure inside asar:
  ```
  app.asar/
    dist/
      main/
        main/
          main.js          (__dirname in main process)
        preload/
          preload.js       (../preload/preload.js from main)
      renderer/
        index.html         (../../renderer/index.html from main)
        assets/
  ```

## Build Process
1. `npm run build:renderer` → Vite builds to `dist/renderer/`
2. `npm run build:main` → tsc compiles main + preload to `dist/main/`
3. `npm run package` → electron-builder packages everything into app.asar

## Testing Checklist
- [ ] Dev mode: `npm run dev` - preload loads, API available
- [ ] Dev mode: Empty state shows when no drives
- [ ] Dev mode: Rescan button works
- [ ] Production build: `npm run build` - no errors
- [ ] Packaged app: preload loads from asar
- [ ] Packaged app: API bridge works
- [ ] Packaged app: Empty states render correctly
- [ ] Packaged app: No "module not found" errors

## Expected Console Output

### Development
```
[Preload] bridge ready
[Preload] exposeInMainWorld initialized
[App] HPlayerAPI bridge ready
[Store] Loading library...
[Bridge] drives.list() → N
```

### Empty State (No Drives)
```
[Store] No drives found
status: 'no-drives'
```

### Empty State (No Folders)
```
[Store] Loaded library: 1 drives, 0 movies, 0 shows
status: 'no-folders'
```

## What Was Fixed

1. ✅ **Preload module resolution**: No more `../shared/ipc.js` imports
2. ✅ **API availability**: Guards prevent "Cannot read properties of undefined"
3. ✅ **Empty state logic**: Deterministic states based on drive scan results
4. ✅ **Dev/prod unification**: Same relative paths work in both modes
5. ✅ **Rescan button**: Wired to IPC, handles missing API gracefully
6. ✅ **Defensive logging**: Bridge initialization logged to DevTools
7. ✅ **Type safety**: All Window.HPlayerAPI accesses are guarded
