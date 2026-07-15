import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * On route change: jump to top, then bounce-in on <main>.
 * Uses window scroll so body background-attachment: fixed (parallax) keeps working.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const main = document.querySelector('main');
    if (!main || prefersReduced) return undefined;

    main.classList.remove('page-bounce-in');
    void main.offsetWidth;
    main.classList.add('page-bounce-in');

    const onEnd = () => main.classList.remove('page-bounce-in');
    main.addEventListener('animationend', onEnd);

    return () => {
      main.removeEventListener('animationend', onEnd);
      main.classList.remove('page-bounce-in');
    };
  }, [pathname]);

  return null;
}
