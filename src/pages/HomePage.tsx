/**
 * @file Home page component
 * @description App home page with feature card grid (auto-fill layout).
 *
 * Supports two ways to enter a feature page:
 * 1. Click a card — clears files and navigates
 * 2. Drag files onto a card — clears files, pre-loads dropped files, navigates.
 *    The target feature page will automatically fetch media info on mount.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import {
  RefreshCw, Shrink, Scissors, Layers, AudioLines,
  Stamp, Maximize2, Clapperboard, Subtitles, Download,
  CirclePlus,
} from 'lucide-react';
import { FEATURE_CARDS, VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, SUBTITLE_EXTENSIONS } from '@/lib/constants';
import { useAppStore } from '@/stores/useAppStore';
import { useT } from '@/i18n';

/**
 * lucide-react icon name mapping
 * @description Maps string icon names to actual React components
 */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  RefreshCw,
  Shrink,
  Scissors,
  Layers,
  AudioLines,
  Stamp,
  Maximize2,
  Clapperboard,
  Subtitles,
  Download,
};

/** All accepted media file extensions for home page drag-drop */
const ALL_MEDIA_EXTENSIONS = new Set<string>([
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...SUBTITLE_EXTENSIONS,
]);

/**
 * Find the feature card ID under the given cursor position
 *
 * Uses bounding rect comparison for reliable hit testing regardless
 * of coordinate space (physical vs logical pixels).
 * Tries raw coordinates first, then falls back to devicePixelRatio-scaled.
 *
 * @param rawX - X coordinate from Tauri drag event
 * @param rawY - Y coordinate from Tauri drag event
 * @returns Card ID string or null if no card is under the cursor
 */
function findCardAtPosition(rawX: number, rawY: number): string | null {
  const cards = document.querySelectorAll<HTMLElement>('[data-card-id]');
  const scale = window.devicePixelRatio || 1;

  /* Try raw coordinates first (works when Tauri reports logical pixels) */
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rawX >= rect.left && rawX <= rect.right && rawY >= rect.top && rawY <= rect.bottom) {
      return card.getAttribute('data-card-id');
    }
  }

  /* Fallback: try scaled coordinates (for PhysicalPosition on Retina displays) */
  const scaledX = rawX / scale;
  const scaledY = rawY / scale;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (scaledX >= rect.left && scaledX <= rect.right && scaledY >= rect.top && scaledY <= rect.bottom) {
      return card.getAttribute('data-card-id');
    }
  }

  return null;
}

/**
 * Home page component
 *
 * Displays auto-fill feature card grid (10 cards), each with icon, name and description.
 * Interaction: hover float + shadow, click scale + route navigation.
 * Drag-drop: drag files onto any card to quick-start that feature with files pre-loaded.
 */
export function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const setPendingDragPaths = useAppStore((s) => s.setPendingDragPaths);

  /** Card ID being hovered during file drag — used for visual highlight */
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  /**
   * Handle card click — navigate to feature page
   *
   * FeatureLayout clears stale files on mount, so no need to clear here.
   *
   * @param cardId - Feature card identifier used as route path
   */
  const handleCardClick = useCallback((cardId: string) => {
    navigate(`/${cardId}`);
  }, [navigate]);

  /**
   * Listen for Tauri native drag-drop events to enable drag-to-card quick start
   *
   * On hover: detects which card is under cursor via document.elementFromPoint
   * On drop: filters files by extension, stores them, and navigates to feature page
   * On leave: resets hover highlight
   */
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent((event) => {
        if (event.payload.type === 'over') {
          const { x, y } = event.payload.position;
          setDragOverCardId(findCardAtPosition(x, y));
        } else if (event.payload.type === 'drop') {
          setDragOverCardId(null);

          /* Detect which card the files were dropped on */
          const { x, y } = event.payload.position;
          const cardId = findCardAtPosition(x, y);
          if (!cardId) return;

          /* Filter dropped files by known media extensions */
          const filtered = event.payload.paths.filter((p) => {
            const ext = p.split('.').pop()?.toLowerCase() ?? '';
            return ALL_MEDIA_EXTENSIONS.has(ext);
          });
          if (filtered.length === 0) return;

          /* Store paths for FeatureLayout to consume on mount — avoids race conditions */
          setPendingDragPaths(filtered);
          navigate(`/${cardId}`);
        } else if (event.payload.type === 'leave') {
          setDragOverCardId(null);
        }
      });
    };

    setup();
    return () => { unlisten?.(); };
  }, [setPendingDragPaths, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 animate-fade-in">
      {/* App title */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-3xl)' }}
        >
          ClipForge
        </h1>
        <p
          className="mt-2"
          style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-md)' }}
        >
          {t('app.subtitle')}
        </p>
      </div>

      {/* Feature card grid (auto-fill, max 4 columns) */}
      <div
        className="grid gap-5 justify-center"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, 220px)',
          maxWidth: '940px',
        }}
      >
        {FEATURE_CARDS.map((card) => {
          const IconComponent = ICON_MAP[card.icon];
          /** Whether this card is the current drag-over target */
          const isDropTarget = dragOverCardId === card.id;

          return (
            <button
              key={card.id}
              data-card-id={card.id}
              onClick={() => handleCardClick(card.id)}
              className="flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer"
              style={{
                width: '220px',
                height: '170px',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                boxShadow: isDropTarget
                  ? '0 0 0 2px var(--color-accent), var(--shadow-card-hover)'
                  : 'var(--shadow-card)',
                border: isDropTarget
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
                transform: isDropTarget ? 'translateY(-4px) scale(1.02)' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (!isDropTarget) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDropTarget) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              {/* Feature icon */}
              <div
                className="relative flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  color: 'var(--color-accent)',
                }}
              >
                {IconComponent && <IconComponent size={28} />}
                {/* Green "+" badge — shown when card is a drag-drop target */}
                {isDropTarget && (
                  <div
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#22c55e',
                      color: 'white',
                    }}
                  >
                    <CirclePlus size={16} strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Feature name */}
              <span
                className="font-semibold"
                style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
              >
                {t(card.nameKey as any)}
              </span>

              {/* Feature description */}
              <span
                className="text-center leading-snug"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}
              >
                {t(card.descKey as any)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
