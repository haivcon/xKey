import { useEffect } from 'react';

const KEYBOARD_SAFE_GAP = 16;
const MAX_FALLBACK_KEYBOARD_PADDING = 280;

const isKeyboardTarget = (target: EventTarget | null): target is HTMLElement => (
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
);

const getScrollContainer = (target: HTMLElement): HTMLElement => (
  target.closest('.overflow-y-auto')
  || target.closest('.overflow-auto')
  || document.getElementById('root')
  || document.body
) as HTMLElement;

const getKeyboardInset = () => {
  if (!window.visualViewport) return 0;

  const viewportBottom = window.visualViewport.offsetTop + window.visualViewport.height;
  return Math.max(0, window.innerHeight - viewportBottom);
};

const getRequiredBottomPadding = (target: HTMLElement, scrollContainer: HTMLElement) => {
  const targetRect = target.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const keyboardInset = getKeyboardInset();
  const visibleBottom = Math.min(
    containerRect.bottom,
    window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight,
  ) - KEYBOARD_SAFE_GAP;
  const overlap = Math.max(0, targetRect.bottom - visibleBottom);

  if (keyboardInset > 0) {
    return Math.ceil(Math.max(overlap + KEYBOARD_SAFE_GAP, Math.min(keyboardInset + KEYBOARD_SAFE_GAP, window.innerHeight * 0.45)));
  }

  return Math.ceil(Math.min(Math.max(overlap + KEYBOARD_SAFE_GAP, 0), MAX_FALLBACK_KEYBOARD_PADDING));
};

export default function useGlobalInputFocus() {
  useEffect(() => {
    let activeTarget: HTMLElement | null = null;
    let activeScrollContainer: HTMLElement | null = null;
    let restorePaddingBottom: string | null = null;
    let scrollTimer: number | undefined;
    let cleanupTimer: number | undefined;

    const clearTimers = () => {
      if (scrollTimer !== undefined) window.clearTimeout(scrollTimer);
      if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
      scrollTimer = undefined;
      cleanupTimer = undefined;
    };

    const restoreScrollContainer = () => {
      if (!activeScrollContainer) return;

      if (restorePaddingBottom === null) {
        activeScrollContainer.style.removeProperty('padding-bottom');
      } else {
        activeScrollContainer.style.paddingBottom = restorePaddingBottom;
      }
    };

    const updateFocusedInputPosition = () => {
      if (!activeTarget || !activeScrollContainer) return;

      const requiredPadding = getRequiredBottomPadding(activeTarget, activeScrollContainer);
      if (requiredPadding > KEYBOARD_SAFE_GAP) {
        activeScrollContainer.style.setProperty('padding-bottom', `${requiredPadding}px`, 'important');
      } else if (restorePaddingBottom === null) {
        activeScrollContainer.style.removeProperty('padding-bottom');
      } else {
        activeScrollContainer.style.paddingBottom = restorePaddingBottom;
      }

      activeTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isKeyboardTarget(event.target)) return;

      clearTimers();
      activeTarget = event.target;
      activeScrollContainer = getScrollContainer(activeTarget);
      restorePaddingBottom = activeScrollContainer.style.paddingBottom || null;

      scrollTimer = window.setTimeout(updateFocusedInputPosition, 120);
      window.setTimeout(updateFocusedInputPosition, 320);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isKeyboardTarget(event.target)) return;

      const blurredScrollContainer = activeScrollContainer;
      clearTimers();

      cleanupTimer = window.setTimeout(() => {
        if (document.activeElement instanceof HTMLElement && isKeyboardTarget(document.activeElement)) {
          return;
        }

        if (blurredScrollContainer) {
          if (restorePaddingBottom === null) {
            blurredScrollContainer.style.removeProperty('padding-bottom');
          } else {
            blurredScrollContainer.style.paddingBottom = restorePaddingBottom;
          }
        }

        activeTarget = null;
        activeScrollContainer = null;
        restorePaddingBottom = null;
      }, 120);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.visualViewport?.addEventListener('resize', updateFocusedInputPosition);
    window.visualViewport?.addEventListener('scroll', updateFocusedInputPosition);
    window.addEventListener('resize', updateFocusedInputPosition);

    return () => {
      clearTimers();
      restoreScrollContainer();
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.visualViewport?.removeEventListener('resize', updateFocusedInputPosition);
      window.visualViewport?.removeEventListener('scroll', updateFocusedInputPosition);
      window.removeEventListener('resize', updateFocusedInputPosition);
    };
  }, []);
}