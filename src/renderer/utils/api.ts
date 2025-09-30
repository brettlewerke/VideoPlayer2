/**
 * Utility to safely access the HPlayerAPI
 * Returns null if the API is not available
 */

export function getHPlayerAPI() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const api = (window as any).HPlayerAPI;
  
  if (!api) {
    console.warn('[API] HPlayerAPI not available - preload bridge may not be loaded');
    return null;
  }
  
  return api;
}

/**
 * Check if the HPlayerAPI is available
 */
export function isAPIAvailable(): boolean {
  return getHPlayerAPI() !== null;
}

/**
 * Wait for the HPlayerAPI to become available
 * Returns a promise that resolves when the API is ready or rejects after timeout
 */
export async function waitForAPI(timeoutMs: number = 5000): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    if (isAPIAvailable()) {
      const api = getHPlayerAPI();
      try {
        await api?.ping();
        return true;
      } catch (err) {
        console.error('[API] Ping failed:', err);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}
