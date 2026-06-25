import { useEffect, type RefObject } from 'react';

export default function useHomeHeaderHeight(
  headerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header || !enabled) return undefined;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--home-header-height', `${header.offsetHeight}px`);
    };

    updateHeaderHeight();

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(header);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [enabled, headerRef]);
}