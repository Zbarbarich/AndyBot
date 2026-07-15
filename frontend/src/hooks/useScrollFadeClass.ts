import { useCallback, useRef, type UIEvent } from 'react';

/** Adds `is-scrolling` while scrolling; removes after idle (thematic fade scrollbar). */
export function useScrollFadeClass(idleMs = 900) {
  const timerRef = useRef<number | null>(null);

  const onScroll = useCallback(
    (e: UIEvent<HTMLElement>) => {
      const el = e.currentTarget;
      el.classList.add('is-scrolling');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        el.classList.remove('is-scrolling');
      }, idleMs);
    },
    [idleMs]
  );

  return onScroll;
}
