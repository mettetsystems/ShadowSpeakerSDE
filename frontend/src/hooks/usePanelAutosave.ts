import { useEffect, useRef } from 'react';

export const PANEL_AUTOSAVE_INTERVAL_MS = 10_000;

/**
 * Autosaves dirty panel edits on an interval and flushes once more on unmount
 * (panel close / switch). Call markDirty from input/change handlers.
 */
export function usePanelAutosave(
  flush: () => void,
  intervalMs: number = PANEL_AUTOSAVE_INTERVAL_MS,
): {
  markDirty: () => void;
  flushIfDirty: () => void;
} {
  const dirtyRef = useRef(false);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const flushIfDirty = () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    flushRef.current();
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      flushIfDirty();
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
      flushIfDirty();
    };
    // flushIfDirty reads refs; only interval should rebind the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [intervalMs]);

  return { markDirty, flushIfDirty };
}
