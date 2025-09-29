import React, { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Logo } from './Logo';

const MENU: { key: 'movies' | 'shows' | 'continue' | 'recent'; label: string }[] = [
  { key: 'movies', label: 'Movies' },
  { key: 'shows', label: 'TV Shows' },
  { key: 'continue', label: 'Continue Watching' },
  { key: 'recent', label: 'Recently Added' }
];

interface AppNavigationProps {
  orientation?: 'auto' | 'horizontal' | 'vertical';
  className?: string;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({ orientation = 'auto', className }) => {
  const active = useAppStore(s => s.activeMenu);
  const setActive = useAppStore(s => s.setActiveMenu);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Decide layout based on width if auto
  const [vertical, setVertical] = React.useState(false);
  useEffect(() => {
    if (orientation !== 'auto') {
      setVertical(orientation === 'vertical');
      return;
    }
    const handle = () => {
      const w = window.innerWidth;
      setVertical(w < 1100); // threshold for rail vs top tabs
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [orientation]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = MENU.findIndex(m => m.key === active);
    if (idx === -1) return;
    let next = idx;
    if (!vertical && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) next = (idx + 1) % MENU.length;
    if (!vertical && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) next = (idx - 1 + MENU.length) % MENU.length;
    if (vertical && e.key === 'ArrowDown') next = (idx + 1) % MENU.length;
    if (vertical && e.key === 'ArrowUp') next = (idx - 1 + MENU.length) % MENU.length;
    if (next !== idx) {
      e.preventDefault();
      setActive(MENU[next].key);
    }
    if (e.key === 'Enter' || e.key === 'Space') {
      // Activation just means already selected controls content; keep for a11y.
      e.preventDefault();
    }
  }, [active, setActive, vertical]);

  return (
    <nav
      ref={containerRef}
      aria-label="Primary"
      className={[
        'select-none',
        vertical
          ? 'flex flex-col w-56 shrink-0 border-r border-surface-border bg-surface-1/80 backdrop-blur-md'
          : 'flex px-4 pt-2 gap-2 border-b border-surface-border bg-surface-1/70 backdrop-blur-md',
        className || ''
      ].join(' ')}
    >
      <div className={vertical ? 'px-4 py-4 flex items-center gap-3' : 'hidden md:flex items-center pr-6'}>
        <Logo size="sm" />
        <span className="text-text-primary font-semibold tracking-wide text-lg">H Player</span>
      </div>
      <div className={vertical ? 'mt-2 flex-1 overflow-y-auto' : 'flex-1 flex items-end gap-2'}>
        {MENU.map(item => {
          const selected = item.key === active;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={selected}
              tabIndex={0}
              onClick={() => setActive(item.key)}
              onKeyDown={onKeyDown}
              className={[
                'relative group focus-visible:ring-brand transition-colors outline-none',
                vertical
                  ? 'w-full text-left px-4 py-3 text-sm rounded-md'
                  : 'px-4 py-3 text-sm rounded-t-md',
                selected
                  ? 'bg-surface-2 text-text-primary shadow-brand-glow'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/60'
              ].join(' ')}
            >
              <span className="font-medium tracking-wide">{item.label}</span>
              {selected && (
                <span
                  aria-hidden="true"
                  className={vertical
                    ? 'absolute inset-y-0 left-0 w-1 rounded-r bg-brand'
                    : 'absolute -bottom-px left-0 right-0 h-1 bg-gradient-to-r from-brand to-brand/60 rounded-t'}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
