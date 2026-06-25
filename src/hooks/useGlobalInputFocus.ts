import { useEffect } from 'react';

const isKeyboardTarget = (target: EventTarget | null): target is HTMLElement => (
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
);

const getScrollContainer = (target: HTMLElement): HTMLElement => (
  target.closest('.overflow-y-auto')
  || target.closest('.overflow-auto')
  || document.getElementById('root')
  || document.body
) as HTMLElement;

export default function useGlobalInputFocus() {
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (!isKeyboardTarget(event.target)) return;

      const target = event.target;
      const scrollContainer = getScrollContainer(target);
      scrollContainer.style.setProperty('padding-bottom', '60vh', 'important');
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isKeyboardTarget(event.target)) return;

      const scrollContainer = getScrollContainer(event.target);
      scrollContainer.style.removeProperty('padding-bottom');
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
}