import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { SelectOption } from './types';

export function MiddleEllipsisAddress({
  address,
  head = 18,
  tail = 14,
  minHead = 6,
  minTail = 6,
  className = '',
}: {
  address: string;
  head?: number;
  tail?: number;
  minHead?: number;
  minTail?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(address);

  useEffect(() => {
    const updateDisplay = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure || !address) {
        setDisplay(address);
        return;
      }

      measure.textContent = address;
      const availableWidth = container.clientWidth;
      const fullWidth = measure.scrollWidth;
      if (!availableWidth || fullWidth <= availableWidth) {
        setDisplay(address);
        return;
      }

      const normalizedWidth = Math.max(0, availableWidth - 4);
      measure.textContent = '0'.repeat(Math.max(address.length, 42));
      const charWidth = Math.max(1, measure.scrollWidth / Math.max(address.length, 42));
      const availableChars = Math.max(minHead + minTail + 3, Math.floor(normalizedWidth / charWidth));

      const maxVisibleChars = Math.max(minHead + minTail, availableChars - 3);
      const preferredHead = Math.min(head, Math.max(minHead, Math.ceil(maxVisibleChars * 0.56)));
      let nextHead = Math.min(preferredHead, maxVisibleChars - minTail);
      let nextTail = Math.min(tail, maxVisibleChars - nextHead);

      if (nextTail < minTail) {
        nextTail = Math.min(minTail, maxVisibleChars - minHead);
        nextHead = Math.max(minHead, maxVisibleChars - nextTail);
      }

      while (nextHead + nextTail + 3 > availableChars && nextHead > minHead) nextHead -= 1;
      while (nextHead + nextTail + 3 > availableChars && nextTail > minTail) nextTail -= 1;

      setDisplay(`${address.slice(0, nextHead)}...${address.slice(-nextTail)}`);
    };

    updateDisplay();

    const observer = typeof ResizeObserver !== 'undefined' && containerRef.current
      ? new ResizeObserver(updateDisplay)
      : null;
    if (observer && containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateDisplay);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateDisplay);
    };
  }, [address, head, tail, minHead, minTail]);

  return (
    <span ref={containerRef} className={`relative block min-w-0 max-w-full overflow-hidden whitespace-nowrap ${className}`} title={address}>
      <span className="block min-w-0 overflow-visible whitespace-nowrap">{display}</span>
      <span ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-mono" aria-hidden="true" />
    </span>
  );
}

export function InlineSelect({ value, options, onChange, disabled = false, placeholder = '' }: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
          open
            ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]'
            : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-surface-500 dark:hover:bg-surface-800'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`min-w-0 truncate ${selected ? 'text-surface-950 dark:text-white' : 'text-surface-500'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${open ? 'rotate-180 text-brand-600 dark:text-brand-300' : 'group-hover:text-surface-600 dark:group-hover:text-surface-200'}`} />
      </button>

      {open && !disabled && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-surface-200 bg-white p-1.5 shadow-xl shadow-surface-900/10 dark:border-surface-700 dark:bg-surface-900 dark:shadow-black/20">
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'bg-brand-500/15 text-brand-700 dark:text-brand-200'
                    : 'text-surface-700 hover:bg-surface-100 hover:text-surface-950 dark:text-surface-200 dark:hover:bg-surface-800 dark:hover:text-white'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-brand-400 bg-brand-500 text-white' : 'border-surface-300 dark:border-surface-600'
                }`}>
                  {active && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}